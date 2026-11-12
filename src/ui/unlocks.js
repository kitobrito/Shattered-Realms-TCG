// Expansion cards (`extra: true`) start locked. Each match the player wins (vs the AI or online)
// unlocks two from the factions they won with, legendaries last, but only until they own
// FREE_PER_FACTION (10) of that realm's expansion cards; the rest come from card packs (server/economy.js).
// Signed in, the account on the server holds the cards (mirrored here by setOwnedCards); a guest's are
// saved in this browser (localStorage).

import { allCards, getCard } from '../engine/registry.js';
import { cardHTML, esc } from './shared.js';

const KEY = 'shattered-unlocks';
export const UNLOCKS_PER_WIN = 2;
export const FREE_PER_FACTION = 10;

// The account's cards (from the server) replace this browser's list.
export function setOwnedCards(ids) {
  try { localStorage.setItem(KEY, JSON.stringify([...new Set(ids ?? [])])); } catch { /* storage unavailable */ }
}
// Alternate boards bought in the Shop (the account's `boards`, mirrored here like the cards).
const BOARDS_KEY = 'shattered-boards';
export function setOwnedBoards(ids) {
  try { localStorage.setItem(BOARDS_KEY, JSON.stringify([...new Set(ids ?? [])])); } catch { /* storage unavailable */ }
}
export const ownedBoards = () => { try { return JSON.parse(localStorage.getItem(BOARDS_KEY) ?? '[]'); } catch { return []; } };
export const localOwnedCards = () => { try { return JSON.parse(localStorage.getItem(KEY) ?? '[]'); } catch { return []; } };

// Signed in as an admin (server-link.js): everything counts as unlocked.
const isAdmin = () => { try { return localStorage.getItem('shattered-admin') === '1'; } catch { return false; } };
function saved() {
  if (isAdmin()) return new Set(allCards().filter((c) => c.extra).map((c) => c.id));
  try { return new Set(JSON.parse(localStorage.getItem(KEY) ?? '[]')); } catch { return new Set(); }
}
// alwaysUnlocked: an expansion card everyone already has (the plain T. Rex, moved out of the original set).
const extras = () => allCards().filter((c) => c.extra && !c.token && !c.custom && !c.alwaysUnlocked);

export const isLocked = (id) => !!getCard(id)?.extra && !getCard(id).alwaysUnlocked && !saved().has(id);
// A mini-set's unlock progress (the Harvest Moon / Cordyceps boards unlock when it is complete).
export function setProgress(set) {
  const cards = extras().filter((c) => c.set === set);
  const have = saved();
  return { have: cards.filter((c) => have.has(c.id)).length, total: cards.length };
}
export const setComplete = (set) => { const p = setProgress(set); return p.total > 0 && p.have === p.total; };
// An alternate board's unlock progress: its mini-set, or (expansion: true) the faction's main expansion.
export function boardProgress(b, faction) {
  if (b.set) return setProgress(b.set);
  // cards: a board unlocked by a named list of cards (the Xeno Hive: the Hive Brood Xenomorphs).
  if (b.cards) { const have = saved(); return { have: b.cards.filter((id) => have.has(id)).length, total: b.cards.length }; }
  const cards = extras().filter((c) => c.faction === faction && !c.set);
  const have = saved();
  return { have: cards.filter((c) => have.has(c.id)).length, total: cards.length };
}
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
  // Wins only unlock a realm's cards until you own FREE_PER_FACTION of them; the rest come from packs.
  const ownedIn = (f) => extras().filter((c) => c.faction === f && (have.has(c.id) || won.includes(c.id))).length;
  for (let i = 0; won.length < n && mine.length; i++) {
    const open = mine.filter((f) => ownedIn(f) < FREE_PER_FACTION && left.some((c) => c.faction === f && !won.includes(c.id)));
    if (!open.length) break;
    won.push(take(left.filter((c) => c.faction === open[i % open.length])));
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
