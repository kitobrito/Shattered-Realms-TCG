// Animation toolkit (Web Animations API). Effects are drawn in a fixed layer
// outside the board, so re-rendering the board never cuts an animation short.

// Speed: the player's Game Speed setting, and shorter effects for reduced motion.
let speedSetting = 1;
let reducedSetting = false;
export function setSpeed(factor, reducedMotion = false) { speedSetting = factor; reducedSetting = reducedMotion; }
export const speedFactor = () => speedSetting;
const reduced = () => reducedSetting || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const speed = () => (reduced() ? 0.35 : 1) * speedSetting;

export function layer() {
  let el = document.getElementById('fx-layer');
  if (!el) {
    el = document.createElement('div');
    el.id = 'fx-layer';
    document.body.appendChild(el);
  }
  return el;
}

export const wait = (ms) => new Promise((r) => setTimeout(r, ms * speed()));

export function animate(el, frames, opts) {
  if (!el?.animate) return Promise.resolve();
  const a = el.animate(frames, { fill: 'both', ...opts, duration: (opts?.duration ?? 300) * speed() });
  // A hidden tab never draws, so its animations would never end: skip straight to the end
  // (online, the other player is waiting on this one).
  if (document.hidden) a.finish();
  return a.finished.catch(() => {}).then(() => a);
}

const center = (r) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });

// Positions of everything that can move, keyed: c<uid> characters, h<uid> hand cards.
export function snapshotRects(root) {
  const out = new Map();
  for (const el of root.querySelectorAll('[data-char]')) out.set(`c${el.dataset.char}`, el.getBoundingClientRect());
  for (const el of root.querySelectorAll('[data-hand]')) out.set(`h${el.dataset.hand}`, el.getBoundingClientRect());
  return out;
}

// Clone an element into the fx layer at a given rect (for ghosts and flights).
export function ghost(el, rect = el.getBoundingClientRect()) {
  const g = el.cloneNode(true);
  g.classList.add('fx-ghost');
  g.removeAttribute('data-char');
  g.removeAttribute('data-hand');
  Object.assign(g.style, {
    position: 'fixed', left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px`,
    margin: '0', transform: 'none', zIndex: '1000', pointerEvents: 'none',
  });
  layer().appendChild(g);
  return g;
}

// FLIP: elements that moved since `before` glide from their old spot.
export function flip(root, before, keys = null) {
  const jobs = [];
  for (const el of root.querySelectorAll('[data-char]')) {
    const key = `c${el.dataset.char}`;
    if (keys && !keys.has(key)) continue;
    const old = before.get(key);
    if (!old) continue;
    const now = el.getBoundingClientRect();
    const dx = old.left - now.left;
    const dy = old.top - now.top;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;
    jobs.push(animate(el, [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 260, easing: 'cubic-bezier(.2,.8,.2,1)' }));
  }
  return Promise.all(jobs);
}

// A card flies from one rect to another (draws, plays).
export async function fly(el, from, to, { duration = 320, fade = false, scale = 1 } = {}) {
  const g = ghost(el, from);
  const dx = to.left - from.left + (to.width - from.width) / 2;
  const dy = to.top - from.top + (to.height - from.height) / 2;
  await animate(g, [
    { transform: 'translate(0,0) scale(1)', opacity: 1 },
    { transform: `translate(${dx}px, ${dy}px) scale(${scale})`, opacity: fade ? 0 : 1 },
  ], { duration, easing: 'cubic-bezier(.3,.7,.2,1)' });
  g.remove();
}

// Attacker lunges most of the way to its target; returns the offset reached.
export async function lunge(attackerEl, targetEl) {
  if (!attackerEl || !targetEl) return null;
  const a = center(attackerEl.getBoundingClientRect());
  const t = center(targetEl.getBoundingClientRect());
  const dx = (t.x - a.x) * 0.78;
  const dy = (t.y - a.y) * 0.78;
  attackerEl.style.zIndex = '60';
  // Wind-up: rear back and swell…
  await animate(attackerEl, [
    { transform: 'translate(0,0) scale(1) rotate(0deg)' },
    { transform: `translate(${-dx * 0.14}px, ${-dy * 0.14}px) scale(1.14) rotate(${dx > 0 ? -4 : 4}deg)` },
  ], { duration: 190, easing: 'cubic-bezier(.2,.8,.3,1)' });
  // …then strike…
  await animate(attackerEl, [
    { transform: `translate(${-dx * 0.14}px, ${-dy * 0.14}px) scale(1.14) rotate(${dx > 0 ? -4 : 4}deg)` },
    { transform: `translate(${dx}px, ${dy}px) scale(1.05) rotate(0deg)` },
  ], { duration: 150, easing: 'cubic-bezier(.6,0,1,.6)' });
  // …and hang on the impact for a beat (hit-stop).
  await wait(75);
  return { dx, dy };
}

export function returnFromLunge(el, offset) {
  if (!el || !offset) return Promise.resolve();
  return animate(el, [{ transform: `translate(${offset.dx}px, ${offset.dy}px)` }, { transform: 'none' }], { duration: 240, easing: 'cubic-bezier(.2,.8,.2,1)' });
}

export function shake(el, strength = 6) {
  strength = Math.min(strength, 18);
  return animate(el, [
    { transform: 'translate(0,0)' }, { transform: `translate(${-strength}px, 1px)` }, { transform: `translate(${strength}px, -1px)` },
    { transform: `translate(${-strength / 2}px, 0)` }, { transform: 'translate(0,0)' },
  ], { duration: 280 });
}

// "-3" / "+2" number bursting from a character (damage sits on a red splat, like Hearthstone).
export function floater(rect, text, kind = 'damage') {
  const el = document.createElement('div');
  el.className = `fx-float ${kind}`;
  el.innerHTML = `<span>${text}</span>`;
  const c = center(rect);
  Object.assign(el.style, { left: `${c.x}px`, top: `${c.y}px` });
  layer().appendChild(el);
  animate(el, [
    { transform: 'translate(-50%, -50%) scale(0.4)', opacity: 0 },
    { transform: 'translate(-50%, -70%) scale(1.25)', opacity: 1, offset: 0.2 },
    { transform: 'translate(-50%, -160%) scale(1)', opacity: 0 },
  ], { duration: 1100, easing: 'ease-out' }).then(() => el.remove());
}

// A ring of light (summons, heals, shields breaking).
export function burst(rect, kind = 'summon') {
  const el = document.createElement('div');
  el.className = `fx-burst ${kind}`;
  const c = center(rect);
  const size = Math.max(rect.width, rect.height) * 1.4;
  Object.assign(el.style, { left: `${c.x - size / 2}px`, top: `${c.y - size / 2}px`, width: `${size}px`, height: `${size}px` });
  layer().appendChild(el);
  animate(el, [{ transform: 'scale(0.3)', opacity: 0.9 }, { transform: 'scale(1.3)', opacity: 0 }], { duration: 500, easing: 'ease-out' }).then(() => el.remove());
}

// A minion that died: its last picture cracks, sinks and fades.
export async function deathGhost(clone, rect) {
  const g = clone;
  g.classList.add('fx-ghost', 'dying');
  Object.assign(g.style, {
    position: 'fixed', left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px`,
    margin: '0', zIndex: '900', pointerEvents: 'none',
  });
  layer().appendChild(g);
  await animate(g, [
    { transform: 'scale(1) rotate(0)', filter: 'brightness(1)', opacity: 1 },
    { transform: 'scale(1.06) rotate(-2deg)', filter: 'brightness(1.8) saturate(0)', opacity: 1, offset: 0.25 },
    { transform: 'scale(0.7) translateY(20%) rotate(4deg)', filter: 'brightness(0.3) saturate(0)', opacity: 0 },
  ], { duration: 650, easing: 'ease-in' });
  g.remove();
}

// Pop-in for a newly summoned minion.
export function summonIn(el) {
  return animate(el, [
    { transform: 'translateY(-30px) scale(1.25)', opacity: 0, filter: 'brightness(2)' },
    { transform: 'translateY(4px) scale(0.96)', opacity: 1, filter: 'brightness(1.3)', offset: 0.6 },
    { transform: 'none', opacity: 1, filter: 'none' },
  ], { duration: 380, easing: 'ease-out' });
}

