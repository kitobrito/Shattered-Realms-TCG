// Pointer input for the battle screen: drag cards from the hand onto the
// board (choosing the slot), and aim targeting arrows for targeted cards,
// Hero Spells and attacks. Every option comes from the engine's legal
// actions, so the UI can never submit an illegal move.
//
// api: { root(): Element, legal(): action[], canAct(): bool, act(action, meta), onChange(), inspect(el) }
//
// Hand cards (touch and mouse alike):
//  - Tap / click: lifts the card and shows it big, for reading only. Tap it again (or anywhere else)
//    to put it back. A tap never plays a card and never says "not enough Mana".
//  - Hold: shows the card big until you let go. Nothing else.
//  - Hold and slide along the hand: the card under your finger is the one shown, so you can read
//    them one after another. Picking is judged on where the cards rest (not where the lifted one
//    floats) and only changes once the finger is clearly on the next card, so overlapping rows
//    (portrait) don't flicker between two cards.
//  - Drag a card up out of the hand onto the board: that plays it. Only then are you told why a
//    card can't be played (not enough Mana, not your turn...).
// Landscape: the hand rests small in the corner (board.js). Any tap or hold there just brings it
// up; no card is picked until the hand has risen. A clear pull up out of the corner still drags.
//
// While the last move is still animating you can already pick up and drag your
// next card: dropping it holds the play, and it goes through (if it is still
// legal) the moment the animation ends.

import { ghost } from './fx.js';
import { setHandOpen } from './board.js';

const DRAG_START = 6; // px of movement before a press becomes a drag (mouse)
// A fingertip wobbles more than a mouse: on touch it takes 12 px before a tap becomes a drag,
// so a slightly shaky tap on the resting hand still just brings it up.
// The resting hand's cards are small, so a press there needs a clear pull (14 px) to become a drag.
const dragStart = (p) => (p?.docked ? 14 : p?.touch ? 12 : DRAG_START);
const HOLD_MS = 320;  // press and hold a hand card this long (without moving) for its big preview

let api = null;
let press = null;   // pointer is down on something
let drag = null;    // a hand card is being dragged
let aim = null;     // a targeting arrow is active
let inspected = null; // touch: hand card uid shown in the preview, waiting for a second tap
let queued = null;    // a card dropped during an animation, waiting to be played
let pointerId = null; // the finger (or mouse) the current press/drag belongs to; other touches are ignored

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
  for (const el of document.querySelectorAll('.aim-over')) el.classList.remove('aim-over');
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
  // Aiming an attack or a Hero Spell from the board: the raised hand steps back to its corner,
  // out of the way of the targets (aiming a card dragged out of the hand leaves it alone).
  if (!fromEl.closest('.my-hand') && !drag) setHandOpen(false, api.root(), { force: true });
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

function endHold() {
  if (!press) return;
  clearTimeout(press.holdTimer);
  if (press.held) { press.held = false; press.el?.classList.remove('reading'); api.inspect?.(null); }
}

// The plays a hand card has right now: null while your last move still animates (it may be
// picked up early), none on the other player's turn.
function playsOf(uid) {
  if (!api.canAct()) return api.canPlan?.() && !queued ? null : [];
  return api.legal().filter((a) => a.type === 'play' && a.card === uid);
}

// Hold: the pressed card is read (big preview, card lifted) until you let go.
function startHold(p) {
  p.holdTimer = setTimeout(() => {
    if (press !== p || drag || aim || !p.el.isConnected) return;
    p.held = true;
    clearInspect();
    readCard(p, p.el);
  }, HOLD_MS);
}

// The lifted (clicked) hand card goes back down and its preview closes.
export function putBack() {
  if (inspected == null) return;
  clearInspect();
  api?.inspect?.(null);
}

