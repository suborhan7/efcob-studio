/* Renders the MVP poster into a container.
   renderMvp(container, data)
   data = {
     tag, kicker, title, footerLeft, footerRight, logo (image url or ''),
     player: { name, team, photo, primary, secondary, dx, dy, zoom },   // jersey colours as hex
     match: { score, opponent },
     stats: [{ label, value }]   // first one is the big headline number, max 5
   } */
(function () {
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // position set in the maker: dx/dy in poster pixels, zoom 1 = default size (scaled from the top so the head stays put)
  function playerTransform(pl) {
    const dx = +pl.dx || 0, dy = +pl.dy || 0, z = +pl.zoom || 1;
    return `transform: translateX(-50%) translate(${dx}px, ${dy}px) scale(${z}); transform-origin: 50% 0;`;
  }

  function renderMvp(el, d) {
    const p = d.vivid ? JerseyColors.vividPalette(d.player.primary, d.player.secondary, d.neutralTheme) : JerseyColors.paletteFor(d.player.primary, d.player.secondary);
    // background: 'template' = fixed eFCOB look, 'jersey' = colours from the kit, 'image' = admin's own upload
    const mode = d.bgMode || 'jersey';
    const custom = mode === 'image' && d.bgImage;
    // template/upload, or a plain black/white kit -> dark base with a two-colour pair
    const premium = d.vivid && (mode !== 'jersey' || JerseyColors.isPlainNeutral(d.player.primary, d.player.secondary));
    // black base + two colours: c1 = main accent, c2 = second colour (like yellow + purple)
    const PREMIUM = {
      'gold-purple': ['#f5c542', '#7b3fe4'], 'cyan-magenta': ['#22d3ee', '#d946ef'], 'orange-blue': ['#ff7a1a', '#3b82f6'],
      'red-gold': ['#ff3b4e', '#f5c542'], 'green-cyan': ['#39e58c', '#22b8ee'],
    };
    // fixed templates: each has its own background design and colour pair, whatever the jersey
    const TEMPLATES = {
      shatter: ['#ff7a1a', '#3b82f6'], neon: ['#22d3ee', '#e040fb'],
    };
    const tpl = mode === 'template' ? (TEMPLATES[d.template] ? d.template : 'shatter') : '';
    const pair = tpl ? TEMPLATES[tpl] : (PREMIUM[d.premiumAccent] || PREMIUM['gold-purple']);
    if (premium) { p.accent = pair[0]; p.c2 = pair[1]; p.onAccent = '#0b0d12'; }
    const vars = `--k-base:${p.base};--k-deep:${p.deep};--k-mid:${p.mid};--k-glow:${p.glow};--k-stripe:${p.stripe};--k-accent:${p.accent};--k-on:${p.onAccent};`;
    const pc = d.vivid ? p : JerseyColors.popColors(p.accent);
    const pvars = `--k-pop:${pc.pop};--k-pop2:${pc.pop2};--k-ana:${pc.ana};--k-mvp:${pc.mvp || pc.pop};--k-mvp-sh:${pc.mvpShadow || pc.ana};${premium ? `--k-c2:${pair[1]};` : ''}`;
    const stats = d.stats.filter(s => s.label || s.value).slice(0, 5).map((s, i) =>
      `<div class="stat ${i === 0 ? 'hero' : ''}"><div class="v">${esc(s.value)}</div><div class="l">${esc(s.label)}</div></div>`).join('');
    const pl = d.player, m = d.match || {};

    const layout = d.layout || 'current';
    const matchLine = [pl.team, m.score ? `${m.score}${m.opponent ? ' vs ' + m.opponent : ''}` : ''].filter(Boolean).map(esc).join('<i>·</i>');
    const brand = `<div class="brand">${d.logo ? `<img src="${esc(d.logo)}" alt="">` : `<div class="wordmark">eFCOB</div>`}</div>`;
    const tag = d.tag ? `<div class="tag">${esc(d.tag)}</div>` : '';
    const bg = custom ? `<div class="bgimg" style="background-image:url('${esc(d.bgImage)}')"></div>` : `<div class="bg"></div><div class="stripes"></div><div class="dots"></div>
      <div class="glow"></div><div class="rings"></div><div class="streaks"></div>`;
    const img = `<img class="player ${pl.photo ? '' : 'empty'}" style="${playerTransform(pl)}" src="${esc(pl.photo)}" alt="">`;
    const footer = `<footer><span><b>${esc(d.footerLeft)}</b></span><span>${esc(d.footerRight)}</span></footer>`;
    const longName = String(pl.name || '').length > 13 ? 'long' : '';
    let body;

    if (layout === 'big') {
      // giant MVP letters behind the player, stats strip across the bottom
      body = `${bg}<div class="bigword">MVP</div>${img}<div class="floor"></div><div class="top-shade"></div>
        <header>${brand}${tag}<div class="kicker">${esc(d.kicker)}</div></header>
        ${stats ? `<div class="stats">${stats}</div>` : ''}
        <div class="plate"><div class="name ${longName}">${esc(pl.name)}</div><div class="sub">${matchLine}</div></div>`;
    } else if (layout === 'rating') {
      // left-aligned title, huge rating number, small stat grid, full-width name plate
      const [hero, ...rest] = d.stats.filter(s => s.label || s.value).slice(0, 5);
      body = `${bg}${img}<div class="floor"></div><div class="top-shade"></div>
        <header>${brand}${tag}<div class="kicker">${esc(d.kicker)}</div><h1>${esc(d.title)}</h1></header>
        ${hero ? `<div class="rating"><div class="v">${esc(hero.value)}</div><div class="l">${esc(hero.label)}</div></div>` : ''}
        ${rest.length ? `<div class="grid">${rest.map(s => `<div class="cell"><div class="v">${esc(s.value)}</div><div class="l">${esc(s.label)}</div></div>`).join('')}</div>` : ''}
        <div class="plate"><div class="name ${longName}">${esc(pl.name)}</div><div class="sub">${matchLine}</div></div>`;
    } else if (layout === 'split') {
      // player on the left, solid info panel on the right
      const rows = d.stats.filter(s => s.label || s.value).slice(0, 5).map((s, i) =>
        `<div class="trow ${i === 0 ? 'hero' : ''}"><span>${esc(s.label)}</span><b>${esc(s.value)}</b></div>`).join('');
      body = `${bg}${img}<div class="floor"></div>
        <header>${brand}</header>
        <aside class="info">
          ${tag}
          <div class="kicker">${esc(d.kicker)}</div>
          <div class="mvpword">MVP</div>
          <div class="name ${longName}">${esc(pl.name)}</div>
          <div class="team">${esc(pl.team)}</div>
          <div class="table">${rows}</div>
          ${m.score ? `<div class="result"><span>${esc(m.label || 'Full time')}</span><b>${esc(m.score)}</b><span>${m.opponent ? 'vs ' + esc(m.opponent) : ''}</span></div>` : ''}
        </aside>`;
    } else {
      body = `${bg}${img}<div class="floor"></div><div class="top-shade"></div>
        <header>${brand}${tag}<div class="kicker">${esc(d.kicker)}</div>
          <h1 class="${String(d.title || '').length > 16 ? 'long' : ''}">${esc(d.title)}</h1></header>
        ${stats ? `<div class="stats">${stats}</div>` : ''}
        <div class="plate"><div class="name ${longName}">${esc(pl.name)}</div><div class="team">${esc(pl.team)}</div></div>
        ${m.score || m.opponent ? `<div class="match"><div class="lbl">${esc(m.label || 'Full time')}</div><div class="score">${esc(m.score)}</div><div class="vs">${m.opponent ? 'vs ' + esc(m.opponent) : ''}</div></div>` : ''}`;
    }
    el.innerHTML = `<div class="mvp layout-${esc(layout)} ${d.vivid ? 'vivid' : ''} ${premium ? 'premium' : ''} ${custom ? 'custom-bg' : ''} ${tpl ? 'tpl-' + tpl : ''}" style="${vars}${pvars}">${body}${footer}</div>`;
  }

  window.renderMvp = renderMvp;
  window.playerTransform = playerTransform;
})();
