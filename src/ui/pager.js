// Card pages (collection, deck builder): instead of one long scrolling grid, a .pager shows
// exactly one screenful of cards, sized to fit the space it has, with arrows to turn the page
// (like Hearthstone's collection book).
//
// Markup: <div class="pager" data-pager="key"><button class="pg-arrow" data-page="-1">‹</button>
//           <div class="pager-grid">cards…</div><button class="pg-arrow" data-page="1">›</button>
//           <span class="pg-count"></span></div>
// The page each key is on is remembered, so re-rendering keeps your place.

const pages = new Map();
export const pageOf = (key) => pages.get(key) ?? 0;
export const setPage = (key, n) => pages.set(key, n);

// The card's own size at zoom 1, measured once per kind of grid.
function natural(card) {
  const z = card.style.zoom;
  card.style.zoom = '1';
  const r = { w: card.offsetWidth, h: card.offsetHeight };
  card.style.zoom = z;
  return r;
}

export function layoutPagers(root) {
  for (const pg of root.querySelectorAll('.pager')) layoutPager(pg);
}

export function layoutPager(pg) {
  const grid = pg.querySelector('.pager-grid');
  if (!grid) return;
  const cards = [...grid.children];
  for (const c of cards) c.style.display = '';
  const W = grid.clientWidth, H = grid.clientHeight;
  if (!cards.length || !W || !H) { pg.classList.add('pg-single'); return; }
  const base = natural(cards[0]);
  const gap = Math.max(6, Math.min(18, H * 0.025));
  // Cards big enough to read: one row on short screens (phones held sideways), two on most
  // screens, three only on very tall ones; then as many across as fit.
  const rows = H < 480 ? 1 : H >= 1250 ? 3 : 2;
  let k = Math.min((H - gap * (rows - 1)) / rows / base.h * 0.96, 1.7);
  // Four across where they stay readable (not much under three-quarters size).
  const k4 = (W - gap * 3) / 4 / base.w;
  if (k4 < k && k4 >= 0.75) k = k4;
  const cols = Math.max(1, Math.floor((W + gap) / (base.w * k + gap)));
  // Never wider than the space.
  if (cols === 1 && base.w * k > W) k = W / base.w;
  const per = rows * cols;
  const total = Math.max(1, Math.ceil(cards.length / per));
  const key = pg.dataset.pager;
  const page = Math.min(Math.max(0, pageOf(key)), total - 1);
  setPage(key, page);
  cards.forEach((c, i) => {
    c.style.zoom = String(Math.round(k * 1000) / 1000);
    c.style.display = i >= page * per && i < (page + 1) * per ? '' : 'none';
  });
  grid.style.gap = `${gap}px`;
  grid.style.gridTemplateColumns = `repeat(${cols}, ${Math.floor(base.w * k)}px)`;
  grid.style.gridAutoRows = `${Math.floor(base.h * k)}px`;
  pg.dataset.total = String(total);
  pg.classList.toggle('pg-single', total === 1);
  const count = pg.querySelector('.pg-count');
  // The collection's footer: small arrows around "Page 1 of 5", then a dot per page.
  if (count && pg.classList.contains('pg-rich')) {
    count.innerHTML = total > 1 ? `<button class="pg-mini" data-page="-1" aria-label="Previous page">‹</button><span>Page ${page + 1} of ${total}</span><button class="pg-mini" data-page="1" aria-label="Next page">›</button>`
      + `<span class="pg-dots">${Array.from({ length: total }, (_, i) => `<button class="pg-dot ${i === page ? 'on' : ''}" data-goto="${i}" aria-label="Page ${i + 1}"></button>`).join('')}</span>` : '';
  } else if (count) count.textContent = total > 1 ? `Page ${page + 1} / ${total}` : '';
  const chain = pg.dataset.chain === '1';
  for (const a of pg.querySelectorAll('[data-page]')) {
    const d = Number(a.dataset.page);
    a.disabled = !chain && (d < 0 ? page === 0 : page >= total - 1);
  }
}

// Turn a page. Returns 'prev' / 'next' when the pager is chained and runs off its end
// (the collection then opens the previous / next faction), else null.
export function turnPage(pg, dir) {
  const key = pg.dataset.pager;
  const total = Number(pg.dataset.total ?? 1);
  const next = pageOf(key) + dir;
  if (next < 0 || next >= total) return pg.dataset.chain === '1' ? (dir < 0 ? 'prev' : 'next') : null;
  setPage(key, next);
  layoutPager(pg);
  return null;
}

// The page holding a given card (so a card you just zoomed through stays in view).
export function showCard(pg, index) {
  const grid = pg.querySelector('.pager-grid');
  const visible = [...grid.children].filter((c) => c.style.display !== 'none').length || 1;
  setPage(pg.dataset.pager, Math.floor(index / visible));
  layoutPager(pg);
}
