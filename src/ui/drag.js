// Pointer input for the battle screen: drag cards from the hand onto the
// board (choosing the slot), and aim targeting arrows for targeted cards,
// Hero Spells and attacks. Every option comes from the engine's legal
// actions, so the UI can never submit an illegal move.
//
// api: { root(): Element, legal(): action[], canAct(): bool, act(action, meta), onChange(), inspect(el) }
//
// Touch: there is no hover, so the first tap on a hand card inspects it (big
// preview, card lifted); a second tap plays it, and dragging plays it as usual.

import { ghost } from './fx.js';

const DRAG_START = 6; // px of movement before a press becomes a drag

let api = null;
let press = null;   // pointer is down on something
let drag = null;    // a hand card is being dragged
let aim = null;     // a targeting arrow is active
let inspectedAt = 0;  // when the card was picked up (a fast second click is a double-click, not a play)
let inspected = null; // touch: hand card uid shown in the preview, waiting for a second tap

// ---- Arrow overlay --------------------------------------------------------------

function arrowLayer() {
  let svg = document.getElementById('arrow-layer');
  if (!svg) {
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.id = 'arrow-layer';
    svg.innerHTML = `
      <defs>
        <linearGradient id="arrow-grad" x1="0" x2="1"><stop offset="0" stop-color="#ffd27a" stop-opacity=".25"/><stop offset="1" stop-color="#ff5a3c"/></linearGradient>
        <marker id="arrow-head" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="#ff5a3c"/></marker>
      </defs>
      <path class="arrow-path" d="" marker-end="url(#arrow-head)"/>
      <circle class="arrow-reticle" r="0"/>`;
    document.body.appendChild(svg);
  }
  return svg;
}

function drawArrow(from, to, locked) {
  const svg = arrowLayer();
  svg.classList.add('show');
  svg.classList.toggle('locked', !!locked);
  const midX = (from.x + to.x) / 2;
  const lift = Math.min(160, Math.hypot(to.x - from.x, to.y - from.y) * 0.35);
  const midY = Math.min(from.y, to.y) - lift;
  svg.querySelector('.arrow-path').setAttribute('d', `M${from.x},${from.y} Q${midX},${midY} ${to.x},${to.y}`);
  const ret = svg.querySelector('.arrow-reticle');
  ret.setAttribute('cx', to.x);
  ret.setAttribute('cy', to.y);
  ret.setAttribute('r', locked ? 30 : 0);
}

function hideArrow() {
  document.getElementById('arrow-layer')?.classList.remove('show');
}

const centerOf = (el) => {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
};

// ---- Target highlighting -----------------------------------------------------------

function targetSet() {
  if (!aim) return new Set();
  return new Set(aim.options.map((a) => (aim.first == null ? aim.key(a) : a.target2)));
}

function paintTargets() {
  const root = api.root();
  const set = targetSet();
  for (const el of root.querySelectorAll('[data-char]')) {
    el.classList.toggle('targetable', set.has(Number(el.dataset.char)));
  }
  root.querySelector('.arena')?.classList.toggle('aiming', !!aim);
}

// Re-apply transient classes after the board re-renders.
export function refresh() {
  paintTargets();
  if (inspected != null) {
    const el = api.root().querySelector(`[data-hand="${inspected}"]`);
    // The card you were reading left your hand (discarded, stolen...): close its preview.
    if (el) el.classList.add('inspect'); else { inspected = null; api.inspect?.(null); }
  }
  if (drag) api.root().querySelector(`[data-hand="${drag.uid}"]`)?.classList.add('drag-src');
}

export function busy() {
  return !!(press || drag || aim);
}

// Targeting just ended (a click that picked a target): the same click must not
// also count as a plain click on that character (e.g. opening the emote wheel).
let aimEndedAt = 0;
export const recentlyAimed = () => Date.now() - aimEndedAt < 500;

// ---- Targeting -----------------------------------------------------------------------

// options: legal actions that all need a target; key(a) gives the target uid.
// extra: fields to add to the chosen action (e.g. { position }).
function startAim(fromEl, options, { key = (a) => a.target, extra = {}, source = null } = {}) {
  aim = { from: centerOf(fromEl), options, key, extra, first: null, source, pointer: null };
  paintTargets();
}

function pickTarget(uid) {
  if (!aim) return false;
  if (aim.first == null) {
    const hits = aim.options.filter((a) => aim.key(a) === uid);
    if (!hits.length) return false;
    if (hits.some((a) => a.target2 != null)) {
      // Two-target card: lock the first choice and aim again from it.
      aim = { ...aim, first: uid, options: hits, from: centerOf(api.root().querySelector(`[data-char="${uid}"]`)) };
      paintTargets();
      return true;
    }
    finish(hits[0]);
    return true;
  }
  const hit = aim.options.find((a) => a.target2 === uid);
  if (!hit) return false;
  finish(hit);
  return true;
}

