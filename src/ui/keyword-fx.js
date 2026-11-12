// Keyword animations: one look per keyword or status, played from what the move really did (the
// engine's fx trace, see core.js traceFx). Each runs wind-up → action → impact → recovery and cleans
// up after itself (every element goes through done()/remove). Rects come from the board as it was
// (a minion that died is animated where it stood) or as it is now (a minion that just arrived).
import { addFx, animate, bigGlyph, box, cauldronBubbles, center, column, done, drain, fling, glowBall, hexSmoke, layer, ring, screenShake, slashes, wait } from './fx.js';

const sizeOf = (r) => Math.max(r.width, r.height);
// Glyph size: a share of the minion, but never too small to read on a phone.
const gsz = (r, k) => Math.max(24, sizeOf(r) * k);

// A small blob of colour that travels from one spot to another along an arc (venom, poison, sparks).
function arcShot(from, to, color, { size = 16, duration = 420, lift = 60, delay = 0, cls = 'fx-drain' } = {}) {
  const a = center(from), b = center(to);
  const el = addFx(cls, { left: `${a.x}px`, top: `${a.y}px`, width: `${size}px`, height: `${size}px`, background: color, boxShadow: `0 0 12px ${color}` });
  return done(el, animate(el, [
    { transform: 'translate(-50%, -50%) scale(0.5)', opacity: 0 },
    { transform: `translate(calc(-50% + ${(b.x - a.x) / 2}px), calc(-50% + ${(b.y - a.y) / 2 - lift}px)) scale(1.1)`, opacity: 1, offset: 0.5 },
    { transform: `translate(calc(-50% + ${b.x - a.x}px), calc(-50% + ${b.y - a.y}px)) scale(0.8)`, opacity: 1 },
  ], { duration, delay, easing: 'cubic-bezier(.3,.1,.5,1)' }));
}
// A tinted wash over a minion card (it flashes the colour, then returns to normal).
function tint(el, filter, duration = 600) {
  if (!el) return Promise.resolve();
  return animate(el, [{ filter: 'none' }, { filter, offset: 0.35 }, { filter: 'none' }], { duration, easing: 'ease-in-out', fill: 'none' });
}
// A shaped overlay (hexagon ward, smoke puff, scan line) from CSS.
function shape(cls, rect, scale = 1, style = {}) {
  const c = center(rect);
  return addFx(cls, { ...box(c, sizeOf(rect) * scale), ...style });
}

// ---- Core keywords ----------------------------------------------------------------------

// Lifesteal: red life pulled out of what it hit, streaming into its Hero, who glows.
export function lifesteal(fromRect, heroRect, amount = 1) {
  if (!fromRect || !heroRect) return Promise.resolve();
  const c = center(fromRect);
  return Promise.all([
    glowBall(c, sizeOf(fromRect) * 0.7, '#ff4a6a', '#a0103088', { duration: 420 }),
    drain(c, heroRect, '#ff3a5a', Math.min(18, 6 + amount * 2)),
    wait(650).then(() => Promise.all([
      ring(center(heroRect), sizeOf(heroRect) * 0.9, '#ff6a8a', { width: 4, to: 1.4, duration: 520 }),
      glowBall(center(heroRect), sizeOf(heroRect) * 0.9, '#ff9ab0', '#ff3a5a55', { duration: 520 }),
    ])),
  ]);
}

// Venomous: green venom sprays from the attacker onto the victim, which turns sickly before it dies.
export function venom(srcRect, targetRect, targetEl) {
  if (!targetRect) return Promise.resolve();
  const c = center(targetRect);
  const jobs = [];
  if (srcRect) for (let i = 0; i < 3; i++) jobs.push(arcShot(srcRect, targetRect, '#6aff3a', { size: 12, duration: 300, lift: 30 + i * 12, delay: i * 50 }));
  jobs.push(wait(300).then(() => Promise.all([
    glowBall(c, sizeOf(targetRect), '#7aff4a', '#1a6a1088', { duration: 620 }),
    bigGlyph(c, '☠', gsz(targetRect, 0.45), { duration: 800 }),
    fling(targetRect, '💧', 6, { rise: 0.4, spread: 0.7, size: 14, duration: 700 }),
    tint(targetEl, 'hue-rotate(70deg) saturate(2) brightness(0.8)', 500),
  ])));
  return Promise.all(jobs);
}

// Poisonous: as it dies, a purple cloud bursts out and a stream of poison chases its killer.
export function poison(srcRect, killerRect, killerEl) {
  if (!srcRect || !killerRect) return Promise.resolve();
  const a = center(srcRect), b = center(killerRect);
  return Promise.all([
    glowBall(a, sizeOf(srcRect) * 1.2, '#b45aff', '#4a107a88', { duration: 700 }),
    fling(srcRect, '🫧', 6, { rise: 0.6, spread: 1, size: 16, duration: 800 }),
    drain(a, killerRect, '#c06aff', 12),
    wait(650).then(() => Promise.all([
      bigGlyph(b, '☠', gsz(killerRect, 0.45), { duration: 800 }),
      ring(b, sizeOf(killerRect), '#b45aff', { width: 5, to: 1.5, duration: 560 }),
      tint(killerEl, 'hue-rotate(220deg) saturate(1.8) brightness(0.8)', 520),
    ])),
  ]);
}

// Rage: the minion shudders, flushes red and a 💢 bursts above it.
export function rage(el, rect) {
  if (!rect) return Promise.resolve();
  const c = center(rect);
  return Promise.all([
    el ? animate(el, [{ transform: 'translateX(0)' }, { transform: 'translateX(-4%) scale(1.06)' }, { transform: 'translateX(4%) scale(1.06)' }, { transform: 'translateX(-2%)' }, { transform: 'none' }], { duration: 380, fill: 'none' }) : null,
    tint(el, 'sepia(1) saturate(4) hue-rotate(-30deg) brightness(1.1)', 520),
    bigGlyph({ x: c.x, y: c.y - rect.height * 0.45 }, '💢', gsz(rect, 0.32), { duration: 700 }),
  ]);
}

// Devour: jaws close over the spot of its kill and the minion swells.
export function devour(el, rect) {
  if (!rect) return Promise.resolve();
  const c = center(rect);
  return Promise.all([
    bigGlyph({ x: c.x, y: c.y - rect.height * 0.2 }, '😋', gsz(rect, 0.36), { duration: 700 }),
    el ? animate(el, [{ transform: 'scale(1)' }, { transform: 'scale(1.18)', offset: 0.4 }, { transform: 'scale(1)' }], { duration: 520, easing: 'cubic-bezier(.2,.9,.3,1.3)', fill: 'none' }) : null,
    ring(c, sizeOf(rect), '#7dff6a', { width: 4, to: 1.4, duration: 520 }),
  ]);
}

// Spell Ward: a glowing hexagon flares around the minion as the spell hits it, then cracks apart.
export async function spellWard(rect) {
  if (!rect) return;
  const ward = shape('fx-kw-ward', rect, 1.25);
  await animate(ward, [{ transform: 'scale(0.6)', opacity: 0 }, { transform: 'scale(1.05)', opacity: 1 }], { duration: 220, easing: 'cubic-bezier(.2,.9,.3,1.3)' });
  await Promise.all([
    animate(ward, [{ transform: 'scale(1.05)', opacity: 1, filter: 'brightness(2)' }, { transform: 'scale(1.3)', opacity: 0, filter: 'brightness(1)' }], { duration: 480, easing: 'ease-out' }),
    fling(rect, '✦', 8, { rise: 0.3, spread: 1.1, size: 14, duration: 600 }),
  ]);
  ward.remove();
}

