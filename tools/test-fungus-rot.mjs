// Rules tests for the Fungus Rot & Renewal expansion (Corpses for Fungus). Each test sets up a
// small board, plays the card through the real engine, and checks the outcome.
//   node tools/test-fungus-rot.mjs

import { buildDeck } from '../src/cards/index.js';
import { addToHand, effectiveAttack, hasKeyword, summonMinion } from '../src/engine/core.js';
import { applyAction, createGame, getLegalActions } from '../src/engine/engine.js';
import { getCard } from '../src/engine/registry.js';
import { targetCandidates } from '../src/engine/targeting.js';
import { ART } from '../src/cards/art-manifest.js';
import { existsSync } from 'node:fs';
import { costOf } from '../src/engine/core.js';

let s;
let failures = 0;
let passed = 0;

// Player 0 runs Fungus (+ Vampires); player 1 runs Aliens + Robots.
function fresh() {
  const fa = ['Fungus', 'Vampires'], fb = ['Aliens', 'Robots'];
  const players = [{ name: 'A', factions: fa, deck: buildDeck(fa) }, { name: 'B', factions: fb, deck: buildDeck(fb) }];
  s = createGame({ seed: 7, rules: { mulligan: false, secondPlayerPotions: false, openingHandHelp: false }, players });
  for (const p of s.players) { p.hand = []; p.mana.max = 10; p.mana.current = 10; p.mana.primal = 0; p.mana.base = 10; }
}
const pl = (p) => s.players[p];
const put = (p, id) => { const m = summonMinion(s, p, id); m.sick = false; return m; };
const give = (p, id) => addToHand(s, p, id);
const find = (p, id) => pl(p).board.find((m) => m.cardId === id);
// A plain enemy (or friendly) minion with chosen stats and no keywords.
const blank = (p, atk, hp) => { const m = put(p, 'vampire_gargoyle'); m.keywords = []; m.attack = atk; m.health = hp; m.maxHealth = hp; return m; };

function settle(react = () => null) {
  for (let i = 0; i < 50 && s.pending; i++) {
    if (s.pending.type === 'reaction') applyAction(s, react(getLegalActions(s)) ?? { type: 'pass', player: s.pending.player });
    else if (s.pending.type === 'choice') applyAction(s, { type: 'choose', player: s.pending.player, index: 0 });
    else break;
  }
}
function play(p, inst, target, target2, react) {
  applyAction(s, { type: 'play', player: p, card: inst.uid, ...(target != null ? { target } : {}), ...(target2 != null ? { target2 } : {}) });
  settle(react);
}
function attack(p, attacker, defender, react) {
  applyAction(s, { type: 'attack', player: p, attacker, defender });
  settle(react);
}
function endTurn(react) {
  applyAction(s, { type: 'endTurn', player: s.activePlayer });
  settle(react);
  for (const p of s.players) { p.mana.max = 10; p.mana.current = 10; p.mana.primal = 0; p.mana.base = 10; }
}
const toNextTurnOf = (p) => { for (let i = 0; i < 4 && (s.activePlayer !== p || i === 0); i++) endTurn(); };
const qp = (cardId) => (legal) => legal.find((a) => a.type === 'quickPlay' && pl(a.player).hand.find((h) => h.uid === a.card)?.cardId === cardId);
const canAttack = (uid, target) => getLegalActions(s).some((a) => a.type === 'attack' && a.attacker === uid && (target == null || a.defender === target));

function test(name, fn) {
  fresh();
  try {
    const problem = fn();
    if (problem) { failures++; console.log(`FAIL ${name}: ${problem}`); } else { passed++; console.log(`ok   ${name}`); }
  } catch (e) { failures++; console.log(`FAIL ${name}: threw ${e.stack.split('\n').slice(0, 3).join(' | ')}`); }
}

const corpses = (p = 0) => pl(p).corpses ?? 0;
const setCorpses = (n, p = 0) => { pl(p).corpses = n; };
const IDS = ['rotgrub_cap', 'carrion_puffball', 'mulch_crawler', 'decay_tender', 'corpse_bloom', 'sludge_hulk', 'grave_gardener', 'the_rot_king',
  'decompose', 'return_to_the_soil', 'feed_the_earth', 'rot_burst', 'second_bloom', 'fester', 'mushroom_circle'];

test('All 15 Rot & Renewal cards exist, are Fungus expansion cards and have art', () => {
  for (const id of IDS) {
    const c = getCard(id);
    if (!c) return `missing ${id}`;
    if (!c.extra || c.faction !== 'Fungus') return `${id} not a Fungus expansion card`;
    if (!ART[id] || !existsSync(ART[id])) return `${id} has no art`;
  }
});

test('A friendly Fungus minion that dies leaves a Corpse; a non-Fungus one does not', () => {
  const f = put(0, 'rotgrub_cap'), v = blank(0, 1, 1);
  f.health = 0; f.destroyed = true;
  const k = put(1, 'xeno_drone');
  play(0, give(0, 'decompose'), v.uid); // Decompose itself gives 3
  if (corpses() !== 3 + 1) return `corpses ${corpses()} (expected 3 from Decompose + 1 from the Fungus)`;
});

test('Rotgrub Cap: Arrival gains a Corpse', () => {
  play(0, give(0, 'rotgrub_cap'));
  if (corpses() !== 1) return `corpses ${corpses()}`;
});

test('Carrion Puffball: Exit gains 2 Corpses (plus 1 for a Fungus dying)', () => {
  const c = put(0, 'carrion_puffball');
  play(0, give(0, 'decompose'), c.uid);
  if (corpses() !== 3 + 2 + 1) return `corpses ${corpses()}`;
});