// Shards bursting outward (Evade bubble popping, ice melting, Taunt shield breaking).
export function shatter(rect, kind = 'gold', count = 14) {
  const c = center(rect);
  const jobs = [];
  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    el.className = `fx-shard ${kind === 'gold' ? '' : kind}`;
    const a = (i / count) * Math.PI * 2 + Math.random() * 0.5;
    const dist = Math.max(rect.width, rect.height) * (0.55 + Math.random() * 0.5);
    const sx = c.x + Math.cos(a) * rect.width * 0.4;
    const sy = c.y + Math.sin(a) * rect.height * 0.4;
    Object.assign(el.style, { left: `${sx}px`, top: `${sy}px` });
    layer().appendChild(el);
    jobs.push(animate(el, [
      { transform: 'translate(-50%, -50%) rotate(0) scale(1)', opacity: 1 },
      { transform: `translate(calc(-50% + ${Math.cos(a) * dist}px), calc(-50% + ${Math.sin(a) * dist + 30}px)) rotate(${(Math.random() - 0.5) * 720}deg) scale(0.4)`, opacity: 0 },
    ], { duration: 650, easing: 'cubic-bezier(.2,.7,.4,1)' }).then(() => el.remove()));
  }
  return Promise.all(jobs);
}

// Impact particles in the attacking faction's style. power (1..) scales count and spread.
const PARTICLES = {
  Vampires: { cls: 'blood', gravity: 0.9 },
  Plants: { cls: 'leaf', gravity: 0.5, spin: true },
  Aliens: { cls: 'laser', gravity: 0, streak: true },
  Dinosaurs: { cls: 'rock', gravity: 1.2, spin: true },
  Fungus: { cls: 'spore', gravity: -0.4 },
  Zombies: { cls: 'ooze', gravity: 1 },
  Dragons: { cls: 'ember', gravity: -0.6 },
  Demons: { cls: 'blood', gravity: 0.9 },
  Divine: { cls: 'light', gravity: -0.5 },
  Robots: { cls: 'spark', gravity: 0.6 },
  Radioactive: { cls: 'ooze', gravity: 0.8 },
  Bees: { cls: 'pollen', gravity: 0.3 },
};
export function particles(rect, faction, power = 1) {
  const kind = PARTICLES[faction] ?? { cls: 'spark', gravity: 0.3 };
  const c = center(rect);
  const count = Math.min(26, 6 + power * 3);
  const reach = Math.max(rect.width, rect.height) * (0.5 + Math.min(power, 10) * 0.08);
  const jobs = [];
  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    el.className = `fx-p ${kind.cls}`;
    const a = Math.random() * Math.PI * 2;
    const d = reach * (0.4 + Math.random() * 0.7);
    const dx = Math.cos(a) * d;
    const dy = Math.sin(a) * d + kind.gravity * reach * 0.6;
    const size = 0.7 + Math.random() * 0.7;
    const rot = kind.streak ? (a * 180) / Math.PI : kind.spin ? (Math.random() - 0.5) * 900 : 0;
    Object.assign(el.style, { left: `${c.x}px`, top: `${c.y}px` });
    layer().appendChild(el);
    jobs.push(animate(el, [
      { transform: `translate(-50%, -50%) rotate(${kind.streak ? rot : 0}deg) scale(${size})`, opacity: 1 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) rotate(${rot}deg) scale(${size * 0.6})`, opacity: 0 },
    ], { duration: kind.streak ? 380 : 620 + Math.random() * 300, easing: 'cubic-bezier(.15,.7,.35,1)' }).then(() => el.remove()));
  }
  return Promise.all(jobs);
}

// A defeated hero: the portrait trembles, flares, then bursts into pieces.
export async function heroExplode(el) {
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const img = el.querySelector('.portrait-img')?.getAttribute('src');
  await animate(el, [
    { transform: 'translate(0,0)', filter: 'brightness(1)' },
    { transform: 'translate(-4px,2px)', filter: 'brightness(1.4)', offset: 0.2 },
    { transform: 'translate(4px,-2px)', filter: 'brightness(1.8)', offset: 0.4 },
    { transform: 'translate(-5px,-1px)', filter: 'brightness(2.4)', offset: 0.6 },
    { transform: 'translate(5px,2px) scale(1.06)', filter: 'brightness(3.2)', offset: 0.85 },
    { transform: 'scale(1.1)', filter: 'brightness(4)' },
  ], { duration: 900, easing: 'ease-in', fill: 'none' });
  el.style.visibility = 'hidden';
  burst(rect, 'summon');
  const n = 12;
  const jobs = [];
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * 360;
    const a1 = ((i + 1) / n) * 360;
    const pt = (deg, r) => `${50 + Math.cos((deg * Math.PI) / 180) * r}% ${50 + Math.sin((deg * Math.PI) / 180) * r}%`;
    const piece = document.createElement('div');
    piece.className = 'fx-hero-piece';
    Object.assign(piece.style, {
      left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px`,
      backgroundImage: img ? `url('${img}')` : 'none',
      clipPath: `polygon(50% 50%, ${pt(a0, 75)}, ${pt((a0 + a1) / 2, 60 + Math.random() * 20)}, ${pt(a1, 75)})`,
    });
    layer().appendChild(piece);
    const mid = (((a0 + a1) / 2) * Math.PI) / 180;
    const d = rect.width * (1.2 + Math.random() * 1.2);
    jobs.push(animate(piece, [
      { transform: 'translate(0,0) rotate(0)', opacity: 1, filter: 'brightness(2)' },
      { transform: `translate(${Math.cos(mid) * d}px, ${Math.sin(mid) * d + rect.height * 0.8}px) rotate(${(Math.random() - 0.5) * 540}deg)`, opacity: 0, filter: 'brightness(0.6)' },
    ], { duration: 1200, easing: 'cubic-bezier(.2,.6,.4,1)' }).then(() => piece.remove()));
  }
  jobs.push(particles(rect, null, 10));
  await Promise.all(jobs);
}

// Centre-screen banner ("YOUR TURN", "QUICK PLAY!", "EXTINCTION").
export async function banner(text, kind = '') {
  const el = document.createElement('div');
  el.className = `fx-banner ${kind}`;
  el.innerHTML = `<span>${text}</span>`;
  layer().appendChild(el);
  await animate(el, [
    { opacity: 0, transform: 'translate(-50%, -50%) scale(0.6)' },
    { opacity: 1, transform: 'translate(-50%, -50%) scale(1.05)', offset: 0.18 },
    { opacity: 1, transform: 'translate(-50%, -50%) scale(1)', offset: 0.75 },
    { opacity: 0, transform: 'translate(-50%, -50%) scale(1.1)' },
  ], { duration: 1200, easing: 'ease-out' });
  el.remove();
}

export function screenShake(root, strength = 12) {
  // The painted board sits in its own layer (board-layer.js); shake it with the table.
  const board = document.getElementById('board-stage');
  if (board && root?.classList?.contains('arena')) shakeOne(board, strength);
  return shakeOne(root, strength);
}

function shakeOne(root, strength) {
  return animate(root, [
    { transform: 'none' }, { transform: `translate(${strength}px, ${-strength / 2}px)` }, { transform: `translate(${-strength}px, ${strength / 2}px)` },
    { transform: `translate(${strength / 2}px, ${strength}px)` }, { transform: `translate(${-strength / 2}px, 0)` }, { transform: 'none' },
  ], { duration: 600 });
}

export function flashScreen(color = '#ff7a3a') {
  const el = document.createElement('div');
  el.className = 'fx-flash';
  el.style.background = color;
  layer().appendChild(el);
  animate(el, [{ opacity: 0.85 }, { opacity: 0 }], { duration: 900, easing: 'ease-out' }).then(() => el.remove());
}

// ---- Spells ------------------------------------------------------------------

const FACTION_COLOR = { Vampires: '#ff3a52', Plants: '#7dff6a', Aliens: '#5affd8', Dinosaurs: '#ffa23a', Fungus: '#c98cff', Zombies: '#9cff4a', Dragons: '#ff7a1a', Demons: '#ff2a3a', Divine: '#ffe08a', Robots: '#4ab0ff', Radioactive: '#a8ff3a', Bees: '#ffc21a' };
export const factionColor = (f) => FACTION_COLOR[f] ?? '#ffe39a';

