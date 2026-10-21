// Rules tests for the Descent (Demons, Circles of Hell) and its legendaries.
//   node tools/test-descent.mjs

import { buildDeck, FACTION_POOLS } from '../src/cards/index.js';
import { isComplete } from '../src/cards/validate.js';
import { addDescent, addToHand, costOf, effectiveAttack, loseHealth, summonMinion } from '../src/engine/core.js';
import { applyAction, createGame, getLegalActions } from '../src/engine/engine.js';
import { getCard } from '../src/engine/registry.js';
import { ART } from '../src/cards/art-manifest.js';
import { existsSync } from 'node:fs';

let s, failures = 0, passed = 0;
function fresh(fa = ['Demons', 'Vampires'], fb = ['Robots', 'Ghosts']) {
  s = createGame({ seed: 3, rules: { mulligan: false, secondPlayerPotions: false, openingHandHelp: false },
    players: [{ name: 'A', factions: fa, deck: buildDeck(fa) }, { name: 'B', factions: fb, deck: buildDeck(fb) }] });
  for (const p of s.players) { p.hand = []; p.mana.max = 10; p.mana.current = 10; p.mana.primal = 0; p.mana.base = 10; }
}
const pl = (p) => s.players[p];
const settle = () => { for (let i = 0; i < 50 && s.pending; i++) applyAction(s, s.pending.type === 'reaction' ? { type: 'pass', player: s.pending.player } : { type: 'choose', player: s.pending.player, index: 0 }); };
const endTurn = () => { applyAction(s, { type: 'endTurn', player: s.activePlayer }); settle(); };
const play = (p, inst, target) => { applyAction(s, { type: 'play', player: p, card: inst.uid, target }); settle(); };
const blank = (p, atk, hp) => { const m = summonMinion(s, p, 'forge_drone'); m.sick = false; m.keywords = []; m.attack = atk; m.health = hp; m.maxHealth = hp; return m; };
const sinkTo = (d) => { while (s.descent.depth < d) addDescent(s, s.descent.need - s.descent.points); };
const refill = (p) => { pl(p).mana.current = 10; };
function test(name, fn, factions) { fresh(...(factions ?? [])); try { const r = fn(); if (r) { failures++; console.log(`FAIL ${name}: ${r}`); } else { passed++; console.log(`ok   ${name}`); } } catch (e) { failures++; console.log(`FAIL ${name}: ${e.stack.split('\n')[0]}`); } }

test('No Demon player: no Descent', () => { if (s.descent) return 'started'; addDescent(s, 50); if (s.descent) return 'started late'; }, [['Robots', 'Ghosts'], ['Vampires', 'Bees']]);
test('A Demon player starts the Descent at the surface, 6 points a circle', () => {
  if (!s.descent || s.descent.depth !== 0 || s.descent.need !== 6) return JSON.stringify(s.descent);
});
test('Two Demon players: twice the points per circle', () => { if (s.descent.need !== 12) return s.descent.need; }, [['Demons', 'Vampires'], ['Demons', 'Ghosts']]);
test('Health a Demon player pays counts; other Health loss does not', () => {
  loseHealth(s, pl(0).hero.uid, 3); // paid
  loseHealth(s, pl(0).hero.uid, 2, { paid: false });
  loseHealth(s, pl(1).hero.uid, 4); // the non-Demon pays
  if (s.descent.points !== 3) return `points ${s.descent.points}`;
});
test('Every minion death counts, on either side', () => {
  const a = blank(0, 1, 1), b = blank(1, 1, 1);
  a.destroyed = true; b.destroyed = true;
  endTurn();
  if (s.descent.points !== 2) return `points ${s.descent.points}`;
});
test('Six points sink one circle, and the extra carries over', () => {
  addDescent(s, 8);
  if (s.descent.depth !== 1 || s.descent.points !== 2) return JSON.stringify(s.descent);
  if (!s.log.some((l) => l.msg.includes('First Circle: Limbo'))) return 'no log line';
});
test('Seven circles at most', () => { addDescent(s, 500); if (s.descent.depth !== 7 || s.descent.points !== 0) return JSON.stringify(s.descent); });