// Evade: the hit misses: a "Miss!" and the minion side-steps.
export function evade(el, rect) {
  if (!rect) return Promise.resolve();
  const c = center(rect);
  return Promise.all([
    el ? animate(el, [{ transform: 'none' }, { transform: 'translateX(-14%) rotate(-6deg)', offset: 0.35 }, { transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.2,.9,.3,1)', fill: 'none' }) : null,
    bigGlyph({ x: c.x + rect.width * 0.25, y: c.y - rect.height * 0.35 }, 'Miss!', gsz(rect, 0.2), { duration: 760, cls: 'fx-kw-miss' }),
  ]);
}

// Stealth lost (it attacked): the smoke around it bursts outward and it comes into the open.
export function stealthLost(el, rect) {
  if (!rect) return Promise.resolve();
  const jobs = [];
  for (let i = 0; i < 6; i++) {
    const p = shape('fx-kw-smoke', rect, 0.55);
    const a = (i / 6) * Math.PI * 2;
    jobs.push(done(p, animate(p, [
      { transform: 'translate(0, 0) scale(0.8)', opacity: 0.85 },
      { transform: `translate(${Math.cos(a) * rect.width * 0.7}px, ${Math.sin(a) * rect.height * 0.5}px) scale(1.6)`, opacity: 0 },
    ], { duration: 650, easing: 'ease-out' })));
  }
  if (el) jobs.push(animate(el, [{ opacity: 0.55, filter: 'brightness(0.6)' }, { opacity: 1, filter: 'none' }], { duration: 500, fill: 'none' }));
  return Promise.all(jobs);
}

// Silence: a grey hush ripples in and drains the colour out of it for a moment.
export function silenced(el, rect) {
  if (!rect) return Promise.resolve();
  const c = center(rect);
  return Promise.all([
    ring(c, sizeOf(rect) * 1.6, '#c8c8d0', { width: 3, from: 1.2, to: 0.4, duration: 520 }),
    ring(c, sizeOf(rect) * 1.2, '#9a9aa8', { width: 2, from: 1.1, to: 0.3, duration: 520, delay: 120 }),
    tint(el, 'grayscale(1) brightness(0.8)', 800),
    bigGlyph(c, '🔇', gsz(rect, 0.32), { duration: 760, delay: 300 }),
  ]);
}

// Cleanse: a gentle light washes down over it and harmful effects lift away as sparkles.
export function cleansed(rect) {
  if (!rect) return Promise.resolve();
  const c = center(rect);
  return Promise.all([
    column(c, rect, ['#fffbe0', '#bfe8ff'], { duration: 620 }),
    fling(rect, '✧', 7, { rise: 1.2, spread: 0.6, size: 14, duration: 800 }),
  ]);
}

// Reborn: a pale spirit column rises where it fell and it reforms inside a halo.
export function reborn(el, rect) {
  if (!rect) return Promise.resolve();
  const c = center(rect);
  return Promise.all([
    column(c, rect, ['#e8f4ff', '#9ad0ff'], { up: true, duration: 760 }),
    ring({ x: c.x, y: c.y - rect.height * 0.45 }, sizeOf(rect) * 0.5, '#fff6c8', { width: 3, from: 0.6, to: 1.2, duration: 700 }),
    el ? animate(el, [{ opacity: 0, filter: 'brightness(2.5) saturate(0)' }, { opacity: 1, filter: 'brightness(1.4)', offset: 0.6 }, { opacity: 1, filter: 'none' }], { duration: 760, fill: 'none' }) : null,
  ]);
}

// Overheal (Bonus Health): a golden heart pulse, and the Health swells past its old maximum.
export function overheal(rect) {
  if (!rect) return Promise.resolve();
  const c = center(rect);
  return Promise.all([
    ring(c, sizeOf(rect), '#ffe08a', { width: 4, to: 1.5, duration: 600 }),
    bigGlyph({ x: c.x, y: c.y + rect.height * 0.2 }, '💛', gsz(rect, 0.28), { duration: 720 }),
  ]);
}

// Recoil: the attacker is jolted back by its own blow: an orange impact ring, sparks and a ↩.
export function recoil(el, rect) {
  if (!rect) return Promise.resolve();
  const c = center(rect);
  return Promise.all([
    el ? animate(el, [{ transform: 'none' }, { transform: 'translateY(10%) scale(0.92)', offset: 0.3 }, { transform: 'none' }], { duration: 420, fill: 'none' }) : null,
    ring(c, sizeOf(rect) * 0.9, '#ff9a3a', { width: 5, from: 0.5, to: 1.3, duration: 460 }),
    fling(rect, '✶', 8, { rise: 0.3, spread: 0.9, size: 16, duration: 560 }),
    bigGlyph({ x: c.x + rect.width * 0.3, y: c.y - rect.height * 0.3 }, '↩', gsz(rect, 0.3), { duration: 640, cls: 'fx-kw-recoil' }),
    tint(el, 'sepia(0.6) saturate(2) brightness(1.2)', 420),
  ]);
}

// Blind: the attack was redirected: a crooked streak from where it aimed to what it really hit.
export function blindSwerve(fromRect, aimedRect, hitRect) {
  if (!fromRect || !hitRect) return Promise.resolve();
  const c = center(fromRect);
  return Promise.all([
    bigGlyph({ x: c.x, y: c.y - fromRect.height * 0.5 }, '🙈', gsz(fromRect, 0.3), { duration: 700 }),
    aimedRect ? arcShot(aimedRect, hitRect, '#ffe39a', { size: 10, duration: 380, lift: -40 }) : null,
  ]);
}

// Armor: plates snap onto the Hero with a steel shimmer and a +N.
export function armorGained(rect, amount) {
  if (!rect) return Promise.resolve();
  const c = center(rect);
  return Promise.all([
    ring(c, sizeOf(rect) * 0.95, '#c8d8e8', { width: 6, from: 1.4, to: 0.95, duration: 420 }),
    bigGlyph(c, `🛡+${amount}`, gsz(rect, 0.2), { duration: 760 }),
  ]);
}

// Gaining a keyword with no layer of its own: a buff rises golden; a weakness drips down in violet.
const KW_LOOK = {
  lifesteal: ['🩸', false], poisonous: ['☠', false], venomous: ['🐍', false], rage: ['💢', false], devour: ['😋', false],
  reborn: ['👼', false], 'spell-ward': ['🔷', false], charge: ['⚡', false], rush: ['💨', false], 'thick-fur': ['🧣', false],
  hardy: ['🪨', false], 'acid-hide': ['🧪', false],
  blind: ['🙈', true], recoil: ['↩', true], burned: ['♨', true], silenced: ['🔇', true],
};
export function keywordGained(el, kw) {
  const look = KW_LOOK[kw];
  if (!el || !look) return null;
  const rect = el.getBoundingClientRect();
  const c = center(rect);
  const [glyph, bad] = look;
  const color = bad ? '#a070ff' : '#ffd56a';
  return Promise.all([
    ring(c, sizeOf(rect), color, { width: 3, from: bad ? 1.4 : 0.4, to: bad ? 0.6 : 1.4, duration: 520 }),
    bigGlyph({ x: c.x, y: c.y + (bad ? 0.15 : -0.35) * rect.height }, glyph, gsz(rect, 0.3), { duration: 720 }),
    tint(el, bad ? 'saturate(0.4) brightness(0.8) hue-rotate(220deg)' : 'brightness(1.4) saturate(1.3)', 520),
  ]);
}

// ---- Realm statuses ------------------------------------------------------------------------

// Implant (Aliens): an alien egg drops onto it, squashes into it in a green glow and leaves a slime ring.
// Implant (Hive Brood): a facehugger leaps from the implanter (or from the attacker's side of the board),
// lands on the minion, clamps its legs and tail round it, then sinks in with a sickly green pulse.
const HUGGER_LEFT = [[40, 30, 22, 12, 14, 2], [39, 37, 14, 26, 2, 24], [39, 44, 14, 46, 4, 58], [40, 50, 22, 64, 16, 80]];
const HUGGER_LEGS = HUGGER_LEFT.flatMap(([x0, y0, qx, qy, x1, y1]) => [
  `M${x0} ${y0} Q${qx} ${qy} ${x1} ${y1}`, `M${100 - x0} ${y0} Q${100 - qx} ${qy} ${100 - x1} ${y1}`,
]);
const HUGGER_SVG = `<svg viewBox="0 0 100 130" width="100%" height="100%" style="overflow:visible">
  <g class="hug-legs" fill="none" stroke="#6b5636" stroke-width="3.6" stroke-linecap="round">${HUGGER_LEGS.map((d) => `<path d="${d}"/>`).join('')}</g>
  <g class="hug-legs" fill="none" stroke="#d8c49a" stroke-width="1.6" stroke-linecap="round">${HUGGER_LEGS.map((d) => `<path d="${d}"/>`).join('')}</g>
  <path class="hug-tail" d="M50 58 C50 80 44 92 34 100 C22 110 30 124 44 118 C58 112 66 100 56 94 C48 90 44 100 50 104" fill="none" stroke="#6b5636" stroke-width="7" stroke-linecap="round"/>
  <path class="hug-tail" d="M50 58 C50 80 44 92 34 100 C22 110 30 124 44 118 C58 112 66 100 56 94 C48 90 44 100 50 104" fill="none" stroke="#c9b48a" stroke-width="4" stroke-linecap="round" stroke-dasharray="3 2"/>
  <ellipse cx="36" cy="50" rx="8" ry="7" fill="#b9a276" stroke="#5a4a2e" stroke-width="1.5"/>
  <ellipse cx="64" cy="50" rx="8" ry="7" fill="#b9a276" stroke="#5a4a2e" stroke-width="1.5"/>
  <ellipse cx="50" cy="40" rx="13" ry="18" fill="#cdb98e" stroke="#5a4a2e" stroke-width="2"/>
  <path d="M39 32 H61 M38 38 H62 M38 44 H62 M39 50 H61" stroke="#7a6640" stroke-width="1.4"/>
  <path d="M50 22 V58" stroke="#7a6640" stroke-width="1.2"/>
  <ellipse cx="45" cy="30" rx="3" ry="5" fill="#fff6" />
</svg>`;
export async function implanted(el, rect, fromRect) {
  if (!rect) return;
  const c = center(rect);
  const size = Math.max(46, sizeOf(rect) * 0.78);
  // Wind-up: it appears at the implanter, or just off the board edge facing the victim.
  const top = c.y < window.innerHeight / 2;
  const a = fromRect ? center(fromRect) : { x: c.x + rect.width * 0.6, y: c.y + (top ? 1 : -1) * rect.height * 2.2 };
  const hug = addFx('fx-kw-hugger', box(a, size, size * 1.3));
  hug.innerHTML = HUGGER_SVG;
  const legs = [...hug.querySelectorAll('.hug-legs')];
  const tail = [...hug.querySelectorAll('.hug-tail')];
  const dx = c.x - a.x, dy = c.y - a.y - rect.height * 0.08;
  const tilt = Math.max(-35, Math.min(35, dx / 6));
  await animate(hug, [
    { transform: 'translate(0,0) scale(0.35) rotate(0deg)', opacity: 0 },
    { transform: 'translate(0,0) scale(0.8, 0.6) rotate(0deg)', opacity: 1, offset: 0.25 },
  ], { duration: 150, easing: 'ease-out' });
  // Action: the leap, legs flared wide.
  legs.forEach((g) => animate(g, [{ transform: 'scale(1)' }, { transform: 'scale(1.25)' }], { duration: 480, fill: 'forwards' }));
  await animate(hug, [
    { transform: 'translate(0,0) scale(0.8, 0.6) rotate(0deg)' },
    { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - rect.height * 0.7}px) scale(1.15) rotate(${tilt}deg)`, offset: 0.5 },
    { transform: `translate(${dx}px, ${dy}px) scale(1) rotate(0deg)` },
  ], { duration: 440, easing: 'cubic-bezier(.35,.1,.55,1)', fill: 'forwards' });
  // Impact: it slaps onto the minion, legs clench, tail coils, the card shudders.
  legs.forEach((g) => animate(g, [{ transform: 'scale(1.25)' }, { transform: 'scale(0.72, 0.85)' }], { duration: 220, easing: 'cubic-bezier(.2,.9,.3,1.2)', fill: 'forwards' }));
  tail.forEach((g) => animate(g, [{ transform: 'scale(1) rotate(0deg)' }, { transform: 'scale(0.8) rotate(-18deg)' }], { duration: 300, fill: 'forwards' }));
  const at = `translate(${dx}px, ${dy}px)`;
  await Promise.all([
    animate(hug, [{ transform: `${at} scale(1)` }, { transform: `${at} scale(1.2, 0.8)`, offset: 0.35 }, { transform: `${at} scale(1)` }], { duration: 300, fill: 'forwards' }),
    el ? animate(el, [{ transform: 'translate(0,0)' }, { transform: 'translate(-4px, 2px)' }, { transform: 'translate(4px, -2px)' }, { transform: 'translate(-2px, 1px)' }, { transform: 'translate(0,0)' }], { duration: 320, fill: 'none' }) : null,
    ring(c, sizeOf(rect) * 0.7, '#c9b48a', { width: 3, to: 1.3, duration: 360 }),
  ]);
  // Hold: it grips and pulses (implanting).
  await Promise.all([
    animate(hug, [{ transform: `${at} scale(1)` }, { transform: `${at} scale(1.06, 0.94)` }, { transform: `${at} scale(1)` }, { transform: `${at} scale(1.06, 0.94)` }, { transform: `${at} scale(1)` }], { duration: 560, fill: 'forwards' }),
    tint(el, 'hue-rotate(80deg) saturate(1.5) brightness(0.85)', 560),
  ]);
  // Recovery: it lets go and dissolves into the host, which flushes alien green.
  await Promise.all([
    done(hug, animate(hug, [{ transform: `${at} scale(1)`, opacity: 1 }, { transform: `${at} scale(0.6)`, opacity: 0 }], { duration: 380, easing: 'ease-in' })),
    glowBall(c, sizeOf(rect), '#5affd8', '#1a8a6a88', { duration: 520 }),
    ring(c, sizeOf(rect) * 0.9, '#5affd8', { width: 5, to: 1.4, duration: 520 }),
    tint(el, 'hue-rotate(110deg) saturate(1.6)', 600),
  ]);
}

// Chestburster: the host's spot splits open in a red burst and the newborn pops out on the other side.
export function chestburst(hostRect, newEl) {
  const jobs = [];
  if (hostRect) {
    const c = center(hostRect);
    jobs.push(glowBall(c, sizeOf(hostRect) * 1.1, '#ff3a3a', '#5a0a0a88', { duration: 520 }));
    jobs.push(fling(hostRect, '🩸', 8, { rise: 0.8, spread: 1.1, size: 14, duration: 700 }));
    jobs.push(screenShake(document.querySelector('.arena') ?? document.body, 6));
    if (newEl) jobs.push(arcShot(hostRect, newEl.getBoundingClientRect(), '#5affd8', { size: 18, duration: 480, lift: 90 }));
  }
  if (newEl) jobs.push(wait(420).then(() => animate(newEl, [{ transform: 'scale(0.2)', opacity: 0 }, { transform: 'scale(1.2)', opacity: 1, offset: 0.6 }, { transform: 'scale(1)', opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.2,.9,.3,1.3)', fill: 'none' })));
  return Promise.all(jobs);
}

// Evolve (Aliens): it curls into a cocoon pulse and unfolds as its Xeno.
export function evolved(el, rect) {
  if (!rect) return Promise.resolve();
  const c = center(rect);
  return Promise.all([
    el ? animate(el, [{ transform: 'scale(1)' }, { transform: 'scale(0.75)', filter: 'brightness(0.4) hue-rotate(110deg)', offset: 0.4 }, { transform: 'scale(1.15)', filter: 'brightness(1.8)', offset: 0.7 }, { transform: 'scale(1)', filter: 'none' }], { duration: 900, fill: 'none' }) : null,
    wait(380).then(() => ring(c, sizeOf(rect) * 1.2, '#5affd8', { width: 6, to: 1.8, duration: 600 })),
    wait(380).then(() => slashes(c, rect, -35, '#5affd8', '#1a8a6a', { count: 3 })),
  ]);
}

// Infect (Zombies): a green cloud of virus settles into it and it turns sickly.
export function infected(el, rect) {
  if (!rect) return Promise.resolve();
  const c = center(rect);
  return Promise.all([
    glowBall(c, sizeOf(rect) * 1.1, '#9cff4a', '#2a6a1088', { duration: 640 }),
    bigGlyph(c, '🦠', gsz(rect, 0.4), { duration: 760 }),
    fling(rect, '🦠', 6, { rise: 0.5, spread: 0.8, size: 15, duration: 760 }),
    tint(el, 'hue-rotate(60deg) saturate(1.8) brightness(0.85)', 760),
  ]);
}

// Haunt (Ghosts): it rises out of the floor as a pale wisp and becomes solid.
export function haunted(el) {
  if (!el) return Promise.resolve();
  const rect = el.getBoundingClientRect();
  return Promise.all([
    animate(el, [{ transform: 'translateY(30%)', opacity: 0, filter: 'grayscale(1) brightness(1.8) blur(2px)' }, { transform: 'translateY(-4%)', opacity: 0.7, filter: 'grayscale(0.6) brightness(1.5)', offset: 0.6 }, { transform: 'none', opacity: 1, filter: 'none' }], { duration: 900, easing: 'ease-out', fill: 'none' }),
    fling(rect, '👻', 3, { rise: 1, spread: 0.6, size: 16, duration: 900 }),
  ]);
}

// Radiation applied: green rings pulse outward from it (it drains everything around it).
export function irradiated(rect) {
  if (!rect) return Promise.resolve();
  const c = center(rect);
  return Promise.all([0, 1, 2].map((i) => ring(c, sizeOf(rect) * (1 + i * 0.5), '#a8ff3a', { width: 3, to: 2.2, duration: 800, delay: i * 160 }))
    .concat([bigGlyph(c, '☢', gsz(rect, 0.35), { duration: 800 })]));
}

// Holy Flame applied: a column of gold fire comes down on it.
export function holyFlame(rect) {
  if (!rect) return Promise.resolve();
  const c = center(rect);
  return Promise.all([
    column(c, rect, ['#fff2b0', '#ffb43a'], { duration: 640 }),
    fling(rect, '✨', 6, { rise: 0.8, spread: 0.7, size: 14, duration: 760 }),
  ]);
}

// Reduced to Ash / Obliterated: it crumbles into rising ash (gold) or a green-white flash (Radiation).
export function ashed(rect, holy = true) {
  if (!rect) return Promise.resolve();
  const c = center(rect);
  return Promise.all([
    glowBall(c, sizeOf(rect) * 1.1, holy ? '#fff2b0' : '#e8ffd0', holy ? '#ff9a3a66' : '#a8ff3a66', { duration: 640 }),
    fling(rect, holy ? '·' : '☢', 14, { rise: 1.4, spread: 0.6, size: holy ? 22 : 12, duration: 1000 }),
  ]);
}

// Burrow: it sinks into the sand in a puff of dust. Surface: it bursts back up through it.
export function burrowed(el, rect) {
  if (!rect) return Promise.resolve();
  return Promise.all([
    el ? animate(el, [{ transform: 'translateY(0)', clipPath: 'inset(0 0 0 0)' }, { transform: 'translateY(25%)', clipPath: 'inset(0 0 25% 0)', offset: 0.6 }, { transform: 'none', clipPath: 'inset(0 0 0 0)' }], { duration: 700, fill: 'none' }) : null,
    fling({ ...rect.toJSON?.() ?? rect, top: rect.top + rect.height * 0.5 }, '•', 12, { rise: 0.3, spread: 1.2, size: 10, duration: 700 }),
  ]);
}
export function surfaced(el, rect) {
  if (!rect) return Promise.resolve();
  const c = center(rect);
  return Promise.all([
    el ? animate(el, [{ transform: 'translateY(30%) scale(0.9)', opacity: 0.4 }, { transform: 'translateY(-8%) scale(1.06)', opacity: 1, offset: 0.6 }, { transform: 'none', opacity: 1 }], { duration: 560, easing: 'cubic-bezier(.2,.9,.3,1.2)', fill: 'none' }) : null,
    ring({ x: c.x, y: c.y + rect.height * 0.35 }, sizeOf(rect) * 0.9, '#e0b86a', { width: 6, to: 1.8, duration: 560 }),
    fling(rect, '•', 14, { rise: 0.9, spread: 1.2, size: 10, duration: 760 }),
  ]);
}

// Discard (Void): the thrown card is swallowed by a small black hole.
export function discarded(rect) {
  if (!rect) return Promise.resolve();
  const c = center(rect);
  const hole = addFx('fx-kw-hole', box(c, sizeOf(rect) * 0.9));
  return done(hole, animate(hole, [{ transform: 'scale(0.2) rotate(0deg)', opacity: 0 }, { transform: 'scale(1) rotate(180deg)', opacity: 1, offset: 0.4 }, { transform: 'scale(0) rotate(400deg)', opacity: 0 }], { duration: 700, easing: 'ease-in-out' }));
}

// Remake (Qu): a violet scan line sweeps down it and it glitches into its new body.
export async function remade(el, rect) {
  if (!rect) return;
  const line = addFx('fx-kw-scan', { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px` });
  await Promise.all([
    done(line, animate(line, [{ transform: 'translateY(0)', opacity: 1 }, { transform: `translateY(${rect.height}px)`, opacity: 0.6 }], { duration: 520, easing: 'linear' })),
    tint(el, 'hue-rotate(260deg) saturate(2) contrast(1.4)', 600),
  ]);
}

// Weapon equipped: a blade glints onto the Hero.
export function weaponEquipped(rect) {
  if (!rect) return Promise.resolve();
  const c = center(rect);
  return Promise.all([
    slashes(c, rect, -45, '#e8eef8', '#9ab0d0', { count: 1, heavy: true }),
    bigGlyph({ x: c.x + rect.width * 0.35, y: c.y - rect.height * 0.2 }, '🗡', gsz(rect, 0.28), { duration: 760 }),
  ]);
}

// Regenerate: a green pulse from the heart of the minion and a 💚 at the start of its turn.
export function regenerated(rect) {
  if (!rect) return Promise.resolve();
  const c = center(rect);
  return Promise.all([
    glowBall(c, sizeOf(rect) * 0.9, '#9aff7a', '#2a8a2a66', { duration: 600 }),
    ring(c, sizeOf(rect), '#7dff6a', { width: 4, to: 1.4, duration: 600 }),
    bigGlyph({ x: c.x, y: c.y - rect.height * 0.3 }, '💚', gsz(rect, 0.3), { duration: 720 }),
    fling(rect, '🍃', 5, { rise: 0.7, spread: 0.6, size: 15, duration: 760 }),
  ]);
}

// ---- Eels ----------------------------------------------------------------------------
// Volts: a spark drops into the minion (wind-up), it flashes yellow (impact), and its Volt badge
// pops (recovery). Conductive: water splashes over it and it takes a cold blue sheen.
export function voltsGained(el, rect, amount = 1) {
  if (!rect) return Promise.resolve();
  const c = center(rect);
  const from = { left: rect.left + rect.width / 2, top: rect.top - rect.height * 0.6, width: 1, height: 1 };
  const badge = el?.querySelector('.volt-badge');
  return Promise.all([
    arcShot(from, rect, '#fff36a', { size: 12, duration: 260, lift: 10, cls: 'fx-drain' }),
    wait(240).then(() => Promise.all([
      ring(c, sizeOf(rect) * 0.7, '#ffe84a', { width: 3, to: 1.3, duration: 360 }),
      tint(el, 'brightness(1.5) saturate(1.4) hue-rotate(-20deg)', 380),
      amount > 1 ? bigGlyph({ x: c.x, y: c.y - rect.height * 0.35 }, `+${amount}⚡`, gsz(rect, 0.3), { duration: 700 }) : null,
      badge ? animate(badge, [{ transform: 'scale(1)' }, { transform: 'scale(1.6)', offset: 0.35 }, { transform: 'scale(1)' }], { duration: 420, fill: 'none' }) : null,
    ])),
  ]);
}
export function conductive(el, rect) {
  if (!rect) return Promise.resolve();
  const c = center(rect);
  return Promise.all([
    fling(rect, '💧', 4, { rise: 0.5, spread: 0.9, size: 14, duration: 650 }),
    ring(c, sizeOf(rect) * 0.85, '#6adcff', { width: 3, to: 1.25, duration: 460 }),
    tint(el, 'saturate(1.6) hue-rotate(-25deg) brightness(1.15)', 620),
  ]);
}
// Discharge: the minion flares white-blue and a shock ring bursts off it, just before its Chain.
export function discharged(el, rect) {
  if (!rect) return Promise.resolve();
  const c = center(rect);
  return Promise.all([
    glowBall(c, sizeOf(rect) * 1.2, '#eaffff', '#5ae8ff88', { duration: 420 }),
    ring(c, sizeOf(rect) * 0.9, '#fff36a', { width: 5, to: 1.7, duration: 420 }),
    tint(el, 'brightness(2.2) saturate(0.6)', 360),
  ]);
}
// A jagged lightning bolt between two points (an SVG over the board): it snaps in, flickers and
// fades. Two strokes: a wide cyan glow and a thin white core.
function boltPath(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len, n = Math.max(4, Math.round(len / 28));
  const pts = [[a.x, a.y]];
  for (let i = 1; i < n; i++) {
    const t = i / n, off = (Math.random() - 0.5) * Math.min(40, len * 0.18);
    pts.push([a.x + dx * t + nx * off, a.y + dy * t + ny * off]);
  }
  pts.push([b.x, b.y]);
  return pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
}
function bolt(a, b, { width = 1 } = {}) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('class', 'fx-kw-bolt');
  const d = boltPath(a, b);
  for (const [stroke, w, op] of [['#5ae8ff', 7 * width, 0.55], ['#eaffff', 2.4 * width, 1]]) {
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', d);
    path.setAttribute('stroke', stroke); path.setAttribute('stroke-width', w); path.setAttribute('opacity', op);
    path.setAttribute('fill', 'none'); path.setAttribute('stroke-linecap', 'round'); path.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(path);
  }
  // A small fork off the middle for a crackle.
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const fork = document.createElementNS(ns, 'path');
  fork.setAttribute('d', boltPath(mid, { x: mid.x + (Math.random() - 0.5) * 60, y: mid.y + (Math.random() - 0.5) * 60 }));
  fork.setAttribute('stroke', '#bff8ff'); fork.setAttribute('stroke-width', 1.5 * width); fork.setAttribute('fill', 'none'); fork.setAttribute('opacity', 0.8);
  svg.appendChild(fork);
  layer().appendChild(svg);
  return done(svg, animate(svg, [
    { opacity: 0 }, { opacity: 1, offset: 0.12 }, { opacity: 0.45, offset: 0.3 }, { opacity: 1, offset: 0.45 }, { opacity: 0 },
  ], { duration: 340, easing: 'linear' }));
}
// Chain: the bolt leaves the source (a minion, or the caster's Hero for a spell) and hops from
// target to target in order, each hop a little thinner as the Chain weakens; every target flashes.
export async function chainBolt(fromRect, hits, { delay = 0 } = {}) {
  if (!hits.length) return;
  if (delay) await wait(delay);
  let prev = fromRect ? center(fromRect) : null;
  const first = hits[0].amount || 1;
  const jobs = [];
  for (const h of hits) {
    if (!h.rect) continue;
    const c = center(h.rect);
    const w = Math.max(0.45, (h.amount || 1) / first);
    if (prev) jobs.push(bolt(prev, c, { width: w }));
    jobs.push(glowBall(c, sizeOf(h.rect) * 0.75, '#eaffff', '#5ae8ff77', { duration: 300 }));
    jobs.push(ring(c, sizeOf(h.rect) * 0.6, '#fff36a', { width: 3, to: 1.4, duration: 320 }));
    prev = c;
    await wait(120);
  }
  await Promise.all(jobs);
}