// A glowing bolt flies from one element to another (targeted spells and Hero Spells).
export async function bolt(fromEl, toEl, color = '#ffe39a') {
  if (!fromEl || !toEl) return;
  const a = center(fromEl.getBoundingClientRect());
  const b = center(toEl.getBoundingClientRect());
  const el = document.createElement('div');
  el.className = 'fx-bolt';
  el.style.setProperty('--c', color);
  Object.assign(el.style, { left: `${a.x}px`, top: `${a.y}px` });
  layer().appendChild(el);
  const dx = b.x - a.x, dy = b.y - a.y;
  const lift = Math.min(140, Math.hypot(dx, dy) * 0.3);
  // A slight arc: through a raised midpoint.
  await animate(el, [
    { transform: 'translate(-50%, -50%) scale(0.4)', opacity: 0 },
    { transform: `translate(calc(-50% + ${dx * 0.5}px), calc(-50% + ${dy * 0.5 - lift}px)) scale(1.1)`, opacity: 1, offset: 0.5 },
    { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1.3)`, opacity: 1 },
  ], { duration: 380, easing: 'cubic-bezier(.4,0,.8,.6)' });
  el.remove();
  burst(toEl.getBoundingClientRect(), 'spell');
}

// Rising sparkles (healing, green-gold; buffs, gold).
export function sparkles(rect, kind = 'heal', count = 12) {
  const c = center(rect);
  const jobs = [];
  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    el.className = `fx-sparkle ${kind}`;
    const x = c.x + (Math.random() - 0.5) * rect.width * 0.8;
    const y = c.y + (Math.random() - 0.2) * rect.height * 0.5;
    Object.assign(el.style, { left: `${x}px`, top: `${y}px` });
    layer().appendChild(el);
    jobs.push(animate(el, [
      { transform: 'translate(-50%, -50%) scale(0)', opacity: 0 },
      { transform: 'translate(-50%, -80%) scale(1)', opacity: 1, offset: 0.3 },
      { transform: `translate(-50%, ${-120 - Math.random() * 120}%) scale(0.4)`, opacity: 0 },
    ], { duration: 700 + Math.random() * 500, delay: Math.random() * 250, easing: 'ease-out' }).then(() => el.remove()));
  }
  return Promise.all(jobs);
}

// A ring that sweeps across the board (board-wide spells).
export function shockwave(rect, color = '#ffe39a') {
  const el = document.createElement('div');
  el.className = 'fx-shockwave';
  el.style.setProperty('--c', color);
  const c = center(rect);
  const size = Math.max(rect.width, rect.height);
  Object.assign(el.style, { left: `${c.x - size / 2}px`, top: `${c.y - size / 2}px`, width: `${size}px`, height: `${size}px` });
  layer().appendChild(el);
  return animate(el, [{ transform: 'scale(0.1)', opacity: 1 }, { transform: 'scale(1.6)', opacity: 0 }], { duration: 650, easing: 'ease-out' }).then(() => el.remove());
}

// A stat gem flashes when it goes up.
export function pulseGem(el) {
  if (!el) return Promise.resolve();
  return animate(el, [
    { transform: 'scale(1)', filter: 'brightness(1)' },
    { transform: 'scale(1.7)', filter: 'brightness(1.8) drop-shadow(0 0 6px #ffe39a)', offset: 0.35 },
    { transform: 'scale(1)', filter: 'brightness(1)' },
  ], { duration: 520, easing: 'ease-out', fill: 'none' });
}

// ---- Big entrance (expensive minions) ------------------------------------------------

export async function entrance(el, name, faction) {
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const tag = document.createElement('div');
  tag.className = 'fx-entrance';
  tag.innerHTML = `<span>${name}</span>`;
  const c = center(rect);
  Object.assign(tag.style, { left: `${c.x}px`, top: `${rect.top - 8}px` });
  layer().appendChild(tag);
  await animate(el, [
    { transform: 'translateY(-60%) scale(1.6)', filter: 'brightness(2.2)', opacity: 0 },
    { transform: 'translateY(0) scale(0.92)', filter: 'brightness(1.4)', opacity: 1, offset: 0.55 },
    { transform: 'none', filter: 'none', opacity: 1 },
  ], { duration: 520, easing: 'cubic-bezier(.5,0,.8,.4)', fill: 'none' });
  particles(rect, 'Dinosaurs', 12);
  shockwave({ left: rect.left - rect.width, top: rect.top - rect.height * 0.5, width: rect.width * 3, height: rect.height * 2 }, factionColor(faction));
  animate(tag, [
    { transform: 'translate(-50%, -100%) scale(0.6)', opacity: 0 },
    { transform: 'translate(-50%, -130%) scale(1.05)', opacity: 1, offset: 0.2 },
    { transform: 'translate(-50%, -140%) scale(1)', opacity: 1, offset: 0.75 },
    { transform: 'translate(-50%, -160%) scale(1)', opacity: 0 },
  ], { duration: 1400, easing: 'ease-out' }).then(() => tag.remove());
}

// ---- Drawing cards ---------------------------------------------------------------------

// A drawn card leaves the deck face-down and turns over as it reaches the hand.
export async function drawFlip(el, from, to, backUrl) {
  const wrap = document.createElement('div');
  wrap.className = 'fx-drawflip';
  Object.assign(wrap.style, { left: `${to.left}px`, top: `${to.top}px`, width: `${to.width}px`, height: `${to.height}px` });
  const front = el.cloneNode(true);
  front.removeAttribute('data-hand');
  front.classList.add('df-front');
  front.style.cssText = 'position:absolute;inset:0;margin:0;transform:none;visibility:visible;width:100%;height:100%;';
  const back = document.createElement('div');
  back.className = 'df-back';
  if (backUrl) back.style.setProperty('--back', `url('${new URL(backUrl, document.baseURI).href}')`);
  wrap.append(front, back);
  layer().appendChild(wrap);
  const dx = from.left + from.width / 2 - (to.left + to.width / 2);
  const dy = from.top + from.height / 2 - (to.top + to.height / 2);
  await animate(wrap, [
    { transform: `translate(${dx}px, ${dy}px) rotateY(180deg) scale(0.45)` },
    { transform: `translate(${dx * 0.4}px, ${dy * 0.4 - 40}px) rotateY(180deg) scale(0.8)`, offset: 0.45 },
    { transform: 'translate(0, 0) rotateY(0deg) scale(1)' },
  ], { duration: 620, easing: 'cubic-bezier(.3,.7,.2,1)' });
  wrap.remove();
}

// The opponent gets a card: a big glowing card back flies from `from` (their deck, or
// the table for a card made by an effect) and shrinks into its spot in their hand.
export async function oppDraw(el, from, to, delay = 0) {
  const ghost = el.cloneNode(true);
  ghost.classList.add('fx-opp-draw');
  Object.assign(ghost.style, {
    position: 'fixed', left: `${to.left}px`, top: `${to.top}px`, width: `${to.width}px`, height: `${to.height}px`,
    margin: '0', transform: 'none', visibility: 'visible', bottom: 'auto',
  });
  layer().appendChild(ghost);
  const dx = from.left + from.width / 2 - (to.left + to.width / 2);
  const dy = from.top + from.height / 2 - (to.top + to.height / 2);
  await animate(ghost, [
    { transform: `translate(${dx}px, ${dy}px) scale(0.5) rotate(-12deg)`, opacity: 0 },
    { transform: `translate(${dx * 0.45}px, ${dy * 0.45 + 70}px) scale(2.1) rotate(4deg)`, opacity: 1, offset: 0.45 },
    { transform: `translate(${dx * 0.2}px, ${dy * 0.2 + 40}px) scale(1.9) rotate(0deg)`, opacity: 1, offset: 0.65 },
    { transform: 'translate(0, 0) scale(1)', opacity: 1 },
  ], { duration: 1100, delay, easing: 'cubic-bezier(.3,.7,.2,1)' });
  ghost.remove();
}

// A short label that floats up and fades ("Rival drew a card").
export async function floatLabel(text, x, y, cls = '') {
  const el = document.createElement('div');
  el.className = `fx-label ${cls}`;
  el.textContent = text;
  Object.assign(el.style, { left: `${x}px`, top: `${y}px` });
  layer().appendChild(el);
  await animate(el, [
    { opacity: 0, transform: 'translate(-50%, 10px) scale(0.8)' },
    { opacity: 1, transform: 'translate(-50%, 0) scale(1.05)', offset: 0.15 },
    { opacity: 1, transform: 'translate(-50%, 0) scale(1)', offset: 0.8 },
    { opacity: 0, transform: 'translate(-50%, -14px) scale(1)' },
  ], { duration: 2200, easing: 'ease-out' });
  el.remove();
}

// A card drawn into a full hand is shown face-up, then burns away.
export async function burnCard(html, pileRect) {
  const holder = document.createElement('div');
  holder.className = 'fx-burn';
  holder.innerHTML = html;
  layer().appendChild(holder);
  const r = holder.getBoundingClientRect();
  const dx = pileRect ? pileRect.left - r.left : 0;
  const dy = pileRect ? pileRect.top - r.top : 0;
  await animate(holder, [
    { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.3)`, opacity: 0 },
    { transform: 'translate(-50%, -50%) scale(1)', opacity: 1, offset: 0.3 },
    { transform: 'translate(-50%, -50%) scale(1)', opacity: 1, filter: 'brightness(1)', offset: 0.55 },
    { transform: 'translate(-50%, -55%) scale(0.95)', opacity: 0, filter: 'brightness(2) sepia(1) saturate(4) hue-rotate(-20deg)' },
  ], { duration: 1500, easing: 'ease-in' });
  particles(holder.getBoundingClientRect(), null, 14);
  holder.remove();
}

