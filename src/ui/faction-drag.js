// The Play screen's faction slots: drag a faction from the grid (or from one slot to the other) and
// drop it on "Faction 1" or "Faction 2".
//
//  - Mouse: press and move a few pixels to pick it up.
//  - Touch: hold still for a moment to pick it up (a quick swipe still scrolls the grid).
//  - Let go over a slot to put it there. Let go anywhere else and nothing changes.
// A drag never counts as a tap, so it can't also toggle the faction it started on.
//
// initFactionDrag({ canDrag(): bool, drop(faction, slot) })

const MOUSE_START = 6;  // px of movement before a mouse press becomes a drag
const TOUCH_HOLD = 220; // ms a finger rests before it picks a faction up
const TOUCH_SLOP = 10;  // px a finger may wobble while holding

export function initFactionDrag({ canDrag, drop }) {
  let press = null; // { el, faction, from, x, y, id, type, timer }
  let drag = null;  // { faction, ghost, over }
  let swallowClick = false;

  const sourceAt = (target) => target.closest?.('.rx-ftile[data-faction], .rx-slot.filled[data-faction], .cine-seat.filled[data-faction]');
  const slotAt = (x, y) => document.elementFromPoint(x, y)?.closest?.('[data-pickslot]') ?? null;

  function start() {
    document.dispatchEvent(new Event('factiondragstart'));
    const { el, faction, x, y } = press;
    clearTimeout(press.timer);
    const face = el.querySelector('.rx-ftile-ico, .cine-seat-poster, .m2-medal') ?? el;
    const ghost = face.cloneNode(true);
    ghost.classList.add('rx-drag-ghost');
    const r = face.getBoundingClientRect();
    ghost.style.width = `${r.width}px`; ghost.style.height = `${r.height}px`;
    document.body.append(ghost);
    drag = { faction, from: press.from, ghost, over: null };
    el.classList.add('rx-dragging');
    document.body.classList.add('rx-drag-on');
    move(x, y);
    navigator.vibrate?.(12);
  }
  function move(x, y) {
    drag.ghost.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%) scale(1.15)`;
    const over = slotAt(x, y);
    if (over !== drag.over) { drag.over?.classList.remove('drop-hover'); over?.classList.add('drop-hover'); drag.over = over; }
  }
  function finish(x, y) {
    if (drag) {
      const slot = slotAt(x, y);
      drag.over?.classList.remove('drop-hover');
      drag.ghost.remove();
      press?.el.classList.remove('rx-dragging');
      document.body.classList.remove('rx-drag-on');
      swallowClick = true; setTimeout(() => { swallowClick = false; }, 0);
      const { faction, from } = drag;
      drag = null;
      if (slot) drop(faction, Number(slot.dataset.pickslot), from);
    }
    if (press) clearTimeout(press.timer);
    press = null;
  }

  document.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || drag || !canDrag()) return;
    const el = sourceAt(e.target);
    if (!el || e.target.closest('[data-slotclear]')) return;
    press = { el, faction: el.dataset.faction, from: el.dataset.pickslot != null ? Number(el.dataset.pickslot) : null, x: e.clientX, y: e.clientY, id: e.pointerId, type: e.pointerType };
    if (e.pointerType !== 'mouse') press.timer = setTimeout(() => { if (press) start(); }, TOUCH_HOLD);
  });
  document.addEventListener('pointermove', (e) => {
    if (!press || e.pointerId !== press.id) return;
    if (drag) { move(e.clientX, e.clientY); return; }
    const dist = Math.hypot(e.clientX - press.x, e.clientY - press.y);
    if (press.type === 'mouse') { if (dist >= MOUSE_START) { press.x = e.clientX; press.y = e.clientY; start(); } }
    else if (dist > TOUCH_SLOP) { clearTimeout(press.timer); press = null; } // a swipe: let the grid scroll
  });
  document.addEventListener('pointerup', (e) => { if (press && e.pointerId === press.id) finish(e.clientX, e.clientY); });
  document.addEventListener('pointercancel', (e) => { if (press && e.pointerId === press.id) finish(-1, -1); });
  // Once a finger has picked a faction up, it drags it instead of scrolling the page.
  document.addEventListener('touchmove', (e) => { if (drag) e.preventDefault(); }, { passive: false });
  // A long press on a faction must not open the phone's image menu.
  document.addEventListener('contextmenu', (e) => { if (press || drag) e.preventDefault(); });
  document.addEventListener('click', (e) => { if (swallowClick) { e.preventDefault(); e.stopPropagation(); swallowClick = false; } }, true);
}