export { layer };

// ---- Witches ---------------------------------------------------------------------------
const RUNES = ['ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᚷ', 'ᚹ', 'ᚺ', 'ᛁ', 'ᛉ', 'ᛟ'];
// Runes peel off the card's border one by one (wind-up), spiral in while they burn magenta to
// emerald (action), and the card is sealed grey in a puff of violet smoke (impact, recovery).
function runeSwirl(rect, { count = 12, inward = true, duration = 720, delay = 0 } = {}) {
  const c = center(rect);
  const jobs = [];
  for (let i = 0; i < count; i++) {
    const t = i / count;
    // Start on the card's border, walking round it.
    const side = Math.floor(t * 4), u = (t * 4) % 1;
    const sx = [rect.left + u * rect.width, rect.right, rect.right - u * rect.width, rect.left][side];
    const sy = [rect.top, rect.top + u * rect.height, rect.bottom, rect.bottom - u * rect.height][side];
    const el = addFx('fx-hex-rune', { left: `${sx}px`, top: `${sy}px`, fontSize: `${Math.max(18, sizeOf(rect) * 0.22)}px` });
    el.textContent = RUNES[i % RUNES.length];
    const ex = inward ? c.x - sx : (sx - c.x) * 0.6, ey = inward ? c.y - sy : (sy - c.y) * 0.6 - sizeOf(rect) * 0.3;
    const mx = ex * 0.5 + (ey * 0.35), my = ey * 0.5 - (ex * 0.35); // a curve, not a straight line
    jobs.push(done(el, animate(el, [
      { transform: 'translate(-50%, -50%) scale(0.4) rotate(0deg)', opacity: 0, color: '#d946ef' },
      { transform: 'translate(-50%, -50%) scale(1.1) rotate(20deg)', opacity: 1, offset: 0.2, color: '#d946ef' },
      { transform: `translate(calc(-50% + ${mx}px), calc(-50% + ${my}px)) scale(1) rotate(160deg)`, opacity: 1, offset: 0.6, color: '#7dffcf' },
      { transform: `translate(calc(-50% + ${ex}px), calc(-50% + ${ey}px)) scale(0.3) rotate(300deg)`, opacity: 0, color: '#10b981' },
    ], { duration, delay: delay + i * 30, easing: 'cubic-bezier(.4,.1,.5,1)' })));
  }
  return Promise.all(jobs);
}
export function hexCurse(el, rect) {
  if (!rect) return Promise.resolve();
  const c = center(rect);
  return Promise.all([
    el ? animate(el, [{ boxShadow: '0 0 0 0 #d946ef00' }, { boxShadow: '0 0 14px 3px #d946ef', offset: 0.25 }, { boxShadow: '0 0 0 0 #d946ef00' }], { duration: 700, fill: 'none' }) : null,
    runeSwirl(rect, { count: 12, inward: true }),
    wait(560).then(() => Promise.all([
      hexSmoke(c, sizeOf(rect)),
      ring(c, sizeOf(rect) * 1.3, '#2b0938', { width: 5, from: 1.3, to: 0.35, duration: 420 }),
      tint(el, 'grayscale(1) brightness(0.75) sepia(0.25) hue-rotate(220deg)', 900),
      bigGlyph({ x: c.x, y: c.y - rect.height * 0.05 }, '🔇', gsz(rect, 0.3), { duration: 760, delay: 160 }),
    ])),
  ]);
}
// Counter: the enemy spell's sigil appears over the board, a Witch's rune circle closes on it, and
// it shatters into magenta glass while the circle flashes emerald.
export function countered(rect) {
  if (!rect) return Promise.resolve();
  const c = center(rect);
  const size = Math.min(rect.width, rect.height) * 0.55;
  const circle = addFx('fx-counter-circle', box(c, size));
  circle.innerHTML = `<span>${RUNES.join('')}</span>`;
  const label = addFx('fx-counter-label', { left: `${c.x}px`, top: `${c.y}px`, fontSize: `${Math.max(18, size * 0.16)}px` });
  label.textContent = 'COUNTERED';
  const shards = [];
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2, d = size * (0.5 + Math.random() * 0.4);
    const sh = addFx('fx-counter-shard', { left: `${c.x}px`, top: `${c.y}px` });
    shards.push(done(sh, animate(sh, [
      { transform: 'translate(-50%, -50%) rotate(0deg)', opacity: 0 },
      { transform: 'translate(-50%, -50%) rotate(0deg)', opacity: 1, offset: 0.05 },
      { transform: `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d}px)) rotate(${(Math.random() - 0.5) * 540}deg)`, opacity: 0 },
    ], { duration: 640, delay: 520, easing: 'cubic-bezier(.2,.7,.3,1)' })));
  }
  return Promise.all([
    done(circle, animate(circle, [
      { transform: 'scale(1.8) rotate(0deg)', opacity: 0 },
      { transform: 'scale(1) rotate(90deg)', opacity: 1, offset: 0.4 },
      { transform: 'scale(0.92) rotate(140deg)', opacity: 1, offset: 0.62, filter: 'brightness(2.4)' },
      { transform: 'scale(1.25) rotate(170deg)', opacity: 0 },
    ], { duration: 1200, easing: 'cubic-bezier(.2,.6,.3,1)' })),
    done(label, animate(label, [
      { transform: 'translate(-50%, -50%) scale(0.4)', opacity: 0 },
      { transform: 'translate(-50%, -50%) scale(1.15)', opacity: 1, offset: 0.5 },
      { transform: 'translate(-50%, -50%) scale(1)', opacity: 1, offset: 0.8 },
      { transform: 'translate(-50%, -60%) scale(1)', opacity: 0 },
    ], { duration: 1300 })),
    glowBall(c, size * 1.1, '#d946ef', '#2b093888', { duration: 640, delay: 480 }),
    ...shards,
  ]);
}
// Silence the enemy Hero: chains of violet runes wrap the portrait and lock with an emerald seal.
export function heroSilenced(el, rect) {
  if (!rect) return Promise.resolve();
  const c = center(rect);
  return Promise.all([
    runeSwirl(rect, { count: 10, inward: true, duration: 640 }),
    wait(500).then(() => Promise.all([
      ring(c, sizeOf(rect) * 1.15, '#d946ef', { width: 4, from: 1.4, to: 0.9, duration: 500 }),
      ring(c, sizeOf(rect) * 1.15, '#10b981', { width: 2, from: 1.6, to: 1.05, duration: 560, delay: 80 }),
      hexSmoke(c, sizeOf(rect) * 0.9),
      tint(el, 'grayscale(0.8) brightness(0.8)', 900),
      bigGlyph(c, '🤐', gsz(rect, 0.45), { duration: 900, delay: 120 }),
    ])),
  ]);
}

