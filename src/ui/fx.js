import { fitAllText } from './shared.js';

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

// Painted sprites for the little glyphs flung around by effects (the emoji stays as
// the fallback for any glyph without art). Sized by the element's font size.
const SPRITES = {
  '🦇': 'bat', '🩸': 'blood', '🌸': 'petal', '🍃': 'leaf', '🪦': 'tombstone', '🪰': 'fly', '🔥': 'flame', '🪙': 'coin',
  '☢️': 'radiation', '☢': 'radiation', '⚙️': 'gear', '🔩': 'bolt', '🪶': 'feather', '✨': 'sparkle', '😈': 'demon',
  '🦴': 'bone', '🐝': 'bee', '🍄': 'mushroom', '💥': 'spore-burst',
  '🫧': 'acid-bubble', '👻': 'ghost-wisp', '🔷': 'rift-shard', '💧': 'acid-drip',
};
// Load them up front so the first bat or feather never pops in late.
if (typeof Image !== 'undefined') for (const name of new Set(Object.values(SPRITES))) new Image().src = `art/fx/sprites/${name}.png`;
function setGlyph(el, glyph) {
  const name = SPRITES[glyph];
  if (!name) { el.textContent = glyph; return; }
  el.classList.add('has-sprite');
  el.innerHTML = `<img src="art/fx/sprites/${name}.png" alt="" draggable="false">`;
}

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
// An attack, with weight: the attacker rears back and swells (trembling as it gathers itself),
// strikes along a streak of light in its faction's colour, and the game holds still for a beat
// on impact (hit-stop) while a flash bursts at the point of contact, the target is knocked back
// and the table shakes, more for harder hitters. Returns the offset for returnFromLunge.
export async function lunge(attackerEl, targetEl, { power = 2, color = '#ffe39a', table = null, style = null } = {}) {
  if (!attackerEl || !targetEl) return null;
  const special = STRIKES[style];
  if (special) return special(attackerEl, targetEl, { power, color, table });
  const ar = attackerEl.getBoundingClientRect();
  const tr = targetEl.getBoundingClientRect();
  const a = center(ar);
  const t = center(tr);
  const dx = (t.x - a.x) * 0.78;
  const dy = (t.y - a.y) * 0.78;
  const tilt = dx > 0 ? -5 : 5;
  const heavy = Math.min(1, Math.max(0, (power - 1) / 7));   // 0 for a 1-Attack poke, 1 for 8+
  const back = 0.14 + heavy * 0.08;
  const lift = 1.14 + heavy * 0.08;
  const reared = `translate(${-dx * back}px, ${-dy * back}px) scale(${lift}) rotate(${tilt}deg)`;
  attackerEl.style.zIndex = '60';
  // Wind-up: rear back and swell, with a shadow that grows as it lifts…
  await animate(attackerEl, [
    { transform: 'translate(0,0) scale(1) rotate(0deg)', filter: 'drop-shadow(0 4px 4px #0008)' },
    { transform: reared, filter: 'brightness(1.15) drop-shadow(0 18px 14px #000a)' },
  ], { duration: 220 + heavy * 90, easing: 'cubic-bezier(.2,.8,.3,1)' });
  // …tremble for a moment as it gathers itself (harder hitters tremble longer)…
  const j = 1.5 + heavy * 2;
  await animate(attackerEl, [
    { transform: reared }, { transform: `${reared} translate(${j}px, ${-j / 2}px)` }, { transform: `${reared} translate(${-j}px, ${j / 2}px)` },
    { transform: `${reared} translate(${j / 2}px, 0)` }, { transform: reared },
  ], { duration: 70 + heavy * 90, easing: 'linear' });
  // …then strike, leaving a streak of light behind it…
  streak(a, t, color, 0.78);
  await animate(attackerEl, [
    { transform: reared, filter: 'brightness(1.15) drop-shadow(0 18px 14px #000a)' },
    { transform: `translate(${dx}px, ${dy}px) scale(1.05) rotate(0deg)`, filter: 'brightness(1.4) drop-shadow(0 4px 4px #0008)' },
  ], { duration: 130, easing: 'cubic-bezier(.7,0,1,.5)' });
  // …impact: a flash at the point of contact, the target knocked back, the table shakes,
  // and everything hangs still for a beat (hit-stop).
  const hit = { x: a.x + dx * 1.02, y: a.y + dy * 1.02 };
  impactFlash(hit, Math.max(tr.width, tr.height) * (0.9 + heavy * 0.6), color);
  const len = Math.hypot(dx, dy) || 1;
  const kb = 6 + heavy * 10;
  animate(targetEl, [
    { transform: 'none' },
    { transform: `translate(${(dx / len) * kb}px, ${(dy / len) * kb}px) rotate(${-tilt * 0.6}deg) scale(0.96)`, offset: 0.25 },
    { transform: 'none' },
  ], { duration: 340, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'none' });
  if (table) screenShake(table, 2 + heavy * 9);
  await wait(80 + heavy * 70);
  return { dx, dy };
}

// ---- Attack styles by faction (minions only) --------------------------------------------
// Ranged styles stay put (they return null: nothing to spring back from).
const heavyOf = (power) => Math.min(1, Math.max(0, (power - 1) / 7));
function impact(attackerEl, targetEl, at, { power, color, table }, kb = 1) {
  const tr = targetEl.getBoundingClientRect();
  const h = heavyOf(power);
  impactFlash(at, Math.max(tr.width, tr.height) * (0.9 + h * 0.6), color);
  const c = center(tr);
  const a = center(attackerEl.getBoundingClientRect());
  let dx = c.x - a.x, dy = c.y - a.y; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
  const d = (6 + h * 10) * kb;
  animate(targetEl, [{ transform: 'none' }, { transform: `translate(${dx * d}px, ${dy * d}px) scale(0.96)`, offset: 0.25 }, { transform: 'none' }], { duration: 340, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'none' });
  if (table) screenShake(table, 2 + h * 9);
}
// Rear back (shared wind-up for the ranged styles).
function rear(el, dx, dy, ms = 240) {
  return animate(el, [{ transform: 'none' }, { transform: `translate(${-dx * 0.06}px, ${-dy * 0.06}px) scale(1.12)`, filter: 'brightness(1.2)' }], { duration: ms, easing: 'cubic-bezier(.2,.8,.3,1)' });
}
const settle = (el) => animate(el, [{ transform: 'scale(1.12)', filter: 'brightness(1.2)' }, { transform: 'none', filter: 'none' }], { duration: 260, easing: 'ease-out', fill: 'none' });
const STRIKES = {
  // Dragons breathe a cone of fire at the target.
  async Dragons(el, target, o) {
    const a = center(el.getBoundingClientRect()), t = center(target.getBoundingClientRect());
    const dx = t.x - a.x, dy = t.y - a.y, len = Math.hypot(dx, dy);
    await rear(el, dx, dy, 260);
    const cone = document.createElement('div');
    cone.className = 'fx-fire-cone';
    const w = target.getBoundingClientRect().width * 1.5;
    Object.assign(cone.style, { left: `${a.x}px`, top: `${a.y}px`, width: `${len * 1.08}px`, height: `${w}px`, marginTop: `${-w / 2}px`, transform: `rotate(${Math.atan2(dy, dx)}rad)` });
    layer().appendChild(cone);
    const burn = animate(cone, [
      { clipPath: 'polygon(0 50%, 0 50%, 0 50%)', opacity: 1 },
      { clipPath: 'polygon(0 46%, 100% 0, 100% 100%, 0 54%)', opacity: 1, offset: 0.3 },
      { clipPath: 'polygon(0 46%, 100% 0, 100% 100%, 0 54%)', opacity: 0.9, offset: 0.75 },
      { clipPath: 'polygon(0 46%, 100% 0, 100% 100%, 0 54%)', opacity: 0 },
    ], { duration: 620, easing: 'ease-out' }).then(() => cone.remove());
    await wait(200);
    impact(el, target, t, { ...o, color: '#ff7a1a' }, 0.6);
    particles(target.getBoundingClientRect(), 'Dragons', 6);
    await wait(120);
    settle(el);
    await burn;
    return null;
  },
  // Robots fire a laser.
  async Robots(el, target, o) {
    const a = center(el.getBoundingClientRect()), t = center(target.getBoundingClientRect());
    const dx = t.x - a.x, dy = t.y - a.y, len = Math.hypot(dx, dy);
    await rear(el, dx, dy, 200);
    const beam = document.createElement('div');
    beam.className = 'fx-laser';
    Object.assign(beam.style, { left: `${a.x}px`, top: `${a.y}px`, width: `${len}px`, transform: `rotate(${Math.atan2(dy, dx)}rad)` });
    layer().appendChild(beam);
    animate(el, [{ transform: 'scale(1.12)' }, { transform: `translate(${-dx / len * 8}px, ${-dy / len * 8}px) scale(1.08)`, offset: 0.2 }, { transform: 'none' }], { duration: 380, easing: 'ease-out', fill: 'none' });
    const shot = animate(beam, [{ clipPath: 'inset(0 100% 0 0)', opacity: 1 }, { clipPath: 'inset(0 0 0 0)', opacity: 1, offset: 0.2 }, { clipPath: 'inset(0 0 0 0)', opacity: 1, offset: 0.6 }, { clipPath: 'inset(0 0 0 100%)', opacity: 0 }], { duration: 480, easing: 'linear' }).then(() => beam.remove());
    await wait(100);
    impact(el, target, t, { ...o, color: '#4ab0ff' }, 0.7);
    await shot;
    return null;
  },
  // Plants lash a vine across to the target.
  async Plants(el, target, o) {
    const a = center(el.getBoundingClientRect()), t = center(target.getBoundingClientRect());
    const dx = t.x - a.x, dy = t.y - a.y;
    await rear(el, dx, dy, 220);
    const svg = fullSvg('fx-vine');
    const mx = (a.x + t.x) / 2 - dy * 0.25, my = (a.y + t.y) / 2 + dx * 0.25;
    for (const [w, col] of [[9, '#2f6a1e'], [4, '#7dff6a']]) {
      const path = svgEl('path', { d: `M${a.x},${a.y} Q${mx},${my} ${t.x},${t.y}`, fill: 'none', stroke: col, 'stroke-width': w, 'stroke-linecap': 'round', pathLength: 1, 'stroke-dasharray': 1 });
      svg.appendChild(path);
      animate(path, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0, offset: 0.4 }, { strokeDashoffset: 0, offset: 0.7 }, { strokeDashoffset: -1 }], { duration: 640, easing: 'cubic-bezier(.3,.7,.4,1)' });
    }
    animate(el, [{ transform: 'scale(1.12)' }, { transform: `rotate(${dx > 0 ? 8 : -8}deg) scale(1.06)`, offset: 0.3 }, { transform: 'none' }], { duration: 500, easing: 'ease-out', fill: 'none' });
    await wait(240);
    impact(el, target, t, { ...o, color: '#7dff6a' }, 1);
    await wait(420);
    svg.remove();
    return null;
  },
  // Sharks dive under and come up biting.
  async Sharks(el, target, o) {
    const a = center(el.getBoundingClientRect()), t = center(target.getBoundingClientRect());
    const dx = (t.x - a.x) * 0.8, dy = (t.y - a.y) * 0.8;
    el.style.zIndex = '60';
    await animate(el, [
      { transform: 'none', opacity: 1, filter: 'none' },
      { transform: 'translateY(10px) scale(0.85)', opacity: 0.45, filter: 'brightness(0.6) hue-rotate(10deg) blur(1px)', offset: 0.4 },
      { transform: `translate(${dx * 0.6}px, ${dy * 0.6 + 14}px) scale(0.8)`, opacity: 0.3, filter: 'brightness(0.5) blur(2px)' },
    ], { duration: 320, easing: 'ease-in' });
    await animate(el, [
      { transform: `translate(${dx * 0.6}px, ${dy * 0.6 + 14}px) scale(0.8)`, opacity: 0.3, filter: 'brightness(0.5) blur(2px)' },
      { transform: `translate(${dx}px, ${dy}px) scale(1.15)`, opacity: 1, filter: 'brightness(1.3)' },
    ], { duration: 150, easing: 'cubic-bezier(.3,0,.5,1.4)' });
    const tr = target.getBoundingClientRect();
    const jaws = document.createElement('div');
    jaws.className = 'fx-bite';
    Object.assign(jaws.style, { left: `${tr.left - tr.width * 0.15}px`, top: `${tr.top}px`, width: `${tr.width * 1.3}px`, height: `${tr.height}px` });
    jaws.innerHTML = `<div class="jaw top">${JAW_SVG(true)}</div><div class="jaw bot">${JAW_SVG(false)}</div>`;
    layer().appendChild(jaws);
    const [top, bot] = jaws.children;
    animate(top, [{ transform: 'translateY(-40%)' }, { transform: 'translateY(8%)', offset: 0.45 }, { transform: 'translateY(-10%)' }], { duration: 380, easing: 'cubic-bezier(.6,0,.4,1)' });
    animate(bot, [{ transform: 'translateY(40%)' }, { transform: 'translateY(-8%)', offset: 0.45 }, { transform: 'translateY(10%)' }], { duration: 380, easing: 'cubic-bezier(.6,0,.4,1)' })
      .then(() => animate(jaws, [{ opacity: 1 }, { opacity: 0 }], { duration: 160 })).then(() => jaws.remove());
    await wait(170);
    impact(el, target, center(tr), { ...o, color: '#ff3a3a' }, 1.2);
    await wait(90);
    return { dx, dy };
  },
  // Ghosts pass straight through the target and fade back in at home.
  async Ghosts(el, target, o) {
    const a = center(el.getBoundingClientRect()), t = center(target.getBoundingClientRect());
    const dx = t.x - a.x, dy = t.y - a.y;
    el.style.zIndex = '60';
    await animate(el, [{ transform: 'none', opacity: 1, filter: 'none' }, { transform: `translate(${-dx * 0.05}px, ${-dy * 0.05}px) scale(1.08)`, opacity: 0.75, filter: 'brightness(1.6) saturate(0.4)' }], { duration: 220, easing: 'ease-out' });
    const pass = animate(el, [
      { transform: `translate(${-dx * 0.05}px, ${-dy * 0.05}px) scale(1.08)`, opacity: 0.75, filter: 'brightness(1.6) saturate(0.4)' },
      { transform: `translate(${dx}px, ${dy}px) scale(1.1)`, opacity: 0.55, filter: 'brightness(2) saturate(0.2) blur(1px)', offset: 0.55 },
      { transform: `translate(${dx * 1.45}px, ${dy * 1.45}px) scale(0.9)`, opacity: 0, filter: 'brightness(2.4) saturate(0) blur(4px)' },
    ], { duration: 520, easing: 'cubic-bezier(.4,0,.6,1)' });
    await wait(260);
    impact(el, target, t, { ...o, color: '#8ff0ff' }, 0.5);
    const art = target.querySelector('.m-art, .portrait-img');
    if (art) animate(art, [{ filter: 'none' }, { filter: 'brightness(0.6) saturate(0) hue-rotate(160deg)', offset: 0.3 }, { filter: 'none' }], { duration: 500, fill: 'none' });
    await pass;
    return { ghost: true };
  },
};
STRIKES.Fungus = STRIKES.Plants;

