// Rules tests for the Demons' Kings of Hell expansion (Tithe and punishing draws). Each test sets
// up a small board, plays the card through the real engine, and checks the outcome.
//   node tools/test-demons-kings.mjs

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

// Player 0 runs Demons (+ Vampires); player 1 runs Aliens + Robots.
function fresh() {
  const fa = ['Demons', 'Vampires'], fb = ['Aliens', 'Robots'];
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

const hand = (p) => pl(p).hand.length;
const fill = (p, n) => { while (pl(p).hand.length < n) give(p, 'xeno_drone'); };
const IDS = ['ledger_imp', 'infernal_herald', 'hellbound_scribe', 'royal_debt_collector', 'paimon_king_of_secrets', 'beleth_king_of_wrath',
  'asmoday_king_of_greed', 'bael_first_king_of_hell', 'infernal_contract', 'hellfire_decree', 'cursed_gift', 'kingly_retribution', 'royal_tax',
  'signed_in_blood', 'gilded_cage'];

test('All 15 Kings of Hell cards exist, are Demons expansion cards and have art', () => {
  for (const id of IDS) {
    const c = getCard(id);
    if (!c) return `missing ${id}`;
    if (!c.extra || c.faction !== 'Demons') return `${id} not a Demons expansion card`;
    if (!ART[id] || !existsSync(ART[id])) return `${id} has no art`;
  }
});

test('Ledger Imp: Tithe 1, both players draw a card', () => {
  const card = give(0, 'ledger_imp');
  const a = hand(0), b = hand(1);
  play(0, card);
  if (hand(0) !== a - 1 + 1 || hand(1) !== b + 1) return `hands ${hand(0)} (${a}) ${hand(1)} (${b})`;
});

test('Infernal Herald: +1 Attack this turn per enemy draw', () => {
  const h = put(0, 'infernal_herald');
  play(0, give(0, 'infernal_contract')); // Tithe 2
  if (effectiveAttack(h) !== 5) return `attack ${effectiveAttack(h)}`;
  endTurn();
  if (effectiveAttack(h) !== 4) return `next turn (enemy drew 1 at turn start) ${effectiveAttack(h)}`;
});

test('Hellbound Scribe: every enemy draw deals 1 damage to their Hero', () => {
  put(0, 'hellbound_scribe');
  const hp = pl(1).hero.health;
  play(0, give(0, 'infernal_contract'));
  if (pl(1).hero.health !== hp - 2) return `after Tithe 2: ${hp - pl(1).hero.health} damage`;
  endTurn();
  if (pl(1).hero.health !== hp - 3) return `their turn draw: ${hp - pl(1).hero.health}`;
});

test('Royal Debt Collector: 1 damage per enemy card above 3', () => {
  fill(1, 7);
  const hp = pl(1).hero.health;
  play(0, give(0, 'royal_debt_collector'));
  if (pl(1).hero.health !== hp - 4) return `damage ${hp - pl(1).hero.health}`;
});

test("Paimon: each player draws an extra card at the start of their turn", () => {
  put(0, 'paimon_king_of_secrets');
  const b = hand(1);
  endTurn();
  if (hand(1) !== b + 2) return `enemy drew ${hand(1) - b}`;
  const a = hand(0);
  endTurn();
  if (hand(0) !== a + 2) return `you drew ${hand(0) - a}`;
});

test('Beleth: each enemy draw deals 2 damage to a random enemy minion', () => {
  put(0, 'beleth_king_of_wrath');
  const e = blank(1, 1, 10);
  play(0, give(0, 'infernal_contract'));
  if (e.health !== 6) return `health ${e.health}`;
});

test('Asmoday: +1/+1 per enemy draw; a burned one also deals 3 damage', () => {
  const a = put(0, 'asmoday_king_of_greed');
  fill(1, 10);
  const hp = pl(1).hero.health;
  play(0, give(0, 'infernal_contract')); // they draw 2 into a full hand
  if (effectiveAttack(a) !== 7 || a.health !== 8 || pl(1).hero.health !== hp - 6) return `${effectiveAttack(a)}/${a.health}, damage ${hp - pl(1).hero.health}`;
});

test('Bael: both hands fill to 10; 1 damage per card the opponent drew', () => {
  fill(1, 4);
  const hp = pl(1).hero.health;
  play(0, give(0, 'bael_first_king_of_hell'));
  if (hand(0) !== 10 || hand(1) !== 10) return `hands ${hand(0)} ${hand(1)}`;
  if (pl(1).hero.health !== hp - 6) return `damage ${hp - pl(1).hero.health}`;
});

test('Infernal Contract: Tithe 2, and your next Demon this turn costs 2 less (only one)', () => {
  const d1 = give(0, 'royal_debt_collector'), d2 = give(0, 'beleth_king_of_wrath'), sp = give(0, 'hellfire_decree');
  play(0, give(0, 'infernal_contract'));
  if (costOf(s, d1) !== 1 || costOf(s, d2) !== 3 || costOf(s, sp) !== 3) return `costs ${costOf(s, d1)} ${costOf(s, d2)} ${costOf(s, sp)}`;
  play(0, d1);
  if (costOf(s, d2) !== 5) return `second demon still discounted: ${costOf(s, d2)}`;
});

test('Hellfire Decree: 2 damage to enemy minions plus 1 per card the opponent drew this turn', () => {
  const e = blank(1, 1, 10);
  play(0, give(0, 'infernal_contract'));
  play(0, give(0, 'ledger_imp'));
  play(0, give(0, 'hellfire_decree'));
  if (e.health !== 5) return `health ${e.health}`;
});

test('Cursed Gift (Quick Play): opponent plays a card -> they draw 1 and take 4', () => {
  give(0, 'cursed_gift');
  endTurn();
  const card = give(1, 'xeno_drone');
  const b = hand(1), hp = pl(1).hero.health;
  play(1, card, null, null, qp('cursed_gift'));
  if (hand(1) !== b - 1 + 1 || pl(1).hero.health !== hp - 4) return `hand ${hand(1)} (was ${b}), damage ${hp - pl(1).hero.health}`;
});

test('Kingly Retribution (Quick Play): Tithe 1 and 4 damage to the attacker', () => {
  give(0, 'kingly_retribution');
  endTurn();
  const e = blank(1, 1, 5);
  const a = hand(0), b = hand(1);
  attack(1, e.uid, pl(0).hero.uid, qp('kingly_retribution'));
  if (e.health !== 1 || hand(0) !== a - 1 + 1 || hand(1) !== b + 1) return `health ${e.health}, hands ${hand(0)}/${a} ${hand(1)}/${b}`;
});

test('Royal Tax (Trap): the next card the opponent draws costs 3 more that turn', () => {
  play(0, give(0, 'royal_tax'));
  endTurn(); // they draw at the start of their turn
  const drawn = pl(1).hand[pl(1).hand.length - 1];
  const base = getCard(drawn.cardId).cost;
  if (costOf(s, drawn) !== base + 3) return `cost ${costOf(s, drawn)} vs ${base}`;
  endTurn(); endTurn();
  if (costOf(s, drawn) !== base) return 'tax lasted past the turn';
});

test('Signed in Blood (Trap): opponent casts a spell -> they draw 1, you draw 2, 3 damage', () => {
  play(0, give(0, 'signed_in_blood'));
  endTurn();
  const sp = give(1, 'gestation');
  const e = blank(0, 1, 5);
  const a = hand(0), b = hand(1), hp = pl(1).hero.health;
  play(1, sp, e.uid);
  if (hand(0) !== a + 2) return `you drew ${hand(0) - a}`;
  if (hand(1) - (b - 1) < 1) return `they drew ${hand(1) - (b - 1)}`;
  if (pl(1).hero.health !== hp - 3) return `damage ${hp - pl(1).hero.health}`;
});

test('Gilded Cage (Trap): opponent starts a turn with 6+ cards -> discards 2, takes 5', () => {
  play(0, give(0, 'gilded_cage'));
  fill(1, 6);
  const hp = pl(1).hero.health;
  endTurn(); // they draw to 9, then the trap checks
  if (pl(1).hero.health !== hp - 5) return `damage ${hp - pl(1).hero.health}`;
  if (hand(1) !== 5) return `hand ${hand(1)}`;
});

test('Gilded Cage stays set when the opponent has fewer than 6 cards', () => {
  play(0, give(0, 'gilded_cage'));
  while (pl(1).hand.length > 4) pl(1).hand.pop();
  const hp = pl(1).hero.health;
  endTurn();
  if (pl(1).hero.health !== hp || pl(0).traps.length !== 1) return 'fired early';
});

console.log(`\n${passed} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
