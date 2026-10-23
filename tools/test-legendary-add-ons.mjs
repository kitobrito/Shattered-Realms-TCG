// Rules tests for the legendary add-ons: Giant Death Laser, Sky Piercer Drill Unit (Robots),
// Slimungous, the Acid Hydra (Acidic), Ogrus, Kamikaze Trooper and The Elephant's Foot (Radioactive).
//   node tools/test-legendary-add-ons.mjs

import { buildDeck } from '../src/cards/index.js';
import { addToHand, effectiveAttack, hasKeyword, radiationOf, summonMinion } from '../src/engine/core.js';
import { applyAction, createGame, getLegalActions } from '../src/engine/engine.js';
import { getCard } from '../src/engine/registry.js';
import { ART } from '../src/cards/art-manifest.js';
import { existsSync } from 'node:fs';

let s;
let failures = 0;
let passed = 0;
function fresh(fa) {
  const fb = ['Dragons', 'Vampires'];
  const players = [{ name: 'A', factions: fa, deck: buildDeck(fa) }, { name: 'B', factions: fb, deck: buildDeck(fb) }];
  s = createGame({ seed: 7, rules: { mulligan: false, secondPlayerPotions: false, openingHandHelp: false }, players });
  for (const p of s.players) { p.hand = []; p.traps = []; p.mana.max = 10; p.mana.current = 10; p.mana.primal = 0; p.mana.base = 10; }
}
const pl = (p) => s.players[p];
const put = (p, id) => { const m = summonMinion(s, p, id); m.sick = false; return m; };
const blank = (p, atk, hp) => { const m = put(p, 'vampire_gargoyle'); m.keywords = []; m.attack = atk; m.health = hp; m.maxHealth = hp; return m; };
const hero = (p) => pl(p).hero;
function settle() {
  for (let i = 0; i < 50 && s.pending; i++) {
    if (s.pending.type === 'reaction') applyAction(s, { type: 'pass', player: s.pending.player });
    else if (s.pending.type === 'choice') applyAction(s, { type: 'choose', player: s.pending.player, index: 0 });
    else break;
  }
}
function play(p, id, target) { const c = addToHand(s, p, id); applyAction(s, { type: 'play', player: p, card: c.uid, ...(target != null ? { target } : {}) }); settle(); }
function attack(p, attacker, defender) { applyAction(s, { type: 'attack', player: p, attacker, defender }); settle(); }
function endTurn() { applyAction(s, { type: 'endTurn', player: s.activePlayer }); settle(); }
function test(name, fa, fn) {
  fresh(fa);
  try { const r = fn(); if (r) { failures++; console.log(`FAIL ${name}: ${r}`); } else { passed++; console.log(`ok   ${name}`); } }
  catch (e) { failures++; console.log(`FAIL ${name}: ${e.stack.split('\n').slice(0, 3).join(' | ')}`); }
}
const IDS = ['giant_death_laser', 'sky_piercer_drill_unit', 'slimungous_the_acid_hydra', 'ogrus_kamikaze_trooper', 'the_elephants_foot'];

test('all five are legendary expansion cards with art', ['Robots'], () => {
  for (const id of IDS) {
    const c = getCard(id);
    if (!c?.legendary || !c.extra) return `${id} legendary ${c?.legendary} extra ${c?.extra}`;
    if (!ART[id] || !existsSync(ART[id])) return `no art for ${id}`;
  }
});

test('Giant Death Laser deals 9 to a minion or the enemy Hero', ['Robots'], () => {
  const e = blank(1, 1, 12);
  play(0, 'giant_death_laser', e.uid);
  if (e.health !== 3) return `minion at ${e.health}`;
  pl(0).mana.current = 10;
  play(0, 'giant_death_laser', hero(1).uid);
  if (hero(1).health !== 21) return `hero at ${hero(1).health}`;
});

test('Sky Piercer hits the enemy Hero for 12, a minion for 6', ['Robots'], () => {
  const d = put(0, 'sky_piercer_drill_unit');
  attack(0, d.uid, hero(1).uid);
  if (hero(1).health !== 18) return `hero at ${hero(1).health}`;
  const e = blank(1, 0, 20);
  d.attacksThisTurn = 0;
  attack(0, d.uid, e.uid);
  if (e.health !== 14) return `minion at ${e.health}`;
});

test('Slimungous corrodes two different enemy minions by 2 at the end of your turn', ['Acidic'], () => {
  const a = blank(1, 5, 9), b = blank(1, 5, 9);
  put(0, 'slimungous_the_acid_hydra');
  endTurn();
  if (effectiveAttack(a) !== 3 || effectiveAttack(b) !== 3) return `${effectiveAttack(a)} / ${effectiveAttack(b)}`;
  if (!hasKeyword(pl(0).board[0], 'Acid Hide')) return 'no Acid Hide';
});

test('Ogrus attacks, explodes, and blasts and irradiates every enemy', ['Radioactive'], () => {
  const e1 = blank(1, 1, 10), e2 = blank(1, 1, 10);
  play(0, 'ogrus_kamikaze_trooper');
  const o = pl(0).board.find((m) => m.cardId === 'ogrus_kamikaze_trooper');
  if (!getLegalActions(s).some((a) => a.type === 'attack' && a.attacker === o.uid)) return 'Rush did not let him attack';
  attack(0, o.uid, e1.uid);
  if (pl(0).board.some((m) => m.cardId === 'ogrus_kamikaze_trooper')) return 'Ogrus survived';
  if (radiationOf(e2) !== 1 || radiationOf(hero(1)) !== 1) return `radiation ${radiationOf(e2)} / ${radiationOf(hero(1))}`;
  if (hero(1).health > 30 - 3) return `hero at ${hero(1).health}`;
  if (e1.health > 10 - 5 - 3) return `target at ${e1.health}`;
});

test("The Elephant's Foot: Radiation 3, Taunt, can't attack; shrinks everything else", ['Radioactive'], () => {
  const mine = blank(0, 1, 5), theirs = blank(1, 1, 2);
  play(0, 'the_elephants_foot');
  const f = pl(0).board.find((m) => m.cardId === 'the_elephants_foot');
  if (radiationOf(f) !== 3) return `radiation ${radiationOf(f)}`;
  if (!hasKeyword(f, 'Taunt')) return 'no Taunt';
  endTurn(); endTurn();
  if (getLegalActions(s).some((a) => a.type === 'attack' && a.attacker === f.uid)) return 'it could attack';
  if (pl(1).board.includes(theirs) && theirs.health > 0) return `enemy 2-Health minion survived (${theirs.health})`;
  if (!pl(0).board.includes(mine)) return 'my 5-Health minion died';
});

console.log(`\n${passed} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
