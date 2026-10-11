// Registers every card set and defines each faction's fixed deck.
//
// Core rule: every faction has one fixed 30-card deck (one copy of each card
// on the designer's list), and every player owns the same cards. Deck
// building = choosing 2 factions; their decks combine into one 60-card deck.
// Each faction's Hero Spell sits outside the 30 (see engine heroSpellsFor).

import { allCards, registerCards } from '../engine/registry.js';
import { ALIEN_CARDS } from './aliens.js';
import { DINOSAUR_CARDS } from './dinosaurs.js';
import { FUNGUS_CARDS } from './fungus.js';
import { ZOMBIE_CARDS } from './zombies.js';
import { DRAGON_CARDS } from './dragons.js';
import { DEMON_CARDS } from './demons.js';
import { DIVINE_CARDS } from './divine.js';
import { ROBOT_CARDS } from './robots.js';
import { FUSION_CARDS } from './fusions.js';
import { RADIOACTIVE_CARDS } from './radioactive.js';
import { NEUTRAL_CARDS } from './neutral.js';
import { PLANT_CARDS } from './plants.js';
import { STANDARD_CUTS, STANDARD_DUPLICATES } from './standard-cuts.js';
import { isComplete } from './validate.js';
import { VAMPIRE_CARDS } from './vampires.js';

registerCards([...NEUTRAL_CARDS, ...VAMPIRE_CARDS, ...ALIEN_CARDS, ...DINOSAUR_CARDS, ...PLANT_CARDS, ...FUNGUS_CARDS, ...ZOMBIE_CARDS, ...DRAGON_CARDS, ...DEMON_CARDS, ...DIVINE_CARDS, ...ROBOT_CARDS, ...RADIOACTIVE_CARDS, ...FUSION_CARDS]);

const isDeckCard = (c) => !c.token && !c.heroSpell;

// The designer's full list per faction (should be exactly 30).
export const FACTION_LISTS = {};
for (const c of allCards().filter(isDeckCard)) (FACTION_LISTS[c.faction] ??= []).push(c.id);

// What actually goes into a game today: the implemented part of each list.
// Pending cards are left out until their rules are defined.
export const FACTION_DECKS = Object.fromEntries(
  Object.entries(FACTION_LISTS).map(([f, ids]) => [f, ids.filter((id) => isComplete(allCards().find((c) => c.id === id)))]),
);

// Factions with at least some playable cards, in roster order.
export const PLAYABLE_FACTIONS = Object.keys(FACTION_DECKS).filter((f) => FACTION_DECKS[f].length > 0);

// The standard cut for a set of factions (10 cards from each).
export function standardCuts(factions) {
  return factions.flatMap((f) => STANDARD_CUTS[f] ?? []);
}

// A playable deck: the factions' cards minus the cut ones. With no cut list
// given, the standard cut is used.
export function buildDeck(factions, cuts = standardCuts(factions)) {
  const out = new Set(cuts);
  return factions.flatMap((f) => FACTION_DECKS[f]).filter((id) => !out.has(id));
}

// ---- One-faction format ----------------------------------------------------
// A deck is one faction's 30 cards plus 10 duplicates of cards from that list
// (no more than 2 copies of any card) = 40.

export function standardDuplicates(faction) {
  if (STANDARD_DUPLICATES[faction]) return STANDARD_DUPLICATES[faction];
  const cut = new Set(STANDARD_CUTS[faction] ?? []);
  const cost = (id) => allCards().find((c) => c.id === id).cost;
  return FACTION_DECKS[faction].filter((id) => !cut.has(id))
    .map((id, i) => ({ id, i })).sort((a, b) => cost(a.id) - cost(b.id) || a.i - b.i)
    .slice(0, 10).map((x) => x.id);
}

export function buildSingleDeck(faction, duplicates = standardDuplicates(faction)) {
  return [...FACTION_DECKS[faction], ...duplicates];
}
