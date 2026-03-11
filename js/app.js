/* ══════════════════════════════════════════════
   app.js — Tab switching + theme
   (role gate logic ada di inline script index.html)
   ══════════════════════════════════════════════ */

/* ── SHARED HELPERS (dipakai di semua module) ── */
function showResult(id, html, type, autoHide = 4000) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = `
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
      ${type === 'success'
        ? '<polyline points="20 6 9 17 4 12"/>'
        : '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>'}
    </svg>
    <span>${html}</span>`;
  el.className = 'result-box ' + type;
  el.classList.remove('hidden');
  if (autoHide > 0) {
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.classList.add('hidden'), autoHide);
  }
}

function setLoading(btn, on) {
  if (!btn) return;
  btn.disabled = on;
  btn.classList.toggle('is-loading', on);
}

/* ── STATUS bar update untuk accel ── */
function setAccelStatus(text, running) {
  const el = document.getElementById('accelStatus');
  if (!el) return;
  el.textContent = text;
  el.className = running ? 'stat-val stat-val--active' : 'stat-val stat-val--idle';
}