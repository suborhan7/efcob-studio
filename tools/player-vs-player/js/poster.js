/* Player vs Player poster renderer: renderTvt(el, state). Seven layouts from shifty's VS references:
   bolt (lightning split), neon (neon frames), slash (slash plates), chrome (chrome bar), half (halftone slash),
   smoke (team-colour smoke over a pitch) and brush (neon panels, paint strokes, cyberpunk VS); the last two are
   shared with the Team vs Team card.
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
    smoke: ['#1f6bff', '#7fb0ff', '#ff2d7a', '#ff8fb8'], brush: ['#e0213f', '#ff6b80', '#3fc3f0', '#a8e6ff'],
  };

  /* Where each player stands: x = body centre, top = head-top line, head = head width, floor = where the photo is cut
     (hidden behind the plate / bar / frame bottom). Photos are scaled by head size so every cut-out looks the same size. */
  const SLOTS = {
    bolt:   [{ x: 260, top: 470, head: 150, floor: 1012 }, { x: 820, top: 470, head: 150, floor: 1012 }],
    neon:   [{ x: 262, top: 505, head: 140, floor: 1026 }, { x: 818, top: 505, head: 140, floor: 1026 }],
    slash:  [{ x: 260, top: 405, head: 130, floor: 792 },  { x: 820, top: 555, head: 130, floor: 942 }],
    chrome: [{ x: 285, top: 480, head: 140, floor: 905 },  { x: 795, top: 480, head: 140, floor: 905 }],
    half:   [{ x: 260, top: 505, head: 140, floor: 1032 }, { x: 820, top: 505, head: 140, floor: 1032 }],
    smoke:  [{ x: 262, top: 420, head: 132, floor: 868 },  { x: 818, top: 420, head: 132, floor: 868 }],
    // clip = the neon panel the player stands in
    brush:  [{ x: 270, top: 430, head: 140, floor: 990, clip: 'inset(290px 600px 360px 60px)' },
             { x: 810, top: 430, head: 140, floor: 990, clip: 'inset(290px 60px 360px 600px)' }],
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
      ? `<div class="slot${slots[i].fade ? ' fade' : ''}" style="${slots[i].clip ? `height:1350px;clip-path:${slots[i].clip}` : `height:${slots[i].floor}px`}"><img data-p="${i}" src="${t.photo}" style="${tvtPhotoStyle(t, slots[i])}" alt=""></div>` : '').join('');
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

    if (L === 'smoke') {
      const clouds = (side, c1, c2) => Array.from({ length: 14 }, () => {
        const x = side === 'L' ? -60 + R() * 470 : 1140 - R() * 470, y = 380 + R() * 620, rx = 120 + R() * 170, ry = 90 + R() * 140;
        return `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${R() > .5 ? c1 : c2}" opacity="${.45 + R() * .45}"/>`;
      }).join('');
      const sparks = Array.from({ length: 26 }, () => `<circle cx="${470 + R() * 140}" cy="${360 + R() * 260}" r="${1 + R() * 2.5}" opacity="${.4 + R() * .6}"/>`).join('');
      h = `${up || `<svg class="full" viewBox="0 0 1080 1350"><defs>
          <linearGradient id="pvsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b2a2e"/><stop offset=".55" stop-color="#0a1416"/><stop offset="1" stop-color="#050809"/></linearGradient>
          <filter id="pvsm" x="-20%" y="-20%" width="140%" height="140%"><feTurbulence type="fractalNoise" baseFrequency=".011" numOctaves="5" seed="9" result="n"/>
            <feDisplacementMap in="SourceGraphic" in2="n" scale="190" xChannelSelector="R" yChannelSelector="G"/><feGaussianBlur stdDeviation="16"/></filter></defs>
          <rect width="1080" height="1200" fill="url(#pvsky)"/>
          <g filter="url(#pvsm)">${clouds('L', a, a2)}</g><g filter="url(#pvsm)">${clouds('R', b, b2)}</g></svg>`}
        <svg class="full" viewBox="0 0 1080 1350"><defs>
          <linearGradient id="pvgr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#173d1e"/><stop offset="1" stop-color="#0b2410"/></linearGradient>
          <radialGradient id="pvgc" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ff9a2e" stop-opacity=".55"/><stop offset="1" stop-color="#ff5a00" stop-opacity="0"/></radialGradient>
          <filter id="pvb6"><feGaussianBlur stdDeviation="3"/></filter></defs>
          ${up ? '' : `<path d="M0 960 L1080 960 L1080 1200 L0 1200 Z" fill="url(#pvgr)"/>
          <g opacity=".5">${Array.from({ length: 9 }, (_, i) => i % 2 ? `<path d="M${-200 + i * 185} 1200 L${380 + i * 40} 960" stroke="#1f5226" stroke-width="40" opacity=".5"/>` : '').join('')}</g>
          <path d="M0 990 L1080 990" stroke="#e8f2e8" stroke-width="4" opacity=".75"/><path d="M528 1200 L536 960 L544 960 L552 1200 Z" fill="#e8f2e8" opacity=".8"/>`}
          <ellipse cx="540" cy="640" rx="260" ry="200" fill="url(#pvgc)"/><g fill="#ffcf5a">${sparks}</g>
          <ellipse cx="540" cy="1048" rx="70" ry="12" fill="#000" opacity=".6" filter="url(#pvb6)"/>
          <g transform="translate(540 990)"><circle r="56" fill="#f4f4f4"/><polygon points="0,-20 19,-6 12,16 -12,16 -19,-6" fill="#1b1b1b"/>
            ${[0, 72, 144, 216, 288].map(r => `<g transform="rotate(${r})"><path d="M0 -20 L0 -40" stroke="#1b1b1b" stroke-width="3"/><path d="M-14 -52 L0 -40 L14 -52 L9 -56 L-9 -56 Z" fill="#1b1b1b"/></g>`).join('')}
            <circle r="56" fill="none" stroke="#000" stroke-opacity=".25" stroke-width="5"/><circle cx="-18" cy="-20" r="26" fill="#fff" opacity=".35"/></g></svg>
        ${hdr}${phs}
        ${mv('vs', `<div class="vs"><b>VS</b></div>`)}
        ${mv('teamA', `<div class="nm nmA"><b>${esc(A.player)}</b><span>${esc(A.team)}</span></div>`)}${mv('teamB', `<div class="nm nmB"><b>${esc(B.player)}</b><span>${esc(B.team)}</span></div>`)}
        ${mv('info', `<div class="info"><div>${date}${time ? `<em>${time}</em>` : ' · '}${extra}</div></div>`)}`;
    }
    if (L === 'brush') {
      const strokes = (c1, c2, seed) => `<svg width="420" height="700" viewBox="0 0 420 700" style="position:absolute;left:0;top:0"><defs>
        <filter id="pvro${seed}" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency=".02 .004" numOctaves="2" seed="${seed}"/><feDisplacementMap in="SourceGraphic" scale="44"/><feGaussianBlur stdDeviation="1.2"/></filter></defs>
        <g filter="url(#pvro${seed})"><path d="M-40 480 L460 260 L470 340 L-30 580 Z" fill="${c1}"/><path d="M-30 600 L450 430 L460 460 L-20 650 Z" fill="${c2}" opacity=".85"/>
        <path d="M-20 200 L300 90 L310 120 L-10 240 Z" fill="${c1}" opacity=".6"/></g></svg>`;
      // big outline word: the short name, or the first part of the player's name (Nexus_Arif -> NEXUS)
      const word = t => esc(t.short || String(t.player || t.team).split(/[_\s.-]/)[0]);
      const panel = (t, x, c1, c2, seed) => `<div class="panel" style="left:${x}px;border-color:${c1};box-shadow:0 0 22px ${c1},inset 0 0 40px rgba(0,0,0,.6)">
        ${up ? '' : strokes(c1, c2, seed)}<div class="big">${word(t)}</div></div>`;
      h = `${up}${hdr}${panel(A, 60, a, a2, 3)}${panel(B, 600, b, b2, 8)}${phs}
        <svg class="full" viewBox="0 0 1080 1350"><defs><radialGradient id="pvgb" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#fff2b8"/><stop offset=".35" stop-color="#e6b143"/><stop offset=".8" stop-color="#8a5a12"/><stop offset="1" stop-color="#3d2405"/></radialGradient>
          <radialGradient id="pvha" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ffcf6a" stop-opacity=".5"/><stop offset="1" stop-color="#ffcf6a" stop-opacity="0"/></radialGradient></defs>
          <circle cx="540" cy="620" r="150" fill="url(#pvha)"/>
          <g transform="translate(540 620)"><circle r="78" fill="url(#pvgb)"/><polygon points="0,-26 25,-8 15,21 -15,21 -25,-8" fill="#3d2405" opacity=".85"/>
            ${[0, 72, 144, 216, 288].map(r => `<g transform="rotate(${r})"><path d="M0 -26 L0 -50" stroke="#3d2405" stroke-width="4" opacity=".8"/><path d="M-18 -68 L0 -50 L18 -68 L12 -76 L-12 -76 Z" fill="#3d2405" opacity=".75"/></g>`).join('')}
            <circle cx="-24" cy="-28" r="30" fill="#fff" opacity=".35"/></g></svg>
        ${mv('vs', `<div class="vs"><b>VS</b></div>`)}
        ${mv('teamA', `<div class="nm nmA"><b style="color:${a2}">${esc(A.player)}</b><span>${esc(A.team)}</span></div>`)}${mv('teamB', `<div class="nm nmB"><b style="color:${b2}">${esc(B.player)}</b><span>${esc(B.team)}</span></div>`)}
        ${mv('info', `<div class="info">${date}${time ? `<em>${time}</em>` : ' · '}${extra}</div>`)}`;
    }

    root.innerHTML = `<div class="tvt ${L}${isUp ? ' up' : ''}">${h}${sp}</div>`;
    const p = root.firstElementChild;
    [['--a', a], ['--a2', a2], ['--b', b], ['--b2', b2]].forEach(([k, v]) => p.style.setProperty(k, v));
    fitNames(p);
  }

  // long team names shrink until they fit their space
  const FIT = { bolt: [['.pl b', 400]], neon: [['.nm b', 460]], slash: [['.plA b', 320], ['.plB b', 420]], chrome: [['.tn', 300]], half: [['.tn b', 460]], smoke: [['.nm b', 440]], brush: [['.nm b', 420]] };
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
