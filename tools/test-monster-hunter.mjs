// Rules tests for Monster Hunter weapons.
//   node tools/test-monster-hunter.mjs

import { buildDeck } from '../src/cards/index.js';
import { addToHand, summonMinion } from '../src/engine/core.js';
import { applyAction, createGame, getLegalActions } from '../src/engine/engine.js';

let s, failures = 0, passed = 0;
function fresh() {
  const fa = ['Monster Hunter', 'Divine'], fb = ['Vampires', 'Robots'];
  s = createGame({ seed: 7, rules: { mulligan: false, secondPlayerPotions: false, openingHandHelp: false }, players: [{ name: 'A', factions: fa, deck: buildDeck(fa) }, { name: 'B', factions: fb, deck: buildDeck(fb) }] });
  for (const p of s.players) { p.hand = []; p.mana.max = 10; p.mana.current = 10; p.mana.primal = 0; p.mana.base = 10; }
  s.activePlayer = 0;
}
const pl = (p) => s.players[p];
const hero = (p) => pl(p).hero;
const put = (p, id) => { const m = summonMinion(s, p, id); m.sick = false; return m; };
function settle() {
  for (let i = 0; i < 60 && s.pending; i++) {
    if (s.pending.type === 'reaction') applyAction(s, { type: 'pass', player: s.pending.player });
    else if (s.pending.type === 'choice') applyAction(s, { type: 'choose', player: s.pending.player, index: 0 });
    else break;
  }
}
const play = (p, id) => { const inst = addToHand(s, p, id); applyAction(s, { type: 'play', player: p, card: inst.uid }); settle(); };
const canAttack = (a, d) => getLegalActions(s).some((x) => x.type === 'attack' && x.attacker === a && x.defender === d);
const attack = (a, d) => { applyAction(s, { type: 'attack', player: 0, attacker: a, defender: d }); settle(); };
function test(name, fn) {
  fresh();
  try { const r = fn(); if (r) { failures++; console.log(`FAIL ${name}: ${r}`); } else { passed++; console.log(`ok   ${name}`); } }
  catch (e) { failures++; console.log(`FAIL ${name}: ${e.stack.split('\n').slice(0, 3).join(' | ')}`); }
}

test('Hidden Hand Cannon can shoot an enemy minion as well as the enemy Hero', () => {
  const foe = put(1, 'scrapper_spider'); // no Taunt, so the Hero is a legal target too
  foe.keywords = [];
  play(0, 'hidden_hand_cannon');
  if (!canAttack(hero(0).uid, foe.uid)) return 'cannot target the minion';
  if (!canAttack(hero(0).uid, hero(1).uid)) return 'cannot target the Hero';
  attack(hero(0).uid, foe.uid);
  if (pl(1).board.some((m) => m.uid === foe.uid)) return 'minion survived a 7-Attack shot';
});

test('Cross-Hilt Longsword: +3 Attack against Vampires (4 + 3 = 7 damage)', () => {
  const foe = put(1, 'vampire_gargoyle');
  foe.health = foe.maxHealth = 20;
  play(0, 'cross_hilt_longsword');
  attack(hero(0).uid, foe.uid);
  if (foe.health !== 13) return `vampire at ${foe.health}/20 (wanted 13)`;
});

test('Cross-Hilt Longsword: no bonus against a non-Vampire', () => {
  const foe = put(1, 'scrapper_spider');
  foe.health = foe.maxHealth = 20;
  play(0, 'cross_hilt_longsword');
  attack(hero(0).uid, foe.uid);
  if (foe.health !== 16) return `robot at ${foe.health}/20 (wanted 16)`;
});

console.log(`\n${passed} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
