// Storm Season (Eels expansion): every card checked against its text, on the real engine.
//   node tools/test-eels-storm.mjs

import { buildDeck } from '../src/cards/index.js';
import { addToHand, hasKeyword, summonMinion } from '../src/engine/core.js';
import { applyAction, createGame, getLegalActions, run as drain } from '../src/engine/engine.js';
import { resolveEffect, XENO_FORMS } from '../src/engine/effects.js';
import { getCard } from '../src/engine/registry.js';

let s;
let failures = 0;
let passed = 0;

// Player 0 runs Eels (+ partner); player 1 runs foe.
function fresh(partner = 'Sharks', foe = ['Vampires', 'Dragons']) {
  const fa = ['Eels', partner];
  const players = [{ name: 'A', factions: fa, deck: buildDeck(fa) }, { name: 'B', factions: foe, deck: buildDeck(foe) }];
  s = createGame({ seed: 7, rules: { mulligan: false, secondPlayerPotions: false, openingHandHelp: false }, players });
  for (const p of s.players) { p.hand = []; p.mana.max = 10; p.mana.current = 10; p.mana.primal = 0; p.mana.base = 10; }
}
const pl = (p) => s.players[p];
const hero = (p) => pl(p).hero;
const put = (p, id) => { const m = summonMinion(s, p, id); m.sick = false; return m; };
const give = (p, id) => addToHand(s, p, id);
const bury = (p, id) => { const g = { uid: s.nextUid++, cardId: id, owner: p, died: true }; pl(p).graveyard.push(g); return g; };
// A blank minion with exactly these stats and keywords (a stripped Vampire Gargoyle).
const blank = (p, atk, hp, kws = []) => { const m = put(p, 'vampire_gargoyle'); m.keywords = [...kws]; m.attack = atk; m.health = hp; m.maxHealth = hp; return m; };
const lost = (m) => m.maxHealth - m.health;
const LYCAN = 'moonbound_initiate';

function settle(react = () => null) {
  for (let i = 0; i < 50 && s.pending; i++) {
    if (s.pending.type === 'reaction') applyAction(s, react(getLegalActions(s)) ?? { type: 'pass', player: s.pending.player });
    else if (s.pending.type === 'choice') applyAction(s, { type: 'choose', player: s.pending.player, index: 0 });
    else break;
  }
}
function play(p, inst, target, target2) {
  applyAction(s, { type: 'play', player: p, card: inst.uid, ...(target != null ? { target } : {}), ...(target2 != null ? { target2 } : {}) });
  settle();
}
function heroSpell(p, cardId, target, target2) {
  applyAction(s, { type: 'heroSpell', player: p, card: cardId, ...(target != null ? { target } : {}), ...(target2 != null ? { target2 } : {}) });
  settle();
}
function attack(p, attacker, defender) {
  applyAction(s, { type: 'attack', player: p, attacker, defender });
  settle();
}
function endTurn() {
  applyAction(s, { type: 'endTurn', player: s.activePlayer });
  settle();
  for (const p of s.players) { p.mana.max = 10; p.mana.current = 10; p.mana.primal = 0; p.mana.base = 10; }
}
const canPlayOn = (p, inst, target) => getLegalActions(s).some((a) => a.type === 'play' && a.card === inst.uid && a.target === target);
// Run one effect for a player the way a card would, then let the step queue drain (deaths, events).
function run(effect, controller = 0) {
  resolveEffect(s, effect, { controller, self: null });
  s.queue.push({ kind: 'deaths' });
  drain(s);
  settle();
}

function test(name, fn, ...args) {
  fresh(...args);
  try {
    const problem = fn();
    if (problem) { failures++; console.log(`FAIL ${name}: ${problem}`); } else { passed++; console.log(`ok   ${name}`); }
  } catch (e) { failures++; console.log(`FAIL ${name}: threw ${e.stack.split('\n').slice(0, 3).join(' | ')}`); }
}


const nth = (p, i) => pl(p).board[i];
const handIds = (p) => pl(p).hand.map((c) => c.cardId);

