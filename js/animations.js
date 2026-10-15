/* ============================================================
   animations.js – GSAP/ScrollTrigger-Bewegung für die Startseite.
   Läuft nur, wenn GSAP erfolgreich von CDN geladen hat und der
   Nutzer keine reduzierte Bewegung eingestellt hat (prefers-reduced-
   motion) — sonst bleibt die Seite einfach in ihrem normalen,
   sofort sichtbaren Zustand (kein FOUC, kein Ausschluss).
   ============================================================ */
'use strict';

(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  gsap.registerPlugin(ScrollTrigger);

  // ── Hero: Elemente kommen gestaffelt rein ────────────────
  gsap.from('.hero .label, .hero .offen, .hero h1, .hero .lead, .hero-split .photo', {
    opacity: 0,
    y: 26,
    duration: 0.9,
    stagger: 0.12,
    ease: 'power2.out',
  });
  gsap.from('.hero .aushang-wrap', {
    opacity: 0,
    y: 20,
    duration: 0.7,
    delay: 0.4,
    ease: 'power2.out',
  });

  // ── Dezenter Parallax auf der Hügellandschaft im Header ──
  gsap.to('.hof-landschaft svg', {
    yPercent: 14,
    ease: 'none',
    scrollTrigger: { trigger: 'header', start: 'top top', end: 'bottom top', scrub: true },
  });

  // ── Sections beim Reinscrollen sanft einblenden ──────────
  document.querySelectorAll('main > section, main > .ringwall').forEach((el) => {
    if (el.closest('.hero')) return;
    gsap.from(el, {
      opacity: 0,
      y: 36,
      duration: 0.8,
      ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 85%' },
    });
  });

  // ── Produkt-Karten leicht gestaffelt ──────────────────────
  gsap.from('.grid-produkte .produkt', {
    opacity: 0,
    y: 22,
    duration: 0.6,
    stagger: 0.08,
    ease: 'power2.out',
    scrollTrigger: { trigger: '.grid-produkte', start: 'top 85%' },
  });

  // ── Ringwall-Trennlinien zeichnen sich beim Scrollen ─────
  document.querySelectorAll('.ringwall svg path').forEach((path) => {
    const len = path.getTotalLength();
    gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
    gsap.to(path, {
      strokeDashoffset: 0,
      duration: 1.2,
      ease: 'power1.inOut',
      scrollTrigger: { trigger: path, start: 'top 90%' },
    });
  });
})();
