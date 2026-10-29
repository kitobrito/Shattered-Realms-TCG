// Balance check: one realm's single-faction deck against others, both sides played by the AI.
//   node tools/sim-realm.mjs <Realm> <games per opponent> [Opponent,Opponent,...]
// SIM_EXPANSION=1 plays <Realm>'s Expansion deck (premade-decks.js) instead of its Classic 30.
// Prints each matchup's win rate for <Realm> (seats alternate) and the overall average.
import { buildSingleDeck, PLAYABLE_FACTIONS } from '../src/cards/index.js';
import { applyAction, createGame } from '../src/engine/engine.js';
import { chooseAction } from '../src/ai/smart.js';
import { getCard } from '../src/engine/registry.js';
import { expansionLineup } from '../src/cards/premade-decks.js';

// Try card changes without editing the cards: SIM_PATCH='{"spark_fry":{"cost":3}}' (shallow merge).
for (const [id, patch] of Object.entries(JSON.parse(process.env.SIM_PATCH ?? '{}'))) Object.assign(getCard(id), patch);

const [realm, nArg, only] = process.argv.slice(2);
const N = Number(nArg ?? 10);
const foes = only ? only.split(',') : PLAYABLE_FACTIONS.filter((f) => f !== realm);
const AI = { beam: 3, depth: 4, maxNodes: 160 };

function play(a, b, seed) {
  const deckOf = (f) => (process.env.SIM_EXPANSION && f === realm ? buildSingleDeck(f, { [f]: expansionLineup(f) }) : buildSingleDeck(f));
  const players = [{ name: a, factions: [a], deck: deckOf(a) }, { name: b, factions: [b], deck: deckOf(b) }];
  const s = createGame({ seed, players });
  for (let i = 0; i < 3000 && !s.gameOver; i++) applyAction(s, chooseAction(s, AI));
  return s.gameOver ? s.winner : null;
}
let total = 0, games = 0;
for (const f of foes) {
  let w = 0, n = 0;
  for (let g = 0; g < N; g++) {
    const first = g % 2 === 0;
    const winner = first ? play(realm, f, 1000 + g) : play(f, realm, 1000 + g);
    if (winner == null) continue;
    n++;
    if ((first && winner === 0) || (!first && winner === 1)) w++;
  }
  total += w; games += n;
  console.log(`${realm} vs ${f}: ${w}/${n} (${Math.round((100 * w) / Math.max(1, n))}%)`);
}
console.log(`${realm} overall: ${total}/${games} (${Math.round((100 * total) / Math.max(1, games))}%)`);