function finish(action) {
  aimEndedAt = Date.now();
  const { extra, source } = aim;
  cancel();
  api.act({ ...action, ...extra }, { from: source });
}

function clearInspect() {
  if (inspected == null) return;
  api?.root().querySelector(`[data-hand="${inspected}"]`)?.classList.remove('inspect');
  inspected = null;
}

export function cancel() {
  if (aim) aimEndedAt = Date.now();
  clearInspect();
  if (drag?.ghost) drag.ghost.remove();
  if (aim?.ghost) aim.ghost.remove();
  api?.root().querySelector('.drag-src')?.classList.remove('drag-src');
  removeGap();
  drag = null;
  aim = null;
  press = null;
  hideArrow();
  if (api) paintTargets();
}

// ---- Board slot (where a dragged minion will land) ----------------------------------

function myBoard() {
  return api.root().querySelector('.board.me');
}

function slotIndex(x) {
  const minions = [...myBoard().querySelectorAll('.minion')];
  let i = 0;
  for (const m of minions) {
    const c = centerOf(m);
    if (x > c.x) i++;
  }
  return i;
}

function showGap(index) {
  const board = myBoard();
  let gap = board.querySelector('.slot-gap');
  const minions = [...board.querySelectorAll('.minion')];
  if (!gap) { gap = document.createElement('div'); gap.className = 'slot-gap'; }
  const before = minions[index] ?? null;
  if (gap.nextSibling !== before || gap.parentNode !== board) board.insertBefore(gap, before);
}

function removeGap() {
  api?.root().querySelector('.slot-gap')?.remove();
}

const overBoard = (x, y) => {
  const r = myBoard()?.getBoundingClientRect();
  return r && y >= r.top - 40 && y <= r.bottom + 30 && x >= r.left - 40 && x <= r.right + 40;
};

const aboveHand = (y) => {
  const hand = api.root().querySelector('.my-hand');
  return y < hand.getBoundingClientRect().top + 30;
};

// ---- Pointer handlers ------------------------------------------------------------------

function onDown(e) {
  // Touching anything other than the inspected card puts it back.
  if (inspected != null && !e.target.closest(`[data-hand="${inspected}"]`)) clearInspect();
  // Hand cards can be tapped or clicked to read them even when you can't play (enemy turn).
  const tapped = e.button === 0 ? e.target.closest('[data-hand]') : null;
  if (tapped && !api.canAct()) {
    const uid = Number(tapped.dataset.hand);
    if (inspected === uid) { clearInspect(); return; }
    clearInspect();
    inspected = uid;
    tapped.classList.add('inspect');
    api.inspect?.(tapped);
    return;
  }
  // Mouse: trying to use a card or minion when you can't says why (not on touch, which inspects).
  if (e.button === 0 && e.pointerType !== 'touch' && !aim && !api.canAct() && api.notMyTurn?.()) {
    const mine = e.target.closest('[data-hand], .board.me [data-char]');
    if (mine) { api.deny?.(mine, 'turn'); return; }
  }
  if (e.button !== 0 || !api.canAct()) return;
  if (aim) return; // clicks during aiming are handled on pointerup
  const legal = api.legal();
  const handEl = e.target.closest('[data-hand]');
  const hsEl = e.target.closest('[data-hs]');
  const charEl = e.target.closest('[data-char]');
  if (handEl) {
    const uid = Number(handEl.dataset.hand);
    const options = legal.filter((a) => a.type === 'play' && a.card === uid);
    // Touch (and portrait): unplayable cards can still be tapped to read them.
    if (!options.length && e.pointerType !== 'touch' && !api.root().querySelector('.arena.portrait')) { api.deny?.(handEl, 'card', uid); return; }
    press = { kind: 'hand', el: handEl, uid, options, x: e.clientX, y: e.clientY, touch: e.pointerType === 'touch' };
  } else if (hsEl) {
    const options = legal.filter((a) => a.type === 'heroSpell' && a.card === hsEl.dataset.hs);
    if (!options.length) return;
    press = { kind: 'heroSpell', el: hsEl, options, x: e.clientX, y: e.clientY };
  } else if (charEl) {
    const uid = Number(charEl.dataset.char);
    const options = legal.filter((a) => a.type === 'attack' && a.attacker === uid);
    if (!options.length) {
      if (charEl.classList.contains('minion') && charEl.closest('.board.me')) api.deny?.(charEl, 'attack', uid);
      return;
    }
    press = { kind: 'attack', el: charEl, options, x: e.clientX, y: e.clientY };
    startAim(charEl, options, { key: (a) => a.defender, source: charEl });
  } else {
    return;
  }
  e.preventDefault();
}

