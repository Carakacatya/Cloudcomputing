/* ════════════════════════════════════════════════
   mahasiswa.js — Tab Mahasiswa

   FIELD MAPPING (sinkron dengan accel.js & gps.js):
   - device_id = NIM  ← identifier utama di semua sheet
   - user_id   = Nama

   3 cara input token:
   1. Scan kamera   → parse JSON otomatis
   2. Upload file   → decode pakai jsQR
   3. Token manual  → muncul field course & session
   ════════════════════════════════════════════════ */

(function initMahasiswa() {
  'use strict';

  const $ = (id) => document.getElementById(id);

  let html5QrScanner = null;
  let parsedQR = { token: '', course_id: '', session_id: '', isManual: false };

  function isMobile() {
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  }

  /* ══════════════════════════════════════════
     SYNC NIM (field user_id di HTML) → Accel & GPS
     accel_device_id dan gps_device_id = NIM
  ══════════════════════════════════════════ */
  function syncNimToDevices(nim) {
    const accelDev = document.getElementById('accel_device_id');
    const gpsDev   = document.getElementById('gps_device_id');
    if (accelDev) accelDev.value = nim;
    if (gpsDev)   gpsDev.value   = nim;
  }

  (function initNimSync() {
    // user_id di HTML = NIM
    const nimInput = document.getElementById('user_id');
    if (!nimInput) return;
    if (nimInput.value.trim()) syncNimToDevices(nimInput.value.trim());
    nimInput.addEventListener('input', () => {
      syncNimToDevices(nimInput.value.trim());
    });
  })();

  /* ══════════════════════════════════════════
     PARSE TEKS QR
  ══════════════════════════════════════════ */
  function handleScannedText(raw) {
    const text = (raw || '').trim();

    try {
      const obj = JSON.parse(text);
      if (obj.token) {
        parsedQR = {
          token     : obj.token.toUpperCase(),
          course_id : obj.course_id  || '',
          session_id: obj.session_id || '',
          isManual  : false
        };
        const ti = $('manualToken');
        if (ti) ti.value = parsedQR.token;
        setManualMode(false);
        updateQRInfo();
        return;
      }
    } catch (_) {}

    parsedQR = { token: text.toUpperCase(), course_id: '', session_id: '', isManual: true };
    const ti = $('manualToken');
    if (ti) ti.value = parsedQR.token;
    setManualMode(true);
    updateQRInfo();
  }

  function setManualMode(show) {
    const row = $('manualCourseRow');
    if (!row) return;
    row.classList.toggle('hidden', !show);
    if (!show) {
      if ($('mhs_course_id'))  $('mhs_course_id').value  = '';
      if ($('mhs_session_id')) $('mhs_session_id').value = '';
    }
  }

  function updateQRInfo() {
    const el = $('qrInfo');
    if (!el) return;
    if (parsedQR.course_id && parsedQR.session_id) {
      el.textContent = '📘 ' + parsedQR.course_id + ' · ' + parsedQR.session_id;
      el.classList.remove('hidden');
    } else if (parsedQR.token && parsedQR.isManual) {
      el.textContent = '✏️ Token manual — isi Course ID & Session ID di bawah';
      el.classList.remove('hidden');
    } else {
      el.classList.add('hidden');
    }
  }

  /* ══════════════════════════════════════════
     SCANNER KAMERA
  ══════════════════════════════════════════ */
  document.addEventListener('click', function (e) {
    if (e.target.closest('#startScan')) openScanner();
    if (e.target.closest('#stopScan'))  stopScanner();
  });

  async function openScanner() {
    const wrapper  = $('scannerWrapper');
    const startBtn = $('startScan');
    const stopBtn  = $('stopScan');
    const readerEl = $('reader');
    if (!wrapper || !readerEl) return;
    readerEl.innerHTML = '';
    wrapper.classList.remove('hidden');
    startBtn.classList.add('hidden');
    stopBtn.classList.remove('hidden');
    html5QrScanner = new Html5Qrcode('reader');
    try {
      await html5QrScanner.start(
        { facingMode: isMobile() ? 'environment' : 'user' },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decodedText) => {
          handleScannedText(decodedText);
          stopScanner();
          showResult('statusResult', '📷 QR berhasil discan!', 'success');
        }
      );
    } catch (err) {
      stopScanner();
      alert('Tidak bisa membuka kamera:\n' + err);
    }
  }

  function stopScanner() {
    if (html5QrScanner) {
      html5QrScanner.stop().catch(() => {});
      html5QrScanner = null;
    }
    const wrapper  = $('scannerWrapper');
    const startBtn = $('startScan');
    const stopBtn  = $('stopScan');
    if (wrapper)  wrapper.classList.add('hidden');
    if (startBtn) startBtn.classList.remove('hidden');
    if (stopBtn)  stopBtn.classList.add('hidden');
  }

  window.stopScanner = stopScanner;

  /* ══════════════════════════════════════════
     UPLOAD FILE QR
  ══════════════════════════════════════════ */
  document.addEventListener('change', async function (e) {
    if (!e.target.closest('#qrFile')) return;
    const file = e.target.files[0];
    if (!file) return;
    const lbl = $('fileLabel');
    if (lbl) lbl.textContent = file.name;
    showResult('statusResult', '⏳ Membaca QR dari gambar...', 'success');
    try {
      const decoded = await decodeQRFromFile(file);
      handleScannedText(decoded);
      showResult('statusResult', '📁 QR dari gambar berhasil dibaca!', 'success');
    } catch (err) {
      showResult('statusResult', '❌ QR tidak terbaca. Pastikan gambar jelas.', 'error');
    }
    e.target.value = '';
  });

  function decodeQRFromFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = function (ev) {
        const img = new Image();
        img.onload = function () {
          const canvas = document.createElement('canvas');
          canvas.width = img.width; canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' });
          if (code) { resolve(code.data); return; }
          const code2 = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'invertFirst' });
          if (code2) resolve(code2.data);
          else reject(new Error('QR tidak ditemukan'));
        };
        img.onerror = () => reject(new Error('Gagal load gambar'));
        img.src = ev.target.result;
      };
      reader.onerror = () => reject(new Error('Gagal baca file'));
      reader.readAsDataURL(file);
    });
  }

  document.addEventListener('input', function (e) {
    if (!e.target.closest('#manualToken')) return;
    const val = e.target.value.trim().toUpperCase();
    if (val) {
      parsedQR = { token: val, course_id: '', session_id: '', isManual: true };
      setManualMode(true); updateQRInfo();
    } else {
      parsedQR = { token: '', course_id: '', session_id: '', isManual: false };
      setManualMode(false); updateQRInfo();
    }
  });

  /* ══════════════════════════════════════════
     CHECK IN
     Mapping ke GAS:
       device_id = NIM  (dari field #user_id di HTML)
       user_id   = Nama (dari field #device_id di HTML)
  ══════════════════════════════════════════ */
  document.addEventListener('click', async function (e) {
    if (!e.target.closest('#btnCheckin')) return;

    const btnCI = $('btnCheckin');

    // HTML: user_id = NIM, device_id = Nama
    const nim   = ($('user_id')?.value   || '').trim();   // NIM
    const nama  = ($('device_id')?.value || '').trim();   // Nama

    const token     = parsedQR.token || ($('manualToken')?.value || '').trim().toUpperCase();
    const courseId  = parsedQR.course_id  || ($('mhs_course_id')?.value  || '').trim();
    const sessionId = parsedQR.session_id || ($('mhs_session_id')?.value || '').trim();

    if (!nim)       { showResult('statusResult', 'Harap isi NIM terlebih dahulu.', 'error'); return; }
    if (!nama)      { showResult('statusResult', 'Harap isi Nama terlebih dahulu.', 'error'); return; }
    if (!token)     { showResult('statusResult', 'Harap scan QR atau masukkan token.', 'error'); return; }
    if (!courseId)  { showResult('statusResult', 'Harap isi Course ID.', 'error'); return; }
    if (!sessionId) { showResult('statusResult', 'Harap isi Session ID.', 'error'); return; }

    setLoading(btnCI, true);
    try {
      const result = await gasPost('presence/checkin', {
        device_id : nim,    // ← NIM  (sinkron dengan accel & GPS)
        user_id   : nama,   // ← Nama
        course_id : courseId,
        session_id: sessionId,
        qr_token  : token,
        ts        : new Date().toISOString()
      });

      if (result.ok) {
        showResult('statusResult',
          '✅ Check-in berhasil! NIM: <strong>' + nim + '</strong> — ' + nama +
          '<br>📘 ' + courseId + ' · ' + sessionId, 'success');
        if ($('manualToken')) $('manualToken').value = '';
        parsedQR = { token: '', course_id: '', session_id: '', isManual: false };
        setManualMode(false); updateQRInfo();
      } else {
        showResult('statusResult', '❌ Gagal: ' + (result.error || 'Token tidak valid atau expired.'), 'error');
      }
    } catch (err) {
      showResult('statusResult', '❌ Koneksi gagal: ' + err.message, 'error');
    } finally {
      setLoading(btnCI, false);
    }
  });

  /* ══════════════════════════════════════════
     CEK STATUS
     Pakai device_id = NIM sebagai identifier
  ══════════════════════════════════════════ */
  document.addEventListener('click', async function (e) {
    if (!e.target.closest('#btnStatus')) return;

    // NIM dari field #user_id
    const nim       = ($('user_id')?.value || '').trim();
    const courseId  = parsedQR.course_id  || ($('mhs_course_id')?.value  || '').trim();
    const sessionId = parsedQR.session_id || ($('mhs_session_id')?.value || '').trim();

    if (!nim) { showResult('statusResult', 'Harap isi NIM terlebih dahulu.', 'error'); return; }

    try {
      const result = await gasGet('presence/status', {
        device_id : nim,   // ← pakai device_id = NIM
        course_id : courseId,
        session_id: sessionId
      });

      if (result.ok) {
        const d = result.data;
        const hadir = d.status === 'checked_in';
        const detail = [d.course_id, d.session_id].filter(Boolean).join(' / ');
        showResult('statusResult',
          (hadir ? '✅' : '⏳') + ' <strong>' + (hadir ? 'Sudah hadir' : 'Belum hadir') + '</strong>' +
          (detail ? ' — ' + detail : '') +
          (d.user_id ? '<br>Nama: ' + d.user_id : ''),
          hadir ? 'success' : 'error');
      } else {
        showResult('statusResult', '⏳ Belum ada data presensi. ' + (result.error || ''), 'error');
      }
    } catch (err) {
      showResult('statusResult', '❌ Koneksi gagal: ' + err.message, 'error');
    }
  });

})();