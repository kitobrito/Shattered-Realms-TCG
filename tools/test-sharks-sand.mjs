// Rules tests for the Sharks' Sand Shark expansion (Burrow / Surface). Each test sets up a small
// board, plays the card through the real engine, and checks the outcome.   node tools/test-sharks-sand.mjs

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

// Player 0 runs Sharks (+ Vampires); player 1 runs Dragons + Robots.
function fresh() {
  const fa = ['Sharks', 'Vampires'], fb = ['Dragons', 'Robots'];
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

test('Burrow: a Burrow minion arrives Burrowed with Stealth, safe from attacks and enemy spells, and Surfaces on your next turn', () => {
  play(0, give(0, 'sand_pup'));
  const pup = find(0, 'sand_pup');
  if (!pup.burrowed || !hasKeyword(pup, 'Stealth')) return 'not burrowed';
  endTurn();
  const e = blank(1, 3, 3);
  if (canAttack(e.uid, pup.uid)) return 'enemy can attack a Burrowed minion';
  if (targetCandidates(s, { type: 'minion', side: 'enemy' }, 1, null, true).includes(pup.uid)) return 'enemy spells can target it';
  endTurn();
  if (pup.burrowed || hasKeyword(pup, 'Stealth')) return 'still burrowed on its next turn';
  if (pup.attack !== 2) return `Surface should give +1 Attack: ${pup.attack}`;
});

test('Gravel Grinder Surfaces for 1 damage to all enemy minions', () => {
  play(0, give(0, 'gravel_grinder'));
  const a = blank(1, 1, 3), b = blank(1, 1, 1);
  toNextTurnOf(0);
  if (a.health !== 2 || pl(1).board.includes(b)) return `a ${a.health}, b alive ${pl(1).board.includes(b)}`;
});

test('Tunnel Shark Surfaces for 3 damage to an enemy minion', () => {
  play(0, give(0, 'tunnel_shark'));
  const a = blank(1, 1, 5);
  toNextTurnOf(0);
  if (a.health !== 2) return `enemy at ${a.health}`;
});

test('Great White of the Dunes destroys enemy minions with 3 or less Health when it Surfaces', () => {
  play(0, give(0, 'great_white_of_the_dunes'));
  const small = blank(1, 5, 3), big = blank(1, 5, 4);
  toNextTurnOf(0);
  if (pl(1).board.includes(small) || !pl(1).board.includes(big)) return `small alive ${pl(1).board.includes(small)}, big alive ${pl(1).board.includes(big)}`;
});

test('Dune Matriarch makes Surface effects happen twice', () => {
  put(0, 'dune_matriarch');
  play(0, give(0, 'sand_pup'));
  play(0, give(0, 'gravel_grinder'));
  const a = blank(1, 1, 5);
  toNextTurnOf(0);
  const pup = find(0, 'sand_pup');
  if (pup.attack !== 3) return `pup ${pup.attack} (want 3)`;
  if (a.health !== 3) return `enemy ${a.health} (want 3: two pings)`;
});

test('Dune Fin gains +1 Attack this turn whenever a friendly minion Surfaces', () => {
  const fin = put(0, 'dune_fin');
  play(0, give(0, 'sand_pup'));
  play(0, give(0, 'tunnel_shark'));
  toNextTurnOf(0);
  if (effectiveAttack(fin) !== 4) return `fin ${effectiveAttack(fin)} on the Surface turn (want 4)`;
  toNextTurnOf(0);
  if (effectiveAttack(fin) !== 2) return `fin ${effectiveAttack(fin)} a turn later (want 2)`;
});

test("Quicksand Lurker: the chosen enemy minion can't attack on its next turn, then can", () => {
  const e = blank(1, 2, 2);
  play(0, give(0, 'quicksand_lurker'), e.uid);
  if (!hasKeyword(find(0, 'quicksand_lurker'), 'Taunt')) return 'no Taunt';
  endTurn();
  if (canAttack(e.uid)) return 'it can attack the next turn';
  toNextTurnOf(1);
  if (!canAttack(e.uid)) return 'still stuck a turn later';
});

test('Sandstorm Stalker Burrows after it attacks (hidden again); it Surfaces next turn without Stealth (attacking used it up)', () => {
  const st = put(0, 'sandstorm_stalker');
  const e = blank(1, 1, 5);
  attack(0, st.uid, e.uid);
  if (!st.burrowed || !hasKeyword(st, 'Stealth')) return 'did not burrow';
  toNextTurnOf(0);
  if (st.burrowed || hasKeyword(st, 'Stealth')) return `burrowed ${st.burrowed}, stealth ${hasKeyword(st, 'Stealth')}`;
});

test('Dig In Burrows a friendly minion and draws a card', () => {
  const m = blank(0, 2, 2);
  const card = give(0, 'dig_in');
  const before = pl(0).hand.length; // Dig In leaves the hand and a card is drawn: same size
  play(0, card, m.uid);
  if (!m.burrowed || pl(0).hand.length !== before) return `burrowed ${m.burrowed}, hand ${pl(0).hand.length} vs ${before}`;
});

test('Sinkhole: a kill Burrows your chosen minion; no kill, no Burrow; playable with no friendly minion', () => {
  let e = blank(1, 1, 4);
  let m = blank(0, 1, 1);
  play(0, give(0, 'sinkhole'), e.uid, m.uid);
  if (pl(1).board.includes(e) || !m.burrowed) return `kill: enemy alive ${pl(1).board.includes(e)}, burrowed ${m.burrowed}`;
  fresh();
  e = blank(1, 1, 6); m = blank(0, 1, 1);
  play(0, give(0, 'sinkhole'), e.uid, m.uid);
  if (m.burrowed || e.health !== 2) return `no kill: burrowed ${m.burrowed}, enemy ${e.health}`;
  fresh();
  e = blank(1, 1, 3);
  const card = give(0, 'sinkhole');
  if (!getLegalActions(s).some((a) => a.type === 'play' && a.card === card.uid)) return 'not playable without a friendly minion';
  play(0, card, e.uid);
  if (pl(1).board.includes(e)) return 'did not kill';
});

test('Duck Under: when a friendly minion is attacked, it Burrows and the attack is cancelled', () => {
  const m = blank(0, 1, 2);
  give(0, 'duck_under');
  endTurn();
  const e = blank(1, 5, 5);
  attack(1, e.uid, m.uid, qp('duck_under'));
  if (!m.burrowed || m.health !== 2 || e.health !== 5) return `burrowed ${m.burrowed}, m ${m.health}, e ${e.health}`;
});

test('Erupt Surfaces a Burrowed minion right away (its Surface effect happens)', () => {
  play(0, give(0, 'tunnel_shark'));
  const e = blank(1, 1, 5);
  play(0, give(0, 'erupt'), find(0, 'tunnel_shark').uid);
  if (find(0, 'tunnel_shark').burrowed || e.health !== 2) return `burrowed ${find(0, 'tunnel_shark').burrowed}, enemy ${e.health}`;
});

test("Sand Undertow: the attacking enemy's attack is cancelled and it can't attack next turn either", () => {
  give(0, 'sand_undertow');
  endTurn();
  const e = blank(1, 4, 4);
  const hp = pl(0).hero.health;
  attack(1, e.uid, pl(0).hero.uid, qp('sand_undertow'));
  if (pl(0).hero.health !== hp) return 'the attack went through';
  toNextTurnOf(1);
  if (canAttack(e.uid)) return 'it can attack on its next turn';
  toNextTurnOf(1);
  if (!canAttack(e.uid)) return 'still stuck two turns later';
});

test('Tremor Sense: an enemy minion played Surfaces your Burrowed minions with +1 Attack (and waits if none are Burrowed)', () => {
  play(0, give(0, 'tremor_sense'));
  endTurn();
  play(1, give(1, 'vampire_gargoyle'));
  if (pl(0).traps.length !== 1) return 'went off with nothing Burrowed';
  toNextTurnOf(0);
  play(0, give(0, 'sand_pup'));
  endTurn();
  play(1, give(1, 'vampire_gargoyle'));
  const pup = find(0, 'sand_pup');
  if (pl(0).traps.length !== 0 || pup.burrowed || pup.attack !== 3) return `traps ${pl(0).traps.length}, burrowed ${pup.burrowed}, pup ${pup.attack} (want 3: +1 trap, +1 Surface)`;
});

test("Sand Trap: an enemy minion attacking your Hero takes 3 and can't attack next turn", () => {
  play(0, give(0, 'sand_trap'));
  endTurn();
  const e = blank(1, 2, 5);
  attack(1, e.uid, pl(0).hero.uid);
  if (e.health !== 2) return `enemy at ${e.health}`;
  toNextTurnOf(1);
  if (canAttack(e.uid)) return 'it can attack next turn';
});

test('Every new card has art on disk and is an unlockable extra', () => {
  const ids = ['sand_pup', 'dune_fin', 'gravel_grinder', 'quicksand_lurker', 'tunnel_shark', 'sandstorm_stalker', 'dune_matriarch', 'great_white_of_the_dunes', 'dig_in', 'sinkhole', 'duck_under', 'erupt', 'sand_undertow', 'tremor_sense', 'sand_trap'];
  const noArt = ids.filter((id) => !ART[id] || !existsSync(new URL(`../${ART[id]}`, import.meta.url)));
  if (noArt.length) return `no art: ${noArt}`;
  const notExtra = ids.filter((id) => !getCard(id).extra || getCard(id).faction !== 'Sharks');
  if (notExtra.length) return `not extra Sharks: ${notExtra}`;
});

console.log(`\n${passed} passed, ${failures} failed`);
if (failures) process.exit(1);
