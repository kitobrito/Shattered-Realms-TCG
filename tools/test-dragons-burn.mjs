// Rules tests for Burn timing: Burn you apply hits at the end of YOUR turn.
//   node tools/test-dragons-burn.mjs

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
  const fa = ['Dragons', 'Vampires'], fb = ['Aliens', 'Robots'];
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


test('Burn on an enemy minion hits as soon as you end your turn', () => {
  const e = blank(1, 1, 10);
  play(0, give(0, 'ember_whelp'), e.uid); // Arrival: Burn 1
  if (e.burn !== 1) return `burn ${e.burn}`;
  applyAction(s, { type: 'endTurn', player: 0 }); settle();
  if (e.health !== 9) return `health after your end turn ${e.health}`;
  if (e.burn !== 2) return `burn did not rise: ${e.burn}`;
});

test('Burn does not hit at the end of the burning player\'s own turn', () => {
  const e = blank(1, 1, 10);
  play(0, give(0, 'ember_whelp'), e.uid);
  endTurn(); // you end: 1 damage
  const hp = e.health;
  endTurn(); // they end: nothing
  if (e.health !== hp) return `took ${hp - e.health} on their own turn`;
  endTurn(); // you end again: 2 damage, then the fire goes out
  if (e.health !== hp - 2 || e.burn) return `health ${e.health}, burn ${e.burn}`;
});

test('Burn on the enemy Hero also hits at the end of your turn', () => {
  const hp = pl(1).hero.health;
  pl(1).hero.burn = 1; pl(1).hero.burnLeft = 2;
  endTurn();
  if (pl(1).hero.health !== hp - 1) return `damage ${hp - pl(1).hero.health}`;
});

test('Feed the Flames can still answer your Burn damage (Quick Play window goes to the burner)', () => {
  const e = blank(1, 1, 20);
  play(0, give(0, 'ember_whelp'), e.uid);
  give(0, 'feed_the_flames');
  applyAction(s, { type: 'endTurn', player: 0 });
  settle(qp('feed_the_flames'));
  if (pl(0).hand.some((h) => h.cardId === 'feed_the_flames')) return 'not offered';
  if (e.burn !== 4) return `burn ${e.burn} (1 -> rises to 2, +2)`;
});

console.log(`\n${passed} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
