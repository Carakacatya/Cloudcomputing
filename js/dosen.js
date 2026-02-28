/* ════════════════════════════════════════════════
   dosen.js — Generate QR (Tab Dosen)
   gasPost() sudah didefinisikan di config.js
   ════════════════════════════════════════════════ */

(function initDosen() {
  'use strict';

  const QR_DURATION_MS = 2 * 60 * 1000;

  const btnGenerate = document.getElementById('btnGenerate');
  const qrSection   = document.getElementById('qrSection');
  const qrCodeEl    = document.getElementById('qrCode');
  const qrTokenEl   = document.getElementById('qrToken');
  const qrCourseEl  = document.getElementById('qrCourse');
  const qrSessionEl = document.getElementById('qrSession');
  const timerPill   = document.getElementById('timerPill');
  const timerText   = document.getElementById('timerText');

  if (!btnGenerate) return;

  let countdownInterval = null;

  btnGenerate.addEventListener('click', async () => {
    const courseId  = (document.getElementById('course_id')?.value  || '').trim();
    const sessionId = (document.getElementById('session_id')?.value || '').trim();

    if (!courseId)  { alert('Harap isi Course ID terlebih dahulu.');  return; }
    if (!sessionId) { alert('Harap isi Session ID terlebih dahulu.'); return; }

    setLoading(btnGenerate, true);

    try {
      const result = await gasPost('/presence/qr/generate', {
        course_id : courseId,
        session_id: sessionId,
        ts        : new Date().toISOString()
      });

      if (result.ok) {
        const token      = result.data.qr_token;
        const expireTime = result.data.expires_at
          ? new Date(result.data.expires_at).getTime()
          : Date.now() + QR_DURATION_MS;
        renderQR(token, courseId, sessionId, expireTime);
      } else {
        alert('Gagal generate QR:\n' + (result.error || 'Unknown error'));
      }

    } catch (err) {
      alert('Koneksi gagal: ' + err.message);
    } finally {
      setLoading(btnGenerate, false);
    }
  });

  function renderQR(token, courseId, sessionId, expireTime) {
    if (qrCourseEl)  qrCourseEl.textContent  = courseId;
    if (qrSessionEl) qrSessionEl.textContent = sessionId;

    qrSection.classList.remove('hidden');
    qrCodeEl.innerHTML = '';

    const qrPayload = JSON.stringify({
      token, course_id: courseId, session_id: sessionId
    });

    new QRCode(qrCodeEl, {
      text        : qrPayload,
      width       : 200,
      height      : 200,
      colorDark   : '#1e1b4b',
      colorLight  : '#ffffff',
      correctLevel: QRCode.CorrectLevel.M
    });

    qrTokenEl.textContent = token;
    startCountdown(expireTime);
    setTimeout(() => qrSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 120);
  }

  function startCountdown(expireTime) {
    clearInterval(countdownInterval);
    timerPill.classList.remove('expired');
    tick();
    countdownInterval = setInterval(tick, 1000);

    function tick() {
      const remaining = expireTime - Date.now();
      if (remaining <= 0) {
        clearInterval(countdownInterval);
        timerPill.classList.add('expired');
        timerText.textContent = 'Token expired';
        return;
      }
      const totalSec = Math.floor(remaining / 1000);
      const mins = Math.floor(totalSec / 60);
      const secs = totalSec % 60;
      timerText.textContent = mins > 0
        ? `Berlaku ${mins}m ${String(secs).padStart(2, '0')}s`
        : `Berlaku ${totalSec} detik lagi`;
    }
  }

})();