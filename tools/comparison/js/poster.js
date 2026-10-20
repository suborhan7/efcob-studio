/* Renders the Player Comparison poster into a container.
   renderComparison(container, data)
   data = {
     tag, kicker, title, footerLeft, footerRight, logo (image url or ''),
     a: { name, team, photo, primary, secondary },   // jersey colours as hex
     b: { name, team, photo, primary, secondary },
     stats: [{ label, a, b, better: 'high' | 'low' | 'none' }]
   } */
(function () {
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = v => { const n = parseFloat(String(v).replace(/[^0-9.\-]/g, '')); return isNaN(n) ? null : n; };

  function winner(stat) {
    if (stat.better === 'none') return null;
    const a = num(stat.a), b = num(stat.b);
    if (a === null || b === null || a === b) return null;
    const aWins = stat.better === 'low' ? a < b : a > b;
    return aWins ? 'a' : 'b';
  }

  // per-player position set in the maker: dx/dy in poster pixels, zoom 1 = default size
  function playerTransform(pl) {
    // scaled from the top so both heads stay on the same line
    const dx = +pl.dx || 0, dy = +pl.dy || 0, z = +pl.zoom || 1;
    return `transform: translateX(-50%) translate(${dx}px, ${dy}px) scale(${z}); transform-origin: 50% 0;`;
  }

  function vars(prefix, p) {
    return `--${prefix}-base:${p.base};--${prefix}-deep:${p.deep};--${prefix}-mid:${p.mid};--${prefix}-glow:${p.glow};` +
      `--${prefix}-stripe:${p.stripe};--${prefix}-accent:${p.accent};--${prefix}-on:${p.onAccent};`;
  }

  function side(key, pl) {
    return `<div class="side side-${key}">
      <div class="bg"></div><div class="stripes"></div><div class="dots"></div>
      <div class="glow"></div><div class="streaks"></div>
      <div class="ghost">${esc(pl.name)}</div>
    </div>`;
  }

  function renderComparison(el, d) {
    const pa = JerseyColors.paletteFor(d.a.primary, d.a.secondary);
    const pb = JerseyColors.paletteFor(d.b.primary, d.b.secondary);
    const rows = d.stats.filter(s => s.label || s.a || s.b).slice(0, 7).map(s => {
      const w = winner(s);
      const cls = k => w ? (w === k ? 'win' : 'lose') : '';
      return `<div class="row">
        <div class="val val-a ${cls('a')}">${esc(s.a)}</div>
        <div class="label">${esc(s.label)}</div>
        <div class="val val-b ${cls('b')}">${esc(s.b)}</div>
      </div>`;
    }).join('');
    const nameCls = n => (String(n || '').length > 11 ? 'name long' : 'name');

    el.innerHTML = `<div class="cmp layout-${esc(d.layout || 1)} ${d.ghost ? '' : 'no-ghost'}" style="${vars('a', pa)}${vars('b', pb)}">
      ${side('a', d.a)}${side('b', d.b)}
      <svg class="seam" viewBox="0 0 1080 1350">
        <defs><filter id="seamGlow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="9"/></filter></defs>
        <line x1="615.6" y1="0" x2="464.4" y2="1350" stroke="#fff" stroke-width="18" opacity=".55" filter="url(#seamGlow)"/>
        <line x1="615.6" y1="0" x2="464.4" y2="1350" stroke="#fff" stroke-width="4"/>
      </svg>
      <img class="player player-a ${d.a.photo ? '' : 'empty'}" style="${playerTransform(d.a)}" src="${esc(d.a.photo)}" alt="">
      <img class="player player-b ${d.b.photo ? '' : 'empty'}" style="${playerTransform(d.b)}" src="${esc(d.b.photo)}" alt="">
      <div class="floor"></div>
      <div class="top-shade"></div>
      <header>
        <div class="brand">${d.logo ? `<img src="${esc(d.logo)}" alt="">` : `<div class="wordmark">eFCOB</div>`}</div>
        ${d.tag ? `<div class="tag">${esc(d.tag)}</div>` : ''}
        <div class="kicker">${esc(d.kicker)}</div>
        <h1 class="${String(d.title || '').length > 16 ? 'long' : ''}">${esc(d.title)}</h1>
      </header>
      ${rows ? `<div class="panel">${rows}</div>` : ''}
      <div class="plate plate-a"><div class="${nameCls(d.a.name)}">${esc(d.a.name)}</div><div class="team">${esc(d.a.team)}</div></div>
      <div class="vs"><span>VS</span></div>
      <div class="plate plate-b"><div class="${nameCls(d.b.name)}">${esc(d.b.name)}</div><div class="team">${esc(d.b.team)}</div></div>
      <footer><span><b>${esc(d.footerLeft)}</b></span><span>${esc(d.footerRight)}</span></footer>
    </div>`;
  }

  window.renderComparison = renderComparison;
  window.playerTransform = playerTransform;
})();
