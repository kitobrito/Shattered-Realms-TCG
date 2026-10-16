// Rules tests for Vampire card changes (Crimson Feast, Vampirism).   node tools/test-vampires.mjs

import { buildDeck } from '../src/cards/index.js';
import { addToHand, effectiveAttack, hasKeyword, summonMinion } from '../src/engine/core.js';
import { applyAction, createGame, getLegalActions } from '../src/engine/engine.js';

let s;
let failures = 0;
let passed = 0;

// Player 0 runs Vampires (+ Sharks); player 1 runs Dragons + Robots.
function fresh() {
  const fa = ['Vampires', 'Sharks'], fb = ['Dragons', 'Robots'];
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


test("Crimson Feast stays hidden when an enemy with more than 2 Health hits your Hero", () => {
  play(0, give(0, 'crimson_feast'));
  endTurn();
  const big = blank(1, 2, 3);
  attack(1, big.uid, pl(0).hero.uid);
  if (pl(0).traps.length !== 1) return 'it went off';
  if (!pl(1).board.includes(big)) return 'big minion destroyed';
});

test('Crimson Feast destroys a 2-Health attacker and heals your Hero 2', () => {
  play(0, give(0, 'crimson_feast'));
  pl(0).hero.health = 20;
  endTurn();
  const small = blank(1, 3, 2);
  attack(1, small.uid, pl(0).hero.uid);
  if (pl(0).traps.length !== 0) return 'did not go off';
  if (pl(1).board.includes(small)) return 'attacker survived';
  if (pl(0).hero.health !== 19) return `hero ${pl(0).hero.health} (want 20 - 3 + 2 = 19)`;
});

test('Vampirism on a non-Vampire: it becomes a Vampire with Lifesteal (no stat change)', () => {
  const m = blank(0, 2, 3);
  m.tribes = []; // the stand-in is a Vampire Gargoyle; make it an ordinary minion
  play(0, give(0, 'vampirism'), m.uid);
  if (!m.tribes.includes('Vampire') || !hasKeyword(m, 'Lifesteal')) return 'no Vampire / Lifesteal';
  if (m.attack !== 2 || m.health !== 3) return `${m.attack}/${m.health} (want 2/3)`;
});

test('Vampirism on a Vampire: +2/+2', () => {
  const m = blank(0, 2, 3); // a Vampire Gargoyle with no keywords
  play(0, give(0, 'vampirism'), m.uid);
  if (m.attack !== 4 || m.health !== 5) return `${m.attack}/${m.health} (want 4/5)`;
  if (hasKeyword(m, 'Lifesteal')) return 'should not gain Lifesteal';
});

console.log(`\n${passed} passed, ${failures} failed`);
if (failures) process.exit(1);