// ---- Deaths, by faction --------------------------------------------------------------

// Little emoji / shapes flung out of a spot (bats, petals, bones, tombstones).
function fling(rect, glyph, count, { rise = 1, spread = 1, size = 18, duration = 900 } = {}) {
  const c = center(rect);
  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    el.className = 'fx-glyph';
    el.textContent = glyph;
    el.style.fontSize = `${size * (0.7 + Math.random() * 0.6)}px`;
    Object.assign(el.style, { left: `${c.x}px`, top: `${c.y}px` });
    layer().appendChild(el);
    const a = Math.random() * Math.PI * 2;
    const d = rect.width * (0.5 + Math.random() * 0.9) * spread;
    animate(el, [
      { transform: 'translate(-50%, -50%) scale(0.4) rotate(0deg)', opacity: 1 },
      { transform: `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d * 0.6 - rect.height * 0.7 * rise}px)) scale(1) rotate(${(Math.random() - 0.5) * 120}deg)`, opacity: 0 },
    ], { duration: duration + Math.random() * 400, easing: 'cubic-bezier(.2,.7,.4,1)' }).then(() => el.remove());
  }
}

// A few glyphs flung from a spot (tapped board props).
export function popGlyph(rect, glyph, count = 3) { fling(rect, glyph, count, { rise: 0.9, spread: 0.8, size: 16 }); }

export function deathFx(rect, faction) {
  switch (faction) {
    case 'Vampires': fling(rect, '🦇', 6, { rise: 1.4, spread: 1.2 }); break;
    case 'Plants': fling(rect, '🌸', 6, { rise: 0.6 }); particles(rect, 'Plants', 6); break;
    case 'Zombies': particles(rect, 'Zombies', 7); fling(rect, '🪦', 1, { rise: 0.5, spread: 0.1, size: 26, duration: 1300 }); break;
    case 'Fungus': particles(rect, 'Fungus', 10); break;
    case 'Dragons': particles(rect, 'Dragons', 12); fling(rect, '🔥', 3, { rise: 0.9, spread: 0.5 }); break;
    case 'Radioactive': particles(rect, 'Radioactive', 12); fling(rect, '☢️', 1, { rise: 0.6, spread: 0.1, size: 26, duration: 1200 }); break;
    case 'Bees': particles(rect, 'Bees', 10); fling(rect, '🐝', 3, { rise: 1.2, spread: 1 }); break;
    case 'Robots': particles(rect, 'Robots', 14); fling(rect, '⚙️', 3, { rise: 0.5, spread: 0.9 }); fling(rect, '🔩', 2, { rise: 0.4 }); break;
    case 'Divine': particles(rect, 'Divine', 12); fling(rect, '🪶', 4, { rise: 1.1, spread: 0.8 }); break;
    case 'Demons': particles(rect, 'Dragons', 8); particles(rect, 'Demons', 6); fling(rect, '😈', 1, { rise: -0.4, spread: 0.1, size: 28, duration: 1100 }); break;
    case 'Dinosaurs': particles(rect, 'Dinosaurs', 8); fling(rect, '🦴', 3, { rise: 0.4 }); break;
    case 'Aliens': {
      // Teleported away: a bright column collapses on the spot.
      const el = document.createElement('div');
      el.className = 'fx-teleport';
      Object.assign(el.style, { left: `${rect.left + rect.width * 0.2}px`, top: `${rect.top - rect.height * 0.6}px`, width: `${rect.width * 0.6}px`, height: `${rect.height * 2.2}px` });
      layer().appendChild(el);
      animate(el, [{ transform: 'scaleX(0.2)', opacity: 0 }, { transform: 'scaleX(1)', opacity: 1, offset: 0.3 }, { transform: 'scaleX(0)', opacity: 0 }], { duration: 650, easing: 'ease-in' }).then(() => el.remove());
      particles(rect, 'Aliens', 6);
      break;
    }
    default: particles(rect, null, 8);
  }
}

// ---- Kill effects (a minion or Hero kills a minion in combat) ----------------------
// Every faction finishes its victims its own way (KILLS below), and the victim
// breaks apart to match (KILL_SHATTER). Everything is plain DOM/SVG, cleaned up after.
const KILL_COLOR = {
  Vampires: ['#ff2a44', '#ff6a7a'], Zombies: ['#9cff4a', '#4a7a1a'], Dinosaurs: ['#f0d8a8', '#8a5a2a'], Plants: ['#7dff6a', '#2f8a2a'],
  Dragons: ['#ff8a1a', '#ffd25a'], Demons: ['#ff2a3a', '#3a0006'], Radioactive: ['#a8ff3a', '#3aff7a'], Fungus: ['#c98cff', '#6a2bb0'],
  Divine: ['#ffe8a0', '#fff6d8'], Aliens: ['#5affd8', '#2affa0'], Robots: ['#7fd0ff', '#2a8aff'], Bees: ['#ffc21a', '#3a2a06'],
};

function addFx(cls, style) {
  const el = document.createElement('div');
  el.className = cls;
  Object.assign(el.style, style);
  layer().appendChild(el);
  return el;
}
const box = (c, w, h = w) => ({ left: `${c.x - w / 2}px`, top: `${c.y - h / 2}px`, width: `${w}px`, height: `${h}px` });
const svgEl = (tag, attrs = {}) => {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
};
function fullSvg(cls) {
  const svg = svgEl('svg', { class: cls, width: window.innerWidth, height: window.innerHeight });
  layer().appendChild(svg);
  return svg;
}
const done = (el, anim) => anim.then(() => el.remove());