// The streak of light an attacker leaves as it strikes.
function streak(from, to, color, reach = 1) {
  const el = document.createElement('div');
  el.className = 'fx-streak';
  el.style.setProperty('--c', color);
  const dx = (to.x - from.x) * reach, dy = (to.y - from.y) * reach;
  const len = Math.hypot(dx, dy);
  Object.assign(el.style, { left: `${from.x}px`, top: `${from.y}px`, width: `${len}px`, transform: `rotate(${Math.atan2(dy, dx)}rad)` });
  layer().appendChild(el);
  animate(el, [
    { clipPath: 'inset(0 100% 0 0)', opacity: 1 },
    { clipPath: 'inset(0 0 0 0)', opacity: 1, offset: 0.35 },
    { clipPath: 'inset(0 0 0 100%)', opacity: 0 },
  ], { duration: 380, easing: 'ease-out' }).then(() => el.remove());
}

// A white-hot star of light where two characters collide.
function impactFlash(at, size, color) {
  const el = document.createElement('div');
  el.className = 'fx-impact';
  el.style.setProperty('--c', color);
  Object.assign(el.style, { left: `${at.x}px`, top: `${at.y}px`, width: `${size}px`, height: `${size}px` });
  layer().appendChild(el);
  animate(el, [
    { transform: 'translate(-50%, -50%) scale(0.2) rotate(0deg)', opacity: 1 },
    { transform: 'translate(-50%, -50%) scale(1) rotate(20deg)', opacity: 1, offset: 0.25 },
    { transform: 'translate(-50%, -50%) scale(1.3) rotate(30deg)', opacity: 0 },
  ], { duration: 360, easing: 'ease-out' }).then(() => el.remove());
}

