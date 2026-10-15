// Registers every card set and defines each faction's fixed deck.
//
// Core rule: every faction has one fixed 30-card deck (one copy of each card
// on the designer's list), and every player owns the same cards. Deck
// building = choosing 2 factions; their decks combine into one 60-card deck.
// Each faction's Hero Spell sits outside the 30 (see engine heroSpellsFor).

import { allCards, registerCards } from '../engine/registry.js';
import { DEFAULT_RULES } from '../engine/rules.js';
import { ALIEN_CARDS } from './aliens.js';
import { DINOSAUR_CARDS } from './dinosaurs.js';
import { FUNGUS_CARDS } from './fungus.js';
import { ZOMBIE_CARDS } from './zombies.js';
import { DRAGON_CARDS } from './dragons.js';
import { DEMON_CARDS } from './demons.js';
import { DIVINE_CARDS } from './divine.js';
import { ROBOT_CARDS } from './robots.js';
import { FUSION_CARDS } from './fusions.js';
import { BEE_CARDS } from './bees.js';
import { GHOST_CARDS } from './ghosts.js';
import { ULTRATERRESTRIAL_CARDS } from './ultraterrestrials.js';
import { SHARK_CARDS } from './sharks.js';
import { ACIDIC_CARDS } from './acidic.js';
import { RADIOACTIVE_CARDS } from './radioactive.js';
import { NEUTRAL_CARDS } from './neutral.js';
import { PLANT_CARDS } from './plants.js';
import { STANDARD_CUTS, STANDARD_DUPLICATES } from './standard-cuts.js';
import { isComplete } from './validate.js';
import { VAMPIRE_CARDS } from './vampires.js';

registerCards([...NEUTRAL_CARDS, ...VAMPIRE_CARDS, ...ALIEN_CARDS, ...DINOSAUR_CARDS, ...PLANT_CARDS, ...FUNGUS_CARDS, ...ZOMBIE_CARDS, ...DRAGON_CARDS, ...DEMON_CARDS, ...DIVINE_CARDS, ...ROBOT_CARDS, ...RADIOACTIVE_CARDS, ...BEE_CARDS, ...GHOST_CARDS, ...ULTRATERRESTRIAL_CARDS, ...SHARK_CARDS, ...ACIDIC_CARDS, ...FUSION_CARDS]);

const isDeckCard = (c) => !c.token && !c.heroSpell;

// The designer's standard list per faction (exactly 30). Expansion cards
// (`extra: true`) are not in it: players swap them in (FACTION_POOLS).
export const FACTION_LISTS = {};
for (const c of allCards().filter((x) => isDeckCard(x) && !x.extra)) (FACTION_LISTS[c.faction] ??= []).push(c.id);

// Every card a faction's 30 can be chosen from (standard + expansion), playable ones only.
export const FACTION_POOLS = {};
for (const c of allCards().filter(isDeckCard)) if (isComplete(c)) (FACTION_POOLS[c.faction] ??= []).push(c.id);
export const hasExtras = (f) => (FACTION_POOLS[f]?.length ?? 0) > (FACTION_LISTS[f]?.length ?? 0);

// What actually goes into a game today: the implemented part of each list.
// Pending cards are left out until their rules are defined.
export const FACTION_DECKS = Object.fromEntries(
  Object.entries(FACTION_LISTS).map(([f, ids]) => [f, ids.filter((id) => isComplete(allCards().find((c) => c.id === id)))]),
);

// Factions with at least some playable cards, in roster order.
export const PLAYABLE_FACTIONS = Object.keys(FACTION_DECKS).filter((f) => FACTION_DECKS[f].length > 0);

// A faction's 30 for a player: their saved swap-in choice if it is valid
// (30 different cards from the pool), otherwise the standard 30.
export function lineupOf(f, lineups = {}) {
  const l = lineups?.[f];
  const pool = new Set(FACTION_POOLS[f] ?? []);
  const ok = Array.isArray(l) && l.length === FACTION_DECKS[f].length && new Set(l).size === l.length && l.every((id) => pool.has(id));
  return ok ? l : FACTION_DECKS[f];
}
const costOf = (id) => allCards().find((c) => c.id === id).cost;

// The standard cut for a set of factions (10 cards from each). If a player
// swapped out a card the standard cut would remove, the most expensive
// remaining standard cards are cut instead, so the deck stays the same size.
export function standardCuts(factions, lineups = {}) {
  const per = Math.floor(DEFAULT_RULES.cardsCut / factions.length);
  return factions.flatMap((f) => {
    const lineup = lineupOf(f, lineups);
    const cut = (STANDARD_CUTS[f] ?? []).filter((id) => lineup.includes(id));
    const spare = lineup.filter((id) => !cut.includes(id) && FACTION_LISTS[f].includes(id)).sort((a, b) => costOf(b) - costOf(a));
    return [...cut, ...spare.slice(0, Math.max(0, per - cut.length))];
  });
}

// A playable deck: the factions' cards minus the cut ones. With no cut list
// given, the standard cut is used.
export function buildDeck(factions, cuts, lineups = {}) {
  const out = new Set(cuts ?? standardCuts(factions, lineups));
  return factions.flatMap((f) => lineupOf(f, lineups)).filter((id) => !out.has(id));
}

// ---- One-faction format ----------------------------------------------------
// A deck is one faction's 30 cards plus 10 duplicates of cards from that list
// (no more than 2 copies of any card) = 40.

export function standardDuplicates(faction, lineups = {}) {
  const lineup = lineupOf(faction, lineups);
  const fixed = (STANDARD_DUPLICATES[faction] ?? []).filter((id) => lineup.includes(id));
  if (STANDARD_DUPLICATES[faction] && fixed.length === STANDARD_DUPLICATES[faction].length) return STANDARD_DUPLICATES[faction];
  const cut = new Set(STANDARD_CUTS[faction] ?? []);
  const rest = lineup.filter((id) => !cut.has(id) && !fixed.includes(id))
    .map((id, i) => ({ id, i })).sort((a, b) => costOf(a.id) - costOf(b.id) || a.i - b.i).map((x) => x.id);
  return [...fixed, ...rest].slice(0, DEFAULT_RULES.singleFactionDuplicates);
}

// One-faction format: players build their own 30 (up to 2 copies of a card). The recommended
// deck is the faction's 30 (topped up from its standard duplicates if the list is shorter).
export function buildSingleDeck(faction, lineups = {}) {
  const deck = [...lineupOf(faction, lineups)];
  for (const id of standardDuplicates(faction, lineups)) if (deck.length < DEFAULT_RULES.singleDeckSize) deck.push(id);
  return deck.slice(0, DEFAULT_RULES.singleDeckSize);
}
