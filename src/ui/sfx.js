// Recorded sounds: realm sounds, spell elements, hero voices and board ambience.
// The clips live in a few bundled files (art/sfx/, see sfx-sprites.js) and load after the
// player's first tap. Until a clip has loaded, sound.js falls back to its synthesized sound.
//
// Designer: everything you'd want to retune is in the tables below (which clips a realm
// uses, which actor voices which hero, which board gets which ambience).

import { AMBIENCE_FILES, SFX_CLIPS, SFX_FILES } from './sfx-sprites.js';

// ---- what plays when ---------------------------------------------------------------------
// Event name → clip names (one is picked at random each time). `sound.play(name)` uses these
// first; events listed in LAYER also keep their synthesized sound underneath.
export const EVENTS = {
  spell: ['spell-impact-1', 'spell-impact-2', 'spell-impact-3'],
  freeze: ['ice-freeze-1', 'ice-freeze-2'],
  extinction: ['meteor-swarm-1', 'meteor-swarm-2'],
  bigHit: ['bones'],
  versus: ['single-boom'],
  heroExplode: ['hell-boom'],
  growl: ['feral-1', 'feral-2'],
  squelch: ['squish'],
  shield: ['rock-wall-1', 'rock-wall-2'],
  // A spell cast by a realm with an element.
  'spell:Demons': ['fireball-1', 'fireball-2', 'fireball-3'],
  'spell:Dragons': ['fireball-1', 'fireball-2', 'fireball-3'],
  'spell:Radioactive': ['firebuff-1', 'firebuff-2'],
  'spell:Ice Age': ['ice-throw-1', 'ice-throw-2'],
  'spell:Sharks': ['wave-1', 'wave-2'],
  'spell:Eels': ['waterspray-1', 'waterspray-2'],
  'spell:Dinosaurs': ['meteor-1', 'meteor-2'],
  'spell:Void': ['void-1', 'void-2'],
  'spell:Ultraterrestrials': ['cosmic-rumble'],
  // A minion of the realm arrives on the board.
  'arrive:Vampires': ['bat-1', 'bat-2'],
  'arrive:Zombies': ['zombie-rise-1', 'zombie-rise-2'],
  'arrive:Lycanthropes': ['feral-1', 'feral-2'],
  'arrive:Robots': ['mech-step', 'mech-knee', 'mech-mast'],
  'arrive:Demons': ['deep-growl', 'monster-low-5'],
  'arrive:Ghosts': ['ghost-whisper', 'ghost-passby'],
  'arrive:Dinosaurs': ['beast-breath', 'beast-snarl'],
  'arrive:Dragons': ['dragon-screech'],
  'arrive:Ice Age': ['ice-wall-1', 'ice-wall-2'],
  'arrive:Sharks': ['wave-1', 'wave-2'],
  'arrive:Eels': ['waterspray-1', 'waterspray-2'],
  'arrive:Void': ['void-1', 'void-2'],
  'arrive:Ultraterrestrials': ['cosmic-rumble'],
  'arrive:Acidic': ['squish'],
  'arrive:Radioactive': ['sizzle', 'device-on'],
  'arrive:Fungus': ['maggots', 'squish'],
  'arrive:Aliens': ['device-on', 'creature-cries'],
  'arrive:Bees': ['bee-idle', 'bee-fly-1', 'bee-fly-2'],
  'arrive:Divine': ['spirits'],
  // A minion of the realm dies.
  'die:Robots': ['mech-spark', 'mech-sad', 'mech-stall'],
  'die:Zombies': ['zombie-pain', 'zombie-fall'],
  'die:Ghosts': ['ghost-fade', 'banshee'],
  'die:Vampires': ['bat-chatter'],
  'die:Lycanthropes': ['beast-moan'],
  'die:Dinosaurs': ['deep-fall'],
  'die:Dragons': ['deep-fall'],
  'die:Demons': ['deep-fall'],
  'die:Acidic': ['implosion'],
  'die:Fungus': ['implosion'],
  'die:Aliens': ['implosion'],
  'die:Bees': ['bee-alarm-1', 'bee-alarm-2', 'bee-alarm-3'],
  // A minion of the realm attacks / gets hurt.
  'attack:Bees': ['bee-attack', 'bee-fly-1', 'bee-fly-2'],
  'attack:Robots': ['mech-rivet'],
  'attack:Lycanthropes': ['beast-snarl', 'feral-1'],
  'attack:Zombies': ['zombie-rise-1'],
  'hurt:Bees': ['bee-hurt-1', 'bee-hurt-2', 'bee-hurt-3'],
  'hurt:Robots': ['mech-spark'],
  // A legendary or 8+ Mana minion makes an entrance.
  legendary: ['monster-low-7', 'witch', 'monster-high', 'hell-boom'],
};
export const LAYER = new Set(['bigHit', 'versus', 'heroExplode', 'extinction']);

