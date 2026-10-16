// Rules tests for the Dragons' Frost expansion (Freeze, Shatter, the Winter Queen). Each test sets
// up a small board, plays the card through the real engine, and checks the outcome.
//   node tools/test-dragons-frost.mjs

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

const frozen = (m) => hasKeyword(m, 'Frozen');
const IDS = ['frost_whelp', 'rimescale_hatchling', 'glacier_wyrmling', 'snowdrift_drake', 'frostbreath_drake', 'shatterclaw_dragon', 'blizzard_wyvern',
  'permafrost_behemoth', 'avalanche_dragon', 'glacius_the_winter_queen', 'ice_shard_barrage', 'shatter', 'winters_breath', 'frostbite', 'ice_trap'];

test('All 15 Frost cards exist, are Dragons expansion cards and have art', () => {
  for (const id of IDS) {
    const c = getCard(id);
    if (!c) return `missing ${id}`;
    if (!c.extra || c.faction !== 'Dragons') return `${id} not a Dragons expansion card`;
    if (!ART[id] || !existsSync(ART[id])) return `${id} has no art`;
  }
});

test('Frost Whelp Freezes the chosen enemy, which then cannot attack', () => {
  const e = blank(1, 3, 3);
  play(0, give(0, 'frost_whelp'), e.uid);
  if (!frozen(e)) return 'not frozen';
  endTurn();
  if (canAttack(e.uid)) return 'frozen minion could attack';
});

test('Rimescale Hatchling deals double damage only to Frozen minions', () => {
  const r = put(0, 'rimescale_hatchling');
  const a = blank(1, 0, 10), b = blank(1, 0, 10);
  a.keywords.push('Frozen');
  attack(0, r.uid, a.uid);
  r.attacksThisTurn = 0;
  attack(0, r.uid, b.uid);
  if (a.health !== 6 || b.health !== 8) return `frozen took ${10 - a.health}, normal took ${10 - b.health}`;
});

test('Glacier Wyrmling Freezes whatever attacks it', () => {
  put(0, 'glacier_wyrmling');
  endTurn();
  const e = blank(1, 1, 5);
  attack(1, e.uid, find(0, 'glacier_wyrmling').uid);
  if (!frozen(e)) return 'attacker not frozen';
});

test('Snowdrift Drake has Stealth and Freezes a random enemy', () => {
  const e = blank(1, 2, 2);
  play(0, give(0, 'snowdrift_drake'));
  const d = find(0, 'snowdrift_drake');
  if (!hasKeyword(d, 'Stealth')) return 'no stealth';
  if (!frozen(e)) return 'enemy not frozen';
});

test('Frostbreath Drake Freezes the chosen enemy and its neighbours (only them)', () => {
  const a = blank(1, 1, 1), b = blank(1, 1, 1), c = blank(1, 1, 1), d = blank(1, 1, 1);
  play(0, give(0, 'frostbreath_drake'), b.uid);
  if (!(frozen(a) && frozen(b) && frozen(c)) || frozen(d)) return [a, b, c, d].map(frozen).join(',');
});

test('Shatterclaw Dragon can only choose Frozen enemies, and destroys one', () => {
  const a = blank(1, 5, 5), b = blank(1, 5, 5);
  b.keywords.push('Frozen');
  const card = give(0, 'shatterclaw_dragon');
  const ts = targetCandidates(s, getCard('shatterclaw_dragon').target, 0);
  if (ts.length !== 1 || ts[0] !== b.uid) return `targets ${ts}`;
  play(0, card, b.uid);
  if (pl(1).board.includes(b) || !pl(1).board.includes(a)) return 'wrong minion destroyed';
});

test('Shatterclaw Dragon can still be played with no Frozen enemy', () => {
  blank(1, 5, 5);
  play(0, give(0, 'shatterclaw_dragon'));
  if (!find(0, 'shatterclaw_dragon')) return 'not played';
});

test('Blizzard Wyvern Freezes enemies with 2 or less Attack only', () => {
  const small = blank(1, 2, 5), big = blank(1, 3, 5);
  play(0, give(0, 'blizzard_wyvern'));
  if (!frozen(small) || frozen(big)) return `small ${frozen(small)} big ${frozen(big)}`;
  if (!hasKeyword(find(0, 'blizzard_wyvern'), 'Evade')) return 'no Evade';
});

