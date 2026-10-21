// Rules tests for the Acidic's Half-Digested expansion (Acid Hide, Regenerate). Each test sets
// up a small board, plays the card through the real engine, and checks the outcome.
//   node tools/test-acidic-digested.mjs

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

// Player 0 runs Acidic + Vampires; player 1 runs Robots + Ghosts (Weapons and Relics to melt).
function fresh() {
  const fa = ['Acidic', 'Vampires'], fb = ['Robots', 'Ghosts'];
  const players = [{ name: 'A', factions: fa, deck: buildDeck(fa) }, { name: 'B', factions: fb, deck: buildDeck(fb) }];
  s = createGame({ seed: 7, rules: { mulligan: false, secondPlayerPotions: false, openingHandHelp: false }, players });
  for (const p of s.players) { p.hand = []; p.mana.max = 10; p.mana.current = 10; p.mana.primal = 0; p.mana.base = 10; }
}
const pl = (p) => s.players[p];
const put = (p, id) => { const m = summonMinion(s, p, id); m.sick = false; return m; };
const give = (p, id) => addToHand(s, p, id);
const find = (p, id) => pl(p).board.find((m) => m.cardId === id);
// A plain enemy (or friendly) minion with chosen stats and no keywords.
const blank = (p, atk, hp) => { const m = put(p, 'forge_drone'); m.keywords = []; m.attack = atk; m.health = hp; m.maxHealth = hp; return m; };

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

const IDS = ['bile_slick_crawler', 'regurgitate', 'half_melted_hound', 'stomach_lining_plate', 'sloughing_brute', 'dissolve_arms', 'gastric_burst', 'weeping_escapee',
  'peptic_snare', 'the_chewed_one', 'melting_embrace', 'gut_burst_horror', 'stomach_wall_colossus', 'the_undigested_king', 'return_to_the_stomach'];
const hero = (p) => pl(p).hero;

test('All 15 Half-Digested cards exist as Acidic expansion cards and have art', () => {
  for (const id of IDS) { const c = getCard(id); if (!c?.extra || c.faction !== 'Acidic') return `${id} missing`; }
  const noArt = IDS.filter((id) => !ART[id] || !existsSync(ART[id]));
  if (noArt.length) return `no art: ${noArt}`;
});

test('Acid Hide: a minion that attacks it is Corroded by 1', () => {
  const c = put(0, 'bile_slick_crawler');
  endTurn();
  const m = blank(1, 3, 9); m.sick = false;
  attack(1, m.uid, c.uid);
  if (effectiveAttack(m) !== 2 || m.corrosion !== 1) return `${effectiveAttack(m)} ${m.corrosion}`;
});

test('Acid Hide does nothing when its minion is the attacker', () => {
  const c = put(0, 'sloughing_brute');
  const m = blank(1, 3, 9);
  attack(0, c.uid, m.uid);
  if (effectiveAttack(m) !== 3) return `${effectiveAttack(m)}`;
});

test('Acid Hide melts an attacking Hero\'s Weapon (or eats 2 Armor)', () => {
  const c = put(0, 'stomach_wall_colossus');
  endTurn();
  play(1, give(1, 'rivet_blade'));
  attack(1, hero(1).uid, c.uid);
  if (hero(1).weapon) return 'weapon survived';
  hero(1).armor = 9; hero(1).attack = 1; hero(1).attacksThisTurn = 0; // the Colossus hits back for 3 (Armor first), then Acid Hide eats 2
  attack(1, hero(1).uid, c.uid);
  if (hero(1).armor !== 4) return `armor ${hero(1).armor}`; // 9 - 3 (Colossus hits back) - 2 (Acid Hide)
});

test('Regenerate heals at the start of your turn (not past full)', () => {
  const h = put(0, 'half_melted_hound'); h.health = 1;
  endTurn(); endTurn();
  if (h.health !== 2) return `${h.health}`;
  endTurn(); endTurn();
  if (h.health !== 2) return 'overhealed';
});

test('Regurgitate returns a friendly minion', () => {
  const m = put(0, 'the_chewed_one');
  play(0, give(0, 'regurgitate'), m.uid);
  const inst = pl(0).hand.find((c) => c.cardId === 'the_chewed_one');
  if (!inst || inst.costMod) return `${inst?.costMod}`;
});

test('Stomach Lining Plate: +0/+2 and Acid Hide', () => {
  const m = blank(0, 1, 2);
  play(0, give(0, 'stomach_lining_plate'), m.uid);
  if (m.health !== 4 || !hasKeyword(m, 'Acid Hide')) return 'no';
});

test("Dissolve Arms: destroys the enemy Hero's Weapon, Corrodes enemy minions", () => {
  endTurn(); play(1, give(1, 'power_fist')); endTurn();
  const m = blank(1, 3, 3);
  play(0, give(0, 'dissolve_arms'));
  if (hero(1).weapon || effectiveAttack(m) !== 2) return 'no';
});

