// Rules tests for Tremor, the Dunes Quake (legendary Sand Shark): Aftershocks.
//   node tools/test-tremor.mjs

import { buildDeck } from '../src/cards/index.js';
import { summonMinion } from '../src/engine/core.js';
import { applyAction, createGame } from '../src/engine/engine.js';
import { getCard } from '../src/engine/registry.js';

let s, failures = 0, passed = 0;
function fresh() {
  const fa = ['Sharks', 'Vampires'], fb = ['Robots', 'Ghosts'];
  s = createGame({ seed: 3, rules: { mulligan: false, secondPlayerPotions: false, openingHandHelp: false },
    players: [{ name: 'A', factions: fa, deck: buildDeck(fa) }, { name: 'B', factions: fb, deck: buildDeck(fb) }] });
  for (const p of s.players) { p.hand = []; p.mana.max = 10; p.mana.current = 10; p.mana.primal = 0; p.mana.base = 10; }
}
const settle = () => { for (let i = 0; i < 50 && s.pending; i++) applyAction(s, s.pending.type === 'reaction' ? { type: 'pass', player: s.pending.player } : { type: 'choose', player: s.pending.player, index: 0 }); };
const endTurn = () => { applyAction(s, { type: 'endTurn', player: s.activePlayer }); settle(); };
const blank = (p, atk, hp) => { const m = summonMinion(s, p, 'forge_drone'); m.sick = false; m.keywords = []; m.attack = atk; m.health = hp; m.maxHealth = hp; return m; };
const burrowed = (id) => { const m = summonMinion(s, 0, id); m.burrowed = true; return m; };
// Ends player 0's turn and the enemy's, so player 0's Burrowed minions Surface.
const nextRound = () => { endTurn(); endTurn(); };
function test(name, fn) { fresh(); try { const r = fn(); if (r) { failures++; console.log(`FAIL ${name}: ${r}`); } else { passed++; console.log(`ok   ${name}`); } } catch (e) { failures++; console.log(`FAIL ${name}: ${e.stack.split('\n')[0]}`); } }

test('Tremor exists: legendary 8-Mana 6/8 Burrow Shark', () => {
  const c = getCard('tremor_the_dunes_quake');
  if (!c.legendary || c.cost !== 8 || c.attack !== 6 || c.health !== 8 || !c.keywords.includes('Burrow')) return JSON.stringify(c);
});
test('Surfacing alone: 2 damage to every enemy minion, once', () => {
  burrowed('tremor_the_dunes_quake'); const e = blank(1, 1, 9);
  nextRound();
  if (e.health !== 7) return `enemy at ${e.health}`;
});
test('Two other minions Surface with it: the quake hits three times', () => {
  const t = burrowed('tremor_the_dunes_quake'); burrowed('sand_pup'); burrowed('sand_pup'); const e = blank(1, 1, 9);
  nextRound();
  if (t.burrowed) return 'Tremor did not Surface';
  if (e.health !== 3) return `enemy at ${e.health}`;
});
test('Its own Surface does not count as another', () => {
  burrowed('tremor_the_dunes_quake'); const e = blank(1, 1, 20); const mine = blank(0, 1, 9);
  nextRound();
  if (e.health !== 18 || mine.health !== 9) return `${e.health} ${mine.health}`;
});

console.log(`\n${passed} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
