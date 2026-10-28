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
import { LYCANTHROPE_CARDS } from './lycanthropes.js';
import { VOID_CARDS } from './void.js';
import { ICE_AGE_CARDS } from './ice-age.js';
import { FRUIT_PIRATE_CARDS } from './fruit-pirates.js';
import { NEUTRAL_CARDS } from './neutral.js';
import { PLANT_CARDS } from './plants.js';
import { STANDARD_CUTS, STANDARD_DUPLICATES } from './standard-cuts.js';
import { isComplete } from './validate.js';
import { VAMPIRE_CARDS } from './vampires.js';

registerCards([...NEUTRAL_CARDS, ...VAMPIRE_CARDS, ...ALIEN_CARDS, ...DINOSAUR_CARDS, ...PLANT_CARDS, ...FUNGUS_CARDS, ...ZOMBIE_CARDS, ...DRAGON_CARDS, ...DEMON_CARDS, ...DIVINE_CARDS, ...ROBOT_CARDS, ...RADIOACTIVE_CARDS, ...BEE_CARDS, ...GHOST_CARDS, ...ULTRATERRESTRIAL_CARDS, ...SHARK_CARDS, ...ACIDIC_CARDS, ...LYCANTHROPE_CARDS, ...VOID_CARDS, ...ICE_AGE_CARDS, ...FRUIT_PIRATE_CARDS, ...FUSION_CARDS]);

// Legendary: the named, one-of-a-kind characters (each set's headliners). They wear the
// gold legendary frame (shared.js). A Lycanthrope's Beast Form is legendary with it.
export const LEGENDARY = new Set([
  'the_crimson_king',
  'queen_of_the_red_veil',
  'overmind_xalat',
  'hive_queen_xaral',
  'the_overgrowth',
  'titan_arum',
  'the_spore_queen',
  'the_rot_king',
  'tarman',
  'the_outbreak',
  'la_brea_the_tar_pit_mammoth',
  'the_worldflame',
  'glacius_the_winter_queen',
  'the_world_eater',
  'bael_first_king_of_hell',
  'asmoday_king_of_greed',
  'beleth_king_of_wrath',
  'paimon_king_of_secrets',
  'the_first_light',
  'dawnbreaker_the_cleansing_sun',
  'colossus_prime',
  'giant_death_laser',
  'sky_piercer_drill_unit',
  'slimungous_the_acid_hydra',
  'ogrus_kamikaze_trooper',
  'the_elephants_foot',
  'ground_zero',
  'the_irradiated_genius',
  'the_hornet_empress',
  'the_unburied_king',
  'the_hollow_knight',
  'the_unplaceable',
  'the_teacher_beyond',
  'king_of_the_red_wake',
  'the_great_dissolution',
  'the_undigested_king',
  'the_first_beast',
  'sobek_terror_of_the_museum',
  'sobeks_fossil',
  'king_meg_the_apex_predator',
  'tremor_the_dunes_quake',
  'baphomet_king_of_the_sabbath',
  'lilith_queen_of_the_night',
  'satan_lord_of_the_pit',
  'elder_of_the_first_moon',
  'the_qu_shapers_of_worlds',
  'varkhul_the_crimson_maw',
  'malgrath_the_bloodmoon_behemoth',
  'nyxara_the_crimson_nightstalker',
  'nihilax_the_world_eater',
  'gargantua_the_living_singularity',
  'nessira_wyrm_of_the_deep_loch',
  'nidhoggr_the_stormfrost_wyrm',
  'the_fourfold_hydra',
  'bull_ceratosaurus',
  'female_ceratosaurus',
  'grog_the_neanderthal_chieftain',
  'old_tusker_the_herd_mother',
  'una_the_glacier_keeper',
  'kalak_the_thousand_year_mammoth',
  'rubber_captain_ruddy',
  'ruddy_steam_gear',
  'ruddy_titan_gear',
  'ruddy_bounce_gear',
  'ruddy_dawn_gear',
  'old_quakebeard',
]);
for (const c of allCards()) if (LEGENDARY.has(c.id) || LEGENDARY.has(c.humanForm)) c.legendary = true;
// How many copies of a card a deck may hold: legendaries are one of a kind (like Hearthstone).
export const copyLimit = (id) => (allCards().find((c) => c.id === id)?.legendary ? 1 : DEFAULT_RULES.maxCopies);

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
    // A lineup that is mostly expansion cards (Hive Brood) runs out of standard cards to cut:
    // its most expensive expansion cards go next (Legendaries last), so the half still comes to the right size.
    const more = lineup.filter((id) => !cut.includes(id) && !FACTION_LISTS[f].includes(id))
      .sort((a, b) => LEGENDARY.has(a) - LEGENDARY.has(b) || costOf(b) - costOf(a));
    return [...cut, ...[...spare, ...more].slice(0, Math.max(0, per - cut.length))];
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
  const fixed = (STANDARD_DUPLICATES[faction] ?? []).filter((id) => lineup.includes(id) && copyLimit(id) > 1);
  if (STANDARD_DUPLICATES[faction] && fixed.length === STANDARD_DUPLICATES[faction].length) return STANDARD_DUPLICATES[faction];
  const cut = new Set(STANDARD_CUTS[faction] ?? []);
  const rest = lineup.filter((id) => !cut.has(id) && !fixed.includes(id) && copyLimit(id) > 1)
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
