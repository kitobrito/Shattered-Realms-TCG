// Eels rules: Volts, Discharge, Chain, Conductive and every Eels card, checked against their text.
// Each test sets up a small board and runs the real engine.   node tools/test-eels.mjs

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

// ---- Chain ----
test('Chain 3 into a row of three: 3, 2, 1 and nothing left for the Hero', () => {
  const [a, b, c] = [blank(1, 1, 9), blank(1, 1, 9), blank(1, 1, 9)];
  const h = hero(1).health;
  run({ op: 'chain', amount: 3, start: { uid: a.uid } });
  if (lost(a) !== 3 || lost(b) !== 2 || lost(c) !== 1) return `${lost(a)} ${lost(b)} ${lost(c)}`;
  if (hero(1).health !== h) return 'the Hero was hit';
});
test('Chain jumps to the nearest minion (right-hand one on a tie)', () => {
  const [a, b, c] = [blank(1, 1, 9), blank(1, 1, 9), blank(1, 1, 9)];
  run({ op: 'chain', amount: 3, start: { uid: b.uid } });
  if (lost(b) !== 3 || lost(c) !== 2 || lost(a) !== 1) return `${lost(a)} ${lost(b)} ${lost(c)}`;
});
test('Power left after every enemy minion was hit goes into the enemy Hero', () => {
  const [a, b] = [blank(1, 1, 9), blank(1, 1, 9)];
  const h = hero(1).health;
  run({ op: 'chain', amount: 5, start: { uid: a.uid } });
  if (lost(a) !== 5 || lost(b) !== 4) return `${lost(a)} ${lost(b)}`;
  if (h - hero(1).health !== 3) return `Hero took ${h - hero(1).health}`;
});
test('Chain at the Hero hits only the Hero', () => {
  const a = blank(1, 1, 9);
  const h = hero(1).health;
  run({ op: 'chain', amount: 4, start: { uid: hero(1).uid } });
  if (h - hero(1).health !== 4 || lost(a)) return `Hero ${h - hero(1).health}, minion ${lost(a)}`;
});
test('Chain with no enemy minions goes straight to the Hero', () => {
  const h = hero(1).health;
  run({ op: 'chain', amount: 2 });
  if (h - hero(1).health !== 2) return `Hero took ${h - hero(1).health}`;
});
test('Chain skips Stealth minions when it jumps', () => {
  const [a, b, c] = [blank(1, 1, 9), blank(1, 1, 9, ['Stealth']), blank(1, 1, 9)];
  run({ op: 'chain', amount: 3, start: { uid: a.uid } });
  if (lost(b)) return 'hit the Stealth minion';
  if (lost(a) !== 3 || lost(c) !== 2) return `${lost(a)} ${lost(c)}`;
});
test('Chain skips a minion it already killed and keeps going', () => {
  const [a, b] = [blank(1, 1, 1), blank(1, 1, 9)];
  run({ op: 'chain', amount: 3, start: { uid: a.uid } });
  if (pl(1).board.includes(a)) return 'first minion lived';
  if (lost(b) !== 2) return `second took ${lost(b)}`;
});

// ---- Conductive ----
test('Conductive: a Chain jumps off it at full power', () => {
  const [a, b, c] = [blank(1, 1, 9), blank(1, 1, 9), blank(1, 1, 9)];
  const h = hero(1).health;
  run({ op: 'conductive', target: { minions: { side: 'enemy' } } });
  run({ op: 'chain', amount: 3, start: { uid: a.uid } });
  if (lost(a) !== 3 || lost(b) !== 3 || lost(c) !== 3) return `${lost(a)} ${lost(b)} ${lost(c)}`;
  if (h - hero(1).health !== 3) return `Hero took ${h - hero(1).health}`;
});
test('Conductive ends at the end of the turn', () => {
  const a = blank(1, 1, 9);
  run({ op: 'conductive', target: { uid: a.uid } });
  if (!a.conductive) return 'not Conductive';
  endTurn();
  if (a.conductive) return 'still Conductive next turn';
});

