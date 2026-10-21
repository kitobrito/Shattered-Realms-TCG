// Rules tests for Sobek, Terror of the Museum (legendary Dinosaur): its Arrival, and its Reborn
// bringing it back as Sobek's Fossil at full Health.
//   node tools/test-sobek.mjs

import { buildDeck } from '../src/cards/index.js';
import { addToHand, hasKeyword, summonMinion } from '../src/engine/core.js';
import { applyAction, createGame, getLegalActions } from '../src/engine/engine.js';
import { getCard } from '../src/engine/registry.js';
import { ART } from '../src/cards/art-manifest.js';
import { existsSync } from 'node:fs';

let s, failures = 0, passed = 0;
function fresh() {
  const fa = ['Dinosaurs', 'Vampires'], fb = ['Robots', 'Ghosts'];
  s = createGame({ seed: 3, rules: { mulligan: false, secondPlayerPotions: false, openingHandHelp: false },
    players: [{ name: 'A', factions: fa, deck: buildDeck(fa) }, { name: 'B', factions: fb, deck: buildDeck(fb) }] });
  for (const p of s.players) { p.hand = []; p.mana.max = 10; p.mana.current = 10; p.mana.primal = 0; p.mana.base = 10; }
}
const settle = () => { for (let i = 0; i < 50 && s.pending; i++) applyAction(s, s.pending.type === 'reaction' ? { type: 'pass', player: s.pending.player } : { type: 'choose', player: s.pending.player, index: 0 }); };
const blank = (p, atk, hp) => { const m = summonMinion(s, p, 'forge_drone'); m.sick = false; m.keywords = []; m.attack = atk; m.health = hp; m.maxHealth = hp; return m; };
function test(name, fn) { fresh(); try { const r = fn(); if (r) { failures++; console.log(`FAIL ${name}: ${r}`); } else { passed++; console.log(`ok   ${name}`); } } catch (e) { failures++; console.log(`FAIL ${name}: ${e.stack.split('\n')[0]}`); } }

test('Sobek and its Fossil exist, are legendary and have art', () => {
  for (const id of ['sobek_terror_of_the_museum', 'sobeks_fossil']) {
    const c = getCard(id);
    if (!c.legendary) return `${id} not legendary`;
    if (!ART[id] || !existsSync(ART[id])) return `${id} no art`;
  }
});

test('Arrival: 2 damage to all enemy minions', () => {
  const a = blank(1, 1, 3), b = blank(1, 1, 5);
  applyAction(s, { type: 'play', player: 0, card: addToHand(s, 0, 'sobek_terror_of_the_museum').uid }); settle();
  if (a.health !== 1 || b.health !== 3) return `${a.health} ${b.health}`;
});

test("Reborn: it comes back as Sobek's Fossil at full 5/5 with Rush", () => {
  const m = summonMinion(s, 0, 'sobek_terror_of_the_museum'); m.sick = false;
  s.activePlayer = 1;
  const k = blank(1, 9, 9);
  applyAction(s, { type: 'attack', player: 1, attacker: k.uid, defender: m.uid }); settle();
  const f = s.players[0].board.find((x) => x.cardId === 'sobeks_fossil');
  if (!f) return 'no fossil';
  if (f.attack !== 5 || f.health !== 5 || !hasKeyword(f, 'Rush') || hasKeyword(f, 'Reborn')) return `${f.attack}/${f.health}`;
  if (s.players[0].board.some((x) => x.cardId === 'sobek_terror_of_the_museum')) return 'Sobek came back too';
});

test('Other Reborn minions still return with 1 Health', () => {
  const m = summonMinion(s, 0, 'forge_drone'); m.keywords = ['Reborn']; m.attack = 1; m.health = 4; m.maxHealth = 4;
  s.activePlayer = 1;
  const k = blank(1, 9, 9);
  applyAction(s, { type: 'attack', player: 1, attacker: k.uid, defender: m.uid }); settle();
  const back = s.players[0].board.find((x) => x.cardId === 'forge_drone' && x.uid !== m.uid);
  if (!back || back.health !== 1) return `${back?.health}`;
});

console.log(`\n${passed} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
