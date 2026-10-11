// Background music: one looping track for the menus, one for matches.
// Tracks crossfade when the screen changes. Browsers only allow audio after the
// player's first tap or key press, so music starts then. It follows the mute
// button and Settings (Volume × Music), and pauses while the game is in the background.

import { isMuted } from './sound.js';

const TRACKS = {
  menu: 'art/music/mysterious-majesty.mp3',   // "Mysterious Majesty"
  battle: 'art/music/pulse-of-the-realm.mp3', // "Pulse of the Realm"
};
const FADE_MS = 1200;

const players = {};
let wanted = null;          // the track that should be playing: 'menu' | 'battle' | null
let master = 0.8;           // Settings → Volume
let level = 0.5;            // Settings → Music
let unlocked = false;       // a user gesture has happened

function player(name) {
  if (!players[name]) {
    const a = new Audio(new URL(TRACKS[name], document.baseURI).href);
    a.loop = true;
    a.preload = 'auto';
    a.volume = 0;
    players[name] = { el: a, fade: null };
  }
  return players[name];
}

const target = () => (isMuted() || document.hidden ? 0 : Math.max(0, Math.min(1, master * level)));

// Ramp a track's volume; pause it when it reaches 0.
function fadeTo(name, to) {
  const p = player(name);
  clearInterval(p.fade);
  const from = p.el.volume;
  if (to > 0 && p.el.paused) p.el.play().catch(() => {});
  const start = performance.now();
  p.fade = setInterval(() => {
    const k = Math.min(1, (performance.now() - start) / FADE_MS);
    p.el.volume = Math.max(0, Math.min(1, from + (to - from) * k));
    if (k >= 1) {
      clearInterval(p.fade);
      p.fade = null;
      if (to === 0) p.el.pause();
    }
  }, 40);
}

function apply() {
  if (!unlocked) return;
  for (const name of Object.keys(TRACKS)) {
    if (name === wanted) fadeTo(name, target());
    else if (players[name]) fadeTo(name, 0);
  }
}

// Which music to play now ('menu', 'battle' or null for silence).
export function music(name) {
  if (name === wanted) return;
  wanted = name;
  apply();
}

export function setMusicVolume(masterVolume, musicVolume) {
  master = masterVolume;
  level = musicVolume;
  apply();
}

// Call after the mute button changes.
export const refreshMusic = apply;

function unlock() {
  if (unlocked) return;
  unlocked = true;
  apply();
}
document.addEventListener('pointerdown', unlock, { capture: true });
document.addEventListener('keydown', unlock, { capture: true });
document.addEventListener('visibilitychange', apply);
