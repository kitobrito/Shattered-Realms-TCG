// Player settings: volume, game speed, reduced motion, colour-blind mode.
// Saved in this browser (localStorage); applied on load and on every change.

import * as fx from './fx.js';
import * as sound from './sound.js';
import { setMusicVolume } from './music.js';

const KEY = 'faction-ccg-settings';
const SPEEDS = { normal: 1, fast: 0.65, turbo: 0.4 };
const DEFAULTS = { volume: 80, music: 50, speed: 'normal', reducedMotion: false, colorBlind: false, tips: true, difficulty: 'medium' };

// AI difficulty, easiest first (keys match DIFFICULTIES in ai/smart.js).
export const DIFFICULTY_LEVELS = [
  ['easy', 'Easy', 'Makes mistakes. Good for learning.'],
  ['medium', 'Medium', 'Plans its turn sensibly.'],
  ['hard', 'Hard', 'Trained by machine learning on thousands of games.'],
  ['veryHard', 'Very Hard', 'Trained, searches deeper, and predicts your attacks back.'],
  ['impossible', 'Impossible', '⚠ This AI has advantages: it can see your hand, and its Hero starts with 40 Health (yours has 30). It also uses the strongest search.'],
];
const levelIndex = (key) => Math.max(0, DIFFICULTY_LEVELS.findIndex(([k]) => k === key));

// The difficulty slider (main menu and Settings share it).
export function difficultySliderHTML(key = getSettings().difficulty) {
  const i = levelIndex(key);
  const [, name, about] = DIFFICULTY_LEVELS[i];
  return `<div class="difficulty-slider lvl-${i}">
    <div class="diff-top"><span>AI difficulty</span><b class="diff-name">${name}</b></div>
    <input type="range" min="0" max="${DIFFICULTY_LEVELS.length - 1}" step="1" value="${i}" data-difficulty aria-label="AI difficulty">
    <div class="diff-ticks">${DIFFICULTY_LEVELS.map(([, n], j) => `<span class="${j === i ? 'on' : ''}">${n}</span>`).join('')}</div>
    <small class="diff-about">${about}</small>
  </div>`;
}

// Live update for any difficulty slider: saves the choice and refreshes its labels.
document.addEventListener('input', (e) => {
  const t = e.target;
  if (!t.matches?.('[data-difficulty]')) return;
  const i = Number(t.value);
  const [key, name, about] = DIFFICULTY_LEVELS[i];
  setSetting({ difficulty: key });
  const box = t.closest('.difficulty-slider');
  box.className = `difficulty-slider lvl-${i}`;
  box.querySelector('.diff-name').textContent = name;
  box.querySelector('.diff-about').textContent = about;
  box.querySelectorAll('.diff-ticks span').forEach((s, j) => s.classList.toggle('on', j === i));
});

export function getSettings() {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }; } catch { return { ...DEFAULTS }; }
}

export function setSetting(patch) {
  const next = { ...getSettings(), ...patch };
  save(next);
  return next;
}

function save(settings) {
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* storage unavailable */ }
}

export function applySettings(settings = getSettings()) {
  sound.setVolume(settings.volume / 100);
  setMusicVolume(settings.volume / 100, settings.music / 100);
  fx.setSpeed(SPEEDS[settings.speed] ?? 1, settings.reducedMotion);
  document.body.classList.toggle('reduced-motion', settings.reducedMotion);
  document.body.classList.toggle('colorblind', settings.colorBlind);
}

export function openSettings() {
  closeSettings();
  const st = getSettings();
  const el = document.createElement('div');
  el.id = 'settings';
  el.innerHTML = `
    <div class="settings-panel" role="dialog" aria-label="Settings">
      <h2>Settings</h2>
      <label class="set-row"><span>Volume</span>
        <input type="range" min="0" max="100" step="5" value="${st.volume}" data-set="volume"><b>${st.volume}%</b></label>
      <label class="set-row"><span>Music</span>
        <input type="range" min="0" max="100" step="5" value="${st.music}" data-set="music"><b>${st.music}%</b></label>
      <div class="set-row set-difficulty">${difficultySliderHTML(st.difficulty)}</div>
      <div class="set-row"><span>Game speed</span>
        <div class="seg">${Object.keys(SPEEDS).map((k) => `<button data-speed="${k}" class="${st.speed === k ? 'on' : ''}">${k === 'turbo' ? 'Very fast' : k[0].toUpperCase() + k.slice(1)}</button>`).join('')}</div></div>
      <label class="set-row"><span>Reduce motion</span><input type="checkbox" data-set="reducedMotion" ${st.reducedMotion ? 'checked' : ''}><i>Shorter, calmer animations</i></label>
      <label class="set-row"><span>Colour-blind mode</span><input type="checkbox" data-set="colorBlind" ${st.colorBlind ? 'checked' : ''}><i>Blue / orange instead of green / red</i></label>
      <label class="set-row"><span>Tips for new players</span><input type="checkbox" data-set="tips" ${st.tips ? 'checked' : ''}><i>Short hints the first time things happen</i></label>
      <div class="set-row"><span></span><button class="ghost tips-reset">Show all tips again</button></div>
      <button class="settings-close">Done</button>
    </div>`;
  document.body.appendChild(el);
  const update = (patch) => {
    const next = { ...getSettings(), ...patch };
    save(next);
    applySettings(next);
    return next;
  };
  el.addEventListener('input', (e) => {
    const t = e.target;
    if (t.dataset.set === 'volume') { update({ volume: Number(t.value) }); t.nextElementSibling.textContent = `${t.value}%`; }
    if (t.dataset.set === 'music') { update({ music: Number(t.value) }); t.nextElementSibling.textContent = `${t.value}%`; }
  });
  el.addEventListener('change', (e) => {
    const t = e.target;
    if (t.type === 'checkbox') update({ [t.dataset.set]: t.checked });
    if (t.dataset.set === 'volume') sound.play('click'); // a sample at the new volume
  });
  el.addEventListener('click', (e) => {
    const sp = e.target.closest('[data-speed]');
    if (sp) {
      update({ speed: sp.dataset.speed });
      for (const b of el.querySelectorAll('[data-speed]')) b.classList.toggle('on', b === sp);
    }
    if (e.target.closest('.tips-reset')) {
      try { localStorage.removeItem('shattered-tips-seen'); } catch { /* storage unavailable */ }
      update({ tips: true });
      const box = el.querySelector('[data-set="tips"]');
      if (box) box.checked = true;
      e.target.textContent = 'Tips will show again';
    }
    if (e.target.closest('.settings-close') || e.target === el) closeSettings();
  });
}

export function closeSettings() {
  document.getElementById('settings')?.remove();
}
