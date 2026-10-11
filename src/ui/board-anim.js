// Living boards: animates parts cut out of a painted board (tools/board-anim.py)
// over its "clean plate", plus ambient effects. Canvas 2D, ~30 fps.
//
// Manifest (art/boards/anim/<board>.json):
//   parts: [{ id, src, rect:[x,y,w,h], motion?, role? }]  — fractions of the board
//     motion.type: 'bend'   neck/tail: bends more toward `tip`, rooted at `anchor`
//                  'cloth'  banner: pinned at the top, ripples below
//                  'sway'   rigid sway around `pivot` (leaves, fronds)
//                  'wobble' an occasional decaying rock around `pivot` (eggs)
//                  'bob'    floats up and down (tank creatures, a hovering ship); dx/dy in board fractions
//                  'spin'   slow continuous turn around `pivot` (a galaxy)
//                  'pulse'  breathes in scale around `pivot` (glowing mushrooms, eggs)
//     role 'sprite': not drawn in place; used by flyers
//   effects: { flows, mist, glows, embers, smoke, flyers, pokes, breath,
//              bats, bubbles, stars, fireflies, petals, spores }
//
// Clicking the scenery (poke): a part reacts (react: { sound, burst }), a torch
// flares, water splashes, a flying sprite dashes off, or an effects.pokes area
// (e.g. the volcano) erupts — each with a sound, like Hearthstone's board props.

import { play } from './sound.js';