// Building blocks ---------------------------------------------------------------------
function ring(c, size, color, { duration = 560, from = 0.3, to = 1.7, delay = 0, width = 4 } = {}) {
  const el = addFx('fx-kill-ring', { ...box(c, size), borderColor: color, borderWidth: `${width}px`, boxShadow: `0 0 22px ${color}` });
  return done(el, animate(el, [{ transform: `scale(${from})`, opacity: 1 }, { transform: `scale(${to})`, opacity: 0 }], { duration, delay, easing: 'cubic-bezier(.1,.7,.3,1)' }));
}
function glowBall(c, size, inner, outer, { duration = 620, delay = 0 } = {}) {
  const el = addFx('fx-kill-core', { ...box(c, size), background: `radial-gradient(circle, #fff 0%, ${inner} 22%, ${outer} 45%, transparent 70%)` });
  return done(el, animate(el, [{ transform: 'scale(0.2)', opacity: 1 }, { transform: 'scale(1)', opacity: 0.95, offset: 0.3 }, { transform: 'scale(1.25)', opacity: 0 }], { duration, delay, easing: 'ease-out' }));
}
function slashes(c, rect, ang, color, glow, { count = 3, heavy = false, delay = 0 } = {}) {
  const len = Math.max(rect.width, rect.height) * 1.6;
  const thick = Math.max(5, rect.width * (heavy ? 0.12 : 0.08));
  const jobs = [];
  for (let i = 0; i < count; i++) {
    const off = (i - (count - 1) / 2) * rect.width * 0.24;
    const el = addFx('fx-slash', { ...box(c, len, thick), background: `linear-gradient(90deg, transparent, ${color} 18%, #fff 50%, ${color} 82%, transparent)`, boxShadow: `0 0 14px ${glow}, 0 0 4px ${color}` });
    const base = `rotate(${ang}deg) translateY(${off}px)`;
    jobs.push(done(el, animate(el, [
      { transform: `${base} scaleX(0)`, opacity: 1 },
      { transform: `${base} scaleX(1)`, opacity: 1, offset: 0.35 },
      { transform: `${base} scaleX(1) scaleY(0.4)`, opacity: 0 },
    ], { duration: 520, delay: delay + i * 55, easing: 'cubic-bezier(.2,.9,.3,1)' })));
  }
  return Promise.all(jobs);
}
// A column of light/fire: from the top of the screen down to the victim, or up from it.
function column(c, rect, colors, { up = false, duration = 640, delay = 0 } = {}) {
  const w = rect.width * 0.85;
  const h = up ? c.y + rect.height * 0.3 : c.y + rect.height * 0.4;
  const el = addFx('fx-kill-beam', {
    left: `${c.x - w / 2}px`, top: up ? `${c.y + rect.height * 0.3 - h}px` : '0px', width: `${w}px`, height: `${h}px`,
    background: up ? `linear-gradient(0deg, #fff, ${colors[0]} 15%, ${colors[1]}88 60%, transparent)` : `linear-gradient(180deg, transparent, ${colors[1]}88 30%, ${colors[0]} 85%, #fff)`,
    boxShadow: `0 0 30px ${colors[0]}`, transformOrigin: up ? '50% 100%' : '50% 100%', borderRadius: up ? '40% 40% 0 0' : '0 0 40% 40%',
  });
  return done(el, animate(el, [{ transform: 'scaleX(0.05)', opacity: 0 }, { transform: 'scaleX(1)', opacity: 1, offset: 0.25 }, { transform: 'scaleX(0.1)', opacity: 0 }], { duration, delay, easing: 'ease-in-out' }));
}
function puddle(c, rect, color, { delay = 200, duration = 1300 } = {}) {
  const el = addFx('fx-kill-puddle', { left: `${c.x - rect.width * 0.7}px`, top: `${c.y + rect.height * 0.25}px`, width: `${rect.width * 1.4}px`, height: `${rect.height * 0.35}px`,
    background: `radial-gradient(ellipse, ${color}ee 0%, ${color}99 45%, transparent 72%)` });
  return done(el, animate(el, [{ transform: 'scale(0.1, 0.1)', opacity: 0 }, { transform: 'scale(1, 1)', opacity: 1, offset: 0.35 }, { transform: 'scale(1.1, 1)', opacity: 0 }], { duration, delay, easing: 'ease-out' }));
}
// Particles that stream from the victim back into the killer (life drain).
function drain(c, toRect, color, count = 14) {
  if (!toRect) return Promise.resolve();
  const t = center(toRect);
  const jobs = [];
  for (let i = 0; i < count; i++) {
    const el = addFx('fx-drain', { left: `${c.x}px`, top: `${c.y}px`, background: color, boxShadow: `0 0 8px ${color}` });
    const bend = (Math.random() - 0.5) * 120;
    jobs.push(done(el, animate(el, [
      { transform: 'translate(-50%, -50%) scale(0.6)', opacity: 0 },
      { transform: `translate(calc(-50% + ${(t.x - c.x) * 0.45 + bend}px), calc(-50% + ${(t.y - c.y) * 0.45}px)) scale(1.2)`, opacity: 1, offset: 0.45 },
      { transform: `translate(calc(-50% + ${t.x - c.x}px), calc(-50% + ${t.y - c.y}px)) scale(0.4)`, opacity: 0.2 },
    ], { duration: 700, delay: 180 + i * 35, easing: 'ease-in' })));
  }
  return Promise.all(jobs);
}
function bigGlyph(c, glyph, size, { duration = 700, delay = 0, cls = '' } = {}) {
  const el = addFx(`fx-kill-glyph ${cls}`, { left: `${c.x}px`, top: `${c.y}px`, fontSize: `${size}px` });
  el.textContent = glyph;
  return done(el, animate(el, [
    { transform: 'translate(-50%, -50%) scale(0.3)', opacity: 0 },
    { transform: 'translate(-50%, -50%) scale(1.15)', opacity: 1, offset: 0.25 },
    { transform: 'translate(-50%, -50%) scale(1)', opacity: 1, offset: 0.6 },
    { transform: 'translate(-50%, -50%) scale(1.4)', opacity: 0 },
  ], { duration, delay, easing: 'ease-out' }));
}

