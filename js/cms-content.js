/* ============================================================
   cms-content.js – lädt die vom Sveltia-CMS gepflegten JSON-Dateien
   aus /content/ und überschreibt die statischen Platzhaltertexte im
   HTML. Schlägt ein Fetch fehl (noch keine Datei, CMS ungenutzt),
   bleibt der im HTML vorhandene Fallback-Text einfach stehen –
   die Seite funktioniert also auch ohne CMS-Pflege vollständig.
   ============================================================ */
'use strict';

(async function () {

  async function fetchJSON(path) {
    try {
      const r = await fetch(path, { cache: 'no-store' });
      if (!r.ok) throw new Error(r.status);
      return await r.json();
    } catch (e) {
      console.warn('[CMS] Konnte nicht laden:', path, e.message);
      return null;
    }
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el && value != null && value !== '') el.textContent = value;
  }

  // ── Angebots-Banner: nur zeigen, wenn heute im Gültigkeitszeitraum ──
  async function renderAngebot() {
    const banner = document.getElementById('angebot-banner');
    if (!banner) return;
    const data = await fetchJSON('content/angebote.json');
    const liste = (data && Array.isArray(data.angebote)) ? data.angebote : null;
    if (!liste) return; // kein JSON -> statischer Fallback im HTML bleibt stehen

    const heute = new Date().toISOString().slice(0, 10);
    const aktuell = liste.find(a => a.gueltig_von <= heute && heute <= a.gueltig_bis);

    if (!aktuell) {
      banner.hidden = true;
      return;
    }
    banner.hidden = false;
    setText('angebot-titel', aktuell.titel);
    const bisText = aktuell.gueltig_bis
      ? 'bis ' + new Date(aktuell.gueltig_bis + 'T00:00:00').toLocaleDateString('de-DE', { day: 'numeric', month: 'long' })
      : '';
    const zusatz = [aktuell.hinweis, bisText].filter(Boolean).join(' · ');
    setText('angebot-zusatz', zusatz);

    // Kleines Popup zusätzlich zum Banner, einmal pro Browser-Sitzung
    const popup = document.getElementById('angebot-popup');
    if (popup && sessionStorage.getItem('angebot-popup-dismissed') !== '1') {
      setText('popup-angebot-titel', aktuell.titel);
      setText('popup-angebot-zusatz', zusatz);
      popup.hidden = false;
    }
  }

  // ── Hero (nur Startseite) ────────────────────────────────
  async function renderHero() {
    const title = document.getElementById('hero-title');
    if (!title) return;
    const data = await fetchJSON('content/hero.json');
    if (!data) return;
    setText('hero-eyebrow', data.eyebrow);
    setText('hero-title', data.title);
    setText('hero-lead', data.lead);
  }

  // ── Produkte ──────────────────────────────────────────────
  async function renderProdukte() {
    const grid = document.getElementById('produkte-grid');
    if (!grid) return;
    const data = await fetchJSON('content/produkte.json');
    if (!data || !Array.isArray(data.produkte) || !data.produkte.length) return;
    grid.innerHTML = data.produkte.map(p => `
      <div class="produkt">
        ${p.bild ? `<img class="produkt__bild" src="${escapeHtml(p.bild)}" width="520" height="390" alt="${escapeHtml(p.titel)}" loading="lazy">` : ''}
        <h3>${escapeHtml(p.titel)}</h3>
        <p>${escapeHtml(p.text)}</p>
      </div>`).join('');
  }

  // ── Kontakt/Steckbrief (mehrere Stellen auf der Seite) ──────
  async function renderKontakt() {
    const data = await fetchJSON('content/kontakt.json');
    if (!data) return;
    document.querySelectorAll('[data-kontakt="strasse-ort"]').forEach(el => {
      if (data.strasse && data.ort) el.textContent = `${data.strasse}, ${data.ort}`;
    });
    document.querySelectorAll('[data-kontakt="telefon"]').forEach(el => {
      if (data.telefon) el.textContent = data.telefon;
      if (data.telefon_href && el.tagName === 'A') el.href = 'tel:' + data.telefon_href;
    });
    document.querySelectorAll('[data-kontakt="email"]').forEach(el => {
      if (data.email) {
        el.textContent = data.email;
        if (el.tagName === 'A') el.href = 'mailto:' + data.email;
      }
    });
    document.querySelectorAll('[data-kontakt="oeffnungszeiten"]').forEach(el => {
      if (data.oeffnungszeiten) el.textContent = data.oeffnungszeiten;
    });
    document.querySelectorAll('[data-kontakt="map"]').forEach(el => {
      if (data.map_embed_url) el.src = data.map_embed_url;
    });
  }

  function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  await Promise.all([renderHero(), renderAngebot(), renderProdukte(), renderKontakt()]);
})();
