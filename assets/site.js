// Header state, mobile menu, and restrained scroll motion.
// All content is visible without this file: animation only ever starts from a state set here.
(function () {
  var root = document.documentElement;
  var header = document.querySelector('[data-header]');

  if (header) {
    var onScroll = function () { header.classList.toggle('is-scrolled', window.scrollY > 24); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    var toggle = header.querySelector('.nav-toggle');
    var menu = header.querySelector('.mobile-nav');
    if (toggle && menu) {
      var setOpen = function (open) {
        menu.hidden = !open;
        toggle.setAttribute('aria-expanded', String(open));
        toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
        header.classList.toggle('is-open', open);
      };
      toggle.addEventListener('click', function () { setOpen(menu.hidden); });
      menu.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(false); });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && !menu.hidden) { setOpen(false); toggle.focus(); }
      });
    }
  }

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !window.gsap || !window.ScrollTrigger) { root.classList.remove('js-anim'); return; }

  gsap.registerPlugin(ScrollTrigger);
  root.classList.remove('js-anim');

  // Hero entrance
  var enter = gsap.utils.toArray('[data-enter]');
  if (enter.length) gsap.from(enter, { opacity: 0, y: 22, duration: 1, ease: 'power3.out', stagger: 0.09, delay: 0.1 });
  var heroImg = document.querySelector('.hero__media img');
  if (heroImg) gsap.from(heroImg, { scale: 1.05, duration: 1.8, ease: 'power2.out' });

  // Scroll reveals. Opacity only, never visibility, so keyboard focus still reaches everything.
  var items = gsap.utils.toArray('[data-reveal]');
  if (!document.querySelector('.hero')) {
    items = items.concat(gsap.utils.toArray(
      'main section h2, main section .grid > *, main article .prose-article > h2, main details, main ol > li, .cta-band__inner > * > *'
    ));
  }
  items = items.filter(function (el, i, all) {
    return all.indexOf(el) === i && !el.closest('form, #intake, #install, .page-hero, .hidden');
  });
  items.forEach(function (el) { el.classList.add('js-reveal'); });
  gsap.set(items, { opacity: 0, y: 26 });
  ScrollTrigger.batch(items, {
    start: 'top 92%',
    once: true,
    onEnter: function (batch) {
      gsap.to(batch, { opacity: 1, y: 0, duration: 0.85, ease: 'power3.out', stagger: 0.07, clearProps: 'transform,opacity' });
    }
  });

  // Count the stats up once, from the real number already in the HTML.
  gsap.utils.toArray('[data-count]').forEach(function (el) {
    var end = parseFloat(el.getAttribute('data-count'));
    var suffix = el.getAttribute('data-suffix') || '';
    var state = { v: 0 };
    ScrollTrigger.create({
      trigger: el, start: 'top 92%', once: true,
      onEnter: function () {
        gsap.to(state, {
          v: end, duration: 1.4, ease: 'power2.out',
          onUpdate: function () { el.textContent = Math.round(state.v) + suffix; }
        });
      }
    });
  });

  // Gentle parallax, large screens only.
  gsap.matchMedia().add('(min-width: 900px)', function () {
    var depth = function (sel, trigger, vars) {
      if (document.querySelector(sel)) {
        gsap.to(sel, Object.assign({ ease: 'none', scrollTrigger: { trigger: trigger, start: 'top top', end: 'bottom top', scrub: true } }, vars));
      }
    };
    depth('.hero__media', '.hero', { yPercent: 7 });
    depth('.page-hero__media', '.page-hero', { yPercent: 7 });
    if (document.querySelector('.about__ghost')) {
      gsap.to('.about__ghost', { xPercent: -5, ease: 'none', scrollTrigger: { trigger: '.about', start: 'top bottom', end: 'bottom top', scrub: true } });
    }
  });

  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
  setTimeout(function () { ScrollTrigger.refresh(); }, 700);
})();
