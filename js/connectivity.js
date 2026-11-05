/* 04. Location: Connectivity
   1. Title lines slide up, then the description and tagline follow.
   2. The stage starts on the MJR entrance image; as the user scrolls:
      - The navy sidebar slides in from the right and stops briefly.
      - The destination gallery (starting with Modern Tech District and Airport Skyline.png
        for "To Hyderabad") pushes the sidebar from the right across to the left edge.
      - Each subsequent destination image opens from the bottom-right corner while the
        left sidebar accordion closes the previous item and opens the active item:
        * Education nearby -> Aerial Campus Panorama with Flags.png
        * Healthcare nearby -> Modern Hospital Campus in a Lush Cityscape.png
        * Around Kalwakurthy -> Temples, Reservoirs and Buddha Vista.png */
(() => {
  const section = document.getElementById('location');
  if (!section) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const stage = section.querySelector('.conn__stage');
  const introImg = section.querySelector('.conn__intro-img');
  const sidebar = section.querySelector('.conn__sidebar');
  const gallery = section.querySelector('.conn__gallery');
  const destImgs = [...section.querySelectorAll('.conn__dest-img')];
  const accItems = [...section.querySelectorAll('.conn__acc-item')];
  const accBodies = accItems.map((item) => item.querySelector('.conn__acc-body'));
  const accInners = accItems.map((item) => item.querySelector('.conn__acc-inner'));

  if (!window.gsap || !window.ScrollTrigger || reduceMotion.matches) {
    return;
  }
  gsap.registerPlugin(ScrollTrigger);

  // Preload lazy destination images as the section approaches
  ScrollTrigger.create({
    trigger: section,
    start: 'top bottom+=150%',
    once: true,
    onEnter: () => destImgs.forEach((img) => { img.loading = 'eager'; }),
  });

  // 1. Header reveal
  const reveal = {
    trigger: section.querySelector('.conn__header'),
    start: 'top 75%',
    toggleActions: 'play none none reverse',
  };
  gsap.timeline({ scrollTrigger: reveal })
    .from(section.querySelectorAll('.conn__line > span'), { yPercent: 110, duration: 1.1, stagger: 0.15, ease: 'power3.out' })
    .from(section.querySelector('.conn__lead'), { y: 30, opacity: 0, duration: 0.9, ease: 'power2.out' }, '-=0.5')
    .from(section.querySelector('.conn__tagline'), { y: 30, opacity: 0, duration: 0.9, ease: 'power2.out' }, '-=0.6');

  // 2. Pinned stage timeline
  const setInitialStage = () => {
    const vw = window.innerWidth;
    const barW = sidebar.offsetWidth;
    gsap.set(introImg, { scale: 1 });
    // Sidebar starts completely off-screen to the right (x = vw)
    gsap.set(sidebar, { x: vw });
    // Gallery CSS left is barW, so x = vw - barW places its left edge at vw (flush right)
    gsap.set(gallery, { x: vw - barW });

    destImgs.forEach((img, idx) => {
      if (idx === 0) {
        gsap.set(img, { clipPath: 'inset(0% 0% 0% 0%)', scale: 1, zIndex: 1 });
      } else {
        gsap.set(img, { clipPath: 'inset(100% 0% 0% 100%)', scale: 1.06, zIndex: idx + 1 });
      }
    });

    accBodies.forEach((body, idx) => {
      if (idx === 0) {
        gsap.set(body, { height: accInners[0].offsetHeight, opacity: 1 });
      } else {
        gsap.set(body, { height: 0, opacity: 0 });
      }
    });
  };

  setInitialStage();

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: stage,
      start: 'top top',
      end: () => '+=' + window.innerHeight * (window.innerWidth <= 760 ? 4.2 : 5.0),
      pin: true,
      scrub: 0.65,
      invalidateOnRefresh: true,
      onRefreshInit: setInitialStage,
    },
  });

  // Brief hold on the full-screen MJR entrance image
  tl.to(introImg, { scale: 1.02, duration: 0.25, ease: 'none' });

  // Step 1: Sidebar slides smoothly in from the right edge and stops on the right side
  tl.to(sidebar, {
    x: () => window.innerWidth - sidebar.offsetWidth,
    duration: 0.8,
    ease: 'power2.inOut',
  });

  // Stop for a scroll while the sidebar rests on the right
  tl.to({}, { duration: 0.4 });

  // Step 2: Outside the view beside the bar on the right, Modern Tech District and Airport Skyline.png
  // pushes the sidebar across into view to the left edge
  tl.to(
    sidebar,
    {
      x: 0,
      duration: 0.95,
      ease: 'power2.inOut',
    },
    'pushIn'
  );
  tl.to(
    gallery,
    {
      x: 0,
      duration: 0.95,
      ease: 'power2.inOut',
    },
    'pushIn'
  );

  // Hold on "To Hyderabad" + Modern Tech District and Airport Skyline.png
  tl.to({}, { duration: 0.45 });

  // Step 3: Subsequent destination images open from the bottom-right corner while the
  // left sidebar closes the previous category and expands the next category
  for (let k = 1; k < destImgs.length; k++) {
    const label = `chapter_${k}`;
    tl.to(
      destImgs[k],
      {
        clipPath: 'inset(0% 0% 0% 0%)',
        scale: 1,
        duration: 0.9,
        ease: 'power2.inOut',
      },
      label
    );

    tl.to(
      accBodies[k - 1],
      {
        height: 0,
        opacity: 0,
        duration: 0.75,
        ease: 'power2.inOut',
      },
      label
    );

    tl.to(
      accBodies[k],
      {
        height: () => accInners[k].offsetHeight,
        opacity: 1,
        duration: 0.75,
        ease: 'power2.inOut',
      },
      label
    );

    // Hold on each chapter
    tl.to({}, { duration: 0.45 });
  }

  window.addEventListener('load', () => ScrollTrigger.refresh());
})();
