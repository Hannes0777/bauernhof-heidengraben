(() => {
  'use strict';
  const form = document.getElementById('contact-form');
  if (!form) return;

  const ENDPOINT = 'https://contact-form-bauernhof-heidengraben.workers.dev';
  const statusEl = form.querySelector('.form-status');
  const submitBtn = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Wird gesendet …';
    statusEl.hidden = true;

    const fd = new FormData(form);
    const payload = Object.fromEntries(fd.entries());

    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('request failed');
      form.reset();
      statusEl.hidden = false;
      statusEl.dataset.state = 'ok';
      statusEl.textContent = 'Vielen Dank! Ihre Nachricht ist angekommen, wir melden uns zeitnah.';
    } catch {
      statusEl.hidden = false;
      statusEl.dataset.state = 'error';
      statusEl.textContent = 'Die Nachricht konnte gerade nicht gesendet werden. Bitte rufen Sie uns alternativ unter 07382 9387603 an.';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Nachricht senden';
    }
  });
})();
