// Rules tests for the Robots' Arsenal Protocol expansion (Hero Weapons and Armor). Each test sets
// up a small board, plays the card through the real engine, and checks the outcome.
//   node tools/test-robots-arsenal.mjs

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

// Player 0 runs Robots + Vampires; player 1 runs Aliens + Plants.
function fresh() {
  const fa = ['Robots', 'Vampires'], fb = ['Aliens', 'Plants'];
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

const IDS = ['forge_drone', 'rivet_blade', 'plating_press', 'armory_bot', 'ion_gauntlets', 'weaponsmith_unit', 'reactive_plating', 'repulsor_shield',
  'power_fist', 'shield_generator', 'exo_frame_overdrive', 'bulwark_sentinel', 'plasma_lance', 'arsenal_overseer', 'titan_mech_suit'];
const hero = (p) => pl(p).hero;
const armor = (p) => hero(p).armor;
const w = (p) => hero(p).weapon;

test('All 15 Arsenal Protocol cards exist, are Robot expansion cards and have art', () => {
  for (const id of IDS) {
    const c = getCard(id);
    if (!c?.extra || c.faction !== 'Robots') return `${id} missing`;
    if (!ART[id] || !existsSync(ART[id])) return `${id} has no art`;
  }
});

test('Forge Drone: Arrival gains 2 Armor', () => {
  play(0, give(0, 'forge_drone'));
  if (armor(0) !== 2) return `armor ${armor(0)}`;
});

test('Rivet Blade: equips a 1/3; the Hero can attack; each attack gains 1 Armor and uses 1 Durability', () => {
  play(0, give(0, 'rivet_blade'));
  if (w(0)?.attack !== 1 || w(0)?.durability !== 3) return 'not equipped 1/3';
  if (!canAttack(hero(0).uid, hero(1).uid)) return 'hero cannot attack';
  attack(0, hero(0).uid, hero(1).uid);
  if (hero(1).health !== 29) return `enemy hero ${hero(1).health}`;
  if (armor(0) !== 1) return `armor ${armor(0)}`;
  if (w(0).durability !== 2) return `durability ${w(0).durability}`;
  if (canAttack(hero(0).uid)) return 'attacked twice in a turn';
});

test('A Weapon breaks at 0 Durability and the Hero loses its Attack', () => {
  play(0, give(0, 'power_fist')); // 3/2
  attack(0, hero(0).uid, hero(1).uid); endTurn(); endTurn();
  attack(0, hero(0).uid, hero(1).uid);
  if (w(0)) return 'weapon still there';
  if (effectiveAttack(hero(0)) !== 0) return `hero attack ${effectiveAttack(hero(0))}`;
  if (hero(1).health !== 24) return `enemy ${hero(1).health}`;
});

test('A new Weapon replaces the old one', () => {
  play(0, give(0, 'rivet_blade')); play(0, give(0, 'plasma_lance'));
  if (w(0).name !== 'Plasma Lance' || effectiveAttack(hero(0)) !== 3) return `${w(0).name} ${effectiveAttack(hero(0))}`;
  attack(0, hero(0).uid, hero(1).uid);
  if (armor(0) !== 0) return 'old Rivet Blade effect still on';
});

test('Attacking a minion: the Hero takes its damage back (Armor first)', () => {
  play(0, give(0, 'forge_drone')); play(0, give(0, 'power_fist'));
  const m = blank(1, 3, 2);
  attack(0, hero(0).uid, m.uid);
  if (armor(0) !== 0 || hero(0).health !== 29) return `armor ${armor(0)} health ${hero(0).health}`;
});

test('Power Fist draws a card when its attack kills a minion (not when it does not)', () => {
  play(0, give(0, 'power_fist'));
  blank(1, 0, 3); // survives? 3 dmg kills a 3-health
  const big = blank(1, 0, 9);
  const n = pl(0).hand.length;
  attack(0, hero(0).uid, big.uid);
  if (pl(0).hand.length !== n) return 'drew on a non-kill';
  endTurn(); endTurn();
  const small = pl(1).board.find((m) => m.health === 3);
  const n2 = pl(0).hand.length;
  attack(0, hero(0).uid, small.uid);
  if (pl(0).hand.length !== n2 + 1) return 'no draw on kill';
});

test('Plating Press: 4 Armor, +1 Durability to a held Weapon', () => {
  play(0, give(0, 'rivet_blade')); play(0, give(0, 'plating_press'));
  if (armor(0) !== 4 || w(0).durability !== 4) return `${armor(0)} ${w(0).durability}`;
});

test('Armory Bot equips a 2/2 Scrap Cleaver only if the Hero has no Weapon', () => {
  play(0, give(0, 'armory_bot'));
  if (w(0)?.name !== 'Scrap Cleaver') return 'no cleaver';
  play(0, give(0, 'power_fist')); play(0, give(0, 'armory_bot'));
  if (w(0).name !== 'Power Fist') return 'replaced an existing weapon';
});

test('Ion Gauntlets: a Hero attack gives a friendly Robot +1/+1', () => {
  const r = put(0, 'forge_drone');
  play(0, give(0, 'ion_gauntlets'));
  attack(0, hero(0).uid, hero(1).uid);
  if (effectiveAttack(r) !== 2 || r.health !== 3) return `${effectiveAttack(r)}/${r.health}`;
});

test("Weaponsmith Unit: +1 Attack on the Hero's Weapon (none without a Weapon)", () => {
  put(0, 'weaponsmith_unit');
  if (effectiveAttack(hero(0)) !== 0) return 'attack without weapon';
  play(0, give(0, 'rivet_blade'));
  if (effectiveAttack(hero(0)) !== 2) return `attack ${effectiveAttack(hero(0))}`;
});

test('Reactive Plating: when the Hero is attacked, gain 6 Armor (before the damage)', () => {
  play(0, give(0, 'reactive_plating')); endTurn();
  const m = blank(1, 4, 4);
  attack(1, m.uid, hero(0).uid);
  if (armor(0) !== 2 || hero(0).health !== 30) return `armor ${armor(0)} health ${hero(0).health}`;
});

test('Repulsor Shield: Quick Play on an attack at your Hero; draws at 10+ Armor', () => {
  give(0, 'repulsor_shield'); hero(0).armor = 6; endTurn();
  const m = blank(1, 2, 2);
  const n = pl(0).hand.length;
  attack(1, m.uid, hero(0).uid, qp('repulsor_shield'));
  // 6 + 4 = 10 → drew; then the 2 damage hits Armor
  if (pl(0).hand.length !== n) return `hand ${pl(0).hand.length} (played 1, drew 1 expected same)`;
  if (armor(0) !== 8) return `armor ${armor(0)}`;
});

test('Shield Generator: Taunt, 2 Armor at the end of your turn', () => {
  put(0, 'shield_generator'); endTurn();
  if (armor(0) !== 2) return `armor ${armor(0)}`;
});

test('Exo-Frame Overdrive: 3 Armor, +2 Attack and two attacks this turn', () => {
  play(0, give(0, 'exo_frame_overdrive'));
  attack(0, hero(0).uid, hero(1).uid); attack(0, hero(0).uid, hero(1).uid);
  if (hero(1).health !== 26 || armor(0) !== 3) return `enemy ${hero(1).health} armor ${armor(0)}`;
  endTurn(); endTurn();
  if (effectiveAttack(hero(0)) !== 0) return 'attack lingered';
});

test('Bulwark Sentinel: damage equal to Armor, at most 6', () => {
  hero(0).armor = 12;
  const m = blank(1, 1, 10);
  play(0, give(0, 'bulwark_sentinel'), m.uid);
  if (m.health !== 4) return `health ${m.health}`;
});

test('Plasma Lance: hitting a minion also deals 2 to the ones beside it', () => {
  const a = blank(1, 0, 5), b = blank(1, 0, 5), c = blank(1, 0, 5);
  play(0, give(0, 'plasma_lance'));
  attack(0, hero(0).uid, b.uid);
  if (a.health !== 3 || c.health !== 3 || b.health !== 2) return `${a.health} ${b.health} ${c.health}`;
});

test('Arsenal Overseer: +1/+1 to the Weapon; strikes the same target when the Hero attacks', () => {
  play(0, give(0, 'rivet_blade'));
  play(0, give(0, 'arsenal_overseer'));
  if (w(0).attack !== 2 || w(0).durability !== 4) return `${w(0).attack}/${w(0).durability}`;
  attack(0, hero(0).uid, hero(1).uid);
  if (hero(1).health !== 30 - 2 - 4) return `enemy ${hero(1).health}`;
});

test('Titan Mech Suit: 5/3 cannon, 6 Armor, Immune this turn only', () => {
  play(0, give(0, 'titan_mech_suit'));
  if (w(0)?.name !== 'Titan Cannon' || effectiveAttack(hero(0)) !== 5 || armor(0) !== 6) return 'bad equip';
  if (!hasKeyword(hero(0), 'Immune')) return 'not immune';
  const m = blank(1, 6, 6);
  attack(0, hero(0).uid, m.uid);
  if (armor(0) !== 6 || hero(0).health !== 30) return 'took damage while Immune';
  endTurn();
  if (hasKeyword(hero(0), 'Immune')) return 'immune lasted';
});


console.log(`\n${passed} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
