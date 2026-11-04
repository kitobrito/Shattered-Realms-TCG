// Rules tests for the Plants' Harvest Moon expansion (Pumpkins and Shell). Each test sets up a small board,
// plays the card through the real engine, and checks the outcome.   node tools/test-harvest-moon.mjs

import { LEGENDARY, buildDeck } from '../src/cards/index.js';
import { resolveEffect } from '../src/engine/effects.js';
import { addToHand, costOf, effectiveAttack, hasKeyword, heal, radiationOf, summonMinion } from '../src/engine/core.js';
import { applyAction, createGame, getLegalActions } from '../src/engine/engine.js';
import { getCard } from '../src/engine/registry.js';
import { ART } from '../src/cards/art-manifest.js';
import { readdirSync, readFileSync } from 'node:fs';

let s;
let failures = 0;
let passed = 0;

// Player 0 runs Plants (+ `partner`); player 1 runs `foe`.
function fresh(partner = 'Vampires', foe = ['Dragons', 'Robots']) {
  const fa = ['Plants', partner];
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
  } catch (e) { failures++; console.log(`FAIL ${name}: threw ${e.stack.split('\n').slice(0, 3).join(' | ')}`); }
}

const foe = (atk = 3, hp = 4, p = 1) => { const m = put(p, 'vampire_gargoyle'); m.keywords = []; m.attack = atk; m.health = hp; m.maxHealth = hp; return m; };
const held = (m) => m.shell ?? [];
const plant = (p = 0) => put(p, 'treant'); // a 5/5 Plant with Taunt

test('Shell: a Pumpkin tucks the chosen Plant inside (off the board, untargetable)', () => {
  const t = plant();
  play(0, give(0, 'gourd_sentry'), t.uid);
  const g = find(0, 'gourd_sentry');
  if (onBoard(t)) return 'treant still on the board';
  if (held(g)[0] !== t) return 'not inside the sentry';
  if (pl(0).board.length !== 1) return `board ${pl(0).board.length}`;
  const e = foe(); e.sick = false; endTurn();
  if (getLegalActions(s).some((a) => a.type === 'attack' && a.defender === t.uid)) return 'held Plant can be attacked';
});

test('Shell: held Plant grows +1/+1 at the start of your turn only', () => {
  const t = plant();
  play(0, give(0, 'gourd_sentry'), t.uid);
  endTurn();
  if (t.attack !== 5) return `grew on enemy turn ${t.attack}`;
  endTurn();
  if (t.attack !== 6 || t.health !== 6 || t.maxHealth !== 6) return `treant ${t.attack}/${t.health}`;
});

test('Shell: when the Pumpkin dies the Plant bursts out where it stood, ready to attack', () => {
  const a = put(0, 'seedling');
  const t = plant();
  play(0, give(0, 'gourd_sentry'), t.uid);
  const b = put(0, 'seedling');
  const g = find(0, 'gourd_sentry');
  endTurn(); endTurn(); // it grows to 6/6 and is ready
  g.destroyed = true; play(0, give(0, 'sticky_sundew'), foe(1, 9).uid); // any action runs the deaths step
  const i = pl(0).board.indexOf(t);
  if (i < 0) return 'treant did not come back';
  if (pl(0).board[i - 1] !== a || pl(0).board[i + 1] !== b) return `wrong spot ${i}`;
  if (!getLegalActions(s).some((x) => x.type === 'attack' && x.attacker === t.uid)) return 'cannot attack';
});

test('Shell: a bounced Pumpkin lets its Plant out', () => {
  const t = plant();
  play(0, give(0, 'gourd_sentry'), t.uid);
  const g = find(0, 'gourd_sentry');
  resolveEffect(s, { op: 'returnToHand', target: { uid: g.uid } }, { self: null, controller: 1 });
  if (!onBoard(t)) return 'treant lost';
  if (held(g).length) return 'still held';
});

test('Shell: a Pumpkin played with no other Plant is just played', () => {
  const inst = give(0, 'gourd_sentry');
  if (!canPlay(0, inst)) return 'cannot play';
  play(0, inst);
  if (!find(0, 'gourd_sentry')) return 'not on board';
});

