// Menu, collection and deck-builder animations: picking a realm, the Play button's shockwave,
// cards dealing onto a new page, the sliding highlight on tab rows, and cards flying into the
// deck list. Each is a short one-off played right after a render (main.js calls these).

import * as fx from './fx.js';
import { fslug } from './shared.js';

const calm = () => document.body.classList.contains('reduced-motion') || matchMedia('(prefers-reduced-motion: reduce)').matches;

// A realm was just picked: its medallion bursts in the faction's colour, and its hero card
// slides into the matchup strip.
export function realmPicked(root, faction) {
  if (calm()) return;
  const medal = root.querySelector(`.medallion[data-faction="${CSS.escape(faction)}"] .medal-face`);
  if (medal) {
    const r = medal.getBoundingClientRect();
    fx.particles(r, faction, 4);
    fx.shockwave(r, fx.factionColor(faction));
    medal.animate([{ transform: 'scale(1.25)', filter: 'brightness(2)' }, { transform: 'scale(1.05)', filter: 'none' }], { duration: 420, easing: 'cubic-bezier(.2,.8,.3,1)' });
  }
  const hero = root.querySelector(`.ts-matchup .vs-hero.f-${fslug(faction)}`);
  hero?.animate([
    { transform: 'translateY(-40px) scale(0.6) rotate(-8deg)', opacity: 0, filter: 'brightness(2.5)' },
    { transform: 'translateY(4px) scale(1.06) rotate(1deg)', opacity: 1, offset: 0.7 },
    { transform: 'none', opacity: 1, filter: 'none' },
  ], { duration: 520, easing: 'cubic-bezier(.2,.8,.3,1)' });
  // The pair is complete: the mystery hero cracks with light.
  const mystery = root.querySelector('.ts-matchup .vs-hero.mystery');
  if (mystery && root.querySelectorAll('.ts-matchup .vs-hero:not(.fused)').length === 2) {
    mystery.classList.add('cracking');
    setTimeout(() => mystery.classList.remove('cracking'), 1400);
  }
}

// Play: a ring of light rushes out from the button and the screen flares, then the game starts.
export function playBurst(btn) {
  if (calm() || !btn) return 0;
  const r = btn.getBoundingClientRect();
  fx.shockwave(r, '#ffd25a');
  fx.shockwave({ left: r.left - r.width, top: r.top - r.height, width: r.width * 3, height: r.height * 3 }, '#fff3c0');
  fx.particles(r, 'Divine', 6);
  btn.animate([{ transform: 'scale(1)' }, { transform: 'scale(0.9)', filter: 'brightness(2)' }, { transform: 'scale(1.08)' }, { transform: 'scale(1)' }], { duration: 380 });
  return 360; // ms to wait before leaving the menu
}

// The cards on a freshly shown page are dealt in one after another, from the side you turned toward.
export function dealIn(pg, dir = 1) {
  if (calm() || !pg) return;
  const cards = [...pg.querySelectorAll('.pager-grid > *')].filter((c) => c.style.display !== 'none');
  cards.forEach((c, i) => c.animate([
    { transform: `translate(${dir * 60}px, -24px) rotate(${dir * 8}deg) scale(0.85)`, opacity: 0 },
    { transform: 'none', opacity: 1 },
  ], { duration: 320, delay: i * 45, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'backwards' }));
}

// Tab rows (set filter, deck-builder tabs, format toggle): the gold highlight slides from the
// tab that was on to the one now on. `before` maps a row's key to the old tab's rect.
const ROWS = '.set-filter, .builder-tabs, .format-toggle';
export function tabRects(root) {
  const m = new Map();
  root.querySelectorAll(ROWS).forEach((row, i) => { const on = row.querySelector('.on'); if (on) m.set(i, on.getBoundingClientRect()); });
  return m;
}
export function slideTabs(root, before) {
  if (calm() || !before?.size) return;
  root.querySelectorAll(ROWS).forEach((row, i) => {
    const on = row.querySelector('.on');
    const old = before.get(i);
    if (!on || !old) return;
    const now = on.getBoundingClientRect();
    if (Math.abs(now.left - old.left) < 2 && Math.abs(now.top - old.top) < 2) return;
    const pill = document.createElement('div');
    pill.className = 'tab-pill';
    document.body.appendChild(pill);
    on.classList.add('pill-wait');
    pill.animate([
      { left: `${old.left}px`, top: `${old.top}px`, width: `${old.width}px`, height: `${old.height}px` },
      { left: `${now.left}px`, top: `${now.top}px`, width: `${now.width}px`, height: `${now.height}px` },
    ], { duration: 260, easing: 'cubic-bezier(.3,.8,.3,1)' }).finished.then(() => { pill.remove(); on.classList.remove('pill-wait'); }, () => pill.remove());
  });
}

// A card added to the deck: a glowing copy of its art flies from where it was dropped into its row.
export function flyToDeck(fromRect, row, art) {
  if (calm() || !fromRect || !row) return;
  const to = row.getBoundingClientRect();
  const el = document.createElement('div');
  el.className = 'deck-fly';
  if (art) el.style.backgroundImage = `url('${art}')`;
  document.body.appendChild(el);
  const w = Math.min(fromRect.width, 120), h = w * 1.4;
  el.animate([
    { left: `${fromRect.left + fromRect.width / 2 - w / 2}px`, top: `${fromRect.top + fromRect.height / 2 - h / 2}px`, width: `${w}px`, height: `${h}px`, opacity: 1, borderRadius: '10px' },
    { left: `${to.left}px`, top: `${to.top}px`, width: `${to.width}px`, height: `${to.height}px`, opacity: 0.2, borderRadius: '6px' },
  ], { duration: 380, easing: 'cubic-bezier(.5,0,.3,1)' }).finished.then(() => el.remove(), () => el.remove());
}

// The deck's mana curve: bars grow from their last heights to the new ones.
let lastCurve = null;
export function animateCurve(root) {
  const bars = [...root.querySelectorAll('.mana-curve .mc-bar i')];
  if (!bars.length) { lastCurve = null; return; }
  const now = bars.map((b) => b.style.height);
  if (lastCurve && !calm()) {
    bars.forEach((b, i) => {
      if (lastCurve[i] === now[i]) return;
      b.animate([{ height: lastCurve[i] ?? '0%' }, { height: now[i] }], { duration: 320, easing: 'cubic-bezier(.3,.8,.3,1)' });
    });
  }
  lastCurve = now;
}

// A locked card: its lock rattles.
export function rattle(card) {
  if (calm() || !card) return;
  card.animate([
    { transform: 'rotate(0)' }, { transform: 'rotate(-4deg)' }, { transform: 'rotate(4deg)' },
    { transform: 'rotate(-3deg)' }, { transform: 'rotate(2deg)' }, { transform: 'rotate(0)' },
  ], { duration: 420, easing: 'ease-in-out' });
}
