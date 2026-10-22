// Is this a legal deck for these factions? Used wherever a deck arrives from
// someone else (the online server, the room-code host), so nobody can bring a
// deck they couldn't build in the game.
import { DEFAULT_RULES } from '../engine/rules.js';
import { getCard } from '../engine/registry.js';
import { FACTION_POOLS, PLAYABLE_FACTIONS, copyLimit } from './index.js';

// Too many copies of some card: more than 2, or a second copy of a legendary.
function copiesProblem(deck) {
  const counts = {};
  for (const id of deck) counts[id] = (counts[id] ?? 0) + 1;
  if (Object.values(counts).some((n) => n > DEFAULT_RULES.maxCopies)) return `No more than ${DEFAULT_RULES.maxCopies} copies of a card.`;
  const legend = Object.keys(counts).find((id) => counts[id] > copyLimit(id));
  return legend ? `Only 1 copy of a legendary card (${getCard(legend)?.name ?? legend}).` : null;
}

// Two-faction deck rules: exactly 40 cards, at least 10 from each faction, up to 2 copies of a card
// (1 of a legendary).
export function pairDeckProblem(factions, deck) {
  const copies = copiesProblem(deck);
  if (copies) return copies;
  for (const f of factions) {
    const n = deck.filter((id) => getCard(id)?.faction === f).length;
    if (n < DEFAULT_RULES.minPerFaction) return `At least ${DEFAULT_RULES.minPerFaction} ${f} cards (you have ${n}).`;
  }
  if (deck.length !== DEFAULT_RULES.pairDeckSize) return `Exactly ${DEFAULT_RULES.pairDeckSize} cards (you have ${deck.length}).`;
  return null;
}

// One-faction deck rules: exactly 30 cards from that faction, up to 2 copies of a card (1 of a legendary).
export function singleDeckProblem(faction, deck) {
  const copies = copiesProblem(deck);
  if (copies) return copies;
  if (deck.some((id) => getCard(id)?.faction !== faction)) return `Only ${faction} cards.`;
  if (deck.length !== DEFAULT_RULES.singleDeckSize) return `Exactly ${DEFAULT_RULES.singleDeckSize} cards (you have ${deck.length}).`;
  return null;
}
// The deck rules for either format.
export const deckProblem = (factions, deck) => (factions.length === 1 ? singleDeckProblem(factions[0], deck) : pairDeckProblem(factions, deck));

export function checkDeck({ format, factions, deck }) {
  format = format === 'single' ? 'single' : 'pair';
  factions = Array.isArray(factions) ? factions.map(String) : [];
  const need = format === 'single' ? 1 : 2;
  if (factions.length !== need || new Set(factions).size !== need || !factions.every((f) => PLAYABLE_FACTIONS.includes(f))) {
    return { error: 'Pick your factions first.' };
  }
  deck = Array.isArray(deck) ? deck.map(String) : [];
  const pool = new Set(factions.flatMap((f) => FACTION_POOLS[f]));
  const bad = { error: 'That deck is not a legal deck. Reset it to the recommended deck and try again.' };
  if (!deck.every((id) => pool.has(id))) return bad;
  if (format === 'pair') return pairDeckProblem(factions, deck) ? bad : { format, factions, deck };
  return singleDeckProblem(factions[0], deck) ? bad : { format, factions, deck };
}