export function cancel() {
  endHold();
  if (queued) { queued.ghost.remove(); queued = null; }
  if (aim) aimEndedAt = Date.now();
  clearInspect();
  if (drag?.ghost) drag.ghost.remove();
  if (aim?.ghost) aim.ghost.remove();
  api?.root().querySelector('.drag-src')?.classList.remove('drag-src');
  removeGap();
  drag = null;
  aim = null;
  press = null;
  pointerId = null;
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

// Where the card lands is judged where the card is (above the finger on touch).
const cardY = (e) => (drag?.touch ? e.clientY - drag.offY / 2 : e.clientY);
// A drop counts if the card is above the hand, or (touch) it was swiped up decisively.
const droppedOnField = (e) => aboveHand(cardY(e)) || (drag?.touch && drag.startY - e.clientY > 70);

const aboveHand = (y) => {
  const hand = api.root().querySelector('.my-hand');
  return y < hand.getBoundingClientRect().top + 30;
};

// ---- Pointer handlers ------------------------------------------------------------------

// Where each hand card rests (its lift for reading taken off), measured once when a press starts:
// the hand doesn't move while you slide along it, so picking stays steady.
function snapshotHand() {
  const els = [...api.root().querySelectorAll('.my-hand [data-hand]')];
  // Transitions off for the measurement, so a card still settling back is measured where it will rest.
  const had = els.map((el) => [el.classList.contains('inspect'), el.classList.contains('reading')]);
  for (const el of els) { el.style.transition = 'none'; el.classList.remove('inspect', 'reading'); }
  const cards = els.map((el, i) => ({ el, r: el.getBoundingClientRect(), z: (Number(el.style.zIndex) || 0) * 100 + i }));
  els.forEach((el, k) => {
    if (had[k][0]) el.classList.add('inspect');
    if (had[k][1]) el.classList.add('reading');
  });
  void els[0]?.offsetWidth;
  for (const el of els) el.style.transition = '';
  return cards;
}
// The resting card under the point (front row over back row, later cards over earlier ones).
// `edge` px of the card's border don't count, so a finger on the seam between two cards stays put.
function restingCardAt(cards, x, y, edge = 0) {
  let best = null;
  for (const c of cards) {
    const { r } = c;
    if (x < r.left + edge || x > r.right - edge || y < r.top + edge || y > r.bottom - edge) continue;
    if (!best || c.z > best.z) best = c;
  }
  return best;
}
// Sliding along the hand: which card the finger means now. The current card is kept until the finger
// is clearly (8 px) inside another one; off the cards entirely, the nearest one along the hand is used.
function pickAlongHand(p, x, y) {
  const cards = p.rests ?? (p.rests = snapshotHand());
  const sure = restingCardAt(cards, x, y, 8);
  if (sure) return sure.el;
  // On the seam between cards (within 8 px of an edge): keep the card already shown.
  if (restingCardAt(cards, x, y, 0)) return p.el;
  // Above or beside the cards (still inside the hand's band): the nearest card along the hand.
  let best = null, bestD = Infinity;
  for (const c of cards) {
    if (y < c.r.top - 60 || y > c.r.bottom + 30) continue;
    const d = Math.abs(x - (c.r.left + c.r.width / 2));
    if (d < bestD) { best = c.el; bestD = d; }
  }
  return best ?? p.el;
}

// The top of the highest resting card: above it, the finger has left the hand. (Not the hand's own
// box: in a two-row portrait hand the back row stands above it, and reading a back-row card must not
// count as pulling it out.)
const cardsTop = (p) => Math.min(...(p.rests ?? (p.rests = snapshotHand())).map((c) => c.r.top));

// Touch: a press in the hand that lands in a gap between cards picks the nearest card.
function handCardAt(e) {
  const direct = e.target.closest('[data-hand]');
  if (direct || e.pointerType !== 'touch') return direct;
  const hand = e.target.closest('.my-hand');
  if (!hand) return null;
  let best = null, bestD = Infinity;
  for (const el of hand.querySelectorAll('[data-hand]')) {
    const r = el.getBoundingClientRect();
    const d = Math.abs(e.clientX - (r.left + r.width / 2));
    if (d < bestD) { best = el; bestD = d; }
  }
  return best;
}

function onDown(e) {
  // A second finger (or a palm) while one is already pressing or dragging is ignored.
  if ((press || drag) && pointerId != null && e.pointerId !== pointerId) return;
  pointerId = e.pointerId;
  // Touching anything other than the inspected card puts it back.
  if (inspected != null && !e.target.closest(`[data-hand="${inspected}"]`)) clearInspect();
  // Hand cards, in any state: hold to read, drag out to play, tap to pick up (or, in the corner,
  // to bring the hand up). What a release means is settled in onUp.
  const tapped = e.button === 0 && !aim ? handCardAt(e) : null;
  if (tapped) {
    const uid = Number(tapped.dataset.hand);
    const docked = !!tapped.closest('.my-hand.docked');
    press = { kind: 'hand', el: tapped, uid, options: playsOf(uid), x: e.clientX, y: e.clientY, touch: e.pointerType === 'touch', docked,
      rests: docked ? null : snapshotHand() };
    // The resting hand only rises: no card is read or lifted until it is up.
    if (!docked) startHold(press);
    e.preventDefault();
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
  // Lycanthropes: the moon button on a minion Transforms it.
  const shiftEl = e.target.closest('[data-shift]');
  if (shiftEl) {
    const action = legal.find((a) => a.type === 'transform' && a.minion === Number(shiftEl.dataset.shift));
    e.preventDefault();
    if (action) api.act(action, { from: shiftEl });
    return;
  }
  const hsEl = e.target.closest('[data-hs]');
  const charEl = e.target.closest('[data-char]');
  if (hsEl) {
    const options = legal.filter((a) => a.type === 'heroSpell' && a.card === hsEl.dataset.hs);
    if (!options.length) return;
    press = { kind: 'heroSpell', el: hsEl, options, x: e.clientX, y: e.clientY, touch: e.pointerType === 'touch', t: Date.now() };
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

// Reading: show this hand card (lifted, big preview) instead of the one shown before.
function readCard(p, el) {
  if (p.el && p.el !== el) p.el.classList.remove('reading');
  p.el = el;
  p.uid = Number(el.dataset.hand);
  p.options = playsOf(p.uid);
  el.classList.add('reading');
  api.inspect?.(el);
}

// Pick up the pressed hand card and start dragging it (any card: whether it can be played is
// settled when it is dropped on the board).
function startDrag(p) {
  endHold();
  clearInspect();
  const rect = p.el.getBoundingClientRect();
  // Touch: the card rides above your thumb so you can see it (and where it will land).
  const lift = p.touch ? { offX: rect.width / 2, offY: rect.height + 14 } : { offX: p.x - rect.left, offY: p.y - rect.top };
  drag = { uid: p.uid, options: p.options, el: p.el, minion: p.el.classList.contains('t-minion'),
    ...lift, ghost: ghost(p.el, rect), rect, startY: p.y, touch: p.touch };
  drag.ghost.classList.add('dragging');
  p.el.classList.add('drag-src');
  api.onChange?.();
}

function onMove(e) {
  if (pointerId != null && e.pointerId !== pointerId) return;
  if (press && !drag && press.kind === 'hand') {
    const dx = e.clientX - press.x, dy = e.clientY - press.y, far = Math.hypot(dx, dy) > dragStart(press);
    if (press.docked) {
      // The resting hand: a clear pull up out of the corner (toward the board) picks a card up;
      // a tap or a hold just brings the hand up (onUp).
      if (far && -dy > 8) startDrag(press);
    } else if (press.held) {
      // Reading (held, or sliding along the hand): the card under the finger is the one shown;
      // leaving the hand upwards picks the shown card up.
      if (e.clientY < cardsTop(press) - 10 && far) startDrag(press);
      else { const over = pickAlongHand(press, e.clientX, e.clientY); if (over && over !== press.el) readCard(press, over); }
    } else if (far) {
      // Not held yet: pulling up (anything steeper than about 25 degrees) drags the card out, toward
      // the board; sliding sideways starts reading along the hand.
      if (-dy > Math.abs(dx) * 0.45) startDrag(press);
      else {
        clearTimeout(press.holdTimer);
        clearInspect();
        press.held = true;
        readCard(press, pickAlongHand(press, e.clientX, e.clientY));
      }
    }
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
    const lifted = aboveHand(cardY(e));
    g.classList.toggle('lifted', lifted);
    if (drag.minion && overBoard(e.clientX, cardY(e))) showGap(slotIndex(e.clientX)); else removeGap();
  }
  if (aim) {
    const over = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-char]');
    const set = targetSet();
    const locked = over && set.has(Number(over.dataset.char));
    drawArrow(aim.from, locked ? centerOf(over) : { x: e.clientX, y: e.clientY }, locked);
    // The character in the crosshairs braces itself.
    for (const el of api.root().querySelectorAll('.aim-over')) if (el !== over || !locked) el.classList.remove('aim-over');
    if (locked) over.classList.add('aim-over');
  }
}

function onUp(e) {
  if (pointerId != null && e.pointerId !== pointerId && (press || drag)) return;
  if (e.button === 2) { cancel(); return; }
  // Releasing / clicking while aiming (attack drags, or click-to-target).
  if (aim && (!press || press.kind === 'attack')) {
    const moved = press && Math.hypot(e.clientX - press.x, e.clientY - press.y) > dragStart(press);
    const over = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-char]');
    if (over && pickTarget(Number(over.dataset.char))) { press = null; return; }
    // A plain click on the source keeps the arrow up (click-to-target); otherwise cancel.
    if (press && !moved) { press = null; return; }
    cancel();
    return;
  }
  if (!press) return;
  // Held (or slid along the hand) for the big preview: letting go just closes it.
  if (press.kind === 'hand' && press.held && !drag) { endHold(); press = null; return; }
  clearTimeout(press.holdTimer);
  const { kind, options, el } = press;

  if (kind === 'heroSpell') {
    const heldToRead = press.touch && Date.now() - press.t >= 400; // a hold reads the spell (main.js), it doesn't cast it
    press = null;
    if (heldToRead) return;
    if (options.some((a) => a.target != null)) { startAim(el, options, { source: el }); return; }
    api.act(options[0], { from: el });
    return;
  }

  // Any tap or hold on the hand resting in the corner just brings it up (no card is picked).
  if (kind === 'hand' && press.docked && !drag) { press = null; setHandOpen(true, api.root()); return; }

  if (kind === 'hand' && options === null) {
    // Picked up during an animation.
    if (drag && droppedOnField(e)) {
      const position = drag.minion && overBoard(e.clientX, cardY(e)) ? slotIndex(e.clientX) : undefined;
      const g = drag.ghost;
      drag.ghost = null;
      g.classList.add('aiming-card');
      removeGap();
      queued = { uid: press.uid, minion: drag.minion, position, ghost: g, at: Date.now() };
      drag = null;
      press = null;
      waitForTurn();
      return;
    }
    if (drag) { cancel(); return; }
    press = null;
    toggleRead(el);
    return;
  }

  if (kind === 'hand') {
    const needsTarget = options.some((a) => a.target != null);
    if (drag) {
      const placeOnBoard = droppedOnField(e);
      const position = drag.minion && overBoard(e.clientX, cardY(e)) ? slotIndex(e.clientX) : undefined;
      if (!placeOnBoard) {
        // Dropped back on the hand: cancel.
        cancel();
        return;
      }
      if (!options.length) {
        // Dropped on the board but it can't be played: now (and only now) you're told why.
        const src = drag.el, uid = drag.uid;
        cancel();
        api.deny?.(src, api.notMyTurn?.() ? 'turn' : 'card', uid);
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
    // Click or tap: lift the card and show it (reading only); the same again puts it back.
    press = null;
    toggleRead(el);
  }
}

// A tap on a hand card: lift it and show it big, or put it back if it was the one shown.
// Reading only: it never plays the card or complains that it can't be played.
function toggleRead(el) {
  const uid = Number(el.dataset.hand);
  if (inspected === uid) { putBack(); return; }
  clearInspect();
  inspected = uid;
  el.classList.add('inspect');
  api.inspect?.(el);
}

// A card dropped during an animation: play it as soon as you can act again.
function waitForTurn() {
  const q = queued;
  if (!q) return;
  if (api.canAct()) {
    queued = null;
    const options = api.legal().filter((a) => a.type === 'play' && a.card === q.uid);
    const handEl = api.root().querySelector(`[data-hand="${q.uid}"]`);
    if (!options.length) {
      // No longer playable (not enough Mana, board full...): the card goes back.
      q.ghost.remove();
      if (handEl) api.deny?.(handEl, 'card', q.uid);
      return;
    }
    if (options.some((a) => a.target != null)) {
      startAim(q.ghost, options, { extra: q.minion ? { position: q.position } : {}, source: q.ghost });
      aim.ghost = q.ghost;
      handEl?.classList.add('drag-src');
      return;
    }
    api.act({ ...options[0], ...(q.position != null ? { position: q.position } : {}) }, { from: q.ghost, dropped: true });
    q.ghost.remove();
    return;
  }
  // Still animating (and still your turn): keep waiting, but not forever.
  if (!api.canPlan?.() || Date.now() - q.at > 8000) { queued = null; q.ghost.remove(); return; }
  requestAnimationFrame(waitForTurn);
}

export function init(handlers) {
  api = handlers;
  document.addEventListener('pointerdown', onDown);
  document.addEventListener('pointermove', onMove);
  document.addEventListener('pointerup', onUp);
  // The system took the touch away (an edge swipe, a notification...): drop the drag cleanly
  // instead of leaving it stuck to the next touch.
  document.addEventListener('pointercancel', () => { if (press || drag || aim) cancel(); });
  document.addEventListener('contextmenu', (e) => { if (aim || drag) { e.preventDefault(); cancel(); } });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && (aim || drag)) cancel(); });
}

