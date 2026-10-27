// Living boards: the Circles of Hell (Demons' Descent) and the realm boards. A canvas over the
// painting brings each board to life from a list of layers (circle-fx-defs.js for the circles,
// board-fx-defs.js for the realms), all placed in the painting's own pixels (landscape
// 1024x572, portrait 459x1024):
//
//   plate      (automatic) the painting with the moving sprites painted out, drawn first, so no
//              still copy shows behind anything that moves (tools/board-fx.py)
//   sprites    every grass tuft, twig, reed or frond cut out on its own (tools/board-fx.py),
//              each swaying around its own root with its own phase; gusts of wind roll
//              across the board and bend them in turn
//
//   mask       a light mask cut from the painting (tools/circle-fx-masks.py), drawn glowing:
//              anim pulse | flicker | wave (a band of light travelling along it) | seq (runes
//              lighting in turn) | drift (the glow wavers about, for spirits)
//   crawlers   many small painted creatures (bees on the comb), each wandering and twitching
//              a little on its own; a tap nearby makes them scurry
//   echo       a feathered copy of part of the painting that moves (sway, bob, rock, breathe):
//              ghosts drifting, hands clawing, boulders straining, flames licking
//   particles  embers, ash, motes, wisps, rain, bubbles, petals, sparks, glints (sampled from a
//              mask, so coins glint only on coins), drips, flies, smoke, bees (striped, wings
//              blurring, a shadow below; they wander and turn), snow (drifting flakes at
//              three depths, nearer ones bigger and faster, pushed along by the gusts)
//   fog        soft banks of mist drifting along an edge
//   rays       shafts of light, breathing
//   glow       point lights: windows flicker, eyes blink, embers pulse
//   flames     procedural tongues of fire over painted flames
//   lightning  bolts that strike a zone now and then, flashing the painted lightning too
//   meteors    fireballs streaking down a sky
//   arrows     flaming arrows loosed from a bow along an arc
//   stream     particles flowing along a path (the storm of souls, the Styx, a lava fall)
//   vortex     a slow spiral of streaks around a centre (a storm eye)
//   flyers     bats and harpies crossing the sky
//
// Tapping the scenery (pokes) makes it react: a sound plus a burst, a strike or a flare, and a
// flash of the circle's light with sparks flying out (flare); its glyph is flung by main.js.
// Any layer can wait for a tap: `idle` scales it at rest (0 = hidden until kicked) and
// `kickDur` sets how long a kick lasts (a campfire flaring up for a few seconds).
// Canvas 2D at 60 fps, device pixel ratio capped at 1.5. Reduced motion: not started.

import { BOARD_MASKS } from '../cards/board-fx-masks.js';
import { CIRCLE_MASKS } from '../cards/circle-fx-masks.js';
import { BOARD_FX } from './board-fx-defs.js';
import { CIRCLE_FX } from './circle-fx-defs.js';
import { play } from './sound.js';

const TAU = Math.PI * 2;
const FPS = 60;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
// A soft, non-repeating wobble from a few sines (deterministic per seed).
const wave = (t, seed = 0) => Math.sin(t * 1.7 + seed) * 0.5 + Math.sin(t * 2.9 + seed * 1.3) * 0.3 + Math.sin(t * 5.3 + seed * 2.1) * 0.2;
const lerp = (a, b, k) => a + (b - a) * k;
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${Math.max(0, Math.min(1, a)).toFixed(3)})`;

export const CIRCLE_SIZE = { land: [1024, 572], portrait: [459, 1024] };

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${src}`));
    img.src = new URL(src, document.baseURI).href;
  });
}

// Points where a mask is strong (for glints that land only on gold, and the like).
function maskPoints(img, box, min = 140, cap = 600) {
  const c = document.createElement('canvas');
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height).data;
  const pts = [];
  for (let y = 0; y < c.height; y += 2) {
    for (let x = 0; x < c.width; x += 2) if (d[(y * c.width + x) * 4 + 3] >= min) pts.push([box[0] + x, box[1] + y]);
  }
  while (pts.length > cap) pts.splice(Math.floor(Math.random() * pts.length), 1);
  return pts;
}

// A feathered copy of part of the painting, for echoes.
function featherCrop(img, [x0, y0, x1, y1], [IW, IH], feather) {
  const sx = img.naturalWidth / IW, sy = img.naturalHeight / IH;
  const w = Math.round((x1 - x0) * sx), h = Math.round((y1 - y0) * sy);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.drawImage(img, x0 * sx, y0 * sy, w, h, 0, 0, w, h);
  g.globalCompositeOperation = 'destination-in';
  const f = Math.max(1, feather * sx);
  // Soft edges on all four sides: a horizontal and a vertical alpha ramp.
  const gx = g.createLinearGradient(0, 0, w, 0);
  gx.addColorStop(0, 'rgba(0,0,0,0)'); gx.addColorStop(Math.min(0.49, f / w), '#000');
  gx.addColorStop(Math.max(0.51, 1 - f / w), '#000'); gx.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gx; g.fillRect(0, 0, w, h);
  const gy = g.createLinearGradient(0, 0, 0, h);
  gy.addColorStop(0, 'rgba(0,0,0,0)'); gy.addColorStop(Math.min(0.49, f / h), '#000');
  gy.addColorStop(Math.max(0.51, 1 - f / h), '#000'); gy.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gy; g.fillRect(0, 0, w, h);
  return c;
}

// A soft round sprite (fog puffs, glows), cached per colour.
const spriteCache = new Map();
function softSprite(color, size = 128, hard = 0) {
  const key = `${color}|${size}|${hard}`;
  if (spriteCache.has(key)) return spriteCache.get(key);
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grd.addColorStop(0, rgba(color, 1));
  grd.addColorStop(hard, rgba(color, 0.85));
  grd.addColorStop(1, rgba(color, 0));
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  spriteCache.set(key, c);
  return c;
}

// A jagged lightning path from a to b (with a branch or two).
function boltPath(a, b, jag, depth = 0) {
  const pts = [a];
  const n = 9 + Math.floor(Math.random() * 5);
  const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  for (let i = 1; i < n; i++) {
    const k = i / n;
    const off = (Math.random() - 0.5) * jag * (1 - Math.abs(k - 0.5));
    pts.push([a[0] + dx * k + nx * off, a[1] + dy * k + ny * off]);
  }
  pts.push(b);
  const branches = [];
  if (depth < 1) {
    for (let i = 0; i < 2; i++) {
      if (Math.random() < 0.6) {
        const from = pts[2 + Math.floor(Math.random() * (pts.length - 4))];
        const ang = Math.atan2(dy, dx) + rand(-0.9, 0.9);
        const l = len * rand(0.2, 0.4);
        branches.push(boltPath(from, [from[0] + Math.cos(ang) * l, from[1] + Math.sin(ang) * l], jag * 0.6, depth + 1).main);
      }
    }
  }
  return { main: pts, branches };
}

// Which boards have living effects: a circle number (1-9) or a realm board's file name.
export const hasBoardFx = (key, orient) => !!(typeof key === 'number' ? CIRCLE_FX : BOARD_FX)[`${key}-${orient}`];
export const startCircleFx = (host, n, orient) => startBoardFx(host, n, orient);

