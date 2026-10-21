// Expansion cards (`extra: true`) start locked. Each match the player wins
// (vs the AI or online) unlocks two at random, legendaries last; a pop-up shows them.
// Saved in this browser (localStorage).

import { allCards, getCard } from '../engine/registry.js';
import { cardHTML, esc } from './shared.js';

const KEY = 'shattered-unlocks';
export const UNLOCKS_PER_WIN = 2;

function saved() {
  try { return new Set(JSON.parse(localStorage.getItem(KEY) ?? '[]')); } catch { return new Set(); }
}
const extras = () => allCards().filter((c) => c.extra && !c.token && !c.custom);

export const isLocked = (id) => !!getCard(id)?.extra && !saved().has(id);
export const lockedCount = (faction) => extras().filter((c) => (!faction || c.faction === faction) && !saved().has(c.id)).length;

// Unlock up to n random locked cards; returns their ids.
export function awardUnlocks(n = UNLOCKS_PER_WIN) {
  const have = saved();
  const left = extras().filter((c) => !have.has(c.id));
  // Legendaries come last: they join the draw only once every other card is unlocked.
  const pool = left.filter((c) => !c.legendary).map((c) => c.id);
  const legends = left.filter((c) => c.legendary).map((c) => c.id);
  const won = [];
  while (won.length < n && (pool.length || legends.length)) {
    const from = pool.length ? pool : legends;
    won.push(from.splice(Math.floor(Math.random() * from.length), 1)[0]);
  }
  for (const id of won) have.add(id);
  try { localStorage.setItem(KEY, JSON.stringify([...have])); } catch { /* storage unavailable */ }
  return won;
}

export function unlockPopupHTML(ids) {
  const left = lockedCount();
  return `<div class="overlay unlock-overlay"><div class="unlock-panel">
    <div class="unlock-burst"></div>
    <img class="unlock-icon" src="art/ui/icon-unlocks.png" alt="">
    <h2>New cards unlocked!</h2>
    <img class="ui-divider" src="art/ui/divider.png" alt="">
    <p class="sub">Your victory earned ${ids.length === 1 ? 'a new card' : `${ids.length} new cards`}.</p>
    <div class="unlock-row">${ids.map((id) => `<div class="unlock-card">${cardHTML(getCard(id))}<span class="unlock-faction">${esc(getCard(id).faction)}</span></div>`).join('')}</div>
    <p class="sub">Add them to your deck with <b>Build my deck</b> on the main menu.${left ? ` ${left} more to unlock.` : ' You have unlocked every card!'}</p>
    <button data-act="unlockOk">Awesome!</button>
  </div></div>`;
}
