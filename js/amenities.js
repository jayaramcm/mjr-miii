/* 07. Amenities
   Two scrubbed timelines on a sticky stage:
     1. The logo mark rises over the pinned master plan (the section is
        pulled up over its last stretch, see .has-why-pin .amen--live), then its
        three towers straighten and widen until they fill the screen as one
        navy panel.
     2. The question appears and a rule draws down from it.
     3. The column keeps scrolling: question and rule leave the top, the
        heading rises from the bottom, followed by the framed water tank
        photo and caption, and settles below the nav bar.
     4. After a short hold the same column keeps scrolling: the heading,
        photo and caption leave the top and the tabbed amenity grid (a status
        label on every card) rises into view.
   Location then slides up over the last screen. */
(() => {
  const section = document.getElementById('amenities');
  if (!section) return;

  const isPhone = () => window.matchMedia('(max-width: 760px)').matches;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!window.gsap || !window.ScrollTrigger || reduceMotion.matches) return;
  gsap.registerPlugin(ScrollTrigger);
  section.classList.add('amen--live');

  const $ = (sel) => section.querySelector(sel);
  const shape = $('.amen__shape');
  const bldgs = section.querySelectorAll('.amen__bldg');
  const navy = $('.amen__navy');
  const q = $('.amen__q');
  const rule = $('.amen__rule');
  const head = $('.amen__head');
  const frame = $('.amen__frame');
  const copy = $('.amen__copy');
  const track = $('.amen__track');
  const list = $('.amen-list');
  const grid = $('#amenGrid');
  const vh = () => window.innerHeight;

  const isLaptop14 = () => window.innerWidth > 760 && window.innerWidth <= 1600;
  const navClear = () => (isLaptop14() ? 92 : 110); // keep the heading clear of the logo in the nav bar
  // Elongate the 3-tower shape only on the bottom side on taller (phone) screens,
  // measuring the slanted roof vertices (--t1, --t2) at the 56.95vw scale
  const logoH = () => window.innerWidth * 0.5695;
  const fitShape = () => {
    const h = logoH();
    shape.style.height = isPhone() ? Math.max(h, vh()) + 'px' : '';
    gsap.set(bldgs[0], { '--t1': (h * 0.4404).toFixed(1) + 'px', '--t2': (h * 0.2301).toFixed(1) + 'px' });
    gsap.set(bldgs[1], { '--t1': (h * 0.2092).toFixed(1) + 'px', '--t2': '0px' });
    gsap.set(bldgs[2], { '--t1': (h * 0.3003).toFixed(1) + 'px', '--t2': (h * 0.6043).toFixed(1) + 'px' });
  };
  // Fit the photo so heading, photo and caption share one screen
  const fitFrame = () => {
    const nc = navClear();
    const gapAllowance = isLaptop14() ? vh() * 0.044 + 16 : vh() * 0.07 + 40;
    const room = vh() - nc - head.offsetHeight - copy.offsetHeight - gapAllowance;
    const maxW = window.innerWidth * (isPhone() ? 0.88 : isLaptop14() ? 0.682 : 0.62);
    const w = Math.max(200, Math.min(maxW, 1240, room * 1018 / 558));
    frame.style.width = w + 'px';
    frame.style.height = (w * 558 / 1018 + (isPhone() ? 20 : 0)) + 'px';
  };
  // The grid keeps the height of "All" whichever tab is open, so the scroll
  // distance never changes under the visitor
  const fitGrid = () => {
    const cards = [...grid.children];
    const hidden = cards.filter((c) => c.hidden);
    hidden.forEach((c) => { c.hidden = false; });
    grid.style.minHeight = '';
    grid.style.minHeight = grid.offsetHeight + 'px';
    hidden.forEach((c) => { c.hidden = true; });
  };
  fitShape();
  fitFrame();
  fitGrid();
  // Column offset: on desktop the heading sits just under the nav bar; on
  // phones the [heading + image + copy] block is centred vertically
  const settleY = () => {
    const nc = navClear();
    if (isPhone()) {
      const blockTop = head.offsetTop;
      const blockBottom = copy.offsetTop + copy.offsetHeight;
      const targetTop = Math.max(nc, (vh() - (blockBottom - blockTop)) / 2 + 16);
      return targetTop - blockTop;
    }
    return nc - head.offsetTop;
  };

  // Column offset with the carousel centered in the viewport below the nav bar
  const listEndY = () => {
    const nc = navClear();
    const bottomPad = isPhone() ? 72 : Math.min(48, Math.max(20, vh() * 0.04));
    const availH = vh() - nc - bottomPad;
    const targetTop = availH >= list.offsetHeight
      ? nc + (availH - list.offsetHeight) / 2
      : Math.max(nc - 10, vh() - bottomPad - list.offsetHeight);
    return targetTop - list.offsetTop;
  };
  const gridY = () => Math.min(settleY(), listEndY());
  // Screens of scroll for the grid to rise in: about one per screen of travel
  const gridScreens = () => Math.max(0.8, (settleY() - gridY()) / vh());

  const RISE = 1.6; // screens of scroll for step 1, overlapping the plan's pin
  const HEAD_SCREENS = 3.4; // question, rule and heading (steps 2 and 3)
  // The navy panel travels with the column, so it must reach past the grid;
  // the section is as long as the whole sequence plus the screen Location covers
  const fitLength = () => {
    navy.style.height = (list.offsetTop + list.offsetHeight + vh()) + 'px';
    section.style.height = (vh() * (RISE + HEAD_SCREENS + 2) + (gridScreens() + 0.4) * vh()) + 'px';
  };
  fitLength();
  ScrollTrigger.addEventListener('refreshInit', () => {
    gsap.set(frame, { clearProps: 'width,height,padding,y' });
    fitShape();
    fitFrame();
    fitGrid();
    fitLength();
  });

  gsap.set(shape, { y: () => shape.offsetHeight + 40 });
  gsap.set(navy, { opacity: 0 });
  gsap.set(q, { opacity: 0, y: () => Math.min(vh() * 0.25, 120) });
  gsap.set(rule, { scaleY: 0, transformOrigin: 'top center' });

  // 1. Rise, then open into a full navy panel
  gsap.timeline({
    defaults: { ease: 'power2.inOut' },
    scrollTrigger: {
      trigger: section,
      start: 'top top',
      end: () => '+=' + vh() * RISE,
      scrub: 1,
      invalidateOnRefresh: true,
    },
  })
    .fromTo(shape, { y: () => shape.offsetHeight + 40 }, { y: () => shape.offsetHeight - vh(), duration: 1.4, ease: 'power3.out' })
    .addLabel('open')
    .to(shape, { left: '0%', width: '100%', height: '100%', y: 0, duration: 1.2 }, 'open')
    .fromTo(bldgs[0],
      { left: '0%', width: '30.68%', '--t1': () => (logoH() * 0.4404).toFixed(1) + 'px', '--t2': () => (logoH() * 0.2301).toFixed(1) + 'px' },
      { left: '0%', width: '33.6%', '--t1': '0px', '--t2': '0px', duration: 1.2 }, 'open')
    .fromTo(bldgs[1],
      { left: '34.64%', width: '30.72%', '--t1': () => (logoH() * 0.2092).toFixed(1) + 'px', '--t2': '0px' },
      { left: '33.2%', width: '33.6%', '--t1': '0px', '--t2': '0px', duration: 1.2 }, 'open')
    .fromTo(bldgs[2],
      { left: '69.32%', width: '30.68%', '--t1': () => (logoH() * 0.3003).toFixed(1) + 'px', '--t2': () => (logoH() * 0.6043).toFixed(1) + 'px' },
      { left: '66.4%', width: '33.6%', '--t1': '0px', '--t2': '0px', duration: 1.2 }, 'open')
    .to(navy, { opacity: 1, duration: 0.5, ease: 'none' }, 'open+=0.8');

  const tl = gsap.timeline({
    defaults: { ease: 'power2.inOut' },
    scrollTrigger: {
      trigger: section,
      start: () => 'top+=' + vh() * RISE + ' top',
      // Location slides up over the last screen, so finish one screen early
      end: () => 'bottom-=' + vh() + ' bottom',
      scrub: 1,
      invalidateOnRefresh: true,
    },
  });

  // Menu "Amenities" lands once the question and its rule are in place; links
  // to the list land with the grid in view (js/main.js reads these)
  const spots = (window.MJR_SPOTS = window.MJR_SPOTS || {});
  spots.amen = () => tl.scrollTrigger.labelToScroll('asked');
  spots.amenGrid = () => tl.scrollTrigger.labelToScroll('gridIn');
  // Scroll position with the grid's title just under the nav bar (used when a
  // tab is chosen while the top of a tall grid is out of view)
  spots.amenTabs = () => {
    const st = tl.scrollTrigger;
    const a = tl.labels.grid / tl.duration();
    const b = tl.labels.gridIn / tl.duration();
    const want = navClear() - list.offsetTop;
    const span = settleY() - gridY();
    const f = span > 0 ? Math.min(1, Math.max(0, (settleY() - want) / span)) : 1;
    return st.start + (st.end - st.start) * (a + (b - a) * f);
  };

  // 2. Question slides up into place, then the rule grows down from it
  tl.to(q, { opacity: 1, y: 0, duration: 1, ease: 'power2.out' })
    .to(rule, { scaleY: 1, duration: 1.1, ease: 'power1.inOut' }, '+=0.1')
    .addLabel('asked')

    // 3. The column scrolls up to the heading's resting place; the rule leaves the top
    .to(track, { y: settleY, duration: 3.2, ease: 'none' }, '+=0.2')
    .to(navy, { y: settleY, duration: 3.2, ease: 'none' }, '<')
    .to(rule, { y: () => -(navClear() + 120), duration: 1.8, ease: 'power1.in' }, '<+1.2')
    .to(q, { opacity: 0, duration: 0.6, ease: 'none' }, '<+0.4')
    // Hold on the heading, photo and caption
    .to({}, { duration: 1 })

    // 4. The column scrolls on: heading, photo and caption leave the top and
    //    the amenity grid rises into view
    .addLabel('grid')
    .to([head, frame, copy], { opacity: 0, duration: 0.9 * gridScreens(), ease: 'power1.inOut' }, 'grid')
    .to([track, navy], { y: gridY, duration: 2.2 * gridScreens(), ease: 'none' }, 'grid')
    .addLabel('gridIn')
    .to({}, { duration: 0.8 });

  let lastClientX = -9999;
  let lastClientY = -9999;
  const updatePatternPointer = () => {
    if (lastClientX < -1000) return;
    const rect = navy.getBoundingClientRect();
    navy.style.setProperty('--mx', (lastClientX - rect.left).toFixed(1) + 'px');
    navy.style.setProperty('--my', (lastClientY - rect.top).toFixed(1) + 'px');
    bldgs.forEach((b) => {
      const br = b.getBoundingClientRect();
      b.style.setProperty('--mx', (lastClientX - br.left).toFixed(1) + 'px');
      b.style.setProperty('--my', (lastClientY - br.top).toFixed(1) + 'px');
    });
  };
  window.addEventListener('pointermove', (e) => {
    lastClientX = e.clientX;
    lastClientY = e.clientY;
    updatePatternPointer();
  }, { passive: true });
  window.addEventListener('scroll', updatePatternPointer, { passive: true });
  document.addEventListener('mouseleave', () => {
    lastClientX = -9999;
    lastClientY = -9999;
    navy.style.setProperty('--mx', '-9999px');
    navy.style.setProperty('--my', '-9999px');
    bldgs.forEach((b) => {
      b.style.setProperty('--mx', '-9999px');
      b.style.setProperty('--my', '-9999px');
    });
  });

  window.addEventListener('load', () => ScrollTrigger.refresh());
})();
