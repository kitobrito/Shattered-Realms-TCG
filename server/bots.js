// Stand-in opponents for Quick Match and Ranked while the playerbase grows. Each is an ordinary account
// (flag `bot: true`, no usable password) with a name, a join date and a ladder record, so it appears on
// the ladder like anyone else. A player who waits a little in the queue with nobody to play is matched
// with one; the server plays its turns with the game's AI (src/ai/smart.js), pausing like a person.
// Every so often two of them "play" each other off-screen so the ladder keeps moving.

import crypto from 'node:crypto';
import { buildDeck, buildSingleDeck, PLAYABLE_FACTIONS } from '../src/cards/index.js';
import { checkDeck } from '../src/cards/deck-check.js';
import { applyResult, freshLadder, ladderScore, newRating, START_RATING } from './ladder.js';

export const BOT_NAMES = [
  'Vexmora', 'Ash_Warden', 'LunaShard', 'grimbolt', 'Thornveil', 'Mirelle', 'Oathbreaker', 'Pyre_Knight',
  'Sablewing', 'Quillon', 'Duskmancer', 'Ironroot', 'Velkara', 'ZephyrX', 'Nightglass', 'Brakka', 'Solenne',
  'Wyrmtooth', 'Eclipse_7', 'Hollowborn', 'Corvane', 'Starling', 'Runebeard', 'Maelis', 'Tidecaller',
  'kaelthorn', 'Mossfang', 'Ember_Vale', 'Griselda', 'Nox_Arden', 'Fenwick', 'Cindra',
];

const r = (a, b) => a + Math.random() * (b - a);
const pickOne = (list) => list[Math.floor(Math.random() * list.length)];

// A believable record: some games played, a ladder reached by actually running results.
function seedRecord(acc) {
  const games = Math.floor(r(6, 140));
  const skill = r(0.35, 0.68);
  acc.ladder = freshLadder();
  acc.rating = START_RATING;
  for (let i = 0; i < games; i++) {
    const won = Math.random() < skill;
    const opp = acc.rating + r(-120, 120);
    acc.ladder = applyResult(acc.ladder, won, acc.rating, opp).ladder;
    acc.rating = newRating(acc.rating, opp, won);
    if (won) { acc.wins++; acc.rankedWins++; } else { acc.losses++; acc.rankedLosses++; }
  }
  const quick = Math.floor(r(0, 60));
  for (let i = 0; i < quick; i++) { if (Math.random() < skill) acc.wins++; else acc.losses++; }
}

// Create any stand-ins that don't exist yet (a name a real player already took is skipped).
export async function ensureBots(store, names = BOT_NAMES) {
  const keys = [];
  for (const name of names) {
    const key = name.toLowerCase();
    const existing = await store.get(key);
    if (existing) { if (existing.bot) keys.push(key); continue; }
    const acc = {
      key, name, bot: true, salt: crypto.randomBytes(16).toString('hex'), hash: crypto.randomBytes(32).toString('hex'),
      created: Date.now() - Math.floor(r(2, 75) * 86400000), wins: 0, losses: 0, rankedWins: 0, rankedLosses: 0,
      rating: START_RATING, ladder: freshLadder(),
    };
    seedRecord(acc);
    if (await store.create(acc)) keys.push(key);
  }
  return keys;
}

// How well a stand-in plays: by its rating, never with the AI's Health or card head start.
export const botDifficulty = (rating) => (rating < 960 ? 'easy' : rating < 1120 ? 'medium' : 'hard');

// A queue entry for a stand-in to face `human` (same mode and format; Ranked: the closest rating free).
export function botEntry(human, accounts, busy) {
  const free = accounts.filter((a) => a.bot && !busy.has(a.key));
  if (!free.length) return null;
  const sorted = human.mode === 'ranked' ? free.sort((a, b) => Math.abs(a.rating - human.rating) - Math.abs(b.rating - human.rating)) : free;
  const acc = human.mode === 'ranked' ? pickOne(sorted.slice(0, 4)) : pickOne(sorted);
  let factions, deck;
  for (let tries = 0; tries < 10; tries++) {
    if (human.format === 'single') { factions = [pickOne(PLAYABLE_FACTIONS)]; deck = buildSingleDeck(factions[0]); }
    else {
      const a = pickOne(PLAYABLE_FACTIONS); let b = pickOne(PLAYABLE_FACTIONS);
      while (b === a) b = pickOne(PLAYABLE_FACTIONS);
      factions = [a, b]; deck = buildDeck(factions);
    }
    const entry = checkDeck({ format: human.format, factions, deck });
    if (!entry.error) return { key: acc.key, conn: null, bot: true, mode: human.mode, friend: null, friendKey: null, ...entry, rating: acc.rating, since: Date.now(), difficulty: botDifficulty(acc.rating) };
  }
  return null;
}

// Off-screen games between stand-ins, so the ladder moves between visits.
export async function simulateBotGames(store, keys, pairs = 1) {
  for (let i = 0; i < pairs && keys.length >= 2; i++) {
    const a = await store.get(pickOne(keys));
    let b = await store.get(pickOne(keys));
    for (let t = 0; t < 5 && b?.key === a?.key; t++) b = await store.get(pickOne(keys));
    if (!a || !b || a.key === b.key) continue;
    const aWins = Math.random() < 1 / (1 + 10 ** ((b.rating - a.rating) / 400));
    for (const [acc, opp, won] of [[a, b, aWins], [b, a, !aWins]]) {
      acc.ladder = applyResult(acc.ladder ?? freshLadder(), won, acc.rating, opp.rating).ladder;
      if (won) { acc.wins++; acc.rankedWins++; } else { acc.losses++; acc.rankedLosses++; }
    }
    const ra = a.rating;
    a.rating = newRating(ra, b.rating, aWins);
    b.rating = newRating(b.rating, ra, !aWins);
    await store.save(a); await store.save(b);
  }
}

// How long a stand-in "thinks" before a move, in ms.
export const botThinkMs = (pending) => (pending === 'mulligan' ? r(1500, 3200) : pending === 'reaction' ? r(600, 1300) : r(900, 2400));
export { ladderScore };
