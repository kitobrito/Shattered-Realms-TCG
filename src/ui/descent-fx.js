// The Descent: the cinematic both players see when the battle sinks a circle deeper into Hell.
// About four seconds, layered over the board stage:
//
//   0.0s  a low rumble; the screen shakes harder and harder, the old board darkens and
//         cracks of fire split it open from the centre outwards
//   0.9s  the floor gives way: the old board falls away (it shrinks into the dark as if
//         dropping beneath you) while embers and rubble rush UPWARD past the camera
//   1.5s  black, with a ring of fire closing in: the swap happens here, out of sight
//   1.7s  the new circle rises out of the dark (from small and blurred to full size),
//         a shockwave of light rolls out from the centre
//   2.1s  the banner: "THE SECOND CIRCLE" over the circle's name in burning letters,
//         its rule beneath; it lingers, then smoulders away
//
// `onSwap` is called at the darkest moment so the board underneath can change unseen.
// Pure DOM + CSS animations (style.css "THE DESCENT"); a canvas for the fire cracks.

import { CIRCLES } from '../engine/rules.js';
import { play } from './sound.js';

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];
// Each circle's colour of light, for the shockwave, the cracks and the banner.
const TINT = ['#bcd4ff', '#ff4fa8', '#9cff8a', '#ffc23a', '#56ffd8', '#ff7a2a', '#ff3030', '#c6e04a', '#8fe3ff'];

let running = null;

// Fire cracks that race out from the centre over the old board.
function crackCanvas(stage, tint) {
  const c = document.createElement('canvas');
  c.className = 'descent-cracks';
  const W = (c.width = Math.max(1, Math.round(stage.clientWidth)));
  const H = (c.height = Math.max(1, Math.round(stage.clientHeight)));
  const g = c.getContext('2d');
  const cx = W / 2, cy = H / 2;
  const cracks = [];
  const spawn = (x, y, ang, len, w, depth) => {
    const pts = [[x, y]];
    let a = ang;
    const steps = 8 + Math.floor(Math.random() * 6);
    for (let i = 1; i <= steps; i++) {
      a += (Math.random() - 0.5) * 0.7;
      const l = len / steps;
      x += Math.cos(a) * l; y += Math.sin(a) * l;
      pts.push([x, y]);
      if (depth < 2 && Math.random() < 0.18) spawn(x, y, a + (Math.random() < 0.5 ? -1 : 1) * (0.5 + Math.random() * 0.6), len * 0.45, w * 0.6, depth + 1);
    }
    cracks.push({ pts, w, delay: depth * 0.12 + Math.random() * 0.1 });
  };
  for (let i = 0; i < 11; i++) spawn(cx, cy, (i / 11) * Math.PI * 2 + Math.random() * 0.3, Math.hypot(W, H) * (0.32 + Math.random() * 0.2), 3 + Math.random() * 2, 0);
  const t0 = performance.now();
  const draw = () => {
    const t = (performance.now() - t0) / 1000;
    g.clearRect(0, 0, W, H);
    g.lineCap = 'round'; g.lineJoin = 'round';
    for (const k of cracks) {
      const p = Math.max(0, Math.min(1, (t - k.delay) / 0.75));
      if (!p) continue;
      const n = Math.max(2, Math.floor(k.pts.length * p));
      for (const [w, col] of [[k.w * 4, `${tint}55`], [k.w * 1.8, '#ffb44a'], [k.w * 0.7, '#fff6d8']]) {
        g.strokeStyle = col; g.lineWidth = w;
        g.beginPath();
        k.pts.slice(0, n).forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
        g.stroke();
      }
    }
    if (t < 1.6 && c.isConnected) requestAnimationFrame(draw);
  };
  requestAnimationFrame(draw);
  return c;
}

export function playDescent(stage, depth, onSwap) {
  if (!stage) { onSwap(); return; }
  if (running) { running.finish(); }
  const circle = CIRCLES[depth - 1];
  const tint = TINT[depth - 1] ?? '#ff6a2a';
  const doc = stage.ownerDocument;
  const root = doc.createElement('div');
  root.className = 'descent';
  root.style.setProperty('--tint', tint);
  root.innerHTML = `
    <div class="descent-old"><div class="descent-old-img"></div></div>
    <div class="descent-dark"></div>
    <div class="descent-rush">${Array.from({ length: 46 }, (_, i) => `<i style="--x:${(Math.random() * 100).toFixed(1)}%;--d:${(Math.random() * 0.5).toFixed(2)}s;--s:${(0.5 + Math.random() * 1.6).toFixed(2)};--h:${(Math.random() < 0.3 ? 30 + Math.random() * 60 : 6 + Math.random() * 14).toFixed(0)}px;--c:${i % 4 ? tint : '#ffb44a'}"></i>`).join('')}</div>
    <div class="descent-ring"></div>
    <div class="descent-wave"></div>
    <div class="descent-banner">
      <div class="db-ordinal">The ${circle.ordinal} Circle</div>
      <div class="db-name">${circle.name}</div>
      <div class="db-rule">${circle.text}</div>
      <div class="db-both">Now the rule for both players</div>
      <div class="db-roman">${ROMAN[depth - 1]}</div>
    </div>`;
  // The old board: a frozen copy of what was on screen, which then falls away.
  const still = stage.querySelector('.board-still');
  const old = root.querySelector('.descent-old');
  const oldImg = old.querySelector('.descent-old-img');
  if (still?.getAttribute('src')) oldImg.style.backgroundImage = `url('${still.src}')`;
  const fxCanvas = stage.querySelector('canvas.circle-fx');
  if (fxCanvas) { try { const copy = doc.createElement('canvas'); copy.width = fxCanvas.width; copy.height = fxCanvas.height; copy.getContext('2d').drawImage(fxCanvas, 0, 0); copy.className = 'descent-old-fx'; oldImg.append(copy); } catch { /* tainted */ } }
  stage.append(root);
  old.append(crackCanvas(stage, tint));
  const shaker = stage.closest('#board-layer') ?? stage;
  shaker.classList.add('descent-shake');
  doc.body.classList.add('descending', 'descent-quake');
  play('rumble');
  const timers = [];
  const at = (ms, fn) => timers.push(setTimeout(fn, ms));
  at(450, () => play('rumble'));
  at(900, () => { root.classList.add('falling'); stage.classList.add('descent-hide'); play('whoosh'); });
  at(1500, () => { root.classList.add('swapped'); onSwap(); });
  at(1700, () => {
    root.classList.add('rising');
    stage.classList.remove('descent-hide');
    stage.classList.add('descent-rise');
    shaker.classList.remove('descent-shake');
    doc.body.classList.remove('descent-quake');
    play('bigHit');
  });
  at(2700, () => stage.classList.remove('descent-rise'));
  at(2100, () => { root.classList.add('named'); play('extinction'); });
  at(4600, () => root.classList.add('leaving'));
  const finish = () => {
    timers.forEach(clearTimeout);
    shaker.classList.remove('descent-shake');
    stage.classList.remove('descent-rise', 'descent-hide');
    doc.body.classList.remove('descending', 'descent-quake');
    if (!root.classList.contains('swapped')) onSwap();
    root.remove();
    running = null;
  };
  at(5400, finish);
  running = { finish };
}
