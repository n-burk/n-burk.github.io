// Scroll reveals + timeline scrollspy + smooth anchor scroll
(function () {
  // Reveal on scroll
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));

  // Timeline scrollspy
  const tlNav = document.getElementById('tl-nav');
  if (tlNav) {
    const buttons = [...tlNav.querySelectorAll('button')];
    const targets = buttons.map(b => document.getElementById(b.dataset.target));

    buttons.forEach((btn, i) => {
      btn.addEventListener('click', () => {
        const t = targets[i];
        if (!t) return;
        const y = t.getBoundingClientRect().top + window.scrollY - 96;
        window.scrollTo({ top: y, behavior: 'smooth' });
      });
    });

    const spy = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const id = e.target.id;
          buttons.forEach(b => b.dataset.active = String(b.dataset.target === id));
        }
      });
    }, { rootMargin: '-30% 0px -50% 0px', threshold: 0 });
    targets.forEach(t => t && spy.observe(t));
  }

  // Smooth anchor scroll for top nav
  document.querySelectorAll('nav.top a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href').slice(1);
      const t = document.getElementById(id);
      if (!t) return;
      e.preventDefault();
      const y = t.getBoundingClientRect().top + window.scrollY - 64;
      window.scrollTo({ top: y, behavior: 'smooth' });
    });
  });
})();