// ---- Fruit Ninjas ------------------------------------------------------------------------------
// Slice: a blade flashes across the Fruit, it bursts in its own juice, and a twice-worked Slice
// (Twin-Slice Trainee, Emperor Pomelo) cuts a second time.
const JUICE = {
  blitz_cherry: ['#ff2a4a', '#ff8aa0'], thunder_lemon: ['#ffe84a', '#fff6a8'], healing_peach: ['#ffb08a', '#ffe0c8'],
  shadow_kiwi: ['#7dd84a', '#2a4a1a'], iron_coconut: ['#f4ecd8', '#8a5a2a'], inferno_pineapple: ['#ffa21a', '#ff5a1a'],
  frost_grape_cluster: ['#a86aff', '#c8f0ff'], phantom_dragonfruit: ['#ff3aa8', '#d8a8ff'], titan_watermelon: ['#ff3a5a', '#4ad84a'],
  chrono_starfruit: ['#ffd84a', '#fff0a0'],
};
// The designer's Slice sprites (art/fx/fruit): each Fruit whole, a juice splash and a blade streak.
const FRUIT_FX = 'art/fx/fruit/';
let fruitFxLoaded = false;
export function preloadFruitFx() {
  if (fruitFxLoaded) return;
  fruitFxLoaded = true;
  for (const n of [...Object.keys(JUICE), 'juice_splash', 'blade_slash']) { const i = new Image(); i.src = `${FRUIT_FX}${n}.webp`; }
}

