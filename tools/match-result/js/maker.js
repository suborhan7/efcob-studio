/* Maker page: form -> data -> poster, plus jersey/logo colour auto-detect, auto cut-out, drag/size and PNG download. */
(function () {
  const S = window.SAMPLE_PHOTOS || {};
  const team = (o) => Object.assign({ dx: 0, dy: 0, zoom: 1, logo: '', photo: '' }, o);
  const state = {
    layout: 'wave',
    moves: {},                     // admin's drags/sizes per layout: { wave: { score: { x, y, s, ox, oy } } }
    hidden: {},                    // parts the admin switched off, per layout: { ticket: { barcode: true } }
    bgMode: 'template',            // 'template' | 'jersey' | 'image'
    bgImage: '',                   // admin's uploaded background (data URL)
    tag: 'Matchday 12',
    kicker: 'eFCOB Pro League · Season 2',
    label: 'Full time',
    date: '19 Oct 2026',
    footerLeft: 'efcob.com',
    footerRight: 'eFootball Council of Bangladesh',
    logo: '',
    teams: [
      team({ name: 'Dhaka Strikers', player: 'Nova_10', score: '3', scorers: "Mbappé 12', Mbappé 54', Vinícius 88'", photo: S.a || '', primary: '#f2c200', secondary: '#111111' }),
      team({ name: 'Chattogram Kings', player: 'Red Wolf', score: '1', scorers: "Kane 67'", photo: S.b || '', primary: '#d61f35', secondary: '#111111' }),
    ],
  };

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const poster = $('#poster');
  const readFile = f => new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(f); });

  // names for the "Poster e ki ki thakbe" list and the editor bar (js/studio-edit.js); T/B = top/bottom team in Wave
  const PARTS = { brand: 'eFCOB logo', tag: 'Tag (top right)', kick: 'League line', card: 'Ticket card', title: 'Title',
    p0: 'Team 1 photo', p1: 'Team 2 photo', photos: 'Photo window', chip1: 'Team 1 player chip', chip2: 'Team 2 player chip', vs: 'VS',
    crestT: 'Upor team logo', nameT: 'Upor team name', playerT: 'Upor player', badgeT: 'WINNER tag', scorersT: 'Upor scorers',
    crestB: 'Nicher team logo', nameB: 'Nicher team name', playerB: 'Nicher player', badgeB: 'DEFEAT tag', scorersB: 'Nicher scorers',
    name1: 'Team 1 name', result1: 'Team 1 WINNER/DEFEAT', player1: 'Team 1 player', score: 'Score', scoreTag: 'Score er upor tag',
    name2: 'Team 2 name', result2: 'Team 2 WINNER/DEFEAT', player2: 'Team 2 player', scorers1: 'Team 1 scorers', scorers2: 'Team 2 scorers',
    line: 'Dashed line', info: 'Result / date box', barcode: 'Barcode', footer: 'Footer' };
  let editing = false;

  const render = () => {
    renderMatch(poster, state);
    if (editing) StudioEdit.afterRender();
    $('#bgUploadRow').style.display = state.bgMode === 'image' ? '' : 'none';
  };

  // ---- poster fields ----
  $$('[data-k]').forEach(i => {
    i.value = state[i.dataset.k];
    i.addEventListener(i.tagName === 'SELECT' ? 'change' : 'input', () => { state[i.dataset.k] = i.value; render(); });
  });
  $$('[data-file]').forEach(i => i.addEventListener('change', async e => {
    const f = e.target.files[0]; state[i.dataset.file] = f ? await readFile(f) : ''; render();
  }));

  // true when the image already has see-through pixels (an existing cut-out)
  async function hasTransparency(src) {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
    const cv = document.createElement('canvas'); cv.width = 64; cv.height = Math.max(1, Math.round(64 * img.height / img.width));
    const ctx = cv.getContext('2d'); ctx.drawImage(img, 0, 0, cv.width, cv.height);
    const d = ctx.getImageData(0, 0, cv.width, cv.height).data;
    let clear = 0; for (let i = 3; i < d.length; i += 4) if (d[i] < 200) clear++;
    return clear > d.length / 4 * 0.02;
  }

  // AI background removal in the browser (@imgly/background-removal). The model (~44 MB) downloads once, then is cached.
  async function cutOut(file, status) {
    if (!window.BgRemoval) throw new Error('library missing');
    status.textContent = 'Background kata hochche…';
    const blob = await BgRemoval.removeBackground(file, {
      model: 'small',
      // run in the page, not a worker: workers can't load the model when index.html is opened straight from disk
      proxyToWorker: false,
      output: { format: 'image/png' },
      progress: (k, cur, total) => {
        if (k.startsWith('fetch') && total) status.textContent = `AI model download hochche (prothombar): ${Math.round(cur / total * 100)}%`;
        else if (k.startsWith('compute')) status.textContent = 'Background kata hochche…';
      },
    });
    status.textContent = 'Cut-out ready ✓';
    return JerseyColors.keepMainSubject(await readFile(blob));
  }

  // the two strongest colours of a logo (transparent, white and black pixels skipped)
  async function logoColors(src) {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
    const W = 80, H = Math.max(1, Math.round(80 * img.height / img.width));
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d', { willReadFrequently: true }); ctx.drawImage(img, 0, 0, W, H);
    const px = ctx.getImageData(0, 0, W, H).data, buckets = {};
    for (let i = 0; i < px.length; i += 4) {
      if (px[i + 3] < 200) continue;
      const r = px[i], g = px[i + 1], b = px[i + 2], mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      const l = (mx + mn) / 510, s = mx === mn ? 0 : (mx - mn) / 255 / (1 - Math.abs(2 * l - 1));
      if (s < 0.3 || l < 0.12 || l > 0.9) continue;
      let h = mx === r ? ((g - b) / (mx - mn)) % 6 : mx === g ? (b - r) / (mx - mn) + 2 : (r - g) / (mx - mn) + 4;
      h = ((h * 60) + 360) % 360;
      const k = Math.floor(h / 20), bk = buckets[k] || (buckets[k] = { n: 0, r: 0, g: 0, b: 0 });
      bk.n++; bk.r += r; bk.g += g; bk.b += b;
    }
    const hex = bk => '#' + [bk.r, bk.g, bk.b].map(v => Math.round(v / bk.n).toString(16).padStart(2, '0')).join('');
    const top = Object.values(buckets).sort((a, b) => b.n - a.n);
    if (!top.length) return null;
    return { primary: hex(top[0]), secondary: top[1] ? hex(top[1]) : '#111111' };
  }

  // ---- team sections ----
  const tpl = $('#teamTpl'), teamsEl = $('#teams');
  const secs = state.teams.map((t, i) => {
    const sec = tpl.content.firstElementChild.cloneNode(true);
    $('h3', sec).textContent = `Team ${i + 1}`;
    teamsEl.appendChild(sec);

    $$('[data-t]', sec).forEach(inp => {
      inp.value = t[inp.dataset.t];
      inp.addEventListener('input', () => { t[inp.dataset.t] = inp.value; render(); });
    });
    const setColors = c => {
      if (!c) return;
      Object.assign(t, c);
      $('[data-t="primary"]', sec).value = c.primary; $('[data-t="secondary"]', sec).value = c.secondary;
      render();
    };
    const fromJersey = async () => { if (t.photo) try { setColors(await JerseyColors.pickJerseyColors(t.photo)); } catch (e) { console.warn('Colour detect failed', e); } };
    const fromLogo = async () => { if (t.logo) try { setColors(await logoColors(t.logo)); } catch (e) { console.warn('Logo colours failed', e); } };
    $('[data-auto="jersey"]', sec).addEventListener('click', fromJersey);
    $('[data-auto="logo"]', sec).addEventListener('click', fromLogo);

    $('[data-photo]', sec).addEventListener('change', async e => {
      const f = e.target.files[0]; if (!f) return;
      const status = $('[data-status]', sec);
      let src = await readFile(f);
      // normal photo (no transparent background) -> cut the player out automatically
      if ($('[data-cutout]', sec).checked && !(await hasTransparency(src))) {
        try { src = await cutOut(f, status); }
        catch (err) { console.warn('Auto cut-out failed', err); status.textContent = 'Auto cut-out hoyni (internet lagbe). Normal chobi boshano holo.'; }
      }
      t.photo = await JerseyColors.enhancePhoto(await JerseyColors.trimTransparent(src));
      Object.assign(t, { dx: 0, dy: 0, zoom: 1 });
      render(); syncZoom(i);
      fromJersey();   // new photo -> new jersey colours
    });
    $('[data-logo]', sec).addEventListener('change', async e => {
      const f = e.target.files[0]; t.logo = f ? await readFile(f) : ''; render();
      if (t.logo) fromLogo();   // a logo sets the team colours too
    });
    $('[data-zoom]', sec).addEventListener('input', e => { t.zoom = e.target.value / 100; render(); syncZoom(i); });
    $('[data-reset-pos]', sec).addEventListener('click', () => { Object.assign(t, { dx: 0, dy: 0, zoom: 1 }); render(); syncZoom(i); });
    return { sec, fromJersey };
  });
  function syncZoom(i) {
    const sec = secs[i].sec, z = Math.round(state.teams[i].zoom * 100);
    $('[data-zoom]', sec).value = z; $('[data-zoom-val]', sec).textContent = z + '%';
  }

  // ---- photos: drag and wheel-resize (sections, selection, nudge, remove and undo live in js/studio-edit.js) ----
  const frame = $('#frame');
  const posterScale = () => frame.getBoundingClientRect().width / 1080;
  let drag = null;
  frame.addEventListener('pointerdown', e => {
    const img = e.target.closest('[data-p]'); if (!img) return;
    const t = state.teams[+img.dataset.p];
    drag = { t, img, x: e.clientX, y: e.clientY, dx: t.dx, dy: t.dy };
    frame.setPointerCapture(e.pointerId); frame.classList.add('dragging');
  });
  frame.addEventListener('pointermove', e => {
    if (!drag) return;
    const s = posterScale(), t = drag.t;
    t.dx = Math.round(drag.dx + (e.clientX - drag.x) / s);
    t.dy = Math.round(drag.dy + (e.clientY - drag.y) / s);
    // move only the photo while dragging (no full re-render)
    drag.img.setAttribute('style', matchPhotoTransform(t, state.layout === 'ticket' ? 'translateX(-50%)' : ''));
  });
  const endDrag = () => { drag = null; frame.classList.remove('dragging'); };
  frame.addEventListener('pointerup', endDrag); frame.addEventListener('pointercancel', endDrag);
  frame.addEventListener('wheel', e => {
    const img = e.target.closest('[data-p]'); if (!img) return;
    e.preventDefault();
    const i = +img.dataset.p, t = state.teams[i];
    t.zoom = Math.min(2, Math.max(0.5, +(t.zoom * (e.deltaY < 0 ? 1.05 : 0.95)).toFixed(3)));
    render(); syncZoom(i);
  }, { passive: false });

  /* Section move/size. Untouched sections get no transform at all, so the default poster (and its stacking) stays exactly
     as designed. Sections sit inside other boxes (team block, ticket card), so the kit's poster-px resize centre is turned
     into the wrapper's own px. A moved section comes above the untouched ones (and keeps the highest z-index inside it). */
  const styleOf = k => {
    const m = (state.moves[state.layout] || {})[k] || {}, s = m.s || 1;
    if (!m.x && !m.y && s === 1) return '';
    const el = poster.querySelector(`[data-move="${k}"]`), root = poster.firstElementChild;
    let ox = 0, oy = 0, z = 0;
    for (let e = el; e && e !== root; e = e.offsetParent) { ox += e.offsetLeft; oy += e.offsetTop; }
    for (let a = el && el.parentElement.closest('[data-move]'); a; a = a.parentElement.closest('[data-move]')) { const q = (state.moves[state.layout] || {})[a.dataset.move] || {}; ox += q.x || 0; oy += q.y || 0; }
    if (el) [el, ...el.querySelectorAll('*')].forEach(d => { z = Math.max(z, parseInt(getComputedStyle(d).zIndex) || 0); });
    return `transform:translate(${m.x || 0}px,${m.y || 0}px)${s !== 1 ? ` scale(${s})` : ''};transform-origin:${(m.ox || 540) - ox}px ${(m.oy || 675) - oy}px;z-index:${Math.max(1, z)}${el && !el.classList.contains('mv') ? ';position:relative' : ''}`;
  };
  StudioEdit.init({
    frame, poster, state, render, panel: $('#form'), partsBox: $('#parts'), parts: PARTS,
    moveKey: () => state.layout, styleOf,
    photo: { get: i => state.teams[i], changed: i => syncZoom(i) },
    extras: { get: () => state.teams.map(t => [t.dx, t.dy, t.zoom]), set: v => v.forEach((p, i) => { [state.teams[i].dx, state.teams[i].dy, state.teams[i].zoom] = p; syncZoom(i); }) },
  });
  editing = true;

  // ---- reset: every section and both photos of this layout back to the default spot and size ----
  $('#resetAll').addEventListener('click', () => {
    delete state.moves[state.layout]; delete state.hidden[state.layout];
    state.teams.forEach((t, i) => { Object.assign(t, { dx: 0, dy: 0, zoom: 1 }); syncZoom(i); });
    render();
  });

  // ---- download ----
  $('#download').addEventListener('click', async () => {
    const btn = $('#download'); btn.disabled = true; btn.textContent = 'Rendering…';
    try {
      const node = $('.mr', poster);
      const url = await htmlToImage.toPng(node, { width: 1080, height: 1350, pixelRatio: 2, fontEmbedCSS: window.POSTER_FONT_CSS, cacheBust: false });
      const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const a = document.createElement('a');
      a.download = `match-result-${slug(state.teams[0].name)}-vs-${slug(state.teams[1].name)}.png`;
      a.href = url; a.click();
    } catch (e) { alert('Export failed: ' + e.message); }
    btn.disabled = false; btn.textContent = 'Download PNG (HD)';
  });

  render();
  // names are measured to fit, so draw again once the poster fonts are ready
  const fontsReady = Promise.all(['900 84px Unbounded', '800 38px "Bricolage Grotesque"', '900 30px Orbitron', '700 18px "Space Mono"'].map(f => document.fonts.load(f))).catch(() => {});
  // sample photos: sharpen them and read the jersey colours, like a fresh upload
  window.__ready = fontsReady.then(async () => {
    render();
    for (const [i, t] of state.teams.entries()) if (t.photo) { t.photo = await JerseyColors.enhancePhoto(t.photo); await secs[i].fromJersey(); }
    render(); StudioEdit.reset();
  });
  window.__posterState = state;
  window.__render = render;
})();