export async function startBoardFx(host, key, orient) {
  const circle = typeof key === 'number';
  const def = (circle ? CIRCLE_FX : BOARD_FX)[`${key}-${orient}`];
  if (!def) return null;
  const [IW, IH] = CIRCLE_SIZE[orient];
  const maskInfo = (circle ? CIRCLE_MASKS : BOARD_MASKS)[`${key}-${orient}`] ?? {};
  const file = circle ? `circle${key}` : key;
  const boardSrc = orient === 'land' ? `art/boards-v2/${file}.jpg` : `art/boards-portrait/${file}.jpg`;
  const needBoard = def.layers.some((l) => l.type === 'echo' || l.type === 'crawlers');
  const usedMasks = new Set(def.layers.flatMap((l) => [l.mask, l.area?.mask, l.flashMask].filter(Boolean)));
  const masks = {};
  await Promise.all([...usedMasks].map(async (name) => {
    const info = maskInfo[name];
    if (!info) return;
    masks[name] = { ...info, img: await loadImage(info.src) };
  }));
  const board = needBoard ? await loadImage(boardSrc) : null;
  // The clean plate goes under everything once the sprites cut from it are moving.
  const plate = maskInfo._plate && def.layers.some((l) => l.type === 'sprites') ? await loadImage(maskInfo._plate) : null;

  const canvas = document.createElement('canvas');
  canvas.className = 'circle-fx';
  host.append(canvas);
  const ctx = canvas.getContext('2d');
  const off = document.createElement('canvas'); // scratch for travelling waves
  const offCtx = off.getContext('2d');
  let W = 1, H = 1, S = 1, SX = 1, SY = 1;
  let last = 0;
  // The canvas can be moved to a fresh host (portrait boards re-render), so size it from
  // whatever it sits in now; the frame loop re-checks that every frame.
  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const box = canvas.parentElement ?? host;
    W = Math.max(1, Math.round(box.clientWidth * dpr));
    H = Math.max(1, Math.round(box.clientHeight * dpr));
    canvas.width = W; canvas.height = H;
    SX = W / IW; SY = H / IH; S = (SX + SY) / 2;
    last = 0;
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(host);

  // ---- Per-layer state ----
  const layers = def.layers.map((l, i) => {
    const st = { ...l, i, seed: Math.random() * 100, parts: [], acc: 0, kick: -99, next: rand(...(l.every ?? [3, 8])) };
    if (l.type === 'echo') st.crop = featherCrop(board, l.box, [IW, IH], l.feather ?? 6);
    if (l.type === 'crawlers') st.items = l.boxes.map((b) => ({ box: b, crop: featherCrop(board, b, [IW, IH], l.feather ?? 4), seed: Math.random() * 100, kick: -99 }));
    if (l.type === 'sprites' && masks[l.mask]?.parts) {
      // Each part: its box, its spot in the atlas, its root (bottom centre) and its own rhythm.
      st.parts = masks[l.mask].parts.map(([x0, y0, x1, y1, ax, ay]) => ({
        x0, y0, x1, y1, ax, ay, w: x1 - x0, h: y1 - y0, px: (x0 + x1) / 2, py: y1,
        ph: Math.random() * TAU, per: rand(...(l.period ?? [2.6, 4.2])), stiff: rand(0.75, 1.25), kick: -99,
      }));
    }
    if (l.type === 'particles' && l.area?.mask && masks[l.area.mask]) st.points = maskPoints(masks[l.area.mask].img, masks[l.area.mask].box);
    if (l.type === 'fog') {
      st.puffs = Array.from({ length: l.count ?? 8 }, () => ({
        x: rand(l.area[0], l.area[2]), y: rand(l.area[1], l.area[3]), r: rand(...(l.size ?? [40, 90])),
        v: rand(0.6, 1.4) * (l.speed ?? 6) * (Math.random() < (l.leftward ?? 0.5) ? -1 : 1), ph: Math.random() * TAU,
      }));
    }
    if (l.type === 'stream') {
      // Path length table, for even flow along the polyline.
      const segs = [];
      let tot = 0;
      for (let k = 1; k < l.path.length; k++) {
        const a = l.path[k - 1], b = l.path[k];
        const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
        segs.push({ a, b, len, at: tot });
        tot += len;
      }
      st.segs = segs; st.total = tot;
      st.parts = Array.from({ length: l.count ?? 30 }, () => ({ s: Math.random() * tot, o: rand(-1, 1), v: rand(0.7, 1.3), ph: Math.random() * TAU, size: rand(...(l.size ?? [1, 3])) }));
    }
    if (l.type === 'vortex') st.parts = Array.from({ length: l.count ?? 40 }, () => ({ a: Math.random() * TAU, r: Math.random(), v: rand(0.6, 1.4), len: rand(0.3, 0.9) }));
    return st;
  });

  const at = (p, l) => p ?? l;
  // How strongly a layer was kicked by a tap (1 right after, fading to 0 over its kickDur).
  const kicked = (st, t, dur) => Math.max(0, 1 - (t - st.kick) / (st.kickDur ?? dur));
  const idleK = (st, t, dur) => (st.idle ?? 1) * (1 - kicked(st, t, dur)) + kicked(st, t, dur);

  // ---- Wind: gusts roll across the board now and then, bending grass and pushing the snow. ----
  const W0 = def.wind ?? null;
  const gusts = [];
  let gustNext = W0 ? rand(...(W0.every ?? [5, 11])) : Infinity;
  function stepWind(dt) {
    if (!W0) return;
    gustNext -= dt;
    if (gustNext <= 0) {
      const width = rand(...(W0.width ?? [140, 260]));
      gusts.push({ x: (W0.dir ?? 1) > 0 ? -width : IW + width, width, v: rand(...(W0.speed ?? [180, 300])) * (W0.dir ?? 1), str: rand(0.6, 1) });
      gustNext = rand(...(W0.every ?? [5, 11]));
    }
    for (const g of gusts) g.x += g.v * dt;
    for (let i = gusts.length - 1; i >= 0; i--) if (gusts[i].x < -2 * gusts[i].width - IH || gusts[i].x > IW + 2 * gusts[i].width + IH) gusts.splice(i, 1);
  }
  // 0..1: how hard the wind is blowing at a spot right now (fronts lean with the height).
  function gustAt(x, y) {
    let g = 0;
    for (const q of gusts) {
      const d = (x + (y - IH / 2) * (W0.lean ?? 0.35) - q.x) / q.width;
      if (d > -1 && d < 1) g += q.str * Math.cos(d * Math.PI / 2) ** 2;
    }
    return Math.min(1, g);
  }
  const along = (st, s) => {
    s = ((s % st.total) + st.total) % st.total;
    for (const g of st.segs) {
      if (s <= g.at + g.len) {
        const k = (s - g.at) / (g.len || 1);
        const dx = g.b[0] - g.a[0], dy = g.b[1] - g.a[1];
        return { x: g.a[0] + dx * k, y: g.a[1] + dy * k, nx: -dy / (g.len || 1), ny: dx / (g.len || 1) };
      }
    }
    const g = st.segs[st.segs.length - 1];
    return { x: g.b[0], y: g.b[1], nx: 0, ny: 0 };
  };

  // ---- Particles ----
  function spawn(st, x, y, extra = {}) {
    const k = st.kind;
    const p = { x, y, age: 0, life: rand(...(st.life ?? [2, 4])), size: rand(...(st.size ?? [1, 3])), seed: Math.random() * 100, ...extra };
    const sp = st.speed ?? 1;
    if (k === 'ember') { p.vx = rand(-4, 4) * sp; p.vy = rand(-26, -12) * sp; }
    else if (k === 'ash') { p.vx = rand(-5, 5) * sp; p.vy = rand(6, 16) * sp; }
    else if (k === 'bee') { const a = rand(0, TAU), v = rand(22, 42) * sp; p.vx = Math.cos(a) * v; p.vy = Math.sin(a) * v; p.turn = rand(-2, 2); }
    else if (k === 'snow') { p.z = pick([0.45, 0.7, 1]); p.size *= p.z; p.vx = (st.drift ?? 14) * p.z * rand(0.7, 1.3) * sp; p.vy = rand(-2, 6) * p.z * sp; }
    else if (k === 'mote') { p.vx = rand(-3, 3) * sp; p.vy = rand(-4, 2) * sp; }
    else if (k === 'wisp') { p.vx = rand(-3, 3) * sp; p.vy = rand(-14, -6) * sp; }
    else if (k === 'rain') { p.vx = (st.wind ?? -60) * sp; p.vy = rand(380, 460) * sp; p.len = rand(9, 16); }
    else if (k === 'bubble') { p.vx = rand(-2, 2); p.vy = rand(-10, -4) * sp; }
    else if (k === 'petal') { p.vx = rand(-8, 8) * sp; p.vy = rand(4, 12) * sp; p.rot = Math.random() * TAU; }
    else if (k === 'spark') { const a = rand(0, TAU); const v = rand(20, 70) * sp; p.vx = Math.cos(a) * v; p.vy = Math.sin(a) * v - 20; }
    else if (k === 'glint') { p.vx = 0; p.vy = 0; }
    else if (k === 'drip') { p.vx = 0; p.vy = 0; p.y0 = y; p.hang = rand(0.4, 1.2); }
    else if (k === 'fly') { p.cx = x; p.cy = y; p.vx = 0; p.vy = 0; p.r = rand(5, 12); p.w = rand(4, 8) * (Math.random() < 0.5 ? -1 : 1); }
    else if (k === 'smoke') { p.vx = rand(-2, 3) * sp; p.vy = rand(-12, -6) * sp; }
    else if (k === 'splash') { p.vx = 0; p.vy = 0; }
    else { p.vx = 0; p.vy = 0; }
    st.parts.push(p);
    return p;
  }
  function emitPoint(st) {
    if (st.points?.length) { const q = pick(st.points); return [q[0] + rand(-1, 1), q[1] + rand(-1, 1)]; }
    if (st.from?.length) { const q = pick(st.from); return [q[0] + rand(-(q[2] ?? 0), q[2] ?? 0), q[1]]; }
    const a = st.area;
    return [rand(a[0], a[2]), rand(a[1], a[3])];
  }
  function stepParticles(st, dt, t) {
    const max = st.max ?? 60;
    st.acc += (st.rate ?? 6) * dt;
    while (st.acc >= 1) { st.acc -= 1; if (st.parts.length < max) { const [x, y] = emitPoint(st); spawn(st, x, y); } }
    const k = st.kind;
    for (const p of st.parts) {
      p.age += dt;
      if (k === 'fly') { p.x = p.cx + Math.cos(t * p.w + p.seed) * p.r + Math.sin(t * 7 + p.seed) * 2; p.y = p.cy + Math.sin(t * p.w * 1.3 + p.seed) * p.r * 0.6; continue; }
      if (k === 'drip') {
        if (p.age < p.hang) continue;
        p.vy += 520 * dt; p.y += p.vy * dt;
        if (p.y - p.y0 > (st.fall ?? 30)) { p.age = p.life; if (st.splash !== false) splashAt(st, p.x, p.y); }
        continue;
      }
      if (k === 'wisp' || k === 'mote' || k === 'smoke' || k === 'petal') p.vx += wave(t * 0.8, p.seed) * 6 * dt;
      if (k === 'ember') { p.vx += wave(t * 1.4, p.seed) * 18 * dt; }
      if (k === 'spark') p.vy += 60 * dt;
      if (k === 'bee') {
        // Wander: the heading drifts, and they turn back toward the middle of their area.
        const a = st.area?.length ? st.area : [0, 0, IW, IH];
        p.turn += rand(-6, 6) * dt; p.turn = Math.max(-3, Math.min(3, p.turn));
        let h = Math.atan2(p.vy, p.vx) + p.turn * dt;
        const cx = (a[0] + a[2]) / 2, cy = (a[1] + a[3]) / 2;
        if (p.x < a[0] || p.x > a[2] || p.y < a[1] || p.y > a[3]) h = Math.atan2(cy - p.y, cx - p.x);
        const v = Math.hypot(p.vx, p.vy);
        p.vx = Math.cos(h) * v; p.vy = Math.sin(h) * v;
      }
      if (k === 'snow') {
        // Flakes wander, and a passing gust shoves them along (the nearest ones the most).
        const g = W0 ? gustAt(p.x, p.y) : 0;
        p.x += (wave(t * 0.7, p.seed) * 6 + g * (st.gustPush ?? 70) * (W0?.dir ?? 1)) * p.z * dt;
        p.y += wave(t * 0.5, p.seed + 4) * 3 * p.z * dt;
      }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (k === 'rain' && st.floor != null && p.y > st.floor) { p.age = p.life; if (Math.random() < 0.35) splashAt(st, p.x, st.floor); }
    }
    st.parts = st.parts.filter((p) => p.age < p.life);
    if (st.splashes) { for (const s of st.splashes) s.age += dt; st.splashes = st.splashes.filter((s) => s.age < 0.45); }
  }
  function splashAt(st, x, y) { (st.splashes ??= []).push({ x, y, age: 0 }); }
  function drawParticles(st, t) {
    const k = st.kind;
    const c = st.color ?? [255, 200, 120];
    ctx.globalCompositeOperation = st.blend ?? (k === 'ash' || k === 'smoke' || k === 'fly' || k === 'petal' || k === 'snow' || k === 'bee' ? 'source-over' : 'lighter');
    for (const p of st.parts) {
      const life = p.age / p.life;
      const fade = Math.min(1, p.age / 0.3) * (1 - life);
      const x = p.x * SX, y = p.y * SY, r = p.size * S;
      if (k === 'rain') {
        ctx.strokeStyle = rgba(c, 0.35 * fade + 0.1);
        ctx.lineWidth = Math.max(1, 0.8 * S);
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - p.vx * 0.025 * S, y - p.len * S); ctx.stroke();
      } else if (k === 'glint') {
        const a = Math.sin(life * Math.PI);
        ctx.fillStyle = rgba(c, a);
        const l = r * 3 * a;
        ctx.save(); ctx.translate(x, y); ctx.rotate(p.seed);
        ctx.beginPath(); ctx.moveTo(-l, 0); ctx.lineTo(0, -r * 0.35); ctx.lineTo(l, 0); ctx.lineTo(0, r * 0.35); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(0, -l); ctx.lineTo(r * 0.35, 0); ctx.lineTo(0, l); ctx.lineTo(-r * 0.35, 0); ctx.closePath(); ctx.fill();
        ctx.restore();
        ctx.drawImage(softSprite(c, 32), x - r * 2.5, y - r * 2.5, r * 5, r * 5);
      } else if (k === 'wisp') {
        const a = fade * (st.alpha ?? 0.35);
        ctx.globalAlpha = a;
        ctx.drawImage(softSprite(c, 64), x - r * 1.2, y - r * 3, r * 2.4, r * 6);
        ctx.globalAlpha = 1;
      } else if (k === 'smoke') {
        const g = r * (1 + life * 2.5);
        ctx.globalAlpha = fade * (st.alpha ?? 0.25);
        ctx.drawImage(softSprite(c, 64), x - g, y - g, g * 2, g * 2);
        ctx.globalAlpha = 1;
      } else if (k === 'bee') {
        // Shadow on the ground, wings a flicker of pale blur, then the striped body.
        const ang = Math.atan2(p.vy, p.vx);
        const a = Math.min(1, p.age / 0.4, (p.life - p.age) / 0.4);
        ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
        ctx.globalAlpha = a * 0.25; ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.ellipse(r * 2, r * 3, r * 1.3, r * 0.7, 0, 0, TAU); ctx.fill();
        ctx.globalAlpha = a * (0.45 + 0.35 * Math.sin(t * 90 + p.seed));
        ctx.fillStyle = '#eef6ff';
        ctx.beginPath(); ctx.ellipse(-r * 0.1, -r * 0.9, r * 0.9, r * 0.5, -0.4, 0, TAU); ctx.ellipse(-r * 0.1, r * 0.9, r * 0.9, r * 0.5, 0.4, 0, TAU); ctx.fill();
        ctx.globalAlpha = a;
        ctx.fillStyle = rgba(c, 1);
        ctx.beginPath(); ctx.ellipse(0, 0, r * 1.3, r * 0.65, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = rgba(st.stripe ?? [30, 20, 10], 1);
        ctx.fillRect(-r * 0.5, -r * 0.62, r * 0.32, r * 1.24); ctx.fillRect(r * 0.1, -r * 0.6, r * 0.3, r * 1.2);
        ctx.beginPath(); ctx.ellipse(-r * 1.15, 0, r * 0.35, r * 0.3, 0, 0, TAU); ctx.fill();
        ctx.restore(); ctx.globalAlpha = 1;
      } else if (k === 'snow') {
        // A soft flake with a faint shadow on the ground below it (further below the nearer it is).
        const a = fade * (st.alpha ?? 0.9);
        const sh = 3 * p.z * S;
        ctx.globalAlpha = a * 0.22;
        ctx.drawImage(softSprite([40, 50, 70], 32), x + sh - r * 1.4, y + sh * 1.4 - r * 1.4, r * 2.8, r * 2.8);
        ctx.globalAlpha = a;
        ctx.drawImage(softSprite(c, 32, 0.45), x - r * 1.3, y - r * 1.3, r * 2.6, r * 2.6);
        ctx.globalAlpha = 1;
      } else if (k === 'fly') {
        ctx.fillStyle = rgba(c, 0.85);
        ctx.fillRect(x, y, Math.max(1, r), Math.max(1, r));
      } else if (k === 'drip') {
        ctx.fillStyle = rgba(c, 0.8);
        const stretch = p.age < p.hang ? 1 + (p.age / p.hang) * 0.8 : 1.6;
        ctx.beginPath(); ctx.ellipse(x, y, r * 0.7, r * stretch, 0, 0, TAU); ctx.fill();
      } else if (k === 'bubble') {
        ctx.strokeStyle = rgba(c, 0.6 * fade);
        ctx.lineWidth = Math.max(1, 0.7 * S);
        ctx.beginPath(); ctx.arc(x, y, r * (0.6 + life * 0.6), 0, TAU); ctx.stroke();
      } else if (k === 'petal') {
        ctx.fillStyle = rgba(c, 0.85 * fade);
        ctx.save(); ctx.translate(x, y); ctx.rotate((p.rot ?? 0) + t * 2 + p.seed);
        ctx.beginPath(); ctx.ellipse(0, 0, r * 1.4, r * 0.6, 0, 0, TAU); ctx.fill(); ctx.restore();
      } else {
        // ember, ash, mote, spark: a dot with a halo
        const flick = k === 'ember' ? 0.7 + 0.3 * Math.sin(t * 20 + p.seed * 7) : 1;
        const a = fade * flick * (st.alpha ?? 1);
        if (k !== 'ash') ctx.drawImage(softSprite(c, 32), x - r * 2.5, y - r * 2.5, r * 5, r * 5);
        ctx.fillStyle = k === 'ash' ? rgba(c, a * 0.7) : rgba([255, 255, 230], a * 0.8);
        ctx.beginPath(); ctx.arc(x, y, Math.max(0.6, r * 0.5), 0, TAU); ctx.fill();
      }
    }
    // Splash rings where rain and drips land.
    if (st.splashes?.length) {
      ctx.globalCompositeOperation = 'lighter';
      for (const s of st.splashes) {
        const k2 = s.age / 0.45;
        ctx.strokeStyle = rgba(st.splashColor ?? c, 0.5 * (1 - k2));
        ctx.lineWidth = Math.max(1, 0.7 * S);
        ctx.beginPath(); ctx.ellipse(s.x * SX, s.y * SY, (2 + k2 * 7) * S, (0.8 + k2 * 2.4) * S, 0, 0, TAU); ctx.stroke();
      }
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  // ---- Masks ----
  function maskAlpha(st, t) {
    const [lo, hi] = st.alpha ?? [0.2, 0.8];
    const a = st.anim ?? { kind: 'pulse', period: 3 };
    const kick = kicked(st, t, 1.2);
    let k;
    if (a.kind === 'flicker') k = 0.5 + 0.5 * wave(t * (a.speed ?? 3), st.seed);
    else if (a.kind === 'steady') k = 1;
    else k = 0.5 + 0.5 * Math.sin(TAU * t / (a.period ?? 3) + (a.phase ?? 0) + st.seed * 0);
    return Math.min(1.4, lerp(lo, hi, k) + kick * 0.8);
  }
  // A repeating band of light (lo -> hi -> lo) along x or y, cached per layer.
  function bandPattern(st, along, L) {
    const key = `${along}|${L}`;
    if (st.bandKey === key) return st.band;
    const pc = document.createElement('canvas');
    pc.width = along === 'x' ? L : 2; pc.height = along === 'x' ? 2 : L;
    const pg = pc.getContext('2d');
    const [lo, hi] = st.alpha ?? [0.2, 0.9];
    const g = along === 'x' ? pg.createLinearGradient(0, 0, L, 0) : pg.createLinearGradient(0, 0, 0, L);
    g.addColorStop(0, `rgba(0,0,0,${lo})`); g.addColorStop(0.5, `rgba(0,0,0,${hi})`); g.addColorStop(1, `rgba(0,0,0,${lo})`);
    pg.fillStyle = g; pg.fillRect(0, 0, pc.width, pc.height);
    st.bandKey = key; st.band = offCtx.createPattern(pc, 'repeat');
    return st.band;
  }
  function drawMask(st, t) {
    const m = masks[st.mask];
    if (!m) return;
    const [x0, y0, x1, y1] = m.box;
    const dx = x0 * SX, dy = y0 * SY, dw = (x1 - x0) * SX, dh = (y1 - y0) * SY;
    const a = st.anim ?? {};
    const kick = kicked(st, t, 1.2);
    ctx.globalCompositeOperation = st.blend ?? 'lighter';
    if (a.kind === 'wave' || a.kind === 'seq') {
      // The mask, faded through moving light: travelling bands (wave: lava flowing, water running)
      // or a soft spotlight sweeping across it (seq: runes lighting one after another).
      const ow = Math.max(1, Math.ceil(dw)), oh = Math.max(1, Math.ceil(dh));
      if (off.width !== ow || off.height !== oh) { off.width = ow; off.height = oh; } else offCtx.clearRect(0, 0, ow, oh);
      offCtx.globalCompositeOperation = 'source-over';
      offCtx.drawImage(m.img, 0, 0, ow, oh);
      offCtx.globalCompositeOperation = 'destination-in';
      if (a.kind === 'wave') {
        const along = a.along ?? 'x';
        const L = Math.max(4, Math.round((a.band ?? 120) * S));
        const shift = ((t * (a.speed ?? 40) * S) % L + L) % L;
        offCtx.fillStyle = bandPattern(st, along, L);
        offCtx.save();
        if (along === 'x') offCtx.translate(shift - L, 0); else offCtx.translate(0, shift - L);
        offCtx.fillRect(0, 0, ow + L, oh + L);
        offCtx.restore();
      } else {
        const [lo, hi] = st.alpha ?? [0.15, 0.95];
        const vertical = a.vertical ?? (oh > ow);
        const span = vertical ? oh : ow;
        const pos = ((t / (a.period ?? 6) + (a.phase ?? 0)) % 1) * span * 1.5 - span * 0.25;
        const sw = span * (a.width ?? 0.22);
        const g = vertical ? offCtx.createLinearGradient(0, pos - sw, 0, pos + sw) : offCtx.createLinearGradient(pos - sw, 0, pos + sw, 0);
        g.addColorStop(0, `rgba(0,0,0,${lo})`); g.addColorStop(0.5, `rgba(0,0,0,${hi})`); g.addColorStop(1, `rgba(0,0,0,${lo})`);
        offCtx.fillStyle = g;
        offCtx.fillRect(0, 0, ow, oh);
      }
      ctx.globalAlpha = Math.min(1, (st.gain ?? 1) + kick * 0.6);
      ctx.drawImage(off, dx, dy, dw, dh);
      if (st.bloom) {
        ctx.globalAlpha = Math.min(1, st.bloom + kick * 0.4);
        const b = 3 * S;
        ctx.drawImage(off, dx - b, dy - b, dw + 2 * b, dh + 2 * b);
      }
    } else {
      let ox = 0, oy = 0;
      if (a.kind === 'drift') { ox = wave(t * (a.speed ?? 0.5), st.seed) * (a.amp ?? 2) * SX; oy = wave(t * (a.speed ?? 0.5) * 0.8, st.seed + 3) * (a.amp ?? 2) * 0.6 * SY; }
      const al = Math.min(1, maskAlpha(st, t));
      ctx.globalAlpha = al;
      ctx.drawImage(m.img, dx + ox, dy + oy, dw, dh);
      if (st.bloom) {
        // A wider, softer second pass reads as light spilling off the mask.
        ctx.globalAlpha = al * st.bloom;
        const b = 3 * S;
        ctx.drawImage(m.img, dx - b + ox, dy - b + oy, dw + 2 * b, dh + 2 * b);
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  // ---- Sprites: every tuft and twig on its own root ----
  function drawSprites(st, t) {
    const m = masks[st.mask];
    if (!m || !st.parts.length) return;
    const bend = st.bend ?? 0.08;         // how far a tip travels at rest, per px of height
    const gustBend = st.gustBend ?? 0.22; // and when a gust hits it
    const dir = W0?.dir ?? 1;
    const kick = kicked(st, t, 1.4);
    ctx.globalCompositeOperation = 'source-over';
    for (const p of st.parts) {
      const g = W0 ? gustAt(p.px, p.py) : 0;
      const pk = Math.max(kick, Math.max(0, 1 - (t - p.kick) / 1.4));
      // Idle: a slow lean back and forth; a gust bends it downwind and it shivers there;
      // a tap nearby sets it thrashing for a moment.
      const idle = Math.sin(TAU * t / p.per + p.ph) * bend + Math.sin(TAU * t * 2.3 / p.per + p.ph * 2) * bend * 0.25;
      const gust = g * gustBend * (0.85 + 0.15 * Math.sin(t * 17 + p.ph)) * dir;
      const shake = pk * Math.sin(t * 22 + p.ph) * bend * 3;
      const d = (idle + gust + shake) * p.stiff * Math.min(1, p.h / 10);
      ctx.setTransform(1, 0, -d * SX / SY, 1, p.px * SX, p.py * SY);
      ctx.drawImage(m.img, p.ax, p.ay, p.w, p.h, (p.x0 - p.px) * SX, (p.y0 - p.py) * SY, p.w * SX, p.h * SY);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  // ---- Crawlers: small painted creatures wandering on the spot ----
  function drawCrawlers(st, t) {
    const amp = st.amp ?? 1.6;
    for (const it of st.items) {
      const k = Math.max(kicked(st, t, 1.5), Math.max(0, 1 - (t - it.kick) / 1.5));
      const a = amp * (1 + k * 2);
      // Mostly still, then a little scuttle: the wander only runs part of the time.
      const go = Math.max(0, Math.sin(t * 0.55 + it.seed)) ** 2 + k;
      const dx = wave(t * 0.9 * (1 + k), it.seed) * a * go, dy = wave(t * 0.8 * (1 + k), it.seed + 5) * a * go;
      const rot = wave(t * 1.3, it.seed + 9) * 0.12 * go;
      const [x0, y0, x1, y1] = it.box, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      ctx.save();
      ctx.translate((cx + dx) * SX, (cy + dy) * SY); ctx.rotate(rot);
      ctx.drawImage(it.crop, (x0 - cx) * SX, (y0 - cy) * SY, (x1 - x0) * SX, (y1 - y0) * SY);
      ctx.restore();
    }
  }

  // ---- Echoes ----
  function drawEcho(st, t) {
    const [x0, y0, x1, y1] = st.box;
    const m = st.motion ?? { kind: 'sway', amp: 1.5, period: 5 };
    const kick = kicked(st, t, 1.6);
    const ph = TAU * t / (m.period ?? 5) + (m.phase ?? st.seed);
    // kickAmp: still at rest (amp 0), it only shakes when tapped (a skull rattling).
    const amp = (m.amp ?? 1.5) * (1 + kick * 2.5) + kick * (m.kickAmp ?? 0);
    if (!amp) return; // nothing moving: the plate already shows it
    let dx = 0, dy = 0, rot = 0, sc = 1;
    if (m.kind === 'bob') dy = Math.sin(ph) * amp;
    else if (m.kind === 'drift') { dx = wave(t * (m.speed ?? 0.4), st.seed) * amp; dy = wave(t * (m.speed ?? 0.4) * 0.7, st.seed + 2) * amp * 0.7; }
    else if (m.kind === 'rock') rot = Math.sin(ph) * amp * Math.PI / 180;
    else if (m.kind === 'breathe') sc = 1 + Math.sin(ph) * amp * 0.01;
    else if (m.kind === 'claw') { dy = -Math.abs(Math.sin(ph)) * amp; rot = Math.sin(ph * 2) * amp * 0.4 * Math.PI / 180; }
    else { rot = Math.sin(ph) * amp * Math.PI / 180; dx = Math.sin(ph) * amp * 0.3; }
    const pv = m.pivot ?? [(x0 + x1) / 2, (y0 + y1) / 2];
    ctx.save();
    ctx.globalAlpha = st.alpha ?? 1;
    ctx.translate(pv[0] * SX + dx * SX, pv[1] * SY + dy * SY);
    ctx.rotate(rot);
    ctx.scale(sc, sc);
    ctx.drawImage(st.crop, (x0 - pv[0]) * SX, (y0 - pv[1]) * SY, (x1 - x0) * SX, (y1 - y0) * SY);
    ctx.restore();
  }

  // ---- Fog, rays, glows, flames ----
  function drawFog(st, dt, t) {
    const c = st.color ?? [200, 210, 225];
    const a = st.area;
    ctx.globalCompositeOperation = st.blend ?? 'source-over';
    for (const p of st.puffs) {
      p.x += (p.v + (W0 ? gustAt(p.x, p.y) * (st.gustPush ?? 40) * (W0.dir ?? 1) : 0)) * dt;
      if (p.x - p.r > a[2]) p.x = a[0] - p.r; else if (p.x + p.r < a[0]) p.x = a[2] + p.r;
      const y = p.y + Math.sin(t * 0.3 + p.ph) * 4;
      const al = (st.alpha ?? 0.18) * (0.75 + 0.25 * Math.sin(t * 0.5 + p.ph));
      ctx.globalAlpha = al;
      ctx.drawImage(softSprite(c, 128), (p.x - p.r) * SX, (y - p.r * 0.6) * SY, p.r * 2 * SX, p.r * 1.2 * SY);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
  function drawRays(st, t) {
    const c = st.color ?? [220, 235, 255];
    ctx.globalCompositeOperation = 'lighter';
    st.beams.forEach(([x, y, ang, len, w], i) => {
      const a = lerp(...(st.alpha ?? [0.04, 0.12]), 0.5 + 0.5 * Math.sin(t * TAU / (st.period ?? 7) + i * 1.9));
      ctx.save();
      ctx.translate(x * SX, y * SY);
      ctx.rotate(ang * Math.PI / 180 + Math.sin(t * 0.2 + i) * 0.015);
      const g = ctx.createLinearGradient(0, 0, 0, len * S);
      g.addColorStop(0, rgba(c, a)); g.addColorStop(1, rgba(c, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-w * 0.35 * S, 0); ctx.lineTo(w * 0.35 * S, 0); ctx.lineTo(w * 0.6 * S, len * S); ctx.lineTo(-w * 0.6 * S, len * S);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    });
    ctx.globalCompositeOperation = 'source-over';
  }
  function drawGlows(st, t) {
    const c = st.color ?? [255, 160, 60];
    ctx.globalCompositeOperation = 'lighter';
    const kick = kicked(st, t, 1.0);
    st.points.forEach(([x, y, r], i) => {
      let k;
      const an = st.anim ?? 'pulse';
      if (an === 'flicker') k = 0.55 + 0.45 * wave(t * 4, i * 7.3 + st.seed);
      else if (an === 'blink') {
        // Eyes: open most of the time, a quick blink every few seconds (pairs blink together).
        const cyc = (t + (st.pair ? Math.floor(i / 2) : i) * 1.7 + st.seed) % (st.period ?? 5);
        k = cyc < 0.16 ? Math.abs(cyc - 0.08) / 0.08 : 0.8 + 0.2 * Math.sin(t * 3 + i);
      } else k = 0.5 + 0.5 * Math.sin(TAU * t / (st.period ?? 3) + i * 1.3);
      const a = lerp(...(st.alpha ?? [0.25, 0.8]), k) + kick * 0.7;
      ctx.globalAlpha = Math.min(1, a);
      const R = r * S * (1 + kick * 0.6);
      ctx.drawImage(softSprite(c, 64, st.hard ?? 0.15), x * SX - R, y * SY - R, R * 2, R * 2);
    });
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
  function drawFlames(st, t) {
    const vis = idleK(st, t, 1.2);
    if (vis <= 0.01) return;
    ctx.globalCompositeOperation = 'lighter';
    const kick = st.idle === 0 ? 0.3 : kicked(st, t, 1.2);
    ctx.save();
    ctx.globalAlpha = vis;
    st.points.forEach(([x, y, w, h], i) => {
      const grow = 1 + kick * 0.8;
      for (let j = 0; j < (st.tongues ?? 5); j++) {
        const seed = i * 13 + j * 3.1 + st.seed;
        const fx = x + (j / Math.max(1, (st.tongues ?? 5) - 1) - 0.5) * w * 0.8;
        const fh = h * grow * (0.55 + 0.45 * (0.5 + 0.5 * wave(t * 3.2, seed)));
        const lean = wave(t * 1.6, seed + 5) * w * 0.15;
        const g = ctx.createLinearGradient(0, y * SY, 0, (y - fh) * SY);
        g.addColorStop(0, `rgba(255,${200 + j * 8},90,${0.42 * (st.alpha ?? 1)})`);
        g.addColorStop(0.45, `rgba(255,120,30,${0.3 * (st.alpha ?? 1)})`);
        g.addColorStop(1, 'rgba(200,40,0,0)');
        ctx.fillStyle = g;
        const bw = w * 0.22;
        ctx.beginPath();
        ctx.moveTo((fx - bw) * SX, y * SY);
        ctx.quadraticCurveTo((fx - bw * 0.9 + lean * 0.5) * SX, (y - fh * 0.5) * SY, (fx + lean) * SX, (y - fh) * SY);
        ctx.quadraticCurveTo((fx + bw * 0.9 + lean * 0.5) * SX, (y - fh * 0.5) * SY, (fx + bw) * SX, y * SY);
        ctx.closePath();
        ctx.fill();
      }
      // Heat glow under the flames.
      ctx.globalAlpha = vis * (0.35 + 0.25 * wave(t * 2.5, i) + kick * 0.4);
      ctx.drawImage(softSprite([255, 120, 30], 64), (x - w) * SX, (y - h * 0.9) * SY, w * 2 * SX, h * 1.4 * SY);
      ctx.globalAlpha = vis;
    });
    ctx.restore();
    ctx.globalCompositeOperation = 'source-over';
  }

  // ---- Lightning ----
  function stepLightning(st, dt, t) {
    st.next -= dt;
    if (st.next <= 0) { strike(st, t); st.next = rand(...(st.every ?? [4, 10])); }
    st.bolts = (st.bolts ?? []).filter((b) => t - b.t0 < 0.5);
  }
  function strike(st, t, zone = null) {
    const z = zone ?? pick(st.zones);
    const from = [rand(z.from[0], z.from[2]), rand(z.from[1], z.from[3])];
    const to = [rand(z.to[0], z.to[2]), rand(z.to[1], z.to[3])];
    (st.bolts ??= []).push({ t0: t, path: boltPath(from, to, z.jag ?? 30), flash: z.flash ?? [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, 90], double: Math.random() < 0.5 });
    if (st.flashMask) { const ml = layers.find((l) => l.type === 'mask' && l.mask === st.flashMask); if (ml) ml.kick = t; }
  }
  function drawLightning(st, t) {
    const c = st.color ?? [255, 140, 220];
    ctx.globalCompositeOperation = 'lighter';
    for (const b of st.bolts ?? []) {
      const k = (t - b.t0) / 0.5;
      // Two quick flickers (sometimes three), then gone.
      const vis = b.double ? (k < 0.18 || (k > 0.28 && k < 0.42) ? 1 : 0.15) : (k < 0.3 ? 1 : 0.2);
      const a = (1 - k) * vis;
      if (a <= 0.01) continue;
      const [fx, fy, fr] = b.flash;
      ctx.globalAlpha = a * 0.55;
      ctx.drawImage(softSprite(c, 64), (fx - fr) * SX, (fy - fr) * SY, fr * 2 * SX, fr * 2 * SY);
      ctx.globalAlpha = 1;
      for (const [line, width] of [[b.path.main, 2.4], ...b.path.branches.map((p) => [p, 1.2])]) {
        for (const [wmul, col] of [[4, rgba(c, a * 0.35)], [1, rgba([255, 245, 255], a)]]) {
          ctx.strokeStyle = col;
          ctx.lineWidth = width * wmul * S * 0.6;
          ctx.lineJoin = 'round';
          ctx.beginPath();
          line.forEach(([x, y], i) => (i ? ctx.lineTo(x * SX, y * SY) : ctx.moveTo(x * SX, y * SY)));
          ctx.stroke();
        }
      }
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  // ---- Meteors and arrows ----
  function stepMeteors(st, dt, t) {
    st.next -= dt;
    if (st.next <= 0) {
      const a = st.area;
      const x = rand(a[0], a[2]), y = rand(a[1], a[1] + (a[3] - a[1]) * 0.3);
      const [dx, dy] = st.dir ?? [-0.5, 1];
      const v = rand(...(st.speed ?? [120, 200]));
      const l = Math.hypot(dx, dy);
      (st.parts ??= []).push({ x, y, vx: dx / l * v, vy: dy / l * v, age: 0, life: rand(1.2, 2.4), r: rand(...(st.size ?? [2, 4])), trail: [] });
      st.next = rand(...(st.every ?? [1.5, 4]));
    }
    for (const p of st.parts) {
      p.age += dt; p.x += p.vx * dt; p.y += p.vy * dt;
      p.trail.unshift([p.x, p.y]); if (p.trail.length > 14) p.trail.pop();
      if (p.y > st.area[3] || p.x < st.area[0] - 20 || p.x > st.area[2] + 20) p.age = p.life;
    }
    st.parts = st.parts.filter((p) => p.age < p.life);
  }
  function drawMeteors(st) {
    ctx.globalCompositeOperation = 'lighter';
    for (const p of st.parts) {
      const fade = Math.min(1, (p.life - p.age) / 0.4);
      p.trail.forEach(([x, y], i) => {
        const k = 1 - i / p.trail.length;
        ctx.globalAlpha = 0.5 * k * fade;
        const r = p.r * S * (0.6 + k * 1.4);
        ctx.drawImage(softSprite([255, 120 + 60 * k, 40], 32), x * SX - r * 2, y * SY - r * 2, r * 4, r * 4);
      });
      ctx.globalAlpha = fade;
      const R = p.r * S * 3;
      ctx.drawImage(softSprite([255, 230, 160], 32, 0.3), p.x * SX - R, p.y * SY - R, R * 2, R * 2);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
  function stepArrows(st, dt, t) {
    st.next -= dt;
    if (st.next <= 0) { loose(st, t); st.next = rand(...(st.every ?? [3, 7])); }
    for (const p of st.parts) { p.age += dt; }
    st.parts = st.parts.filter((p) => p.age < p.dur + 0.35);
  }
  function loose(st, t, shooter = null) {
    const s = shooter ?? pick(st.shooters);
    (st.parts ??= []).push({ s, age: 0, dur: s.dur ?? 1.1, t0: t });
  }
  function drawArrows(st) {
    ctx.globalCompositeOperation = 'lighter';
    for (const p of st.parts) {
      const { from, to, arc = 40 } = p.s;
      // Bow flash as it looses.
      if (p.age < 0.25) {
        ctx.globalAlpha = 1 - p.age / 0.25;
        const R = 14 * S;
        ctx.drawImage(softSprite([255, 170, 60], 32), from[0] * SX - R, from[1] * SY - R, R * 2, R * 2);
      }
      const k = Math.min(1, p.age / p.dur);
      const pos = (q) => [lerp(from[0], to[0], q), lerp(from[1], to[1], q) - Math.sin(q * Math.PI) * arc];
      if (p.age <= p.dur) {
        for (let i = 0; i < 10; i++) {
          const q = Math.max(0, k - i * 0.015);
          const [x, y] = pos(q);
          ctx.globalAlpha = (1 - i / 10) * 0.7;
          const r = (2.6 - i * 0.18) * S;
          ctx.drawImage(softSprite([255, 140 + i * 8, 40], 32), x * SX - r * 2, y * SY - r * 2, r * 4, r * 4);
        }
      } else {
        // Impact: a small burst where it lands.
        const k2 = (p.age - p.dur) / 0.35;
        ctx.globalAlpha = 1 - k2;
        const R = (6 + k2 * 16) * S;
        ctx.drawImage(softSprite([255, 150, 50], 32), to[0] * SX - R, to[1] * SY - R, R * 2, R * 2);
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  // ---- Streams, vortex, flyers ----
  function drawStream(st, dt, t) {
    const c = st.color ?? [230, 200, 255];
    ctx.globalCompositeOperation = st.blend ?? 'lighter';
    const w = st.width ?? 20;
    for (const p of st.parts) {
      p.s += (st.speed ?? 30) * p.v * dt;
      const q = along(st, p.s);
      const off = p.o * w + Math.sin(t * 1.3 + p.ph) * w * 0.25;
      const x = (q.x + q.nx * off) * SX, y = (q.y + q.ny * off) * SY;
      const q2 = along(st, p.s - (st.tail ?? 14) * p.v);
      const x2 = (q2.x + q2.nx * off) * SX, y2 = (q2.y + q2.ny * off) * SY;
      // A streak whose tail is still at the other end of the path (it just looped) is skipped.
      if (Math.hypot(x - x2, y - y2) > (st.tail ?? 14) * p.v * 2.5 * S + 4) continue;
      const a = (st.alpha ?? 0.35) * (0.6 + 0.4 * Math.sin(t * 2 + p.ph));
      if (st.kind === 'petal') {
        ctx.fillStyle = rgba(c, a * 2);
        ctx.save(); ctx.translate(x, y); ctx.rotate(t * 3 + p.ph);
        ctx.beginPath(); ctx.ellipse(0, 0, p.size * S * 1.3, p.size * S * 0.55, 0, 0, TAU); ctx.fill(); ctx.restore();
      } else {
        const g = ctx.createLinearGradient(x2, y2, x, y);
        g.addColorStop(0, rgba(c, 0)); g.addColorStop(1, rgba(c, a));
        ctx.strokeStyle = g;
        ctx.lineWidth = p.size * S;
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x, y); ctx.stroke();
      }
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  function drawVortex(st, dt, t) {
    const c = st.color ?? [180, 255, 220];
    const [cx, cy] = st.center;
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (const p of st.parts) {
      p.a += (st.speed ?? 0.5) * p.v * dt * (1.6 - p.r);
      const r = 0.15 + p.r * 0.85;
      const steps = 6;
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const a = p.a - i * p.len * 0.12;
        const x = cx + Math.cos(a) * st.rx * r, y = cy + Math.sin(a) * st.ry * r;
        i ? ctx.lineTo(x * SX, y * SY) : ctx.moveTo(x * SX, y * SY);
      }
      ctx.strokeStyle = rgba(c, (st.alpha ?? 0.25) * (1 - p.r * 0.5));
      ctx.lineWidth = (st.width ?? 1.6) * S;
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  function stepFlyers(st, dt, t) {
    st.next -= dt;
    if (st.next <= 0) {
      const a = st.area;
      const ltr = Math.random() < 0.5;
      (st.parts ??= []).push({ x: ltr ? a[0] - 20 : a[2] + 20, y: rand(a[1], a[3]), vx: (ltr ? 1 : -1) * rand(...(st.speed ?? [40, 70])), ph: Math.random() * TAU, size: rand(...(st.size ?? [4, 7])), age: 0 });
      st.next = rand(...(st.every ?? [5, 12]));
    }
    for (const p of st.parts) { p.age += dt; p.x += p.vx * dt; p.y += Math.sin(t * 2 + p.ph) * 8 * dt; }
    st.parts = st.parts.filter((p) => p.x > st.area[0] - 40 && p.x < st.area[2] + 40);
  }
  function drawFlyers(st, t) {
    ctx.fillStyle = rgba(st.color ?? [20, 8, 12], 0.85);
    for (const p of st.parts) {
      const flap = Math.sin(t * (st.flap ?? 14) + p.ph);
      const x = p.x * SX, y = p.y * SY, s = p.size * S;
      const dir = Math.sign(p.vx);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x - s * 0.9 * dir, y - s * (0.2 + flap * 0.9), x - s * 1.8 * dir, y - s * flap * 0.5);
      ctx.quadraticCurveTo(x - s * 0.9 * dir, y + s * 0.15, x, y + s * 0.2);
      ctx.quadraticCurveTo(x + s * 0.9 * dir, y + s * 0.15, x + s * 1.8 * dir, y - s * flap * 0.5);
      ctx.quadraticCurveTo(x + s * 0.9 * dir, y - s * (0.2 + flap * 0.9), x, y);
      ctx.fill();
    }
  }

  // ---- Frame loop ----
  let raf = 0, running = true, start = performance.now(), prev = start;
  // Tap flashes: a soft burst of the circle's light, and sparks flung out that fall and fade.
  const flares = [];
  function drawFlares(t) {
    if (!flares.length) return;
    ctx.globalCompositeOperation = 'lighter';
    for (let i = flares.length - 1; i >= 0; i--) {
      const f = flares[i], age = t - f.t;
      if (age > 1) { flares.splice(i, 1); continue; }
      const R = (30 + 95 * Math.min(1, age / 0.3)) * S;
      ctx.globalAlpha = Math.max(0, 1 - age);
      ctx.drawImage(softSprite(f.color, 64, 0.1), f.x * SX - R, f.y * SY - R, R * 2, R * 2);
      ctx.drawImage(softSprite([255, 255, 255], 64, 0.3), f.x * SX - R * 0.35, f.y * SY - R * 0.35, R * 0.7, R * 0.7);
      for (const sp of f.sparks) {
        const d = sp.v * age, r = sp.s * 3.2 * S;
        const px = (f.x + Math.cos(sp.a) * d) * SX, py = (f.y + Math.sin(sp.a) * d + 60 * age * age) * SY;
        ctx.globalAlpha = Math.max(0, 1 - age);
        ctx.drawImage(softSprite(f.color, 32, 0.5), px - r, py - r, r * 2, r * 2);
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
  function frame() {
    // One clock for drawing and for taps (the frame callback's own timestamp can run on a different base).
    const now = performance.now();
    raf = requestAnimationFrame(frame);
    if (!running) return;
    // Paced to FPS on any screen: each frame is due one interval after the last one was due,
    // so 120 and 144 Hz screens still get ~60. (A clock that jumps backwards restarts it.)
    if (now < prev) { last = 0; prev = now; }
    if (now < last - 2) return;
    last = Math.max(last + 1000 / FPS, now);
    const box = canvas.parentElement;
    if (box) {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      if (Math.round(box.clientWidth * dpr) !== W || Math.round(box.clientHeight * dpr) !== H) resize();
    }
    const dt = Math.min(0.1, (now - prev) / 1000);
    prev = now;
    const t = (now - start) / 1000;
    ctx.clearRect(0, 0, W, H);
    if (plate) ctx.drawImage(plate, 0, 0, W, H);
    stepWind(dt);
    for (const st of layers) {
      switch (st.type) {
        case 'sprites': drawSprites(st, t); break;
        case 'crawlers': drawCrawlers(st, t); break;
        case 'mask': drawMask(st, t); break;
        case 'echo': drawEcho(st, t); break;
        case 'particles': stepParticles(st, dt, t); drawParticles(st, t); break;
        case 'fog': drawFog(st, dt, t); break;
        case 'rays': drawRays(st, t); break;
        case 'glow': drawGlows(st, t); break;
        case 'flames': drawFlames(st, t); break;
        case 'lightning': stepLightning(st, dt, t); drawLightning(st, t); break;
        case 'meteors': stepMeteors(st, dt, t); drawMeteors(st); break;
        case 'arrows': stepArrows(st, dt, t); drawArrows(st); break;
        case 'stream': drawStream(st, dt, t); break;
        case 'vortex': drawVortex(st, dt, t); break;
        case 'flyers': stepFlyers(st, dt, t); drawFlyers(st, t); break;
        default: break;
      }
    }
    drawFlares(t);
  }
  raf = requestAnimationFrame(frame);

  // Tapping the scenery: the first poke area under the point reacts.
  const inBox = (b, x, y) => x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3];
  function poke(fx, fy) {
    const x = fx * IW, y = fy * IH;
    const p = (def.pokes ?? []).find((q) => inBox(q.area, x, y));
    if (!p) return false;
    const t = (performance.now() - start) / 1000;
    if (p.sound) play(p.sound);
    for (const id of [].concat(p.kick ?? [])) { const l = layers.find((q) => q.id === id); if (l) l.kick = t; }
    // Grass and twigs right around the tap rustle; creatures near it scurry.
    for (const l of layers) if (l.type === 'sprites') for (const q of l.parts) if (Math.hypot(q.px - x, q.py - y) < (p.rustle ?? 40)) q.kick = t;
    for (const l of layers) if (l.type === 'crawlers') for (const q of l.items) if (Math.hypot((q.box[0] + q.box[2]) / 2 - x, (q.box[1] + q.box[3]) / 2 - y) < (p.rustle ?? 60)) q.kick = t;
    if (p.strike != null) { const l = layers.find((q) => q.id === p.strike); if (l) strike(l, t, l.zones[p.zone ?? 0]); }
    if (p.loose != null) { const l = layers.find((q) => q.id === p.loose); if (l) loose(l, t, l.shooters[p.shooter ?? 0]); }
    if (p.flare) {
      flares.push({ x, y, t, color: p.flare, sparks: Array.from({ length: 18 }, () => ({ a: rand(0, TAU), v: rand(50, 140), s: rand(1.2, 2.4) })) });
      if (flares.length > 8) flares.shift();
    }
    for (const b of [].concat(p.burst ?? [])) {
      const l = layers.find((q) => q.id === b.layer);
      const [bx, by] = b.at ?? [x, y];
      if (l) for (let i = 0; i < (b.n ?? 12); i++) spawn(l, bx + rand(-(b.spread ?? 6), b.spread ?? 6), by + rand(-(b.spread ?? 6), b.spread ?? 6));
    }
    return p;
  }
  function canPoke(fx, fy) { return (def.pokes ?? []).some((q) => inBox(q.area, fx * IW, fy * IH)); }

  return {
    stop() { cancelAnimationFrame(raf); ro.disconnect(); canvas.remove(); },
    pause() { running = false; },
    resume() { if (!running) { running = true; prev = performance.now(); } },
    poke, canPoke,
    canvas,
  };
}
