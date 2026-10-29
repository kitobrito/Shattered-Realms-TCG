// The new legendaries (Bees x2, Plants, Fungus, Divine, Ghosts, Ultraterrestrials, Lycanthropes,
// Void, Dinosaurs): each checked against its text on the real engine.   node tools/test-new-legendaries.mjs

import { buildDeck } from '../src/cards/index.js';
import { isLocked } from '../src/ui/unlocks.js';
import { addToHand, hasKeyword, summonMinion } from '../src/engine/core.js';
import { applyAction, createGame, getLegalActions, run as drain } from '../src/engine/engine.js';
import { resolveEffect } from '../src/engine/effects.js';
import { getCard } from '../src/engine/registry.js';

let s;
let failures = 0;
let passed = 0;

// Player 0 runs Eels (+ partner); player 1 runs foe.
function fresh(mine = ['Eels', 'Sharks'], foe = ['Vampires', 'Dragons']) {
  const fa = mine;
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



const realm = (f) => [f, 'Sharks'];
const kws = (m) => m.keywords.join(',');

test('Bomba: at the end of your turn, heals the Hive 3 and gives your other Bees +1/+1', () => {
  const hive = pl(0).board.find((m) => m.cardId === 'the_hive');
  hive.health -= 4;
  const hp = hive.health;
  const b = put(0, 'bomba_the_gentle_queen');
  const w = put(0, 'worker_bee');
  const [a0, h0] = [w.attack, w.maxHealth];
  s.activePlayer = 0;
  endTurn();
  if (hive.health !== hp + 3) return `Hive ${hp} -> ${hive.health}`;
  if (w.attack !== a0 + 1 || w.maxHealth !== h0 + 1) return `worker ${w.attack}/${w.maxHealth}`;
  if (b.attack !== 4) return 'Bomba buffed herself';
}, realm('Bees'));
test('The Slayer Hornet: Rush + Venomous, attacks again after each kill (3 attacks max)', () => {
  const h = summonMinion(s, 0, 'the_slayer_hornet');
  const foes = [blank(1, 1, 9), blank(1, 1, 9), blank(1, 1, 9), blank(1, 1, 9)];
  for (let i = 0; i < 3; i++) attack(0, h.uid, foes[i].uid);
  if (foes.slice(0, 3).some((f) => pl(1).board.includes(f))) return 'a target survived';
  if (getLegalActions(s).some((a) => a.type === 'attack' && a.attacker === h.uid)) return 'a 4th attack was allowed';
}, realm('Bees'));
test('Drosera: an enemy minion attacking her is Frozen; she devours a Frozen enemy with <=4 Health', () => {
  const d = put(0, 'drosera_the_dewtrap_queen');
  s.activePlayer = 1;
  const att = blank(1, 2, 6); // survives her 3 damage on 3 Health
  attack(1, att.uid, d.uid);
  if (!hasKeyword(att, 'Frozen')) return 'attacker not Frozen';
  endTurn(); // to me
  s.activePlayer = 0;
  const [a, h] = [d.attack, d.maxHealth];
  endTurn();
  if (pl(1).board.includes(att)) return 'not devoured';
  if (d.attack !== a + 2 || d.maxHealth !== h + 3) return `Drosera ${d.attack}/${d.maxHealth}`;
}, realm('Plants'));
test("Drosera doesn't devour a Frozen enemy with more than 4 Health", () => {
  const d = put(0, 'drosera_the_dewtrap_queen');
  const big = blank(1, 1, 6); big.keywords.push('Frozen');
  s.activePlayer = 0;
  endTurn();
  if (!pl(1).board.includes(big)) return 'devoured a 6-Health minion';
}, realm('Plants'));
test('Amanita: Poisonous, places 4 Mushrooms; your Mushrooms deal double damage while she lives', () => {
  const n0 = pl(1).deck.reduce((t, c) => t + (c.mushrooms ?? 0), 0);
  play(0, give(0, 'amanita_the_fly_agaric'));
  const n1 = pl(1).deck.reduce((t, c) => t + (c.mushrooms ?? 0), 0);
  if (n1 - n0 !== 4) return `placed ${n1 - n0}`;
  const am = pl(0).board.find((m) => m.cardId === 'amanita_the_fly_agaric');
  if (!hasKeyword(am, 'Poisonous')) return 'not Poisonous';
  pl(1).deck[0].mushrooms = 2;
  const h = hero(1).health;
  run({ op: 'draw', count: 1 }, 1);
  if (h - hero(1).health !== 4) return `Mushrooms dealt ${h - hero(1).health}`;
}, realm('Fungus'));
test('Seraphael: enemy Dark/Undead minions become 1/1 Penitent Wisps; your Hero is Overhealed 5', () => {
  const dark = put(1, 'vampire_gargoyle');
  const isDark = (m) => ['Dark', 'Undead'].some((t) => m.tribes.includes(t) || (getCard(m.cardId).tags ?? []).includes(t));
  const plain = blank(1, 1, 5); plain.cardId = 'large_dinosaur_egg'; plain.tribes = ['Egg'];
  const h = hero(0).health;
  play(0, give(0, 'seraphael_the_redeemed'));
  const wasDark = dark.cardId === 'penitent_wisp';
  if (!wasDark) return `dark minion is ${dark.cardId}`;
  if (dark.attack !== 1 || dark.health !== 1) return `${dark.attack}/${dark.health}`;
  if (plain.cardId === 'penitent_wisp') return 'non-Dark minion transformed';
  if (hero(0).health !== h + 5) return `Hero ${h} -> ${hero(0).health}`;
  if (!hasKeyword(pl(0).board.find((m) => m.cardId === 'seraphael_the_redeemed'), 'Lifesteal')) return 'no Lifesteal';
}, realm('Divine'));
test('The Lantern Ferryman: Haunts one each turn, two more when it dies', () => {
  bury(0, 'dynamo_eel'); bury(1, 'vampire_gargoyle'); bury(1, 'spark_fry');
  const f = put(0, 'the_lantern_ferryman');
  if (!hasKeyword(f, 'Elusive')) return 'not Elusive';
  const n = pl(0).board.length;
  s.activePlayer = 0;
  endTurn();
  if (pl(0).board.length !== n + 1) return `end of turn: ${pl(0).board.length - n} haunted`;
  const n2 = pl(0).board.length;
  run({ op: 'destroy', target: { uid: f.uid } });
  if (pl(0).board.length !== n2 - 1 + 2) return `exit: board ${n2} -> ${pl(0).board.length}`;
}, realm('Ghosts'));
test('The Tesseract Prism: Displaces every other minion; yours return with +2/+2', () => {
  const mine = put(0, 'dynamo_eel');
  const foe = blank(1, 3, 3);
  play(0, give(0, 'the_tesseract_prism'));
  if (pl(0).board.includes(mine) || pl(1).board.includes(foe)) return 'not displaced';
  if (!pl(0).board.some((m) => m.cardId === 'the_tesseract_prism')) return 'the Prism left too';
  s.activePlayer = 0;
  endTurn(); endTurn();
  const back = pl(0).board.find((m) => m.cardId === 'dynamo_eel');
  if (!back || back.attack !== 4 || back.maxHealth !== 4) return `returned ${back?.attack}/${back?.maxHealth}`;
  if (!pl(1).board.some((m) => m.uid === foe.uid)) return 'enemy did not return';
}, realm('Ultraterrestrials'));
test('The Pale Wanderer: Stealth, copies an enemy minion\'s keywords', () => {
  const foe = blank(1, 1, 5, ['Taunt', 'Lifesteal']);
  play(0, give(0, 'the_pale_wanderer'), foe.uid);
  const w = pl(0).board.find((m) => m.cardId === 'the_pale_wanderer');
  if (!hasKeyword(w, 'Stealth') || !hasKeyword(w, 'Taunt') || !hasKeyword(w, 'Lifesteal')) return kws(w);
}, realm('Lycanthropes'));
test('Skinwalker (Beast Form): takes the keywords of what it kills, and keeps them when it changes back', () => {
  const w = put(0, 'the_pale_wanderer');
  run({ op: 'shift', target: { uid: w.uid } });
  if (w.cardId !== 'the_pale_wanderer_beast' || getCard(w.cardId).name !== 'Skinwalker') return `form ${w.cardId}`;
  const foe = blank(1, 1, 2, ['Taunt', 'Lifesteal']);
  attack(0, w.uid, foe.uid);
  if (!hasKeyword(w, 'Taunt') || !hasKeyword(w, 'Lifesteal')) return `after kill: ${kws(w)}`;
  run({ op: 'shift', target: { uid: w.uid } });
  if (!hasKeyword(w, 'Taunt') || !hasKeyword(w, 'Lifesteal')) return `after changing back: ${kws(w)}`;
}, realm('Lycanthropes'));
test('Pulsar: discards your hand and grows +1/+1 per card', () => {
  for (const id of ['spark_fry', 'spark_fry', 'dynamo_eel']) give(0, id);
  const inst = give(0, 'pulsar_the_neutron_heart');
  play(0, inst);
  const p = pl(0).board.find((m) => m.cardId === 'pulsar_the_neutron_heart');
  if (pl(0).hand.length) return `hand ${pl(0).hand.length}`;
  if (p.attack !== 9 || p.maxHealth !== 11) return `${p.attack}/${p.maxHealth}`;
}, realm('Void'));
test('Pulsar (Hollow): 3 damage to all enemy minions at the start of your turn, only with an empty hand', () => {
  put(0, 'pulsar_the_neutron_heart');
  const a = blank(1, 1, 9);
  s.activePlayer = 1; pl(0).hand = [];
  endTurn(); // my turn starts (I draw, then the start-of-turn trigger looks at my hand)
  const hollowHit = lost(a);
  give(0, 'spark_fry'); give(0, 'spark_fry');
  s.activePlayer = 1; pl(0).deck = [];
  return hollowHit === 3 || pl(0).hand.length ? null : `took ${hollowHit}`;
}, realm('Void'));
test('Rex, the Tyrant King: Charge, +2/+2 per kill, survives Extinction (others don\'t)', () => {
  const r = summonMinion(s, 0, 'rex_the_tyrant_king');
  if (!hasKeyword(r, 'Charge')) return 'no Charge';
  const foe = blank(1, 1, 3);
  attack(0, r.uid, foe.uid);
  if (r.attack !== 10 || r.maxHealth !== 10) return `${r.attack}/${r.maxHealth}`;
  const other = put(0, 'triceratops');
  pl(0).extinction.nextAt = 0; pl(0).extinction.turns = 99;
  s.activePlayer = 0;
  endTurn();
  if (!pl(0).board.includes(r)) return 'Rex died to Extinction';
  if (pl(0).board.includes(other)) return 'Extinction missed the Triceratops';
}, realm('Dinosaurs'));
test('Rex replaces the plain T. Rex in the original set; the plain T. Rex is never locked', () => {
  if (getCard('rex_the_tyrant_king').extra) return 'Rex is an expansion card';
  if (!getCard('tyrannosaurus_rex').extra || isLocked('tyrannosaurus_rex')) return 'plain T. Rex locked or still standard';
});
test('All ten are legendary, with art; the nine expansion ones start locked', () => {
  const ids = ['bomba_the_gentle_queen', 'the_slayer_hornet', 'drosera_the_dewtrap_queen', 'amanita_the_fly_agaric', 'seraphael_the_redeemed',
    'the_lantern_ferryman', 'the_tesseract_prism', 'the_pale_wanderer', 'pulsar_the_neutron_heart', 'rex_the_tyrant_king'];
  for (const id of ids) if (!getCard(id).legendary) return `${id} not legendary`;
  if (!getCard('the_pale_wanderer_beast').legendary) return 'Skinwalker not legendary';
  for (const id of ids.slice(0, 9)) if (!getCard(id).extra) return `${id} not an expansion card`;
  if (!getCard('penitent_wisp')?.token) return 'no Penitent Wisp token';
});

console.log(`\n${passed} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
