/* 12. About: the team behind the foundation
   Pinned, scrubbed by scroll:
      - once the stage is in place, the title fades in at the centre, scaling
        from 80% to 100% out of a soft blur
      - the title moves to the top as the first outline sketch slides up into the
        centre and the paper texture fades in under it
      - the first line appears below the sketch as it turns to the second sketch
        (about 6 degrees anticlockwise); the bolder second line follows with the
        third sketch (about 6 degrees more)
      - Then presents Option B (with Option A preserved in DOM):
        * Option B (default): plain ivory (#F5F1E8) split layout with Q&A at
          top-left, the 4 facts appearing one after another under "Our Track
          Record" at bottom-left, and the house construction video scrubbed by
          scroll on the right.
        * Option A (preserved): soft watercolour ink bleeds open revealing the
          aerial view (Assets/23.png) and a 5-card stack rises in the centre.
      - once the facts sequence completes, the envelope rises, opens and the
        leadership letter slides out, then lifts away */
(() => {
  const section = document.getElementById('about');
  if (!section) return;

  const stage = section.querySelector('.about__stage');
  const bg = section.querySelector('.about__bg');
  const paper = section.querySelector('.about__paper');
  const head = section.querySelector('.about__head');
  const title = section.querySelector('.about__title');
  const sketch = section.querySelector('.about__sketch');
  const sketches = [...sketch.querySelectorAll('img')];
  const linesBox = section.querySelector('.about__lines');
  const lines = [...linesBox.querySelectorAll('.about__line')];
  const deck = section.querySelector('.about__deck');
  const cards = [...section.querySelectorAll('.about__card')];
  const splitQa = section.querySelector('.about__split-qa');
  const splitFactsHead = section.querySelector('.about__split-facts-head');
  const splitFacts = [...section.querySelectorAll('.about__split-facts li')];
  const video = document.getElementById('aboutVideo');
  const blurLayer = section.querySelector('.about__blur');
  const optBtns = [...section.querySelectorAll('.about__opt')];
  const env = section.querySelector('.letter__env');
  const flap = section.querySelector('.letter__flap');
  const letter = section.querySelector('.letter__paper');
  const N = cards.length;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Static fallback: title, final sketch and lines, then the cards one under
  // another on the paper, no letter
  if (!window.gsap || !window.ScrollTrigger || reduceMotion) {
    stage.style.height = 'auto';
    stage.style.padding = '6rem 1.5rem';
    stage.style.textAlign = 'center';
    [head, sketch, linesBox].forEach((el) => {
      el.style.position = 'relative';
      el.style.left = el.style.top = 'auto';
      el.style.margin = '0 auto 2.5rem';
    });
    sketches[2].style.opacity = '1';
    lines.forEach((l) => { l.style.opacity = '1'; });
    paper.style.opacity = '0.7';
    deck.style.textAlign = 'left';
    deck.style.position = 'relative';
    deck.style.left = deck.style.top = 'auto';
    deck.style.margin = '0 auto';
    deck.style.gap = '1.5rem';
    cards.forEach((c) => { c.style.gridArea = 'auto'; });
    env.style.display = 'none';
    return;
  }
  gsap.registerPlugin(ScrollTrigger);

  // ---- Non-blocking video scrubber for Option B ----
  let videoReady = false;
  let videoSeeking = false;
  let videoTargetTime = 0;

  const seekVideoTo = (t) => {
    if (!video || !videoReady) return;
    videoTargetTime = Math.max(0, Math.min((video.duration || 7.9) - 0.04, t));
    if (videoSeeking || Math.abs(video.currentTime - videoTargetTime) < 0.015) return;
    videoSeeking = true;
    try {
      video.currentTime = videoTargetTime;
    } catch (_) {
      videoSeeking = false;
    }
  };

  if (video) {
    const onMeta = () => {
      videoReady = true;
      video.pause();
      seekVideoTo(videoTargetTime);
    };
    if (video.readyState >= 1) onMeta();
    else video.addEventListener('loadedmetadata', onMeta, { once: true });

    video.addEventListener('seeked', () => {
      videoSeeking = false;
      if (Math.abs(video.currentTime - videoTargetTime) > 0.025) {
        seekVideoTo(videoTargetTime);
      }
    });
  }

  // ---- Ink: soft watercolour blots that bleed open from random spots ----
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const INK_SCALE = 0.25;
  const POINTS = 48;
  let spots = [];
  let inkProgress = 0;

  const seeded = (seed) => () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  const buildSpots = () => {
    const rand = seeded(20120);
    const w = canvas.width;
    const h = canvas.height;
    const reach = Math.hypot(w, h);
    spots = [];
    for (let k = 0; k < 16; k++) {
      const raw = Array.from({ length: POINTS }, () => rand());
      const wobble = raw.map((v, i) => (v + raw[(i + 1) % POINTS] + raw[(i + POINTS - 1) % POINTS]) / 3);
      spots.push({
        x: (0.08 + rand() * 0.84) * w,
        y: (0.08 + rand() * 0.84) * h,
        start: rand() * 0.6,
        size: reach * (0.22 + rand() * 0.2),
        wobble,
      });
    }
  };

  const blot = (s, r) => {
    ctx.beginPath();
    for (let i = 0; i <= POINTS; i++) {
      const a = (i / POINTS) * Math.PI * 2;
      const rr = r * (0.82 + s.wobble[i % POINTS] * 0.36);
      const px = s.x + Math.cos(a) * rr;
      const py = s.y + Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.fill();
  };

  const paintInk = () => {
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    if (inkProgress <= 0) return;
    ctx.fillStyle = '#000';
    ctx.filter = 'blur(' + Math.max(2, w * 0.006) + 'px)';
    spots.forEach((s) => {
      const local = Math.max(0, (inkProgress - s.start) / (1 - s.start));
      if (local <= 0) return;
      const r = s.size * (1 - Math.pow(1 - local, 2.4));
      ctx.globalAlpha = 0.35;
      blot(s, r * 1.18);
      ctx.globalAlpha = 1;
      blot(s, r);
    });
    ctx.filter = 'none';
    if (inkProgress > 0.82) {
      ctx.globalAlpha = (inkProgress - 0.82) / 0.18;
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;
    }
  };

  const setMask = (value) => {
    bg.style.webkitMaskImage = value;
    bg.style.maskImage = value;
  };

  const drawInk = () => {
    if (inkProgress <= 0) {
      bg.style.visibility = 'hidden';
    } else if (inkProgress >= 1) {
      bg.style.visibility = 'visible';
      setMask('none');
    } else {
      paintInk();
      bg.style.visibility = 'visible';
      setMask('url(' + canvas.toDataURL() + ')');
    }
  };

  const sizeCanvas = () => {
    canvas.width = Math.max(1, Math.round(stage.clientWidth * INK_SCALE));
    canvas.height = Math.max(1, Math.round(stage.clientHeight * INK_SCALE));
    buildSpots();
    drawInk();
  };
  sizeCanvas();
  ScrollTrigger.addEventListener('refreshInit', sizeCanvas);
  const ink = { p: 0 };
  const buildScrub = { p: 0 };

  const vh = () => window.innerHeight;
  const isPhone = () => window.innerWidth <= 760;

  const MAX_DEPTH = 4;
  const PEEK = () => (isPhone() ? 8 : 14);
  const SHRINK = 0.025;
  const slot = (depth) => {
    const d = Math.min(depth, MAX_DEPTH);
    return { y: -PEEK() * d, scale: 1 - SHRINK * d, opacity: depth > MAX_DEPTH ? 0 : 1 };
  };

  const ZOOM_STEP = 0.06;

  const NAV_CLEAR = 132;
  const titleTopY = () => NAV_CLEAR + head.offsetHeight / 2 - vh() / 2;

  let sketchRestY = 0;
  const fitSketch = () => {
    const phone = isPhone();
    const top = NAV_CLEAR + head.offsetHeight + 24;
    const bottom = vh() * 0.84 - 24;
    const widthShare = phone ? 0.86 : 0.435;
    const h = Math.max(120, Math.min(window.innerWidth * widthShare * 592 / 767, vh() * 0.76 * 592 / 767, bottom - top));
    sketch.style.width = (h * 767 / 592) + 'px';
    sketchRestY = (top + bottom) / 2 - vh() * 0.475 - (phone ? 0 : 28);
  };
  fitSketch();
  ScrollTrigger.addEventListener('refreshInit', fitSketch);

  // ---- Initial states ----
  gsap.set(deck, { xPercent: -50, yPercent: -50, y: () => vh() * 0.5 + deck.offsetHeight });
  cards.forEach((c, i) => {
    c.style.zIndex = String(N - i);
    gsap.set(c, { ...slot(i), rotation: 0 });
  });
  gsap.set(head, { xPercent: -50, yPercent: -50 });
  gsap.set(title, { opacity: 0, scale: 0.8, filter: 'blur(14px)' });
  gsap.set(sketch, { xPercent: -50, yPercent: -50, y: () => vh() * 0.525 + sketch.offsetHeight / 2 + 40, rotation: 0 });
  gsap.set(sketches[0], { opacity: 1 });
  gsap.set(linesBox, { xPercent: -50, y: 0 });
  gsap.set(lines, { opacity: 0, y: 24 });
  gsap.set(bg, { opacity: 1, scale: 1.08 });
  if (splitQa) gsap.set(splitQa, { opacity: 0, y: 64 });
  if (splitFactsHead) gsap.set(splitFactsHead, { opacity: 0, y: 40 });
  if (splitFacts.length) gsap.set(splitFacts, { opacity: 0, y: 36 });
  if (video) gsap.set(video, { opacity: 0 });
  if (blurLayer) gsap.set(blurLayer, { opacity: 0 });
  gsap.set(env, { y: () => vh() * 0.4 });
  gsap.set(flap, { rotationX: -180 });
  gsap.set(letter, { yPercent: 101 });

  let built = false;
  (window.MJR_SPOTS = window.MJR_SPOTS || {}).about = () => tl.scrollTrigger.labelToScroll('titled');

  const syncBuildProgress = () => {
    const p = buildScrub.p;
    if (video && video.duration) {
      seekVideoTo(p * (video.duration - 0.04));
    }
  };

  const tl = gsap.timeline({
    defaults: { ease: 'power2.inOut' },
    scrollTrigger: {
      trigger: stage,
      start: 'top top',
      end: () => '+=' + (built ? vh() * tl.duration() / (tl.duration() - tl.labels.leave) : vh() * 14),
      pin: true,
      scrub: 0.8,
      invalidateOnRefresh: true,
    },
  })
    // Title fades in at the centre
    .to(title, { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 0.9, ease: 'power2.out' })
    .addLabel('titled', '-=0.15')
    .to({}, { duration: 0.3 })

    // Title to the top; first sketch slides up into the centre; paper fades in
    .addLabel('sketch')
    .to(head, { y: titleTopY, duration: 1.2 }, 'sketch')
    .to(sketch, { y: () => sketchRestY, duration: 1.2, ease: 'power3.out' }, 'sketch+=0.55')
    .to(paper, { opacity: 0.7, duration: 1.2, ease: 'none' }, 'sketch')
    .to({}, { duration: 0.25 })

    // First line; sketch 1 turns into sketch 2
    .addLabel('l1')
    .to(lines[0], { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' }, 'l1')
    .to(sketch, { rotation: -6, duration: 0.9 }, 'l1')
    .to(sketches[0], { opacity: 0, duration: 0.9 }, 'l1')
    .to(sketches[1], { opacity: 1, duration: 0.9 }, 'l1')
    .to({}, { duration: 0.25 })

    // Bolder second line; sketch 2 turns into sketch 3
    .addLabel('l2')
    .to(lines[1], { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' }, 'l2')
    .to(sketch, { rotation: -12, duration: 0.9 }, 'l2')
    .to(sketches[1], { opacity: 0, duration: 0.9 }, 'l2')
    .to(sketches[2], { opacity: 1, duration: 0.9 }, 'l2')
    .to({}, { duration: 0.4 })

    // Title, sketch and lines slide upward smoothly as the stage transitions;
    // Ink bleeds open (Option A) OR video/3D fades in and Q&A slides up (Options B & C)
    .addLabel('ink')
    .to(ink, { p: 1, duration: 1.8, ease: 'power1.in', onUpdate: () => { inkProgress = ink.p; drawInk(); } }, 'ink')
    .to(bg, { scale: 1, duration: 2, ease: 'power1.out' }, 'ink')
    .to(paper, { opacity: 0, duration: 1.15, ease: 'power1.inOut' }, 'ink')
    .to(head, { y: () => titleTopY() - vh() * 0.42, opacity: 0, duration: 1.15, ease: 'power2.inOut' }, 'ink')
    .to(sketch, { y: () => sketchRestY - vh() * 0.48, opacity: 0, duration: 1.15, ease: 'power2.inOut' }, 'ink+=0.06')
    .to(linesBox, { y: () => -vh() * 0.45, opacity: 0, duration: 1.15, ease: 'power2.inOut' }, 'ink+=0.12')
    .to(video, { opacity: 1, duration: 1.05, ease: 'power2.out' }, 'ink+=0.6')
    .to(splitQa, { opacity: 1, y: 0, duration: 1.05, ease: 'power3.out' }, 'ink+=0.85')
    .to(splitFactsHead, { opacity: 1, y: 0, duration: 0.85, ease: 'power2.out' }, 'ink+=1.35')

    // The stack rises from below and lands in the centre (Option A)
    .to(deck, { y: 0, duration: 1.2, ease: 'power3.out' }, 'ink+=1.6')
    .addLabel('landed')
    .to({}, { duration: 0.5 });

  // Each card in turn lifts off the top with a slight tilt (Option A);
  // Meanwhile in Options B & C, each of the 4 bullet facts appears one after another
  // as the construction video / 3D house builds from foundation to completion
  cards.forEach((card, k) => {
    const at = `card${k}`;
    const tilt = k % 2 ? 6 : -6;
    tl.addLabel(at)
      .to(card, { y: () => -(vh() * 0.5 + card.offsetHeight * 1.4), rotation: tilt, duration: 1.1, ease: 'power2.in' }, at)
      .to(bg, { scale: 1 + ZOOM_STEP * (k + 1), duration: 1.4, ease: 'sine.inOut' }, at);
    cards.slice(k + 1).forEach((next, j) => {
      tl.to(next, { ...slot(j), duration: 0.9, ease: 'power2.out' }, `${at}+=0.25`);
    });
    // Reveal the 4 facts one after another across card0..card3
    if (k < splitFacts.length) {
      tl.to(splitFacts[k], { opacity: 1, y: 0, duration: 0.85, ease: 'power2.out' }, `${at}+=0.1`);
    }
    if (k < N - 1) tl.to({}, { duration: 0.6 });
  });

  // Scrub the construction video (Option B) and Three.js house (Option C)
  // continuously across the entire Q&A + 4 facts phase
  const scrubStart = tl.labels.ink + 0.8;
  const scrubDuration = Math.max(1, tl.duration() - scrubStart);
  tl.to(buildScrub, {
    p: 1,
    duration: scrubDuration,
    ease: 'none',
    onUpdate: syncBuildProgress,
  }, scrubStart);

  // illoca's 'joe.out' ease: cubic-bezier(0.2, 0, 0.1, 1)
  const joeOut = (p) => {
    let lo = 0, hi = 1, u = p;
    for (let i = 0; i < 24; i++) {
      u = (lo + hi) / 2;
      const x = 3 * (1 - u) * (1 - u) * u * 0.2 + 3 * (1 - u) * u * u * 0.1 + u * u * u;
      if (x < p) lo = u; else hi = u;
    }
    return 3 * (1 - u) * u * u + u * u * u;
  };

  // The envelope rises in over the facts screen as a soft blur settles behind it,
  // the flap swings open on its hinge, then the letter slides up out of the mouth
  tl.addLabel('envRise')
    .to(env, { y: 0, duration: 0.9, ease: 'power3.out' }, 'envRise')
    .to(blurLayer, { opacity: 1, duration: 1.1, ease: 'power2.out' }, 'envRise+=0.15')
    .addLabel('open')
    .to(flap, {
      rotationX: 0, duration: 1.4, ease: joeOut,
      onUpdate: () => { flap.style.zIndex = gsap.getProperty(flap, 'rotationX') < -90 ? 3 : 0; }
    }, 'open')
    .to(letter, { yPercent: 1, duration: 1.4, ease: joeOut }, 'open+=0.25')
    .to({}, { duration: 0.8 })
    // The letter lifts off the top of the screen at a -10 degree tilt as the envelope drops away
    .addLabel('leave')
    .to(letter, { yPercent: -340, rotation: -10, duration: 1.4, ease: 'power2.in' }, 'leave')
    .to(env, { y: () => vh() * 0.5, duration: 1.4, ease: 'power2.in' }, 'leave+=0.2')
    .to({}, { duration: 0.6 });

  // ---- Option A / B / C Switcher ----
  const setOption = (opt, scrollIfOutside = false) => {
    section.dataset.aboutOpt = opt;
    optBtns.forEach((btn) => {
      const active = btn.dataset.aboutOpt === opt;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    syncBuildProgress();
    window.dispatchEvent(new Event('scroll'));

    if (scrollIfOutside && tl.scrollTrigger) {
      const st = tl.scrollTrigger;
      const curTime = tl.time();
      // If user clicks an option while before the facts phase or after the envelope opens,
      // scroll smoothly into the facts showcase so they see the option right away
      if (curTime < tl.labels.landed || curTime > tl.labels.envRise - 0.2) {
        const targetLabel = opt === 'a' ? 'landed' : 'card1';
        const targetScroll = st.labelToScroll(targetLabel);
        window.scrollTo({ top: targetScroll, behavior: 'smooth' });
      }
    }
  };

  optBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      setOption(btn.dataset.aboutOpt || 'a', true);
    });
  });

  built = true;
  ScrollTrigger.refresh();
  window.addEventListener('load', () => ScrollTrigger.refresh());
})();
