/* Small UI helpers shared by every maker (same file in every tools/<id>/js/). Changes only the form, never the poster.
   - file inputs show the chosen file name
   - long dropdown choices "Name (what it looks like)" show just the name; the rest goes in a hint line under the box
   - long section headings "Title (note)" put the note in smaller text
   - the editor toolbar becomes grouped icon buttons with a selection panel; its help text folds behind a "?" button */
(function () {
  const form = document.getElementById('form');
  if (!form) return;

  function fileName(inp) {
    let n = inp.nextElementSibling && inp.nextElementSibling.classList.contains('fname') ? inp.nextElementSibling : null;
    if (!n) { n = document.createElement('span'); n.className = 'fname'; inp.after(n); }
    const f = inp.files && inp.files[0];
    const txt = f ? '✓ ' + f.name : '';
    if (n.textContent !== txt) n.textContent = txt;
    inp.classList.toggle('has-file', !!f);
    if (f) inp.title = f.name;
  }

  function splitSelect(sel) {
    let any = false;
    for (const o of sel.options) {
      const full = o.dataset.full || o.textContent;
      const m = full.match(/^(.+?)\s*\((.+)\)\s*$/);
      if (m && full.length > 24) { any = true; o.dataset.full = full; o.dataset.hint = m[2]; if (o.textContent !== m[1]) o.textContent = m[1]; }
    }
    let h = sel.nextElementSibling && sel.nextElementSibling.classList.contains('hint') ? sel.nextElementSibling : null;
    if (!any) { if (h) h.remove(); return; }
    if (!h) { h = document.createElement('small'); h.className = 'hint'; sel.after(h); }
    const cur = sel.selectedOptions[0];
    const txt = cur && cur.dataset.hint ? cur.dataset.hint : '';
    if (h.textContent !== txt) h.textContent = txt;
    sel.title = cur ? (cur.dataset.full || cur.textContent) : '';
  }

  function splitHeading(h) {
    if (h.querySelector('.sub')) return;
    const m = h.textContent.match(/^(.+?)\s*(\(.+\))\s*$/);
    if (!m || h.textContent.length < 22) return;
    h.textContent = m[1];
    const s = document.createElement('span'); s.className = 'sub'; s.textContent = m[2];
    h.appendChild(s);
  }

  // editor toolbar (made by js/studio-edit.js): icon buttons in groups, a selection panel, help behind "?"
  const ICON = {
    undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
    redo: '<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>',
    smaller: '<path d="M5 12h14"/>', bigger: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    left: '<path d="m15 18-6-6 6-6"/>', right: '<path d="m9 18 6-6-6-6"/>', up: '<path d="m18 15-6-6-6 6"/>', down: '<path d="m6 9 6 6 6-6"/>',
    center: '<path d="M12 3v18"/><rect x="6" y="7" width="12" height="10" rx="2"/>',
    resetone: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
    hide: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="m19 6-1 14H6L5 6"/>',
    close: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 4.9.8c0 1.7-2.4 2.2-2.4 3.7"/><path d="M12 17h.01"/>',
    cursor: '<path d="m4 4 7 17 2.5-7.5L21 11z"/>'
  };
  const svg = k => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICON[k]}</svg>`;
  const LABEL = { undo: 'Undo', redo: 'Redo', center: 'Majhe', resetone: 'Reset', hide: 'Remove' };

  function toolbar() {
    const bar = form.querySelector('.se-bar');
    if (!bar || bar.classList.contains('pro')) return;
    bar.classList.add('pro');
    const rows = bar.querySelectorAll('.se-row'), name = bar.querySelector('.se-name');
    bar.querySelectorAll('[data-se]').forEach(b => {
      const k = b.dataset.se;
      if (!ICON[k]) return;
      b.classList.add('se-ic');
      b.innerHTML = svg(k) + (LABEL[k] ? `<span>${LABEL[k]}</span>` : '');
      if (!b.title) b.title = LABEL[k] || k;
    });
    // top row: [undo redo] .... [?]
    const top = rows[0];
    const hist = document.createElement('div'); hist.className = 'se-group';
    hist.append(bar.querySelector('[data-se="undo"]'), bar.querySelector('[data-se="redo"]'));
    const help = document.createElement('button');
    help.type = 'button'; help.className = 'se-help se-ic'; help.title = 'Kivabe edit korbo'; help.innerHTML = svg('help');
    help.addEventListener('click', () => bar.classList.toggle('show-help'));
    const tag = document.createElement('span'); tag.className = 'se-tag'; tag.textContent = 'Edit';
    top.replaceChildren(tag, hist, help);
    // selection panel: name + close, then size / move / actions
    const panel = document.createElement('div'); panel.className = 'se-panel';
    const head = document.createElement('div'); head.className = 'se-head';
    const dot = document.createElement('i'); dot.innerHTML = svg('cursor');
    const title = document.createElement('b'); title.className = 'se-title';
    const close = document.createElement('button');
    close.type = 'button'; close.className = 'se-close se-ic'; close.title = 'Chhere dao (Esc)'; close.innerHTML = svg('close');
    close.addEventListener('click', () => document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    head.append(dot, title, close);
    name.hidden = true;
    head.append(name);
    const [r2, r3] = [rows[1], rows[2]];
    const size = document.createElement('div'); size.className = 'se-group se-size';
    size.append(r2.querySelector('[data-se="smaller"]'), r2.querySelector('.se-pct'), r2.querySelector('[data-se="bigger"]'));
    const pad = document.createElement('div'); pad.className = 'se-group se-pad';
    ['left', 'up', 'down', 'right'].forEach(k => pad.append(r2.querySelector(`[data-se="${k}"]`)));
    const cap = (t, el) => { const w = document.createElement('div'); w.className = 'se-field'; w.innerHTML = `<small>${t}</small>`; w.append(el); return w; };
    r2.replaceChildren(cap('Size', size), cap('Move', pad));
    r3.classList.add('se-actions');
    panel.append(head, r2, r3);
    top.after(panel);
    syncName();
  }
  function syncName() {
    const bar = form.querySelector('.se-bar.pro'); if (!bar) return;
    const t = bar.querySelector('.se-name').textContent, on = /^Selected:/.test(t);
    const txt = on ? t.replace(/^Selected:\s*/, '') : 'Poster e jekono kichu click kore select koro';
    const el = bar.querySelector('.se-title');
    if (el.textContent !== txt) el.textContent = txt;
    bar.classList.toggle('has-sel', on);
  }

  function shortReset() {
    form.querySelectorAll('.reset-all').forEach(b => {
      if (b.dataset.short) return;
      b.dataset.short = '1'; b.title = b.textContent.trim();
      b.textContent = '↺ Reset to default';
    });
  }

  let busy = false;
  function enhance() {
    if (busy) return;
    busy = true;
    form.querySelectorAll('input[type=file]').forEach(fileName);
    form.querySelectorAll('select').forEach(splitSelect);
    form.querySelectorAll('h3').forEach(splitHeading);
    toolbar();
    syncName();
    shortReset();
    obs.takeRecords();
    busy = false;
  }

  const obs = new MutationObserver(() => enhance());
  obs.observe(form, { childList: true, subtree: true, characterData: true });
  form.addEventListener('change', e => {
    if (e.target.matches('input[type=file]')) fileName(e.target);
    if (e.target.matches('select')) splitSelect(e.target);
  });
  // clear buttons empty a file input in code (no change event), so look again after any click
  form.addEventListener('click', () => setTimeout(() => form.querySelectorAll('input[type=file]').forEach(fileName), 0));
  // selects changed in code (a layout switched by the maker) also need their hint refreshed
  form.addEventListener('input', e => { if (e.target.matches('select')) splitSelect(e.target); });
  setInterval(() => form.querySelectorAll('select').forEach(splitSelect), 800);
  enhance();
  window.addEventListener('load', enhance);
})();
