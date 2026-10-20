/* Player vs Player poster renderer: renderTvt(el, state). Five layouts from shifty's VS references:
   bolt (lightning split), neon (neon frames), slash (slash plates), chrome (chrome bar), half (halftone slash).
   st.arrange: 'side' (players side by side) or 'updown' (team 1 high on the left, team 2 low on the right; bolt, slash, half).
   Every text block sits in a .mv wrapper so the admin can drag it and wheel-resize it; see tvtMoveStyle. */
(function () {
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const dk = (hx, k) => { const n = parseInt(hx.slice(1), 16), f = c => Math.round(c * k).toString(16).padStart(2, '0'); return '#' + f(n >> 16) + f(n >> 8 & 255) + f(n & 255); };
  // seeded random, so rays/particles stay put while the admin types
  const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

  // fixed template colours per layout: [team 1, team 1 light, team 2, team 2 light]
  const TPL = {
    bolt: ['#ff8a1a', '#ffd21a', '#1f63db', '#3fc1f2'], neon: ['#2f6bff', '#8fb8ff', '#ff2d55', '#ff9db0'],
    slash: ['#1e9be0', '#7fd0ff', '#1e9be0', '#7fd0ff'], chrome: ['#1d4fd8', '#5d8bff', '#d91f3a', '#ff6b7f'],
    half: ['#1b3263', '#2c4c8f', '#c4101b', '#e8323d'],
  };

  /* Where each player stands: x = body centre, top = head-top line, head = head width, floor = where the photo is cut
     (hidden behind the plate / bar / frame bottom). Photos are scaled by head size so every cut-out looks the same size. */
  const SLOTS = {
    bolt:   [{ x: 260, top: 470, head: 150, floor: 1012 }, { x: 820, top: 470, head: 150, floor: 1012 }],
    neon:   [{ x: 262, top: 505, head: 140, floor: 1026 }, { x: 818, top: 505, head: 140, floor: 1026 }],
    slash:  [{ x: 260, top: 405, head: 130, floor: 792 },  { x: 820, top: 555, head: 130, floor: 942 }],
    chrome: [{ x: 285, top: 480, head: 140, floor: 905 },  { x: 795, top: 480, head: 140, floor: 905 }],
    half:   [{ x: 260, top: 505, head: 140, floor: 1032 }, { x: 820, top: 505, head: 140, floor: 1032 }],
  };
  /* Upor-nich: player slots for the staggered arrangement (fade = the photo's cut line is open, so it fades out)
     and where the text sections move by default so names stay under their player. */
  const UPDOWN = {
    bolt:   { slots: [{ x: 215, top: 280, head: 150, floor: 740 }, { x: 820, top: 525, head: 150, floor: 1004 }], moves: { teamA: { x: -30, y: -272 }, teamB: { y: -8 } } },
    slash:  { slots: [{ x: 260, top: 330, head: 130, floor: 722 },  { x: 820, top: 590, head: 130, floor: 942 }],  moves: { teamA: { y: -70 } } },
    half:   { slots: [{ x: 250, top: 330, head: 132, floor: 770, fade: 1 }, { x: 830, top: 600, head: 132, floor: 1032 }], moves: { title: { y: -20 }, vs: { y: 20 }, teamA: { y: -262 } } },
  };
  // only these layouts have an upor-nich version (neon frames and the chrome bar look best side by side)
  const isUD = st => st.arrange === 'updown' && !!UPDOWN[st.layout];
  window.tvtSlots = st => isUD(st) ? UPDOWN[st.layout].slots : SLOTS[st.layout];
  // admin's own drags/sizes, kept apart for each layout and each arrangement
  window.tvtMoveKey = st => st.layout + (isUD(st) ? ':ud' : '');
  window.tvtMoveStyle = (st, key) => {
    const p = (isUD(st) && UPDOWN[st.layout].moves[key]) || {}, o = ((st.moves || {})[tvtMoveKey(st)] || {})[key] || {};
    const x = (p.x || 0) + (o.x || 0), y = (p.y || 0) + (o.y || 0), sc = o.s || 1;
    return `transform:translate(${x}px,${y}px)${sc !== 1 ? ` scale(${sc})` : ''};transform-origin:${o.ox || 540}px ${o.oy || 675}px`;
  };

  // photo placement in poster px; m = head measurement from maker.js (null = no measurement yet, fit the box instead)
  function place(t, slot) {
    const m = t.m;
    if (!m) return null;
    let s = slot.head / m.head * t.zoom;
    let left = slot.x - m.cx * s, top = slot.top - m.top * s;
    const bottom = top + m.h * s;
    if (bottom < slot.floor + 4 && t.zoom >= 1) top += slot.floor + 4 - bottom;   // short chest-up crop: push down so it never floats
    return { left: left + t.dx, top: top + t.dy, w: m.w * s, h: m.h * s };
  }
  window.tvtPhotoStyle = (t, slot) => {
    const p = place(t, slot);
    return p ? `left:${p.left.toFixed(1)}px;top:${p.top.toFixed(1)}px;width:${p.w.toFixed(1)}px;height:${p.h.toFixed(1)}px` : '';
  };

  function renderTvt(root, st) {
    const L = st.layout, [A, B] = st.teams, R = rng(7);
    const mv = (key, html) => `<div class="mv" data-move="${key}" style="${tvtMoveStyle(st, key)}">${html}</div>`;
    let a, a2, b, b2;
    if (st.bgMode === 'jersey') { a = A.c; a2 = A.c2; b = B.c; b2 = B.c2; } else [a, a2, b, b2] = TPL[L];
    const isUp = st.bgMode === 'image' && st.bgImage;
    const up = isUp ? `<div class="upbg" style="background-image:url('${st.bgImage}')"></div><div class="wash"></div>` : '';
    const sp = `<div class="sp"><div class="k">${esc(st.partnersLabel).toUpperCase()}</div><div class="row">${st.partners.map(p =>
      `<div>${p.logo ? `<img src="${p.logo}" alt="">` : esc(p.name)}</div>`).join('')}</div><div class="w">${esc(st.site).toUpperCase()}</div></div>`;
    const brand = `<div class="brand">${st.logo ? `<img src="${st.logo}" alt="">` : 'eFCOB'}</div>`;
    const hdr = L === 'slash'
      ? mv('head', `<div class="hdr">${brand}<div class="ev"><b>${esc(st.title)}</b>${esc(st.event)}</div></div>`)
      : mv('head', `<div class="hdr">${brand}<div class="ev"><b>${esc(st.tag)}</b>${esc(st.date)}</div></div>`) + mv('title', `<div class="ttl"><b>${esc(st.title)}</b><span>${esc(st.event)}</span></div>`);
    const slots = tvtSlots(st);
    const phs = [A, B].map((t, i) => t.photo
      ? `<div class="slot${slots[i].fade ? ' fade' : ''}" style="height:${slots[i].floor}px"><img data-p="${i}" src="${t.photo}" style="${tvtPhotoStyle(t, slots[i])}" alt=""></div>` : '').join('');
    const date = esc(st.date), time = esc(st.time), extra = esc(st.extra);
    let h = '';

    if (L === 'bolt') {
      const bolt = [[700, -20], [575, 430], [665, 430], [490, 800], [580, 800], [400, 1220]], bp = bolt.map(p => p.join(',')).join(' ');
      const rays = (cx, cy, col) => `<g opacity=".55">${Array.from({ length: 90 }, (_, i) => {
        const t = i / 90 * Math.PI * 2 + R() * .03, r1 = 260 + R() * 120, r2 = 1400, w = .010 + R() * .012;
        return `<polygon points="${cx + Math.cos(t) * r1},${cy + Math.sin(t) * r1} ${cx + Math.cos(t + w) * r2},${cy + Math.sin(t + w) * r2} ${cx + Math.cos(t - w) * r2},${cy + Math.sin(t - w) * r2}" fill="${col}"/>`;
      }).join('')}</g>`;
      h = `${up || `<svg class="full" viewBox="0 0 1080 1350"><defs>
        <radialGradient id="tvgA" cx="28%" cy="42%" r="70%"><stop offset="0" stop-color="${a2}"/><stop offset=".55" stop-color="${a}"/><stop offset="1" stop-color="${dk(a, .6)}"/></radialGradient>
        <radialGradient id="tvgB" cx="76%" cy="42%" r="70%"><stop offset="0" stop-color="${b2}"/><stop offset=".55" stop-color="${b}"/><stop offset="1" stop-color="${dk(b, .6)}"/></radialGradient>
        <clipPath id="tvcA"><polygon points="-10,-20 ${bp} -10,1220"/></clipPath><clipPath id="tvcB"><polygon points="1090,-20 ${bp} 1090,1220"/></clipPath></defs>
        <g clip-path="url(#tvcA)"><rect width="1080" height="1220" fill="url(#tvgA)"/>${rays(280, 520, dk(a, .55))}</g>
        <g clip-path="url(#tvcB)"><rect width="1080" height="1220" fill="url(#tvgB)"/>${rays(820, 520, dk(b, .55))}</g></svg><div class="dots"></div>`}
        <svg class="full" viewBox="0 0 1080 1350"><polyline points="${bp}" fill="none" stroke="#10142a" stroke-width="44"/><polyline points="${bp}" fill="none" stroke="#fff" stroke-width="24"/></svg>
        ${hdr}${phs}
        ${mv('vs', `<div class="vs"><div class="o"><span style="margin-top:-40px">V</span><span style="margin-top:70px;margin-left:-18px">S</span></div><span class="v">V</span><span class="s">S</span></div>`)}
        ${mv('teamA', `<div class="pl plA"><b>${esc(A.team)}</b><span>${esc(A.player)}</span></div>`)}${mv('teamB', `<div class="pl plB"><b>${esc(B.team)}</b><span>${esc(B.player)}</span></div>`)}
        ${mv('info', `<div class="info"><div><i>${[date, [time && `<em>${time}</em>`, extra].filter(Boolean).join(' ')].filter(Boolean).join(' · ')}</i></div></div>`)}`;
    }
    if (L === 'neon') {
      // two rounded frames whose inner edges lean like a "/"
      const fA = 'M70 330 H470 Q500 330 497 358 L455 1000 Q452 1028 424 1028 H70 Q42 1028 42 1000 V358 Q42 330 70 330 Z';
      const fB = 'M656 330 H1010 Q1038 330 1038 358 V1000 Q1038 1028 1010 1028 H610 Q582 1028 585 1000 L625 358 Q628 330 656 330 Z';
      h = `${up}<svg class="full" viewBox="0 0 1080 1350"><path d="${fA}" fill="${a}" fill-opacity=".14"/><path class="glowA" d="${fA}" fill="none" stroke="${a2}" stroke-width="6"/>
        <path d="${fB}" fill="${b}" fill-opacity=".14"/><path class="glowB" d="${fB}" fill="none" stroke="${b2}" stroke-width="6"/></svg>
        ${hdr}${phs}
        ${mv('vs', `<div class="vs"><div class="v glowA" style="-webkit-text-stroke-color:${a2}">V</div>
          <svg style="position:absolute;left:96px;top:60px;filter:drop-shadow(0 0 4px #ffd27a) drop-shadow(0 0 16px #ff8a3c)" width="110" height="190" viewBox="0 0 110 190"><polygon points="70,4 18,104 52,104 34,186 96,72 60,72 84,4" fill="none" stroke="#ffe08a" stroke-width="5" stroke-linejoin="round"/></svg>
          <div class="s glowB" style="-webkit-text-stroke-color:${b2}">S</div></div>`)}
        ${mv('teamA', `<div class="nm nmA"><b>${esc(A.team)}</b><span>${esc(A.player)}</span></div>`)}${mv('teamB', `<div class="nm nmB"><b>${esc(B.team)}</b><span>${esc(B.player)}</span></div>`)}
        ${mv('info', `<div class="info">${date}${time ? `<b>${time}</b>` : ' · '}${extra}</div>`)}`;
    }
    if (L === 'slash') {
      const tint = st.bgMode === 'jersey' ? 18 : 0;
      h = `${up || `<div class="tint" style="background:radial-gradient(50% 40% at 15% 35%,color-mix(in srgb,${a} ${tint}%,transparent),transparent),radial-gradient(50% 40% at 85% 60%,color-mix(in srgb,${b} ${tint}%,transparent),transparent)"></div><div class="dotsL"></div><div class="dotsR"></div>`}
        <svg class="full" viewBox="0 0 1080 1350"><defs><filter id="tvsh"><feGaussianBlur stdDeviation="7"/></filter></defs>
          <polygon points="760,110 772,110 360,1090 348,1090" fill="rgba(0,0,0,.35)" filter="url(#tvsh)" transform="translate(-14,0)"/>
          <polygon points="764,110 768,110 354,1090 350,1090" fill="#9a9da6"/>
          <g stroke="rgba(0,0,0,.08)" stroke-width="2">${Array.from({ length: 14 }, () => { const x = 150 + R() * 800, y = 60 + R() * 1000; return `<line x1="${x}" y1="${y}" x2="${x + 30}" y2="${y - 80}"/>`; }).join('')}</g></svg>
        ${hdr}${phs}
        ${mv('teamA', `<div class="pl plA"><small>${esc(A.player)}</small><b>${esc(A.team)}</b></div>`)}
        ${mv('teamB', `<div class="pl plB"><small>${esc(B.player)}</small><b>${esc(B.team)}</b></div>`)}
        ${mv('vs', `<div class="vs"><span class="v">V</span><span class="s">S</span></div>`)}
        ${mv('info', `<div class="info">${time ? `<b>${time}</b>` : ''}${[date, extra].filter(Boolean).join(' · ')}</div>`)}`;
    }
    if (L === 'chrome') {
      const parts = (side, col) => Array.from({ length: 220 }, () => {
        const t = R(), x = side === 'L' ? -20 + t * 480 : 1100 - t * 480, y = 975 + (R() - .5) * (60 + t * 300) * (1 - t * .4), r = (R() - .5) * 60 + (side === 'L' ? -20 : 20);
        return `<rect x="${x}" y="${y}" width="${10 + R() * 16}" height="3.2" rx="1.6" fill="${col}" opacity="${(.35 + R() * .6) * (1 - t * .7)}" transform="rotate(${r} ${x} ${y})"/>`;
      }).join('');
      h = `${up || `<div class="stream stA"></div><div class="stream stB"></div>`}
        ${hdr}${phs}
        ${up ? '' : `<svg class="full" viewBox="0 0 1080 1350" style="filter:drop-shadow(0 0 5px ${a2})">${parts('L', a2)}</svg><svg class="full" viewBox="0 0 1080 1350" style="filter:drop-shadow(0 0 5px ${b2})">${parts('R', b2)}</svg>`}
        ${mv('bar', `<div class="lip"></div><div class="bar"></div>
        <div class="tn tnA">${esc(A.team)}</div><div class="tn tnB">${esc(B.team)}</div>
        <div class="pn pnA">${esc(A.player)}</div><div class="pn pnB">${esc(B.player)}</div>
        <div class="shield"></div><div class="shield2"></div><div class="vs"><span class="v">V</span><span class="s">S</span></div>`)}
        ${mv('info', `<div class="info">${date}${time ? `<b>${time}</b>` : ' · '}${extra}</div>`)}`;
    }
    if (L === 'half') {
      h = `${up || `<svg class="full" viewBox="0 0 1080 1350"><defs>
        <pattern id="tvdR" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="10" cy="10" r="6" fill="${b}"/></pattern>
        <pattern id="tvdB" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="10" cy="10" r="6" fill="${a}"/></pattern>
        <linearGradient id="tvf1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".55" stop-color="#fff" stop-opacity=".25"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
        <linearGradient id="tvf2" x1="1" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#fff"/><stop offset=".55" stop-color="#fff" stop-opacity=".25"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
        <mask id="tvmA"><rect width="1080" height="1200" fill="url(#tvf1)"/></mask><mask id="tvmB"><rect width="1080" height="1200" fill="url(#tvf2)"/></mask>
        <clipPath id="tvhA"><polygon points="0,0 720,0 380,1200 0,1200"/></clipPath><clipPath id="tvhB"><polygon points="720,0 1080,0 1080,1200 380,1200"/></clipPath></defs>
        <g clip-path="url(#tvhA)"><rect width="1080" height="1200" fill="${a}"/><rect width="1080" height="1200" fill="url(#tvdR)" mask="url(#tvmA)" opacity=".85"/></g>
        <g clip-path="url(#tvhB)"><rect width="1080" height="1200" fill="${b}"/><rect width="1080" height="1200" fill="url(#tvdB)" mask="url(#tvmB)" opacity=".85"/></g>
        <polygon points="716,0 726,0 600,440" fill="#fff"/><polygon points="760,-10 772,-10 640,330" fill="#fff" opacity=".8"/>
        <polygon points="520,720 528,720 410,1060" fill="#fff"/><polygon points="470,800 478,800 380,1080" fill="#fff" opacity=".7"/></svg>`}
        ${hdr}${phs}
        ${mv('vs', `<div class="vs" style="--sh:${st.bgMode === 'jersey' ? '#10142a' : '#0d1838'}"><b>VS</b></div>`)}
        ${mv('teamA', `<div class="tn tnA"><b>${esc(A.team)}</b><span>${esc(A.player)}</span></div>`)}${mv('teamB', `<div class="tn tnB"><b>${esc(B.team)}</b><span>${esc(B.player)}</span></div>`)}
        ${mv('info', `<div class="info">${date}${time ? `<b>${time}</b>` : ' · '}${extra}</div>`)}`;
    }

    root.innerHTML = `<div class="tvt ${L}${isUp ? ' up' : ''}">${h}${sp}</div>`;
    const p = root.firstElementChild;
    [['--a', a], ['--a2', a2], ['--b', b], ['--b2', b2]].forEach(([k, v]) => p.style.setProperty(k, v));
    fitNames(p);
  }

  // long team names shrink until they fit their space
  const FIT = { bolt: [['.pl b', 400]], neon: [['.nm b', 460]], slash: [['.plA b', 320], ['.plB b', 420]], chrome: [['.tn', 300]], half: [['.tn b', 460]] };
  function fitNames(p) {
    const L = [...p.classList].find(c => FIT[c]);
    for (const [sel, max] of FIT[L]) p.querySelectorAll(sel).forEach(el => {
      el.style.fontSize = '';
      let f = parseFloat(getComputedStyle(el).fontSize);
      const w0 = el.style.width, d0 = el.style.display;
      el.style.width = 'max-content'; el.style.display = 'inline-block';
      while (el.offsetWidth > max && f > 18) { f -= 1; el.style.fontSize = f + 'px'; }
      el.style.width = w0; el.style.display = d0;
    });
    const t = p.querySelector('.ttl b');
    if (t) { t.style.fontSize = ''; let f = parseFloat(getComputedStyle(t).fontSize); t.style.display = 'inline-block'; while (t.offsetWidth > 980 && f > 30) { f -= 2; t.style.fontSize = f + 'px'; } t.style.display = ''; }
  }

  window.renderTvt = renderTvt;
})();
