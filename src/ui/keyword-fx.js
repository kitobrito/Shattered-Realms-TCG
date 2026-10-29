// Keyword animations: one look per keyword or status, played from what the move really did (the
// engine's fx trace, see core.js traceFx). Each runs wind-up → action → impact → recovery and cleans
// up after itself (every element goes through done()/remove). Rects come from the board as it was
// (a minion that died is animated where it stood) or as it is now (a minion that just arrived).
import { addFx, animate, bigGlyph, box, center, column, done, drain, fling, glowBall, layer, ring, screenShake, slashes, wait } from './fx.js';

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
