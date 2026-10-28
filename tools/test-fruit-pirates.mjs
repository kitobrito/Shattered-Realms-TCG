// Rules tests for the Fruit Pirates (Fruits, Gears, Feast!). Each test sets up a small board, plays the card
// through the real engine, and checks the outcome.   node tools/test-fruit-pirates.mjs

import { buildDeck } from '../src/cards/index.js';
import { addToHand, costOf, effectiveAttack, hasKeyword, heal, radiationOf, summonMinion } from '../src/engine/core.js';
import { applyAction, attackTargets, createGame, getLegalActions } from '../src/engine/engine.js';
import { resolveEffect } from '../src/engine/effects.js';
import { getCard } from '../src/engine/registry.js';
import { ART } from '../src/cards/art-manifest.js';

let s;
let failures = 0;
let passed = 0;

// Player 0 runs Fruit Pirates (+ `partner`); player 1 runs `foe`.
function fresh(partner = 'Vampires', foe = ['Dragons', 'Robots']) {
  const fa = ['Fruit Pirates', partner];
  const players = [{ name: 'A', factions: fa, deck: buildDeck(fa) }, { name: 'B', factions: foe, deck: buildDeck(foe) }];
  s = createGame({ seed: 7, rules: { mulligan: false, secondPlayerPotions: false, openingHandHelp: false }, players });
  for (const p of s.players) { p.hand = []; p.mana.max = 10; p.mana.current = 10; p.mana.primal = 0; p.mana.base = 10; }
}
const pl = (p) => s.players[p];
const put = (p, id, opts = {}) => { const m = summonMinion(s, p, id, opts); m.sick = false; return m; };
const give = (p, id) => addToHand(s, p, id);
// A minion that died earlier this game, lying in player p's Graveyard.
const bury = (p, id) => { const g = { uid: s.nextUid++, cardId: id, owner: p, died: true }; pl(p).graveyard.push(g); return g; };
const beyond = () => s.beyond ?? [];
const away = (m) => beyond().some((x) => x.minion.uid === m.uid);
const onBoard = (m) => s.players.some((x) => x.board.includes(m));
const find = (p, id) => pl(p).board.find((m) => m.cardId === id);
const count = (p, id) => pl(p).board.filter((m) => m.cardId === id).length;