// The attacker springs back to its place, overshooting a touch.
export function returnFromLunge(el, offset) {
  if (!el || !offset) return Promise.resolve();
  if (offset.ghost) return animate(el, [{ opacity: 0, transform: 'scale(0.9)', filter: 'brightness(2) blur(3px)' }, { opacity: 1, transform: 'none', filter: 'none' }], { duration: 420, easing: 'ease-out', fill: 'none' });
  return animate(el, [
    { transform: `translate(${offset.dx}px, ${offset.dy}px) scale(1.05)` },
    { transform: `translate(${-offset.dx * 0.04}px, ${-offset.dy * 0.04}px) scale(0.98)`, offset: 0.7 },
    { transform: 'none' },
  ], { duration: 320, easing: 'cubic-bezier(.2,.8,.2,1)' });
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

// Copies of board minions drawn in the effects layer sit in a stand-in for the arena, so they
// keep their board look (the shard frame is styled as \`.arena .minion\`), sized like the original.
function ghostHost(rect) {
  const host = document.createElement('div');
  host.className = 'arena fx-ghost-host';
  host.style.setProperty('--minion-w', `${rect.width}px`);
  layer().appendChild(host);
  return host;
}

// A minion that died: its last picture cracks, sinks and fades.
export async function deathGhost(clone, rect) {
  const g = clone;
  g.classList.add('fx-ghost', 'dying');
  Object.assign(g.style, {
    position: 'fixed', left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px`,
    margin: '0', zIndex: '900', pointerEvents: 'none',
  });
  const host = ghostHost(rect);
  host.appendChild(g);
  await animate(g, [
    { transform: 'scale(1) rotate(0)', filter: 'brightness(1)', opacity: 1 },
    { transform: 'scale(1.06) rotate(-2deg)', filter: 'brightness(1.8) saturate(0)', opacity: 1, offset: 0.25 },
    { transform: 'scale(0.7) translateY(20%) rotate(4deg)', filter: 'brightness(0.3) saturate(0)', opacity: 0 },
  ], { duration: 650, easing: 'ease-in' });
  host.remove();
}

// A minion arrives: it drops onto the board and squashes a little on landing; at the moment
// it lands a ring of light in its faction's colour flares out, a soft flash lights it from
// below, dust puffs out sideways from under it and a few motes of light drift up.
// \`thump\`: the table to nudge on impact (a tiny shake).
export async function arrival(el, faction, thump = null) {
  if (!el) return;
  const color = FACTION_COLOR[faction] ?? '#ffe39a';
  const fall = 300;
  const drop = animate(el, [
    { transform: 'translateY(-46px) scale(1.32) rotate(-3deg)', opacity: 0, filter: 'brightness(2.2) drop-shadow(0 26px 14px #0008)' },
    { transform: 'translateY(-10px) scale(1.08) rotate(-1deg)', opacity: 1, filter: 'brightness(1.6) drop-shadow(0 12px 8px #0008)', offset: 0.55 },
    { transform: 'translateY(3px) scale(1.07, 0.9)', filter: 'brightness(1.5)', offset: 0.68 },
    { transform: 'translateY(-2px) scale(0.98, 1.03)', filter: 'brightness(1.15)', offset: 0.84 },
    { transform: 'none', opacity: 1, filter: 'none' },
  ], { duration: fall / 0.68, easing: 'cubic-bezier(.45,0,.7,1)', fill: 'none' });
  await wait(fall);
  if (!el.isConnected) return drop;
  const rect = el.getBoundingClientRect();
  const c = center(rect);
  const jobs = [drop];
  // Ring of light and the flash under the card.
  const ring = document.createElement('div');
  ring.className = 'fx-arrive-ring';
  const size = Math.max(rect.width, rect.height) * 1.15;
  Object.assign(ring.style, { left: `${c.x}px`, top: `${c.y}px`, width: `${size}px`, height: `${size}px` });
  ring.style.setProperty('--c', color);
  const glow = document.createElement('div');
  glow.className = 'fx-arrive-glow';
  Object.assign(glow.style, { left: `${c.x}px`, top: `${c.y}px`, width: `${size * 1.4}px`, height: `${size * 1.4}px` });
  glow.style.setProperty('--c', color);
  layer().append(glow, ring);
  jobs.push(animate(ring, [
    { transform: 'translate(-50%, -50%) scale(0.55)', opacity: 1, borderWidth: '6px' },
    { transform: 'translate(-50%, -50%) scale(2.1)', opacity: 0, borderWidth: '1px' },
  ], { duration: 620, easing: 'cubic-bezier(.1,.7,.3,1)' }).then(() => ring.remove()));
  jobs.push(animate(glow, [
    { transform: 'translate(-50%, -50%) scale(0.6)', opacity: 0.5 },
    { transform: 'translate(-50%, -50%) scale(1.15)', opacity: 0 },
  ], { duration: 480, easing: 'ease-out' }).then(() => glow.remove()));
  // Dust: soft puffs rolling out from under the bottom edge, both ways.
  for (let i = 0; i < 10; i++) {
    const p = document.createElement('div');
    p.className = 'fx-dust';
    const side = i % 2 ? 1 : -1;
    const s0 = rect.width * (0.26 + Math.random() * 0.18);
    Object.assign(p.style, { left: `${c.x + side * rect.width * (0.1 + Math.random() * 0.25)}px`, top: `${rect.bottom - rect.height * 0.08}px`, width: `${s0}px`, height: `${s0}px` });
    layer().appendChild(p);
    const dx = side * rect.width * (0.45 + Math.random() * 0.5), dy = -rect.height * (0.04 + Math.random() * 0.16);
    jobs.push(animate(p, [
      { transform: 'translate(-50%, -50%) scale(0.4)', opacity: 0.95 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(${1.6 + Math.random()})`, opacity: 0 },
    ], { duration: 650 + Math.random() * 350, easing: 'cubic-bezier(.15,.7,.3,1)' }).then(() => p.remove()));
  }
  // Motes of light in the faction's colour drifting up.
  for (let i = 0; i < 7; i++) {
    const m = document.createElement('div');
    m.className = 'fx-mote';
    m.style.setProperty('--c', color);
    Object.assign(m.style, { left: `${rect.left + rect.width * (0.15 + Math.random() * 0.7)}px`, top: `${rect.bottom - rect.height * 0.2}px` });
    layer().appendChild(m);
    jobs.push(animate(m, [
      { transform: 'translate(-50%, -50%) scale(0.6)', opacity: 0 },
      { transform: `translate(-50%, ${-rect.height * 0.25}px) scale(1)`, opacity: 1, offset: 0.25 },
      { transform: `translate(calc(-50% + ${(Math.random() - 0.5) * 20}px), ${-rect.height * (0.8 + Math.random() * 0.5)}px) scale(0.4)`, opacity: 0 },
    ], { duration: 900 + Math.random() * 500, delay: Math.random() * 120, easing: 'ease-out' }).then(() => m.remove()));
  }
  if (thump) jobs.push(shakeOne(thump, 2.5));
  return Promise.all(jobs);
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
  Ghosts: { cls: 'wisp', gravity: -0.6 },
  Ultraterrestrials: { cls: 'shard', gravity: -0.2 },
  Sharks: { cls: 'bubble', gravity: -0.5 },
  Acidic: { cls: 'acid', gravity: -0.4 },
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
// A defeated Hero: glowing cracks split the portrait in three jolts (light leaking through
// them, the portrait shuddering harder each time), then it bursts: a white flash, a
// shockwave, and the shards of the portrait tumble away.
export async function heroExplode(el) {
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const img = el.querySelector('.portrait-img')?.getAttribute('src');
  const c = center(rect);
  // Cracks of light, drawn over the portrait.
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('class', 'fx-hero-cracks');
  Object.assign(svg.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` });
  layer().appendChild(svg);
  const crackPath = (ang, len, from = [50, 46]) => {
    const pts = [from];
    let [x, y] = from;
    const steps = 4 + Math.floor(Math.random() * 3);
    for (let k = 1; k <= steps; k++) {
      const a = ang + (Math.random() - 0.5) * 0.7;
      x += Math.cos(a) * (len / steps); y += Math.sin(a) * (len / steps);
      pts.push([x, y]);
    }
    return { d: `M${pts.map((q) => q.map((v) => v.toFixed(1)).join(',')).join(' L')}`, end: pts[pts.length - 1] };
  };
  const addCracks = (n, len, from) => {
    const ends = [];
    for (let k = 0; k < n; k++) {
      const ang = (k / n) * Math.PI * 2 + Math.random() * 0.8;
      const { d, end } = crackPath(ang, len * (0.7 + Math.random() * 0.5), from);
      ends.push(end);
      for (const cls of ['glow', 'core']) {
        const path = document.createElementNS(NS, 'path');
        path.setAttribute('d', d);
        path.setAttribute('class', cls);
        path.setAttribute('pathLength', '1');
        svg.appendChild(path);
        animate(path, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 260, easing: 'cubic-bezier(.2,.8,.3,1)' });
      }
    }
    return ends;
  };
  const shudder = (k) => animate(el, [
    { transform: 'translate(0,0)', filter: `brightness(${1 + k * 0.4})` },
    { transform: `translate(${-3 - k * 2}px, ${1 + k}px) rotate(${-1 - k}deg)`, filter: `brightness(${1.3 + k * 0.5})`, offset: 0.25 },
    { transform: `translate(${3 + k * 2}px, ${-1 - k}px) rotate(${1 + k}deg)`, offset: 0.55 },
    { transform: 'translate(0,0)', filter: `brightness(${1.1 + k * 0.4})` },
  ], { duration: 240, easing: 'ease-out', fill: 'forwards' });
  let ends = addCracks(4, 26);
  await shudder(0); await wait(160);
  ends = ends.flatMap((e) => addCracks(1, 18, e)).concat(addCracks(3, 34));
  await shudder(1); await wait(140);
  ends.slice(0, 6).forEach((e) => addCracks(1, 16, e));
  addCracks(5, 44);
  await shudder(2);
  svg.classList.add('blazing');
  await wait(180);
  // Burst.
  el.style.visibility = 'hidden';
  svg.remove();
  const flash = document.createElement('div');
  flash.className = 'fx-hero-flash';
  const size = Math.max(rect.width, rect.height);
  Object.assign(flash.style, { left: `${c.x}px`, top: `${c.y}px`, width: `${size * 3}px`, height: `${size * 3}px` });
  const ring = document.createElement('div');
  ring.className = 'fx-hero-ring';
  Object.assign(ring.style, { left: `${c.x}px`, top: `${c.y}px`, width: `${size}px`, height: `${size}px` });
  layer().append(flash, ring);
  const jobs = [
    animate(flash, [{ transform: 'translate(-50%, -50%) scale(0.2)', opacity: 1 }, { transform: 'translate(-50%, -50%) scale(1)', opacity: 0 }], { duration: 600, easing: 'ease-out' }).then(() => flash.remove()),
    animate(ring, [{ transform: 'translate(-50%, -50%) scale(0.4)', opacity: 1, borderWidth: '10px' }, { transform: 'translate(-50%, -50%) scale(4)', opacity: 0, borderWidth: '1px' }], { duration: 800, easing: 'cubic-bezier(.1,.7,.3,1)' }).then(() => ring.remove()),
  ];
  const n = 16;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * 360 + (Math.random() - 0.5) * 8;
    const a1 = ((i + 1) / n) * 360 + (Math.random() - 0.5) * 8;
    const pt = (deg, r) => `${50 + Math.cos((deg * Math.PI) / 180) * r}% ${50 + Math.sin((deg * Math.PI) / 180) * r}%`;
    const piece = document.createElement('div');
    piece.className = 'fx-hero-piece';
    Object.assign(piece.style, {
      left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px`,
      backgroundImage: img ? `url('${img}')` : 'none',
      clipPath: `polygon(${pt((a0 + a1) / 2, 4 + Math.random() * 8)}, ${pt(a0, 75)}, ${pt((a0 + a1) / 2, 55 + Math.random() * 25)}, ${pt(a1, 75)})`,
    });
    layer().appendChild(piece);
    const mid = (((a0 + a1) / 2) * Math.PI) / 180;
    const d = rect.width * (1.3 + Math.random() * 1.5);
    jobs.push(animate(piece, [
      { transform: 'translate(0,0) rotate(0) scale(1)', opacity: 1, filter: 'brightness(2.6)' },
      { transform: `translate(${Math.cos(mid) * d * 0.35}px, ${Math.sin(mid) * d * 0.35}px) rotate(${(Math.random() - 0.5) * 120}deg) scale(1.02)`, opacity: 1, filter: 'brightness(1.4)', offset: 0.2 },
      { transform: `translate(${Math.cos(mid) * d}px, ${Math.sin(mid) * d + rect.height * 1.1}px) rotate(${(Math.random() - 0.5) * 600}deg) scale(0.8)`, opacity: 0, filter: 'brightness(0.5)' },
    ], { duration: 1300 + Math.random() * 300, easing: 'cubic-bezier(.2,.6,.4,1)' }).then(() => piece.remove()));
  }
  jobs.push(particles(rect, null, 12));
  const arena = el.closest('.arena');
  if (arena) jobs.push(screenShake(arena, 14));
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

