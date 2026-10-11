// Is this a legal deck for these factions? Used wherever a deck arrives from
// someone else (the online server, the room-code host), so nobody can bring a
// deck they couldn't build in the game.
import { buildDeck, buildSingleDeck, FACTION_DECKS, PLAYABLE_FACTIONS } from './index.js';

export function checkDeck({ format, factions, deck }) {
  format = format === 'single' ? 'single' : 'pair';
  factions = Array.isArray(factions) ? factions.map(String) : [];
  const need = format === 'single' ? 1 : 2;
  if (factions.length !== need || new Set(factions).size !== need || !factions.every((f) => PLAYABLE_FACTIONS.includes(f))) {
    return { error: 'Pick your factions first.' };
  }
  deck = Array.isArray(deck) ? deck.map(String) : [];
  const pool = new Set(factions.flatMap((f) => FACTION_DECKS[f]));
  const counts = {};
  for (const id of deck) counts[id] = (counts[id] ?? 0) + 1;
  const size = format === 'single' ? buildSingleDeck(factions[0]).length : buildDeck(factions).length;
  const maxCopies = format === 'single' ? 2 : 1;
  const ok = deck.length === size && deck.every((id) => pool.has(id)) && Object.values(counts).every((n) => n <= maxCopies);
  return ok ? { format, factions, deck } : { error: 'That deck is not a legal deck. Reset it to the standard deck and try again.' };
}
