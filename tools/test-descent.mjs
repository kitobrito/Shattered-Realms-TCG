// Rules tests for the Descent (Demons, Circles of Hell) and its legendaries.
//   node tools/test-descent.mjs

import { buildDeck, FACTION_POOLS } from '../src/cards/index.js';
import { isComplete } from '../src/cards/validate.js';
import { sinkCircles, addToHand, costOf, effectiveAttack, loseHealth, summonMinion } from '../src/engine/core.js';
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
const sinkTo = (d) => { if (s.descent.depth < d) sinkCircles(s, d - s.descent.depth); };
const refill = (p) => { pl(p).mana.current = 10; };
function test(name, fn, factions) { fresh(...(factions ?? [])); try { const r = fn(); if (r) { failures++; console.log(`FAIL ${name}: ${r}`); } else { passed++; console.log(`ok   ${name}`); } } catch (e) { failures++; console.log(`FAIL ${name}: ${e.stack.split('\n')[0]}`); } }

test('No Demon player: no Descent', () => { if (s.descent) return 'started'; sinkCircles(s, 3); if (s.descent) return 'started late'; endTurn(); if (s.descent) return 'started on a turn'; }, [['Robots', 'Ghosts'], ['Vampires', 'Bees']]);
test('A Demon player: round 1 is the First Circle, Limbo', () => {
  if (!s.descent || s.descent.depth !== 1) return JSON.stringify(s.descent);
  if (!s.log.some((l) => l.msg.includes('First Circle: Limbo'))) return 'no log line';
});
test('One circle per round, not per turn', () => {
  endTurn(); // B's turn: still round 1
  if (s.descent.depth !== 1) return `after B: ${s.descent.depth}`;
  endTurn(); // A again: round 2
  if (s.descent.depth !== 2) return `round 2: ${s.descent.depth}`;
  endTurn(); endTurn();
  if (s.descent.depth !== 3) return `round 3: ${s.descent.depth}`;
});
test('Health paid and minion deaths no longer sink the battle', () => {
  loseHealth(s, pl(0).hero.uid, 5);
  const a = blank(0, 1, 1), b = blank(1, 1, 1);
  a.destroyed = true; b.destroyed = true;
  endTurn();
  if (s.descent.depth !== 1) return `depth ${s.descent.depth}`;
});
test('Two Demon players: still one circle a round', () => {
  for (let i = 0; i < 4; i++) endTurn();
  if (s.descent.depth !== 3) return `depth ${s.descent.depth}`;
}, [['Demons', 'Vampires'], ['Demons', 'Ghosts']]);
test('Round 9 is Treachery, and nine circles at most', () => {
  for (let i = 0; i < 16; i++) endTurn();
  if (s.descent.depth !== 9) return `round 9: ${s.descent.depth}`;
  for (let i = 0; i < 6; i++) endTurn();
  if (s.descent.depth !== 9) return `past the bottom: ${s.descent.depth}`;
  if (!s.log.some((l) => l.msg.includes('Ninth Circle: Treachery'))) return 'no log line';
});

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
test('IV Greed: spells cost 1 less; casting one costs 1 Health', () => {
  sinkTo(4);
  const sp = addToHand(s, 0, 'hellfire_decree');
  if (costOf(s, sp) !== getCard('hellfire_decree').cost - 1) return `cost ${costOf(s, sp)}`;
  const trap = addToHand(s, 0, 'royal_tax');
  if (costOf(s, trap) !== getCard('royal_tax').cost) return 'traps are not spells';
  const hp = pl(0).hero.health;
  refill(0);
  play(0, addToHand(s, 0, 'infernal_contract'));
  if (pl(0).hero.health > hp - 1) return `health ${hp} -> ${pl(0).hero.health}`;
  if (s.descent.depth !== 4) return `depth ${s.descent.depth}`;
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

test('VIII Fraud: at the start of your turn, steal a random card from the enemy hand', () => {
  sinkTo(8);
  pl(0).hand = []; pl(1).hand = [];
  addToHand(s, 0, 'imp'); addToHand(s, 0, 'pit_lord');
  endTurn(); // B starts: draws 1, steals 1
  if (pl(0).hand.length !== 1) return `A has ${pl(0).hand.length}`;
  if (!pl(1).hand.some((c) => ['imp', 'pit_lord'].includes(c.cardId))) return 'nothing stolen';
  if (pl(1).hand.some((c) => c.owner !== 1)) return 'stolen card still owned by A';
});
test('VIII Fraud: an empty enemy hand steals nothing', () => {
  sinkTo(8);
  pl(0).hand = []; pl(1).hand = [];
  endTurn();
  if (pl(1).hand.length !== 1) return `B has ${pl(1).hand.length}`;
});
test('IX Treachery: at the end of your turn one of your minions freezes and misses your next turn', () => {
  sinkTo(9);
  const a = blank(0, 2, 5), e = blank(1, 2, 5);
  endTurn();
  if (!a.keywords.includes('Frozen')) return 'not frozen';
  if (e.keywords.includes('Frozen')) return 'enemy frozen';
  endTurn(); // A's turn: still frozen, can't attack
  if (getLegalActions(s, 0).some((x) => x.type === 'attack' && x.attacker === a.uid)) return 'frozen minion can attack';
});
test('IX Treachery: Thick Fur is never frozen', () => {
  sinkTo(9);
  const a = blank(0, 2, 5); a.keywords = ['Thick Fur'];
  endTurn();
  if (a.keywords.includes('Frozen')) return 'Thick Fur froze';
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
test('Satan: costs 1 less per circle; destroys all other minions; no judgement above the Ninth', () => {
  sinkTo(3);
  const sat = addToHand(s, 0, 'satan_lord_of_the_pit');
  if (costOf(s, sat) !== 7) return `cost ${costOf(s, sat)}`;
  blank(0, 1, 9); blank(1, 1, 9);
  const hp = pl(1).hero.health;
  play(0, sat);
  const others = [...pl(0).board, ...pl(1).board].filter((m) => m.cardId !== 'satan_lord_of_the_pit');
  if (others.length) return `${others.length} survived`;
  if (pl(1).hero.health !== hp) return 'judgement fired above the 9th circle';
});
test('Satan never costs less than 6, even in the Ninth Circle', () => {
  sinkTo(9);
  if (costOf(s, addToHand(s, 0, 'satan_lord_of_the_pit')) !== 6) return 'below 6';
});
test('Satan in the Ninth Circle: the enemy Hero loses half their Health', () => {
  sinkTo(9);
  pl(1).hero.health = 25;
  play(0, addToHand(s, 0, 'satan_lord_of_the_pit'));
  if (pl(1).hero.health !== 13) return `health ${pl(1).hero.health}`;
});

console.log(`\n${passed} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
