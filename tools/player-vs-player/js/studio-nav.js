/* Inside the eFCOB Admin Studio: a "Choose card type" dropdown at the top of the left column; the chosen card's form sits under it.
   Opened on its own (not in the studio) nothing changes. */
(function () {
  if (window.parent === window) return;
  const form = document.getElementById('form');
  window.addEventListener('message', e => {
    const m = e.data || {};
    if (m.type !== 'studio-cards') return;
    form.querySelectorAll('.studio-nav').forEach(n => n.remove());
    const cur = m.cards.find(c => c.id === m.current) || m.cards[0];
    const nav = document.createElement('div');
    nav.className = 'studio-nav';
    nav.innerHTML = `<div class="studio-brand">eFCOB Admin Studio</div>
      <button type="button" class="card-pick" aria-expanded="false"><span>Choose card type</span><b></b><i>▾</i></button>
      <div class="card-list" hidden></div>`;
    nav.querySelector('.card-pick b').textContent = cur.name;
    const pick = nav.querySelector('.card-pick'), list = nav.querySelector('.card-list');
    for (const c of m.cards) {
      const o = document.createElement('button');
      o.type = 'button';
      o.className = 'card-opt' + (c.id === cur.id ? ' on' : '');
      o.textContent = c.name;
      o.addEventListener('click', () => {
        list.hidden = true; pick.setAttribute('aria-expanded', 'false');
        if (c.id !== cur.id) parent.postMessage({ type: 'studio-select', id: c.id }, '*');
      });
      list.appendChild(o);
    }
    pick.addEventListener('click', () => {
      list.hidden = !list.hidden;
      pick.setAttribute('aria-expanded', String(!list.hidden));
    });
    form.prepend(nav);
    document.body.classList.add('in-studio');
  });
  parent.postMessage({ type: 'studio-ready' }, '*');
})();
