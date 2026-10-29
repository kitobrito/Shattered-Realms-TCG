// The painted board lives in its own permanent layer behind the battle screen.
// The battle screen re-renders after every action; keeping the board (and its
// looping video, when there is one) out here means it never restarts or flickers.
//
// Layer: #board-layer > .board-backdrop (blurred, fills letterbox edges)
//                     > .board-stage (16:9, same box as .arena.has-board)
//                         > img.board-still   (always; shown until the video plays)
//                         > video.board-video (when BOARD_VIDEO has one for the faction)

import { BOARD_ANIM, BOARD_ART, BOARD_VIDEO, boardArtFor, boardKey, CIRCLE_BOARDS } from '../cards/board-art.js';
import { startBoardAnim } from './board-anim.js';
import { hasBoardFx, startBoardFx, startCircleFx } from './circle-fx.js';
import { playDescent } from './descent-fx.js';

let layer = null;
let current = null; // faction shown now
let anim = null;    // living-board controller (board-anim.js)

function build() {
  layer = document.createElement('div');
  layer.id = 'board-layer';
  layer.innerHTML = '<div class="board-backdrop"></div><div class="board-stage" id="board-stage"><img class="board-still" alt="" draggable="false"></div>';
  document.body.prepend(layer);
  // Browsers pause hidden-tab video on their own; this also resumes it reliably.
  document.addEventListener('visibilitychange', () => {
    const v = layer.querySelector('video');
    if (!v) return;
    if (document.hidden) v.pause(); else v.play().catch(() => {});
  });
}

// Video is skipped for reduced motion and data-saver users; they get the still painting.
function videoAllowed() {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false;
  if (navigator.connection?.saveData) return false;
  return true;
}

// Demons' Descent: the current circle (0 = the surface, the faction's own board).
let circleShown = 0;
let circleFx = null;
let circleWant = 0;
function startCircle(n) {
  circleFx?.stop();
  circleFx = null;
  if (!n || !videoAllowed()) return;
  circleWant = n;
  startCircleFx(layer.querySelector('.board-stage'), n, 'land').then((ctl) => {
    if (circleWant !== n || circleShown !== n) { ctl?.stop(); return; }
    circleFx = ctl;
  }).catch(() => {});
}
// A living realm board (board-fx-defs.js): its canvas covers the still painting.
let realmFx = null;
let realmWant = null;
function startRealm(faction) {
  realmFx?.stop();
  realmFx = null;
  const key = faction && boardKey(faction);
  realmWant = key;
  if (!key || !hasBoardFx(key, 'land') || !videoAllowed()) return;
  startBoardFx(layer.querySelector('.board-stage'), key, 'land').then((ctl) => {
    if (realmWant !== key || circleShown > 0) { ctl?.stop(); return; }
    realmFx = ctl;
  }).catch(() => {});
}
function stopRealm() { realmFx?.stop(); realmFx = null; realmWant = null; }

// The board for this faction, or (depth > 0) the circle of Hell the battle has sunk to.
// A change of circle plays the Descent: the old board sinks away, the new one rises.
export function showBoard(faction, depth = 0) {
  if (!layer) build();
  if (depth > 0 || circleShown > 0) {
    layer.classList.add('show');
    if (depth === circleShown && (depth > 0 || current === faction)) { anim?.resume(); circleFx?.resume(); realmFx?.resume(); return; }
    const from = circleShown;
    circleShown = depth;
    const img = layer.querySelector('.board-still');
    const src = depth > 0 ? CIRCLE_BOARDS.land[depth].src : boardArtFor(faction);
    const swap = () => {
      layer.querySelector('video')?.remove();
      anim?.stop(); anim = null;
      layer.querySelector('canvas.board-anim')?.remove();
      img.setAttribute('src', src);
      layer.querySelector('.board-backdrop').style.backgroundImage = `url('${src}')`;
      current = depth > 0 ? `circle${depth}` : faction;
      startCircle(depth);
      if (depth > 0) stopRealm(); else startRealm(faction);
    };
    if (depth > from && videoAllowed()) playDescent(layer.querySelector('.board-stage'), depth, swap);
    else swap();
    return;
  }
  layer.classList.add('show');
  const still = boardArtFor(faction);
  const img = layer.querySelector('.board-still');
  // (A living board shows its clean plate instead; keep that while it runs.)
  if (!anim && img.getAttribute('src') !== still) img.setAttribute('src', still);
  if (current === faction) { anim?.resume(); realmFx?.resume(); return; }
  current = faction;
  startRealm(faction);
  layer.querySelector('.board-backdrop').style.backgroundImage = `url('${BOARD_ART[faction]}')`;
  layer.querySelector('video')?.remove();
  anim?.stop();
  anim = null;
  const src = BOARD_VIDEO[faction];
  if (!src && BOARD_ANIM[faction] && videoAllowed()) {
    // Living board: once its parts are loaded, swap to the clean plate and animate over it.
    const want = faction;
    startBoardAnim(layer.querySelector('.board-stage'), BOARD_ANIM[faction], { use4k: still.includes('@4k') })
      .then((ctl) => {
        if (current !== want) { ctl.stop(); return; }
        anim = ctl;
        img.setAttribute('src', ctl.plate);
      })
      .catch(() => {}); // any failure leaves the still painting
    return;
  }
  if (!src || !videoAllowed()) return;
  const v = document.createElement('video');
  Object.assign(v, { muted: true, loop: true, playsInline: true, autoplay: true, preload: 'auto' });
  v.className = 'board-video';
  v.setAttribute('muted', '');
  v.setAttribute('playsinline', '');
  v.poster = still;
  v.src = src;
  // Fade in only once it is actually playing, so a slow load never shows a blank frame.
  v.addEventListener('playing', () => v.classList.add('playing'), { once: true });
  v.addEventListener('error', () => v.remove(), { once: true });
  layer.querySelector('.board-stage').append(v);
  v.play().catch(() => {}); // autoplay can be refused; the still painting stays
}

export function hideBoard() {
  if (!layer) return;
  layer.classList.remove('show');
  layer.querySelector('video')?.pause();
  anim?.pause();
  circleFx?.pause();
  realmFx?.pause();
}

// Leaving a match: the next one starts back at the surface.
export function resetDescentBoard() {
  circleFx?.stop(); circleFx = null; circleShown = 0; circleWant = 0; current = null;
}

// Resume after a hidden period (e.g. coming back from the menu).
export function resumeBoard() {
  const v = layer?.querySelector('video');
  if (v && layer.classList.contains('show') && v.paused) v.play().catch(() => {});
}

// Clicking the scenery: screen point -> board fractions -> the living board.
function boardPoint(clientX, clientY) {
  const r = layer?.querySelector('.board-stage')?.getBoundingClientRect();
  if (!r || !r.width) return null;
  const x = (clientX - r.left) / r.width, y = (clientY - r.top) / r.height;
  return x >= 0 && y >= 0 && x <= 1 && y <= 1 ? [x, y] : null;
}
// A match event the living board answers, if it has a reaction for it (cosmetic only).
export function boardReact(name) { realmFx?.react?.(name); }

export function pokeBoard(clientX, clientY) {
  const live = circleFx ?? realmFx ?? anim;
  const p = live && boardPoint(clientX, clientY);
  return p ? live.poke(...p) : false;
}
export function canPokeBoard(clientX, clientY) {
  const live = circleFx ?? realmFx ?? anim;
  const p = live && boardPoint(clientX, clientY);
  return p ? live.canPoke(...p) : false;
}
