// Rules tests for the Aliens' Hive Brood expansion (Implant, Chestbursters, Evolve). Each test sets
// up a small board, plays the card through the real engine, and checks the outcome.
//   node tools/test-aliens-brood.mjs

import { buildDeck } from '../src/cards/index.js';
import { addToHand, effectiveAttack, hasKeyword, summonMinion } from '../src/engine/core.js';
import { applyAction, createGame, getLegalActions } from '../src/engine/engine.js';
import { getCard } from '../src/engine/registry.js';
import { targetCandidates } from '../src/engine/targeting.js';
import { ART } from '../src/cards/art-manifest.js';
import { existsSync } from 'node:fs';

let s;
let failures = 0;
let passed = 0;

// Player 0 runs Aliens (+ Vampires); player 1 runs Dragons + Robots.
function fresh() {
  const fa = ['Aliens', 'Vampires'], fb = ['Dragons', 'Robots'];
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


const IDS = ['facehugger_swarmling', 'ovomorph_clutch', 'parasite_carrier', 'acid_blood_drone', 'hive_stalker', 'brood_tender', 'hive_brute', 'xeno_runner', 'hive_warrior', 'praetorian_guard', 'hive_queen_xaral', 'gestation', 'it_bursts_out', 'acid_blood_spray', 'egg_chamber'];
const TOKENS = ['chestburster', 'xeno_nosferatu', 'xeno_warrior', 'xeno_raptor', 'xeno_thornback', 'spore_xeno', 'xeno_revenant', 'deep_xeno', 'xeno_drake', 'xeno_fiend', 'xeno_seraph', 'xeno_mech', 'glowing_xeno', 'xeno_hornet', 'phantom_xeno', 'void_xeno', 'acid_xeno', 'xeno_drone'];
const kill = (m) => { m.health = 0; m.destroyed = true; endTurn(); }; // dies as the turn ends
const burster = () => find(0, 'chestburster');
const enemy = (id, hp) => { const m = put(1, id); if (hp != null) { m.health = hp; m.maxHealth = hp; } return m; };

test('Facehugger Swarmling Implants an enemy minion', () => {
  const e = enemy('ember_whelp');
  play(0, give(0, 'facehugger_swarmling'));
  if (e.implanted !== 0) return `implanted ${e.implanted}`;
});

test('An Implanted minion dying bursts a 1/1 Chestburster out on your side, remembering its realm', () => {
  const e = enemy('ember_whelp', 1);
  play(0, give(0, 'facehugger_swarmling'));
  const atk = blank(0, 3, 3);
  attack(0, atk.uid, e.uid);
  const b = burster();
  if (!b) return 'no Chestburster';
  if (b.attack !== 1 || b.health !== 1 || b.hostFaction !== 'Dragons') return `${b.attack}/${b.health} host ${b.hostFaction}`;
  if (pl(1).board.some((m) => m.cardId === 'chestburster')) return 'enemy got one too';
});

test('A Chestburster Evolves after 2 of your turns into its host realm\'s Xeno (Dragon: Xeno Drake)', () => {
  const e = enemy('ember_whelp', 1);
  play(0, give(0, 'facehugger_swarmling'));
  attack(0, blank(0, 3, 3).uid, e.uid);
  toNextTurnOf(0);
  if (!burster()) return 'evolved too early';
  toNextTurnOf(0);
  const x = find(0, 'xeno_drake');
  if (!x || burster()) return 'did not evolve into Xeno Drake';
  if (x.attack !== 3 || x.health !== 4 || !hasKeyword(x, 'Charge')) return `${x.attack}/${x.health}`;
});

test('Each realm has its own Xeno; a host with no realm makes a Xeno Drone', () => {
  const v = enemy('vampire_gargoyle', 1);
  play(0, give(0, 'facehugger_swarmling'));
  attack(0, blank(0, 3, 3).uid, v.uid);
  burster().hostFaction = 'Vampires';
  toNextTurnOf(0); toNextTurnOf(0);
  const n = find(0, 'xeno_nosferatu');
  if (!n || !hasKeyword(n, 'Lifesteal')) return 'no Lifesteal Nosferatu';
  fresh();
  const t = enemy('ember_whelp', 1);
  play(0, give(0, 'facehugger_swarmling'));
  attack(0, blank(0, 3, 3).uid, t.uid);
  burster().hostFaction = null;
  toNextTurnOf(0); toNextTurnOf(0);
  if (!find(0, 'xeno_drone')) return 'no Xeno Drone';
});

test('Brood Tender: Chestbursters Evolve after 1 turn', () => {
  put(0, 'brood_tender');
  const e = enemy('ember_whelp', 1);
  play(0, give(0, 'facehugger_swarmling'));
  attack(0, blank(0, 3, 3).uid, e.uid);
  toNextTurnOf(0);
  if (!find(0, 'xeno_drake')) return 'not evolved after 1 turn';
});

test("Hive Queen Xa'ral Implants every enemy and Chestbursters burst out already Evolved", () => {
  const a = enemy('ember_whelp', 1), c = enemy('scout_drone');
  play(0, give(0, 'hive_queen_xaral'));
  if (a.implanted !== 0 || c.implanted !== 0) return 'not all implanted';
  attack(0, blank(0, 3, 3).uid, a.uid);
  if (burster() || !find(0, 'xeno_drake')) return 'did not burst out Evolved';
});

test('Ovomorph Clutch Implants a fresh enemy at the start of your turn', () => {
  put(0, 'ovomorph_clutch');
  const e = enemy('ember_whelp');
  toNextTurnOf(0);
  if (e.implanted !== 0) return 'not implanted';
});

test('Parasite Carrier Implants a random enemy when it dies', () => {
  const pc = put(0, 'parasite_carrier');
  const e = enemy('ember_whelp');
  pc.health = 0; pc.destroyed = true;
  attack(0, blank(0, 1, 9).uid, enemy('scout_drone').uid); // any step lets deaths resolve
  if (e.implanted !== 0 && !pl(1).board.some((m) => m.implanted === 0)) return 'nobody implanted';
});

test('Acid-Blood Drone burns whatever damages it for 2', () => {
  const d = put(0, 'acid_blood_drone');
  endTurn();
  const e = blank(1, 2, 6);
  attack(1, e.uid, d.uid);
  if (e.health !== 1) return `attacker at ${e.health} (want 6 - 3 - 2 = 1)`;
});

test('Hive Brute grows when an Implanted enemy dies', () => {
  const b = put(0, 'hive_brute');
  const e = enemy('ember_whelp', 1);
  play(0, give(0, 'facehugger_swarmling'));
  attack(0, blank(0, 3, 3).uid, e.uid);
  if (b.attack !== 5 || b.health !== 4) return `brute ${b.attack}/${b.health}`;
});

test('Xeno Runner hits Implanted minions for +3', () => {
  const e = enemy('ember_whelp', 9);
  play(0, give(0, 'facehugger_swarmling'));
  const r = put(0, 'xeno_runner');
  attack(0, r.uid, e.uid);
  if (e.health !== 2) return `enemy at ${e.health} (want 9 - 7 = 2)`;
});

test('Hive Warrior Implants 2 enemies', () => {
  enemy('ember_whelp'); enemy('scout_drone'); enemy('ember_whelp');
  play(0, give(0, 'hive_warrior'));
  const n = pl(1).board.filter((m) => m.implanted === 0).length;
  if (n !== 2) return `${n} implanted`;
});

test('Praetorian Guard gives Evolved Xenos +1 Attack (only them)', () => {
  const x = put(0, 'xeno_warrior');
  const other = blank(0, 2, 2);
  play(0, give(0, 'praetorian_guard'));
  if (effectiveAttack(x) !== 5 || effectiveAttack(other) !== 2) return `xeno ${effectiveAttack(x)}, other ${effectiveAttack(other)}`;
});

test('Gestation Implants and draws; It Bursts Out destroys an Implanted enemy (and it bursts)', () => {
  const e = enemy('ember_whelp');
  const card = give(0, 'gestation');
  const before = pl(0).hand.length;
  play(0, card, e.uid);
  if (e.implanted !== 0 || pl(0).hand.length !== before) return 'gestation';
  play(0, give(0, 'it_bursts_out'), e.uid);
  if (pl(1).board.includes(e) || !burster()) return 'it bursts out';
});

test('Acid Blood Spray: when a friendly Alien dies, its killer takes 3', () => {
  const a = put(0, 'facehugger_swarmling');
  give(0, 'acid_blood_spray');
  endTurn();
  const e = blank(1, 3, 6);
  attack(1, e.uid, a.uid, qp('acid_blood_spray'));
  if (e.health !== 2) return `killer at ${e.health} (want 6 - 1 - 3 = 2)`;
});

test('Egg Chamber Implants the next minion your opponent plays', () => {
  play(0, give(0, 'egg_chamber'));
  endTurn();
  play(1, give(1, 'ember_whelp'));
  const w = find(1, 'ember_whelp');
  if (!w || w.implanted !== 0) return 'not implanted';
});

test('Glowing Xeno has Radiation 1; Spore Xeno Implants an enemy when it dies', () => {
  const b = put(0, 'chestburster'); // a Chestburster from a Radioactive host, one turn from Evolving
  b.hostFaction = 'Radioactive'; b.evolveProgress = 1;
  toNextTurnOf(0);
  if (b.cardId !== 'glowing_xeno' || !(b.radPerm >= 1)) return `${b.cardId}, radiation ${b.radPerm}`;
  fresh();
  const s2 = put(0, 'spore_xeno');
  const e = enemy('ember_whelp');
  s2.health = 0; s2.destroyed = true;
  attack(0, blank(0, 1, 9).uid, enemy('scout_drone').uid);
  if (!pl(1).board.some((m) => m.implanted === 0)) return 'no implant';
});

test('Every new card and token has art on disk; the 15 are unlockable extras', () => {
  const noArt = [...IDS, ...TOKENS].filter((id) => !ART[id] || !existsSync(new URL(`../${ART[id]}`, import.meta.url)));
  if (noArt.length) return `no art: ${noArt}`;
  const bad = IDS.filter((id) => !getCard(id).extra || getCard(id).faction !== 'Aliens');
  if (bad.length) return `not extra Aliens: ${bad}`;
  if (TOKENS.some((id) => !getCard(id).token)) return 'a token is not marked token';
});

console.log(`\n${passed} passed, ${failures} failed`);
if (failures) process.exit(1);
