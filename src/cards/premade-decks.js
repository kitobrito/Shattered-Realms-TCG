// Premade decks (like Hearthstone's starter decks): two ready-to-play decks for every faction
// and faction pair. The Classic deck uses only the faction's standard cards; the Expansion
// deck builds around that faction's expansion cards (which start locked; see ui/unlocks.js).
//
// One faction (30 cards): Classic is the recommended 30. Expansion is every expansion card
// plus the standard cards the standard cut keeps, trimmed (most expensive standard cards out
// first) or topped up (cheapest standard cuts back in) to 30.
// Two factions (40 cards): each faction's half is built the same way, then cut to 20.

import { DEFAULT_RULES } from '../engine/rules.js';
import { getCard } from '../engine/registry.js';
import { EXPANSION_NAMES } from './faction-info.js';
import { FACTION_DECKS, FACTION_LISTS, FACTION_POOLS, buildDeck, buildSingleDeck } from './index.js';
import { STANDARD_CUTS } from './standard-cuts.js';

// Each faction's Classic deck name (the Expansion deck is named after its expansion).
export const CLASSIC_DECK_NAMES = {
  Vampires: 'Blood Court', Aliens: 'First Contact', Dinosaurs: 'Primal Rampage', Plants: 'Verdant Wall',
  Fungus: 'Spore Circle', Zombies: 'Shambling Horde', Dragons: 'Dragonfire', Demons: 'Infernal Pact',
  Divine: 'Holy Vanguard', Robots: 'Assembly Line', Radioactive: 'Fallout', Bees: 'The Hive',
  Ghosts: 'Haunted Halls', Ultraterrestrials: 'Beyond the Stars', Sharks: 'The Red Wake', Acidic: 'Corrosion Court',
  Lycanthropes: 'Full Moon',
};

const cost = (id) => getCard(id).cost;
export const expansionCards = (f) => (FACTION_POOLS[f] ?? []).filter((id) => !(FACTION_LISTS[f] ?? []).includes(id));

// Hand-tuned Expansion decks (from sims vs every Classic deck): standard cards swapped out
// (`out`) for others (`in`), one for one, to land near a 50% win rate.
export const EXPANSION_TUNING = {
  // 70% untuned: its cheapest standard cards made it too fast. Slower, swingier picks in.
  Demons: { out: ['pit_lord', 'infernal_ravager', 'blood_pact', 'unholy_empowerment', 'abyssal_brute'],
    in: ['soul_collector', 'dread_summoner', 'doom_herald', 'soul_snare', 'blood_price'] },
  Dragons: { out: ['dragons_breath', 'magma_behemoth', 'furnace_dragon', 'ashen_tyrant'],
    in: ['cinder_drake', 'charcoal_drake', 'ashen_curse', 'firebreak'] },
  Ultraterrestrials: { out: ['phase_skitter', 'scale_paradox', 'observer_outside_time', 'phase_jelly', 'rift_hunter'],
    in: ['riftling', 'temporal_reversal', 'paradox_mine', 'spatial_redirection', 'borrowed_seconds'] },
  // 34% untuned: its weakest standard cards out, its best big minions back in.
  Aliens: { out: ['abduction_ray', 'experimental_containment', 'probe_drone', 'ufo_interception', 'alien_tripwire'],
    in: ['overmind_xalat', 'subjugator_drone', 'mind_control_beam', 'gene_thief_operative', 'qu_bio_engineer'] },
};

// A faction's 30 different cards built around its expansion.
export function expansionLineup(f) {
  const t = EXPANSION_TUNING[f];
  const auto = autoExpansionLineup(f);
  if (!t) return auto;
  const out = new Set(t.out.filter((id) => auto.includes(id)));
  const add = t.in.filter((id) => !auto.includes(id) && FACTION_DECKS[f].includes(id)).slice(0, out.size);
  return add.length === out.size ? [...auto.filter((id) => !out.has(id)), ...add] : auto;
}

function autoExpansionLineup(f) {
  const size = FACTION_DECKS[f].length;
  const extras = expansionCards(f);
  const cut = new Set(STANDARD_CUTS[f] ?? []);
  const kept = FACTION_DECKS[f].filter((id) => !cut.has(id));
  const room = Math.max(0, size - extras.length);
  // Too many standard cards: drop the most expensive. Too few: the cheapest cut cards come back.
  const base = kept.length > room
    ? [...kept].sort((a, b) => cost(a) - cost(b)).slice(0, room)
    : [...kept, ...[...cut].filter((id) => FACTION_DECKS[f].includes(id)).sort((a, b) => cost(a) - cost(b)).slice(0, room - kept.length)];
  return [...extras.slice(0, size), ...base];
}

const expansionDeck = (factions) => (factions.length === 1
  ? buildSingleDeck(factions[0], { [factions[0]]: expansionLineup(factions[0]) })
  : buildDeck(factions, undefined, Object.fromEntries(factions.map((f) => [f, expansionLineup(f)]))));

// The premade decks for these factions: [{ key, name, blurb, deck }], Classic first.
export function premadeDecks(factions) {
  const out = [{
    key: 'classic',
    name: factions.map((f) => CLASSIC_DECK_NAMES[f] ?? f).join(' + '),
    blurb: 'Classic deck: standard cards only.',
    deck: factions.length === 1 ? buildSingleDeck(factions[0]) : buildDeck(factions),
  }];
  if (factions.every((f) => expansionCards(f).length)) {
    out.push({
      key: 'expansion',
      name: factions.map((f) => EXPANSION_NAMES[f] ?? `${f} Expansion`).join(' + '),
      blurb: 'Expansion deck: built around the expansion cards.',
      deck: expansionDeck(factions),
    });
  }
  const size = factions.length === 1 ? DEFAULT_RULES.singleDeckSize : DEFAULT_RULES.pairDeckSize;
  return out.filter((d) => d.deck.length === size);
}