// Heroes who talk: realm → voice actor. The rest roar, growl or wail instead (MONSTERS).
const ACTORS = {
  Divine: 'ian', Vampires: 'sean', Robots: 'alex', Aliens: 'ian', Void: 'sean', Plants: 'alex', Fungus: 'sean',
  Ultraterrestrials: 'meghan', Bees: 'karen', Ghosts: 'karen',
};
const MONSTERS = {
  Demons: { greet: ['monster-low-7', 'deep-growl'], death: ['deep-fall'] },
  Dinosaurs: { greet: ['beast-breath', 'beast-snarl'], death: ['beast-moan'] },
  Dragons: { greet: ['dragon-screech'], death: ['deep-fall'] },
  Zombies: { greet: ['zombie-rise-1', 'zombie-rise-2'], death: ['zombie-fall'] },
  Lycanthropes: { greet: ['feral-2'], death: ['beast-moan'] },
  Acidic: { greet: ['humanoid-hostile'], death: ['humanoid-moan'] },
  Radioactive: { greet: ['humanoid-snarl'], death: ['humanoid-moan'] },
  Eels: { greet: ['beast-obstacle'], death: ['implosion'] },
  Sharks: { greet: ['beast-snarl'], death: ['implosion'] },
  'Ice Age': { greet: ['beast-breath'], death: ['beast-moan'] },
};
// Board realm → ambience loop (quiet, under the music).
const AMBIENCE = {
  Demons: 'fire', Dragons: 'fire', Zombies: 'underground', Ghosts: 'underground', Vampires: 'underground',
  Void: 'cosmic', Ultraterrestrials: 'cosmic', Robots: 'factory', Radioactive: 'factory',
  Lycanthropes: 'crickets', Plants: 'crickets', Fungus: 'crickets',
};

// ---- loading -----------------------------------------------------------------------------
const buffers = new Map();   // file key → AudioBuffer
const pending = new Map();   // file key → Promise
let acRef = null;

function load(key, url) {
  if (buffers.has(key)) return Promise.resolve(buffers.get(key));
  if (pending.has(key)) return pending.get(key);
  if (!acRef || typeof fetch !== 'function') return Promise.resolve(null);
  const p = fetch(new URL(url, document.baseURI).href)
    .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(r.status))))
    .then((data) => new Promise((ok, bad) => acRef.decodeAudioData(data, ok, bad)))
    .then((buf) => { buffers.set(key, buf); return buf; })
    .catch(() => { pending.delete(key); return null; });
  pending.set(key, p);
  return p;
}

// Called by sound.js once the AudioContext exists (after the first tap).
export function attach(ac) {
  if (acRef) return;
  acRef = ac;
  load('effects', SFX_FILES.effects);
  refreshAmbience();
}

// Load the voices for the heroes in a match ahead of time.
export function preloadVoices(factions = []) {
  for (const f of factions) {
    const a = ACTORS[f];
    if (a && SFX_FILES[`voice-${a}`]) load(`voice-${a}`, SFX_FILES[`voice-${a}`]);
  }
}

