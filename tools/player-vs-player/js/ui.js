/* Small UI helpers shared by every maker (same file in every tools/<id>/js/). Changes only the form, never the poster.
   - file inputs show the chosen file name
   - long dropdown choices "Name (what it looks like)" show just the name; the rest goes in a hint line under the box
   - long section headings "Title (note)" put the note in smaller text
   - the editor toolbar's help text folds behind a "?" button */
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

  function helpToggle() {
    const bar = form.querySelector('.se-bar');
    if (!bar || bar.querySelector('.se-help')) return;
    const row = bar.querySelector('.se-row');
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'se-help'; b.textContent = '?'; b.title = 'Kivabe edit korbo';
    b.addEventListener('click', () => bar.classList.toggle('show-help'));
    if (row) row.appendChild(b);
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
    helpToggle();
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