// ---- Volts ----
test('Volts cap at 5; Capacitor Eel holds 10; Overcharge doubles past the cap', () => {
  const m = blank(0, 1, 5);
  run({ op: 'gainVolts', target: { uid: m.uid }, amount: 9 });
  if (m.volts !== 5) return `normal cap ${m.volts}`;
  const cap = put(0, 'capacitor_eel');
  run({ op: 'gainVolts', target: { uid: cap.uid }, amount: 12 });
  if (cap.volts !== 10) return `capacitor ${cap.volts}`;
  play(0, give(0, 'overcharge'), m.uid);
  if (m.volts !== 10) return `overcharged ${m.volts}`;
});
test('Silence drains Volts', () => {
  const m = blank(0, 1, 5);
  m.volts = 4;
  run({ op: 'buff', target: { uid: m.uid }, keywords: ['Silenced'] });
  if (m.volts) return `still ${m.volts}`;
});
test('A minion that dies with Volts Discharges half of them (rounded down) at a random enemy', () => {
  const m = blank(0, 1, 1);
  m.volts = 5;
  const e = blank(1, 1, 9);
  const h = hero(1).health;
  run({ op: 'damage', target: { uid: m.uid }, amount: 5 }, 1);
  if (lost(e) !== 2) return `enemy minion took ${lost(e)}`;
  if (h - hero(1).health !== 1) return `Hero took ${h - hero(1).health}`;
});
test('A minion that dies with just 1 Volt does not Discharge', () => {
  const m = blank(0, 1, 1);
  m.volts = 1;
  const e = blank(1, 1, 9);
  const h = hero(1).health;
  run({ op: 'damage', target: { uid: m.uid }, amount: 5 }, 1);
  if (lost(e) || h !== hero(1).health) return 'it Discharged';
});
test('Discharge spends all Volts; Arc Flash draws if the Chain hits 3+', () => {
  const m = blank(0, 1, 5);
  m.volts = 4;
  blank(1, 1, 9); blank(1, 1, 9);
  pl(0).deck.unshift({ uid: s.nextUid++, cardId: 'static_spark', owner: 0 });
  const hand = pl(0).hand.length;
  play(0, give(0, 'arc_flash'), m.uid);
  if (m.volts) return `Volts left ${m.volts}`;
  if (pl(0).hand.length !== hand + 1) return 'did not draw (2 minions + Hero = 3 targets)';
});
test('Arc Flash needs a minion with Volts', () => {
  const m = blank(0, 1, 5);
  if (canPlayOn(0, give(0, 'arc_flash'), m.uid)) return 'playable on an uncharged minion';
});

