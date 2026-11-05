/* 12-15. About, FAQ, Enquiry, Closing and Footer
   1. [data-rise] elements slide up as they enter the viewport, staggered
      within each group.
   2. About stats count up once.
   3. FAQ: a standard accordion, one answer open at a time.
   4. Enquiry form: validation, submission and a clear confirmation.
   5. Closing photo drifts slowly behind the line as it scrolls past. */
(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // 1. Rise-in reveal
  const risers = [...document.querySelectorAll('[data-rise]')];
  if (!reduceMotion && 'IntersectionObserver' in window) {
    document.documentElement.classList.add('js-rise');
    // Stagger siblings that share a parent
    const groups = new Map();
    risers.forEach((el) => {
      const list = groups.get(el.parentElement) || [];
      list.push(el);
      groups.set(el.parentElement, list);
    });
    groups.forEach((list) => list.forEach((el, i) => el.style.setProperty('--rd', (i * 0.09).toFixed(2) + 's')));

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -10% 0px' });
    risers.forEach((el) => io.observe(el));
  }

  // 2. Stats count up
  const counters = [...document.querySelectorAll('[data-count]')];
  const format = (n, plain) => (plain ? String(n) : n.toLocaleString('en-IN'));
  if (!reduceMotion && 'IntersectionObserver' in window) {
    const countIo = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        countIo.unobserve(entry.target);
        const el = entry.target;
        const to = Number(el.dataset.count);
        const plain = 'plain' in el.dataset;
        const from = plain ? to - 14 : 0;
        const start = performance.now();
        const DURATION = 1600;
        const tick = (now) => {
          const t = Math.min(1, (now - start) / DURATION);
          const eased = 1 - Math.pow(1 - t, 3);
          el.textContent = format(Math.round(from + (to - from) * eased), plain);
          if (t < 1) requestAnimationFrame(tick);
        };
        el.textContent = format(from, plain);
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.6 });
    counters.forEach((el) => countIo.observe(el));
  }

  // 3. FAQ: native <details>; opening one closes the others, and the answer
  //    eases open under its question
  const faqSection = document.getElementById('faq');
  if (faqSection && window.gsap && window.ScrollTrigger && !reduceMotion) {
    ScrollTrigger.create({
      trigger: faqSection,
      start: 'top top',
      end: () => '+=' + Math.round(window.innerHeight * 0.9),
      pin: true,
      pinSpacing: true,
      invalidateOnRefresh: true,
    });
  }

  const qaItems = [...document.querySelectorAll('.faq .qa')];
  qaItems.forEach((item) => {
    const body = item.querySelector('.qa__a');
    item.querySelector('summary').addEventListener('click', (e) => {
      if (reduceMotion || !window.gsap) return;
      e.preventDefault();
      const opening = !item.open;
      qaItems.forEach((other) => {
        if (other === item || !other.open) return;
        const ob = other.querySelector('.qa__a');
        gsap.to(ob, { height: 0, duration: 0.35, ease: 'power2.inOut', onComplete: () => { other.open = false; gsap.set(ob, { clearProps: 'height' }); ScrollTrigger.refresh(); } });
      });
      if (opening) {
        item.open = true;
        gsap.fromTo(body, { height: 0 }, { height: 'auto', duration: 0.45, ease: 'power2.out', clearProps: 'height', onComplete: () => ScrollTrigger.refresh() });
      } else {
        gsap.to(body, { height: 0, duration: 0.35, ease: 'power2.inOut', onComplete: () => { item.open = false; gsap.set(body, { clearProps: 'height' }); ScrollTrigger.refresh(); } });
      }
    });
  });
  if (reduceMotion || !window.gsap) {
    qaItems.forEach((d) => d.addEventListener('toggle', () => {
      if (d.open) qaItems.forEach((o) => { if (o !== d) o.open = false; });
    }));
  }

  // 4. Enquiry form
  const form = document.getElementById('leadForm');
  if (form) {
    const name = document.getElementById('ldName');
    const phone = document.getElementById('ldPhone');
    const submit = document.getElementById('leadSubmit');
    const msg = document.getElementById('leadMsg');
    phone.addEventListener('input', () => { phone.value = phone.value.replace(/\D/g, '').slice(0, 10); });
    let sending = false;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (sending) return;
      const checks = [
        [name, document.getElementById('ldNameErr'), name.value.trim().length >= 2],
        [phone, document.getElementById('ldPhoneErr'), /^[6-9]\d{9}$/.test(phone.value)],
      ];
      let firstBad = null;
      checks.forEach(([input, err, ok]) => {
        input.setAttribute('aria-invalid', String(!ok));
        err.hidden = ok;
        if (!ok && !firstBad) firstBad = input;
      });
      if (firstBad) { firstBad.focus(); return; }

      const MJR = window.MJR || {};
      sending = true;
      msg.hidden = true;
      submit.setAttribute('aria-busy', 'true');
      submit.textContent = 'Sending...';
      const ph = phone.value;
      try {
        if (!MJR.submitLead) throw new Error('no sender');
        const res = await MJR.submitLead({
          form: 'contact',
          intent: document.getElementById('ldInterest').value,
          name: name.value.trim(),
          phone: ph,
        });
        form.reset();
        msg.className = 'form-msg form-msg--ok';
        msg.innerHTML = `<strong>Thank you. Your enquiry has reached our sales team.</strong> They will call you on +91 ${esc(ph)} shortly.${res.ref ? ` Reference: ${esc(res.ref)}.` : ''}`;
      } catch (err) {
        msg.className = 'form-msg form-msg--error';
        msg.textContent = MJR.SEND_FAIL || 'We could not send your enquiry. Please call +91 90100 55596.';
      } finally {
        msg.hidden = false;
        sending = false;
        submit.removeAttribute('aria-busy');
        submit.textContent = 'Get in touch';
      }
    });
  }

  // 5. Facts the sales team keeps in js/site-data.js and js/plots-data.js
  const site = window.MJR_SITE || {};
  const fmtDate = (iso) => {
    if (!iso) return '';
    const d = new Date(iso + 'T00:00:00');
    return isNaN(d) ? iso : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  // Availability date on the master plan
  const avail = document.getElementById('availDate');
  const updated = window.MJR_PLOTS && window.MJR_PLOTS.UPDATED;
  if (avail && updated) { avail.dateTime = updated; avail.textContent = fmtDate(updated); }

  // Amenity tabs & sliding carousel
  const tabs = [...document.querySelectorAll('[data-amen-filter]')];
  const amenGrid = document.getElementById('amenGrid');
  const acards = [...document.querySelectorAll('#amenGrid .agrid__card')];
  const prevBtn = document.getElementById('amenPrevBtn');
  const nextBtn = document.getElementById('amenNextBtn');
  let amenIdx = 0;

  const getAmenCols = () => {
    if (!amenGrid) return 3;
    const raw = parseFloat(getComputedStyle(amenGrid).getPropertyValue('--amen-cols'));
    return isNaN(raw) || raw < 1 ? 3 : raw;
  };

  const updateAmenCarousel = () => {
    if (!amenGrid) return;
    const visible = acards.filter((c) => !c.hidden);
    const cols = getAmenCols();
    const maxIdx = Math.max(0, Math.ceil(visible.length - cols));
    if (amenIdx > maxIdx) amenIdx = maxIdx;
    if (amenIdx < 0) amenIdx = 0;

    if (visible.length > 0 && amenIdx > 0) {
      const firstCard = visible[0];
      const gap = parseFloat(getComputedStyle(amenGrid).columnGap || getComputedStyle(amenGrid).gap || '0') || 0;
      const step = firstCard.getBoundingClientRect().width + gap;
      const viewportW = amenGrid.parentElement ? amenGrid.parentElement.clientWidth : amenGrid.clientWidth;
      const totalW = visible.length * firstCard.getBoundingClientRect().width + Math.max(0, visible.length - 1) * gap;
      const maxOffset = Math.max(0, totalW - viewportW);
      const offset = Math.min(amenIdx * step, maxOffset);
      amenGrid.style.transform = `translate3d(${-offset}px, 0, 0)`;
    } else {
      amenGrid.style.transform = 'translate3d(0, 0, 0)';
    }

    if (prevBtn) prevBtn.disabled = amenIdx <= 0;
    if (nextBtn) nextBtn.disabled = amenIdx >= maxIdx;
  };

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      amenIdx = Math.max(0, amenIdx - 1);
      updateAmenCarousel();
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      amenIdx += 1;
      updateAmenCarousel();
    });
  }
  window.addEventListener('resize', updateAmenCarousel, { passive: true });
  updateAmenCarousel();

  tabs.forEach((tab) => tab.addEventListener('click', () => {
    const f = tab.dataset.amenFilter;
    tabs.forEach((t) => { const on = t === tab; t.classList.toggle('is-active', on); t.setAttribute('aria-pressed', String(on)); });
    const show = acards.filter((c) => f === 'all' || c.dataset.cat === f);
    acards.forEach((c) => { c.hidden = !show.includes(c); });
    amenIdx = 0;
    updateAmenCarousel();
    if (!reduceMotion && window.gsap) gsap.fromTo(show, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.45, stagger: 0.05, ease: 'power2.out', clearProps: 'transform' });
    const first = show[0];
    const spot = (window.MJR_SPOTS || {}).amenTabs;
    if (first && spot && window.MJR && window.MJR.scrollToEl && first.getBoundingClientRect().bottom < 120) {
      window.MJR.scrollToEl(spot());
    }
  }));

  // Location: map pin, directions and road distances
  const map = site.map || {};
  const hasPin = typeof map.lat === 'number' && typeof map.lng === 'number';
  const q = encodeURIComponent(hasPin ? `${map.lat},${map.lng}` : (map.address || 'Kalwakurthy, Telangana'));
  const frame = document.getElementById('locMap');
  if (frame) frame.src = `https://www.google.com/maps?q=${q}&z=${hasPin ? 16 : 14}&output=embed`;
  const dirBtn = document.getElementById('locDirections');
  if (dirBtn) dirBtn.href = `https://www.google.com/maps/dir/?api=1&destination=${q}`;
  const openBtn = document.getElementById('locOpenMap');
  if (openBtn) openBtn.href = `https://www.google.com/maps/search/?api=1&query=${q}`;
  const dist = site.distances || { rows: [] };
  const distBody = document.getElementById('distBody');
  if (distBody) {
    if (!dist.rows || !dist.rows.length) distBody.closest('.loc-info__side').hidden = true;
    else {
      distBody.innerHTML = dist.rows.map((r) => {
        const route = `https://www.google.com/maps/dir/?api=1&origin=${q}&destination=${encodeURIComponent(r.to + ', Telangana')}`;
        return `<tr><th scope="row">${esc(r.to)}</th><td>${dist.verified ? '' : 'approx. '}${esc(r.km)} km</td>` +
          `<td><a href="${route}" target="_blank" rel="noopener" aria-label="Route to ${esc(r.to)} on Google Maps">Route</a></td></tr>`;
      }).join('');
      const note = document.getElementById('distNote');
      if (note) note.textContent = dist.verified
        ? 'Road distances from the project gate, measured on Google Maps. Travel times vary with traffic.'
        : 'Approximate road distances from the project. Tap Route for the live distance and travel time.';
    }
  }

  // Project status, dated site photographs, completed projects
  const statusList = document.getElementById('statusList');
  const status = site.status || [];
  if (statusList) {
    if (!status.length) statusList.closest('.status-strip').hidden = true;
    else {
      const label = { done: 'Complete', progress: 'In progress', next: 'Planned' };
      statusList.innerHTML = status.map((st) => `<li class="timeline__item is-${esc(st.state || 'next')}">` +
        `<span class="timeline__dot" aria-hidden="true"></span>` +
        `<p class="timeline__label">${esc(st.label)}<span class="timeline__state">${esc(st.stateLabel || label[st.state] || '')}</span></p>` +
        `<p class="timeline__detail">${esc(st.detail || '')}${st.date ? ` &middot; ${esc(fmtDate(st.date))}` : ''}</p></li>`).join('');
      const asOf = document.getElementById('statusAsOf');
      if (asOf && site.statusAsOf) asOf.textContent = `Status as of ${fmtDate(site.statusAsOf)}`;
    }
  }
  const photos = site.sitePhotos || [];
  if (photos.length) {
    document.getElementById('sitePhotoGrid').innerHTML = photos.map((p) =>
      `<li><figure><img src="${esc(p.src)}" alt="${esc(p.caption || 'Site photograph')}" loading="lazy" decoding="async">` +
      `<figcaption><time datetime="${esc(p.date)}">${esc(fmtDate(p.date))}</time>${p.caption ? ` &middot; ${esc(p.caption)}` : ''}</figcaption></figure></li>`).join('');
    document.getElementById('sitePhotos').hidden = false;
  }
  const projects = site.completedProjects || [];
  if (projects.length) {
    document.getElementById('completedList').innerHTML = projects.map((p) =>
      `<li><strong>${esc(p.name)}</strong> <span>${[p.place, p.year, p.units ? `${p.units} plots` : ''].filter(Boolean).map(esc).join(' &middot; ')}</span></li>`).join('');
    document.getElementById('completedProjects').hidden = false;
  }

  // Location: the background turns navy as soon as the top of the map block
  // reaches the top of the view (the bottom of the nav bar), and back to
  // ivory on the way up. Measured live on every scroll frame, so images or
  // embeds that change the page height later can never put it out of step.
  const locInfo = document.querySelector('.loc-info__frame');
  const locSection = document.getElementById('location');
  const siteNav = document.getElementById('siteNav');
  if (locInfo && locSection) {
    let ticking = false;
    const checkNavy = () => {
      ticking = false;
      const line = siteNav ? siteNav.getBoundingClientRect().bottom : 0;
      locSection.classList.toggle('is-navy', locInfo.getBoundingClientRect().top <= line);
    };
    const queue = () => { if (!ticking) { ticking = true; requestAnimationFrame(checkNavy); } };
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue);
    window.addEventListener('load', queue);
    checkNavy();
  }

  // Phone action bar: tucked away over the hero and the pinned plan, where it would cover controls
  const bar = document.getElementById('mbar');
  if (bar && 'IntersectionObserver' in window) {
    const covering = new Set();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => (en.isIntersecting ? covering.add(en.target) : covering.delete(en.target)));
      bar.classList.toggle('is-hidden', covering.size > 0);
    }, { threshold: 0.01 });
    ['heroPin', 'overview'].map((id) => document.getElementById(id)).filter(Boolean).forEach((el) => io.observe(el));
  }

  // Paper texture fades away once "A place to build your future." comes into view,
  // and returns if the visitor scrolls back up above the section
  const enquire = document.getElementById('contact');
  if (enquire && 'IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) document.documentElement.classList.add('paper-gone');
      else if (entry.boundingClientRect.top > 0) document.documentElement.classList.remove('paper-gone');
    }, { rootMargin: '0px 0px -15% 0px' }).observe(enquire);
  }

  const year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());
})();