function onMove(e) {
  if (press && !drag && press.kind === 'hand' && press.options.length && Math.hypot(e.clientX - press.x, e.clientY - press.y) > DRAG_START) {
    clearInspect();
    // Start dragging a hand card.
    const rect = press.el.getBoundingClientRect();
    drag = { uid: press.uid, options: press.options, el: press.el, minion: press.el.classList.contains('t-minion'),
      offX: press.x - rect.left, offY: press.y - rect.top, ghost: ghost(press.el, rect), rect };
    drag.ghost.classList.add('dragging');
    press.el.classList.add('drag-src');
    api.onChange?.();
  }
  if (drag && !aim) {
    const g = drag.ghost;
    g.style.left = `${e.clientX - drag.offX}px`;
    g.style.top = `${e.clientY - drag.offY}px`;
    // The held card leans into the direction it moves, and settles when still.
    const vx = e.clientX - (drag.lastX ?? e.clientX);
    drag.lastX = e.clientX;
    drag.tilt = Math.max(-16, Math.min(16, (drag.tilt ?? 0) * 0.7 + vx * 0.9));
    g.style.setProperty('--tilt', `${drag.tilt.toFixed(1)}deg`);
    clearTimeout(drag.settle);
    drag.settle = setTimeout(() => g.style.setProperty('--tilt', '0deg'), 90);
    const lifted = aboveHand(e.clientY);
    g.classList.toggle('lifted', lifted);
    if (drag.minion && overBoard(e.clientX, e.clientY)) showGap(slotIndex(e.clientX)); else removeGap();
  }
  if (aim) {
    const over = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-char]');
    const set = targetSet();
    const locked = over && set.has(Number(over.dataset.char));
    drawArrow(aim.from, locked ? centerOf(over) : { x: e.clientX, y: e.clientY }, locked);
  }
}

function onUp(e) {
  if (e.button === 2) { cancel(); return; }
  // Releasing / clicking while aiming (attack drags, or click-to-target).
  if (aim && (!press || press.kind === 'attack')) {
    const moved = press && Math.hypot(e.clientX - press.x, e.clientY - press.y) > DRAG_START;
    const over = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-char]');
    if (over && pickTarget(Number(over.dataset.char))) { press = null; return; }
    // A plain click on the source keeps the arrow up (click-to-target); otherwise cancel.
    if (press && !moved) { press = null; return; }
    cancel();
    return;
  }
  if (!press) return;
  const { kind, options, el } = press;

  if (kind === 'heroSpell') {
    press = null;
    if (options.some((a) => a.target != null)) { startAim(el, options, { source: el }); return; }
    api.act(options[0], { from: el });
    return;
  }

  if (kind === 'hand') {
    const needsTarget = options.some((a) => a.target != null);
    if (drag) {
      const placeOnBoard = aboveHand(e.clientY);
      const position = drag.minion && overBoard(e.clientX, e.clientY) ? slotIndex(e.clientX) : undefined;
      if (!placeOnBoard) {
        // Dropped back on the hand: cancel.
        cancel();
        return;
      }
      const g = drag.ghost;
      drag.ghost = null;
      removeGap();
      if (needsTarget) {
        // Leave the card hovering where it was dropped while you aim.
        g.classList.add('aiming-card');
        startAim(g, options, { extra: drag.minion ? { position } : {}, source: g });
        aim.ghost = g;
        drag = null;
        press = null;
        return;
      }
      drag = null;
      press = null;
      api.act({ ...options[0], ...(position != null ? { position } : {}) }, { from: g, dropped: true });
      g.remove();
      return;
    }
    // Click or tap: the first one picks the card up and shows it; a second, separate one plays it.
    // (A quick double-click only selects, so reading a card never casts it by accident.)
    if (inspected !== press.uid || Date.now() - inspectedAt < 400) {
      if (inspected !== press.uid) {
        clearInspect();
        inspected = press.uid;
        inspectedAt = Date.now();
        el.classList.add('inspect');
        api.inspect?.(el);
      }
      press = null;
      return;
    }
    clearInspect();
    press = null;
    // Portrait: a second tap only puts the card back; dragging is the way to play it.
    if (api.root().querySelector('.arena.portrait')) { api.inspect?.(null); return; }
    if (!options.length) return;
    // Plain click on a hand card.
    if (needsTarget) { startAim(el, options, { source: el }); return; }
    api.act(options[0], { from: el });
  }
}

export function init(handlers) {
  api = handlers;
  document.addEventListener('pointerdown', onDown);
  document.addEventListener('pointermove', onMove);
  document.addEventListener('pointerup', onUp);
  document.addEventListener('contextmenu', (e) => { if (aim || drag) { e.preventDefault(); cancel(); } });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && (aim || drag)) cancel(); });
}