// Per-faction finishing blows ---------------------------------------------------------
const KILLS = {
  // Bite & drain: two fang punctures, a spray of blood, and the life flows back to the killer.
  Vampires({ c, rect, ang, fromRect, power }) {
    const jobs = [];
    for (const dx of [-0.13, 0.13]) {
      const el = addFx('fx-fang', { left: `${c.x + rect.width * dx}px`, top: `${c.y - rect.height * 0.12}px`, width: `${rect.width * 0.09}px`, height: `${rect.height * 0.2}px` });
      jobs.push(done(el, animate(el, [{ transform: 'translate(-50%, -120%) scaleY(0.2)', opacity: 0 }, { transform: 'translate(-50%, -50%) scaleY(1)', opacity: 1, offset: 0.3 }, { transform: 'translate(-50%, -50%) scaleY(1)', opacity: 0 }], { duration: 700, easing: 'cubic-bezier(.3,1.4,.5,1)' })));
    }
    jobs.push(slashes(c, rect, ang, '#ff2a44', '#ff6a7a', { count: 2, delay: 120 }));
    jobs.push(particles(rect, 'Vampires', Math.max(5, power + 2)));
    jobs.push(drain(c, fromRect, '#ff2a44', 16));
    fling(rect, '🩸', 3, { rise: -0.3, spread: 0.7, size: 16 });
    return Promise.all(jobs);
  },
  // Rend: rotten claws, an ooze puddle, flies buzzing around the remains.
  Zombies({ c, rect, ang, power }) {
    fling(rect, '🪰', 4, { rise: 0.4, spread: 0.6, size: 14, duration: 1500 });
    return Promise.all([
      slashes(c, rect, ang, '#9cff4a', '#4a7a1a', { count: 3 }),
      slashes(c, rect, ang + 70, '#c8ff8a', '#4a7a1a', { count: 2, delay: 160 }),
      puddle(c, rect, '#6a9a1a'),
      particles(rect, 'Zombies', Math.max(5, power + 2)),
    ]);
  },
  // Stomp: a huge three-toed footprint slams down, the ground cracks, dust and rocks fly.
  Dinosaurs({ c, rect, size, power }) {
    const foot = addFx('fx-footprint', box(c, rect.width * 1.25, rect.height * 1.1));
    foot.innerHTML = '<i></i><i></i><i></i><b></b>';
    const jobs = [done(foot, animate(foot, [
      { transform: 'scale(3) translateY(-30%)', opacity: 0 },
      { transform: 'scale(1)', opacity: 1, offset: 0.22 },
      { transform: 'scale(1)', opacity: 0.9, offset: 0.7 },
      { transform: 'scale(1.05)', opacity: 0 },
    ], { duration: 950, easing: 'cubic-bezier(.6,0,.4,1)' }))];
    for (let i = 0; i < 7; i++) {
      const len = size * (0.35 + Math.random() * 0.25);
      const crack = addFx('fx-crack', { left: `${c.x}px`, top: `${c.y + rect.height * 0.2}px`, width: `${len}px` });
      const a = (i / 7) * 360 + Math.random() * 30;
      jobs.push(done(crack, animate(crack, [{ transform: `rotate(${a}deg) scaleX(0)`, opacity: 1 }, { transform: `rotate(${a}deg) scaleX(1)`, opacity: 1, offset: 0.4 }, { transform: `rotate(${a}deg) scaleX(1)`, opacity: 0 }], { duration: 900, delay: 180, easing: 'ease-out' })));
    }
    jobs.push(ring(c, size * 1.1, '#d8b888', { delay: 180, width: 8, to: 1.5 }));
    jobs.push(particles(rect, 'Dinosaurs', Math.max(6, power + 3)));
    fling(rect, '🪨', 4, { rise: 0.6, spread: 1.2, size: 16 });
    return Promise.all(jobs);
  },
  // Strangle: vines wrap around the victim, then it bursts into petals and leaves.
  Plants({ c, rect, power }) {
    const svg = fullSvg('fx-kill-svg');
    const jobs = [];
    for (let i = 0; i < 3; i++) {
      const y0 = c.y - rect.height * 0.35 + i * rect.height * 0.33;
      const w = rect.width * 0.75;
      const d = `M ${c.x - w} ${y0 + 10} C ${c.x - w / 3} ${y0 - 30}, ${c.x + w / 3} ${y0 + 40}, ${c.x + w} ${y0 - 6}`;
      for (const [sw, col] of [[9, '#2f6a1a'], [4, '#7dff6a']]) {
        const p = svgEl('path', { d, fill: 'none', stroke: col, 'stroke-width': sw, 'stroke-linecap': 'round', pathLength: 100, 'stroke-dasharray': 100, 'stroke-dashoffset': 100 });
        svg.appendChild(p);
        jobs.push(animate(p, [{ strokeDashoffset: 100 }, { strokeDashoffset: 0, offset: 0.45 }, { strokeDashoffset: 0 }], { duration: 760, delay: i * 90, easing: 'ease-out' }));
      }
    }
    const fade = animate(svg, [{ opacity: 1 }, { opacity: 1, offset: 0.7 }, { opacity: 0 }], { duration: 1050 }).then(() => svg.remove());
    setTimeout(() => { fling(rect, '🌸', 5, { rise: 0.9, spread: 1.1 }); fling(rect, '🍃', 4, { rise: 0.7, spread: 1.2 }); particles(rect, 'Plants', Math.max(5, power + 2)); }, 420);
    return Promise.all([...jobs, fade]);
  },
  // Incinerate: an explosion and a pillar of fire; the pieces burn up as ash.
  Dragons({ c, rect, size, power }) {
    fling(rect, '🔥', 4, { rise: 1.2, spread: 0.6, size: 22 });
    return Promise.all([
      glowBall(c, size, '#ffd25a', '#ff8a1a'),
      ring(c, size, '#ff8a1a'),
      column(c, rect, ['#ff8a1a', '#ffd25a'], { up: true, delay: 120, duration: 760 }),
      particles(rect, 'Dragons', Math.max(8, power + 4)),
    ]);
  },
  // Damnation: a demonic sigil spins open a hell-portal; the victim is dragged down into it.
  Demons({ c, rect, size, power }) {
    const portal = addFx('fx-portal', { left: `${c.x - rect.width * 0.85}px`, top: `${c.y + rect.height * 0.15}px`, width: `${rect.width * 1.7}px`, height: `${rect.height * 0.55}px` });
    const svg = fullSvg('fx-kill-svg');
    const r = size * 0.42;
    const star = [];
    for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i * 4 * Math.PI) / 5; star.push(`${c.x + Math.cos(a) * r},${c.y + Math.sin(a) * r}`); }
    const g = svgEl('g', { style: `transform-origin: ${c.x}px ${c.y}px` });
    g.appendChild(svgEl('circle', { cx: c.x, cy: c.y, r, fill: 'none', stroke: '#ff2a3a', 'stroke-width': 3 }));
    g.appendChild(svgEl('polygon', { points: star.join(' '), fill: 'none', stroke: '#ff5a3a', 'stroke-width': 3, 'stroke-linejoin': 'round' }));
    svg.appendChild(g);
    return Promise.all([
      done(portal, animate(portal, [{ transform: 'scale(0, 0)', opacity: 0 }, { transform: 'scale(1, 1)', opacity: 1, offset: 0.3 }, { transform: 'scale(1, 1)', opacity: 1, offset: 0.75 }, { transform: 'scale(0, 0.2)', opacity: 0 }], { duration: 1150, easing: 'ease-in-out' })),
      animate(g, [{ transform: 'rotate(0deg) scale(0.3)', opacity: 0 }, { transform: 'rotate(120deg) scale(1)', opacity: 1, offset: 0.35 }, { transform: 'rotate(240deg) scale(1.15)', opacity: 0 }], { duration: 1000, easing: 'ease-out' }).then(() => svg.remove()),
      glowBall(c, size * 0.8, '#ff5a3a', '#7a0010', { duration: 520 }),
      particles(rect, 'Demons', Math.max(6, power + 3)),
    ]);
  },
  // Meltdown: a radiation flash; the victim melts into a glowing green puddle.
  Radioactive({ c, rect, size, power }) {
    return Promise.all([
      bigGlyph(c, '☢', Math.max(40, rect.width * 0.8), { cls: 'rad', duration: 800 }),
      glowBall(c, size, '#a8ff3a', '#3aff7a', { duration: 700 }),
      ring(c, size, '#a8ff3a', { width: 3 }),
      ring(c, size, '#a8ff3a', { width: 3, delay: 180 }),
      puddle(c, rect, '#7aff2a', { delay: 350, duration: 1500 }),
      particles(rect, 'Radioactive', Math.max(6, power + 3)),
    ]);
  },
  // Spore bloom: purple clouds burst out and mushrooms sprout around the spot.
  Fungus({ c, rect, size, power }) {
    const jobs = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const d = rect.width * 0.35;
      const s = size * (0.45 + Math.random() * 0.25);
      const puff = addFx('fx-spore', box({ x: c.x + Math.cos(a) * d, y: c.y + Math.sin(a) * d }, s));
      jobs.push(done(puff, animate(puff, [{ transform: 'scale(0.2)', opacity: 0 }, { transform: 'scale(1)', opacity: 0.85, offset: 0.35 }, { transform: 'scale(1.5) translateY(-12%)', opacity: 0 }], { duration: 1100, delay: i * 50, easing: 'ease-out' })));
    }
    setTimeout(() => fling(rect, '🍄', 4, { rise: 0.15, spread: 1.4, size: 20, duration: 1300 }), 250);
    jobs.push(particles(rect, 'Fungus', Math.max(8, power + 4)));
    return Promise.all(jobs);
  },
  // Smite: holy light from above and a starburst.
  Divine({ c, rect, size, power }) {
    const starEl = addFx('fx-starburst', box(c, size * 1.3));
    fling(rect, '🪶', 3, { rise: 1, spread: 0.8 });
    return Promise.all([
      column(c, rect, ['#ffe8a0', '#fff6d8']),
      done(starEl, animate(starEl, [{ transform: 'scale(0.2) rotate(0deg)', opacity: 0 }, { transform: 'scale(1) rotate(30deg)', opacity: 1, offset: 0.3 }, { transform: 'scale(1.3) rotate(60deg)', opacity: 0 }], { duration: 750, delay: 160, easing: 'ease-out' })),
      particles(rect, 'Divine', Math.max(6, power + 3)),
    ]);
  },
  // Abduction: a tractor beam lifts the pieces up and away.
  Aliens({ c, rect, power }) {
    const jobs = [column(c, rect, ['#5affd8', '#2affa0'], { duration: 1100 })];
    for (let i = 0; i < 3; i++) jobs.push(ring(c, rect.width * 1.2, '#5affd8', { from: 0.5, to: 1.1, delay: i * 160, width: 2, duration: 700 }));
    jobs.push(particles(rect, 'Aliens', Math.max(6, power + 3)));
    return Promise.all(jobs);
  },
  // Target locked: red brackets lock on, then a lightning bolt hits.
  Robots({ c, rect, fromRect, power }) {
    const ret = addFx('fx-reticle', box(c, rect.width * 1.35, rect.height * 1.25));
    ret.innerHTML = '<i></i><i></i><i></i><i></i>';
    const lock = animate(ret, [{ transform: 'scale(1.8) rotate(45deg)', opacity: 0 }, { transform: 'scale(1) rotate(0deg)', opacity: 1, offset: 0.4 }, { transform: 'scale(0.95)', opacity: 1, offset: 0.75 }, { transform: 'scale(1.1)', opacity: 0 }], { duration: 650, easing: 'cubic-bezier(.2,.8,.3,1)' }).then(() => ret.remove());
    const zap = new Promise((resolve) => setTimeout(() => {
      const from = fromRect ? center(fromRect) : { x: c.x, y: c.y - rect.height * 2 };
      const svg = fullSvg('fx-kill-zap');
      const pts = [];
      const nx = -(c.y - from.y);
      const ny = c.x - from.x;
      const nl = Math.hypot(nx, ny) || 1;
      for (let i = 0; i <= 9; i++) {
        const t = i / 9;
        const j = i === 0 || i === 9 ? 0 : (Math.random() - 0.5) * rect.width * 0.5;
        pts.push(`${from.x + (c.x - from.x) * t + (nx / nl) * j},${from.y + (c.y - from.y) * t + (ny / nl) * j}`);
      }
      for (const [width, color] of [[9, '#2a8aff'], [3, '#ffffff']]) svg.appendChild(svgEl('polyline', { points: pts.join(' '), fill: 'none', stroke: color, 'stroke-width': width, 'stroke-linejoin': 'round' }));
      fling(rect, '⚙️', 2, { rise: 0.5, spread: 1 });
      particles(rect, 'Robots', Math.max(6, power + 3));
      animate(svg, [{ opacity: 1 }, { opacity: 0.3, offset: 0.2 }, { opacity: 1, offset: 0.35 }, { opacity: 0 }], { duration: 480 }).then(() => { svg.remove(); resolve(); });
    }, 260 * speed()));
    return Promise.all([lock, zap]);
  },
};

// How the victim breaks apart, by killer faction.
const KILL_SHATTER = { Dragons: 'burn', Demons: 'down', Aliens: 'up', Radioactive: 'melt', Divine: 'up' };
export const shatterModeFor = (faction) => KILL_SHATTER[faction] ?? 'away';

