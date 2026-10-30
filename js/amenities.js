/* 07. Amenities
   Two scrubbed timelines on a sticky stage:
     1. The logo mark rises over the pinned master plan (the section is
        pulled up over its last 150vh, see .has-why-pin .amen--live), then its three towers
        straighten and widen until they fill the screen as one navy panel.
     2. The question appears and a rule draws down from it.
     3. The column keeps scrolling: question and rule leave the top, the
        heading rises from the bottom, followed by the framed water tank
        photo and caption, and settles below the nav bar.
     4. The photo opens to full bleed.
     5. 4 cards rise as a deck: Amenities cover on top, with Live, Play,
        and Relax stacked behind it. As scroll proceeds, the cover lifts
        up with a slight angle, and the three sub-category stacks deal out
        side by side.
     6. Each category card acts as a sub-cover for an interactive Shuffle Stack.
        Hovering peeks the deck layers behind; clicking moves the front
        card up, sideways, and back into the deck in a smooth loop (Framer Shuffle Stack). */
(() => {
  const section = document.getElementById('amenities');
  if (!section) return;

  const isPhone = () => window.matchMedia('(max-width: 760px)').matches;

  let isDealt = false;
  let activeCatIdx = 0;
  let isSwitchingCat = false;
  const categories = ['Live', 'Play', 'Relax'];

  const slider = section.querySelector('#amenSlider');
  const prevCatBtn = section.querySelector('#amenPrevCat');
  const nextCatBtn = section.querySelector('#amenNextCat');
  const prevArrowBtn = section.querySelector('#amenPrevArrow');
  const nextArrowBtn = section.querySelector('#amenNextArrow');
  const prevLabelEl = section.querySelector('#amenPrevLabel');
  const activeLabelEl = section.querySelector('#amenActiveLabel');
  const nextLabelEl = section.querySelector('#amenNextLabel');

  const stackControllers = [];

  function updateSliderLabels(dir = 0) {
    const count = categories.length;
    const prevIdx = (activeCatIdx + count - 1) % count;
    const nextIdx = (activeCatIdx + 1) % count;

    if (!window.gsap || dir === 0) {
      if (prevLabelEl) prevLabelEl.textContent = categories[prevIdx];
      if (activeLabelEl) activeLabelEl.textContent = categories[activeCatIdx];
      if (nextLabelEl) nextLabelEl.textContent = categories[nextIdx];
      return;
    }

    const items = [prevLabelEl, activeLabelEl, nextLabelEl].filter(Boolean);
    window.gsap.to(items, {
      x: -dir * 14,
      opacity: 0,
      duration: 0.14,
      ease: 'power1.in',
      overwrite: 'auto',
      onComplete: () => {
        if (prevLabelEl) prevLabelEl.textContent = categories[prevIdx];
        if (activeLabelEl) activeLabelEl.textContent = categories[activeCatIdx];
        if (nextLabelEl) nextLabelEl.textContent = categories[nextIdx];
        window.gsap.fromTo(
          items,
          { x: dir * 14, opacity: 0 },
          {
            x: 0,
            opacity: 1,
            duration: 0.22,
            ease: 'power2.out',
            overwrite: 'auto',
          }
        );
      },
    });
  }

  function switchCategory(dir) {
    if (!isDealt || isSwitchingCat || stacks.length < 2) return;
    isSwitchingCat = true;

    const count = stacks.length;
    const prevIdx = activeCatIdx;
    const nextIdx = (activeCatIdx + dir + count) % count;
    activeCatIdx = nextIdx;

    const prevStack = stacks[prevIdx];
    const nextStack = stacks[nextIdx];

    prevStack.classList.remove('is-dealt');
    nextStack.classList.add('is-dealt');

    // Reset incoming category stack to its cover card (index 0) so the user starts at the category cover
    if (stackControllers[nextIdx]) {
      stackControllers[nextIdx].resetOrder();
    }

    updateSliderLabels(dir);

    if (!window.gsap) {
      prevStack.style.opacity = '0';
      prevStack.style.zIndex = '1';
      nextStack.style.opacity = '1';
      nextStack.style.zIndex = '3';
      isSwitchingCat = false;
      return;
    }

    const slideOffset = dir * 65;
    window.gsap.set(nextStack, {
      x: slideOffset,
      y: 0,
      rotation: 0,
      scale: 0.96,
      opacity: 0,
      zIndex: 4,
    });
    window.gsap.set(prevStack, { zIndex: 3 });

    window.gsap.to(prevStack, {
      x: -slideOffset,
      scale: 0.96,
      opacity: 0,
      duration: 0.32,
      ease: 'power2.out',
      overwrite: 'auto',
      onComplete: () => {
        window.gsap.set(prevStack, { x: 0, y: 0, scale: 1, zIndex: 1 });
      },
    });

    window.gsap.to(nextStack, {
      x: 0,
      y: 0,
      scale: 1,
      opacity: 1,
      duration: 0.36,
      ease: 'power3.out',
      overwrite: 'auto',
      onComplete: () => {
        window.gsap.set(nextStack, { zIndex: 3 });
        isSwitchingCat = false;
      },
    });
  }

  /* ---------- Shuffle Stack Interaction ---------- */
  function setupShuffleStack(stack, stackIdx) {
    const cards = [...stack.querySelectorAll('.icard')];
    const count = cards.length;
    if (!count) return;

    let isHovered = false;
    let isShuffling = false;

    // order[0] = index of the card currently on top
    let order = cards.map((_, i) => i);

    function getCardTransform(pos, hovered) {
      if (isPhone()) {
        // On mobile: front card (or before dealt) sits flush at 0; once dealt, 3 stepped cards peek behind top edge
        if (pos === 0 || !isDealt) {
          return { x: 0, y: 0, rotation: 0, scale: 1 };
        }
        const stepIdx = Math.min(pos, 3);
        const yStep = 8;
        const scaleStep = 0.042;
        return {
          x: 0,
          y: -(stepIdx * yStep),
          rotation: 0,
          scale: 1 - stepIdx * scaleStep,
        };
      }
      // Desktop: when not hovered, all cards sit flush directly behind the front card
      if (pos === 0 || !hovered) {
        return { x: 0, y: 0, rotation: 0, scale: 1 };
      }
      const sign = pos % 2 === 1 ? 1 : -1;
      const xOffset = sign * (12 + (pos - 1) * 8);
      const yOffset = -pos * 10;
      const rot = sign * (2.2 + (pos - 1) * 1.1);
      const sc = 1 - pos * 0.012;
      return {
        x: xOffset,
        y: yOffset,
        rotation: rot,
        scale: sc,
      };
    }

    function applyStack(animate = true) {
      order.forEach((cardIdx, pos) => {
        const card = cards[cardIdx];
        const z = count - pos;
        const t = getCardTransform(pos, isHovered);
        card.setAttribute('data-pos', String(pos));
        card.setAttribute('data-active', pos === 0 ? 'true' : 'false');

        if (!animate || !window.gsap) {
          card.style.transform = `translate3d(${t.x}px, ${t.y}px, 0) rotate(${t.rotation}deg) scale(${t.scale})`;
          card.style.zIndex = String(z);
        } else {
          window.gsap.to(card, {
            x: t.x,
            y: t.y,
            rotation: t.rotation,
            scale: t.scale,
            zIndex: z,
            duration: 0.35,
            ease: 'power2.out',
            overwrite: 'auto',
          });
        }
      });
    }

    function resetOrder() {
      order = cards.map((_, i) => i);
      isHovered = false;
      isShuffling = false;
      applyStack(false);
    }

    // Initialize resting positions
    applyStack(false);

    // Hover peeking - desktop only, strictly disabled on phone or until dealt out
    stack.addEventListener('pointerenter', () => {
      if (!isDealt || isShuffling || isPhone()) return;
      isHovered = true;
      applyStack(true);
    });

    stack.addEventListener('pointerleave', () => {
      if (!isDealt || isShuffling || isPhone()) return;
      isHovered = false;
      applyStack(true);
    });

    // Shuffle top card: lifts straight UP and goes to the back of the stack (NO sideways movement)
    function shuffle() {
      if (!isDealt || isShuffling || isSwitchingCat || count <= 1) return;
      isShuffling = true;

      const topCardIdx = order[0];
      const topCard = cards[topCardIdx];

      // Card lifts straight up without any sideways movement
      const upY = isPhone() ? -115 : -130;

      if (!window.gsap) {
        order.push(order.shift());
        applyStack(false);
        isShuffling = false;
        return;
      }

      // Step 1: Card lifts straight up
      window.gsap.to(topCard, {
        y: upY,
        x: 0,
        rotation: 0,
        scale: 1.02,
        duration: 0.28,
        ease: 'power2.out',
        onComplete: () => {
          // Step 2: Cycle order so previous top card goes to the back
          order.push(order.shift());

          // Set z-index to 1 (behind the stack)
          topCard.style.zIndex = '1';
          topCard.setAttribute('data-active', 'false');

          // Step 3: Promote remaining cards forward
          order.forEach((cIdx, pos) => {
            if (pos === count - 1) return; // skip card going to the back
            const c = cards[cIdx];
            const z = count - pos;
            const t = getCardTransform(pos, isHovered);
            c.setAttribute('data-pos', String(pos));
            c.setAttribute('data-active', pos === 0 ? 'true' : 'false');
            window.gsap.to(c, {
              x: t.x,
              y: t.y,
              rotation: t.rotation,
              scale: t.scale,
              zIndex: z,
              duration: 0.35,
              ease: 'power3.out',
              overwrite: 'auto',
            });
          });

          // Step 4: Card slides straight down into the back of the deck
          const backT = getCardTransform(count - 1, isHovered);
          topCard.setAttribute('data-pos', String(count - 1));
          window.gsap.to(topCard, {
            x: backT.x,
            y: backT.y,
            rotation: backT.rotation,
            scale: backT.scale,
            duration: 0.35,
            ease: 'power3.out',
            overwrite: 'auto',
            onComplete: () => {
              isShuffling = false;
              applyStack(true);
            },
          });
        },
      });
    }

    // Gesture tracking on card stack:
    // - Mobile horizontal swipe (left/right): switch between the 3 category decks (Live, Play, Relax)
    // - Mobile vertical swipe UP: switch subset cards within the active category deck
    let startX = 0;
    let startY = 0;
    let tracking = false;
    let suppressClick = false;

    stack.addEventListener('pointerdown', (e) => {
      if (!isDealt) return;
      startX = e.clientX;
      startY = e.clientY;
      tracking = true;
      suppressClick = false;
    });

    stack.addEventListener('pointerup', (e) => {
      if (!tracking) return;
      tracking = false;
      if (!isDealt) return;

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      if (isPhone()) {
        // Horizontal swipe -> switch to next/prev category deck
        if (Math.abs(dx) > 26 && Math.abs(dx) > Math.abs(dy) * 1.1) {
          suppressClick = true;
          switchCategory(dx < 0 ? 1 : -1);
          return;
        }
        // Vertical swipe UP -> cycle subset cards of the active category
        if (dy < -22 && Math.abs(dy) >= Math.abs(dx)) {
          suppressClick = true;
          shuffle();
          return;
        }
      }
    });

    stack.addEventListener('pointercancel', () => {
      tracking = false;
    });

    stack.addEventListener('click', (e) => {
      e.preventDefault();
      if (suppressClick) {
        suppressClick = false;
        return;
      }
      if (!isPhone()) {
        shuffle();
      }
    });

    stack.setAttribute('tabindex', '0');
    stack.setAttribute('role', 'button');
    stack.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowUp') {
        e.preventDefault();
        shuffle();
      } else if (isPhone() && e.key === 'ArrowLeft') {
        e.preventDefault();
        switchCategory(-1);
      } else if (isPhone() && e.key === 'ArrowRight') {
        e.preventDefault();
        switchCategory(1);
      }
    });

    stackControllers[stackIdx] = { resetOrder, applyStack, shuffle };
  }

  // Set up shuffle for each of the 3 stacks
  const stacks = [...section.querySelectorAll('.amen-stack')];
  stacks.forEach((s, idx) => setupShuffleStack(s, idx));

  // Wire up mobile bottom category slider signifier buttons & swipe
  if (prevCatBtn) prevCatBtn.addEventListener('click', () => switchCategory(-1));
  if (prevArrowBtn) prevArrowBtn.addEventListener('click', () => switchCategory(-1));
  if (nextCatBtn) nextCatBtn.addEventListener('click', () => switchCategory(1));
  if (nextArrowBtn) nextArrowBtn.addEventListener('click', () => switchCategory(1));

  if (slider) {
    let sliderStartX = 0;
    let sliderTracking = false;
    slider.addEventListener('pointerdown', (e) => {
      sliderStartX = e.clientX;
      sliderTracking = true;
    });
    slider.addEventListener('pointerup', (e) => {
      if (!sliderTracking) return;
      sliderTracking = false;
      const dx = e.clientX - sliderStartX;
      if (Math.abs(dx) > 28) {
        switchCategory(dx < 0 ? 1 : -1);
      }
    });
    slider.addEventListener('pointercancel', () => {
      sliderTracking = false;
    });
  }

  function setDealt(dealt) {
    if (isDealt === dealt) return;
    isDealt = dealt;

    if (slider) {
      slider.classList.toggle('is-active', dealt && isPhone());
    }

    if (isPhone()) {
      if (!dealt) {
        activeCatIdx = 0;
        isSwitchingCat = false;
        updateSliderLabels(0);
      }
      stacks.forEach((s, idx) => {
        const isActiveStack = dealt && idx === activeCatIdx;
        s.classList.toggle('is-dealt', isActiveStack);
        if (stackControllers[idx]) {
          if (dealt) {
            stackControllers[idx].applyStack(true);
          } else {
            stackControllers[idx].resetOrder();
          }
        }
        if (window.gsap && !dealt) {
          window.gsap.set(s, {
            x: 0,
            opacity: idx === 0 ? 1 : 0,
            scale: 1,
            zIndex: idx === 0 ? 3 : 1,
          });
        }
      });
      return;
    }

    stacks.forEach((s, idx) => {
      s.classList.toggle('is-dealt', dealt);
      if (stackControllers[idx]) {
        if (dealt) {
          stackControllers[idx].applyStack(true);
        } else {
          stackControllers[idx].resetOrder();
        }
      }
    });
  }

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
  const deck = $('.amen__deck');
  const track = $('.amen__track');
  const cover = section.querySelector('.acard--main-cover');
  const allDeckCards = [...stacks, cover]; // Live(0), Play(1), Relax(2), Cover(3)
  const vh = () => window.innerHeight;

  // Distance between dealt cards: one card width plus a little extra gap
  const step = () => stacks[0].offsetWidth + (isPhone() ? 24 : Math.max(38, Math.min(68, window.innerWidth * 0.035)));

  const NAV_CLEAR = 110; // keep the heading clear of the logo in the nav bar
  // Elongate the 3-tower shape ONLY on the bottom side on taller viewports (mobile)
  // by measuring the top slanted roof vertices (--t1, --t2) in px from the top at 56.95vw scale.
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
    const room = vh() - NAV_CLEAR - head.offsetHeight - copy.offsetHeight - vh() * 0.07 - 40;
    const w = Math.max(200, Math.min(window.innerWidth * (isPhone() ? 0.88 : 0.62), 1240, room * 1018 / 558));
    frame.style.width = w + 'px';
    frame.style.height = (w * 558 / 1018 + (isPhone() ? 20 : 0)) + 'px';
  };
  fitShape();
  fitFrame();
  ScrollTrigger.addEventListener('refreshInit', () => {
    gsap.set(frame, { clearProps: 'width,height,padding,y' });
    fitShape();
    fitFrame();
  });
  // Column offset: on desktop puts the heading just under the nav bar;
  // on mobile keeps the entire [heading + image + copy] container center-aligned vertically
  const settleY = () => {
    if (isPhone()) {
      const blockTop = head.offsetTop;
      const blockBottom = copy.offsetTop + copy.offsetHeight;
      const blockH = blockBottom - blockTop;
      const targetTop = Math.max(NAV_CLEAR, (vh() - blockH) / 2 + 16);
      return targetTop - blockTop;
    }
    return NAV_CLEAR - head.offsetTop;
  };

  gsap.set(shape, { y: () => shape.offsetHeight + 40 });
  gsap.set(navy, { opacity: 0 });
  gsap.set(q, { opacity: 0, y: () => Math.min(vh() * 0.25, 120) });
  gsap.set(rule, { scaleY: 0, transformOrigin: 'top center' });

  // Initial 4-card stack: overlapped on mobile, diagonal peek on desktop
  gsap.set(allDeckCards, {
    xPercent: -50,
    yPercent: -50,
    x: (i) => (isPhone() ? 0 : (i - 3) * 14),
    y: (i) => vh() + (isPhone() ? 0 : (i - 3) * 14),
    zIndex: (i) => (i === 3 ? 10 : isPhone() ? (i === 0 ? 3 : 1) : i + 1),
    rotation: 0,
    opacity: (i) => (isPhone() && i !== 0 && i !== 3 ? 0 : 1),
  });
  if (slider) {
    gsap.set(slider, { y: 65, opacity: 0 });
  }

  const RISE = 1.6; // screens of scroll for step 1, overlapping the plan's pin

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
    .fromTo(
      shape,
      { y: () => shape.offsetHeight + 40 },
      { y: () => shape.offsetHeight - vh(), duration: 1.4, ease: 'power3.out' }
    )
    .addLabel('open')
    .to(shape, { left: '0%', width: '100%', height: '100%', y: 0, duration: 1.2 }, 'open')
    .fromTo(
      bldgs[0],
      {
        left: '0%',
        width: '30.68%',
        '--t1': () => (logoH() * 0.4404).toFixed(1) + 'px',
        '--t2': () => (logoH() * 0.2301).toFixed(1) + 'px',
      },
      { left: '0%', width: '33.4%', '--t1': '0px', '--t2': '0px', duration: 1.2 },
      'open'
    )
    .fromTo(
      bldgs[1],
      {
        left: '34.64%',
        width: '30.72%',
        '--t1': () => (logoH() * 0.2092).toFixed(1) + 'px',
        '--t2': '0px',
      },
      { left: '33.3%', width: '33.4%', '--t1': '0px', '--t2': '0px', duration: 1.2 },
      'open'
    )
    .fromTo(
      bldgs[2],
      {
        left: '69.32%',
        width: '30.68%',
        '--t1': () => (logoH() * 0.3003).toFixed(1) + 'px',
        '--t2': () => (logoH() * 0.6043).toFixed(1) + 'px',
      },
      { left: '66.6%', width: '33.4%', '--t1': '0px', '--t2': '0px', duration: 1.2 },
      'open'
    )
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
      onUpdate: (self) => {
        const dealOffset = isPhone() ? 0.15 : 0.8;
        const dealThreshold = tl.labels['deal'] ? (tl.labels['deal'] + dealOffset) / tl.totalDuration() : 0.85;
        setDealt(self.progress >= dealThreshold);
      },
    },
  });

  // Menu "Amenities" lands once the question and its rule are in place (js/main.js reads this)
  (window.MJR_SPOTS = window.MJR_SPOTS || {}).amen = () => tl.scrollTrigger.labelToScroll('asked');

  // 2. Question slides up into place, then the rule grows down from it
  tl.to(q, { opacity: 1, y: 0, duration: 1, ease: 'power2.out' })
    .to(rule, { scaleY: 1, duration: 1.1, ease: 'power1.inOut' }, '+=0.1')
    .addLabel('asked')

  // 3. One continuous scroll of the column and paper texture up to the heading's resting place; line moves up off the screen
    .to(track, { y: settleY, duration: 3.2, ease: 'none' }, '+=0.2')
    .to(navy, { y: settleY, duration: 3.2, ease: 'none' }, '<')
    .to(rule, { y: () => -(NAV_CLEAR + 120), duration: 1.8, ease: 'power1.in' }, '<+1.2')
    .to(q, { opacity: 0, duration: 0.6, ease: 'none' }, '<+0.4')

  // 4. Photo opens to full bleed
    .addLabel('bleed', '+=0.6')
    .to([head, copy], { opacity: 0, duration: 0.4, ease: 'none' }, 'bleed')
    .to(frame, {
      width: () => window.innerWidth,
      height: vh,
      padding: 0,
      y: () => -(settleY() + frame.offsetTop),
      duration: 1.3,
    }, 'bleed')

  // 5. 4-card deck rises with Amenities cover on top
    .addLabel('deck', '+=0.3')
    .to(allDeckCards, {
      y: (i) => (isPhone() ? 0 : (i - 3) * 14),
      duration: 1.3,
      ease: 'power3.out',
      stagger: isPhone() ? 0 : 0.06,
    }, 'deck')

  // 6. Cover lifts up with angle/tilt off-screen
    .addLabel('deal', '+=0.4')
    .to(cover, {
      y: () => -vh() * 1.5,
      rotation: () => (isPhone() ? -14 : -9),
      duration: 1.3,
      ease: 'power3.inOut',
    }, 'deal');

  if (isPhone()) {
    // On mobile: cards stay overlapped in the center while the category slider rises from the bottom
    if (slider) {
      tl.fromTo(
        slider,
        { y: 65, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.95, ease: 'power3.out' },
        'deal+=0.2'
      );
    }
    tl.to({}, { duration: 1.6 });
  } else {
    tl.to(stacks, {
      x: (i) => (i - 1) * step(),
      y: 0,
      rotation: 0,
      duration: 1.3,
      ease: 'power3.inOut',
    }, 'deal')
      .to({}, { duration: 1 });
  }

  window.addEventListener('load', () => ScrollTrigger.refresh());
})();
