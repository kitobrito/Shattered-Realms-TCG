// Sound effects, synthesized with the Web Audio API (no audio files).
// Each effect is one entry in SOUNDS; to use a real recording later, replace
// the entry with a function that plays an <audio> element.

const MUTE_KEY = 'faction-ccg-mute';
let ctx = null;
let muted = (() => { try { return localStorage.getItem(MUTE_KEY) === '1'; } catch { return false; } })();

let volume = 0.8; // Settings → Volume (0..1)
export const setVolume = (v) => { volume = Math.max(0, Math.min(1, v)); };
export const isMuted = () => muted;
export function toggleMute() {
  muted = !muted;
  try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch { /* storage unavailable */ }
  return muted;
}

// Browsers only allow audio after a user gesture; the context is created lazily.
function audio() {
  if (muted || volume <= 0) return null;
  try {
    ctx ??= new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch { return null; }
}

// A pitched tone with an optional slide and a quick decay.
function tone(ac, { freq = 440, to = freq, type = 'sine', dur = 0.15, gain = 0.2, delay = 0 }) {
  const t = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t + dur);
  g.gain.setValueAtTime(Math.max(0.0001, gain * volume), t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(ac.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

// A filtered noise burst (impacts, whooshes, cracks).
function noise(ac, { dur = 0.12, gain = 0.25, freq = 1200, q = 1, delay = 0, type = 'lowpass' }) {
  const t = ac.currentTime + delay;
  const buf = ac.createBuffer(1, Math.ceil(ac.sampleRate * dur), ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = ac.createBufferSource();
  src.buffer = buf;
  const f = ac.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = ac.createGain();
  g.gain.setValueAtTime(Math.max(0.0001, gain * volume), t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(ac.destination);
  src.start(t);
}

const SOUNDS = {
  cardPlay: (ac) => { noise(ac, { dur: 0.18, freq: 2500, gain: 0.12, type: 'bandpass' }); tone(ac, { freq: 520, to: 700, dur: 0.12, gain: 0.08, type: 'triangle' }); },
  minionLand: (ac) => { noise(ac, { dur: 0.22, freq: 300, gain: 0.35 }); tone(ac, { freq: 110, to: 60, dur: 0.25, gain: 0.3 }); },
  spell: (ac) => { [660, 880, 1320].forEach((f, i) => tone(ac, { freq: f, to: f * 1.5, dur: 0.25, gain: 0.07, type: 'sine', delay: i * 0.05 })); },
  trapSet: (ac) => { tone(ac, { freq: 300, to: 200, dur: 0.15, gain: 0.12, type: 'square' }); noise(ac, { dur: 0.08, freq: 800, gain: 0.1, delay: 0.05 }); },
  trapReveal: (ac) => { tone(ac, { freq: 200, to: 900, dur: 0.3, gain: 0.12, type: 'sawtooth' }); },
  attack: (ac) => { noise(ac, { dur: 0.2, freq: 1800, gain: 0.18, type: 'highpass' }); },
  hit: (ac) => { noise(ac, { dur: 0.14, freq: 600, gain: 0.4 }); tone(ac, { freq: 160, to: 70, dur: 0.15, gain: 0.25, type: 'triangle' }); },
  bigHit: (ac) => { noise(ac, { dur: 0.35, freq: 400, gain: 0.55 }); tone(ac, { freq: 120, to: 40, dur: 0.4, gain: 0.4, type: 'triangle' }); noise(ac, { dur: 0.2, freq: 2400, gain: 0.12, type: 'highpass', delay: 0.03 }); },
  heroExplode: (ac) => { tone(ac, { freq: 200, to: 900, dur: 0.9, gain: 0.08, type: 'sawtooth' }); noise(ac, { dur: 1.2, freq: 500, gain: 0.6, delay: 0.9 }); tone(ac, { freq: 90, to: 30, dur: 1.1, gain: 0.45, type: 'triangle', delay: 0.9 }); noise(ac, { dur: 0.6, freq: 5000, gain: 0.15, type: 'highpass', delay: 0.95 }); },
  death: (ac) => { noise(ac, { dur: 0.45, freq: 900, gain: 0.25, type: 'bandpass' }); tone(ac, { freq: 300, to: 60, dur: 0.45, gain: 0.15, type: 'sawtooth' }); },
  heal: (ac) => { [523, 659, 784].forEach((f, i) => tone(ac, { freq: f, dur: 0.3, gain: 0.07, delay: i * 0.07 })); },
  draw: (ac) => { noise(ac, { dur: 0.12, freq: 3000, gain: 0.08, type: 'highpass' }); },
  mana: (ac) => { tone(ac, { freq: 1200, to: 1600, dur: 0.18, gain: 0.08 }); },
  turnStart: (ac) => { [392, 523, 659].forEach((f, i) => tone(ac, { freq: f, dur: 0.35, gain: 0.09, type: 'triangle', delay: i * 0.09 })); },
  quickPlay: (ac) => { tone(ac, { freq: 880, dur: 0.1, gain: 0.12, type: 'square' }); tone(ac, { freq: 880, dur: 0.1, gain: 0.12, type: 'square', delay: 0.15 }); },
  freeze: (ac) => { noise(ac, { dur: 0.35, freq: 6000, gain: 0.12, type: 'highpass' }); tone(ac, { freq: 2200, to: 1400, dur: 0.3, gain: 0.05, type: 'sine' }); },
  shield: (ac) => { tone(ac, { freq: 1500, to: 400, dur: 0.3, gain: 0.1, type: 'triangle' }); noise(ac, { dur: 0.25, freq: 4000, gain: 0.1, type: 'highpass' }); },
  extinction: (ac) => { noise(ac, { dur: 1.4, freq: 200, gain: 0.6 }); tone(ac, { freq: 80, to: 30, dur: 1.4, gain: 0.4, type: 'sawtooth' }); },
  victory: (ac) => { [523, 659, 784, 1046].forEach((f, i) => tone(ac, { freq: f, dur: 0.5, gain: 0.1, type: 'triangle', delay: i * 0.13 })); },
  defeat: (ac) => { [392, 349, 311, 262].forEach((f, i) => tone(ac, { freq: f, dur: 0.55, gain: 0.1, type: 'triangle', delay: i * 0.16 })); },
  versus: (ac) => { noise(ac, { dur: 0.5, freq: 300, gain: 0.5 }); tone(ac, { freq: 70, to: 35, dur: 0.6, gain: 0.45, type: 'triangle' }); tone(ac, { freq: 330, dur: 0.5, gain: 0.07, type: 'sawtooth', delay: 0.05 }); },
  coin: (ac) => { [0, 0.12, 0.24, 0.36, 0.5, 0.66, 0.84, 1.04].forEach((d, i) => tone(ac, { freq: 2600 - i * 120, dur: 0.05, gain: 0.05, type: 'square', delay: d })); },
  coinLand: (ac) => { tone(ac, { freq: 1900, to: 1700, dur: 0.5, gain: 0.08, type: 'sine' }); tone(ac, { freq: 2850, dur: 0.35, gain: 0.04, type: 'sine' }); },
  ropeStart: (ac) => { noise(ac, { dur: 1.2, freq: 3500, gain: 0.08, type: 'highpass' }); noise(ac, { dur: 0.3, freq: 900, gain: 0.12, type: 'bandpass' }); },
  mushroom: (ac) => { noise(ac, { dur: 0.35, freq: 700, gain: 0.25, type: 'bandpass', q: 2 }); tone(ac, { freq: 240, to: 520, dur: 0.18, gain: 0.08, type: 'sine' }); tone(ac, { freq: 300, to: 620, dur: 0.18, gain: 0.06, type: 'sine', delay: 0.12 }); },
  // Board scenery you can click (board-anim.js).
  roar: (ac) => { noise(ac, { dur: 1.1, freq: 260, gain: 0.5, type: 'bandpass', q: 0.7 }); tone(ac, { freq: 140, to: 70, dur: 1.0, gain: 0.3, type: 'sawtooth' }); tone(ac, { freq: 210, to: 95, dur: 0.9, gain: 0.12, type: 'square', delay: 0.05 }); },
  hoot: (ac) => { tone(ac, { freq: 95, to: 130, dur: 0.45, gain: 0.28, type: 'triangle' }); tone(ac, { freq: 130, to: 85, dur: 0.6, gain: 0.25, type: 'triangle', delay: 0.4 }); },
  flutter: (ac) => { for (let i = 0; i < 5; i++) noise(ac, { dur: 0.09, freq: 1400 + i * 200, gain: 0.12, type: 'bandpass', q: 1.5, delay: i * 0.07 }); },
  knock: (ac) => { tone(ac, { freq: 520, to: 380, dur: 0.08, gain: 0.18, type: 'triangle' }); tone(ac, { freq: 480, to: 340, dur: 0.08, gain: 0.14, type: 'triangle', delay: 0.14 }); },
  rustle: (ac) => { for (let i = 0; i < 4; i++) noise(ac, { dur: 0.18, freq: 2600 + i * 400, gain: 0.07, type: 'highpass', delay: i * 0.06 }); },
  whoosh: (ac) => { noise(ac, { dur: 0.6, freq: 700, gain: 0.3, type: 'bandpass', q: 0.8 }); tone(ac, { freq: 90, to: 160, dur: 0.4, gain: 0.08, type: 'sawtooth' }); },
  splash: (ac) => { noise(ac, { dur: 0.5, freq: 2200, gain: 0.25, type: 'bandpass', q: 0.6 }); noise(ac, { dur: 0.3, freq: 5000, gain: 0.1, type: 'highpass', delay: 0.08 }); },
  screech: (ac) => { tone(ac, { freq: 1800, to: 900, dur: 0.35, gain: 0.08, type: 'sawtooth' }); tone(ac, { freq: 2300, to: 1300, dur: 0.3, gain: 0.05, type: 'square', delay: 0.05 }); },
  rumble: (ac) => { noise(ac, { dur: 1.6, freq: 120, gain: 0.7 }); tone(ac, { freq: 45, to: 30, dur: 1.5, gain: 0.4, type: 'triangle' }); noise(ac, { dur: 0.4, freq: 900, gain: 0.15, type: 'bandpass', delay: 0.3 }); },
  growl: (ac) => { noise(ac, { dur: 0.8, freq: 180, gain: 0.45, type: 'bandpass', q: 1.2 }); tone(ac, { freq: 70, to: 55, dur: 0.8, gain: 0.25, type: 'sawtooth' }); },
  hiss: (ac) => { noise(ac, { dur: 0.6, freq: 4500, gain: 0.18, type: 'highpass' }); tone(ac, { freq: 900, to: 600, dur: 0.3, gain: 0.04, type: 'sawtooth' }); },
  rattle: (ac) => { for (let i = 0; i < 6; i++) tone(ac, { freq: 700 + (i % 3) * 180, to: 500, dur: 0.05, gain: 0.08, type: 'triangle', delay: i * 0.05 }); },
  clink: (ac) => { tone(ac, { freq: 2400, to: 2350, dur: 0.6, gain: 0.07, type: 'sine' }); tone(ac, { freq: 3600, dur: 0.35, gain: 0.04, type: 'sine', delay: 0.01 }); },
  drip: (ac) => { tone(ac, { freq: 700, to: 1500, dur: 0.12, gain: 0.12, type: 'sine' }); tone(ac, { freq: 500, to: 1100, dur: 0.1, gain: 0.06, type: 'sine', delay: 0.18 }); },
  chime: (ac) => { [1320, 1760, 2093].forEach((f, i) => tone(ac, { freq: f, dur: 0.7, gain: 0.05, type: 'sine', delay: i * 0.06 })); },
  bloop: (ac) => { for (let i = 0; i < 4; i++) tone(ac, { freq: 300 + i * 90, to: 700 + i * 120, dur: 0.09, gain: 0.08, type: 'sine', delay: i * 0.08 }); },
  beam: (ac) => { tone(ac, { freq: 220, to: 880, dur: 0.9, gain: 0.07, type: 'sawtooth' }); tone(ac, { freq: 330, to: 990, dur: 0.9, gain: 0.05, type: 'sine', delay: 0.05 }); },
  beep: (ac) => { tone(ac, { freq: 1200, dur: 0.07, gain: 0.07, type: 'square' }); tone(ac, { freq: 1600, dur: 0.07, gain: 0.06, type: 'square', delay: 0.1 }); },
  squelch: (ac) => { noise(ac, { dur: 0.35, freq: 400, gain: 0.3, type: 'bandpass', q: 3 }); tone(ac, { freq: 160, to: 90, dur: 0.3, gain: 0.12, type: 'sine' }); },
  grind: (ac) => { noise(ac, { dur: 0.9, freq: 250, gain: 0.4, type: 'bandpass', q: 0.8 }); tone(ac, { freq: 60, to: 48, dur: 0.9, gain: 0.18, type: 'triangle' }); },
  poof: (ac) => { noise(ac, { dur: 0.4, freq: 1200, gain: 0.25, type: 'bandpass', q: 0.6 }); tone(ac, { freq: 240, to: 120, dur: 0.25, gain: 0.08, type: 'sine' }); },
  groan: (ac) => { tone(ac, { freq: 110, to: 82, dur: 1.1, gain: 0.22, type: 'sawtooth' }); tone(ac, { freq: 165, to: 120, dur: 1.0, gain: 0.08, type: 'triangle', delay: 0.05 }); noise(ac, { dur: 1.0, freq: 500, gain: 0.12, type: 'bandpass', q: 2 }); },
  emote: (ac) => { tone(ac, { freq: 660, to: 880, dur: 0.12, gain: 0.06, type: 'triangle' }); tone(ac, { freq: 990, dur: 0.14, gain: 0.05, type: 'sine', delay: 0.1 }); },
  heartbeat: (ac) => { tone(ac, { freq: 70, to: 45, dur: 0.18, gain: 0.45, type: 'sine' }); tone(ac, { freq: 65, to: 42, dur: 0.2, gain: 0.35, type: 'sine', delay: 0.26 }); },
  deny: (ac) => { tone(ac, { freq: 220, to: 160, dur: 0.12, gain: 0.08, type: 'square' }); tone(ac, { freq: 180, to: 130, dur: 0.14, gain: 0.06, type: 'square', delay: 0.1 }); },
  click: (ac) => { tone(ac, { freq: 900, dur: 0.05, gain: 0.05, type: 'square' }); },
};

// The same sound twice within a few frames (a button that plays its own click, plus the
// click every button makes) plays once.
const lastPlayed = new Map();
// Haptics (phones): a light buzz for the moments that should feel physical.
// Milliseconds, or a [buzz, pause, buzz…] pattern. Off in Settings → Vibration.
const HAPTICS = {
  cardPlay: 12, minionLand: 18, trapReveal: 25, quickPlay: 25, attack: 10, hit: 22, bigHit: 40,
  heroExplode: [70, 40, 140], victory: [30, 50, 30, 50, 90], defeat: [160], turnStart: 15,
};
let haptics = true;
export const canVibrate = () => typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function' && matchMedia('(pointer: coarse)').matches;
export function setHaptics(on) { haptics = !!on; }

export function play(name) {
  const now = performance.now();
  if (now - (lastPlayed.get(name) ?? -1e9) < 70) return;
  lastPlayed.set(name, now);
  if (haptics && HAPTICS[name] && canVibrate()) { try { navigator.vibrate(HAPTICS[name]); } catch { /* not allowed here */ } }
  const ac = audio();
  if (ac && SOUNDS[name]) SOUNDS[name](ac);
}