test('Gastric Burst: Quick Play when an Acid Hide minion is attacked', () => {
  const c = put(0, 'sloughing_brute'); give(0, 'gastric_burst'); endTurn();
  const m = blank(1, 4, 9); m.sick = false;
  attack(1, m.uid, c.uid, qp('gastric_burst'));
  // 3 from Gastric Burst, 2 from the Brute's counter-hit; Corroded 2 + 1 (Acid Hide)
  if (m.health !== 4 || m.corrosion !== 3) return `${m.health} ${m.corrosion}`;
});

test('Weeping Escapee: Corrodes a random enemy minion when it Regenerates', () => {
  const w = put(0, 'weeping_escapee'); w.health = 1;
  const m = blank(1, 3, 9);
  endTurn(); endTurn();
  if (w.health !== 3 || effectiveAttack(m) !== 2) return `${w.health} ${effectiveAttack(m)}`;
});

test('Peptic Snare: an enemy Weapon is destroyed as it is equipped; 2 Armor lost', () => {
  play(0, give(0, 'peptic_snare')); endTurn();
  hero(1).armor = 3;
  play(1, give(1, 'power_fist'));
  if (hero(1).weapon || hero(1).armor !== 1) return `${hero(1).weapon?.name} ${hero(1).armor}`;
});

test('The Chewed One: +2 Attack while damaged', () => {
  const c = put(0, 'the_chewed_one');
  if (effectiveAttack(c) !== 3) return 'base';
  c.health = 3;
  if (effectiveAttack(c) !== 5) return `${effectiveAttack(c)}`;
});

test('Melting Embrace: Dissolve, then Corrode by 3', () => {
  const m = blank(1, 5, 5); m.keywords = ['Taunt'];
  play(0, give(0, 'melting_embrace'), m.uid);
  if (effectiveAttack(m) !== 2 || hasKeyword(m, 'Taunt')) return `${effectiveAttack(m)} ${m.keywords}`;
});

test('Gut-Burst Horror: 2 to all other minions, then heals your Acid Hide ones', () => {
  const c = put(0, 'stomach_wall_colossus'); const e = blank(1, 1, 5);
  play(0, give(0, 'gut_burst_horror'));
  if (e.health !== 3 || c.health !== 8) return `${e.health} ${c.health}`;
});

test('The Undigested King melts the enemy Weapon, Relics and Armor and grows', () => {
  endTurn();
  play(1, give(1, 'power_fist'));
  const g = put(1, 'poltergeist_porter'); play(1, give(1, 'wailing_chains'), g.uid);
  hero(1).armor = 6; endTurn();
  play(0, give(0, 'the_undigested_king'));
  const k = find(0, 'the_undigested_king');
  if (hero(1).weapon || g.relic || hero(1).armor) return 'something survived';
  if (effectiveAttack(k) !== 7 || k.health !== 7) return `${effectiveAttack(k)}/${k.health}`;
});

test('Return to the Stomach: removes the enemy (no Graveyard) and gives you a 2/2 Acid Hide copy', () => {
  const m = blank(1, 6, 6);
  const gy = pl(1).graveyard.length;
  play(0, give(0, 'return_to_the_stomach'), m.uid);
  const copy = find(0, 'forge_drone');
  if (pl(1).board.includes(m) || pl(1).graveyard.length !== gy) return 'not removed';
  if (!copy || effectiveAttack(copy) !== 2 || copy.health !== 2 || !hasKeyword(copy, 'Acid Hide') || copy.regen !== 1) return 'bad copy';
});

test('No Meltdown above 0 Attack: a 1-Attack minion just drops to 0', () => {
  const m = blank(1, 1, 9); m.keywords = ['Taunt'];
  play(0, give(0, 'dissolve_arms'));
  if (effectiveAttack(m) !== 0 || !hasKeyword(m, 'Taunt')) return `${effectiveAttack(m)} ${m.keywords}`;
});

test('Meltdown: corroding a minion at 0 Attack strips a keyword first', () => {
  const m = blank(1, 0, 9); m.keywords = ['Taunt']; m.corrosion = 2;
  play(0, give(0, 'dissolve_arms'));
  if (hasKeyword(m, 'Taunt')) return 'kept Taunt';
});

test('Meltdown: with a Relic, the Relic melts first', () => {
  const g = put(1, 'poltergeist_porter'); g.attack = 0; g.corrosion = 1;
  s.activePlayer = 1; pl(1).mana.current = 10; play(1, give(1, 'wailing_chains'), g.uid); s.activePlayer = 0;
  g.attack = 0; // keep it fully corroded after the +2
  play(0, give(0, 'dissolve_arms'));
  if (g.relic) return 'relic survived';
});

test('Meltdown: with nothing left, it takes damage equal to its Corrosion', () => {
  const m = blank(1, 0, 9); m.corrosion = 4; m.textLost = true; // its card text already melted
  play(0, give(0, 'dissolve_arms'));
  if (m.health !== 4) return `health ${m.health}`; // corrosion 4 + 1 = 5 damage
});

console.log(`\n${passed} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
