// Expansion cards (`extra: true`) start locked. Each match the player wins
// (vs the AI or online) unlocks two at random; a pop-up shows them.
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
  const pool = extras().filter((c) => !have.has(c.id)).map((c) => c.id);
  const won = [];
  while (won.length < n && pool.length) won.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  for (const id of won) have.add(id);
  try { localStorage.setItem(KEY, JSON.stringify([...have])); } catch { /* storage unavailable */ }
  return won;
}

export function unlockPopupHTML(ids) {
  const left = lockedCount();
  return `<div class="overlay unlock-overlay"><div class="unlock-panel">
    <div class="unlock-burst"></div>
    <h2>New cards unlocked!</h2>
    <p class="sub">Your victory earned ${ids.length === 1 ? 'a new card' : `${ids.length} new cards`}.</p>
    <div class="unlock-row">${ids.map((id) => `<div class="unlock-card">${cardHTML(getCard(id))}<span class="unlock-faction">${esc(getCard(id).faction)}</span></div>`).join('')}</div>
    <p class="sub">Add them to your deck with <b>🔁 Swap cards</b> on the main menu.${left ? ` ${left} more to unlock.` : ' You have unlocked every card!'}</p>
    <button data-act="unlockOk">Awesome!</button>
  </div></div>`;
}
