// Rules tests for the Ultraterrestrials' Hyperspace expansion (Breakthrough). Each test sets
// up a small board, plays the card through the real engine, and checks the outcome.
//   node tools/test-ultra-hyperspace.mjs

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

// Player 0 runs Dragons (+ Vampires); player 1 runs Aliens + Robots.
function fresh() {
  const fa = ['Ultraterrestrials', 'Vampires'], fb = ['Aliens', 'Robots'];
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


const IDS = ['waiting_room_usher', 'self_dribbling_jewel', 'fractal_elf', 'kaleidoscope_jester', 'mantis_surgeon', 'tessellated_guardian', 'chrysanthemum_gate',
  'hyperdimensional_architect', 'machine_elf_choir', 'the_teacher_beyond', 'geometry_lesson', 'fold_space', 'the_breakthrough', 'mirror_hall', 'welcome_back'];
const beyond = (uid) => (s.beyond ?? []).some((e) => e.minion.uid === uid);
const back = () => { endTurn(); endTurn(); }; // to your next turn: Displaced minions return

test('All 15 Hyperspace cards exist, are Ultraterrestrial expansion cards and have art', () => {
  for (const id of IDS) {
    const c = getCard(id);
    if (!c?.extra || c.faction !== 'Ultraterrestrials') return `${id} missing`;
    if (!ART[id] || !existsSync(ART[id])) return `${id} has no art`;
  }
});

test('Waiting Room Usher Displaces a friendly minion until your next turn', () => {
  const m = put(0, 'fractal_elf');
  play(0, give(0, 'waiting_room_usher'), m.uid);
  if (!beyond(m.uid)) return 'not displaced';
  back();
  if (!pl(0).board.includes(m)) return 'did not return';
});

test('Fractal Elf: Breakthrough gives +2/+2', () => {
  const m = put(0, 'fractal_elf');
  play(0, give(0, 'geometry_lesson'), m.uid); back();
  if (effectiveAttack(m) !== 5 || m.health !== 6) return `${effectiveAttack(m)}/${m.health}`;
});

test('Self-Dribbling Jewel: Breakthrough summons a copy', () => {
  const m = put(0, 'self_dribbling_jewel');
  play(0, give(0, 'geometry_lesson'), m.uid); back();
  if (pl(0).board.filter((x) => x.cardId === 'self_dribbling_jewel').length !== 2) return 'no copy';
});

test('Machine Elf Choir doubles Breakthrough (Fractal Elf gets +4/+4, +1/+1 from the Lesson)', () => {
  put(0, 'machine_elf_choir');
  const m = put(0, 'fractal_elf');
  play(0, give(0, 'geometry_lesson'), m.uid); back();
  if (effectiveAttack(m) !== 7 || m.health !== 8) return `${effectiveAttack(m)}/${m.health}`;
});

test('Kaleidoscope Jester swaps an enemy minion\'s Attack and Health', () => {
  const e = blank(1, 6, 1);
  play(0, give(0, 'kaleidoscope_jester'), e.uid);
  if (effectiveAttack(e) !== 1 || e.health !== 6) return `${effectiveAttack(e)}/${e.health}`;
});

test('Mantis Surgeon: Breakthrough fully heals and cleanses the others', () => {
  const ms = put(0, 'mantis_surgeon');
  const o = blank(0, 1, 6); o.health = 2; o.keywords.push('Frozen');
  play(0, give(0, 'geometry_lesson'), ms.uid); back();
  if (o.health !== 6 || hasKeyword(o, 'Frozen')) return `health ${o.health}, frozen ${hasKeyword(o, 'Frozen')}`;
});

test('Tessellated Guardian grows when a friendly minion returns', () => {
  const g = put(0, 'tessellated_guardian');
  const m = put(0, 'fractal_elf');
  play(0, give(0, 'geometry_lesson'), m.uid); back();
  if (effectiveAttack(g) !== 4 || g.health !== 8) return `${effectiveAttack(g)}/${g.health}`;
});

test('Chrysanthemum Gate Displaces another friendly minion at the end of your turn', () => {
  put(0, 'chrysanthemum_gate');
  const m = put(0, 'fractal_elf');
  endTurn();
  if (!beyond(m.uid)) return 'not displaced';
});

test('Hyperdimensional Architect: Breakthrough draws 2', () => {
  const m = put(0, 'hyperdimensional_architect');
  play(0, give(0, 'geometry_lesson'), m.uid);
  const before = pl(0).hand.length;
  back();
  if (pl(0).hand.length - before < 3) return `drew ${pl(0).hand.length - before} (2 + turn draw expected)`;
});

test('The Teacher Beyond Displaces all others; yours return with +2/+2', () => {
  const m = blank(0, 1, 1), e = blank(1, 1, 1);
  play(0, give(0, 'the_teacher_beyond'));
  if (!beyond(m.uid) || !beyond(e.uid)) return 'not all displaced';
  back();
  if (effectiveAttack(m) !== 3 || m.health !== 3) return `friendly ${effectiveAttack(m)}/${m.health}`;
});

test('Fold Space Displaces one enemy and deals 2 to the other enemy minions', () => {
  const a = blank(1, 1, 5), b = blank(1, 1, 5);
  play(0, give(0, 'fold_space'), a.uid);
  if (!beyond(a.uid) || b.health !== 3) return `displaced ${beyond(a.uid)}, other ${b.health}`;
});

test('The Breakthrough (Quick Play) saves a dying friendly minion by Displacing it', () => {
  give(0, 'the_breakthrough');
  const m = blank(0, 1, 2);
  endTurn();
  const e = blank(1, 5, 5);
  attack(1, e.uid, m.uid, qp('the_breakthrough'));
  if (!beyond(m.uid)) return 'not displaced';
});

test('Mirror Hall (Trap) Displaces the minion the opponent plays', () => {
  play(0, give(0, 'mirror_hall'));
  endTurn();
  const c = give(1, 'xeno_drone');
  play(1, c);
  if (pl(1).board.some((x) => x.cardId === 'xeno_drone')) return 'still on board';
});

test('Welcome Back (Trap): a returning friendly minion gets +2/+2 and Taunt', () => {
  play(0, give(0, 'welcome_back'));
  const m = blank(0, 1, 1);
  play(0, give(0, 'geometry_lesson'), m.uid); back();
  if (effectiveAttack(m) !== 4 || m.health !== 4 || !hasKeyword(m, 'Taunt')) return `${effectiveAttack(m)}/${m.health}`;
});

console.log(`\n${passed} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
