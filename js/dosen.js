/* ════════════════════════════════════════════════
   dosen.js — Tab Dosen
   - Generate QR (Modul 1)
   - Fetch Accel latest (Modul 2)
   - Fetch GPS history + Leaflet map (Modul 3)
   ════════════════════════════════════════════════ */

(function initDosen() {
  'use strict';
  const $ = id => document.getElementById(id);

  /* ══ MODUL 1: GENERATE QR ══ */
  let timerInterval = null;
  let leafletDosenMap = null;
  let dosenPolyline = null;
  let dosenMarker = null;

  document.addEventListener('click', async function (e) {
    if (!e.target.closest('#btnGenerate')) return;

    const btn       = $('btnGenerate');
    const courseId  = ($('course_id')?.value  || '').trim();
    const sessionId = ($('session_id')?.value || '').trim();

    if (!courseId)  { alert('Isi Course ID dulu!'); return; }
    if (!sessionId) { alert('Isi Session ID dulu!'); return; }

    setLoading(btn, true);
    clearInterval(timerInterval);

    try {
      const result = await gasPost('presence/qr/generate', {
        course_id : courseId,
        session_id: sessionId,
        ts        : new Date().toISOString()
      });

      if (!result.ok) throw new Error(result.error || 'Generate gagal');

      const { qr_token, expires_at } = result.data;
      const expiresDate = new Date(expires_at);

      // Isi meta
      if ($('qrCourse'))  $('qrCourse').textContent  = courseId;
      if ($('qrSession')) $('qrSession').textContent  = sessionId;
      if ($('qrToken'))   $('qrToken').textContent    = qr_token;

      // QR code — encode JSON biar mahasiswa langsung dapat course+session
      const qrContainer = $('qrCode');
      if (qrContainer) {
        qrContainer.innerHTML = '';
        new QRCode(qrContainer, {
          text  : JSON.stringify({ token: qr_token, course_id: courseId, session_id: sessionId }),
          width : 180, height: 180,
          colorDark: '#003d8f', colorLight: '#ffffff',
          correctLevel: QRCode.CorrectLevel.M
        });
      }

      // Timer countdown
      const pill = $('timerPill');
      const txt  = $('timerText');
      if (pill) pill.classList.remove('expired');

      timerInterval = setInterval(() => {
        const remaining = expiresDate - Date.now();
        if (remaining <= 0) {
          clearInterval(timerInterval);
          if (txt)  txt.textContent  = 'Expired';
          if (pill) pill.classList.add('expired');
          return;
        }
        const s = Math.ceil(remaining / 1000);
        const m = Math.floor(s / 60);
        const sec = s % 60;
        if (txt) txt.textContent = `${m}:${sec.toString().padStart(2,'0')} tersisa`;
      }, 500);

      $('qrSection')?.classList.remove('hidden');

    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(btn, false);
    }
  });

  /* ══ MODUL 2: FETCH ACCEL DOSEN ══ */
  document.addEventListener('click', async function (e) {
    if (!e.target.closest('#btnFetchAccel')) return;

    const btn      = $('btnFetchAccel');
    const deviceId = ($('accel_fetch_device')?.value || '').trim();

    if (!deviceId) {
      showResult('accelDosenResult', 'Masukkan NIM mahasiswa terlebih dahulu.', 'error');
      return;
    }

    setLoading(btn, true);
    try {
      const result = await gasGet('telemetry/accel/latest', { device_id: deviceId });

      if (result.ok && result.data) {
        const d = result.data;
        const x = d.x !== undefined ? Number(d.x).toFixed(4) : '—';
        const y = d.y !== undefined ? Number(d.y).toFixed(4) : '—';
        const z = d.z !== undefined ? Number(d.z).toFixed(4) : '—';
        const t = d.t || d.ts || '—';

        const liveEl = $('accelDosenLive');
        if (liveEl) {
          liveEl.classList.remove('hidden');
          $('dosenLiveX').textContent = x;
          $('dosenLiveY').textContent = y;
          $('dosenLiveZ').textContent = z;
        }

        showResult(
          'accelDosenResult',
          `✅ Data terbaru <strong>${deviceId}</strong><br>` +
          `X: <strong>${x}</strong> &nbsp; Y: <strong>${y}</strong> &nbsp; Z: <strong>${z}</strong><br>` +
          `<small style="opacity:.7">${t}</small>`,
          'success', 0
        );
      } else {
        $('accelDosenLive')?.classList.add('hidden');
        showResult('accelDosenResult', '❌ ' + (result.error || 'Data tidak ditemukan.'), 'error');
      }
    } catch (err) {
      showResult('accelDosenResult', '❌ Koneksi gagal: ' + err.message, 'error');
    } finally {
      setLoading(btn, false);
    }
  });

  /* ══ MODUL 3: FETCH GPS DOSEN ══ */
  document.addEventListener('click', async function (e) {
    if (!e.target.closest('#btnFetchGps')) return;

    const btn      = $('btnFetchGps');
    const deviceId = ($('gps_fetch_device')?.value || '').trim();

    if (!deviceId) {
      showResult('gpsDosenResult', 'Masukkan NIM mahasiswa terlebih dahulu.', 'error');
      return;
    }

    setLoading(btn, true);
    try {
      const result = await gasGet('telemetry/gps/history', { device_id: deviceId, limit: 200 });

      if (result.ok && result.data?.items?.length > 0) {
        const items = result.data.items;
        const mapWrap = $('gpsDosenMapWrap');
        if (mapWrap) mapWrap.classList.remove('hidden');

        // Init leaflet map dosen
        if (!leafletDosenMap) {
          leafletDosenMap = L.map('leafletMapDosen').setView(
            [items[items.length - 1].lat, items[items.length - 1].lng], 16
          );
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
          }).addTo(leafletDosenMap);
        }

        // Clear lama
        if (dosenPolyline) { leafletDosenMap.removeLayer(dosenPolyline); }
        if (dosenMarker)   { leafletDosenMap.removeLayer(dosenMarker); }

        const coords = items.map(p => [p.lat, p.lng]);
        dosenPolyline = L.polyline(coords, { color: '#003d8f', weight: 3, opacity: 0.8 }).addTo(leafletDosenMap);

        // Marker terakhir
        const last = items[items.length - 1];
        const icon = L.divIcon({
          html: `<div style="width:14px;height:14px;border-radius:50%;background:#003d8f;border:3px solid white;box-shadow:0 2px 8px rgba(0,61,143,0.5)"></div>`,
          iconSize: [14, 14], iconAnchor: [7, 7], className: ''
        });
        dosenMarker = L.marker([last.lat, last.lng], { icon })
          .addTo(leafletDosenMap)
          .bindPopup(`<strong>${deviceId}</strong><br>Titik terakhir`)
          .openPopup();

        leafletDosenMap.fitBounds(dosenPolyline.getBounds(), { padding: [30, 30] });
        leafletDosenMap.invalidateSize();

        showResult(
          'gpsDosenResult',
          `✅ Menampilkan <strong>${items.length}</strong> titik lokasi mahasiswa <strong>${deviceId}</strong>`,
          'success', 0
        );
      } else {
        showResult('gpsDosenResult', '❌ ' + (result.error || 'Belum ada data GPS untuk NIM ini.'), 'error');
      }
    } catch (err) {
      showResult('gpsDosenResult', '❌ Koneksi gagal: ' + err.message, 'error');
    } finally {
      setLoading(btn, false);
    }
  });

})();