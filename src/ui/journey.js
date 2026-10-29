// The new-player path. A brand-new player doesn't meet all twenty realms, two-faction decks,
// traps and Quick Plays at once; the game opens up over their first matches:
//
//   first launch choose your first three realms from six easy ones (STARTERS)
//   matches 1-2  one faction, picking from those three; simple starter decks (no traps or Quick
//                Plays, short card text) on both sides
//   matches 3-4  the full decks of those three: traps and Quick Plays appear
//   match 5+     two-faction decks and Fusions unlock
//   then         two more realms open after every match, until all twenty are there
//
// "Unlock everything" skips it. Anyone who already played before this existed starts with
// everything (saved decks, unlocked cards or a saved game in this browser count as "played").

import { copyLimit, FACTION_DECKS, PLAYABLE_FACTIONS } from '../cards/index.js';
import { getCard } from '../engine/registry.js';
import { DEFAULT_RULES } from '../engine/rules.js';

const KEY = 'shattered-journey';
const REACTIVE_AT = 2;  // matches played before traps and Quick Plays join the decks
const FUSION_AT = 4;    // ... before two-faction decks and Fusions unlock
const PER_MATCH = 2;    // realms that open after each later match
// The six easiest realms to learn: a new player picks their first three from these.
export const STARTERS = ['Vampires', 'Dragons', 'Plants', 'Zombies', 'Divine', 'Robots'];
export const FIRST_PICKS = 3;
// After the starters, the other realms open in this order (most straightforward first).
const LATER = ['Demons', 'Sharks', 'Dinosaurs', 'Bees', 'Aliens', 'Fungus', 'Ghosts', 'Radioactive', 'Acidic', 'Lycanthropes', 'Void', 'Ice Age', 'Eels', 'Ultraterrestrials'];

// Anything only someone who has played leaves behind (tips seen in a match, decks, settings...).
const PLAYED_BEFORE = ['shattered-unlocks', 'shattered-tips-seen', 'shattered-token', 'faction-ccg-decks', 'faction-ccg-save',
  'faction-ccg-lineups', 'faction-ccg-cuts', 'faction-ccg-format', 'faction-ccg-log-open', 'faction-ccg-settings', 'faction-ccg-mute'];

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
    const veteran = PLAYED_BEFORE.some((k) => localStorage.getItem(k) != null);
    const fresh = { games: 0, done: veteran, seen: [] };
    localStorage.setItem(KEY, JSON.stringify(fresh));
    return fresh;
  } catch { return { games: 0, done: true, seen: [] }; }
}
let state = load();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage unavailable */ } };

const order = () => {
  const first = state.chosen ?? STARTERS.slice(0, FIRST_PICKS);
  const rest = [...STARTERS, ...LATER, ...PLAYABLE_FACTIONS].filter((f) => !first.includes(f));
  return [...new Set([...first, ...rest])].filter((f) => PLAYABLE_FACTIONS.includes(f));
};
// A brand-new player hasn't chosen their first realms yet.
export const needsFirstPick = () => !state.done && !state.chosen;
export function chooseFirstRealms(factions) {
  state.chosen = factions.slice(0, FIRST_PICKS);
  save();
}

export const journeyDone = () => !!state.done;
export const gamesPlayed = () => state.games;
// Simple starter decks (both sides) while the player is brand new.
export const starterMode = () => !state.done && state.games < REACTIVE_AT;
export const pairUnlocked = () => state.done || state.games >= FUSION_AT;

// The realms you can pick right now.
export function availableFactions() {
  if (state.done) return PLAYABLE_FACTIONS;
  const extra = state.games <= FUSION_AT ? 0 : (state.games - FUSION_AT) * PER_MATCH;
  const open = new Set(order().slice(0, FIRST_PICKS + extra));
  return PLAYABLE_FACTIONS.filter((f) => open.has(f));
}

// Start the new-player path again (to try it, or to show someone); decks and unlocked cards stay.
export function restartJourney() {
  state = { games: 0, done: false, seen: state.seen ?? [], heroes: state.heroes ?? [] };
  save();
}

export function unlockEverything() {
  state.done = true;
  save();
}

// A starter deck: the faction's minions and spells without traps, Quick Plays or long text,
// two copies of the simplest cheap minions to make 30.
export function starterDeck(faction) {
  const words = (c) => (c.text ?? '').split(/\s+/).filter(Boolean).length;
  const calm = FACTION_DECKS[faction].map((id) => getCard(id)).filter((c) => c.type !== 'trap' && !c.quickPlay);
  let simple = calm.filter((c) => words(c) <= 18);
  // Too few short cards to make 30 with two copies each: take the next-shortest ones too.
  const need = Math.ceil(DEFAULT_RULES.singleDeckSize / DEFAULT_RULES.maxCopies);
  if (simple.length < need) simple = [...simple, ...calm.filter((c) => !simple.includes(c)).sort((a, b) => words(a) - words(b)).slice(0, need - simple.length)];
  const deck = simple.map((c) => c.id);
  const seconds = simple.filter((c) => c.type === 'minion')
    .sort((a, b) => a.cost - b.cost || words(a) - words(b));
  for (const c of seconds) if (deck.length < DEFAULT_RULES.singleDeckSize) deck.push(c.id);
  for (const c of simple) if (deck.length < DEFAULT_RULES.singleDeckSize && deck.filter((x) => x === c.id).length < copyLimit(c.id)) deck.push(c.id);
  return deck.slice(0, DEFAULT_RULES.singleDeckSize);
}

// A finished match moves you along. Returns what just opened up (for the pop-up), or null.
export function recordMatch() {
  if (state.done) return null;
  const before = { reactive: state.games >= REACTIVE_AT, pair: pairUnlocked(), realms: availableFactions() };
  state.games += 1;
  const realms = availableFactions().filter((f) => !before.realms.includes(f));
  if (availableFactions().length === PLAYABLE_FACTIONS.length) state.done = true;
  save();
  if (!before.pair && pairUnlocked()) return { kind: 'fusion' };
  if (!before.reactive && state.games >= REACTIVE_AT) return { kind: 'reactive' };
  if (realms.length) return { kind: 'realms', realms, all: state.done };
  return null;
}

// What the menu says about your progress (null once everything is open).
export function progressLine() {
  if (state.done) return null;
  if (state.games < REACTIVE_AT) return `Starter decks · ${REACTIVE_AT - state.games} more ${REACTIVE_AT - state.games === 1 ? 'match' : 'matches'} until traps and Quick Plays join your deck`;
  if (!pairUnlocked()) return `${FUSION_AT - state.games} more ${FUSION_AT - state.games === 1 ? 'match' : 'matches'} until you can combine two realms and unleash a Fusion`;
  return `${availableFactions().length} of ${PLAYABLE_FACTIONS.length} realms open · ${PER_MATCH} more after every match`;
}

// Fused heroes stay a mystery (a "?" on the menu) until you play a match with that pair:
// the match-start fusion is where you first meet them.
const pairKey = (factions) => [...factions].map((f) => f.toLowerCase()).sort().join('+');
export const heroRevealed = (factions) => (state.heroes ?? []).includes(pairKey(factions));
export function revealHero(factions) {
  if (heroRevealed(factions)) return false;
  (state.heroes ??= []).push(pairKey(factions));
  save();
  return true;
}

// "Have you seen this?" flags for one-time moments (the first Fusion cinematic...).
export function firstTime(tag) {
  if (state.seen?.includes(tag)) return false;
  (state.seen ??= []).push(tag);
  save();
  return true;
}