test('I Limbo: Hero Spells cost 1 more (both players)', () => {
  sinkTo(1);
  const hs = getLegalActions(s, 0).filter((a) => a.type === 'heroSpell');
  const c = getCard(pl(0).heroSpells[0].cardId);
  pl(0).mana.current = c.cost;
  if (getLegalActions(s, 0).some((a) => a.type === 'heroSpell' && a.card === c.id)) return 'castable at printed cost';
  if (!hs.length) return 'no hero spell at 10 mana';
});
test('II Lust: minions cost 1 less, for both players', () => {
  sinkTo(2);
  const a = addToHand(s, 0, 'imp'), b = addToHand(s, 1, 'forge_drone');
  if (costOf(s, a) !== getCard('imp').cost - 1 || costOf(s, b) !== getCard('forge_drone').cost - 1) return `${costOf(s, a)} ${costOf(s, b)}`;
});
test('III Gluttony: an extra card each turn, hand limit 7', () => {
  sinkTo(3);
  pl(1).hand = [];
  endTurn();
  if (pl(1).hand.length !== 2) return `drew ${pl(1).hand.length}`;
  for (let i = 0; i < 8; i++) addToHand(s, 1, 'forge_drone');
  if (pl(1).hand.length !== 7) return `hand ${pl(1).hand.length}`;
});
test('IV Greed: spells cost 1 less; casting one costs 1 Health, which does not sink further', () => {
  sinkTo(4);
  const sp = addToHand(s, 0, 'hellfire_decree');
  if (costOf(s, sp) !== getCard('hellfire_decree').cost - 1) return `cost ${costOf(s, sp)}`;
  const trap = addToHand(s, 0, 'royal_tax');
  if (costOf(s, trap) !== getCard('royal_tax').cost) return 'traps are not spells';
  const pts = s.descent.points;
  const hp = pl(0).hero.health;
  refill(0);
  play(0, addToHand(s, 0, 'infernal_contract'));
  if (pl(0).hero.health > hp - 1) return `health ${hp} -> ${pl(0).hero.health}`;
  if (s.descent.depth !== 4) return `depth ${s.descent.depth} pts ${pts}->${s.descent.points}`;
});
test('V Wrath: all minions +1 Attack', () => {
  const a = blank(0, 2, 5), b = blank(1, 3, 5);
  sinkTo(5); endTurn();
  if (effectiveAttack(a) !== 3 || effectiveAttack(b) !== 4) return `${effectiveAttack(a)} ${effectiveAttack(b)}`;
});
test('VI Heresy: 1 damage to all minions at the end of each turn', () => {
  sinkTo(6);
  const a = blank(0, 1, 5), b = blank(1, 1, 5);
  endTurn();
  if (a.health !== 4 || b.health !== 4) return `${a.health} ${b.health}`;
});
test('VII Violence: Demon minions cost 2 less, others do not', () => {
  sinkTo(7);
  const d = addToHand(s, 0, 'pit_lord'), r = addToHand(s, 1, 'forge_drone');
  if (costOf(s, d) !== getCard('pit_lord').cost - 2 || costOf(s, r) !== getCard('forge_drone').cost) return `${costOf(s, d)} ${costOf(s, r)}`;
});

test('The new legendaries exist, are legendary and have art', () => {
  for (const id of ['baphomet_king_of_the_sabbath', 'lilith_queen_of_the_night', 'satan_lord_of_the_pit', 'lilim']) {
    const c = getCard(id);
    if (!ART[id] || !existsSync(ART[id])) return `${id} no art`;
    if (id !== 'lilim' && !c.legendary) return `${id} not legendary`;
  }
});
test('The new legendaries pass the card checker and are in the Demons pool', () => {
  for (const id of ['baphomet_king_of_the_sabbath', 'lilith_queen_of_the_night', 'satan_lord_of_the_pit']) {
    if (!isComplete(getCard(id))) return `${id} incomplete`;
    if (!FACTION_POOLS.Demons.includes(id)) return `${id} not in the pool`;
  }
});
test('Baphomet: Arrival sinks one circle; your other minions get +1 Attack per circle', () => {
  const m = blank(0, 2, 5); const e = blank(1, 2, 5);
  sinkTo(1);
  play(0, addToHand(s, 0, 'baphomet_king_of_the_sabbath'));
  if (s.descent.depth !== 2) return `depth ${s.descent.depth}`;
  if (effectiveAttack(m) !== 4 || effectiveAttack(e) !== 2) return `${effectiveAttack(m)} ${effectiveAttack(e)}`;
});
test('Lilith: one Lilim per circle at the end of your turn (up to 3)', () => {
  sinkTo(5);
  play(0, addToHand(s, 0, 'lilith_queen_of_the_night'));
  endTurn();
  const lilim = pl(0).board.filter((m) => m.cardId === 'lilim').length;
  if (lilim !== 3) return `${lilim} Lilim`;
});
test('Satan: costs 1 less per circle; destroys all other minions', () => {
  sinkTo(3);
  const sat = addToHand(s, 0, 'satan_lord_of_the_pit');
  if (costOf(s, sat) !== 7) return `cost ${costOf(s, sat)}`;
  blank(0, 1, 9); blank(1, 1, 9);
  const hp = pl(1).hero.health;
  play(0, sat);
  const others = [...pl(0).board, ...pl(1).board].filter((m) => m.cardId !== 'satan_lord_of_the_pit');
  if (others.length) return `${others.length} survived`;
  if (pl(1).hero.health !== hp) return 'judgement fired above the 7th circle';
});
test('Satan in the Seventh Circle: the enemy Hero loses half their Health', () => {
  sinkTo(7);
  pl(1).hero.health = 25;
  play(0, addToHand(s, 0, 'satan_lord_of_the_pit'));
  if (pl(1).hero.health !== 13) return `health ${pl(1).hero.health}`;
});

console.log(`\n${passed} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