test("Permafrost Behemoth gains +1 Attack per enemy that becomes Frozen", () => {
  const p = put(0, 'permafrost_behemoth');
  blank(1, 1, 1); blank(1, 1, 1);
  const mine = blank(0, 1, 1);
  play(0, give(0, 'winters_breath'));
  mine.keywords.push('Frozen');
  if (effectiveAttack(p) !== 6) return `attack ${effectiveAttack(p)}`;
});

test('Avalanche Dragon deals 2 to enemy minions and Freezes the survivors', () => {
  const a = blank(1, 1, 2), b = blank(1, 1, 5);
  play(0, give(0, 'avalanche_dragon'));
  if (pl(1).board.includes(a)) return 'small one survived';
  if (b.health !== 3 || !frozen(b)) return `big ${b.health} frozen ${frozen(b)}`;
});

test("Glacius keeps Frozen enemies frozen while she lives; they thaw after she dies", () => {
  const e = blank(1, 3, 3), f = blank(1, 3, 3), g = blank(1, 3, 3);
  play(0, give(0, 'glacius_the_winter_queen'));
  if ([e, f, g].filter(frozen).length !== 2) return `froze ${[e, f, g].filter(frozen).length}, expected 2`;
  if (!frozen(e)) { const x = [f, g].find(frozen); e.keywords.push('Frozen'); x.keywords.splice(x.keywords.indexOf('Frozen'), 1); e.thawAfter = 1; }
  for (let i = 0; i < 3; i++) toNextTurnOf(1);
  if (!frozen(e) || canAttack(e.uid)) return 'thawed while Glacius lives';
  const q = find(0, 'glacius_the_winter_queen');
  pl(0).board.splice(pl(0).board.indexOf(q), 1);
  toNextTurnOf(0); toNextTurnOf(1);
  if (frozen(e)) return 'still frozen after she left';
});

test('Without Glacius, Frozen minions thaw as normal', () => {
  const e = blank(1, 3, 3);
  play(0, give(0, 'frost_whelp'), e.uid);
  toNextTurnOf(1);
  if (canAttack(e.uid)) return 'attacked while frozen';
  toNextTurnOf(0); toNextTurnOf(1);
  if (frozen(e)) return 'never thawed';
});

test('Ice Shard Barrage hits 3 random enemies for 1 and Freezes exactly those', () => {
  const es = [blank(1, 1, 5), blank(1, 1, 5), blank(1, 1, 5), blank(1, 1, 5)];
  const hero = pl(1).hero.health;
  play(0, give(0, 'ice_shard_barrage'));
  const hit = es.filter((m) => m.health === 4), fr = es.filter(frozen);
  if (hit.length !== 3 || fr.length !== 3 || hit.some((m) => !frozen(m))) return `hit ${hit.length} frozen ${fr.length}`;
  if (pl(1).hero.health !== hero) return 'hit the hero';
});

test('Shatter destroys a Frozen minion and draws a card; no Frozen minion, no play', () => {
  const e = blank(1, 5, 5);
  const card = give(0, 'shatter');
  if (getLegalActions(s).some((a) => a.card === card.uid)) return 'playable with nothing Frozen';
  e.keywords.push('Frozen');
  const before = pl(0).hand.length;
  play(0, card, e.uid);
  if (pl(1).board.includes(e)) return 'not destroyed';
  if (pl(0).hand.length !== before) return `hand ${before} -> ${pl(0).hand.length} (expected same: -1 card +1 draw)`;
});

test("Winter's Breath Freezes every enemy minion and none of yours", () => {
  const a = blank(1, 1, 1), b = blank(1, 1, 1), mine = blank(0, 1, 1);
  play(0, give(0, 'winters_breath'));
  if (!frozen(a) || !frozen(b) || frozen(mine)) return 'wrong freezes';
});

test('Frostbite (Quick Play): an attacking enemy takes 2 damage and is Frozen', () => {
  give(0, 'frostbite');
  endTurn();
  const e = blank(1, 3, 5);
  attack(1, e.uid, pl(0).hero.uid, qp('frostbite'));
  if (e.health !== 3 || !frozen(e)) return `health ${e.health} frozen ${frozen(e)}`;
});

test('Ice Trap: an enemy attacking your Hero is Frozen with its neighbours', () => {
  const t = give(0, 'ice_trap');
  play(0, t);
  endTurn();
  const a = blank(1, 1, 3), b = blank(1, 2, 3), c = blank(1, 1, 3), d = blank(1, 1, 3);
  attack(1, b.uid, pl(0).hero.uid);
  if (!(frozen(a) && frozen(b) && frozen(c)) || frozen(d)) return [a, b, c, d].map(frozen).join(',');
});

console.log(`\n${passed} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