// ---- levels ------------------------------------------------------------------------------
let master = 0.8;
const levels = { effects: 1, voices: 1, ambience: 0.4 };
let muted = false;
export function setLevels(masterVolume, patch = {}, isMuted = muted) {
  master = masterVolume;
  Object.assign(levels, patch);
  muted = isMuted;
  refreshAmbience();
}

// ---- playing -----------------------------------------------------------------------------
const pick = (list) => list[Math.floor(Math.random() * list.length)];

// Play one clip if its file has loaded; returns true when it played.
function clip(name, cat = 'effects', { gain = 1, rate } = {}) {
  const c = SFX_CLIPS[name];
  const buf = c && buffers.get(c[0]);
  const vol = master * (levels[cat] ?? 1) * gain;
  if (!buf || !acRef || muted || vol <= 0) return false;
  const src = acRef.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = rate ?? (0.95 + Math.random() * 0.1);
  const g = acRef.createGain();
  g.gain.value = vol;
  src.connect(g).connect(acRef.destination);
  src.start(0, c[1], c[2]);
  if (typeof window !== 'undefined' && window.__sfxLog) window.__sfxLog.push(name); // test hook
  return true;
}

// sound.play() asks here first: true means a recording played.
export function playEvent(name) {
  const list = EVENTS[name];
  return list ? clip(pick(list)) : false;
}
export const hasEvent = (name) => !!EVENTS[name];

// A hero speaks. kind: 'greet' | 'no' | 'yes' | 'death'. Monsters only greet and die.
const lastLine = new Map();
export function voice(faction, kind) {
  const now = performance.now();
  const key = `${faction}:${kind}`;
  if (kind !== 'death' && now - (lastLine.get(key) ?? -1e9) < (kind === 'no' ? 5000 : 2500)) return false;
  lastLine.set(key, now);
  const actor = ACTORS[faction];
  if (actor) {
    const names = Object.keys(SFX_CLIPS).filter((n) => n.startsWith(`v-${actor}-${kind}-`));
    if (!names.length) return false;
    const name = pick(names);
    if (clip(name, 'voices', { rate: 1 })) return true;
    // Not loaded yet: load it and speak if that's quick enough to still make sense.
    const asked = performance.now();
    load(`voice-${actor}`, SFX_FILES[`voice-${actor}`]).then((b) => { if (b && performance.now() - asked < 1500) clip(name, 'voices', { rate: 1 }); });
    return false;
  }
  const m = MONSTERS[faction]?.[kind];
  return m ? clip(pick(m), 'voices') : false;
}

// ---- ambience ----------------------------------------------------------------------------
let wantedAmb = null;
let amb = null; // { name, src, gain }
export function ambience(realm) {
  wantedAmb = (realm && AMBIENCE[realm]) || null;
  refreshAmbience();
}
function fadeOut(a) {
  if (!a) return;
  const t = acRef.currentTime;
  a.gain.gain.cancelScheduledValues(t);
  a.gain.gain.setValueAtTime(a.gain.gain.value, t);
  a.gain.gain.linearRampToValueAtTime(0.0001, t + 1.2);
  a.src.stop(t + 1.3);
}
function refreshAmbience() {
  if (!acRef) return;
  const vol = muted || (typeof document !== 'undefined' && document.hidden) ? 0 : master * levels.ambience * 0.6;
  if (amb && (amb.name !== wantedAmb || vol <= 0)) { fadeOut(amb); amb = null; }
  if (!wantedAmb || vol <= 0) return;
  if (amb) { amb.gain.gain.setTargetAtTime(vol, acRef.currentTime, 0.3); return; }
  const name = wantedAmb;
  load(`amb-${name}`, AMBIENCE_FILES[name]).then((buf) => {
    if (!buf || wantedAmb !== name || amb) return;
    const src = acRef.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const gain = acRef.createGain();
    gain.gain.setValueAtTime(0.0001, acRef.currentTime);
    gain.gain.linearRampToValueAtTime(vol, acRef.currentTime + 2);
    src.connect(gain).connect(acRef.destination);
    src.start();
    amb = { name, src, gain };
  });
}
if (typeof document !== 'undefined') document.addEventListener('visibilitychange', refreshAmbience);
