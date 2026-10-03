document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.site-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
  }

  const path = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.site-nav a').forEach(a => {
    if (a.getAttribute('href') === path) a.classList.add('active');
  });

  const calc = document.querySelector('[data-loan-calculator]');
  if (calc) {
    const amount = calc.querySelector('#calcAmount');
    const rate = calc.querySelector('#calcRate');
    const years = calc.querySelector('#calcYears');
    const result = calc.querySelector('#calcPayment');
    const update = () => {
      const P = parseFloat(amount?.value || 0);
      const annual = parseFloat(rate?.value || 0) / 100;
      const n = parseInt(years?.value || 0, 10) * 12;
      if (!result) return;
      let m = 0;
      if (P > 0 && n > 0) {
        const r = annual / 12;
        m = r ? P * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1) : P / n;
      }
      result.textContent = m ? m.toLocaleString('en-US', {style:'currency', currency:'USD', maximumFractionDigits:0}) : '$0';
    };
    [amount, rate, years].forEach(x => x && x.addEventListener('input', update));
    update();
  }

  document.querySelectorAll('[data-site-form]').forEach(form => {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const status = form.querySelector('.form-status');
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      const honeypot = form.querySelector('[name="website"]');
      if (honeypot?.value) return;
      const submit = form.querySelector('button[type="submit"]');
      const endpoint = form.dataset.apiEndpoint;
      const payload = Object.fromEntries(new FormData(form).entries());
      delete payload.website;
      submit.disabled = true;
      status.className = 'form-status is-loading';
      status.textContent = 'Sending…';
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
          body: JSON.stringify(payload)
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || 'We could not send your request. Please try again.');
        form.reset();
        status.className = 'form-status is-success';
        status.textContent = data.message || 'Thank you. Your message has been sent.';
      } catch (error) {
        status.className = 'form-status is-error';
        status.textContent = error.message || 'We could not send your request. Please try again.';
      } finally {
        submit.disabled = false;
      }
    });
  });
});