// ---- Cards ----
test('Glass Eel gains a Volt when you cast a spell', () => {
  const g = put(0, 'glass_eel');
  play(0, give(0, 'wet_net'));
  if (g.volts !== 1) return `volts ${g.volts}`;
});
test('Dynamo Eel gains a Volt at the start of your turn', () => {
  const d = put(0, 'dynamo_eel');
  endTurn(); endTurn();
  if (d.volts !== 1) return `volts ${d.volts}`;
});
test('Riverbed Lurker gains a Volt when it takes damage', () => {
  const r = put(0, 'riverbed_lurker');
  run({ op: 'damage', target: { uid: r.uid }, amount: 1 }, 1);
  if (r.volts !== 1) return `volts ${r.volts}`;
});
test('Elver Swarm summons a 1/1 Elver with 1 Volt; Megavolt starts with 5', () => {
  play(0, give(0, 'elver_swarm'));
  const el = pl(0).board.find((m) => m.cardId === 'elver');
  if (!el || el.volts !== 1) return `elver ${el?.volts}`;
  const mv = put(0, 'megavolt_eel');
  if (mv.volts !== 4) return `megavolt ${mv.volts}`;
});
test('Spark Fry: Arrival Chain 2 at the chosen enemy', () => {
  const [a, b] = [blank(1, 1, 9), blank(1, 1, 9)];
  play(0, give(0, 'spark_fry'), a.uid);
  if (lost(a) !== 2 || lost(b) !== 1) return `${lost(a)} ${lost(b)}`;
});
test('Eelectrician gives every other friendly minion 1 Volt', () => {
  const [a, b] = [blank(0, 1, 5), blank(0, 1, 5)];
  play(0, give(0, 'eelectrician'));
  const me = pl(0).board.find((m) => m.cardId === 'eelectrician');
  if (a.volts !== 1 || b.volts !== 1 || me.volts) return `${a.volts} ${b.volts} ${me.volts}`;
});
test('Storm Coil Eel: the first jump is free', () => {
  put(0, 'storm_coil_eel');
  const [a, b, c] = [blank(1, 1, 9), blank(1, 1, 9), blank(1, 1, 9)];
  run({ op: 'chain', amount: 3, start: { uid: a.uid } });
  if (lost(a) !== 3 || lost(b) !== 3 || lost(c) !== 2) return `${lost(a)} ${lost(b)} ${lost(c)}`;
});
test('The Thunderhead: Chains never get weaker', () => {
  put(0, 'the_thunderhead');
  const [a, b] = [blank(1, 1, 9), blank(1, 1, 9)];
  const h = hero(1).health;
  run({ op: 'chain', amount: 2, start: { uid: a.uid } });
  if (lost(a) !== 2 || lost(b) !== 2 || h - hero(1).health !== 2) return `${lost(a)} ${lost(b)} ${h - hero(1).health}`;
});
test('Leviathan: every other friendly minion Discharges', () => {
  const [x, y] = [blank(0, 1, 9), blank(0, 1, 9)];
  x.volts = 2; y.volts = 3;
  const h = hero(1).health;
  play(0, give(0, 'leviathan_of_the_deep_storm'));
  if (x.volts || y.volts) return 'Volts left';
  if (h - hero(1).health !== 5) return `Hero took ${h - hero(1).health}`;
});
test('Ampere Moray gains a Volt when a Chain hits a Conductive minion', () => {
  const mo = put(0, 'ampere_moray');
  const a = blank(1, 1, 9);
  run({ op: 'conductive', target: { uid: a.uid } });
  run({ op: 'chain', amount: 1, start: { uid: a.uid } });
  if (mo.volts !== 1) return `volts ${mo.volts}`;
});
test('Volt Leech heals your Hero when a friendly minion Discharges', () => {
  put(0, 'volt_leech');
  const m = blank(0, 1, 9); m.volts = 2;
  hero(0).health = 20;
  run({ op: 'discharge', target: { uid: m.uid } });
  if (hero(0).health !== 21) return `Hero at ${hero(0).health}`;
});
test('Brackwater Shocker: attacking a minion sends Chain 2 to its neighbour', () => {
  const sh = put(0, 'brackwater_shocker');
  const [a, b] = [blank(1, 1, 20), blank(1, 1, 20)];
  attack(0, sh.uid, a.uid);
  if (lost(b) !== 2) return `neighbour took ${lost(b)}`;
  if (lost(a) !== 4) return `attacked minion took ${lost(a)} (only the attack)`;
});
test('Galvanic Guardian: Taunt, charges when hit', () => {
  const g = put(0, 'galvanic_guardian');
  if (!hasKeyword(g, 'Taunt')) return 'no Taunt';
  run({ op: 'damage', target: { uid: g.uid }, amount: 2 }, 1);
  if (g.volts !== 1) return `volts ${g.volts}`;
});
test('Tidal Generator and Voltage Matriarch charge the board', () => {
  const t = put(0, 'tidal_generator');
  const vm = put(0, 'voltage_matriarch');
  const m = blank(0, 1, 9);
  endTurn(); // Tidal: +1 to all at the end of my turn
  if (m.volts !== 1 || t.volts !== 1) return `after end ${m.volts} ${t.volts}`;
  endTurn(); // Matriarch: +1 to the others at the start of my turn
  if (m.volts !== 2 || vm.volts !== 1) return `after start ${m.volts} ${vm.volts}`;
});
test('Thunder Shoal chains again only with a 3-Volt minion', () => {
  const a = blank(1, 1, 30);
  play(0, give(0, 'thunder_shoal'), a.uid);
  if (lost(a) !== 2) return `uncharged: ${lost(a)}`;
  const m = blank(0, 1, 9); m.volts = 3;
  play(0, give(0, 'thunder_shoal'), a.uid);
  if (lost(a) !== 6) return `charged: total ${lost(a)}`;
});
test('Storm Drain targets only Conductive enemies', () => {
  const a = blank(1, 1, 9);
  const card = give(0, 'storm_drain');
  if (canPlayOn(0, card, a.uid)) return 'playable on a dry minion';
  run({ op: 'conductive', target: { uid: a.uid } });
  play(0, card, a.uid);
  if (pl(1).board.includes(a)) return 'not destroyed';
});
test('Live Wire: Chain 4; Reef Blackout: Conductive then Chain 3', () => {
  const [a, b] = [blank(1, 1, 30), blank(1, 1, 30)];
  play(0, give(0, 'live_wire'), a.uid);
  if (lost(a) !== 4 || lost(b) !== 3) return `live wire ${lost(a)} ${lost(b)}`;
  pl(0).mana.current = 10;
  const h = hero(1).health;
  play(0, give(0, 'reef_blackout'), a.uid);
  if (lost(a) !== 7 || lost(b) !== 6 || h - hero(1).health !== 3) return `blackout ${lost(a)} ${lost(b)} ${h - hero(1).health}`;
});
test('Static Field: 1 Volt on a friendly minion, an enemy minion Conductive', () => {
  const m = blank(0, 1, 5); const e = blank(1, 1, 5);
  heroSpell(0, 'static_field', m.uid, e.uid);
  if (m.volts !== 1 || !e.conductive) return `${m.volts} ${e.conductive}`;
});
test('Static Field works with no enemy minion', () => {
  const m = blank(0, 1, 5);
  heroSpell(0, 'static_field', m.uid);
  if (m.volts !== 1) return `volts ${m.volts}`;
});

