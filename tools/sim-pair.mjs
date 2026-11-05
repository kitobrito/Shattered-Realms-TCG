// Balance check in the two-faction format: <Realm> paired with each partner (its 40-card pair deck,
// with that pair's Fusion Hero Spell) against random two-faction decks, both sides played by the AI.
//   node tools/sim-pair.mjs <Realm> <games per partner> [Partner,Partner,...]
// Prints each pairing's win rate (seats alternate) and the overall average.
import { buildDeck, PLAYABLE_FACTIONS } from '../src/cards/index.js';
import { applyAction, createGame } from '../src/engine/engine.js';
import { chooseAction } from '../src/ai/smart.js';

const [realm, nArg, only] = process.argv.slice(2);
const N = Number(nArg ?? 8);
const others = PLAYABLE_FACTIONS.filter((f) => f !== realm);
const partners = only ? only.split(',') : others;
const AI = { beam: 3, depth: 4, maxNodes: 160 };

// A fixed, varied opponent for each game: two different realms, neither the tested one.
function opponentPair(i) {
  const a = others[(i * 7) % others.length];
  let b = others[(i * 11 + 3) % others.length];
  if (b === a) b = others[(others.indexOf(a) + 1) % others.length];
  return [a, b];
}
function play(fa, fb, seed) {
  const players = [{ name: 'A', factions: fa, deck: buildDeck(fa) }, { name: 'B', factions: fb, deck: buildDeck(fb) }];
  const s = createGame({ seed, players });
  for (let i = 0; i < 3000 && !s.gameOver; i++) applyAction(s, chooseAction(s, AI));
  return s.gameOver ? s.winner : null;
}
let total = 0, games = 0;
for (const p of partners) {
  let w = 0, n = 0;
  for (let g = 0; g < N; g++) {
    const mine = [realm, p];
    const foe = opponentPair(g + partners.indexOf(p) * N);
    const first = g % 2 === 0;
    const winner = first ? play(mine, foe, 2000 + g) : play(foe, mine, 2000 + g);
    if (winner == null) continue;
    n++;
    if ((first && winner === 0) || (!first && winner === 1)) w++;
  }
  total += w; games += n;
  console.log(`${realm}+${p}: ${w}/${n} (${Math.round((100 * w) / Math.max(1, n))}%)`);
}
console.log(`${realm} pairs overall: ${total}/${games} (${Math.round((100 * total) / Math.max(1, games))}%)`);