// The killing blow over the victim. power = the killer's Attack.
export function killFx(rect, faction, power = 3, fromRect = null) {
  const c = center(rect);
  const size = Math.max(rect.width, rect.height) * (1.5 + Math.min(power, 10) * 0.07);
  const ang = fromRect ? (Math.atan2(c.y - center(fromRect).y, c.x - center(fromRect).x) * 180) / Math.PI + 55 : -35;
  const flash = addFx('fx-kill-flash', box(c, size));
  const jobs = [done(flash, animate(flash, [{ transform: 'scale(0.2)', opacity: 1 }, { transform: 'scale(1.1)', opacity: 0 }], { duration: 380, easing: 'ease-out' }))];
  const kill = KILLS[faction];
  if (kill) jobs.push(kill({ c, rect, size, power, fromRect, ang }));
  else jobs.push(slashes(c, rect, ang, '#ffffff', '#ffe39a'));
  // A skull pops up where the victim stood.
  const skull = addFx('fx-kill-skull', { left: `${c.x}px`, top: `${c.y}px` });
  skull.textContent = '💀';
  jobs.push(done(skull, animate(skull, [
    { transform: 'translate(-50%, -50%) scale(0.2)', opacity: 0 },
    { transform: 'translate(-50%, -80%) scale(1.25)', opacity: 1, offset: 0.25 },
    { transform: 'translate(-50%, -90%) scale(1)', opacity: 1, offset: 0.7 },
    { transform: 'translate(-50%, -150%) scale(0.9)', opacity: 0 },
  ], { duration: 1000, delay: 160, easing: 'ease-out' })));
  return Promise.all(jobs);
}

