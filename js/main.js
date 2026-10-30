(() => {
  const body = document.body;
  const nav = document.getElementById('siteNav');
  const hero = document.getElementById('top');
  const video = document.getElementById('heroVideo');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- Nav theme from what sits under the bar ----------
     No bar: the text and logo take whichever of navy / ivory contrasts with
     the layer under the bar's centre. A [data-nav] tag wins; a photo or video
     is judged by the brightness of the strip behind the bar; otherwise a solid
     background colour by its lightness. */
  const probe = document.createElement('canvas');
  probe.width = 32; probe.height = 4;
  const probeCtx = probe.getContext('2d', { willReadFrequently: true });
  const mediaLook = (el) => {
    const r = el.getBoundingClientRect();
    const w = el.naturalWidth || el.videoWidth, h = el.naturalHeight || el.videoHeight;
    if (!w || !h || r.height <= 0) return 'navy';
    // the part of the media under the bar, assuming it fills its box
    const top = Math.max(0, -r.top) / r.height;
    const span = Math.min(1 - top, nav.offsetHeight / r.height);
    try {
      probeCtx.drawImage(el, 0, top * h, w, Math.max(1, span * h), 0, 0, 32, 4);
      const d = probeCtx.getImageData(0, 0, 32, 4).data;
      let sum = 0;
      for (let i = 0; i < d.length; i += 4) sum += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      return sum / (d.length / 4) / 255 > 0.6 ? 'light' : 'navy';
    } catch (e) {
      return 'navy'; // unreadable (e.g. opened from disk): ivory text over photos
    }
  };
  const navLook = (el) => {
    const tagged = el.closest('[data-nav]');
    if (tagged && tagged.dataset.nav) return tagged.dataset.nav;
    if (el.tagName === 'IMG' || el.tagName === 'VIDEO') return mediaLook(el);
    const cs = getComputedStyle(el);
    const m = cs.backgroundColor.match(/[\d.]+/g);
    if (m && (m[3] === undefined || +m[3] > 0.5)) {
      const lum = (0.299 * m[0] + 0.587 * m[1] + 0.114 * m[2]) / 255;
      return lum < 0.4 ? 'navy' : 'light';
    }
    if (cs.backgroundImage.startsWith('url(')) return 'image';
    return null;
  };
  const visible = (el) => {
    let o = 1;
    for (let n = el; n && n !== document.body; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.visibility === 'hidden' || cs.display === 'none') return false;
      o *= +cs.opacity;
      if (o < 0.5) return false;
    }
    return true;
  };
  const themeNav = () => {
    const y = nav.offsetHeight / 2;
    // layers with pointer-events: none still count, so lift that for the probe
    document.documentElement.classList.add('nav-probe');
    const stack = document.elementsFromPoint(window.innerWidth / 2, y);
    document.documentElement.classList.remove('nav-probe');
    let look = 'light';
    for (const el of stack) {
      if (nav.contains(el) || el.closest('.preloader') || !visible(el)) continue;
      const l = navLook(el);
      if (l) { look = l; break; }
    }
    nav.classList.toggle('is-inked', look === 'light');
  };
  // Scrubbed scenes keep easing for a moment after the scroll stops, so keep
  // re-checking every 120ms until 1.5s after the last scroll
  let lastScroll = 0, navLoop = 0;
  const navPoll = () => {
    themeNav();
    navLoop = performance.now() - lastScroll < 1500 ? setTimeout(navPoll, 120) : 0;
  };
  const queueNav = () => { lastScroll = performance.now(); if (!navLoop) navLoop = setTimeout(navPoll, 60); };
  window.addEventListener('scroll', queueNav, { passive: true });
  window.addEventListener('resize', queueNav);
  window.addEventListener('load', themeNav);
  themeNav();

  /* ---------- Smooth scroll (Lenis on GSAP's ticker) ----------
     One clock for scroll and animation: Lenis advances on gsap.ticker and
     feeds ScrollTrigger, so scrubbed timelines never drift from the page. */
  const hasGsap = window.gsap && window.ScrollTrigger;
  if (hasGsap) gsap.registerPlugin(ScrollTrigger);
  let lenis = null;
  if (hasGsap && window.Lenis && !reduceMotion.matches) {
    lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  const scrollToEl = (el, instant) => {
    if (el == null) return;
    // the hero is sticky, so its live position is no guide: it always starts at 0
    if (el.id === 'top') el = 0;
    // a number is an exact scroll position (a point inside a pinned timeline)
    if (typeof el === 'number') {
      if (lenis) lenis.scrollTo(el, instant ? { immediate: true, force: true } : { duration: 1.6 });
      else window.scrollTo({ top: el, behavior: instant || reduceMotion.matches ? 'auto' : 'smooth' });
      return;
    }
    // pinned sections start where their pin starts, not under the bar
    const pin = ScrollTrigger.getAll().find((st) => st.pin === el);
    if (pin) return scrollToEl(pin.start, instant);
    if (instant) return scrollToEl(el.getBoundingClientRect().top + window.scrollY, true);
    if (lenis) lenis.scrollTo(el, { offset: -70, duration: 1.6 });
    else el.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth' });
  };
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || a.closest('.menu__nav') || a.classList.contains('skip-link')) return;
    const el = document.querySelector(a.getAttribute('href'));
    if (!el) return;
    e.preventDefault();
    scrollToEl(el);
  });

  /* ---------- Intro ---------- */
  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    requestAnimationFrame(() => body.classList.add('is-loaded'));
  };

  /* ---------- Preloader ----------
     Covers the first load (at least LOADER_MIN so one build of the mark plays)
     and every jump from the menu: it fades in, the page jumps underneath while
     it is covered, the scrubbed timelines catch up, then it fades out. */
  const loader = document.getElementById('preloader');
  const LOADER_MIN = 1800;
  const LOADER_FADE = 700;
  const SETTLE = 1200; // scrub: 1 needs about a second to catch up after a jump
  const hideLoader = () => {
    loader.classList.add('is-done');
    loader.setAttribute('aria-hidden', 'true');
  };
  const showLoader = () => {
    // a fresh copy of the mark starts the build from the first frame
    const svg = loader.querySelector('svg');
    svg.replaceWith(svg.cloneNode(true));
    loader.removeAttribute('aria-hidden');
    loader.classList.remove('is-done');
  };
  const viaLoader = (move) => {
    showLoader();
    const shown = performance.now();
    setTimeout(() => {
      move();
      setTimeout(hideLoader, Math.max(SETTLE, LOADER_MIN - (performance.now() - shown)));
    }, LOADER_FADE);
  };

  const pageStart = performance.now();
  let loaderGone = false;
  const firstReveal = () => {
    if (loaderGone) return;
    loaderGone = true;
    setTimeout(() => {
      hideLoader();
      start();
    }, Math.max(0, LOADER_MIN - (performance.now() - pageStart)));
  };
  if (document.readyState === 'complete') firstReveal();
  else window.addEventListener('load', firstReveal, { once: true });
  setTimeout(firstReveal, 8000); // never hold the page hostage to a slow asset

  /* ---------- Ink bleed (Cartier-style scroll transition) ----------
     Ivory blots open from staggered seeds, grow and merge until the frame
     is fully ivory, which is exactly the background of the next section.
     Canvas draws soft discs; the SVG #inkEdge filter roughens the edges. */
  const pin = document.getElementById('heroPin');
  const ink = document.getElementById('heroInk');
  const ctx = ink.getContext('2d');
  const INK = '245, 241, 232';
  const SCALE = 0.5; // half-res canvas: edges are soft anyway, and it keeps scrolling smooth

  let rand = 20261022;
  const rnd = () => ((rand = (rand * 16807) % 2147483647) / 2147483647);
  // early drops are small and scattered; later ones are large and close the gaps
  const seeds = Array.from({ length: 22 }, (_, i) => ({
    x: 0.04 + rnd() * 0.92, y: 0.06 + rnd() * 0.88,
    t0: 0.04 + (i / 22) * 0.6 + rnd() * 0.04,
    size: 0.08 + (i / 22) * 0.3 + rnd() * 0.08,
  }));
  seeds.push({ x: 0.5, y: 0.5, t0: 0.6, size: 0.75 });

  // Second, unfiltered canvas: the sketch shown inside the blots (the filter would warp it)
  const sk = document.createElement('canvas');
  sk.className = 'hero__ink hero__ink--sketch';
  sk.setAttribute('aria-hidden', 'true');
  ink.after(sk);
  const sctx = sk.getContext('2d');

  const sizeInk = () => {
    ink.width = sk.width = Math.ceil(ink.clientWidth * SCALE);
    ink.height = sk.height = Math.ceil(ink.clientHeight * SCALE);
  };
  const ease = (t) => 1 - Math.pow(1 - t, 3);

  const drawInk = (p) => {
    const w = ink.width, h = ink.height;
    ctx.clearRect(0, 0, w, h);
    sctx.clearRect(0, 0, w, h);
    if (p <= 0) return;
    const diag = Math.hypot(w, h);
    for (const s of seeds) {
      const t = Math.min(Math.max((p - s.t0) / 0.35, 0), 1);
      if (!t) continue;
      const r = ease(t) * s.size * diag;
      const g = ctx.createRadialGradient(s.x * w, s.y * h, 0, s.x * w, s.y * h, r);
      g.addColorStop(0, `rgba(${INK},1)`);
      g.addColorStop(0.72, `rgba(${INK},0.97)`);
      g.addColorStop(0.9, `rgba(${INK},0.55)`);
      g.addColorStop(1, `rgba(${INK},0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(s.x * w, s.y * h, r, 0, Math.PI * 2);
      ctx.fill();

      // sketch mask: a slightly smaller soft disc, so a rough ivory rim frames it
      const sr = r * 0.8;
      const m = sctx.createRadialGradient(s.x * w, s.y * h, 0, s.x * w, s.y * h, sr);
      m.addColorStop(0, 'rgba(0,0,0,1)');
      m.addColorStop(0.6, 'rgba(0,0,0,1)');
      m.addColorStop(1, 'rgba(0,0,0,0)');
      sctx.fillStyle = m;
      sctx.beginPath();
      sctx.arc(s.x * w, s.y * h, sr, 0, Math.PI * 2);
      sctx.fill();
    }
    // final wash guarantees a seamless hand-off to the ivory section
    const wash = Math.min(Math.max((p - 0.86) / 0.12, 0), 1);
    if (wash) {
      ctx.fillStyle = `rgba(${INK},${wash})`; ctx.fillRect(0, 0, w, h);
      sctx.fillStyle = `rgba(0,0,0,${wash})`; sctx.fillRect(0, 0, w, h);
    }

    // Fill the mask with the sketch, cropped like .intro__sketch (cover, 40% vertical,
    // scale 1.05) over the visible hero area (canvas overhangs it by 90px each side).
    if (sketch.complete && sketch.naturalWidth) {
      const pad = 90 * SCALE, vw = w - pad * 2, vh = h - pad * 2;
      const s = Math.max(vw / sketch.naturalWidth, vh / sketch.naturalHeight) * 1.05;
      const dw = sketch.naturalWidth * s, dh = sketch.naturalHeight * s;
      sctx.globalCompositeOperation = 'source-in';
      sctx.drawImage(sketch, pad + (vw - dw) / 2, pad + (vh - dh) * 0.4, dw, dh);
      sctx.globalCompositeOperation = 'source-over';
    }
  };
  const sketch = new Image();
  sketch.src = 'Assets/Architectural Sketch of MJR Gate Entrance.png';

  /* ---------- Scroll & ink sizing ---------- */
  let scrollTimer;
  window.addEventListener('resize', () => {
    sizeInk();
    if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
  });
  sizeInk();

  /* ---------- Video pause/play (WCAG 2.2.2) ---------- */
  const toggle = document.getElementById('videoToggle');
  const toggleLabel = toggle.querySelector('.hero__motion-label');
  const setPaused = (paused) => {
    toggle.setAttribute('aria-pressed', String(paused));
    toggle.setAttribute('aria-label', paused ? 'Play background video' : 'Pause background video');
    toggleLabel.textContent = paused ? 'Play' : 'Pause';
  };
  toggle.addEventListener('click', () => {
    if (video.paused) { video.play().catch(() => {}); setPaused(false); }
    else { video.pause(); setPaused(true); }
  });
  if (reduceMotion.matches) { video.removeAttribute('autoplay'); video.pause(); setPaused(true); }
  else video.play().catch(() => setPaused(true));

/* ---------- Dialog helpers (animated open/close) ---------- */
  const openDialog = (dlg) => {
    lenis && lenis.stop();
    dlg.showModal();
    requestAnimationFrame(() => requestAnimationFrame(() => dlg.classList.add('is-open')));
  };
  const closeDialog = (dlg, after) => {
    if (!dlg.open) { after && after(); return; }
    dlg.classList.remove('is-open');
    const done = () => { dlg.close(); lenis && lenis.start(); after && after(); };
    if (reduceMotion.matches) done();
    else setTimeout(done, dlg.id === 'menuDialog' ? 650 : 380);
  };
  [ 'menuDialog', 'bookingDialog' ].forEach((id) => {
    const dlg = document.getElementById(id);
    dlg.addEventListener('cancel', (e) => { e.preventDefault(); closeDialog(dlg); });
  });

  /* ---------- Menu ---------- */
  // Menu items that land inside the pinned overview timeline (set up below)
  const menuSpots = {};
  const menu = document.getElementById('menuDialog');
  const menuOpenBtn = document.getElementById('menuOpenBtn');
  menuOpenBtn.addEventListener('click', () => openDialog(menu));
  document.getElementById('menuCloseBtn').addEventListener('click', () => closeDialog(menu, () => menuOpenBtn.focus()));
  // The logo closes the menu and returns to the hero
  document.getElementById('menuHome').addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    // the menu fades out over the loader, then the page jumps while covered
    closeDialog(menu);
    viaLoader(() => {
      scrollToEl(0, true);
      history.replaceState(null, '', '#top');
    });
  });
  menu.querySelectorAll('.menu__nav a').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const spot = a.dataset.spot && (menuSpots[a.dataset.spot] || (window.MJR_SPOTS || {})[a.dataset.spot]);
      closeDialog(menu);
      viaLoader(() => {
        const target = spot ? spot() : document.querySelector(a.getAttribute('href'));
        scrollToEl(target, true);
        history.replaceState(null, '', a.getAttribute('href'));
      });
    });
  });

  /* ---------- Booking (site visit / brochure) ---------- */
  const booking = document.getElementById('bookingDialog');
  const form = document.getElementById('bookingForm');
  const formView = document.getElementById('bookingFormView');
  const doneView = document.getElementById('bookingDoneView');
  const copy = {
    visit: {
      title: 'Schedule a site visit',
      intro: 'Walk the layout, see the roads and pick out plots in person. Our sales team will call to confirm a time.',
      submit: 'Request a call back',
      done: 'Our sales team will call you shortly to confirm your site visit.',
      date: true,
    },
    brochure: {
      title: 'Download the brochure',
      intro: 'Share your number and we will send the MJR Township brochure along with the latest plot availability.',
      submit: 'Send me the brochure',
      done: 'The brochure is on its way. Our team may call to answer any questions.',
      date: false,
    },
  };
  let lastTrigger = null;

  const openBooking = (mode, trigger, plot) => {
    const c = copy[mode] || copy.visit;
    lastTrigger = trigger;
    document.getElementById('bookingIntent').value = plot ? 'plot' : mode;
    document.getElementById('bookingPlot').value = plot || '';
    document.getElementById('bookingTitle').textContent = plot ? `Enquire about Plot ${plot}` : c.title;
    document.getElementById('bookingIntro').textContent = plot
      ? `Share your number and our sales team will call with pricing, availability and a site visit for Plot ${plot}.`
      : c.intro;
    form.querySelector('.booking__submit-label').textContent = c.submit;
    document.getElementById('bkDateField').hidden = !c.date;
    document.getElementById('bookingDoneText').textContent = plot ? `Our sales team will call you shortly about Plot ${plot}.` : c.done;
    document.getElementById('bkDate').min = new Date().toISOString().slice(0, 10);
    formView.hidden = false;
    doneView.hidden = true;
    form.reset();
    form.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
    form.querySelectorAll('.field__error').forEach((el) => (el.hidden = true));
    openDialog(booking);
  };

  document.querySelectorAll('[data-open-booking]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.openBooking;
      if (menu.open) closeDialog(menu, () => openBooking(mode, menuOpenBtn));
      else openBooking(mode, btn);
    });
  });
  booking.querySelectorAll('[data-close-booking]').forEach((btn) =>
    btn.addEventListener('click', () => closeDialog(booking, () => lastTrigger && lastTrigger.focus()))
  );
  booking.addEventListener('click', (e) => { if (e.target === booking) closeDialog(booking); });

  const phone = document.getElementById('bkPhone');
  phone.addEventListener('input', () => { phone.value = phone.value.replace(/\D/g, '').slice(0, 10); });

  const validate = () => {
    const name = document.getElementById('bkName');
    const checks = [
      [name, document.getElementById('bkNameErr'), name.value.trim().length >= 2],
      [phone, document.getElementById('bkPhoneErr'), /^[6-9]\d{9}$/.test(phone.value)],
    ];
    let firstBad = null;
    checks.forEach(([input, err, ok]) => {
      input.setAttribute('aria-invalid', String(!ok));
      err.hidden = ok;
      if (!ok && !firstBad) firstBad = input;
    });
    if (firstBad) firstBad.focus();
    return !firstBad;
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validate()) return;
    const submit = document.getElementById('bookingSubmit');
    submit.setAttribute('aria-busy', 'true');
    submit.querySelector('.booking__submit-label').textContent = 'Sending...';
    // TODO: connect to the MJR sales CRM / lead endpoint. Until then the request is only acknowledged on screen.
    setTimeout(() => {
      submit.removeAttribute('aria-busy');
      formView.hidden = true;
      doneView.hidden = false;
      doneView.focus();
    }, 700);
  });

  /* ---------- Hero & Intro sequence (unified timeline on #heroPin) ----------
     1. Hero video plays with copy & facts.
     2. As user scrolls, hero copy fades and ivory ink bleeds across the video.
     3. The moment the ink fade finishes (at progress ~0.38):
        - Entrance photo opens immediately full-bleed (ivory curtain dissolves).
        - "INTRODUCING" appears on the entrance photo (bigger size, zero letter-spacing, no shadow).
     4. Township card (bigger size min(88vw, 820px)) slides up with 3D inclination
        directly over "INTRODUCING", placing "INTRODUCING" behind the card.
     5. Sequence settles and smoothly unpins directly into #overview. */
  if (hasGsap && !reduceMotion.matches) {
    const heroContent = document.getElementById('heroContent');
    const heroBase = document.querySelector('.hero__base');
    const intro = document.getElementById('intro');
    const photo = document.querySelector('.intro__photo');
    const photoImg = photo.querySelector('.intro__color');
    const sketchImg = photo.querySelector('.intro__sketch');
    const overlay = photo.querySelector('.intro__overlay');
    const word = document.querySelector('.intro__word');
    const wordInner = document.querySelector('.intro__word-inner');
    const logo = document.querySelector('.intro__logo');
    const facts = document.querySelectorAll('.intro__facts li');

    // Initial setup
    gsap.set(intro, { opacity: 0 });
    gsap.set([photoImg, sketchImg], { scale: 1.05 });
    gsap.set(photoImg, { '--fill': 0 });
    gsap.set(overlay, { opacity: 0 });
    gsap.set(word, {
      left: '50%',
      top: '50%',
      xPercent: -50,
      yPercent: -50,
      y: 0,
    });
    gsap.set(wordInner, {
      opacity: 0,
      scale: 1.25,
      letterSpacing: '0px',
    });
    gsap.set(logo, { opacity: 0, scale: 1.3 });
    gsap.set(facts, { opacity: 0, y: 24 });

    const inkTracker = { val: 0 };

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: '#heroPin',
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1.0,
        onUpdate: (self) => {
          body.classList.add('is-scrolling');
          clearTimeout(scrollTimer);
          scrollTimer = setTimeout(() => body.classList.remove('is-scrolling'), 150);
        },
      },
    });

    tl
      // Phase 1: Hero copy is gone by the time the ink is ~50-60% across (progress 0 -> 0.17)
      .to([heroContent, heroBase], { opacity: 0, y: -24, duration: 0.17, ease: 'power1.in' }, 0)

      // Phase 2: Ivory ink bleeds over the video (progress 0 -> 0.34)
      .to(inkTracker, {
        val: 1,
        duration: 0.34,
        ease: 'power1.inOut',
        onUpdate: () => drawInk(inkTracker.val),
      }, 0)

      // Phase 3 (after ink fade): sketch, colour fill, word, cards
      // Sketch fades in on the ivory background
      .to(intro, { opacity: 1, duration: 0.08, ease: 'power2.out' }, 0.30)
      // Photo slowly fills colour into the sketch from the centre outwards
      .to([photoImg, sketchImg], { scale: 1.0, duration: 0.30, ease: 'none' }, 0.30)
      .to(photoImg, { '--fill': 1, duration: 0.22, ease: 'power1.inOut' }, 0.36)
      .to(overlay, { opacity: 1, duration: 0.10, ease: 'power1.out' }, 0.50)

      // "INTRODUCING"
      .to(wordInner, { opacity: 1, scale: 1.0, duration: 0.08, ease: 'power2.out' }, 0.58)
      .addLabel('introducing', 0.66)

      // The word scales down further and fades out
      .to(wordInner, { opacity: 0, scale: 0.8, duration: 0.10, ease: 'power2.in' }, 0.68)

      // Township logo scales down into place as it fades in
      .to(logo, { opacity: 1, scale: 1, duration: 0.14, ease: 'power2.out' }, 0.76)

      // Facts rise in below the logo, one after another
      .to(facts, { opacity: 1, y: 0, stagger: 0.04, duration: 0.10, ease: 'power2.out' }, 0.88)

      // Hold before unpinning into #overview
      .to({}, { duration: 0.14 });

    // Menu "Overview" lands on the full "INTRODUCING" frame
    menuSpots.introducing = () => tl.scrollTrigger.labelToScroll('introducing');

    /* ---------- 03 Overview: pinned horizontal scroll ----------
       Copy rises in over Why MJR.svg -> track slides left -> big "Value pillars"
       -> pillars swing in from the right one at a time (centre -> left slot -> out)
       -> Master plan pulls open -> interactive Plot Card slides up from bottom. */
    const why = document.getElementById('overview');
    if (why) {
      body.classList.add('has-why-pin');
      const track = why.querySelector('.why__track');
      const introCopy = why.querySelectorAll('.why__panel--intro .why__title, .why__panel--intro .why__lede');
      const pillarsTitle = why.querySelector('.why__header--pillars') || why.querySelector('.why__title--pillars');
      const pillars = [...why.querySelectorAll('.pillar')];
      const copies = pillars.map((p) => p.querySelector('.pillar__copy'));
      const card = why.querySelector('.pcard');
      const mplanEl = why.querySelector('.mplan');
      const stage = document.getElementById('planStage');
      const tower = why.querySelector('.why__art--tower');
      const mplan = why.querySelector('.mplan');
      const mplanImg = why.querySelector('.mplan__img');
      const mplanLabel = why.querySelector('.mplan__label');
      const STRIP = 0.91; // strip left edge as a fraction of the viewport

      // Conveyor positions
      const OFF_RIGHT = { x: () => window.innerWidth, y: 0, rotation: 14, scale: 1, opacity: 1, filter: 'blur(0px)' };
      const CENTER = { x: 0, y: 0, rotation: 0, scale: 1, opacity: 1, filter: 'blur(0px)' };
      const LEFT = {
        x: () => window.innerWidth <= 640 ? 0 : -window.innerWidth * 0.37,
        y: () => window.innerWidth <= 640 ? -window.innerHeight * 0.39 : 0,
        rotation: 0,
        scale: 0.74,
        opacity: 0.8,
        filter: 'blur(3px)',
      };
      const OFF_LEFT = {
        x: () => window.innerWidth <= 640 ? 0 : -window.innerWidth * 0.9,
        y: () => window.innerWidth <= 640 ? -window.innerHeight * 0.72 : 0,
        rotation: () => window.innerWidth <= 640 ? 0 : -6,
        scale: () => window.innerWidth <= 640 ? 0.56 : 0.6,
        opacity: () => window.innerWidth <= 640 ? 0.65 : 0,
        filter: 'blur(6px)',
      };
      const move = { duration: 1, ease: 'power2.inOut' };
      // Next pillar waiting at the right edge: the first pillar's entry pose (14deg tilt),
      // paused with just the capital's corner showing
      const PEEK_TILT = 14;
      const PEEK = {
        x: () => {
          const vw = window.innerWidth;
          const w = pillars[0].querySelector('.pillar__img').offsetWidth / 2.2316;
          // capital height above the base pivot; the tilt swings it right by sin(a) * h
          const h = vw <= 640 ? window.innerHeight * 0.43 : Math.max(vw * 0.3396, window.innerHeight * 0.6037);
          const swing = Math.sin(PEEK_TILT * Math.PI / 180) * h;
          return vw / 2 + w / 2 - swing - vw * 0.04;
        },
        y: 0,
        rotation: PEEK_TILT, scale: 1, opacity: 1, filter: 'blur(0px)',
      };

      gsap.set(introCopy, { opacity: 0, y: 40 });
      gsap.set(pillarsTitle, { opacity: 0, scale: 0.92 });
      gsap.set(pillars, OFF_RIGHT);
      gsap.set(copies, { opacity: 0, y: 24 });
      gsap.set(card, {
        xPercent: () => window.innerWidth <= 640 ? -50 : 0,
        yPercent: () => window.innerWidth <= 640 ? 0 : -50,
        y: () => window.innerHeight * 1.2,
        rotationX: 24,
        rotationZ: -7,
        scale: 0.9,
        transformPerspective: 1200,
      });
      const ROAD_SCALE = 1606 / 1540;
      const roadScale = () => {
        if (window.innerWidth <= 640) {
          return Math.max(ROAD_SCALE, window.innerHeight / (window.innerWidth * 1540 / 979));
        }
        return ROAD_SCALE;
      };
      const roadX = () => {
        if (window.innerWidth <= 640) {
          return -0.07 * window.innerWidth * roadScale();
        }
        return -(45 / 1540) * window.innerWidth;
      };
      const roadPullStart = () => roadX() + window.innerWidth * 0.18;
      const grassPullStart = () => window.innerWidth * 0.18;
      const introY = () => {
        if (window.innerWidth <= 640) {
          return -(21 / 1540) * window.innerHeight;
        }
        const h = window.innerWidth * 979 / 1540;
        const vh = window.innerHeight;
        // Start 7% into the image at the top
        const base = -0.07 * h;
        // Bottom road starts around 0.76 * h; ensure at least 65px is visible above vh
        const roadY = 0.76 * h;
        if (base + roadY > vh - 65) {
          return vh - 65 - roadY;
        }
        return base;
      };

      gsap.set(mplan, {
        clipPath: window.innerWidth <= 640 ? 'inset(100% 0% 0% 0%)' : 'inset(0% 0% 0% 100%)',
      });
      gsap.set(stage, {
        x: () => window.innerWidth <= 640 ? roadX() : roadPullStart(),
        y: () => window.innerWidth <= 640 ? introY() + window.innerHeight * 0.18 : introY(),
        scale: roadScale,
        transformOrigin: '0 0',
      });
      gsap.set(mplanImg, {
        x: () => window.innerWidth <= 640 ? 0 : grassPullStart(),
        y: () => window.innerWidth <= 640 ? window.innerHeight * 0.18 : 0,
        scale: 1,
        transformOrigin: '50% 50%',
      });

      const explorer = initExplorer({ mplan: mplanEl, mplanImg, stage, card, openBooking, roadX, introY, roadScale });

      const whyTl = gsap.timeline({
        scrollTrigger: {
          trigger: why,
          start: 'top top',
          end: () => '+=' + window.innerHeight * 12.5,
          pin: true,
          scrub: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            const isScrollingBack = self.direction === -1;

            if (isScrollingBack) {
              // 1. If a plot is currently selected & zoomed, close popup & zoom back to overview
              if (explorer.getSelected && explorer.getSelected() !== null && self.progress < 0.99) {
                explorer.closePop();
              }
              // 2. If the card is minimized, expand it back to full card
              if (explorer.isMinimized && explorer.isMinimized() && self.progress < 0.85) {
                explorer.expand();
              }
              // 3. If the card is flipped, flip back to front overview
              if (explorer.isFlipped && explorer.isFlipped() && self.progress < 0.80) {
                explorer.reset(false);
              }
            }

            // Card has settled: run the tile wave once
            if (self.progress >= whyTl.labels.plan / whyTl.duration()) explorer.tease && explorer.tease();

            // Scrolling back before the card settled closes the explorer cleanly
            if (self.progress < 0.74) {
              explorer.reset(true);
            }
          },
          onLeaveBack: () => {
            explorer.reset(true);
          },
        },
      })
        // Panel 1
        .to(introCopy, { opacity: 1, y: 0, stagger: 0.15, duration: 0.5, ease: 'power2.out' })
        .to({}, { duration: 0.4 })
        .to(track, { x: () => -window.innerWidth, duration: 1.2, ease: 'power1.inOut' }, 'pan')
        .to(tower, {
          x: () => window.innerWidth <= 640
            ? -(tower.offsetLeft + tower.offsetWidth - window.innerWidth * 1.15)
            : 0,
          duration: window.innerWidth <= 640 ? 1.3 : 0.001,
          ease: 'power1.inOut',
        }, 'pan+=0.2')

        // Big "Value pillars"
        .to(pillarsTitle, { opacity: 1, scale: 1, duration: 0.5, ease: 'power2.out' }, window.innerWidth <= 640 ? 'pan+=1.35' : 'pan+=1.2')
        .to({}, { duration: 0.3 })

        // Pillar 1 swings in over the heading; heading fades
        .to(pillars[0], { ...CENTER, ...move }, 'p1')
        .to(pillars[1], { ...PEEK, ...move }, 'p1+=0.2')
        // Tower spills into panel 2; push its right edge past the left of the viewport
        .to(tower, { x: () => -(tower.offsetLeft + tower.offsetWidth - window.innerWidth) - 40, ...move }, 'p1')
        .to(pillarsTitle, { scale: 0.85, duration: 0.8, ease: 'power2.inOut' }, 'p1')
        .to(pillarsTitle, { opacity: 0, duration: 0.4, ease: 'power1.in' }, 'p1+=0.6')
        .to(copies[0], { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' })
        .to({}, { duration: 0.3 })

        // Pillar 2 pushes pillar 1 left
        .to(pillars[0], { ...LEFT, ...move }, 'p2')
        .to(pillars[1], { ...CENTER, ...move }, 'p2')
        .to(pillars[2], { ...PEEK, ...move }, 'p2+=0.2')
        .to(copies[1], { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' })
        .to({}, { duration: 0.3 })

        // Pillar 3 in, pillar 2 left, pillar 1 out
        .to(pillars[0], { ...OFF_LEFT, ...move }, 'p3')
        .to(pillars[1], { ...LEFT, ...move }, 'p3')
        .to(pillars[2], { ...CENTER, ...move }, 'p3')
        .to(copies[2], { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' })
        .to({}, { duration: 0.3 })
        // Master plan strip only after Belong has been read
        .fromTo(mplan, {
          clipPath: () => window.innerWidth <= 640 ? 'inset(100% 0% 0% 0%)' : 'inset(0% 0% 0% 100%)',
        }, {
          clipPath: () => window.innerWidth <= 640 ? `inset(${STRIP * 100}% 0% 0% 0%)` : `inset(0% 0% 0% ${STRIP * 100}%)`,
          duration: 0.8,
          ease: 'power2.out',
        }, 'ms')
        .fromTo(mplanLabel, { opacity: 0, x: 40, y: 0 }, { opacity: 1, x: 0, y: 0, duration: 0.6, ease: 'power2.out' }, 'ms+=0.2')
        .to({}, { duration: 0.4 })

        // Pulled open: the strip's edge sweeps left (or up on mobile) to fill the screen, and both
        // the grassy background and the layout map slide in together
        .to(mplan, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.8, ease: 'power2.inOut' }, 'mp')
        .to(mplanImg, { x: 0, y: 0, duration: 1.8, ease: 'power2.inOut' }, 'mp')
        .to(stage, { x: roadX, y: introY, scale: roadScale, duration: 1.8, ease: 'power2.inOut' }, 'mp')
        .to(mplanLabel, {
          x: () => window.innerWidth <= 640 ? 0 : -window.innerWidth * STRIP,
          y: () => window.innerWidth <= 640 ? -window.innerHeight * STRIP : 0,
          duration: 1.8,
          ease: 'power2.inOut',
        }, 'mp')
        .to(mplanLabel, { opacity: 0, duration: 0.5, ease: 'power1.in' }, 'mp+=0.5')
        .to(pillars[1], {
          x: () => window.innerWidth <= 640 ? LEFT.x() : OFF_LEFT.x(),
          y: () => window.innerWidth <= 640 ? LEFT.y() : OFF_LEFT.y(),
          rotation: () => window.innerWidth <= 640 ? LEFT.rotation : OFF_LEFT.rotation(),
          scale: () => window.innerWidth <= 640 ? LEFT.scale : OFF_LEFT.scale(),
          opacity: () => window.innerWidth <= 640 ? LEFT.opacity : OFF_LEFT.opacity(),
          filter: () => window.innerWidth <= 640 ? LEFT.filter : OFF_LEFT.filter,
          duration: 1.6,
          ease: 'power2.inOut',
        }, 'mp')
        .to(pillars[2], {
          x: () => window.innerWidth <= 640 ? CENTER.x : OFF_LEFT.x(),
          y: () => window.innerWidth <= 640 ? CENTER.y : OFF_LEFT.y(),
          rotation: () => window.innerWidth <= 640 ? CENTER.rotation : OFF_LEFT.rotation(),
          scale: () => window.innerWidth <= 640 ? CENTER.scale : OFF_LEFT.scale(),
          opacity: () => window.innerWidth <= 640 ? CENTER.opacity : OFF_LEFT.opacity(),
          filter: () => window.innerWidth <= 640 ? CENTER.filter : OFF_LEFT.filter,
          duration: 1.8,
          ease: 'power2.inOut',
        }, 'mp')
        .to({}, { duration: 0.5 })

        // Plot card slides up from below with a tilt and settles at the vertical centre
        .to(card, {
          y: 0, rotationX: 0, rotationZ: 0, scale: 1,
          duration: 1.2, ease: 'power2.out',
        }, 'cl')
        .addLabel('plan')
        .call(() => explorer.tease && explorer.tease())
        // Hold so the visitor can explore before the section unpins
        .to({}, { duration: 4.5 });

      menuSpots.plan = () => whyTl.scrollTrigger.labelToScroll('plan');
    }

    window.addEventListener('resize', () => {
      sizeInk();
      drawInk(inkTracker.val);
      ScrollTrigger.refresh();
    });
    window.addEventListener('load', () => ScrollTrigger.refresh());
  }

  /* ---------- Plot explorer ----------
     Views of the master plan stage (x, y, scale from its top-left corner):
       intro   - plan fills the frame behind the closer-look card
       fit     - whole plan fitted into the space left of the card, pins on
       zoom    - a selected plot zoomed in, details popup above it */
  function initExplorer({ mplan, mplanImg, stage, card, openBooking, roadX, introY, roadScale }) {
    const data = window.MJR_PLOTS;
    if (!data) return { reset() {} };
    const pinsEl = document.getElementById('planPins');
    const grid = document.getElementById('plotGrid');
    const pop = document.getElementById('plotPop');
    const pageLabel = document.getElementById('pageLabel');
    const prev = document.getElementById('pagePrev');
    const next = document.getElementById('pageNext');
    const dir = document.getElementById('cardDir').querySelector('span');
    const filterBtn = document.getElementById('filterBtn');
    const filterPanel = document.getElementById('filterMenu');
    const filterSize = document.getElementById('filterSize');
    const filterDirection = document.getElementById('filterDirection');
    const filterLocation = document.getElementById('filterLocation');
    const filterAvailable = document.getElementById('filterAvailable');
    const filterCount = document.getElementById('filterCount');
    const filterResetBtn = document.getElementById('filterResetBtn');
    const filterApplyBtn = document.getElementById('filterApplyBtn');
    const compass = document.getElementById('cardCompass');
    const minBtn = document.getElementById('cardMinBtn');
    const expandBtn = document.getElementById('cardExpandBtn');
    const getPer = () => (window.innerWidth <= 640 ? 18 : 36);
    let page = 0, selected = null, mode = 'intro';

    const filterState = {
      size: 'all',
      direction: 'all',
      location: 'all',
      availableOnly: false,
    };

    const FACING_ANGLES = {
      'North': 0,
      'North-East': 45,
      'East': 90,
      'South-East': 135,
      'South': 180,
      'South-West': 225,
      'West': 270,
      'North-West': 315,
    };

    const matches = (p) => {
      if (filterState.availableOnly && p.sold) return false;
      if (filterState.size !== 'all') {
        if (filterState.size === '160-200' && (p.size < 160 || p.size > 200.4)) return false;
        if (filterState.size === '201-300' && (p.size < 200.5 || p.size > 300.4)) return false;
        if (filterState.size === '301-400' && (p.size < 300.5 || p.size > 400.4)) return false;
        if (filterState.size === '401+' && p.size < 400.5) return false;
      }
      if (filterState.direction !== 'all') {
        if (!p.facing.includes(filterState.direction)) return false;
      }
      if (filterState.location !== 'all') {
        if (filterState.location === 'near' && !p.nearMain) return false;
        if (filterState.location === 'far' && p.nearMain) return false;
      }
      return true;
    };

    const isFiltered = () =>
      filterState.size !== 'all' ||
      filterState.direction !== 'all' ||
      filterState.location !== 'all' ||
      filterState.availableOnly;

    const updateFilterCount = () => {
      if (!filterCount) return;
      const count = data.list.filter(matches).length;
      filterCount.textContent = `${count} plot${count === 1 ? '' : 's'} matching`;
    };

    const applyFilters = () => {
      updateFilterCount();
      filterBtn.classList.toggle('is-active', isFiltered());
      if (selected !== null && !matches(data.byNo[selected])) {
        closePop();
      }
      renderGrid();
    };

    /* Pins on the plan (rendered in crisp screen-space) */
    const pins = {};
    data.list.forEach((p) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'pin' + (p.sold ? ' is-sold' : '');
      b.textContent = p.n;
      b.setAttribute('aria-label', `Plot ${p.label}, ${p.sold ? 'sold out' : 'available'}`);
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        select(p.n);
      });
      pinsEl.appendChild(b);
      pins[p.n] = b;
    });

    /* Card grid, 36 per page on desktop/tablet, 18 per page on mobile */
    const renderGrid = () => {
      const per = getPer();
      const maxPage = Math.max(0, Math.ceil(data.list.length / per) - 1);
      if (page > maxPage) page = maxPage;
      const start = page * per;
      const items = data.list.slice(start, start + per);
      grid.innerHTML = '';
      for (let i = 0; i < per; i++) {
        const p = items[i];
        if (!p) { const e = document.createElement('span'); e.className = 'pcard__empty'; grid.appendChild(e); continue; }
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = p.n;
        b.classList.toggle('is-sold', p.sold);
        b.classList.toggle('is-selected', selected === p.n);
        const isMatch = matches(p);
        b.disabled = !isMatch;
        b.classList.toggle('is-disabled', !isMatch);
        b.setAttribute('aria-pressed', String(selected === p.n));
        b.setAttribute('aria-label', `Plot ${p.label}, ${p.sold ? 'sold out' : 'available'}${!isMatch ? ', filtered out' : ''}`);
        b.addEventListener('click', (e) => {
          e.stopPropagation();
          select(p.n);
        });
        grid.appendChild(b);
      }
      pageLabel.textContent = `${Math.min(start + per, data.list.length)} of ${data.list.length}`;
      prev.disabled = page === 0;
      next.disabled = start + per >= data.list.length;
      data.list.forEach((p) => {
        const isMatch = matches(p);
        pins[p.n].classList.toggle('is-filtered-out', !isMatch);
        pins[p.n].classList.toggle('is-selected', selected === p.n);
      });
    };

    /* Smooth page sliding animation */
    let isPaging = false;
    const changePage = (newPage, direction) => {
      if (isPaging || newPage === page) return;
      isPaging = true;
      const outX = direction === 'next' ? -35 : 35;
      const inX = direction === 'next' ? 35 : -35;
      gsap.to(grid, {
        x: outX,
        opacity: 0,
        duration: 0.18,
        ease: 'power1.in',
        onComplete: () => {
          page = newPage;
          renderGrid();
          gsap.fromTo(grid,
            { x: inX, opacity: 0 },
            { x: 0, opacity: 1, duration: 0.26, ease: 'power2.out', onComplete: () => { isPaging = false; } }
          );
        }
      });
    };

    prev.addEventListener('click', (e) => {
      e.stopPropagation();
      if (page > 0) changePage(page - 1, 'prev');
    });
    next.addEventListener('click', (e) => {
      e.stopPropagation();
      if ((page + 1) * getPer() < data.list.length) changePage(page + 1, 'next');
    });

    /* Filters toggle & controls */
    const openFilters = () => {
      filterPanel.hidden = false;
      filterBtn.textContent = 'Close';
      filterBtn.setAttribute('aria-expanded', 'true');
      updateFilterCount();
    };
    const closeFilters = () => {
      filterPanel.hidden = true;
      filterBtn.textContent = 'Filters';
      filterBtn.setAttribute('aria-expanded', 'false');
    };
    filterBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (filterPanel.hidden) {
        openFilters();
      } else {
        closeFilters();
      }
    });
    filterPanel.addEventListener('click', (e) => e.stopPropagation());

    /* Two-column filter tabs */
    const tabs = filterPanel.querySelectorAll('.pcard__filter-tab');
    const panes = filterPanel.querySelectorAll('.pcard__filter-pane');
    tabs.forEach((tab) => {
      tab.addEventListener('click', (e) => {
        e.stopPropagation();
        const targetTab = tab.dataset.filterTab;
        tabs.forEach((t) => {
          const isActive = t === tab;
          t.classList.toggle('is-active', isActive);
          t.setAttribute('aria-selected', String(isActive));
        });
        panes.forEach((p) => {
          const isMatch = p.dataset.pane === targetTab;
          p.classList.toggle('is-active', isMatch);
          p.hidden = !isMatch;
        });
      });
    });

    /* Radio button options */
    filterPanel.querySelectorAll('input[name="fSize"]').forEach((r) => {
      r.addEventListener('change', () => { filterState.size = r.value; applyFilters(); });
    });
    filterPanel.querySelectorAll('input[name="fDirection"]').forEach((r) => {
      r.addEventListener('change', () => { filterState.direction = r.value; applyFilters(); });
    });
    filterPanel.querySelectorAll('input[name="fLocation"]').forEach((r) => {
      r.addEventListener('change', () => { filterState.location = r.value; applyFilters(); });
    });
    filterPanel.querySelectorAll('input[name="fAvail"]').forEach((r) => {
      r.addEventListener('change', () => { filterState.availableOnly = r.value === 'available'; applyFilters(); });
    });

    filterResetBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      filterState.size = 'all';
      filterState.direction = 'all';
      filterState.location = 'all';
      filterState.availableOnly = false;
      const sizeRadio = filterPanel.querySelector('input[name="fSize"][value="all"]');
      if (sizeRadio) sizeRadio.checked = true;
      const dirRadio = filterPanel.querySelector('input[name="fDirection"][value="all"]');
      if (dirRadio) dirRadio.checked = true;
      const locRadio = filterPanel.querySelector('input[name="fLocation"][value="all"]');
      if (locRadio) locRadio.checked = true;
      const availRadio = filterPanel.querySelector('input[name="fAvail"][value="all"]');
      if (availRadio) availRadio.checked = true;
      applyFilters();
    });
    filterApplyBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      closeFilters();
    });
    filterPanel.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeFilters(); filterBtn.focus(); } });

    /* Stage views */
    const W = () => mplan.clientWidth;
    const H = () => window.innerWidth <= 640 ? W() * data.IMG_W / data.IMG_H : W() * data.IMG_H / data.IMG_W;
    const pinX = (p) => window.innerWidth <= 640 ? p.py : p.px;
    const pinY = (p) => window.innerWidth <= 640 ? (1 - p.px) : p.py;
    const views = {
      intro: () => ({
        stage: {
          x: roadX(),
          y: introY(),
          scale: roadScale(),
        },
        bg: {
          x: 0,
          y: 0,
          scale: 1,
        },
      }),
      zoom: (p) => {
        const isMobile = window.innerWidth <= 640;
        const narrow = window.innerWidth < 760;
        const cardW = card.classList.contains('is-minimized') ? 0 : card.offsetWidth;
        const s = 3.2;
        const targetScreenX = narrow ? window.innerWidth * 0.5 : (window.innerWidth - cardW) * 0.52;
        const targetScreenY = isMobile ? window.innerHeight * 0.20 : window.innerHeight * 0.56;
        const lx = targetScreenX - pinX(p) * W() * s;
        const ly = targetScreenY - pinY(p) * H() * s;
        const bgScale = 0.6 * s; // 60% of layout scale (parallax depth)
        const bgX = (lx - roadX()) * 0.25;
        const bgY = (ly - introY()) * 0.25;
        return {
          stage: {
            x: lx,
            y: ly,
            scale: s,
          },
          bg: {
            x: bgX,
            y: bgY,
            scale: bgScale,
          },
        };
      },
    };
    const updatePins = () => {
      const curX = gsap.getProperty(stage, 'x') || 0;
      const curY = gsap.getProperty(stage, 'y') || 0;
      const curScale = gsap.getProperty(stage, 'scaleX') || 1;
      const sW = W() * curScale;
      const sH = H() * curScale;
      for (let i = 0; i < data.list.length; i++) {
        const p = data.list[i];
        const pin = pins[p.n];
        if (!pin) continue;
        const px = curX + pinX(p) * sW;
        const py = curY + pinY(p) * sH;
        pin.style.transform = `translate3d(${px.toFixed(1)}px, ${py.toFixed(1)}px, 0) translate(-50%, -50%)`;
      }
    };
    const go = (v, instant) => {
      gsap.killTweensOf(stage);
      if (mplanImg) gsap.killTweensOf(mplanImg);
      if (instant || reduceMotion.matches) {
        gsap.set(stage, v.stage);
        if (mplanImg && v.bg) gsap.set(mplanImg, v.bg);
        updatePins();
        return;
      }
      gsap.to(stage, { ...v.stage, duration: 1.3, ease: 'power3.inOut', onUpdate: updatePins });
      if (mplanImg && v.bg) {
        gsap.to(mplanImg, { ...v.bg, duration: 1.3, ease: 'power3.inOut' });
      }
    };
    updatePins();
    window.addEventListener('resize', () => {
      renderGrid();
      if (mode === 'zoom' && selected) {
        go(views.zoom(data.byNo[selected]), true);
      } else {
        go(views.intro(), true);
      }
    });

    /* Popup */
    const fill = (p) => {
      document.getElementById('ppTitle').textContent = `Plot ${p.label}`;
      const st = document.getElementById('ppStatus');
      st.textContent = p.sold ? 'Sold Out' : 'Available';
      st.classList.toggle('is-sold', p.sold);
      document.getElementById('ppSize').textContent = p.size.toFixed(1);
      document.getElementById('ppFacing').textContent = p.facing;
      document.getElementById('ppDesc').textContent = p.desc;
      document.getElementById('ppHighlights').innerHTML = p.highlights.map((h) => `<li>${h}</li>`).join('');
      const enq = document.getElementById('ppEnquire');
      enq.textContent = 'Enquire this plot';
      enq.dataset.plot = p.label;
      dir.textContent = `${p.facing} Facing`;
    };
    document.getElementById('ppEnquire').addEventListener('click', (e) => openBooking('visit', e.currentTarget, e.currentTarget.dataset.plot));

    const select = (n) => {
      if (selected === n) {
        closePop();
        return;
      }
      const p = data.byNo[n];
      if (!p) return;
      if (!card.classList.contains('is-flipped')) explore();
      selected = n;
      page = Math.floor((n - 1) / getPer());
      fill(p);
      renderGrid();
      const wasHidden = pop.hidden;
      pop.hidden = false;
      if (wasHidden && !reduceMotion.matches) gsap.fromTo(pop, { opacity: 0, y: 24, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.6, delay: 0.35, ease: 'power3.out' });
      mode = 'zoom';
      mplan.classList.add('is-zoomed');
      go(views.zoom(p));
      if (compass) {
        const deg = FACING_ANGLES[p.facing] ?? 0;
        compass.style.transform = `rotate(${deg}deg)`;
      }
    };
    const closePop = () => {
      pop.hidden = true;
      selected = null;
      dir.textContent = 'Select a plot';
      mplan.classList.remove('is-zoomed');
      if (compass) compass.style.transform = 'rotate(0deg)';
      renderGrid();
      mode = 'intro';
      go(views.intro());
    };
    document.getElementById('ppClose').addEventListener('click', closePop);

    const explore = () => {
      document.getElementById('exploreBtn').classList.remove('is-glowing');
      card.classList.add('is-flipped');
      mplan.classList.add('is-exploring');
      updatePins();
      renderGrid();
      // Keep layout map at exact same size and position when card is flipped!
      // Only scale and move when a plot is selected.
      setTimeout(() => grid.querySelector('button')?.focus({ preventScroll: true }), 900);
    };
    const reset = (instant) => {
      mode = 'intro';
      selected = null;
      pop.hidden = true;
      closeFilters();
      card.classList.remove('is-flipped');
      card.classList.remove('is-minimized');
      card.style.opacity = '1';
      if (card.querySelector('.pcard__inner')) {
        card.querySelector('.pcard__inner').style.opacity = '1';
        card.querySelector('.pcard__inner').style.transform = '';
      }
      if (minBtn) {
        minBtn.setAttribute('aria-label', 'Minimize card to legend');
        minBtn.setAttribute('title', 'Minimize');
      }
      mplan.classList.remove('is-exploring');
      mplan.classList.remove('is-zoomed');
      dir.textContent = 'Select a plot';
      if (compass) compass.style.transform = 'rotate(0deg)';
      renderGrid();
      go(views.intro(), !!instant);
    };

    const expand = () => {
      if (!card.classList.contains('is-minimized')) return;
      card.classList.remove('is-minimized');
      card.style.opacity = '1';
      if (card.querySelector('.pcard__inner')) {
        card.querySelector('.pcard__inner').style.opacity = '1';
        card.querySelector('.pcard__inner').style.transform = '';
      }
      if (minBtn) {
        minBtn.setAttribute('aria-label', 'Minimize card to legend');
        minBtn.setAttribute('title', 'Minimize');
      }
      if (mode === 'zoom' && selected) {
        go(views.zoom(data.byNo[selected]));
      }
    };

    const minimize = () => {
      if (card.classList.contains('is-minimized')) return;
      closeFilters();
      card.classList.add('is-minimized');
      card.style.opacity = '1';
      if (minBtn) {
        minBtn.setAttribute('aria-label', 'Expand card');
        minBtn.setAttribute('title', 'Expand');
      }
      if (mode === 'zoom' && selected) {
        go(views.zoom(data.byNo[selected]));
      }
    };

    const toggleMinimize = (e) => {
      if (e) e.stopPropagation();
      closeFilters();
      if (card.classList.contains('is-minimized')) {
        gsap.to(card.querySelector('.pcard__strip'), {
          scale: 0.94,
          opacity: 0,
          duration: 0.18,
          ease: 'power1.in',
          onComplete: () => {
            expand();
            gsap.fromTo(card.querySelector('.pcard__inner'),
              { scale: 0.96, opacity: 0 },
              { scale: 1, opacity: 1, duration: 0.28, ease: 'power2.out' }
            );
            if (minBtn) {
              gsap.fromTo(minBtn, { rotation: 90 }, { rotation: 0, duration: 0.25, ease: 'back.out(2)' });
            }
          }
        });
      } else {
        gsap.to(card.querySelector('.pcard__inner'), {
          scale: 0.96,
          opacity: 0,
          duration: 0.2,
          ease: 'power2.in',
          onComplete: () => {
            minimize();
            gsap.fromTo(card.querySelector('.pcard__strip'),
              { scale: 0.94, opacity: 0 },
              { scale: 1, opacity: 1, duration: 0.26, ease: 'power2.out' }
            );
            if (minBtn) {
              gsap.fromTo(minBtn, { rotation: -90 }, { rotation: 0, duration: 0.25, ease: 'back.out(2)' });
            }
          }
        });
      }
    };

    if (minBtn) {
      minBtn.addEventListener('click', toggleMinimize);
    }
    if (expandBtn) {
      expandBtn.addEventListener('click', toggleMinimize);
    }

    card.addEventListener('click', (e) => e.stopPropagation());
    pop.addEventListener('click', (e) => e.stopPropagation());
    document.getElementById('exploreBtn').addEventListener('click', (e) => { e.stopPropagation(); explore(); });
    card.querySelector('.pcard__face--front').addEventListener('click', () => explore());
    document.getElementById('cardBackBtn').addEventListener('click', (e) => {
      e.stopPropagation();
      reset(false);
      document.getElementById('exploreBtn').focus({ preventScroll: true });
    });
    mplan.addEventListener('click', (e) => {
      if (e.target.closest('.pin') || e.target.closest('.pcard') || e.target.closest('.plotpop') || e.target.closest('.mplan__label')) {
        return;
      }
      if (selected !== null) {
        closePop();
      }
    });
    mplan.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !pop.hidden && filterPanel.hidden) closePop();
    });

    /* First arrival: the number tiles flip up like dominoes, row by row down
       the plan, then flip back the same way; the Explore button then glows
       until it is clicked */
    const exploreBtn = document.getElementById('exploreBtn');
    let teased = false;
    const tease = () => {
      if (teased || card.classList.contains('is-flipped')) return;
      teased = true;
      if (reduceMotion.matches) { exploreBtn.classList.add('is-glowing'); return; }

      // Pin the tiles in place with GSAP transforms while the stage is still
      const curX = gsap.getProperty(stage, 'x') || 0;
      const curY = gsap.getProperty(stage, 'y') || 0;
      const curScale = gsap.getProperty(stage, 'scaleX') || 1;
      const sW = W() * curScale;
      const sH = H() * curScale;
      const tiles = data.list.map((p) => pins[p.n]);
      data.list.forEach((p) => {
        pins[p.n].style.transform = '';
        gsap.set(pins[p.n], {
          x: curX + pinX(p) * sW, y: curY + pinY(p) * sH, xPercent: -50, yPercent: -50,
          rotationX: 0, transformPerspective: 2400, transformOrigin: '50% 50%', force3D: false,
        });
      });
      mplan.classList.add('is-teasing');

      // Group tiles into columns by their position across the plan, left to right
      const colOf = (p) => Math.round(pinX(p) * 40);
      const cols = [...new Set(data.list.map(colOf))].sort((a, b) => a - b);

      // Left to right the tiles turn in from edge-on to their numbers; right to
      // left they turn on to a plain white back (swapped at the edge-on moment,
      // so the number never shows mirrored); then they all fade out together
      gsap.set(tiles, { rotationY: -90, opacity: 0 });
      const tl = gsap.timeline({ onComplete: () => {
        mplan.classList.remove('is-teasing');
        if (!card.classList.contains('is-flipped')) exploreBtn.classList.add('is-glowing');
        // wait for the pin layer to fade away before restoring the tiles
        setTimeout(() => {
          tiles.forEach((t) => t.classList.remove('is-back'));
          gsap.set(tiles, { clearProps: 'transform,opacity' });
          updatePins();
        }, 600);
      } });
      const STEP = 0.07;
      const last = cols.length - 1;
      const backAt = 0.3 + last * STEP + 0.35 + 0.6; // after every tile shows its number, plus a hold
      data.list.forEach((p) => {
        const t = pins[p.n];
        const c = cols.indexOf(colOf(p));
        const inAt = 0.3 + c * STEP;
        const outAt = backAt + (last - c) * STEP;
        tl.to(t, { rotationY: 0, duration: 0.35, ease: 'sine.out' }, inAt)
          .to(t, { opacity: 1, duration: 0.1, ease: 'none' }, inAt)
          .to(t, { rotationY: 90, duration: 0.3, ease: 'sine.in' }, outAt)
          .call(() => t.classList.add('is-back'), null, outAt + 0.3)
          .to(t, { rotationY: 180, duration: 0.3, ease: 'sine.out' }, outAt + 0.3);
      });
      tl.to(tiles, { opacity: 0, duration: 0.5, ease: 'power1.out' }, backAt + last * STEP + 0.6 + 0.4);
    };
    exploreBtn.addEventListener('click', () => exploreBtn.classList.remove('is-glowing'));

    renderGrid();
    return {
      tease,
      reset,
      closePop,
      expand,
      minimize,
      toggleMinimize,
      getSelected: () => selected,
      isMinimized: () => card.classList.contains('is-minimized'),
      isFlipped: () => card.classList.contains('is-flipped'),
    };
  }
})();
