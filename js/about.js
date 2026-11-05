/* 12. About: the team behind the foundation
   Pinned, scrubbed by scroll:
      - once the stage is in place, the title fades in at the centre, scaling
        from 80% to 100% out of a soft blur
      - the title moves to the top as the first outline sketch slides up into the
        centre
      - the first line appears below the sketch as it turns to the second sketch
        (about 6 degrees anticlockwise); the bolder second line follows with the
        third sketch (about 6 degrees more)
      - Then the ivory (#F5F1E8) split layout slides in from the right with Q&A at
        top-left, the 4 facts appearing one after another under "Our Track
        Record" at bottom-left, and the house construction video scrubbed by
        scroll on the right.
      - once the facts sequence completes, the envelope rises, opens and the
        leadership letter slides out, then lifts away */
(() => {
  const section = document.getElementById('about');
  if (!section) return;

  const stage = section.querySelector('.about__stage');
  const head = section.querySelector('.about__head');
  const title = section.querySelector('.about__title');
  const sketch = section.querySelector('.about__sketch');
  const sketches = [...sketch.querySelectorAll('img')];
  const linesBox = section.querySelector('.about__lines');
  const lines = [...linesBox.querySelectorAll('.about__line')];
  const split = section.querySelector('.about__split');
  const splitQa = section.querySelector('.about__split-qa');
  const splitFactsHead = section.querySelector('.about__split-facts-head');
  const splitFacts = [...section.querySelectorAll('.about__split-facts li')];
  const video = document.getElementById('aboutVideo');
  const blurLayer = section.querySelector('.about__blur');
  const env = section.querySelector('.letter__env');
  const flap = section.querySelector('.letter__flap');
  const letter = section.querySelector('.letter__paper');

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Static fallback: title, final sketch and lines, then split facts, no letter
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
    if (split) {
      split.style.position = 'relative';
      split.style.inset = 'auto';
    }
    env.style.display = 'none';
    return;
  }
  gsap.registerPlugin(ScrollTrigger);

  // The construction video downloads only as the section approaches
  if (video) {
    ScrollTrigger.create({
      trigger: section,
      start: 'top bottom+=150%',
      once: true,
      onEnter: () => { video.preload = 'auto'; video.load(); },
    });
  }

  // ---- Non-blocking video scrubber ----
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

  const buildScrub = { p: 0 };

  const vh = () => window.innerHeight;
  const isPhone = () => window.innerWidth <= 760;

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
  gsap.set(head, { xPercent: -50, yPercent: -50 });
  // The title is already in place as About continues on the navy background
  gsap.set(title, { opacity: 1, scale: 1, filter: 'blur(0px)' });
  gsap.set(sketch, { xPercent: -50, yPercent: -50, y: () => vh() * 0.525 + sketch.offsetHeight / 2 + 40, rotation: 0 });
  gsap.set(sketches[0], { opacity: 1 });
  gsap.set(linesBox, { xPercent: -50, y: 0 });
  gsap.set(lines, { opacity: 0, y: 24 });
  if (split) gsap.set(split, { xPercent: 100 });
  if (splitQa) gsap.set(splitQa, { opacity: 1, y: 0 });
  if (splitFactsHead) gsap.set(splitFactsHead, { opacity: 1, y: 0 });
  if (splitFacts.length) gsap.set(splitFacts, { opacity: 0, x: 48, y: 0 });
  if (video) gsap.set(video, { opacity: 1 });
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
    .to({}, { duration: 0.15 })

    // Title to the top; first sketch slides up into the centre
    .addLabel('sketch')
    .to(head, { y: titleTopY, duration: 1.2 }, 'sketch')
    .to(sketch, { y: () => sketchRestY, duration: 1.2, ease: 'power3.out' }, 'sketch+=0.55')
    .to({}, { duration: 0.1 })

    // First line; sketch 1 turns into sketch 2
    .addLabel('l1')
    .to(lines[0], { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' }, 'l1')
    .to(sketch, { rotation: -6, duration: 0.9 }, 'l1')
    .to(sketches[0], { opacity: 0, duration: 0.9 }, 'l1')
    .to(sketches[1], { opacity: 1, duration: 0.9 }, 'l1')
    .to({}, { duration: 0.1 })

    // Bolder second line; sketch 2 turns into sketch 3
    .addLabel('l2')
    .to(lines[1], { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' }, 'l2')
    .to(sketch, { rotation: -12, duration: 0.9 }, 'l2')
    .to(sketches[1], { opacity: 0, duration: 0.9 }, 'l2')
    .to(sketches[2], { opacity: 1, duration: 0.9 }, 'l2')
    .to({}, { duration: 0.2 })

    // The ivory question & track-record section (.about__split) slides in from the right
    // over the navy stage
    .addLabel('ink')
    .to(split, { xPercent: 0, duration: 1.45, ease: 'power2.inOut' }, 'ink')
    .to([head, sketch, linesBox], { x: () => -window.innerWidth * 0.18, opacity: 0, duration: 1.25, ease: 'power2.inOut' }, 'ink')
    .to({}, { duration: 0.35 })
    .addLabel('landed');

  // Each of the 4 bullet facts slides in from the right as the construction video builds
  splitFacts.forEach((fact, k) => {
    const at = `card${k}`;
    tl.addLabel(at)
      .to(fact, { opacity: 1, x: 0, y: 0, duration: 0.85, ease: 'power2.out' }, at)
      .to({}, { duration: 0.35 });
  });

  // Scrub the construction video continuously across the entire Q&A + 4 facts phase
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
    .to({}, { duration: 0.6 })
    // The letter lifts off the top of the screen at a -10 degree tilt as the envelope drops away
    .addLabel('leave')
    .to(letter, { yPercent: -340, rotation: -10, duration: 1.4, ease: 'power2.in' }, 'leave')
    .to(env, { y: () => vh() * 0.5, duration: 1.4, ease: 'power2.in' }, 'leave+=0.2');

  built = true;
  ScrollTrigger.refresh();
  window.addEventListener('load', () => ScrollTrigger.refresh());
})();
