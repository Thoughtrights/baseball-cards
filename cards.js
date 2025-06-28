/* cards.js — v4  •  baseball close-button spins before modal closes */

let cards = [];

/* --- DOM refs --- */
const els = {
  grid:        document.getElementById('cardsGrid'),
  search:      document.getElementById('searchInput'),
  team:        document.getElementById('teamSelect'),
  year:        document.getElementById('yearSelect'),
  set:         document.getElementById('setSelect'),
  sort:        document.getElementById('sortSelect'),
  modalWrap:   document.getElementById('cardModal'),
  modalClose:  document.getElementById('closeModal'),
  modalBody:   document.getElementById('modalContent')
};

/* Detected field-names */
const F = { player:'', team:'', year:'', set:'', number:'', value:'', image:'' };

/* --------------------  Bootstrap  -------------------- */
(async function init () {
  const res = await fetch('baseballCards.json');
  cards     = await res.json();

  detectFieldNames(cards[0] || {});
  buildFilterOptions();
  bindEvents();
  applyFilters();
})();

/* --------------------  Detect actual column names  -------------------- */
function detectFieldNames (sample) {
  const keys = Object.keys(sample);
  const find = (...re) => keys.find(k => re.some(r => r instanceof RegExp ? r.test(k) : r(k))) || '';

  F.player = find(/player/i, /name/i);
  F.team   = find(/team/i);
  F.year   = find(/year/i);
  F.set    = find(k => /set/i.test(k) && !/asset/i.test(k), /series/i, /edition/i);
  F.number = find(/card.*(no|num)/i, /\bno\b/i, /number/i);
  F.value  = find(/value/i, /price/i, /worth/i);
  F.image  = find(/image/i, /photo/i, /url/i);

  Object.entries(F).forEach(([k,v]) => { if (!v) F[k] = k; });
}

/* --------------------  Build filter dropdowns  -------------------- */
function buildFilterOptions () {
  buildSelect(els.team, unique(cards.map(c => c[F.team])).sort());
  buildSelect(els.year, unique(cards.map(c => c[F.year])).sort((a,b) => b - a));
  buildSelect(els.set,  unique(cards.map(c => c[F.set])).sort());
}
const buildSelect = (el, vals) =>
  vals.filter(Boolean).forEach(v => {
    const o = document.createElement('option');
    o.value = o.textContent = v;
    el.appendChild(o);
  });
const unique = arr => [...new Set(arr.filter(Boolean))];

/* --------------------  Events  -------------------- */
function bindEvents () {
  els.search .addEventListener('input',  () => resetOthers('search'));
  els.team   .addEventListener('change', () => resetOthers('team'));
  els.year   .addEventListener('change', () => resetOthers('year'));
  els.set    .addEventListener('change', () => resetOthers('set'));
  els.sort   .addEventListener('change', applyFilters);

  /* When the baseball is clicked: spin → then close modal */
  els.modalClose.addEventListener('click', spinThenClose);
  els.modalWrap .addEventListener('click', e =>
    e.target === els.modalWrap && spinThenClose());
}

/* keep only ONE active criterion at a time */
function resetOthers (changed) {
  if (changed !== 'search') els.search.value       = '';
  if (changed !== 'team')   els.team.selectedIndex = 0;
  if (changed !== 'year')   els.year.selectedIndex = 0;
  if (changed !== 'set')    els.set.selectedIndex  = 0;
  applyFilters();
}

/* --------------------  Filtering + sorting  -------------------- */
function applyFilters () {
  let list = [...cards];

  const q = els.search.value.trim().toLowerCase();
  if (q) {
    list = list.filter(c =>
      String(c[F.player]).toLowerCase().includes(q) ||
      String(c[F.number]).toLowerCase().includes(q)
    );
  } else {
    if (els.team.value) list = list.filter(c => c[F.team] === els.team.value);
    if (els.year.value) list = list.filter(c => String(c[F.year]) === els.year.value);
    if (els.set.value)  list = list.filter(c => c[F.set]  === els.set.value);
  }

  switch (els.sort.value) {
    case 'player':     list.sort((a,b) => String(a[F.player]).localeCompare(b[F.player])); break;
    case 'year':       list.sort((a,b) => b[F.year] - a[F.year]);                         break;
    case 'value-desc': list.sort((a,b) => (b[F.value]||0) - (a[F.value]||0));            break;
    case 'value-asc':  list.sort((a,b) => (a[F.value]||0) - (b[F.value]||0));            break;
  }

  renderGrid(list);
}

/* --------------------  Render grid & modal  -------------------- */
function renderGrid (data) {
  els.grid.innerHTML = '';
  data.forEach(card => {
    const item = document.createElement('div');
    item.className =
      'bg-gray-800 rounded-lg p-2 hover:ring-2 hover:ring-mlbRed ' +
      'cursor-pointer transition';
    item.innerHTML = `
      <img src="${card[F.image] || ''}" alt="${card[F.player] || ''}"
           class="w-full object-cover rounded">
      <p class="mt-2 text-sm">
        ${card[F.player] ?? '—'}
        <span class="block text-xs text-gray-400">
          ${card[F.year] ?? ''} ${card[F.team] ?? ''}<br />${card[F.set] ?? ''}
        </span>
      </p>`;
    item.addEventListener('click', () => openModal(card));
    els.grid.appendChild(item);
  });
}

function openModal (card) {
  els.modalBody.innerHTML = `
    <img src="${card[F.image] || ''}" alt="${card[F.player] || ''}"
         class="w-full rounded mb-4">
    <h2 class="text-xl mb-3">${card[F.player] || 'Unknown Player'}</h2>
    <ul class="space-y-1 text-xs leading-tight">
    ${Object.entries(card).map(([k, v]) => {
        const label = k.replace(/_/g, ' ');
        const display = k === F.value        // F.value = detected “marketValue” key
            ? `$${Number(v).toFixed(2)}`     // add “$” + 2-decimals
            : v;
        return `<li><span class="font-semibold capitalize">${label}:</span> ${display}</li>`;
}).join('')}
    </ul>`;
  els.modalWrap.classList.replace('hidden', 'flex');
}

/* --------------------  Close button spin animation  -------------------- */
/* Spin the baseball once, then hide the modal */
function spinThenClose () {
  // 1) start spinning immediately
  els.modalClose.classList.add('animate-spin');

  // 2) after ~1 rev (0.6 s), stop the spin and close the modal
  setTimeout(() => {
    els.modalClose.classList.remove('animate-spin');
    els.modalWrap.classList.replace('flex', 'hidden');
  }, 600);
}
