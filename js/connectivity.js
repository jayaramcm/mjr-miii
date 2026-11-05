/* 04. Location: Connectivity
   1. Title lines slide up, then the description and tagline follow.
   2. The stage starts on the MJR entrance image; as the user scrolls:
      - Desktop: the navy sidebar slides in from the right, then the destination gallery
        pushes the sidebar across to the left edge.
      - Mobile: the navy sidebar slides up from the bottom, then the destination gallery
        opens above the bottom sidebar.
      - Each subsequent destination image opens while the sidebar accordion switches items:
        * To Hyderabad -> modern-tech-district-airport-skyline.webp
        * Education nearby -> aerial-campus-panorama-flags.webp
        * Healthcare nearby -> modern-hospital-campus-cityscape.webp
        * Around Kalwakurthy -> temples-reservoirs-buddha-vista.webp */
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
  const isMobile = () => window.innerWidth <= 760;

  const setInitialStage = () => {
    const vw = window.innerWidth;
    const mob = isMobile();
    const barW = sidebar.offsetWidth;
    const barH = sidebar.offsetHeight;
    gsap.set(introImg, { scale: 1 });
    if (mob) {
      // Mobile: sidebar starts off-screen below the bottom edge and slides up
      gsap.set(sidebar, { x: 0, y: barH });
      gsap.set(gallery, { x: 0, y: 0, clipPath: 'inset(100% 0% 0% 0%)' });
    } else {
      // Desktop: sidebar starts completely off-screen to the right (x = vw)
      gsap.set(sidebar, { x: vw, y: 0 });
      // Gallery CSS left is barW, so x = vw - barW places its left edge at vw (flush right)
      gsap.set(gallery, { x: vw - barW, y: 0, clipPath: 'none' });
    }

    destImgs.forEach((img, idx) => {
      if (idx === 0) {
        gsap.set(img, { clipPath: 'inset(0% 0% 0% 0%)', scale: 1, zIndex: 1 });
      } else {
        gsap.set(img, {
          clipPath: mob ? 'inset(100% 0% 0% 0%)' : 'inset(100% 0% 0% 100%)',
          scale: 1.06,
          zIndex: idx + 1,
        });
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
      end: () => '+=' + window.innerHeight * (isMobile() ? 4.2 : 5.0),
      pin: true,
      scrub: 0.65,
      invalidateOnRefresh: true,
      onRefreshInit: setInitialStage,
    },
  });

  // Brief hold on the full-screen MJR entrance image
  tl.to(introImg, { scale: 1.02, duration: 0.25, ease: 'none' });

  // Step 1: Desktop slides sidebar in from the right; Mobile slides sidebar up from the bottom
  tl.to(sidebar, {
    x: () => (isMobile() ? 0 : window.innerWidth - sidebar.offsetWidth),
    y: 0,
    duration: 0.8,
    ease: 'power2.inOut',
  });

  // Stop for a scroll while the sidebar rests
  tl.to({}, { duration: 0.4 });

  // Step 2: Desktop gallery pushes sidebar across to the left; Mobile gallery opens above the bottom sidebar
  tl.to(
    sidebar,
    {
      x: 0,
      y: 0,
      duration: 0.95,
      ease: 'power2.inOut',
    },
    'pushIn'
  );
  tl.to(
    gallery,
    {
      x: 0,
      y: 0,
      clipPath: () => (isMobile() ? 'inset(0% 0% 0% 0%)' : 'none'),
      duration: 0.95,
      ease: 'power2.inOut',
    },
    'pushIn'
  );

  // Hold on "To Hyderabad" + modern-tech-district-airport-skyline.webp
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