test('Mulch Crawler spends a Corpse for +2/+2; with none it stays 2/3', () => {
  setCorpses(1);
  play(0, give(0, 'mulch_crawler'));
  const m = find(0, 'mulch_crawler');
  if (effectiveAttack(m) !== 4 || m.health !== 5 || corpses() !== 0) return `${effectiveAttack(m)}/${m.health}, corpses ${corpses()}`;
  setCorpses(0);
  play(0, give(0, 'mulch_crawler'));
  const m2 = pl(0).board.filter((x) => x.cardId === 'mulch_crawler')[1];
  if (effectiveAttack(m2) !== 2 || corpses() !== 0) return `second ${effectiveAttack(m2)}, corpses ${corpses()}`;
});

test('Decay Tender spends 2 Corpses to restore 5 Health', () => {
  setCorpses(2); pl(0).hero.health = 20;
  play(0, give(0, 'decay_tender'));
  if (pl(0).hero.health !== 25 || corpses() !== 0) return `health ${pl(0).hero.health}, corpses ${corpses()}`;
});

test('Corpse Bloom spends 2 Corpses to add a friendly minion that died this game to your hand', () => {
  const v = put(0, 'vampire_gargoyle');
  play(0, give(0, 'decompose'), v.uid);
  setCorpses(2);
  const before = pl(0).hand.length;
  play(0, give(0, 'corpse_bloom'));
  if (pl(0).hand.length !== before + 0 + 1 - 0 || !pl(0).hand.some((h) => h.cardId === 'vampire_gargoyle')) return `hand ${pl(0).hand.map((h) => h.cardId)}`;
  if (corpses() !== 0) return `corpses ${corpses()}`;
});

test('Sludge Hulk spends up to 5 Corpses for +1/+1 each', () => {
  setCorpses(7);
  play(0, give(0, 'sludge_hulk'));
  const h = find(0, 'sludge_hulk');
  if (effectiveAttack(h) !== 8 || h.health !== 11 || corpses() !== 2) return `${effectiveAttack(h)}/${h.health}, corpses ${corpses()}`;
  if (!hasKeyword(h, 'Taunt')) return 'no Taunt';
});

test('Grave Gardener: another friendly minion dying gives a Corpse', () => {
  put(0, 'grave_gardener');
  const v = blank(0, 1, 1);
  play(0, give(0, 'decompose'), v.uid);
  if (corpses() !== 3 + 1) return `corpses ${corpses()}`;
});

test('The Rot King costs 1 less per Corpse and spends them as 1 damage each to enemies', () => {
  setCorpses(5);
  const card = give(0, 'the_rot_king');
  if (costOf(s, card) !== 3) return `cost ${costOf(s, card)}`;
  const e = blank(1, 1, 20);
  const hp = pl(1).hero.health;
  play(0, card);
  const dealt = (20 - e.health) + (hp - pl(1).hero.health);
  if (dealt !== 5 || corpses() !== 0) return `dealt ${dealt}, corpses ${corpses()}`;
});

test('Return to the Soil: 3 damage without Corpses, destroys with 3', () => {
  const a = blank(1, 1, 10);
  play(0, give(0, 'return_to_the_soil'), a.uid);
  if (a.health !== 7) return `health ${a.health}`;
  setCorpses(3);
  play(0, give(0, 'return_to_the_soil'), a.uid);
  if (pl(1).board.includes(a) || corpses() !== 0) return 'not destroyed';
});

test('Feed the Earth (Quick Play): a friendly minion dies, gain 3 Corpses', () => {
  give(0, 'feed_the_earth');
  const v = blank(0, 1, 1);
  endTurn();
  const e = blank(1, 5, 5);
  attack(1, e.uid, v.uid, qp('feed_the_earth'));
  if (corpses() !== 3) return `corpses ${corpses()}`;
});

test('Rot Burst (Quick Play) needs 2 Corpses; spends them for 4 damage to the attacker', () => {
  give(0, 'rot_burst');
  setCorpses(2);
  endTurn();
  const e = blank(1, 1, 5);
  attack(1, e.uid, pl(0).hero.uid, qp('rot_burst'));
  if (e.health !== 1 || corpses() !== 0) return `health ${e.health}, corpses ${corpses()}`;
});

test('Second Bloom (Quick Play) spends 3 Corpses to bring the minion back at full Health', () => {
  give(0, 'second_bloom');
  const v = put(0, 'vampire_gargoyle');
  setCorpses(3);
  endTurn();
  const e = blank(1, 9, 9);
  attack(1, e.uid, v.uid, qp('second_bloom'));
  const back = find(0, 'vampire_gargoyle');
  if (!back || back.health !== getCard('vampire_gargoyle').health || corpses() !== 0) return `back ${!!back} hp ${back?.health}, corpses ${corpses()}`;
});

test('Fester: an enemy minion that kills a friendly one takes damage equal to your Corpses (max 5)', () => {
  play(0, give(0, 'fester'));
  const v = blank(0, 1, 1);
  setCorpses(7);
  endTurn();
  const e = blank(1, 3, 10);
  attack(1, e.uid, v.uid);
  if (e.health !== 10 - 1 - 5) return `health ${e.health}`;
});

test('Mushroom Circle: your Hero takes damage -> 3 Corpses and two Rotgrub Caps', () => {
  play(0, give(0, 'mushroom_circle'));
  endTurn();
  const e = blank(1, 2, 2);
  attack(1, e.uid, pl(0).hero.uid);
  const caps = pl(0).board.filter((m) => m.cardId === 'rotgrub_cap').length;
  if (corpses() !== 3 || caps !== 2) return `corpses ${corpses()}, caps ${caps}`;
});

console.log(`\n${passed} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