test('Shell: a Pumpkin cannot tuck another Pumpkin', () => {
  const p1 = put(0, 'gourd_sentry');
  const inst = give(0, 'candlewick_pumpkin');
  if (getLegalActions(s).some((a) => a.type === 'play' && a.card === inst.uid && a.target === p1.uid)) return 'Pumpkin offered as a target';
});

test('Pumpkin Patch: a 0/3 Pumpkin Sprout with a Seedling inside', () => {
  play(0, give(0, 'pumpkin_patch'));
  const sp = find(0, 'pumpkin_sprout');
  if (!sp || sp.attack !== 0 || sp.health !== 3) return 'no sprout';
  if (held(sp)[0]?.cardId !== 'seedling') return 'no seedling inside';
  if (pl(0).board.length !== 1) return 'seedling on the board';
});

test("Jack-o'-Lantern Brute has +2 Attack only while holding a Plant", () => {
  const brute = put(0, 'jack_o_lantern_brute');
  if (effectiveAttack(brute) !== 3) return `empty ${effectiveAttack(brute)}`;
  const t = plant();
  play(0, give(0, 'jack_o_lantern_brute'), t.uid);
  const b2 = pl(0).board.find((m) => m.cardId === 'jack_o_lantern_brute' && m !== brute);
  if (effectiveAttack(b2) !== 5) return `holding ${effectiveAttack(b2)}`;
});

test('Hollow Vine Creeper: Pumpkin +2 Health, the Plant inside +1/+1', () => {
  const t = plant();
  play(0, give(0, 'gourd_sentry'), t.uid);
  const g = find(0, 'gourd_sentry');
  play(0, give(0, 'hollow_vine_creeper'), g.uid);
  if (g.health !== 8) return `sentry ${g.health}`;
  if (t.attack !== 6 || t.health !== 6) return `treant ${t.attack}/${t.health}`;
});

test('Candlewick Pumpkin heals the Plant inside at the end of your turn', () => {
  const t = plant(); t.health = 1;
  play(0, give(0, 'candlewick_pumpkin'), t.uid);
  endTurn();
  if (t.health !== 3) return `treant hp ${t.health}`;
});

test('Harvest Scarecrow gives Rush to a Plant bursting out', () => {
  put(0, 'harvest_scarecrow');
  play(0, give(0, 'pumpkin_patch'));
  const sp = find(0, 'pumpkin_sprout');
  const sd = held(sp)[0];
  sp.destroyed = true; play(0, give(0, 'sticky_sundew'), foe(1, 9).uid);
  if (!onBoard(sd)) return 'seedling not out';
  if (!hasKeyword(sd, 'Rush')) return 'no Rush';
});

test('Rotting Carve: Pumpkin destroyed, Plant out +3/+3, hits a random enemy for its Attack', () => {
  const t = plant();
  play(0, give(0, 'gourd_sentry'), t.uid);
  const g = find(0, 'gourd_sentry');
  const hp = pl(1).hero.health;
  play(0, give(0, 'rotting_carve'), g.uid);
  if (onBoard(g)) return 'sentry survived';
  if (!onBoard(t) || t.attack !== 8 || t.health !== 8) return `treant ${t.attack}/${t.health}`;
  if (pl(1).hero.health !== hp - 8) return `enemy hero ${hp} -> ${pl(1).hero.health}`;
});

test('Moonlit Gourd Choir gives other Pumpkins +1/+1 (not itself)', () => {
  const g = put(0, 'gourd_sentry');
  const c = put(0, 'moonlit_gourd_choir');
  play(0, give(0, 'sticky_sundew'), foe(1, 9).uid);
  if (effectiveAttack(g) !== 2 || g.maxHealth !== 7) return `sentry ${effectiveAttack(g)}/${g.maxHealth}`;
  if (effectiveAttack(c) !== 2) return `choir ${effectiveAttack(c)}`;
});

