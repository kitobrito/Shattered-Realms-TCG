// Expansion cards (`extra: true`) start locked. Each match the player wins
// (vs the AI or online) unlocks two from the factions they won with, legendaries last;
// a pop-up shows them.
// Saved in this browser (localStorage).

import { allCards, getCard } from '../engine/registry.js';
import { cardHTML, esc } from './shared.js';

const KEY = 'shattered-unlocks';
export const UNLOCKS_PER_WIN = 2;

function saved() {
  try { return new Set(JSON.parse(localStorage.getItem(KEY) ?? '[]')); } catch { return new Set(); }
}
// alwaysUnlocked: an expansion card everyone already has (the plain T. Rex, moved out of the original set).
const extras = () => allCards().filter((c) => c.extra && !c.token && !c.custom && !c.alwaysUnlocked);

export const isLocked = (id) => !!getCard(id)?.extra && !getCard(id).alwaysUnlocked && !saved().has(id);
export const lockedCount = (faction) => extras().filter((c) => (!faction || c.faction === faction) && !saved().has(c.id)).length;

// Unlock up to n locked cards from the factions the player won with, taking turns between
// them (one each with two factions). Within a faction, legendaries come last: they join the
// draw only once its other cards are unlocked. When those factions have nothing left, the
// rest come from any faction, so a win always pays. Returns the unlocked ids.
export function awardUnlocks(n = UNLOCKS_PER_WIN, factions = []) {
  const have = saved();
  const left = extras().filter((c) => !have.has(c.id));
  const take = (cards) => {
    const pool = cards.filter((c) => !c.legendary && !won.includes(c.id));
    const from = pool.length ? pool : cards.filter((c) => !won.includes(c.id));
    return from.length ? from[Math.floor(Math.random() * from.length)].id : null;
  };
  const won = [];
  const mine = [...new Set(factions)];
  for (let i = 0; won.length < n && mine.length; i++) {
    const open = mine.filter((f) => left.some((c) => c.faction === f && !won.includes(c.id)));
    if (!open.length) break;
    won.push(take(left.filter((c) => c.faction === open[i % open.length])));
  }
  while (won.length < n) {
    const id = take(left);
    if (!id) break;
    won.push(id);
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
