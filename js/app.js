/* ════════════════════════════════════════════════
   app.js — Shared utilities
   - Dark / Light theme toggle (dengan animasi icon)
   - Page switching Dosen ↔ Mahasiswa
   - Helper: setLoading(), showResult()
   ════════════════════════════════════════════════ */

/* ── THEME TOGGLE ──────────────────────────────── */
(function initTheme() {
  const btn = document.getElementById('themeToggle');
  if (!btn) return;

  // Cek preferensi sistem
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  if (prefersDark) document.body.classList.add('dark');

  btn.addEventListener('click', () => {
    document.body.classList.toggle('dark');
  });
})();


/* ── PAGE SWITCHING ────────────────────────────── */
(function initPageSwitch() {
  const btnDosen      = document.getElementById('btnDosen');
  const btnMahasiswa  = document.getElementById('btnMahasiswa');
  const indicator     = document.getElementById('segIndicator');
  const dosenPage     = document.getElementById('dosenPage');
  const mahasiswaPage = document.getElementById('mahasiswaPage');

  if (!btnDosen || !btnMahasiswa) return;

  btnDosen.addEventListener('click', () => switchTo('dosen'));
  btnMahasiswa.addEventListener('click', () => switchTo('mahasiswa'));

  function switchTo(page) {
    if (page === 'dosen') {
      indicator.classList.remove('right');
      btnDosen.classList.add('active');
      btnMahasiswa.classList.remove('active');
      dosenPage.classList.add('active-page');
      mahasiswaPage.classList.remove('active-page');
      // Hentikan scanner jika aktif
      if (typeof window.stopScanner === 'function') window.stopScanner();
    } else {
      indicator.classList.add('right');
      btnMahasiswa.classList.add('active');
      btnDosen.classList.remove('active');
      mahasiswaPage.classList.add('active-page');
      dosenPage.classList.remove('active-page');
    }
  }
})();


/* ── HELPER: SET LOADING ───────────────────────── */
function setLoading(btn, isLoading) {
  if (!btn) return;
  if (isLoading) {
    btn.classList.add('is-loading');
    btn.disabled = true;
  } else {
    btn.classList.remove('is-loading');
    btn.disabled = false;
  }
}


/* ── HELPER: SHOW RESULT BOX ───────────────────── */
/**
 * @param {string}             elementId  - ID elemen result box
 * @param {string}             msg        - Pesan (boleh HTML)
 * @param {'success'|'error'}  type
 * @param {number}             [autohide] - ms, 0 = tidak auto-hide
 */
function showResult(elementId, msg, type, autohide = 7000) {
  const el = document.getElementById(elementId);
  if (!el) return;

  const iconOk  = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`;
  const iconErr = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="16" r="0.6" fill="currentColor" stroke="none"/></svg>`;

  el.className = `result-box ${type}`;
  el.innerHTML = (type === 'success' ? iconOk : iconErr) + `<span>${msg}</span>`;
  el.classList.remove('hidden');

  clearTimeout(el._timer);
  if (autohide > 0) {
    el._timer = setTimeout(() => el.classList.add('hidden'), autohide);
  }
}