test('The Great Pumpkin holds 3 Plants, grows them +2/+2, and all burst out on death', () => {
  const a = plant(), b = put(0, 'seedling'), c = put(0, 'snapjaw_sprout'), d = put(0, 'seedling');
  play(0, give(0, 'the_great_pumpkin'), a.uid);
  const gp = find(0, 'the_great_pumpkin');
  if (held(gp).length !== 3 || held(gp)[0] !== a) return `held ${held(gp).length}`;
  if (pl(0).board.length !== 2) return `board ${pl(0).board.length}`;
  endTurn(); endTurn();
  if (a.attack !== 7) return `treant ${a.attack}`;
  gp.destroyed = true; play(0, give(0, 'sticky_sundew'), foe(1, 9).uid);
  if (![a, b, c, d].every(onBoard)) return 'not all out';
});

test('Hallowroot reaps a held Plant, gains its stats, leaves a Seedling inside; buffs a Plant after attacking', () => {
  const t = plant();
  play(0, give(0, 'gourd_sentry'), t.uid);
  const g = find(0, 'gourd_sentry');
  play(0, give(0, 'hallowroot_the_headless_harvester'), g.uid);
  const h = find(0, 'hallowroot_the_headless_harvester');
  if (h.attack !== 11 || h.health !== 10) return `hallowroot ${h.attack}/${h.health}`;
  if (held(g)[0]?.cardId !== 'seedling') return 'no seedling inside';
  const e = foe(1, 20);
  const before = g.attack + h.attack;
  attack(0, h.uid, e.uid);
  if (g.attack + h.attack !== before + 2) return 'no +2/+2 after attacking';
});

test('Hallowroot cannot target an empty Pumpkin', () => {
  const g = put(0, 'gourd_sentry');
  const inst = give(0, 'hallowroot_the_headless_harvester');
  if (getLegalActions(s).some((a) => a.type === 'play' && a.card === inst.uid && a.target === g.uid)) return 'empty Pumpkin offered';
});

test('Full board: a Plant with no room to burst out is crushed, not duplicated', () => {
  const t = plant();
  play(0, give(0, 'gourd_sentry'), t.uid);
  const g = find(0, 'gourd_sentry');
  while (pl(0).board.length < s.rules.maxBoardSize) put(0, 'seedling');
  resolveEffect(s, { op: 'carvePumpkin', target: { uid: g.uid } }, { self: null, controller: 0 });
  play(0, give(0, 'sticky_sundew'), foe(1, 9).uid);
  if (pl(0).board.length > s.rules.maxBoardSize) return 'board overflow';
});

test('A held Plant is out of play for board-wide effects (AoE does not hit it)', () => {
  const t = plant();
  play(0, give(0, 'gourd_sentry'), t.uid);
  resolveEffect(s, { op: 'damage', target: { minions: { side: 'any' } }, amount: 3 }, { self: null, controller: 1 });
  if (t.health !== 5) return `treant hp ${t.health}`;
});

test('Every Harvest Moon card has art, is an unlockable extra in the Harvest Moon set; legendaries flagged', () => {
  const ids = ['pumpkin_patch', 'gourd_sentry', 'jack_o_lantern_brute', 'hollow_vine_creeper', 'candlewick_pumpkin', 'harvest_scarecrow', 'rotting_carve', 'moonlit_gourd_choir', 'the_great_pumpkin', 'hallowroot_the_headless_harvester'];
  const missing = [...ids, 'pumpkin_sprout'].filter((id) => !ART[id]);
  if (missing.length) return `no art: ${missing}`;
  const bad = ids.filter((id) => !getCard(id).extra || getCard(id).set !== 'Harvest Moon');
  if (bad.length) return `not in set: ${bad}`;
  for (const id of ['the_great_pumpkin', 'hallowroot_the_headless_harvester']) if (!LEGENDARY.has(id)) return `${id} not legendary`;
});

test('No two cards in the game share an id', () => {
  const ids = [];
  for (const f of readdirSync(new URL('../src/cards/', import.meta.url))) {
    if (f.endsWith('.js')) ids.push(...[...readFileSync(new URL(`../src/cards/${f}`, import.meta.url), 'utf8').matchAll(/\bid: '([a-z0-9_]+)'/g)].map((m) => m[1]));
  }
  const dupes = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
  if (dupes.length) return `shared ids: ${dupes}`;
});

console.log(`\n${passed} passed, ${failures} failed`);
if (failures) process.exit(1);