// One picture split along a line through its middle at `ang` degrees: two clipped copies that fly
// apart along the cut's normal, spinning away from each other, and fall.
function splitPicture(c, size, src, ang, { delay = 0, duration = 760, cls = 'fx-slice-half', fit = 'cover', push = 0.55, fall = 0.35 } = {}) {
  const rad = (ang * Math.PI) / 180;
  const nx = -Math.sin(rad), ny = Math.cos(rad);
  const half = (side) => {
    const el = addFx(cls, { left: `${c.x - size / 2}px`, top: `${c.y - size / 2}px`, width: `${size}px`, height: `${size}px` });
    el.style.backgroundImage = `url("${src}")`;
    el.style.backgroundSize = fit;
    const pts = [];
    for (const [u, v] of [[-2, 0], [2, 0], [2, 2 * side], [-2, 2 * side]]) {
      const x = 0.5 + (u * Math.cos(rad) - v * Math.sin(rad)) * 0.5;
      const y = 0.5 + (u * Math.sin(rad) + v * Math.cos(rad)) * 0.5;
      pts.push(`${(x * 100).toFixed(1)}% ${(y * 100).toFixed(1)}%`);
    }
    el.style.clipPath = `polygon(${pts.join(',')})`;
    const d = size * push, spin = side * (20 + Math.random() * 25);
    return done(el, animate(el, [
      { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
      { transform: `translate(${nx * side * d * 0.22}px, ${ny * side * d * 0.22}px) rotate(${spin * 0.25}deg)`, opacity: 1, offset: 0.2 },
      { transform: `translate(${nx * side * d}px, ${ny * side * d + size * fall}px) rotate(${spin}deg)`, opacity: 0 },
    ], { duration, delay, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'both' }));
  };
  return Promise.all([half(1), half(-1)]);
}

// The blade streak sweeping along the cut line (the sprite drawn left-to-right, so it is turned to
// the angle and, half the time, flipped so the blade travels the other way along the line).
function bladeStreak(c, len, ang, { delay = 0 } = {}) {
  const el = addFx('fx-slice-blade', { left: `${c.x - len / 2}px`, top: `${c.y - len * 0.26}px`, width: `${len}px`, height: `${len * 0.52}px` });
  el.style.backgroundImage = `url("${FRUIT_FX}blade_slash.webp")`;
  const flip = Math.random() < 0.5 ? -1 : 1;
  return done(el, animate(el, [
    { transform: `rotate(${ang}deg) scaleX(${flip}) translateX(-35%) scale(0.7)`, opacity: 0 },
    { transform: `rotate(${ang}deg) scaleX(${flip}) translateX(0) scale(1)`, opacity: 1, offset: 0.35 },
    { transform: `rotate(${ang}deg) scaleX(${flip}) translateX(25%) scale(1.05)`, opacity: 0 },
  ], { duration: 380, delay, easing: 'cubic-bezier(.15,.85,.25,1)', fill: 'both' }));
}

// The juice splash sprite bursting out from the cut, tinted towards the Fruit's juice.
function juiceSplash(c, size, ang, juice, { delay = 0 } = {}) {
  const el = addFx('fx-slice-splash', { left: `${c.x - size / 2}px`, top: `${c.y - size * 0.27}px`, width: `${size}px`, height: `${size * 0.54}px` });
  el.style.backgroundImage = `url("${FRUIT_FX}juice_splash.webp")`;
  el.style.setProperty('--juice', juice);
  return done(el, animate(el, [
    { transform: `rotate(${ang}deg) scale(0.2)`, opacity: 0 },
    { transform: `rotate(${ang}deg) scale(1)`, opacity: 1, offset: 0.3 },
    { transform: `rotate(${ang}deg) scale(1.35)`, opacity: 0 },
  ], { duration: 640, delay, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'both' }));
}

// Slice: the Fruit's card turns into the fruit itself, right where it stands (the card flashes and
// shrinks away as the fruit grows out of it, rising a touch), then the blade sweeps through it from a
// random direction (any angle round the circle), the fruit splits along that line, the halves spin
// away and juice sprays. A Slice that works twice cuts again across the first. `img`: the card's art.
const MORPH_MS = 300, HOVER_MS = 120;
export function sliced(rect, cardId, times = 1, img = null) {
  if (!rect) return Promise.resolve();
  preloadFruitFx();
  const size = sizeOf(rect);
  const [juice, light] = JUICE[cardId] ?? ['#ff9a5a', '#ffe0a0'];
  const sprite = JUICE[cardId] ? `${FRUIT_FX}${cardId}.webp` : null;
  const from = center(rect);
  const lift = size * 0.22;
  const at = { x: from.x, y: from.y - lift };
  const fruitSize = size * 1.2;
  const ang = Math.random() * 360;
  const cutAt = MORPH_MS + HOVER_MS;
  const jobs = [];
  // The card: a copy of its picture over it flashes bright and shrinks away into the fruit.
  if (img) {
    const card = addFx('fx-slice-card', { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` });
    card.style.backgroundImage = `url("${img}")`;
    jobs.push(done(card, animate(card, [
      { transform: 'scale(1) rotate(0deg)', opacity: 1, filter: 'brightness(1)' },
      { transform: 'scale(1.06) rotate(0deg)', opacity: 1, filter: 'brightness(2.2) saturate(0.6)', offset: 0.35 },
      { transform: `translate(0, ${-lift * 0.6}px) scale(0.2) rotate(${(Math.random() - 0.5) * 50}deg)`, opacity: 0, filter: 'brightness(3) saturate(0)' },
    ], { duration: MORPH_MS, easing: 'cubic-bezier(.5,0,.7,.4)', fill: 'forwards' })));
  }
  jobs.push(glowBall(from, size * 1.1, light, `${juice}77`, { duration: 460, delay: MORPH_MS * 0.4 }));
  if (sprite) {
    const fruit = addFx('fx-slice-fruit', { left: `${at.x - fruitSize / 2}px`, top: `${at.y - fruitSize / 2}px`, width: `${fruitSize}px`, height: `${fruitSize}px` });
    fruit.style.backgroundImage = `url("${sprite}")`;
    fruit.style.backgroundSize = 'contain';
    const tilt = (Math.random() - 0.5) * 30;
    jobs.push(done(fruit, animate(fruit, [
      { transform: `translate(0, ${lift}px) scale(0.25) rotate(${-tilt}deg)`, opacity: 0 },
      { transform: `translate(0, ${lift}px) scale(0.35) rotate(${-tilt}deg)`, opacity: 0, offset: 0.3 },
      { transform: `translate(0, ${lift * 0.2}px) scale(1.1) rotate(${tilt * 0.4}deg)`, opacity: 1, offset: 0.72 },
      { transform: 'translate(0, -4px) scale(1) rotate(0deg)', opacity: 1, offset: 0.88 },
      { transform: 'translate(0, 0) scale(1) rotate(0deg)', opacity: 1 },
    ], { duration: cutAt, easing: 'cubic-bezier(.2,.9,.3,1)', fill: 'forwards' })));
    // The whole fruit is swapped for its two halves the instant the blade lands.
    wait(cutAt).then(() => fruit.remove());
  }
  const cut = (a, delay) => [
    bladeStreak(at, size * 2.3, a, { delay: delay - 60 }),
    juiceSplash(at, size * 2, a + 90, juice, { delay: delay + 20 }),
    sprite ? splitPicture(at, fruitSize, sprite, a, { delay, duration: 860, cls: 'fx-slice-fruit', fit: 'contain', push: 0.8, fall: 0.7 }) : Promise.resolve(),
    ring(at, size * 0.8, juice, { width: 4, to: 1.9, duration: 480, delay: delay + 20 }),
    glowBall(at, size * 1.1, light, `${juice}88`, { duration: 460, delay: delay + 10 }),
  ];
  jobs.push(...cut(ang, cutAt));
  jobs.push(wait(cutAt).then(() => fling({ left: at.x - size / 2, top: at.y - size / 2, width: size, height: size }, '💦', 5, { rise: 0.3, spread: 1.4, size: 13, duration: 760 })));
  if (times > 1) jobs.push(wait(cutAt + 230).then(() => Promise.all(cut(ang + 60 + Math.random() * 60, 0))));
  return Promise.all(jobs);
}

// What each Fruit's Slice gives, as the words that pop up when it's cut.
const SLICE_WORDS = {
  blitz_cherry: '+2 Attack', thunder_lemon: '⚡ 2 Damage', healing_peach: '+3 Health', shadow_kiwi: 'Stealth',
  iron_coconut: '+3 Health · Taunt', inferno_pineapple: '🔥 2 Damage + Splash', frost_grape_cluster: '❄ Freeze · -1 Attack',
  phantom_dragonfruit: 'Phantom Shinobi!', titan_watermelon: '+2 / +2', chrono_starfruit: 'Back to Hand · 2 Cheaper',
};

// A magical wisp: a glowing orb that arcs from the cut to the card that gets the bonus, trailing
// sparkles, and lands in a flash and a ring on that card.
function wisp(from, toRect, color, light, { delay = 0 } = {}) {
  if (!toRect) return Promise.resolve();
  const to = center(toRect);
  const dx = to.x - from.x, dy = to.y - from.y;
  const dist = Math.hypot(dx, dy) || 1;
  // A bend to one side, so several wisps fan out instead of overlapping.
  const bend = (Math.random() < 0.5 ? -1 : 1) * Math.min(140, dist * 0.35);
  const ctrl = { x: from.x + dx / 2 - (dy / dist) * bend, y: from.y + dy / 2 + (dx / dist) * bend - dist * 0.15 };
  const at = (t) => ({ x: (1 - t) ** 2 * from.x + 2 * (1 - t) * t * ctrl.x + t * t * to.x, y: (1 - t) ** 2 * from.y + 2 * (1 - t) * t * ctrl.y + t * t * to.y });
  const dur = Math.min(900, 420 + dist * 0.7);
  const path = Array.from({ length: 13 }, (_, i) => at(i / 12));
  const orb = addFx('fx-wisp', { left: `${from.x}px`, top: `${from.y}px`, '--c': color, '--l': light });
  const jobs = [done(orb, animate(orb, path.map((p, i) => ({
    transform: `translate(calc(-50% + ${p.x - from.x}px), calc(-50% + ${p.y - from.y}px)) scale(${i === 0 ? 0.3 : i === 12 ? 0.6 : 1 + Math.sin((i / 12) * Math.PI) * 0.35})`,
    opacity: i === 0 ? 0 : 1,
  })), { duration: dur, delay, easing: 'cubic-bezier(.45,.05,.55,.95)', fill: 'both' }))];
  // The trail: little sparks dropped along the path, each fading where it was left.
  for (let i = 1; i < 12; i++) {
    const p = path[i];
    const sp = addFx('fx-wisp-spark', { left: `${p.x + (Math.random() - 0.5) * 10}px`, top: `${p.y + (Math.random() - 0.5) * 10}px`, '--c': color });
    jobs.push(done(sp, animate(sp, [
      { transform: 'translate(-50%,-50%) scale(1)', opacity: 0 },
      { transform: 'translate(-50%,-50%) scale(1)', opacity: 0.9, offset: 0.05 },
      { transform: `translate(-50%, calc(-50% + ${8 + Math.random() * 10}px)) scale(0.2)`, opacity: 0 },
    ], { duration: 520, delay: delay + (dur * i) / 12, easing: 'ease-out', fill: 'both' })));
  }
  // Landing: the card flashes in the fruit's colour.
  jobs.push(wait(delay + dur).then(() => Promise.all([
    ring(to, sizeOf(toRect) * 0.8, color, { width: 4, to: 1.6, duration: 460 }),
    glowBall(to, sizeOf(toRect) * 1.1, light, `${color}66`, { duration: 480 }),
  ])));
  return Promise.all(jobs);
}

// The Slice's bonus: its words pop up out of the cut, then a wisp flies to every card it changed
// (a card that went back to the hand gets its wisp sent to the hand).
export function sliceBonus(rect, cardId, targetRects = [], { handRect = null, delay = 0 } = {}) {
  if (!rect) return Promise.resolve();
  const size = sizeOf(rect);
  const c = center(rect);
  const at = { x: c.x, y: c.y - size * 0.22 };
  const [juice, light] = JUICE[cardId] ?? ['#ff9a5a', '#ffe0a0'];
  const words = SLICE_WORDS[cardId] ?? 'Slice!';
  const jobs = [];
  const label = addFx('fx-slice-text', { left: `${at.x}px`, top: `${at.y - size * 0.55}px`, '--c': juice, '--l': light });
  label.textContent = words;
  jobs.push(done(label, animate(label, [
    { transform: 'translate(-50%, -50%) scale(0.4)', opacity: 0 },
    { transform: 'translate(-50%, -60%) scale(1.15)', opacity: 1, offset: 0.18 },
    { transform: 'translate(-50%, -70%) scale(1)', opacity: 1, offset: 0.7 },
    { transform: 'translate(-50%, -110%) scale(0.95)', opacity: 0 },
  ], { duration: 1500, delay, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'both' })));
  const targets = [...targetRects.filter(Boolean), ...(handRect ? [handRect] : [])];
  targets.forEach((r, i) => jobs.push(wisp(at, r, juice, light, { delay: delay + 260 + i * 90 })));
  return Promise.all(jobs);
}
