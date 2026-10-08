'use strict';

(function () {
  // ── Mobile-Nav-Overlay ───────────────────────────────────
  const toggle = document.querySelector('.nav-toggle');
  const overlay = document.getElementById('nav-overlay');
  const closeBtn = overlay ? overlay.querySelector('.nav-overlay__close') : null;

  function openNav() {
    overlay.classList.add('is-open');
    toggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }
  function closeNav() {
    overlay.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  if (toggle && overlay) {
    toggle.addEventListener('click', () => {
      overlay.classList.contains('is-open') ? closeNav() : openNav();
    });
    if (closeBtn) closeBtn.addEventListener('click', closeNav);
    overlay.querySelectorAll('nav a').forEach(a => a.addEventListener('click', closeNav));
    window.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeNav();
    });
  }

  // ── Angebots-Popup schließen (merkt sich das für die Sitzung) ──
  const popup = document.getElementById('angebot-popup');
  const popupClose = document.getElementById('angebot-popup-close');
  if (popup && popupClose) {
    popupClose.addEventListener('click', () => {
      popup.hidden = true;
      try { sessionStorage.setItem('angebot-popup-dismissed', '1'); } catch (e) {}
    });
  }

  // ── Aktuelle Seite in der Nav markieren ──────────────────
  const here = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('nav a[href]').forEach(a => {
    if (a.getAttribute('href') === here) a.setAttribute('aria-current', 'page');
  });
})();