// The victim's picture breaks apart: 'away' (pieces fly from the killer), 'burn' (they
// char and drift up as ash), 'down' (dragged into a portal), 'up' (lifted by a beam),
// 'melt' (it sags into a puddle).
export async function shatterCard(clone, rect, fromRect = null, mode = 'away') {
  const c = center(rect);
  const base = { position: 'fixed', left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px`, margin: '0', zIndex: '900', pointerEvents: 'none' };
  if (mode === 'melt') {
    const g = clone.cloneNode(true);
    g.classList.add('fx-ghost', 'fx-piece');
    Object.assign(g.style, base, { transformOrigin: '50% 100%' });
    layer().appendChild(g);
    return animate(g, [
      { transform: 'scale(1, 1)', filter: 'brightness(1)', opacity: 1 },
      { transform: 'scale(1.05, 0.9)', filter: 'brightness(1.6) sepia(1) hue-rotate(50deg) saturate(4)', opacity: 1, offset: 0.25 },
      { transform: 'scale(1.35, 0.08) translateY(30%)', filter: 'brightness(1.2) sepia(1) hue-rotate(50deg) saturate(5) blur(2px)', opacity: 0 },
    ], { duration: 1000, easing: 'cubic-bezier(.5,0,.7,1)' }).then(() => g.remove());
  }
  const away = fromRect ? Math.atan2(c.y - center(fromRect).y, c.x - center(fromRect).x) : -Math.PI / 2;
  const jobs = [];
  const n = 3;
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      const piece = clone.cloneNode(true);
      piece.classList.add('fx-ghost', 'fx-piece');
      const top = (row / n) * 100;
      const left = (col / n) * 100;
      Object.assign(piece.style, base, { clipPath: `inset(${top}% ${100 - left - 100 / n}% ${100 - top - 100 / n}% ${left}%)` });
      layer().appendChild(piece);
      const rot = (Math.random() - 0.5) * 120;
      const pcx = rect.width * ((col + 0.5) / n - 0.5);   // piece centre, relative to the card centre
      const pcy = rect.height * ((row + 0.5) / n - 0.5);
      let frames;
      if (mode === 'down') {
        // Sucked into the portal below: pieces spiral to the centre-bottom and shrink.
        frames = [
          { transform: 'translate(0,0) rotate(0deg) scale(1)', opacity: 1, filter: 'brightness(1.6) sepia(0.6) hue-rotate(-30deg)' },
          { transform: `translate(${-pcx * 0.6}px, ${-pcy * 0.3 + rect.height * 0.15}px) rotate(${rot}deg) scale(0.7)`, opacity: 1, offset: 0.45 },
          { transform: `translate(${-pcx}px, ${-pcy + rect.height * 0.45}px) rotate(${rot * 2}deg) scale(0.05)`, opacity: 0, filter: 'brightness(0.3)' },
        ];
      } else if (mode === 'up') {
        // Lifted by a beam: pieces float straight up, glowing, and shrink away.
        frames = [
          { transform: 'translate(0,0) scale(1)', opacity: 1, filter: 'brightness(1.4)' },
          { transform: `translate(${pcx * 0.15}px, ${-rect.height * 0.5}px) rotate(${rot * 0.3}deg) scale(0.85)`, opacity: 1, filter: 'brightness(2)', offset: 0.45 },
          { transform: `translate(${pcx * 0.3}px, ${-rect.height * 2.2}px) rotate(${rot * 0.6}deg) scale(0.3)`, opacity: 0, filter: 'brightness(3)' },
        ];
      } else {
        const px = (col - 1) * 0.6 + Math.cos(away) * 1.4;
        const py = (row - 1) * 0.6 + Math.sin(away) * 1.4;
        const dist = rect.width * (0.6 + Math.random() * 0.6);
        const burn = mode === 'burn';
        frames = [
          { transform: 'translate(0,0) rotate(0deg)', opacity: 1, filter: burn ? 'brightness(2) sepia(1) saturate(4) hue-rotate(-20deg)' : 'brightness(2)' },
          { transform: `translate(${px * dist * 0.5}px, ${py * dist * 0.5}px) rotate(${rot * 0.4}deg)`, opacity: 1, filter: burn ? 'brightness(0.8) sepia(1) saturate(3)' : 'brightness(1.2)', offset: 0.3 },
          { transform: `translate(${px * dist}px, ${py * dist + (burn ? -rect.height * 0.8 : rect.height * 0.9)}px) rotate(${rot}deg) scale(${burn ? 0.4 : 1})`, opacity: 0, filter: burn ? 'brightness(0.2) grayscale(1)' : 'brightness(0.6) saturate(0.5)' },
        ];
      }
      jobs.push(animate(piece, frames, { duration: mode === 'down' ? 1000 : 820, easing: 'cubic-bezier(.25,.6,.5,1)' }).then(() => piece.remove()));
    }
  }
  await Promise.all(jobs);
}

// ---- Attack hits (the striker's faction style, on every hit that lands) -----------------
// Smaller and quicker than the kills, so a kill still stands out. dmg scales the size.
function zapAcross(c, rect, color) {
  const svg = fullSvg('fx-kill-zap');
  for (let k = 0; k < 2; k++) {
    const pts = [];
    const a = Math.random() * Math.PI;
    const len = rect.width * 0.9;
    for (let i = 0; i <= 6; i++) {
      const t = i / 6 - 0.5;
      const j = i === 0 || i === 6 ? 0 : (Math.random() - 0.5) * rect.width * 0.25;
      pts.push(`${c.x + Math.cos(a) * len * t - Math.sin(a) * j},${c.y + Math.sin(a) * len * t + Math.cos(a) * j}`);
    }
    for (const [width, col] of [[6, color], [2, '#ffffff']]) svg.appendChild(svgEl('polyline', { points: pts.join(' '), fill: 'none', stroke: col, 'stroke-width': width, 'stroke-linejoin': 'round' }));
  }
  return animate(svg, [{ opacity: 1 }, { opacity: 0.2, offset: 0.3 }, { opacity: 1, offset: 0.5 }, { opacity: 0 }], { duration: 360 }).then(() => svg.remove());
}

function vineLash(c, rect, ang) {
  const svg = fullSvg('fx-kill-svg');
  const w = rect.width * 0.8;
  const rad = (ang * Math.PI) / 180;
  const p = (t, bend) => `${c.x + Math.cos(rad) * w * t - Math.sin(rad) * bend},${c.y + Math.sin(rad) * w * t + Math.cos(rad) * bend}`;
  const d = `M ${p(-0.6, 0)} Q ${p(0, -rect.width * 0.35)} ${p(0.6, 0)}`;
  const jobs = [];
  for (const [sw, col] of [[8, '#2f6a1a'], [3, '#9aff7a']]) {
    const path = svgEl('path', { d, fill: 'none', stroke: col, 'stroke-width': sw, 'stroke-linecap': 'round', pathLength: 100, 'stroke-dasharray': 100, 'stroke-dashoffset': 100 });
    svg.appendChild(path);
    jobs.push(animate(path, [{ strokeDashoffset: 100 }, { strokeDashoffset: 0, offset: 0.5 }, { strokeDashoffset: -100 }], { duration: 460, easing: 'ease-out' }));
  }
  return Promise.all(jobs).then(() => svg.remove());
}

function laserStreak(c, fromRect, color) {
  if (!fromRect) return Promise.resolve();
  const f = center(fromRect);
  const len = Math.hypot(c.x - f.x, c.y - f.y);
  const ang = (Math.atan2(c.y - f.y, c.x - f.x) * 180) / Math.PI;
  const el = addFx('fx-laser', { left: `${f.x}px`, top: `${f.y - 3}px`, width: `${len}px`, background: `linear-gradient(90deg, transparent, ${color} 40%, #fff)`, boxShadow: `0 0 12px ${color}` });
  return done(el, animate(el, [
    { transform: `rotate(${ang}deg) scaleX(0)`, opacity: 1 },
    { transform: `rotate(${ang}deg) scaleX(1)`, opacity: 1, offset: 0.4 },
    { transform: `rotate(${ang}deg) scaleX(1)`, opacity: 0 },
  ], { duration: 360, easing: 'ease-out' }));
}

function spores(c, size, count = 3) {
  const jobs = [];
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const p = { x: c.x + Math.cos(a) * size * 0.2, y: c.y + Math.sin(a) * size * 0.2 };
    const el = addFx('fx-spore', box(p, size * (0.4 + Math.random() * 0.2)));
    jobs.push(done(el, animate(el, [{ transform: 'scale(0.2)', opacity: 0 }, { transform: 'scale(1)', opacity: 0.8, offset: 0.35 }, { transform: 'scale(1.4) translateY(-15%)', opacity: 0 }], { duration: 800, delay: i * 60, easing: 'ease-out' })));
  }
  return Promise.all(jobs);
}

const HITS = {
  Vampires: ({ c, rect, ang }) => slashes(c, rect, ang, '#ff2a44', '#ff6a7a', { count: 1 }),
  Zombies: ({ c, rect, ang }) => slashes(c, rect, ang, '#9cff4a', '#4a7a1a', { count: 2 }),
  Dinosaurs: ({ c, rect, size }) => {
    const jobs = [ring(c, size * 0.9, '#d8b888', { width: 6, to: 1.3, duration: 480 })];
    for (let i = 0; i < 4; i++) {
      const crack = addFx('fx-crack', { left: `${c.x}px`, top: `${c.y}px`, width: `${size * 0.3}px` });
      const a = Math.random() * 360;
      jobs.push(done(crack, animate(crack, [{ transform: `rotate(${a}deg) scaleX(0)`, opacity: 1 }, { transform: `rotate(${a}deg) scaleX(1)`, opacity: 1, offset: 0.4 }, { transform: `rotate(${a}deg) scaleX(1)`, opacity: 0 }], { duration: 600, easing: 'ease-out' })));
    }
    fling(rect, '🪨', 2, { rise: 0.5, spread: 0.9, size: 13 });
    return Promise.all(jobs);
  },
  Plants: ({ c, rect, ang }) => { fling(rect, '🍃', 2, { rise: 0.6, spread: 0.9, size: 14 }); return vineLash(c, rect, ang); },
  Dragons: ({ c, size }) => glowBall(c, size * 0.8, '#ffd25a', '#ff8a1a', { duration: 460 }),
  Demons: ({ c, size }) => Promise.all([glowBall(c, size * 0.75, '#ff5a3a', '#7a0010', { duration: 460 }), ring(c, size * 0.8, '#3a0006', { width: 5, to: 1.2, duration: 460 })]),
  Radioactive: ({ c, size }) => Promise.all([glowBall(c, size * 0.75, '#c8ff5a', '#3aff7a', { duration: 480 }), ring(c, size * 0.8, '#a8ff3a', { width: 2, to: 1.3, duration: 480 })]),
  Fungus: ({ c, size }) => spores(c, size, 3),
  Divine: ({ c, size }) => {
    const el = addFx('fx-starburst', box(c, size * 0.9));
    return done(el, animate(el, [{ transform: 'scale(0.2) rotate(0deg)', opacity: 0 }, { transform: 'scale(1) rotate(25deg)', opacity: 1, offset: 0.3 }, { transform: 'scale(1.2) rotate(45deg)', opacity: 0 }], { duration: 520, easing: 'ease-out' }));
  },
  Aliens: ({ c, size, fromRect }) => Promise.all([laserStreak(c, fromRect, '#5affd8'), ring(c, size * 0.7, '#5affd8', { width: 2, to: 1.3, duration: 420, delay: 120 })]),
  Robots: ({ c, rect }) => zapAcross(c, rect, '#2a8aff'),
  Bees: ({ c, rect, size }) => { fling(rect, '🐝', 2, { rise: 0.6, spread: 0.9, size: 14 }); return ring(c, size * 0.8, '#ffc21a', { width: 3, to: 1.25, duration: 440 }); },
};

// One landed hit, drawn in the striker's faction style.
export function hitFx(rect, faction, dmg = 1, fromRect = null) {
  const hit = HITS[faction];
  if (!hit) return Promise.resolve();
  const c = center(rect);
  const size = Math.max(rect.width, rect.height) * (0.9 + Math.min(dmg, 10) * 0.08);
  const ang = fromRect ? (Math.atan2(c.y - center(fromRect).y, c.x - center(fromRect).x) * 180) / Math.PI + 55 : -35;
  return hit({ c, rect, size, dmg, fromRect, ang });
}

// ---- Extinction: a meteor streaks down from the top corner and slams into a spot ----
// big = the full Extinction (whole side of the board); otherwise a Meteor Shower strike.
export async function meteor(targetRect, { big = true } = {}) {
  const c = center(targetRect);
  const size = big ? Math.max(90, Math.min(window.innerWidth, window.innerHeight) * 0.16) : 56;
  const from = { x: c.x + window.innerWidth * 0.55, y: -size * 2 };
  const ang = (Math.atan2(c.y - from.y, c.x - from.x) * 180) / Math.PI;
  // The painted meteor (art/fx): its rock sits at (34%, 68%) of the image and it flies
  // toward the lower-left (134°); it is turned to match this flight and placed so the rock leads.
  const S = size * 3;
  const rock = addFx('fx-meteor', {
    left: `${from.x - S * 0.34}px`, top: `${from.y - S * 0.68}px`, width: `${S}px`, height: `${S}px`,
    backgroundImage: `url('${new URL(big ? 'art/fx/meteor.png' : 'art/fx/meteor-small.png', document.baseURI).href}')`,
    transformOrigin: '34% 68%', '--rot': `${ang - 134}deg`,
  });
  const fly = big ? 900 : 600;
  await animate(rock, [
    { transform: `translate(0, 0) rotate(${ang - 134}deg) scale(0.6)`, opacity: 0.4 },
    { transform: `translate(${(c.x - from.x) * 0.15}px, ${(c.y - from.y) * 0.15}px) rotate(${ang - 134}deg) scale(0.75)`, opacity: 1, offset: 0.15 },
    { transform: `translate(${c.x - from.x}px, ${c.y - from.y}px) rotate(${ang - 134}deg) scale(1.15)`, opacity: 1 },
  ], { duration: fly, easing: 'cubic-bezier(.55,0,.9,.6)' });
  rock.remove();
  // Impact: white-hot flash, fireball, shockwaves, debris, a scorched crater.
  const blast = big ? Math.max(targetRect.width, targetRect.height) * 1.1 + size * 2 : size * 3;
  const cs = big ? Math.min(blast * 0.45, targetRect.height * 1.7) : Math.min(blast * 0.45, targetRect.width * 1.1);
  const crater = addFx('fx-crater', box(c, cs, cs));
  const jobs = [
    glowBall(c, blast, '#ffd25a', '#ff5a1a', { duration: big ? 900 : 600 }),
    ring(c, blast * 0.9, '#ffb04a', { width: big ? 10 : 5, duration: 700, to: 1.6 }),
    ring(c, blast * 0.9, '#ff6a1a', { width: big ? 6 : 3, duration: 900, delay: 120, to: 2 }),
    particles({ left: c.x - blast / 4, top: c.y - blast / 4, width: blast / 2, height: blast / 2 }, 'Dinosaurs', big ? 14 : 6),
    particles({ left: c.x - blast / 4, top: c.y - blast / 4, width: blast / 2, height: blast / 2 }, 'Dragons', big ? 12 : 5),
    done(crater, animate(crater, [{ transform: 'scale(0.3)', opacity: 0 }, { transform: 'scale(1)', opacity: 0.9, offset: 0.15 }, { transform: 'scale(1)', opacity: 0.8, offset: 0.7 }, { transform: 'scale(1.05)', opacity: 0 }], { duration: big ? 2000 : 1300, easing: 'ease-out' })),
  ];
  fling(targetRect, '🪨', big ? 6 : 2, { rise: 1.1, spread: 1.4, size: big ? 22 : 15 });
  return jobs;
}

// A hero that takes damage flashes red.
export function heroHit(el) {
  if (!el) return Promise.resolve();
  return animate(el, [
    { filter: 'none' },
    { filter: 'brightness(1.5) sepia(1) saturate(6) hue-rotate(-50deg)', offset: 0.25 },
    { filter: 'none' },
  ], { duration: 420, fill: 'none' });
}