const TAU = Math.PI * 2;
const FPS = 30;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${src}`));
    img.src = src;
  });
}

// Affine-map one source triangle of `img` onto a destination triangle.
function drawTriangle(ctx, img, s, d) {
  const [s0, s1, s2] = s;
  const [d0, d1, d2] = d;
  const den = s0[0] * (s1[1] - s2[1]) + s1[0] * (s2[1] - s0[1]) + s2[0] * (s0[1] - s1[1]);
  if (Math.abs(den) < 1e-9) return;
  const a = (d0[0] * (s1[1] - s2[1]) + d1[0] * (s2[1] - s0[1]) + d2[0] * (s0[1] - s1[1])) / den;
  const c = (d0[0] * (s2[0] - s1[0]) + d1[0] * (s0[0] - s2[0]) + d2[0] * (s1[0] - s0[0])) / den;
  const e = (d0[0] * (s1[0] * s2[1] - s2[0] * s1[1]) + d1[0] * (s2[0] * s0[1] - s0[0] * s2[1]) + d2[0] * (s0[0] * s1[1] - s1[0] * s0[1])) / den;
  const b = (d0[1] * (s1[1] - s2[1]) + d1[1] * (s2[1] - s0[1]) + d2[1] * (s0[1] - s1[1])) / den;
  const dd = (d0[1] * (s2[0] - s1[0]) + d1[1] * (s0[0] - s2[0]) + d2[1] * (s1[0] - s0[0])) / den;
  const f = (d0[1] * (s1[0] * s2[1] - s2[0] * s1[1]) + d1[1] * (s2[0] * s0[1] - s0[0] * s2[1]) + d2[1] * (s0[0] * s1[1] - s1[0] * s0[1])) / den;
  // Clip slightly outside the triangle so neighbouring triangles leave no hairline seams.
  const cx = (d0[0] + d1[0] + d2[0]) / 3;
  const cy = (d0[1] + d1[1] + d2[1]) / 3;
  const grow = (p) => {
    const dx = p[0] - cx, dy = p[1] - cy, l = Math.hypot(dx, dy) || 1;
    return [p[0] + (dx / l) * 0.8, p[1] + (dy / l) * 0.8];
  };
  const g0 = grow(d0), g1 = grow(d1), g2 = grow(d2);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(g0[0], g0[1]);
  ctx.lineTo(g1[0], g1[1]);
  ctx.lineTo(g2[0], g2[1]);
  ctx.closePath();
  ctx.clip();
  ctx.transform(a, b, c, dd, e, f);
  ctx.drawImage(img, 0, 0);
  ctx.restore();
}

// A soft, non-repeating wobble from a few sines (deterministic per seed).
const wave = (t, seed) => Math.sin(t * 1.7 + seed) * 0.5 + Math.sin(t * 2.9 + seed * 1.3) * 0.3 + Math.sin(t * 5.3 + seed * 2.1) * 0.2;
const rand = (a, b) => a + Math.random() * (b - a);

// Vertical streak texture for flowing water.
function streakTexture() {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 256;
  const g = c.getContext('2d');
  for (let i = 0; i < 46; i++) {
    const x = Math.random() * 64, y = Math.random() * 256, len = rand(30, 120), w = rand(0.8, 2.6);
    const grd = g.createLinearGradient(0, y, 0, y + len);
    grd.addColorStop(0, 'rgba(255,255,255,0)');
    grd.addColorStop(0.5, `rgba(255,255,255,${rand(0.35, 0.8)})`);
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(x, y, w, len);
    if (y + len > 256) g.fillRect(x, y - 256, w, len); // wrap so it tiles vertically
  }
  return c;
}

export async function startBoardAnim(stage, manifestUrl, { use4k = false } = {}) {
  const man = await (await fetch(manifestUrl)).json();
  const parts = await Promise.all(man.parts.map(async (p) => ({ ...p, img: await loadImage(p.src) })));
  const plate = use4k ? man.plate4k : man.plate;
  await loadImage(plate); // ready before we swap, so the board never flashes empty
  const fx = man.effects ?? {};

  const canvas = document.createElement('canvas');
  canvas.className = 'board-anim';
  stage.append(canvas);
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0;
  let last = 0; // time of the last drawn frame (0 = draw next frame regardless)
  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    W = Math.max(1, Math.round(stage.clientWidth * dpr));
    H = Math.max(1, Math.round(stage.clientHeight * dpr));
    canvas.width = W; canvas.height = H;
    last = 0; // resizing clears the canvas: draw again even if the tab is hidden
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(stage);

  const byId = Object.fromEntries(parts.map((p) => [p.id, p]));
  // Alpha of each cut-out, so a click counts only on the creature itself, not its box.
  for (const p of parts) {
    const c = document.createElement('canvas');
    c.width = p.img.naturalWidth; c.height = p.img.naturalHeight;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(p.img, 0, 0);
    p.alpha = g.getImageData(0, 0, c.width, c.height).data;
  }
  const glowKick = new Map(); // glow index -> time it was clicked
  const bats = [];             // procedural bats in flight
  const ripples = [];          // expanding rings on liquid
  const sparkles = [];         // star-shaped glints
  const beams = [];            // tractor-beam flashes
  const starSeeds = (fx.stars ?? []).map(([x0, y0, x1, y1, n]) => Array.from({ length: n ?? 24 }, () => [rand(x0, x1), rand(y0, y1), Math.random() * 9, rand(0.6, 1.4)]));
  const batClock = (fx.bats ?? []).map((b) => ({ ...b, next: rand(1, b.every?.[0] ?? 5) }));
  let clock = 0;               // seconds, for reactions started outside the frame loop
  const streaks = streakTexture();
  const streakPattern = ctx.createPattern(streaks, 'repeat');
  const particles = [];
  const glowSeeds = (fx.glows ?? []).map(() => Math.random() * 100);
  const flyers = (fx.flyers ?? []).map((f) => ({ ...f, next: rand(1, f.every?.[0] ?? 4), start: null }));
  for (const p of parts) if (p.motion?.type === 'wobble') p.next = rand(1, p.motion.every?.[1] ?? 10);

  const px = (x, y) => [x * W, y * H];
  const path = (poly) => {
    ctx.beginPath();
    poly.forEach(([x, y], i) => (i ? ctx.lineTo(x * W, y * H) : ctx.moveTo(x * W, y * H)));
    ctx.closePath();
  };

  // A click's after-shock: a decaying wiggle, 0 when the part hasn't been clicked lately.
  const burst = (p, t, freq = 1.7, decay = 0.6) => {
    if (p.kick == null) return 0;
    const k = t - p.kick;
    if (k > 4) { p.kick = null; return 0; }
    return Math.exp(-k / decay) * Math.sin(k * TAU * freq);
  };

  // ---- Parts ----
  function drawRigid(p, angle, pivot) {
    const [x, y, w, h] = p.rect;
    const [cx, cy] = px(...pivot);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.translate(-cx, -cy);
    ctx.drawImage(p.img, x * W, y * H, w * W, h * H);
    ctx.restore();
  }

  function drawMesh(p, deform, nx = 6, ny = 8) {
    const [x, y, w, h] = p.rect;
    const iw = p.img.naturalWidth, ih = p.img.naturalHeight;
    const src = [], dst = [];
    for (let j = 0; j <= ny; j++) {
      for (let i = 0; i <= nx; i++) {
        const u = i / nx, v = j / ny;
        src.push([u * iw, v * ih]);
        dst.push(deform((x + u * w) * W, (y + v * h) * H, u, v));
      }
    }
    const at = (i, j) => j * (nx + 1) + i;
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const a = at(i, j), b = at(i + 1, j), c = at(i, j + 1), d = at(i + 1, j + 1);
        drawTriangle(ctx, p.img, [src[a], src[b], src[d]], [dst[a], dst[b], dst[d]]);
        drawTriangle(ctx, p.img, [src[a], src[d], src[c]], [dst[a], dst[d], dst[c]]);
      }
    }
  }

  function drawPart(p, t) {
    const m = p.motion;
    if (!m) { const [x, y, w, h] = p.rect; ctx.drawImage(p.img, x * W, y * H, w * W, h * H); return; }
    const phase = m.phase ?? 0;
    if (m.type === 'sway') {
      const extra = (p.react?.burst ?? m.amp * 3) * burst(p, t, 2.2, 0.5);
      drawRigid(p, ((m.amp * (Math.sin(TAU * t / m.period + phase) * 0.8 + wave(t * 0.6, phase) * 0.2)) + extra) * Math.PI / 180, m.pivot);
    } else if (m.type === 'wobble') {
      if (p.wobbleStart == null && t >= p.next) p.wobbleStart = t;
      let angle = 0;
      if (p.wobbleStart != null) {
        const k = t - p.wobbleStart;
        angle = (m.amp * Math.PI / 180) * Math.exp(-k / 0.7) * Math.sin(k * TAU * 2.4);
        if (k > 2.6) { p.wobbleStart = null; p.next = t + rand(...(m.every ?? [6, 14])); }
      }
      drawRigid(p, angle, m.pivot);
    } else if (m.type === 'bend') {
      const [ax, ay] = px(...m.anchor);
      const [tx, ty] = px(...m.tip);
      const L = Math.hypot(tx - ax, ty - ay) || 1;
      const dx = (tx - ax) / L, dy = (ty - ay) / L;
      const base = ((m.amp * (Math.sin(TAU * t / m.period + phase) * 0.75 + wave(t * 0.5, phase + 3) * 0.25)) +
        (p.react?.burst ?? m.amp * 3) * burst(p, t, 1.6, 0.55)) * Math.PI / 180;
      const breathe = (m.breathe ?? 0) * Math.sin(TAU * t / (m.breathePeriod ?? 3.5));
      drawMesh(p, (X, Y) => {
        const s = Math.max(0, Math.min(1, ((X - ax) * dx + (Y - ay) * dy) / L)) ** (m.power ?? 1.5);
        const ang = base * s, sc = 1 + breathe * s;
        const rx = (X - ax) * sc, ry = (Y - ay) * sc;
        return [ax + rx * Math.cos(ang) - ry * Math.sin(ang), ay + rx * Math.sin(ang) + ry * Math.cos(ang)];
      }, 6, 8);
    } else if (m.type === 'bob' || m.type === 'pulse' || m.type === 'spin') {
      const [x, y, w, h] = p.rect;
      const kick = burst(p, t, 2, 0.6);
      let ox = 0, oy = 0, sc = 1, ang = 0;
      if (m.type === 'bob') {
        ox = (m.dx ?? 0) * W * Math.sin(TAU * t / (m.period * 1.7) + phase);
        oy = ((m.dy ?? 0.004) * Math.sin(TAU * t / m.period + phase) + 0.006 * kick) * H;
        ang = ((m.tilt ?? 0) * Math.sin(TAU * t / (m.period * 1.3) + phase) + (p.react?.burst ?? 0) * kick) * Math.PI / 180;
      } else if (m.type === 'pulse') {
        sc = 1 + (m.amp ?? 0.03) * Math.sin(TAU * t / m.period + phase) + 0.08 * Math.abs(kick);
      } else {
        ang = TAU * t / m.period + (p.react?.burst ?? 20) * Math.PI / 180 * Math.max(0, kick);
      }
      const [cx, cy] = m.pivot ? px(...m.pivot) : [(x + w / 2) * W, (y + h / 2) * H];
      ctx.save();
      ctx.translate(cx + ox, cy + oy);
      ctx.rotate(ang);
      ctx.scale(sc, sc);
      ctx.translate(-cx, -cy);
      ctx.drawImage(p.img, x * W, y * H, w * W, h * H);
      ctx.restore();
    } else if (m.type === 'cloth') {
      const amp = m.amp * W * (1 + 2.6 * Math.abs(burst(p, t, 0.5, 0.9)));
      drawMesh(p, (X, Y, u, v) => {
        const k = v ** 1.3;
        const dxw = amp * k * (Math.sin(TAU * t / m.period - v * 2.4 - u * 1.2 + phase) + 0.4 * Math.sin(TAU * t / (m.period * 2.3) + phase));
        return [X + dxw, Y - Math.abs(dxw) * 0.12];
      }, 5, 7);
    }
  }

  // ---- Effects ----
  function drawFlows(t) {
    for (const f of fx.flows ?? []) {
      const scale = W / 1600;
      streakPattern.setTransform(new DOMMatrix().translate(0, (t * (f.speed ?? 0.2) * H) % (256 * scale)).scale(scale));
      ctx.save();
      path(f.poly);
      ctx.clip();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = 0.42;
      ctx.fillStyle = streakPattern;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
  }

  function drawGlows(t) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    (fx.glows ?? []).forEach(([x, y, r, color], i) => {
      const kicked = glowKick.has(i) ? Math.max(0, 1 - (t - glowKick.get(i)) / 1.2) : 0;
      if (glowKick.has(i) && !kicked) glowKick.delete(i);
      const flick = 0.6 + 0.4 * (0.5 + 0.5 * wave(t * 3.2, glowSeeds[i])) + kicked * 1.6;
      const R = r * W * 2.3 * (0.92 + 0.12 * flick);
      const [cx, cy] = px(x, y);
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
      g.addColorStop(0, color + 'cc');
      g.addColorStop(0.4, color + '44');
      g.addColorStop(1, color + '00');
      ctx.globalAlpha = 0.32 * flick;
      ctx.fillStyle = g;
      ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    });
    ctx.restore();
  }

  function spawnBats(area, n) {
    const [x0, y0, x1, y1] = area;
    for (let i = 0; i < n; i++) {
      const dir = Math.random() < 0.5 ? 1 : -1;
      bats.push({ x: dir > 0 ? x0 - 0.01 : x1 + 0.01, y: rand(y0, y1), vx: dir * rand(0.05, 0.09), vy: rand(-0.01, 0.01), age: 0, life: (x1 - x0 + 0.02) / 0.06, seed: Math.random() * 9, size: rand(0.006, 0.011), area });
    }
  }

  function spawn(dt) {
    for (const b of batClock) {
      if (clock >= b.next) { spawnBats(b.area, b.count ?? 2); b.next = clock + rand(...(b.every ?? [6, 12])); }
    }
    for (const [x0, y0, x1, y1, rate] of fx.bubbles ?? []) {
      if (Math.random() < dt * (rate ?? 3)) particles.push({ kind: 'bubble', x: rand(x0, x1), y: y1, vx: 0, vy: rand(-0.05, -0.025), life: (y1 - y0) / 0.035, age: 0, r: rand(0.0008, 0.0022), seed: Math.random() * 9, top: y0 });
    }
    for (const [x0, y0, x1, y1, rate] of fx.fireflies ?? []) {
      if (particles.filter((q) => q.kind === 'firefly').length < 18 && Math.random() < dt * (rate ?? 1.5)) particles.push({ kind: 'firefly', x: rand(x0, x1), y: rand(y0, y1), vx: rand(-0.006, 0.006), vy: rand(-0.006, 0.006), life: rand(4, 8), age: 0, r: rand(0.0012, 0.002), seed: Math.random() * 9 });
    }
    for (const [x0, y0, x1, y1, rate] of fx.petals ?? []) {
      if (Math.random() < dt * (rate ?? 0.8)) particles.push({ kind: 'petal', x: rand(x0, x1), y: y0, vx: rand(-0.006, 0.006), vy: rand(0.012, 0.022), life: (y1 - y0) / 0.017, age: 0, r: rand(0.0025, 0.004), seed: Math.random() * 9, color: Math.random() < 0.7 ? '#f48fb8' : '#ffd0e4' });
    }
    for (const [x0, y0, x1, y1, rate, color] of fx.spores ?? []) {
      if (Math.random() < dt * (rate ?? 3)) particles.push({ kind: 'spore', x: rand(x0, x1), y: rand(y0, y1), vx: rand(-0.004, 0.004), vy: rand(-0.018, -0.006), life: rand(3, 6), age: 0, r: rand(0.0008, 0.0018), seed: Math.random() * 9, color: color ?? '#c9a6ff' });
    }
    // breath: a dragon's fire stream. { from:[x,y], to:[x,y], rate?, size? } — puffs pour from the
    // mouth toward `to`, swelling and cooling from white-yellow to red as they go.
    for (const b of fx.breath ?? []) {
      const n = dt * (b.rate ?? 40);
      for (let i = 0; i < Math.floor(n) + (Math.random() < n % 1 ? 1 : 0); i++) {
        const dx = b.to[0] - b.from[0], dy = b.to[1] - b.from[1];
        const life = rand(0.55, 0.85);
        const wob = rand(-0.18, 0.18);
        particles.push({ kind: 'fire', x: b.from[0] + rand(-0.002, 0.002), y: b.from[1] + rand(-0.002, 0.002),
          vx: (dx - dy * wob) / life, vy: (dy + dx * wob) / life, life, age: 0, r: (b.size ?? 0.006) * rand(0.7, 1.2), seed: Math.random() * 9 });
      }
    }
    for (const [x, y] of fx.embers ?? []) {
      if (Math.random() < dt * 5) particles.push({ kind: 'ember', x, y, vx: rand(-0.004, 0.004), vy: rand(-0.05, -0.025), life: rand(1.2, 2.4), age: 0, r: rand(0.0007, 0.0016), seed: Math.random() * 9 });
    }
    for (const [x, y] of fx.smoke ?? []) {
      if (Math.random() < dt * 1.6) particles.push({ kind: 'smoke', x, y, vx: rand(0.002, 0.006), vy: rand(-0.012, -0.006), life: rand(4, 7), age: 0, r: rand(0.006, 0.01), seed: Math.random() * 9 });
    }
    for (const [x0, y0, x1, y1] of fx.mist ?? []) {
      if (Math.random() < dt * 1.4) particles.push({ kind: 'mist', x: rand(x0, x1), y: rand(y0, y1), vx: rand(-0.003, 0.003), vy: rand(-0.004, -0.001), life: rand(2.5, 4.5), age: 0, r: rand(0.012, 0.022), seed: 0 });
    }
  }

  function drawParticles(t, dt, kinds) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const q = particles[i];
      if (!kinds.includes(q.kind)) continue;
      q.age += dt;
      if (q.age >= q.life) { particles.splice(i, 1); continue; }
      q.x += (q.vx + (q.kind === 'ember' ? Math.sin(t * 3 + q.seed) * 0.004 : 0)) * dt;
      q.y += q.vy * dt;
      const k = q.age / q.life;
      const [cx, cy] = px(q.x, q.y);
      ctx.save();
      if (q.kind === 'bubble') {
        if (q.y < q.top) { particles.splice(i, 1); ctx.restore(); continue; }
        q.x += Math.sin(t * 4 + q.seed) * 0.003 * dt;
        ctx.globalAlpha = 0.75;
        ctx.strokeStyle = '#d6ffd0';
        ctx.lineWidth = Math.max(1, q.r * W * 0.35);
        ctx.beginPath(); ctx.arc(cx, cy, q.r * W, 0, TAU); ctx.stroke();
      } else if (q.kind === 'firefly' || q.kind === 'spore') {
        q.vx += Math.sin(t * 1.3 + q.seed) * 0.002 * dt; q.vy += Math.cos(t * 1.1 + q.seed) * 0.002 * dt;
        const blink = q.kind === 'firefly' ? 0.5 + 0.5 * Math.sin(t * 3 + q.seed * 3) : 1;
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.sin(Math.PI * k) * blink;
        const R = q.r * W * 3;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
        const col = q.kind === 'firefly' ? '#e8ff8a' : q.color;
        g.addColorStop(0, col); g.addColorStop(0.35, col + '88'); g.addColorStop(1, col + '00');
        ctx.fillStyle = g;
        ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
      } else if (q.kind === 'petal') {
        q.x += Math.sin(t * 1.6 + q.seed) * 0.008 * dt;
        ctx.globalAlpha = Math.min(1, Math.sin(Math.PI * k) * 1.6) * 0.9;
        ctx.translate(cx, cy);
        ctx.rotate(t * 1.4 + q.seed);
        ctx.scale(1, 0.45 + 0.35 * Math.sin(t * 3 + q.seed));
        ctx.fillStyle = q.color;
        ctx.beginPath(); ctx.ellipse(0, 0, q.r * W, q.r * W * 0.6, 0, 0, TAU); ctx.fill();
      } else if (q.kind === 'fire') {
        // Swells and cools as it travels; flickers.
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.min(1, (1 - k) * 1.4) * (0.75 + 0.25 * Math.sin(t * 30 + q.seed * 5));
        const R = q.r * W * (0.6 + k * 2.4);
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
        if (k < 0.25) { g.addColorStop(0, 'rgba(255,250,220,0.95)'); g.addColorStop(0.4, 'rgba(255,200,80,0.7)'); }
        else if (k < 0.6) { g.addColorStop(0, 'rgba(255,190,70,0.85)'); g.addColorStop(0.45, 'rgba(255,110,20,0.55)'); }
        else { g.addColorStop(0, 'rgba(255,110,30,0.6)'); g.addColorStop(0.5, 'rgba(180,30,10,0.35)'); }
        g.addColorStop(1, 'rgba(120,10,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
      } else if (q.kind === 'ember') {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.sin(Math.PI * k) * 0.9;
        ctx.fillStyle = k < 0.5 ? '#ffd27a' : '#ff7a2a';
        ctx.beginPath(); ctx.arc(cx, cy, q.r * W, 0, TAU); ctx.fill();
      } else {
        const R = q.r * W * (q.kind === 'smoke' ? 1 + k * 2.2 : 1 + k * 0.6);
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
        const col = q.kind === 'smoke' ? '90,82,78' : '235,245,255';
        g.addColorStop(0, `rgba(${col},${q.kind === 'smoke' ? 0.35 : 0.22})`);
        g.addColorStop(1, `rgba(${col},0)`);
        ctx.globalAlpha = Math.sin(Math.PI * k);
        ctx.fillStyle = g;
        ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
      }
      ctx.restore();
    }
  }

  function drawFlyers(t) {
    for (const f of flyers) {
      const sprite = byId[f.sprite];
      if (!sprite) continue;
      if (f.start == null) {
        if (t < f.next) continue;
        f.start = t; f.dir = Math.random() < 0.5 ? 1 : -1; f.seed = Math.random() * 6; f.y = rand(0.25, 0.75);
      }
      if (f.flee != null) { f.start -= (t - (f.lastT ?? t)) * 2.5; } // dash away after a click
      f.lastT = t;
      const p = (t - f.start) / f.duration;
      if (p >= 1) { f.start = null; f.flee = null; f.next = t + rand(...f.every); continue; }
      f.pos = [0, 0, 0, 0];
      const [ax0, ay0, ax1, ay1] = f.area;
      const span = ax1 - ax0;
      const x = f.dir > 0 ? ax0 - span * 0.15 + p * span * 1.3 : ax1 + span * 0.15 - p * span * 1.3;
      const y = ay0 + (ay1 - ay0) * (f.y + 0.18 * Math.sin(p * Math.PI * 1.6 + f.seed));
      const [, , sw, sh] = sprite.rect;
      const w = sw * W * (f.scale ?? 1), h = sh * H * (f.scale ?? 1);
      const flap = 1 + 0.22 * Math.sin(t * TAU * 1.5 + f.seed);
      const [cx, cy] = px(x, y);
      f.pos = [x, y, (w / W) / 2, (h / H) / 2]; // for clicks
      ctx.save();
      ctx.globalAlpha = Math.min(1, p * 6, (1 - p) * 6);
      ctx.translate(cx, cy);
      ctx.rotate(0.12 * Math.cos(p * Math.PI * 1.6 + f.seed) * f.dir);
      // Mirror the sprite so it faces the way it flies (`faces`: how it was painted).
      const facesLeft = (f.faces ?? 'left') === 'left';
      ctx.scale(f.dir > 0 === facesLeft ? -1 : 1, flap);
      ctx.drawImage(sprite.img, -w / 2, -h / 2, w, h);
      ctx.restore();
    }
  }

  function drawBats(dt) {
    for (let i = bats.length - 1; i >= 0; i--) {
      const b = bats[i];
      b.age += dt;
      if (b.age > b.life) { bats.splice(i, 1); continue; }
      b.x += b.vx * dt;
      b.y += (b.vy + Math.sin(b.age * 5 + b.seed) * 0.02) * dt;
      const [cx, cy] = px(b.x, b.y);
      const s = b.size * W;
      const flap = Math.sin(b.age * 22 + b.seed);
      ctx.save();
      ctx.globalAlpha = Math.min(1, b.age * 4, (b.life - b.age) * 4) * 0.92;
      ctx.translate(cx, cy);
      ctx.scale(b.vx > 0 ? 1 : -1, 1);
      ctx.fillStyle = '#120608';
      ctx.beginPath(); // a bat silhouette: body + two flapping wings
      ctx.ellipse(0, 0, s * 0.18, s * 0.28, 0, 0, TAU);
      for (const side of [-1, 1]) {
        ctx.moveTo(0, -s * 0.05);
        ctx.quadraticCurveTo(side * s * 0.5, -s * (0.6 * flap + 0.2), side * s, -s * 0.15 * flap);
        ctx.quadraticCurveTo(side * s * 0.7, s * 0.1, side * s * 0.45, s * 0.05);
        ctx.quadraticCurveTo(side * s * 0.3, s * 0.2, 0, s * 0.1);
      }
      ctx.fill();
      ctx.restore();
    }
  }

  function drawStars(t) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const group of starSeeds) {
      for (const [x, y, seed, sz] of group) {
        const tw = Math.max(0, Math.sin(t * sz * 1.8 + seed));
        const [cx, cy] = px(x, y);
        ctx.globalAlpha = tw * 0.9;
        ctx.fillStyle = '#f2f6ff';
        const r = Math.max(0.8, W * 0.0007 * sz);
        ctx.fillRect(cx - r, cy - r * 3, r * 2, r * 6);
        ctx.fillRect(cx - r * 3, cy - r, r * 6, r * 2);
      }
    }
    ctx.restore();
  }

  function drawRings(t) {
    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i];
      const k = (t - r.t) / 1.4;
      if (k >= 1) { ripples.splice(i, 1); continue; }
      const [cx, cy] = px(r.x, r.y);
      ctx.save();
      ctx.globalAlpha = (1 - k) * 0.8;
      ctx.strokeStyle = r.color ?? '#ffb0b0';
      ctx.lineWidth = Math.max(1, W * 0.0012);
      for (const off of [0, 0.3]) {
        const kk = Math.max(0, k - off);
        if (!kk) continue;
        ctx.beginPath(); ctx.ellipse(cx, cy, r.rx * W * kk, r.ry * H * kk, 0, 0, TAU); ctx.stroke();
      }
      ctx.restore();
    }
    for (let i = sparkles.length - 1; i >= 0; i--) {
      const s = sparkles[i];
      const k = (t - s.t) / s.life;
      if (k >= 1) { sparkles.splice(i, 1); continue; }
      const [cx, cy] = px(s.x, s.y);
      const R = s.r * W * Math.sin(Math.PI * k);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.sin(Math.PI * k);
      ctx.translate(cx, cy); ctx.rotate(k * 2);
      ctx.fillStyle = s.color ?? '#fff3c4';
      ctx.beginPath();
      for (let j = 0; j < 8; j++) { const a = (j / 8) * TAU, rr = j % 2 ? R * 0.25 : R; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    for (let i = beams.length - 1; i >= 0; i--) {
      const b = beams[i];
      const k = (t - b.t) / 1.6;
      if (k >= 1) { beams.splice(i, 1); continue; }
      const [x0, y0] = px(b.x, b.y), y1 = b.to * H, w = b.w * W;
      const g = ctx.createLinearGradient(0, y0, 0, y1);
      g.addColorStop(0, '#9fffd8cc'); g.addColorStop(1, '#9fffd800');
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.sin(Math.PI * k) * 0.7;
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(x0 - w * 0.2, y0); ctx.lineTo(x0 + w * 0.2, y0); ctx.lineTo(x0 + w, y1); ctx.lineTo(x0 - w, y1); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }

  // ---- Loop ----
  let raf = 0, running = true;
  const t0 = performance.now();
  const frame = (now) => {
    raf = requestAnimationFrame(frame);
    // Always draw the first frame (the plate has holes until the parts are drawn), then pause while hidden.
    if (!running || (document.hidden && last) || now - last < 1000 / FPS) return;
    const dt = Math.min(0.1, (now - (last || now)) / 1000);
    last = now;
    const t = (now - t0) / 1000;
    clock = t;
    ctx.clearRect(0, 0, W, H);
    spawn(dt);
    drawFlows(t);
    drawStars(t);
    drawParticles(t, dt, ['mist', 'smoke']);
    drawFlyers(t);
    drawBats(dt);
    for (const p of parts) if (p.role !== 'sprite') drawPart(p, t);
    drawParticles(t, dt, ['bubble']);
    drawGlows(t);
    drawRings(t);
    drawParticles(t, dt, ['fire', 'ember', 'firefly', 'spore', 'petal']);
  };
  raf = requestAnimationFrame(frame);

  // ---- Clicking the scenery ----
  function partAt(x, y) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      if (p.role === 'sprite') continue;
      const [rx, ry, rw, rh] = p.rect;
      if (x < rx || y < ry || x > rx + rw || y > ry + rh) continue;
      const iw = p.img.naturalWidth, ih = p.img.naturalHeight;
      const ix = Math.floor(((x - rx) / rw) * iw), iy = Math.floor(((y - ry) / rh) * ih);
      if (p.alpha[(iy * iw + ix) * 4 + 3] > 90) return p;
    }
    return null;
  }
  const inPoly = (poly, x, y) => {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  };
  // What a click at board fractions (x, y) would hit, or null.
  function hitTest(x, y) {
    const flyer = flyers.find((f) => f.start != null && f.pos && Math.abs(x - f.pos[0]) < f.pos[2] && Math.abs(y - f.pos[1]) < f.pos[3] * 1.4);
    if (flyer) return { kind: 'flyer', flyer };
    const glow = (fx.glows ?? []).findIndex(([gx, gy, r]) => Math.hypot((x - gx) * 16 / 9, y - gy) < Math.max(r * 1.6, 0.014));
    if (glow >= 0) return { kind: 'glow', index: glow };
    const part = partAt(x, y);
    if (part?.react) return { kind: 'part', part };
    const poke = (fx.pokes ?? []).find((k) => x >= k.area[0] && y >= k.area[1] && x <= k.area[2] && y <= k.area[3]);
    if (poke) return { kind: 'poke', poke };
    if ((fx.flows ?? []).some((f) => inPoly(f.poly, x, y))) return { kind: 'water' };
    return null;
  }
  function poke(x, y) {
    const hit = hitTest(x, y);
    if (!hit) return false;
    const t = clock;
    if (hit.kind === 'part') {
      const p = hit.part;
      p.kick = t;
      if (p.motion?.type === 'wobble') { p.wobbleStart = t; }
      if (p.react.effect) {
        const [rx, ry, rw, rh] = p.rect;
        firePoke({ ...p.react, area: p.react.area ?? [rx, ry, rx + rw, ry + rh] }, t);
      } else play(p.react.sound);
    } else if (hit.kind === 'glow') {
      glowKick.set(hit.index, t);
      const [gx, gy] = fx.glows[hit.index];
      for (let i = 0; i < 14; i++) particles.push({ kind: 'ember', x: gx, y: gy, vx: rand(-0.03, 0.03), vy: rand(-0.09, -0.03), life: rand(0.6, 1.4), age: 0, r: rand(0.0008, 0.0018), seed: Math.random() * 9 });
      play(fx.glowSound ?? 'whoosh');
    } else if (hit.kind === 'flyer') {
      hit.flyer.flee = t;
      play('screech');
    } else if (hit.kind === 'water') {
      for (let i = 0; i < 8; i++) particles.push({ kind: 'mist', x: x + rand(-0.01, 0.01), y: y + rand(-0.01, 0.01), vx: rand(-0.02, 0.02), vy: rand(-0.03, -0.005), life: rand(0.8, 1.6), age: 0, r: rand(0.006, 0.012), seed: 0 });
      play('splash');
    } else if (hit.kind === 'poke') {
      firePoke(hit.poke, t);
    }
    return true;
  }
  function firePoke(k, t) {
    {
      const [ex, ey] = k.at ?? [(k.area[0] + k.area[2]) / 2, k.area[1]];
      if (k.effect === 'bats') spawnBats(k.batArea ?? k.area, 7);
      if (k.effect === 'ripple') ripples.push({ t, x: ex, y: k.at?.[1] ?? (k.area[1] + k.area[3]) / 2, rx: (k.area[2] - k.area[0]) / 2, ry: (k.area[3] - k.area[1]) / 2, color: k.color });
      if (k.effect === 'sparkle') for (let i = 0; i < 6; i++) sparkles.push({ t: t + i * 0.08, x: rand(k.area[0], k.area[2]), y: rand(k.area[1], k.area[3]), r: rand(0.006, 0.012), life: 0.7, color: k.color });
      if (k.effect === 'bubbles') for (let i = 0; i < 16; i++) particles.push({ kind: 'bubble', x: rand(k.area[0], k.area[2]), y: k.area[3] - rand(0, 0.02), vx: 0, vy: rand(-0.12, -0.06), life: 3, age: 0, r: rand(0.001, 0.003), seed: Math.random() * 9, top: k.area[1] });
      if (k.effect === 'beam') beams.push({ t, x: ex, y: ey, to: k.beamTo ?? ey + 0.25, w: k.beamWidth ?? 0.03 });
      if (k.effect === 'spores') for (let i = 0; i < 22; i++) particles.push({ kind: 'spore', x: ex + rand(-0.01, 0.01), y: ey + rand(-0.01, 0.01), vx: rand(-0.04, 0.04), vy: rand(-0.06, -0.01), life: rand(1.5, 3), age: 0, r: rand(0.001, 0.0022), seed: Math.random() * 9, color: k.color ?? '#c9a6ff' });
      if (k.effect === 'fireflies') for (let i = 0; i < 10; i++) particles.push({ kind: 'firefly', x: ex + rand(-0.02, 0.02), y: ey + rand(-0.02, 0.02), vx: rand(-0.03, 0.03), vy: rand(-0.03, 0.01), life: rand(2, 4), age: 0, r: rand(0.0012, 0.002), seed: Math.random() * 9 });
      if (k.effect === 'erupt') {
        for (let i = 0; i < 18; i++) particles.push({ kind: 'smoke', x: ex + rand(-0.004, 0.004), y: ey, vx: rand(-0.01, 0.012), vy: rand(-0.04, -0.015), life: rand(2, 4), age: 0, r: rand(0.006, 0.012), seed: 0 });
        for (let i = 0; i < 26; i++) particles.push({ kind: 'ember', x: ex, y: ey + 0.01, vx: rand(-0.05, 0.05), vy: rand(-0.12, -0.04), life: rand(0.8, 1.8), age: 0, r: rand(0.001, 0.0024), seed: Math.random() * 9 });
      }
      play(k.sound ?? 'rumble');
    }
  }

  return {
    plate,
    // Board fractions (0..1) in; true if something there reacted.
    poke,
    canPoke: (x, y) => !!hitTest(x, y),
    pause() { running = false; },
    resume() { running = true; },
    stop() { cancelAnimationFrame(raf); ro.disconnect(); canvas.remove(); },
  };
}
