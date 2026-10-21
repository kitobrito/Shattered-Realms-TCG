// Every faction (and a sample of pairs) has a legal Classic deck, and a legal Expansion deck
// that holds the expansion's cards.
//   node tools/test-premade.mjs

import { PLAYABLE_FACTIONS } from '../src/cards/index.js';
import { deckProblem } from '../src/cards/deck-check.js';
import { expansionCards, premadeDecks } from '../src/cards/premade-decks.js';
import { getCard } from '../src/engine/registry.js';

let failures = 0, passed = 0;
function test(name, fn) { try { const r = fn(); if (r) { failures++; console.log(`FAIL ${name}: ${r}`); } else { passed++; console.log(`ok   ${name}`); } } catch (e) { failures++; console.log(`FAIL ${name}: ${e.stack.split('\n')[0]}`); } }

for (const f of PLAYABLE_FACTIONS) {
  test(`${f}: Classic and Expansion decks are legal`, () => {
    const ds = premadeDecks([f]);
    if (ds.length !== 2) return `${ds.length} decks`;
    for (const d of ds) { const p = deckProblem([f], d.deck); if (p) return `${d.name}: ${p}`; }
    if (ds[0].deck.some((id) => getCard(id).extra)) return 'Classic holds expansion cards';
    const ex = ds[1].deck;
    const missing = expansionCards(f).filter((id) => !ex.includes(id));
    if (missing.length) return `Expansion deck is missing ${missing.join(', ')}`;
  });
}
for (let i = 0; i + 1 < PLAYABLE_FACTIONS.length; i += 2) {
  const pair = [PLAYABLE_FACTIONS[i], PLAYABLE_FACTIONS[i + 1]];
  test(`${pair.join(' + ')}: both pair decks are legal`, () => {
    for (const d of premadeDecks(pair)) { const p = deckProblem(pair, d.deck); if (p) return `${d.name}: ${p}`; }
  });
}

console.log(`\n${passed} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