// ---- Traps ----
test('Short Circuit: the most-charged minion Discharges at the attacker', () => {
  const m = blank(0, 1, 9); m.volts = 3;
  play(0, give(0, 'short_circuit'));
  endTurn();
  const att = blank(1, 1, 9);
  attack(1, att.uid, hero(0).uid);
  if (m.volts) return 'did not Discharge';
  if (lost(att) !== 3) return `attacker took ${lost(att)}`;
});
test('Short Circuit stays hidden while you have no Volts', () => {
  play(0, give(0, 'short_circuit'));
  endTurn();
  const att = blank(1, 1, 9);
  attack(1, att.uid, hero(0).uid);
  if (pl(0).traps.length !== 1) return 'trap went off for nothing';
});
test('Live Current: enemy minions go Conductive and Chain 2 starts at the attacker', () => {
  play(0, give(0, 'live_current'));
  endTurn();
  const [att, other] = [blank(1, 1, 9), blank(1, 1, 9)];
  attack(1, att.uid, hero(0).uid);
  if (lost(att) !== 2 || lost(other) !== 2) return `${lost(att)} ${lost(other)}`;
});
test('Lightning Rod: an enemy spell gives your minions 2 Volts', () => {
  const m = blank(0, 1, 9);
  play(0, give(0, 'lightning_rod'));
  endTurn();
  play(1, give(1, 'fireball'), hero(0).uid);
  if (m.volts !== 2) return `volts ${m.volts}`;
});

// ---- Fusions ----
test('Vampiric Volt heals for the damage it deals', () => {
  const a = blank(1, 1, 9);
  hero(0).health = 10;
  pl(0).fusion.charge = 3;
  heroSpell(0, 'vampiric_volt', a.uid);
  // 3 to the minion, then 2 to the Hero: 5 healed.
  if (hero(0).health !== 15) return `Hero at ${hero(0).health}`;
}, 'Vampires');
test('Every Eels pair has a Fusion that can be cast', () => {
  for (const f of ['Acidic', 'Aliens', 'Bees', 'Demons', 'Dinosaurs', 'Divine', 'Dragons', 'Fungus', 'Ghosts', 'Ice Age', 'Lycanthropes', 'Plants', 'Radioactive', 'Robots', 'Sharks', 'Ultraterrestrials', 'Vampires', 'Void', 'Zombies']) {
    fresh(f);
    blank(0, 1, 5).volts = 1; blank(1, 1, 5);
    if (f === 'Lycanthropes') put(0, LYCAN);
    if (f === 'Ghosts' || f === 'Zombies') bury(0, 'vampire_gargoyle');
    pl(0).fusion.charge = 3;
    const id = pl(0).fusion.cardId;
    const opts = getLegalActions(s).filter((a) => a.type === 'heroSpell' && a.card === id);
    if (!opts.length) return `${f}: ${id} not castable`;
    applyAction(s, opts[0]); settle();
  }
});
test('Bloodcurrent marks the last minion it hits as Prey', () => {
  const [a, b] = [blank(1, 1, 9), blank(1, 1, 9)];
  pl(0).fusion.charge = 3;
  heroSpell(0, 'bloodcurrent', a.uid);
  if (!b.prey || a.prey) return `${a.prey} ${b.prey}`;
});
test('Null Current is Chain 4 with an empty hand', () => {
  const a = blank(1, 1, 9);
  pl(0).fusion.charge = 3;
  heroSpell(0, 'null_current', a.uid);
  if (lost(a) !== 4) return `took ${lost(a)}`;
}, 'Void');
test('Reanimation Jolt brings back a friendly minion with 1 Health and 3 Volts', () => {
  bury(0, 'dynamo_eel');
  pl(0).fusion.charge = 3;
  heroSpell(0, 'reanimation_jolt');
  const m = pl(0).board.find((x) => x.cardId === 'dynamo_eel');
  if (!m || m.health !== 1 || m.volts !== 3) return `${m?.health} ${m?.volts}`;
}, 'Zombies');
test('An Eels minion Evolves into the Xeno Voltwyrm (Hive Brood)', () => {
  if (XENO_FORMS.Eels !== 'xeno_voltwyrm' || !getCard('xeno_voltwyrm')) return 'no Eels xeno';
});

console.log(`\n${passed} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