function settle(react = () => null) {
  for (let i = 0; i < 50 && s.pending; i++) {
    if (s.pending.type === 'reaction') applyAction(s, react(getLegalActions(s)) ?? { type: 'pass', player: s.pending.player });
    else if (s.pending.type === 'choice') applyAction(s, { type: 'choose', player: s.pending.player, index: 0 });
    else break;
  }
}
function play(p, inst, target, react) {
  applyAction(s, { type: 'play', player: p, card: inst.uid, ...(target != null ? { target } : {}) });
  settle(react);
}
function heroSpell(p, cardId, target) {
  applyAction(s, { type: 'heroSpell', player: p, card: cardId, ...(target != null ? { target } : {}) });
  settle();
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
const qp = (cardId) => (legal) => legal.find((a) => a.type === 'quickPlay' && s.players[a.player].hand.find((h) => h.uid === a.card)?.cardId === cardId);
const canPlay = (p, inst) => getLegalActions(s).some((a) => a.type === 'play' && a.card === inst.uid);
const canCast = (cardId) => getLegalActions(s).some((a) => a.type === 'heroSpell' && a.card === cardId);


function test(name, fn, ...args) {
  fresh(...args);
  try {
    const problem = fn();
    if (problem) { failures++; console.log(`FAIL ${name}: ${problem}`); } else { passed++; console.log(`ok   ${name}`); }
  } catch (e) { failures++; console.log(`FAIL ${name}: threw ${e.stack.split("\n").slice(0, 3).join(" | ")}`); }
}

const resolve = (effect) => { resolveEffect(s, effect, { controller: 0, self: pl(0).hero.uid }); settle(); };
const foeMinion = (atk = 3, hp = 4, p = 1) => { const m = put(p, 'vampire_gargoyle'); m.keywords = []; m.attack = atk; m.health = hp; m.maxHealth = hp; return m; };
const mine = (atk = 2, hp = 3) => foeMinion(atk, hp, 0);
const canAttackWith = (m) => getLegalActions(s).some((a) => a.type === 'attack' && a.attacker === m.uid);
const fullRound = () => { endTurn(); endTurn(); };
const canTarget = (inst, target) => getLegalActions(s).some((a) => a.type === 'play' && a.card === inst.uid && a.target === target.uid);
const eat = (m, fruitId) => play(0, give(0, fruitId), m.uid);

// ---- Fruits ----
test('Flame Fruit: +2 Attack, and its attacks Burn the target', () => {
  const m = mine(2, 3); const foe = foeMinion(1, 9);
  eat(m, 'flame_fruit');
  if (m.fruit !== 'flame_fruit') return `fruit ${m.fruit}`;
  if (effectiveAttack(m) !== 4) return `attack ${effectiveAttack(m)}`;
  attack(0, m.uid, foe.uid);
  if (!(foe.burn > 0)) return `burn ${JSON.stringify(foe.burn)}`;
});
test('Smoke Fruit: +0/+2 and Evade, and Evade again each turn', () => {
  const m = mine(2, 3);
  eat(m, 'smoke_fruit');
  if (m.health !== 5 || !hasKeyword(m, 'Evade')) return `hp ${m.health} evade ${hasKeyword(m, 'Evade')}`;
  m.keywords = m.keywords.filter((k) => k !== 'Evade');
  fullRound();
  if (!hasKeyword(m, 'Evade')) return 'no Evade at the start of the next turn';
});
test('Frost Fruit: attacking a minion Freezes it', () => {
  const m = mine(2, 3); const foe = foeMinion(1, 9);
  eat(m, 'frost_fruit');
  if (effectiveAttack(m) !== 3 || m.health !== 5) return `stats ${effectiveAttack(m)}/${m.health}`;
  attack(0, m.uid, foe.uid);
  if (!hasKeyword(foe, 'Frozen')) return 'target not Frozen';
});
test('Thunder Fruit: end of turn, 2 damage to a random enemy minion', () => {
  const m = mine(2, 3); const foe = foeMinion(1, 9);
  eat(m, 'thunder_fruit');
  endTurn();
  if (foe.health !== 7) return `foe hp ${foe.health}`;
});
test('Magma Fruit: attacking also hits the enemy Hero for 2', () => {
  const m = mine(2, 3); const foe = foeMinion(1, 9);
  eat(m, 'magma_fruit');
  const hp = pl(1).hero.health;
  attack(0, m.uid, foe.uid);
  if (pl(1).hero.health !== hp - 2) return `hero ${hp} -> ${pl(1).hero.health}`;
});
test('Light Fruit: +1 Attack and Twin Strike (two attacks a turn)', () => {
  const m = mine(2, 3); foeMinion(1, 20);
  eat(m, 'light_fruit');
  if (!hasKeyword(m, 'Twin Strike')) return 'no Twin Strike';
  attack(0, m.uid, pl(1).hero.uid);
  if (!canAttackWith(m)) return 'cannot attack a second time';
});
test('Shadow-Pull Fruit: Lifesteal, and grows when an enemy minion dies', () => {
  const m = mine(5, 6); const foe = foeMinion(1, 2);
  eat(m, 'shadow_pull_fruit');
  if (!hasKeyword(m, 'Lifesteal')) return 'no Lifesteal';
  const a = effectiveAttack(m);
  attack(0, m.uid, foe.uid);
  if (effectiveAttack(m) !== a + 1) return `attack ${a} -> ${effectiveAttack(m)}`;
});
test('A minion eats only one Fruit: a second Fruit cannot target it', () => {
  const m = mine(2, 3);
  eat(m, 'light_fruit');
  const f = give(0, 'flame_fruit');
  if (canTarget(f, m)) return 'second Fruit could target a fruit eater';
  const other = mine(1, 1);
  if (!canTarget(f, other)) return 'a fruitless minion was not a legal target';
});
test('Ruddy is born a fruit eater: Fruits cannot target him', () => {
  const r = put(0, 'rubber_captain_ruddy');
  if (canTarget(give(0, 'flame_fruit'), r)) return 'Ruddy could eat a Fruit';
});
test('Silence strips the Fruit power but not the one-Fruit rule', () => {
  const m = mine(2, 3); const foe = foeMinion(1, 9);
  eat(m, 'magma_fruit');
  resolve({ op: 'buff', target: { uid: m.uid }, keywords: ['Silenced'] });
  const hp = pl(1).hero.health;
  attack(0, m.uid, foe.uid);
  if (pl(1).hero.health !== hp) return 'Magma still fired after Silence';
  if (canTarget(give(0, 'flame_fruit'), m)) return 'could eat again after Silence';
});

// ---- Gear ----
test('Ruddy only shifts Gear if he attacked this turn', () => {
  const r = put(0, 'rubber_captain_ruddy');
  endTurn();
  if (r.cardId !== 'rubber_captain_ruddy') return `shifted without attacking: ${r.cardId}`;
});
test('Ruddy climbs Steam -> Titan -> Bounce -> Dawn, one Gear per attacking turn', () => {
  const r = put(0, 'rubber_captain_ruddy');
  const chain = ['ruddy_steam_gear', 'ruddy_titan_gear', 'ruddy_bounce_gear', 'ruddy_dawn_gear'];
  const buddy = mine(1, 1);
  for (const want of chain) {
    if (s.activePlayer !== 0) endTurn();
    const m = pl(0).board.find((x) => x.uid === r.uid);
    if (!m) return `Ruddy gone before ${want}`;
    m.sick = false; m.attacksThisTurn = 0;
    pl(1).hero.health = 30;
    attack(0, m.uid, pl(1).hero.uid);
    endTurn();
    if (m.cardId !== want) return `expected ${want}, got ${m.cardId}`;
  }
  const m = pl(0).board.find((x) => x.uid === r.uid);
  if (effectiveAttack(m) < 12) return `Dawn attack ${effectiveAttack(m)}`;
  if (!hasKeyword(buddy, 'Rush') || effectiveAttack(buddy) !== 3) return `Dawn shift did not rally: ${effectiveAttack(buddy)} rush ${hasKeyword(buddy, 'Rush')}`;
});
test('Titan Gear: attacking deals 2 to every enemy minion', () => {
  const r = put(0, 'ruddy_titan_gear'); const a = foeMinion(1, 5); const b = foeMinion(1, 5);
  attack(0, r.uid, pl(1).hero.uid);
  if (a.health !== 3 || b.health !== 3) return `hp ${a.health}, ${b.health}`;
});

// ---- Hero Spell, minions, traps ----
test('Feast!: +1/+1, or +2/+2 on a fruit eater', () => {
  const plain = mine(1, 1); const eater = mine(1, 1);
  eat(eater, 'light_fruit');
  if (!canCast('feast')) return `not castable: ${JSON.stringify(pl(0).heroSpells)}`;
  heroSpell(0, 'feast', plain.uid);
  if (effectiveAttack(plain) !== 2 || plain.health !== 2) return `plain ${effectiveAttack(plain)}/${plain.health}`;
  for (const h of pl(0).heroSpells) h.uses = 0;
  const a = effectiveAttack(eater), h = eater.health;
  heroSpell(0, 'feast', eater.uid);
  if (effectiveAttack(eater) !== a + 2 || eater.health !== h + 2) return `eater ${a}/${h} -> ${effectiveAttack(eater)}/${eater.health}`;
});
test('Seastone Bounty Hunter destroys a fruit eater, Silences anyone else', () => {
  const eater = foeMinion(2, 9); eater.fruit = 'flame_fruit'; const plain = foeMinion(2, 9);
  play(0, give(0, 'seastone_bounty_hunter'), eater.uid);
  if (onBoard(eater)) return 'fruit eater survived';
  play(0, give(0, 'seastone_bounty_hunter'), plain.uid);
  if (!onBoard(plain) || !hasKeyword(plain, 'Silenced')) return 'plain minion not Silenced';
});
test('Cabin Boy draws a Fruit; Fruit Forager adds one', () => {
  play(0, give(0, 'cabin_boy'));
  const hand = pl(0).hand.map((h) => getCard(h.cardId));
  if (!hand.some((c) => c.fruit)) return `hand ${hand.map((c) => c.id)}`;
  pl(0).hand = [];
  play(0, give(0, 'fruit_forager'));
  if (!pl(0).hand.some((h) => getCard(h.cardId).fruit)) return 'Forager gave no Fruit';
});
test('Seastone Net: an attacking enemy minion is Silenced and takes 2', () => {
  play(0, give(0, 'seastone_net'));
  endTurn();
  const foe = foeMinion(3, 6, 1);
  attack(1, foe.uid, pl(0).hero.uid);
  if (!hasKeyword(foe, 'Silenced') || foe.health !== 4) return `silenced ${hasKeyword(foe, 'Silenced')} hp ${foe.health}`;
});
test('Cannon Ambush: an enemy minion played takes 3', () => {
  play(0, give(0, 'cannon_ambush'));
  endTurn();
  const inst = give(1, 'iron_hull_shipwright');
  play(1, inst);
  const m = find(1, 'iron_hull_shipwright');
  if (!m || m.health !== 3) return `hp ${m?.health}`;
});
test('Old Quakebeard hits every other minion and the enemy Hero for 3', () => {
  const ally = mine(1, 5); const foe = foeMinion(1, 5); const hp = pl(1).hero.health;
  play(0, give(0, 'old_quakebeard'));
  if (ally.health !== 2 || foe.health !== 2 || pl(1).hero.health !== hp - 3) return `${ally.health} ${foe.health} ${pl(1).hero.health}`;
  if (find(0, 'old_quakebeard').health !== 8) return 'Quakebeard hurt himself';
});

// ---- Fusions ----
test('Honey-Glazed Fruit (Bees): Lifesteal only on a fruit eater', () => {
  const eater = mine(1, 1); eat(eater, 'light_fruit');
  pl(0).fusion.charge = 3; heroSpell(0, 'honey_glazed_fruit', eater.uid);
  if (!hasKeyword(eater, 'Lifesteal')) return 'no Lifesteal on fruit eater';
}, 'Bees');
test('Frozen Cargo (Ice Age): summons a Thawing minion one turn closer', () => {
  pl(0).fusion.charge = 3; heroSpell(0, 'frozen_cargo');
  const m = pl(0).board.at(-1);
  if (!m || !getCard(m.cardId).thawing) return `summoned ${m?.cardId}`;
  if (!(m.encased < getCard(m.cardId).thawing || !m.encased)) return `encased ${m.encased} of ${getCard(m.cardId).thawing}`;
}, 'Ice Age');
test('Devil\'s Bargain (Demons): two Fruits for 3 Health', () => {
  const hp = pl(0).hero.health;
  pl(0).fusion.charge = 3; heroSpell(0, 'devils_bargain');
  if (pl(0).hand.filter((h) => getCard(h.cardId).fruit).length !== 2 || pl(0).hero.health !== hp - 3) return 'wrong';
}, 'Demons');
test('Every Fruit Pirates card has art and the base deck is 30', () => {
  const deck = buildDeck(['Fruit Pirates'], []);
  if (buildDeck(['Fruit Pirates', 'Vampires']).filter((id) => getCard(id).faction === 'Fruit Pirates').length !== 20) return 'two-realm deck does not hold 20 Fruit Pirates';
  if (deck.length !== 30) return `deck ${deck.length}`;
  const missing = [...new Set(deck)].filter((id) => !ART[id]);
  if (missing.length) return `no art: ${missing}`;
});

// ---- Stealth (all realms) ----
test('Stealth is lost when the minion attacks', () => {
  const m = mine(2, 3); m.keywords = ['Stealth']; foeMinion(1, 9);
  attack(0, m.uid, pl(1).hero.uid);
  if (hasKeyword(m, 'Stealth')) return 'still in Stealth after attacking';
  endTurn();
  if (!attackTargets(s, 1).includes(m.uid)) return 'enemy still cannot attack it';
});
test('A Burrowed minion that attacks Surfaces and leaves Stealth', () => {
  const m = mine(2, 3); m.burrowed = true;
  attack(0, m.uid, pl(1).hero.uid);
  if (m.burrowed || hasKeyword(m, 'Stealth')) return `burrowed ${m.burrowed} stealth ${hasKeyword(m, 'Stealth')}`;
});

console.log(`\n${passed} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