test('Pond Spark: Arrival gives the chosen friendly minion 1 Volt', () => {
  const m = put(0, 'dynamo_eel');
  play(0, give(0, 'pond_spark'), m.uid);
  if (m.volts !== 1) return `volts ${m.volts}`;
});
test('Pond Spark can be played with no other minion', () => {
  play(0, give(0, 'pond_spark'));
  if (!pl(0).board.some((m) => m.cardId === 'pond_spark')) return 'not played';
});
test('Static Skate: Rush, and the minion it attacks becomes Conductive', () => {
  const skate = summonMinion(s, 0, 'static_skate'); // just arrived: Rush lets it hit a minion
  const a = blank(1, 1, 9);
  if (!hasKeyword(skate, 'Rush')) return 'no Rush';
  attack(0, skate.uid, a.uid);
  if (!a.conductive) return 'not Conductive';
});
test('Jolt Courier: Exit gives a random other friendly minion 2 Volts', () => {
  const c = put(0, 'jolt_courier');
  const m = put(0, 'dynamo_eel');
  run({ op: 'destroy', target: { uid: c.uid } });
  if (m.volts !== 2) return `volts ${m.volts}`;
});
test('Grounded Moray: Taunt, +1/+1 whenever a friendly minion Discharges', () => {
  const g = put(0, 'grounded_moray');
  const m = put(0, 'dynamo_eel'); m.volts = 2;
  blank(1, 1, 9);
  if (!hasKeyword(g, 'Taunt')) return 'no Taunt';
  run({ op: 'discharge', target: { uid: m.uid } });
  if (g.attack !== 3 || g.maxHealth !== 6) return `${g.attack}/${g.maxHealth}`;
});
test('Tesla Ray: Arrival makes the chosen friendly minion Discharge', () => {
  const m = put(0, 'dynamo_eel'); m.volts = 3;
  const a = blank(1, 1, 9);
  play(0, give(0, 'tesla_ray'), m.uid);
  if (m.volts !== 0) return `still ${m.volts} Volts`;
  if (lost(a) !== 3) return `enemy took ${lost(a)}`;
});
test('Tesla Ray can still be played with no charged minion', () => {
  put(0, 'dynamo_eel');
  play(0, give(0, 'tesla_ray'));
  if (!pl(0).board.some((m) => m.cardId === 'tesla_ray')) return 'not played';
});
test('Shocksnout Eel: each time it gains Volts, 1 damage to a random enemy minion', () => {
  const sn = put(0, 'shocksnout_eel');
  const a = blank(1, 1, 9);
  run({ op: 'gainVolts', target: { uid: sn.uid }, amount: 2 });
  run({ op: 'gainVolts', target: { uid: sn.uid }, amount: 1 });
  if (lost(a) !== 2) return `enemy took ${lost(a)}`;
});
test("Shocksnout Eel: other minions gaining Volts don't trigger it", () => {
  put(0, 'shocksnout_eel');
  const m = put(0, 'dynamo_eel');
  const a = blank(1, 1, 9);
  run({ op: 'gainVolts', target: { uid: m.uid }, amount: 2 });
  if (lost(a)) return 'it fired';
});
test('Wellspring Eel: draws on the first Discharge each turn only', () => {
  put(0, 'wellspring_eel');
  const [m1, m2] = [put(0, 'dynamo_eel'), put(0, 'dynamo_eel')];
  m1.volts = 2; m2.volts = 2;
  blank(1, 1, 30);
  const n = pl(0).hand.length;
  run({ op: 'discharge', target: { uid: m1.uid } });
  run({ op: 'discharge', target: { uid: m2.uid } });
  if (pl(0).hand.length !== n + 1) return `drew ${pl(0).hand.length - n}`;
});
test('Thundercloud Ray: Arrival Chain 3', () => {
  const [a, b] = [blank(1, 1, 9), blank(1, 1, 9)];
  play(0, give(0, 'thundercloud_ray'), a.uid);
  if (lost(a) !== 3 || lost(b) !== 2) return `${lost(a)} ${lost(b)}`;
});
test("Ohmra: at the end of your turn your other minions' Volts flow into her", () => {
  const o = put(0, 'ohmra_the_living_battery');
  const [m1, m2] = [put(0, 'dynamo_eel'), put(0, 'riverbed_lurker')];
  m1.volts = 3; m2.volts = 2;
  s.activePlayer = 0;
  endTurn();
  if (m1.volts || m2.volts) return `left ${m1.volts} ${m2.volts}`;
  if (o.volts !== 5) return `Ohmra has ${o.volts}`;
});
test('Ohmra: at 10 or more she unleashes a Chain that never gets weaker', () => {
  const o = put(0, 'ohmra_the_living_battery'); o.volts = 6;
  const m = put(0, 'capacitor_eel'); m.volts = 5;
  const [a, b, c] = [blank(1, 1, 20), blank(1, 1, 20), blank(1, 1, 20)];
  const h = hero(1).health;
  s.activePlayer = 0;
  endTurn();
  if (o.volts !== 0) return `Ohmra kept ${o.volts}`;
  if (lost(a) !== 11 || lost(b) !== 11 || lost(c) !== 11) return `${lost(a)} ${lost(b)} ${lost(c)}`;
  if (h - hero(1).health !== 11) return `Hero took ${h - hero(1).health}`;
});
test("Ohmra holds more than 5 Volts (her limit doesn't cap her)", () => {
  const o = put(0, 'ohmra_the_living_battery');
  run({ op: 'gainVolts', target: { uid: o.uid }, amount: 8 });
  if (o.volts !== 8) return `${o.volts}`;
});
test('Thalassa: the storm Chains 2 at a random enemy at the end of each of your turns', () => {
  const a = blank(1, 1, 30);
  play(0, give(0, 'thalassa_the_endless_storm'), undefined);
  s.activePlayer = 0;
  endTurn();
  if (lost(a) !== 2) return `enemy took ${lost(a)}`;
  endTurn(); // the opponent's turn: no storm for them
  if (lost(a) !== 2) return `stormed on the enemy turn (${lost(a)})`;
});
test('Thalassa: the storm stays after she dies', () => {
  play(0, give(0, 'thalassa_the_endless_storm'));
  const t = pl(0).board.find((m) => m.cardId === 'thalassa_the_endless_storm');
  run({ op: 'destroy', target: { uid: t.uid } });
  const h = hero(1).health;
  s.activePlayer = 0;
  endTurn();
  if (h - hero(1).health !== 2) return `Hero took ${h - hero(1).health}`;
});
test('Spark Jar: 1 Volt and draw a card', () => {
  const m = put(0, 'dynamo_eel');
  const jar = give(0, 'spark_jar');
  const n = pl(0).hand.length;
  play(0, jar, m.uid);
  if (m.volts !== 1) return `volts ${m.volts}`;
  if (pl(0).hand.length !== n) return `hand ${pl(0).hand.length} vs ${n}`; // played one, drew one
});
test('Galvanize: +2/+2 and 2 Volts', () => {
  const m = put(0, 'dynamo_eel');
  play(0, give(0, 'galvanize'), m.uid);
  if (m.attack !== 4 || m.maxHealth !== 4 || m.volts !== 2) return `${m.attack}/${m.maxHealth} ${m.volts}V`;
});
test('Ball Lightning: enemies Conductive, then every charged friendly minion Discharges', () => {
  const [m1, m2] = [put(0, 'dynamo_eel'), put(0, 'dynamo_eel')];
  m1.volts = 2; m2.volts = 2;
  const [a, b, c] = [blank(1, 1, 20), blank(1, 1, 20), blank(1, 1, 20)];
  const h = hero(1).health;
  play(0, give(0, 'ball_lightning'));
  if (m1.volts || m2.volts) return 'Volts left';
  // Conductive: no jump loses power, so each 2-Volt Chain hits all three and the Hero for 2.
  if (lost(a) !== 4 || lost(b) !== 4 || lost(c) !== 4) return `${lost(a)} ${lost(b)} ${lost(c)}`;
  if (h - hero(1).health !== 4) return `Hero took ${h - hero(1).health}`;
});
test('Static Snare: when the opponent plays a minion, Chain 2 starting at it', () => {
  play(0, give(0, 'static_snare'));
  s.activePlayer = 0;
  endTurn();
  const inst = give(1, 'vampire_gargoyle');
  play(1, inst);
  const m = pl(1).board.find((x) => x.cardId === 'vampire_gargoyle');
  if (pl(0).traps.length) return 'trap still set';
  if (m && lost(m) < 2 && m.health > 0) return `took ${lost(m)}`;
});
test('Riptide Ambush: an attack on your Hero charges your minions and the most charged Discharges at the attacker', () => {
  const [m1, m2] = [put(0, 'dynamo_eel'), put(0, 'glass_eel')];
  m1.volts = 2;
  play(0, give(0, 'riptide_ambush'));
  s.activePlayer = 0;
  endTurn();
  const att = blank(1, 1, 20);
  attack(1, att.uid, hero(0).uid);
  if (m1.volts !== 0) return `most charged kept ${m1.volts}`;
  if (m2.volts !== 2) return `other has ${m2.volts}`;
  if (lost(att) < 4) return `attacker took ${lost(att)}`;
});
test('Storm Season cards are expansion cards (locked until unlocked) with art', () => {
  const ids = ['pond_spark', 'static_skate', 'jolt_courier', 'grounded_moray', 'tesla_ray', 'shocksnout_eel', 'wellspring_eel', 'thundercloud_ray',
    'ohmra_the_living_battery', 'thalassa_the_endless_storm', 'spark_jar', 'galvanize', 'ball_lightning', 'static_snare', 'riptide_ambush'];
  for (const id of ids) if (!getCard(id)?.extra) return `${id} is not an expansion card`;
  if (!getCard('ohmra_the_living_battery').legendary || !getCard('thalassa_the_endless_storm').legendary) return 'legendaries not legendary';
});

console.log(`\n${passed} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