// The start of a turn: a dark band sweeps across the screen with gold rules above and below,
// the words slide in out of a wide letter-spacing as a glint runs across them and a flare
// blooms behind, then the band sweeps on out. The rival's turn: the same, in red, quicker.
export async function turnBanner(text, mine = true, sub = '') {
  const el = document.createElement('div');
  el.className = `fx-turn ${mine ? 'mine' : 'theirs'}`;
  el.innerHTML = `<div class="ft-band"></div><i class="ft-flare"></i><div class="ft-words"><span class="ft-main">${text}</span>${sub ? `<span class="ft-sub">${sub}</span>` : ''}</div>`;
  layer().appendChild(el);
  const band = el.querySelector('.ft-band'), flare = el.querySelector('.ft-flare'), main = el.querySelector('.ft-main'), words = el.querySelector('.ft-words');
  const hold = mine ? 760 : 420;
  const ease = 'cubic-bezier(.2,.8,.2,1)';
  const jobs = [
    animate(band, [
      { transform: 'translateY(-50%) scaleX(0)', transformOrigin: '0 50%', opacity: 1 },
      { transform: 'translateY(-50%) scaleX(1)', transformOrigin: '0 50%', opacity: 1, offset: 0.22 },
      { transform: 'translateY(-50%) scaleX(1)', transformOrigin: '100% 50%', opacity: 1, offset: 0.78 },
      { transform: 'translateY(-50%) scaleX(0)', transformOrigin: '100% 50%', opacity: 1 },
    ], { duration: hold + 760, easing: 'cubic-bezier(.65,0,.35,1)' }),
    animate(words, [
      { transform: 'translate(-50%, -50%) translateX(-70px)', opacity: 0, letterSpacing: '0.6em' },
      { transform: 'translate(-50%, -50%) translateX(-50px)', opacity: 0, letterSpacing: '0.45em', offset: 0.12 },
      { transform: 'translate(-50%, -50%)', opacity: 1, letterSpacing: '0.08em', offset: 0.32 },
      { transform: 'translate(-50%, -50%) translateX(10px)', opacity: 1, letterSpacing: '0.1em', offset: 0.7 },
      { transform: 'translate(-50%, -50%) translateX(70px)', opacity: 0, letterSpacing: '0.2em', offset: 0.86 },
      { transform: 'translate(-50%, -50%) translateX(70px)', opacity: 0, letterSpacing: '0.2em' },
    ], { duration: hold + 760, easing: 'linear' }),
    animate(main, [{ backgroundPosition: '140% 0, 0 0' }, { backgroundPosition: '-40% 0, 0 0' }], { duration: 900, delay: 260, easing: 'ease-in-out' }),
    animate(flare, [
      { transform: 'translate(-50%, -50%) scale(0.2)', opacity: 0 },
      { transform: 'translate(-50%, -50%) scale(1)', opacity: mine ? 0.9 : 0.6, offset: 0.3 },
      { transform: 'translate(-50%, -50%) scale(1.5)', opacity: 0 },
    ], { duration: hold + 400, delay: 120, easing: 'ease-out' }),
  ];
  await Promise.all(jobs);
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

const FACTION_COLOR = { Vampires: '#ff3a52', Plants: '#7dff6a', Aliens: '#5affd8', Dinosaurs: '#ffa23a', Fungus: '#c98cff', Zombies: '#9cff4a', Dragons: '#ff7a1a', Demons: '#ff2a3a', Divine: '#ffe08a', Robots: '#4ab0ff', Radioactive: '#a8ff3a', Bees: '#ffc21a', Ghosts: '#8ff0ff', Ultraterrestrials: '#b48cff', Sharks: '#ff3a3a', Acidic: '#c8ff2a' };
export const factionColor = (f) => FACTION_COLOR[f] ?? '#ffe39a';

// A glowing bolt flies from one element to another (targeted spells and Hero Spells).
// Casting a spell: the card spins up out of the hand (or appears, for the rival's) to the
// middle of the table, flares and bursts into its faction's particles with a ring of light,
// and the magic flies on at its target as a bolt. \`html\`: the card (null = burst only).
export async function castFlourish(html, fromRect, faction, targetEl) {
  const color = FACTION_COLOR[faction] ?? '#ffe39a';
  const mid = { x: window.innerWidth / 2, y: window.innerHeight * 0.46 };
  if (html) {
    const holder = document.createElement('div');
    holder.className = 'fx-cast';
    holder.innerHTML = html;
    holder.querySelector('.big-card')?.style.setProperty('--h', `${Math.min(300, window.innerHeight * 0.36)}px`);
    layer().appendChild(holder);
    const from = fromRect ? center(fromRect) : { x: mid.x, y: window.innerHeight };
    await animate(holder, [
      { transform: `translate(calc(-50% + ${from.x - mid.x}px), calc(-50% + ${from.y - mid.y}px)) scale(0.35) rotateY(0deg)`, opacity: 0.9 },
      { transform: 'translate(-50%, -50%) scale(1.02) rotateY(360deg)', opacity: 1, offset: 0.75 },
      { transform: 'translate(-50%, -50%) scale(1) rotateY(360deg)', opacity: 1 },
    ], { duration: 560, easing: 'cubic-bezier(.3,.7,.3,1)' });
    await wait(160);
    animate(holder, [
      { transform: 'translate(-50%, -50%) scale(1)', opacity: 1, filter: 'brightness(1)' },
      { transform: 'translate(-50%, -50%) scale(1.12)', opacity: 1, filter: 'brightness(2.6)', offset: 0.4 },
      { transform: 'translate(-50%, -50%) scale(1.35)', opacity: 0, filter: 'brightness(3) blur(6px)' },
    ], { duration: 360, easing: 'ease-out' }).then(() => holder.remove());
  }
  const rect = { left: mid.x - 90, top: mid.y - 90, width: 180, height: 180 };
  particles(rect, faction, 12);
  const ring = document.createElement('div');
  ring.className = 'fx-arrive-ring';
  ring.style.setProperty('--c', color);
  Object.assign(ring.style, { left: `${mid.x}px`, top: `${mid.y}px`, width: '200px', height: '200px' });
  layer().appendChild(ring);
  animate(ring, [{ transform: 'translate(-50%, -50%) scale(0.4)', opacity: 1 }, { transform: 'translate(-50%, -50%) scale(2)', opacity: 0 }], { duration: 600, easing: 'cubic-bezier(.1,.7,.3,1)' }).then(() => ring.remove());
  if (targetEl) {
    const dot = document.createElement('div');
    Object.assign(dot.style, { position: 'fixed', left: `${mid.x}px`, top: `${mid.y}px`, width: '1px', height: '1px' });
    layer().appendChild(dot);
    await wait(120);
    await bolt(dot, targetEl, color);
    dot.remove();
  } else await wait(300);
}

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

// ---- Stats that react ---------------------------------------------------------------
// An Attack or Health number that changed: it pops, glows green (up) or red (down), and
// counts from the old value to the new one. A soft ring of the same colour flares behind it.
// Uses the separate \`scale\` property so it never fights the gem's own positioning transform.
export function statChange(el, from, to, { delay = 0 } = {}) {
  if (!el || from === to || from == null) return Promise.resolve();
  const up = to > from;
  const color = up ? '#5dff8a' : '#ff4a4a';
  const steps = Math.abs(to - from);
  const total = Math.min(900, 260 + steps * 90) * speed();
  const startDelay = delay * speed();
  el.textContent = String(from);
  // The ring behind the number.
  const r = el.getBoundingClientRect();
  if (r.width) {
    const ring = document.createElement('div');
    ring.className = `fx-statring ${up ? 'up' : 'down'}`;
    const c = center(r);
    const size = Math.max(r.width, r.height) * 1.6;
    Object.assign(ring.style, { left: `${c.x}px`, top: `${c.y}px`, width: `${size}px`, height: `${size}px` });
    layer().appendChild(ring);
    animate(ring, [
      { transform: 'translate(-50%, -50%) scale(0.4)', opacity: 0 },
      { transform: 'translate(-50%, -50%) scale(1)', opacity: 0.95, offset: 0.3 },
      { transform: 'translate(-50%, -50%) scale(1.5)', opacity: 0 },
    ], { duration: 700, delay: delay, easing: 'ease-out' }).then(() => ring.remove());
  }
  const pop = animate(el, [
    { scale: '1', filter: 'none' },
    { scale: '1.5', filter: `brightness(1.5) drop-shadow(0 0 6px ${color}) drop-shadow(0 0 2px ${color})`, offset: 0.25 },
    { scale: '1.12', filter: `brightness(1.2) drop-shadow(0 0 4px ${color})`, offset: 0.7 },
    { scale: '1', filter: 'none' },
  ], { duration: Math.max(560, total / speed() + 260), delay, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'none' });
  // Count one step at a time (big jumps count faster); a hidden tab just shows the end value.
  const count = new Promise((res) => {
    if (document.hidden || reduced()) { el.textContent = String(to); return res(); }
    const t0 = performance.now() + startDelay;
    let shown = from;
    const tick = (now) => {
      if (!el.isConnected) return res();
      const k = Math.min(1, Math.max(0, (now - t0) / total));
      const eased = 1 - (1 - k) ** 2;
      const v = Math.round(from + (to - from) * eased);
      if (v !== shown) { shown = v; el.textContent = String(v); }
      if (k < 1) requestAnimationFrame(tick); else { el.textContent = String(to); res(); }
    };
    requestAnimationFrame(tick);
  });
  return Promise.all([pop, count]);
}

// New cracks run outward from the point of impact, with a pale flash along them.
export function crackSpread(el, delay = 0) {
  if (!el) return Promise.resolve();
  return animate(el, [
    { clipPath: 'circle(0% at 57% 34%)', filter: 'brightness(3) drop-shadow(0 0 2px #fff)' },
    { clipPath: 'circle(45% at 57% 34%)', filter: 'brightness(2) drop-shadow(0 0 2px #fff)', offset: 0.45 },
    { clipPath: 'circle(110% at 57% 34%)', filter: 'drop-shadow(0 0 1px #0008)' },
  ], { duration: 520, delay, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'backwards' });
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
// A card back's picture(s): one URL, or [first, second] for a two-faction deck's half-and-half back.
function setBacks(el, urls) {
  [urls].flat().filter(Boolean).forEach((u, i) => el.style.setProperty(i ? '--back2' : '--back', `url('${new URL(u, document.baseURI).href}')`));
}

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
  setBacks(back, backUrl);
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
  // Keep the hand's faction card back(s) on the copy flying outside it.
  const host = el.closest('[style*="--back"]');
  for (const v of ['--back', '--back2']) if (host?.style.getPropertyValue(v)) ghost.style.setProperty(v, host.style.getPropertyValue(v));
  if (host) ghost.querySelector(':scope > span')?.remove();
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
    setGlyph(el, glyph);
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
    case 'Ultraterrestrials': particles(rect, 'Ultraterrestrials', 12); break;
    case 'Sharks': particles(rect, 'Sharks', 12); particles(rect, 'Vampires', 6); break;
    case 'Acidic': particles(rect, 'Acidic', 14); fling(rect, '🫧', 2, { rise: 1, spread: 0.6 }); break;
    case 'Ghosts': particles(rect, 'Ghosts', 12); fling(rect, '👻', 1, { rise: 1.4, spread: 0.2, size: 26, duration: 1300 }); break;
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
  Divine: ['#ffe8a0', '#fff6d8'], Aliens: ['#5affd8', '#2affa0'], Robots: ['#7fd0ff', '#2a8aff'], Bees: ['#ffc21a', '#3a2a06'], Ghosts: ['#8ff0ff', '#e8fbff'], Ultraterrestrials: ['#b48cff', '#ffd76a'], Sharks: ['#ff2a2a', '#4ab8ff'], Acidic: ['#c8ff2a', '#ffe23a'],
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
  setGlyph(el, glyph);
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
  // Swarm: a cloud of bees converges and stings; honey drips where the victim stood.
  Bees({ c, rect, power }) {
    const jobs = [];
    for (let i = 0; i < 12; i++) {
      const a = Math.random() * Math.PI * 2, d = Math.max(rect.width, rect.height) * (1.1 + Math.random() * 0.6);
      const el = addFx('fx-glyph', { left: `${c.x + Math.cos(a) * d}px`, top: `${c.y + Math.sin(a) * d}px`, fontSize: `${14 + Math.random() * 8}px` });
      setGlyph(el, '🐝');
      jobs.push(done(el, animate(el, [
        { transform: 'translate(-50%, -50%) scale(0.6)', opacity: 0 },
        { transform: `translate(calc(-50% + ${-Math.cos(a) * d * 0.95}px), calc(-50% + ${-Math.sin(a) * d * 0.95}px)) scale(1)`, opacity: 1, offset: 0.7 },
        { transform: `translate(calc(-50% + ${-Math.cos(a) * d * 0.7}px), calc(-50% + ${-Math.sin(a) * d * 1.3 - 40}px)) scale(0.5)`, opacity: 0 },
      ], { duration: 900, delay: i * 30, easing: 'ease-in-out' })));
    }
    jobs.push(ring(c, rect.width * 1.4, '#ffc21a', { delay: 500, width: 4 }));
    jobs.push(puddle(c, rect, '#ffb81a', { delay: 600 }));
    jobs.push(particles(rect, 'Bees', Math.max(6, power + 3)));
    return Promise.all(jobs);
  },
  // Spirit-claim: a ghost rises out of the victim and its soul is pulled up into the light.
  Ghosts({ c, rect, size, power }) {
    fling(rect, '👻', 2, { rise: 1.6, spread: 0.3, size: 28, duration: 1400 });
    return Promise.all([
      glowBall(c, size * 0.9, '#bff6ff', '#4ab8d8', { duration: 800 }),
      column(c, rect, ['#bff6ff', '#8ff0ff'], { up: true, duration: 1000 }),
      ring(c, size, '#8ff0ff', { width: 2, to: 1.4, duration: 900 }),
      particles(rect, 'Ghosts', Math.max(8, power + 4)),
    ]);
  },
  // Unravel: a rift tears open, folds the victim into a point and snaps shut.
  Ultraterrestrials({ c, rect, size, power }) {
    const jobs = [];
    for (let i = 0; i < 3; i++) jobs.push(ring(c, size * 1.3, i % 2 ? '#ffd76a' : '#b48cff', { from: 1.3, to: 0.05, width: 3, delay: i * 120, duration: 650 }));
    jobs.push(glowBall(c, size * 0.6, '#ffffff', '#b48cff', { delay: 520, duration: 500 }));
    setTimeout(() => fling(rect, '🔷', 5, { rise: 0.6, spread: 1.3, size: 24, duration: 1100 }), 560);
    jobs.push(particles(rect, 'Ultraterrestrials', Math.max(8, power + 4)));
    return Promise.all(jobs);
  },
  // Jaws: rows of teeth snap shut on the victim; blood sprays and streams to the killer.
  Sharks({ c, rect, fromRect, power }) {
    const w = rect.width * 1.5, h = rect.height * 0.55;
    const jobs = [];
    for (const top of [true, false]) {
      const el = addFx(`fx-jaw ${top ? 'top' : 'bottom'}`, { left: `${c.x - w / 2}px`, top: `${top ? c.y - h : c.y}px`, width: `${w}px`, height: `${h}px` });
    el.innerHTML = JAW_SVG(top);
      const from = top ? '-90%' : '90%';
      jobs.push(done(el, animate(el, [
        { transform: `translateY(${from})`, opacity: 0 },
        { transform: `translateY(${top ? '-25%' : '25%'})`, opacity: 1, offset: 0.35 },
        { transform: 'translateY(0)', opacity: 1, offset: 0.5 },
        { transform: 'translateY(0)', opacity: 1, offset: 0.75 },
        { transform: `translateY(${top ? '-20%' : '20%'})`, opacity: 0 },
      ], { duration: 1150, easing: 'cubic-bezier(.6,0,.3,1.4)' })));
    }
    setTimeout(() => fling(rect, '🩸', 6, { rise: 0.6, spread: 1.2, size: 16 }), 380);
    jobs.push(puddle(c, rect, '#c8102a', { delay: 420 }));
    if (fromRect) jobs.push(drain(c, fromRect, '#ff2a3a', 12));
    jobs.push(particles(rect, 'Sharks', Math.max(6, power + 3)));
    return Promise.all(jobs);
  },
  // Dissolve: an acid splash; the victim sags and melts into a bubbling green pool.
  Acidic({ c, rect, size, power }) {
    setTimeout(() => fling(rect, '🫧', 6, { rise: 1.2, spread: 0.8, size: 16, duration: 1300 }), 250);
    return Promise.all([
      acidSplash(c, rect, 16),
      glowBall(c, size * 0.9, '#f4ffb0', '#8aff1a', { duration: 650 }),
      puddle(c, rect, '#8aff1a', { delay: 300, duration: 1600 }),
      particles(rect, 'Acidic', Math.max(8, power + 4)),
    ]);
  },
};

// A row of shark teeth on a curved gum (top or bottom jaw).
function JAW_SVG(top) {
  const teeth = [];
  for (let i = 0; i < 9; i++) {
    const x = 6 + i * 11, curve = Math.abs(i - 4) * 2.2;
    const big = i === 2 || i === 6 ? 1.35 : 1;
    teeth.push(`<path d="M${x - 5},${14 + curve} L${x},${14 + curve + 22 * big} L${x + 5},${14 + curve} Z" fill="url(#jt)" stroke="#3a0a10" stroke-width="0.8"/>`);
  }
  return `<svg viewBox="0 0 100 50" preserveAspectRatio="none" style="width:100%;height:100%;overflow:visible;${top ? '' : 'transform:scaleY(-1)'}">
    <defs><linearGradient id="jt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#d8cdb8"/></linearGradient></defs>
    <path d="M0,0 L100,0 L100,10 Q50,26 0,10 Z" fill="#4a0c16"/><path d="M0,10 Q50,26 100,10" fill="none" stroke="#9a1a2a" stroke-width="3"/>${teeth.join('')}</svg>`;
}

// Acid splash: globs burst out and run down (Acidic kills and Corrosion).
function acidSplash(c, rect, count = 10, { delay = 0 } = {}) {
  const jobs = [];
  for (let i = 0; i < count; i++) {
    const a = -Math.PI * (0.1 + Math.random() * 0.8);
    const d = rect.width * (0.35 + Math.random() * 0.5);
    const s = 5 + Math.random() * 7;
    const el = addFx('fx-acid-glob', { left: `${c.x}px`, top: `${c.y - rect.height * 0.15}px`, width: `${s}px`, height: `${s * 1.3}px` });
    const dx = Math.cos(a) * d, dy = Math.sin(a) * d;
    jobs.push(done(el, animate(el, [
      { transform: 'translate(-50%, -50%) scale(0.3)', opacity: 1 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1)`, opacity: 1, offset: 0.4 },
      { transform: `translate(calc(-50% + ${dx * 1.1}px), calc(-50% + ${dy + rect.height * 0.9}px)) scale(0.6, 1.4)`, opacity: 0 },
    ], { duration: 900 + Math.random() * 300, delay: delay + Math.random() * 120, easing: 'cubic-bezier(.2,.6,.6,1)' })));
  }
  return Promise.all(jobs);
}

// Corrosion: acid pours over the minion, drips run down it, it sizzles, and its Attack gem
// melts down (a green "-N" floats off it).
export function corrodeFx(el, amount = 1) {
  if (!el) return Promise.resolve();
  const rect = el.getBoundingClientRect();
  const c = center(rect);
  const jobs = [acidSplash({ x: c.x, y: rect.top + rect.height * 0.15 }, rect, 6 + amount * 2)];
  for (let i = 0; i < 4 + amount * 2; i++) {
    const x = rect.left + rect.width * (0.15 + Math.random() * 0.7);
    const len = rect.height * (0.25 + Math.random() * 0.45);
    const drip = addFx('fx-acid-drip', { left: `${x}px`, top: `${rect.top + rect.height * 0.05}px`, height: `${len}px` });
    jobs.push(done(drip, animate(drip, [
      { transform: 'scaleY(0)', opacity: 0.95 }, { transform: 'scaleY(1)', opacity: 0.95, offset: 0.55 }, { transform: 'scaleY(1) translateY(30%)', opacity: 0 },
    ], { duration: 1000 + Math.random() * 400, delay: 120 + Math.random() * 300, easing: 'ease-in' })));
  }
  const fizz = addFx('fx-acid-fizz', { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` });
  jobs.push(done(fizz, animate(fizz, [{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 0.8, offset: 0.7 }, { opacity: 0 }], { duration: 1300 })));
  setTimeout(() => fling(rect, '🫧', 3 + amount, { rise: 0.9, spread: 0.5, size: 12, duration: 1100 }), 200);
  const gem = el.querySelector('.atk');
  if (gem) {
    jobs.push(animate(gem, [
      { filter: 'none', transform: 'none' },
      { filter: 'hue-rotate(60deg) saturate(2) brightness(1.3) drop-shadow(0 0 6px #c8ff2a)', transform: 'scale(1.25, 0.8) translateY(8%)', offset: 0.35 },
      { filter: 'hue-rotate(60deg) saturate(1.5) drop-shadow(0 0 4px #c8ff2a)', transform: 'scale(0.9, 1.1)', offset: 0.65 },
      { filter: 'none', transform: 'none' },
    ], { duration: 1000, delay: 200, fill: 'none' }));
    floater(gem.getBoundingClientRect(), `-${amount}`, 'corrode');
  }
  return Promise.all(jobs);
}

// Acid-coated: a glob of acid lands on the minion and clings to it.
export function acidCoatFx(el) {
  if (!el) return Promise.resolve();
  const rect = el.getBoundingClientRect();
  return acidSplash(center(rect), rect, 6);
}

// Marked Prey, constantly: while a Marked Prey and a Shark hunting it are both alive, a thin
// wavering thread of blood mist flows from the Prey to that Shark. links: [{ key, from, to }]
// (rects). Paths are kept and updated in place, so the flow never restarts as things move.
let preySvg = null;
const preyPaths = new Map();
export function preyStreams(links) {
  if (!links.length && !preySvg) return;
  if (!preySvg) {
    preySvg = document.createElement('div');
    preySvg.className = 'fx-prey-streams';
    document.body.appendChild(preySvg); // under the hand and previews, over the board
  }
  const keep = new Set();
  for (const { key, from, to } of links) {
    keep.add(key);
    const a = center(from), b = center(to);
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const ang = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
    let el = preyPaths.get(key);
    if (!el) {
      el = document.createElement('div');
      el.className = 'prey-stream';
      el.innerHTML = '<i></i><i></i>';
      // Each stream starts its flow at a different point, so several never pulse in step.
      el.style.setProperty('--ph', `${-Math.random() * 3}s`);
      preySvg.appendChild(el);
      preyPaths.set(key, el);
    }
    Object.assign(el.style, { left: `${a.x}px`, top: `${a.y}px`, width: `${len}px`, transform: `translateY(-50%) rotate(${ang}deg)` });
  }
  for (const [key, el] of preyPaths) if (!keep.has(key)) { el.remove(); preyPaths.delete(key); }
}

// Marked Prey: a gaseous trail of blood drifts from the wounded minion to the hunters that
// smell it — like blood clouding in water: a wavering, blurred haze along a curved path,
// with soft puffs of red mist that swell, swirl and fade as they travel.
let bloodGasId = 0;
export function bloodTrail(fromRect, toRect, { strong = false, delay = 0 } = {}) {
  if (!fromRect || !toRect) return Promise.resolve();
  const a = center(fromRect), b = center(toRect);
  const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
  const bend = Math.min(110, len * 0.22) * (dx >= 0 ? 1 : -1);
  const mx = a.x + dx / 2 - (dy / len) * bend, my = a.y + dy / 2 + (dx / len) * bend * 0.4;
  const pt = (t) => ({ x: (1 - t) ** 2 * a.x + 2 * (1 - t) * t * mx + t * t * b.x, y: (1 - t) ** 2 * a.y + 2 * (1 - t) * t * my + t * t * b.y });
  const svg = fullSvg('fx-kill-svg fx-blood-svg');
  const id = `bgas${bloodGasId++}`;
  // A turbulent, blurred haze: the path is smeared by noise so its edges billow like smoke.
  svg.innerHTML = `<defs><filter id="${id}" x="-20%" y="-20%" width="140%" height="140%">
    <feTurbulence type="fractalNoise" baseFrequency="0.011 0.02" numOctaves="4" seed="${bloodGasId}" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="${strong ? 64 : 54}" xChannelSelector="R" yChannelSelector="G"/>
    <feGaussianBlur stdDeviation="${strong ? 9 : 8}"/></filter></defs>`;
  const d = `M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`;
  const g = svgEl('g', { filter: `url(#${id})` });
  svg.appendChild(g);
  const jobs = [];
  for (const [sw, col, op] of [[strong ? 60 : 48, '#8a0016', 0.22], [strong ? 30 : 24, '#d8102a', 0.3], [strong ? 10 : 8, '#ff7a8a', 0.22]]) {
    const p = svgEl('path', { d, fill: 'none', stroke: col, 'stroke-width': sw, 'stroke-linecap': 'round', opacity: op, pathLength: 100, 'stroke-dasharray': '100 100', 'stroke-dashoffset': 100 });
    g.appendChild(p);
    jobs.push(animate(p, [
      { strokeDashoffset: 100, opacity: 0 },
      { strokeDashoffset: 30, opacity: op, offset: 0.35 },
      { strokeDashoffset: 0, opacity: op * 0.8, offset: 0.6 },
      { strokeDashoffset: -60, opacity: 0 },
    ], { duration: strong ? 1500 : 1800, delay, easing: 'ease-in-out' }));
  }
  // A cloud of red mist billows along the whole trail: puffs appear in a wave from the prey
  // toward the hunter, swell, curl and drift a little further along before thinning out.
  const puffs = strong ? 30 : 22;
  for (let i = 0; i < puffs; i++) {
    const t0 = i / (puffs - 1);
    const size = (strong ? 80 : 64) * (0.6 + Math.random() * 0.7) * (0.8 + t0 * 0.4);
    const p0 = pt(t0), p1 = pt(Math.min(1, t0 + 0.12));
    const jx = (Math.random() - 0.5) * 26, jy = (Math.random() - 0.5) * 26;
    const el = addFx('fx-blood-mist', { left: `${p0.x + jx}px`, top: `${p0.y + jy}px`, width: `${size}px`, height: `${size}px` });
    const spin = (Math.random() - 0.5) * 120;
    jobs.push(done(el, animate(el, [
      { transform: `translate(-50%, -50%) scale(0.25) rotate(0deg)`, opacity: 0 },
      { transform: `translate(calc(-50% + ${(p1.x - p0.x) * 0.4}px), calc(-50% + ${(p1.y - p0.y) * 0.4}px)) scale(0.9) rotate(${spin * 0.4}deg)`, opacity: (strong ? 0.6 : 0.48) * (0.6 + Math.random() * 0.6), offset: 0.3 },
      { transform: `translate(calc(-50% + ${p1.x - p0.x}px), calc(-50% + ${p1.y - p0.y - 8}px)) scale(1.5) rotate(${spin}deg)`, opacity: 0 },
    ], { duration: 1400 + Math.random() * 500, delay: delay + t0 * 650 + Math.random() * 80, easing: 'ease-out' })));
  }
  return Promise.all(jobs).then(() => { svg.remove(); burst(toRect, 'blood'); });
}

// How the victim breaks apart, by killer faction.
const KILL_SHATTER = { Dragons: 'burn', Demons: 'down', Aliens: 'up', Radioactive: 'melt', Divine: 'up', Acidic: 'melt', Ghosts: 'up', Ultraterrestrials: 'down' };
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
  const host = ghostHost(rect);
  try { await shatterInto(host, clone, rect, fromRect, mode); } finally { host.remove(); }
}
async function shatterInto(host, clone, rect, fromRect, mode) {
  const c = center(rect);
  const base = { position: 'fixed', left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px`, margin: '0', zIndex: '900', pointerEvents: 'none' };
  if (mode === 'melt') {
    const g = clone.cloneNode(true);
    g.classList.add('fx-ghost', 'fx-piece');
    Object.assign(g.style, base, { transformOrigin: '50% 100%' });
    host.appendChild(g);
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
      host.appendChild(piece);
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
  Sharks: ({ c, size }) => ring(c, size * 0.8, '#ff2a2a', { width: 3, to: 1.2, duration: 380 }),
  Acidic: ({ c, rect, size }) => { particles(rect, 'Acidic', 8); return ring(c, size * 0.8, '#c8ff2a', { width: 3, to: 1.3, duration: 460 }); },
  Ultraterrestrials: ({ c, size }) => ring(c, size * 0.9, '#b48cff', { width: 2, to: 0.4, duration: 480 }),
  Ghosts: ({ c, size }) => ring(c, size * 0.85, '#8ff0ff', { width: 3, to: 1.35, duration: 520 }),
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
// A minion hit: it recoils away from the blow (harder hits throw it further), tips over a
// little and flashes white, then settles back. \`from\`: where the blow came from (a rect),
// or null to be pushed back toward its own side of the board.
export function flinch(el, from, dmg = 1) {
  if (!el) return Promise.resolve();
  const r = el.getBoundingClientRect();
  const c = center(r);
  let dx = 0, dy = el.closest('.board.opp, .opp') ? -1 : 1;
  if (from) { const f = center(from); dx = c.x - f.x; dy = c.y - f.y; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l; }
  const d = Math.min(18, 5 + dmg * 2.2);
  const tip = (dx >= 0 ? 1 : -1) * Math.min(9, 3 + dmg);
  const art = el.querySelector('.m-art');
  if (art) animate(art, [{ filter: 'brightness(2.8) saturate(0.2)' }, { filter: 'brightness(1.3)', offset: 0.35 }, { filter: 'none' }], { duration: 300, fill: 'none' });
  return animate(el, [
    { translate: '0 0', rotate: '0deg' },
    { translate: `${dx * d}px ${dy * d}px`, rotate: `${tip}deg`, offset: 0.22 },
    { translate: `${-dx * d * 0.18}px ${-dy * d * 0.18}px`, rotate: `${-tip * 0.3}deg`, offset: 0.6 },
    { translate: '0 0', rotate: '0deg' },
  ], { duration: 420, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'none' });
}

// Hero reactions. Hit: the portrait winces, squashing and jerking back. Healed: it lifts
// and brightens with a warm glow.
export function heroWince(el, dmg = 1) {
  const img = el?.querySelectorAll('.portrait-img');
  if (!img?.length) return Promise.resolve();
  const k = Math.min(1, dmg / 6);
  return Promise.all([...img].map((i) => animate(i, [
    { scale: '1', rotate: '0deg', translate: '0 0' },
    { scale: `${1.05 + k * 0.04} ${0.9 - k * 0.05}`, rotate: `${-3 - k * 3}deg`, translate: `0 ${3 + k * 4}px`, offset: 0.2 },
    { scale: '0.98 1.02', rotate: '1deg', translate: '0 -1px', offset: 0.55 },
    { scale: '1', rotate: '0deg', translate: '0 0' },
  ], { duration: 520, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'none' })));
}
export function heroPerk(el) {
  const img = el?.querySelectorAll('.portrait-img');
  if (!img?.length) return Promise.resolve();
  return Promise.all([...img].map((i) => animate(i, [
    { scale: '1', translate: '0 0', filter: 'none' },
    { scale: '1.06', translate: '0 -5px', filter: 'brightness(1.25) drop-shadow(0 0 10px #ffe39a)', offset: 0.35 },
    { scale: '1', translate: '0 0', filter: 'none' },
  ], { duration: 760, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'none' })));
}

// A minion dying in its own faction's way, or null for the default fade:
// Ghosts drift up and dissolve, Robots fall apart throwing sparks, Zombies crumble to dust,
// Plants and Fungus wilt and wither, Acidic melts away, Dragons burn to ash.
export function themedDeath(clone, rect, faction) {
  if (faction === 'Acidic') return shatterCard(clone, rect, null, 'melt');
  if (faction === 'Dragons') return shatterCard(clone, rect, null, 'burn');
  const host = ghostHost(rect);
  const base = { position: 'fixed', left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px`, margin: '0', zIndex: '900', pointerEvents: 'none', animation: 'none' };
  const one = () => { const g = clone.cloneNode(true); g.classList.add('fx-ghost'); Object.assign(g.style, base); host.appendChild(g); return g; };
  const done = (p) => p.then(() => host.remove(), () => host.remove());
  if (faction === 'Ghosts') {
    const g = one();
    return done(animate(g, [
      { transform: 'translateY(0) scale(1)', filter: 'brightness(1)', opacity: 1 },
      { transform: 'translateY(-12%) scale(1.04) rotate(-2deg)', filter: 'brightness(1.8) saturate(0.4) blur(0px)', opacity: 0.85, offset: 0.3 },
      { transform: 'translateY(-70%) scale(1.15) rotate(3deg)', filter: 'brightness(2.4) saturate(0) blur(6px)', opacity: 0 },
    ], { duration: 1100, easing: 'cubic-bezier(.3,.1,.4,1)' }));
  }
  if (faction === 'Plants' || faction === 'Fungus') {
    const g = one();
    g.style.transformOrigin = '50% 100%';
    return done(animate(g, [
      { transform: 'rotate(0) scale(1, 1)', filter: 'none', opacity: 1 },
      { transform: 'rotate(6deg) scale(1, 0.92)', filter: 'sepia(0.6) saturate(0.7) brightness(0.85)', opacity: 1, offset: 0.35 },
      { transform: 'rotate(16deg) scale(0.92, 0.55) translateY(20%)', filter: 'sepia(1) saturate(0.4) brightness(0.45)', opacity: 0 },
    ], { duration: 1200, easing: 'cubic-bezier(.4,0,.7,1)' }));
  }
  if (faction === 'Robots' || faction === 'Zombies') {
    // Pieces: Robots in a few big plates that drop with a clank; Zombies in many small bits that crumble.
    const robot = faction === 'Robots';
    const n = robot ? 3 : 5;
    const jobs = [];
    for (let row = 0; row < n; row++) for (let col = 0; col < n; col++) {
      const g = one();
      const t = (row / n) * 100, l = (col / n) * 100;
      g.style.clipPath = `inset(${t}% ${100 - l - 100 / n}% ${100 - t - 100 / n}% ${l}%)`;
      const delay = robot ? Math.random() * 160 : (n - row) * 70 + Math.random() * 90;
      const dx = (col - (n - 1) / 2) * rect.width * (robot ? 0.25 : 0.06) + (Math.random() - 0.5) * 10;
      const fall = rect.height * (robot ? 0.9 + Math.random() * 0.4 : 0.35 + Math.random() * 0.3);
      const rot = (Math.random() - 0.5) * (robot ? 70 : 30);
      jobs.push(animate(g, [
        { transform: 'translate(0,0) rotate(0)', opacity: 1, filter: robot ? 'brightness(1.4)' : 'none' },
        { transform: `translate(${dx * 0.3}px, ${-rect.height * (robot ? 0.06 : 0.01)}px) rotate(${rot * 0.2}deg)`, opacity: 1, offset: 0.2 },
        { transform: `translate(${dx}px, ${fall}px) rotate(${rot}deg)`, opacity: 0, filter: robot ? 'brightness(0.5) saturate(0.3)' : 'sepia(0.8) brightness(0.5) blur(1px)' },
      ], { duration: robot ? 800 : 950, delay, easing: 'cubic-bezier(.5,0,.8,.6)' }));
    }
    if (robot) jobs.push(particles(rect, 'Robots', 10));
    else {
      for (let i = 0; i < 8; i++) {
        const p = document.createElement('div');
        p.className = 'fx-dust';
        const s0 = rect.width * (0.3 + Math.random() * 0.2);
        Object.assign(p.style, { left: `${rect.left + rect.width * Math.random()}px`, top: `${rect.bottom - rect.height * 0.15}px`, width: `${s0}px`, height: `${s0}px` });
        layer().appendChild(p);
        jobs.push(animate(p, [{ transform: 'translate(-50%, -50%) scale(0.4)', opacity: 0.9 }, { transform: `translate(calc(-50% + ${(Math.random() - 0.5) * 60}px), calc(-50% - ${10 + Math.random() * 30}px)) scale(2)`, opacity: 0 }],
          { duration: 900, delay: 200 + Math.random() * 300, easing: 'ease-out' }).then(() => p.remove()));
      }
    }
    return done(Promise.all(jobs));
  }
  // The rest go out in one sweep of their own: [keyframes, ms, easing, transform-origin, extra burst].
  const sweep = DEATH_SWEEPS[faction];
  if (sweep) {
    const g = one();
    g.style.transformOrigin = sweep.origin ?? '50% 50%';
    sweep.extra?.(rect);
    return done(animate(g, sweep.frames, { duration: sweep.ms, easing: sweep.ease ?? 'cubic-bezier(.4,0,.6,1)' }));
  }
  host.remove();
  return null;
}

const DEATH_SWEEPS = {
  // Dissolves into a red mist.
  Vampires: { ms: 1000, frames: [
    { transform: 'scale(1)', filter: 'none', opacity: 1 },
    { transform: 'scale(1.05)', filter: 'brightness(1.3) sepia(1) saturate(6) hue-rotate(-40deg)', opacity: 0.9, offset: 0.3 },
    { transform: 'scale(1.25) translateY(-20%)', filter: 'sepia(1) saturate(8) hue-rotate(-40deg) blur(10px)', opacity: 0 }] },
  // Topples over and turns to fossil.
  Dinosaurs: { ms: 1100, origin: '80% 100%', ease: 'cubic-bezier(.5,0,.9,.5)', frames: [
    { transform: 'rotate(0)', filter: 'none', opacity: 1 },
    { transform: 'rotate(-6deg)', filter: 'sepia(0.5)', opacity: 1, offset: 0.3 },
    { transform: 'rotate(80deg) translateY(10%)', filter: 'sepia(1) grayscale(0.6) brightness(0.6)', opacity: 0 }] },
  // Glows, then melts into the floor.
  Radioactive: { ms: 1100, origin: '50% 100%', frames: [
    { transform: 'scale(1, 1)', filter: 'none', opacity: 1 },
    { transform: 'scale(1.04, 1.04)', filter: 'brightness(2.2) sepia(1) saturate(6) hue-rotate(40deg)', opacity: 1, offset: 0.3 },
    { transform: 'scale(1.3, 0.1)', filter: 'brightness(1.5) sepia(1) saturate(6) hue-rotate(40deg) blur(3px)', opacity: 0 }] },
  // Wilts with a buzz and drifts down.
  Bees: { ms: 900, frames: [
    { transform: 'translate(0, 0) rotate(0)', opacity: 1 },
    { transform: 'translate(-4px, -6px) rotate(-8deg)', opacity: 1, offset: 0.15 },
    { transform: 'translate(4px, -2px) rotate(8deg)', opacity: 1, offset: 0.3 },
    { transform: 'translate(0, 60%) rotate(30deg) scale(0.6)', filter: 'sepia(0.8) brightness(0.6)', opacity: 0 }] },
  // Folds into a spinning kaleidoscope point.
  Ultraterrestrials: { ms: 1100, ease: 'cubic-bezier(.6,0,.4,1)', frames: [
    { transform: 'rotate(0) scale(1)', filter: 'none', opacity: 1 },
    { transform: 'rotate(90deg) scale(0.9)', filter: 'hue-rotate(120deg) brightness(1.6)', opacity: 1, offset: 0.4 },
    { transform: 'rotate(540deg) scale(0)', filter: 'hue-rotate(360deg) brightness(3)', opacity: 0 }] },
  // Sinks under the sand.
  Sharks: { ms: 1000, ease: 'cubic-bezier(.6,-0.3,.8,.6)', frames: [
    { transform: 'translateY(0)', clipPath: 'inset(0 0 0 0)', opacity: 1 },
    { transform: 'translateY(-5%)', clipPath: 'inset(0 0 0 0)', opacity: 1, offset: 0.2 },
    { transform: 'translateY(90%)', clipPath: 'inset(0 0 100% 0)', filter: 'brightness(0.5)', opacity: 0.6 }],
    extra: (r) => particles({ left: r.left, top: r.top + r.height * 0.6, width: r.width, height: r.height * 0.4 }, 'Dinosaurs', 8) },
  // Dragged down into hellfire.
  Demons: { ms: 1100, origin: '50% 100%', ease: 'cubic-bezier(.6,0,.9,.5)', frames: [
    { transform: 'translateY(0) scale(1)', filter: 'none', opacity: 1 },
    { transform: 'translateY(-4%) scale(1.03)', filter: 'brightness(1.5) sepia(1) saturate(5) hue-rotate(-30deg)', opacity: 1, offset: 0.25 },
    { transform: 'translateY(60%) scale(0.8, 0.4)', filter: 'brightness(0.4) sepia(1) saturate(8) hue-rotate(-30deg)', opacity: 0 }] },
  // Ascends in golden light.
  Divine: { ms: 1300, ease: 'cubic-bezier(.4,0,.3,1)', frames: [
    { transform: 'translateY(0) scale(1)', filter: 'none', opacity: 1 },
    { transform: 'translateY(-5%) scale(1.03)', filter: 'brightness(2) sepia(0.6) saturate(2)', opacity: 1, offset: 0.35 },
    { transform: 'translateY(-90%) scale(0.85)', filter: 'brightness(4) sepia(0.6) blur(4px)', opacity: 0 }] },
  // Beamed up: squeezed thin and pulled skyward.
  Aliens: { ms: 1000, origin: '50% 0%', ease: 'cubic-bezier(.7,0,.3,1)', frames: [
    { transform: 'scale(1, 1)', filter: 'none', opacity: 1 },
    { transform: 'scale(0.9, 1.05)', filter: 'brightness(1.8) sepia(1) saturate(4) hue-rotate(110deg)', opacity: 1, offset: 0.35 },
    { transform: 'translateY(-120%) scale(0.05, 1.6)', filter: 'brightness(3) sepia(1) saturate(4) hue-rotate(110deg)', opacity: 0 }] },
};

// Ultraterrestrials: a minion slips through a swirling portal Beyond Reality, and later steps back out.
function portalRing(rect, faction, { out = true } = {}) {
  const color = FACTION_COLOR[faction] ?? FACTION_COLOR.Ultraterrestrials;
  const c = center(rect);
  const size = Math.max(rect.width, rect.height) * 1.1;
  const el = document.createElement('div');
  el.className = 'fx-portal';
  el.style.setProperty('--c', color);
  Object.assign(el.style, { left: `${c.x}px`, top: `${c.y}px`, width: `${size}px`, height: `${size}px` });
  layer().appendChild(el);
  return animate(el, [
    { transform: 'translate(-50%, -50%) scale(0.1) rotate(0deg)', opacity: 0 },
    { transform: 'translate(-50%, -50%) scale(1) rotate(200deg)', opacity: 1, offset: 0.35 },
    { transform: 'translate(-50%, -50%) scale(1) rotate(420deg)', opacity: 1, offset: 0.7 },
    { transform: 'translate(-50%, -50%) scale(0) rotate(720deg)', opacity: 0 },
  ], { duration: out ? 1100 : 1000, easing: 'ease-in-out' }).then(() => el.remove());
}

export function portalOut(clone, rect, faction) {
  const host = ghostHost(rect);
  const g = clone.cloneNode(true);
  g.classList.add('fx-ghost');
  Object.assign(g.style, { position: 'fixed', left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px`, margin: '0', zIndex: '901', pointerEvents: 'none', animation: 'none' });
  host.appendChild(g);
  const ring = portalRing(rect, faction);
  const pull = animate(g, [
    { transform: 'rotate(0) scale(1)', filter: 'none', opacity: 1 },
    { transform: 'rotate(0) scale(1)', filter: 'brightness(1.6) hue-rotate(60deg)', opacity: 1, offset: 0.3 },
    { transform: 'rotate(360deg) scale(0)', filter: 'brightness(3) hue-rotate(240deg)', opacity: 0 },
  ], { duration: 1000, easing: 'cubic-bezier(.6,0,.6,1)' });
  return Promise.all([ring, pull]).then(() => host.remove(), () => host.remove());
}

export function portalIn(el, faction) {
  if (!el) return Promise.resolve();
  const ring = portalRing(el.getBoundingClientRect(), faction, { out: false });
  particles(el.getBoundingClientRect(), 'Ultraterrestrials', 10);
  const step = animate(el, [
    { transform: 'rotate(-360deg) scale(0)', filter: 'brightness(3) hue-rotate(240deg)', opacity: 0 },
    { transform: 'rotate(-360deg) scale(0)', filter: 'brightness(3) hue-rotate(240deg)', opacity: 0, offset: 0.3 },
    { transform: 'rotate(0) scale(1.08)', filter: 'brightness(1.6) hue-rotate(60deg)', opacity: 1, offset: 0.8 },
    { transform: 'rotate(0) scale(1)', filter: 'none', opacity: 1 },
  ], { duration: 1000, easing: 'cubic-bezier(.3,.6,.4,1)', fill: 'none' });
  return Promise.all([ring, step]);
}

// End-of-turn Burn scorching a character: flames lick up and embers fly.
export function burnTick(rect, dmg = 1) {
  const el = document.createElement('div');
  el.className = 'fx-burntick';
  Object.assign(el.style, { left: `${rect.left - rect.width * 0.15}px`, top: `${rect.top + rect.height * 0.1}px`, width: `${rect.width * 1.3}px`, height: `${rect.height}px` });
  layer().appendChild(el);
  animate(el, [
    { transform: 'scaleY(0.2)', opacity: 0 },
    { transform: 'scaleY(1.1)', opacity: 1, offset: 0.3 },
    { transform: 'scaleY(0.9) translateY(-8%)', opacity: 0.9, offset: 0.6 },
    { transform: 'scaleY(1.2) translateY(-20%)', opacity: 0 },
  ], { duration: 900, easing: 'ease-out' }).then(() => el.remove());
  fling(rect, '🔥', Math.min(5, 1 + dmg), { rise: 0.8, spread: 0.7, size: 22, duration: 900 });
  return particles(rect, 'Dragons', 4 + dmg * 2);
}

export function heroHit(el) {
  if (!el) return Promise.resolve();
  const layers = el.classList?.contains('portrait-img') ? [...el.parentElement.querySelectorAll('.portrait-img')] : [el];
  return Promise.all(layers.map((l) => animate(l, [
    { filter: 'none' },
    { filter: 'brightness(1.5) sepia(1) saturate(6) hue-rotate(-50deg)', offset: 0.25 },
    { filter: 'none' },
  ], { duration: 420, fill: 'none' })));
}

// ---- Mushrooms (Fungus) ----------------------------------------------------------------

// One mushroom glyph that arcs from a to b (spinning a little), then removes itself.
function mushroomArc(a, b, { size = 26, delay = 0, duration = 700, lift = 90, endScale = 0.5 } = {}) {
  const el = document.createElement('div');
  el.className = 'fx-glyph fx-mushroom';
  setGlyph(el, '🍄');
  Object.assign(el.style, { left: `${a.x}px`, top: `${a.y}px`, fontSize: `${size}px` });
  layer().appendChild(el);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const spin = (Math.random() - 0.5) * 120;
  return done(el, animate(el, [
    { transform: 'translate(-50%, -50%) scale(0.2) rotate(0deg)', opacity: 0 },
    { transform: 'translate(-50%, -50%) scale(1.15) rotate(0deg)', opacity: 1, offset: 0.15 },
    { transform: `translate(calc(-50% + ${dx * 0.5}px), calc(-50% + ${dy * 0.5 - lift}px)) scale(1) rotate(${spin / 2}deg)`, opacity: 1, offset: 0.55 },
    { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(${endScale}) rotate(${spin}deg)`, opacity: 1 },
  ], { duration, delay, easing: 'cubic-bezier(.35,.1,.45,1)' }));
}

// Mushrooms are placed in a deck: they hop from the caster into the deck pile, which
// shudders and glows purple as each one sinks in.
export function mushroomsToDeck(fromRect, pileEl, count = 1) {
  if (!pileEl) return Promise.resolve();
  const to = center(pileEl.getBoundingClientRect());
  const from = fromRect ? center(fromRect) : { x: to.x, y: to.y - 160 };
  const n = Math.max(1, Math.min(6, count));
  const jobs = [];
  for (let i = 0; i < n; i++) {
    const jitter = { x: to.x + (Math.random() - 0.5) * 24, y: to.y + (Math.random() - 0.5) * 16 };
    jobs.push(mushroomArc(from, jitter, { delay: i * 140, lift: 70 + Math.random() * 60 }).then(() => {
      spores(jitter, 46, 2);
      return animate(pileEl, [{ transform: 'scale(1)', filter: 'none' }, { transform: 'scale(1.08) rotate(-2deg)', filter: 'drop-shadow(0 0 12px #c98cff) brightness(1.2)', offset: 0.4 }, { transform: 'scale(1)', filter: 'none' }], { duration: 320, fill: 'none' });
    }));
  }
  return Promise.all(jobs);
}

// Mushrooms burst from a drawn card: they pop up out of the deck, fly at the Hero and
// explode there one after another in purple spore blasts.
export function mushroomBurst(pileEl, heroEl, count = 1) {
  const pr = pileEl?.getBoundingClientRect();
  const hr = heroEl?.getBoundingClientRect();
  if (!pr || !hr) return Promise.resolve();
  const from = center(pr);
  const hit = center(hr);
  const n = Math.max(1, Math.min(6, count));
  const size = Math.max(hr.width, 60);
  const jobs = [animate(pileEl, [{ transform: 'scale(1)' }, { transform: 'scale(1.12)', filter: 'drop-shadow(0 0 14px #c98cff)', offset: 0.3 }, { transform: 'scale(1)' }], { duration: 420, fill: 'none' })];
  for (let i = 0; i < n; i++) {
    const t = { x: hit.x + (Math.random() - 0.5) * hr.width * 0.4, y: hit.y + (Math.random() - 0.5) * hr.height * 0.3 };
    jobs.push(mushroomArc(from, t, { size: 30, delay: 120 + i * 180, duration: 620, lift: 120, endScale: 1.3 }).then(() => Promise.all([
      bigGlyph(t, '💥', size * 0.6, { duration: 520 }),
      glowBall(t, size * 0.9, '#e8c8ff', '#7a3ac8', { duration: 560 }),
      ring(t, size, '#c98cff', { width: 3, duration: 520 }),
      spores(t, size * 0.9, 4),
      shake(heroEl, 7),
    ])));
  }
  return Promise.all(jobs);
}

// Cards you draw: each one is swiped off the top of your deck face-down, turns over into a
// big preview in the middle of the screen, stays there for about 2 seconds (tap to skip),
// then shrinks into its place in your hand. Several cards drawn at once are shown side by side.
//   items: [{ el: the card in the hand, html: its big card }]
export async function drawShow(items, from, backUrl, { hold = 2000 } = {}) {
  if (!items.length) return;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const gap = 18;
  let h = Math.min(vh * 0.52, 420);
  let w = h * 0.711;
  const fit = (vw - 32 - gap * (items.length - 1)) / items.length;
  if (w > fit) { w = fit; h = w / 0.711; }
  const total = items.length * w + (items.length - 1) * gap;
  const top = vh * 0.46 - h / 2;

  const wraps = items.map((it, i) => {
    const wrap = document.createElement('div');
    wrap.className = 'fx-draw-show';
    Object.assign(wrap.style, { left: `${(vw - total) / 2 + i * (w + gap)}px`, top: `${top}px`, width: `${w}px`, height: `${h}px` });
    wrap.innerHTML = `<div class="card df-front" style="width:100%;height:100%;margin:0">${it.html}</div><div class="df-back"></div>`;
    setBacks(wrap.querySelector('.df-back'), backUrl);
    layer().appendChild(wrap);
    fitAllText(wrap);
    return wrap;
  });
  const fromC = { x: from.left + from.width / 2, y: from.top + from.height / 2, s: Math.max(0.15, from.width / w) };
  // 1) Off the top of the deck, turning face-up on the way.
  await Promise.all(wraps.map((wrap, i) => {
    const r = wrap.getBoundingClientRect();
    const dx = fromC.x - (r.left + r.width / 2);
    const dy = fromC.y - (r.top + r.height / 2);
    return animate(wrap, [
      { transform: `translate(${dx}px, ${dy}px) rotateY(180deg) rotate(-8deg) scale(${fromC.s})`, opacity: 1 },
      { transform: `translate(${dx * 0.55}px, ${dy * 0.55 - 30}px) rotateY(150deg) rotate(-4deg) scale(${(fromC.s + 1) / 2})`, offset: 0.35 },
      { transform: 'translate(0, 0) rotateY(0deg) rotate(0deg) scale(1)', opacity: 1 },
    ], { duration: 700, delay: i * 140, easing: 'cubic-bezier(.25,.8,.25,1)' });
  }));
  // 2) Hold so it can be read; a tap (anywhere) moves on.
  await new Promise((resolve) => {
    const done = () => { clearTimeout(t); document.removeEventListener('pointerdown', done, true); resolve(); };
    const t = setTimeout(done, hold * speed());
    document.addEventListener('pointerdown', done, true);
  });
  // 3) Into the hand.
  await Promise.all(wraps.map((wrap, i) => {
    const r = wrap.getBoundingClientRect();
    const to = items[i].el.getBoundingClientRect();
    const dx = to.left + to.width / 2 - (r.left + r.width / 2);
    const dy = to.top + to.height / 2 - (r.top + r.height / 2);
    const s = to.width / r.width;
    return animate(wrap, [
      { transform: 'translate(0, 0) scale(1)', opacity: 1 },
      { transform: `translate(${dx}px, ${dy}px) scale(${s})`, opacity: 1 },
    ], { duration: 420, delay: i * 80, easing: 'cubic-bezier(.5,0,.3,1)' });
  }));
  wraps.forEach((wrap) => wrap.remove());
}
