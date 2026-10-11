// The painted board lives in its own permanent layer behind the battle screen.
// The battle screen re-renders after every action; keeping the board (and its
// looping video, when there is one) out here means it never restarts or flickers.
//
// Layer: #board-layer > .board-backdrop (blurred, fills letterbox edges)
//                     > .board-stage (16:9, same box as .arena.has-board)
//                         > img.board-still   (always; shown until the video plays)
//                         > video.board-video (when BOARD_VIDEO has one for the faction)

import { BOARD_ANIM, BOARD_ART, BOARD_VIDEO, boardArtFor } from '../cards/board-art.js';
import { startBoardAnim } from './board-anim.js';

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

export function showBoard(faction) {
  if (!layer) build();
  layer.classList.add('show');
  const still = boardArtFor(faction);
  const img = layer.querySelector('.board-still');
  // (A living board shows its clean plate instead; keep that while it runs.)
  if (!anim && img.getAttribute('src') !== still) img.setAttribute('src', still);
  if (current === faction) { anim?.resume(); return; }
  current = faction;
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
export function pokeBoard(clientX, clientY) {
  const p = anim && boardPoint(clientX, clientY);
  return p ? anim.poke(...p) : false;
}
export function canPokeBoard(clientX, clientY) {
  const p = anim && boardPoint(clientX, clientY);
  return p ? anim.canPoke(...p) : false;
}
