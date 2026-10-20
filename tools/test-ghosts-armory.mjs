// Rules tests for the Ghosts' Cursed Armory expansion (Relics). Each test sets
// up a small board, plays the card through the real engine, and checks the outcome.
//   node tools/test-ghosts-armory.mjs

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

// Player 0 runs Ghosts + Vampires; player 1 runs Aliens + Plants.
function fresh() {
  const fa = ['Ghosts', 'Vampires'], fb = ['Aliens', 'Plants'];
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

const IDS = ['grave_squire', 'rusted_spectral_dagger', 'lantern_of_lost_souls', 'poltergeist_porter', 'wailing_chains', 'haunted_armor', 'cursed_heirloom',
  'phantom_blacksmith', 'reapers_scythe', 'spirit_bond', 'possessed_shield', 'banshee_blade_bearer', 'requiem_of_arms', 'the_hollow_knight', 'soulforge_relic'];
const hero = (p) => pl(p).hero;
const w = (p) => hero(p).weapon;
const ghost = (p, atk = 2, hp = 3) => { const m = put(p, 'poltergeist_porter'); m.attack = atk; m.health = hp; m.maxHealth = hp; return m; };
// A minion that died this game, in player p's Graveyard (for Haunt).
const corpse = (p, id) => pl(p).graveyard.push({ uid: 9000 + pl(p).graveyard.length, cardId: id, owner: p, died: true });

test('All 15 Cursed Armory cards (+ Phantom Blade) exist, are Ghost expansion cards and have art', () => {
  for (const id of IDS) {
    const c = getCard(id);
    if (!c?.extra || c.faction !== 'Ghosts') return `${id} missing`;
    if (!ART[id] || !existsSync(ART[id])) return `${id} has no art`;
  }
  if (!ART.phantom_blade || !existsSync(ART.phantom_blade)) return 'phantom blade art';
});

test('A Relic can target your Hero or a friendly Ghost only', () => {
  const g = ghost(0); const v = blank(0, 1, 1); blank(1, 1, 1);
  const ids = targetCandidates(s, getCard('wailing_chains').target, 0);
  if (!ids.includes(hero(0).uid) || !ids.includes(g.uid)) return 'missing hero/ghost';
  if (ids.includes(v.uid) || ids.length !== 2) return `bad targets ${ids.length}`;
});

test('Relic on the Hero: a Weapon that wears out', () => {
  play(0, give(0, 'wailing_chains'), hero(0).uid);
  if (w(0)?.attack !== 2 || w(0).durability !== 2) return 'not a 2/2';
  attack(0, hero(0).uid, hero(1).uid);
  if (hero(1).health !== 28 || w(0).durability !== 1) return `${hero(1).health} ${w(0).durability}`;
});

test('Relic on a Ghost: stats and keywords; it lingers to the unarmed Hero when the Ghost dies', () => {
  const g = ghost(0, 2, 3);
  play(0, give(0, 'rusted_spectral_dagger'), g.uid);
  if (effectiveAttack(g) !== 3 || !hasKeyword(g, 'Evade')) return 'no +1 / Evade';
  g.health = 0; play(0, give(0, 'grave_squire')); // any action resolves deaths
  if (w(0)?.name !== 'Rusted Spectral Dagger') return 'did not linger to hero';
});

test("A lingering Relic doesn't replace a Weapon the Hero already holds", () => {
  play(0, give(0, 'reapers_scythe'), hero(0).uid);
  const g = ghost(0);
  play(0, give(0, 'wailing_chains'), g.uid);
  g.destroyed = true; play(0, give(0, 'grave_squire'));
  if (w(0).name !== "Reaper's Scythe") return w(0).name;
});

test('Wailing Chains freezes the enemy minion it attacks', () => {
  const g = ghost(0, 1, 9); g.sick = false;
  play(0, give(0, 'wailing_chains'), g.uid);
  const m = blank(1, 0, 9);
  attack(0, g.uid, m.uid);
  if (!hasKeyword(m, 'Frozen')) return 'not frozen';
});

test('Grave Squire: +1 Attack to a Relic you hold', () => {
  play(0, give(0, 'rusted_spectral_dagger'), hero(0).uid);
  play(0, give(0, 'grave_squire'));
  if (w(0).attack !== 2 || effectiveAttack(hero(0)) !== 2) return `${w(0).attack}`;
});

test('Lantern of Lost Souls Haunts a 1-cost minion at the end of your turn', () => {
  corpse(1, 'vampire_bat');
  play(0, give(0, 'lantern_of_lost_souls'), hero(0).uid);
  endTurn();
  if (!find(0, 'vampire_bat')) return 'no haunt';
});

test("Poltergeist Porter takes your Hero's Relic", () => {
  play(0, give(0, 'reapers_scythe'), hero(0).uid);
  play(0, give(0, 'poltergeist_porter'));
  const g = find(0, 'poltergeist_porter');
  if (w(0)) return 'hero still armed';
  if (g.relic?.cardId !== 'reapers_scythe' || effectiveAttack(g) !== 5) return `${g.relic?.cardId} ${effectiveAttack(g)}`;
});

test('Haunted Armor: +1/+1 if the Hero holds a Weapon', () => {
  play(0, give(0, 'haunted_armor'));
  const a = find(0, 'haunted_armor');
  play(0, give(0, 'wailing_chains'), hero(0).uid); play(0, give(0, 'haunted_armor'));
  const b = pl(0).board.filter((m) => m.cardId === 'haunted_armor')[1];
  if (effectiveAttack(a) !== 2 || effectiveAttack(b) !== 3 || b.health !== 5) return `${effectiveAttack(a)} ${effectiveAttack(b)}/${b.health}`;
});

test('Cursed Heirloom Haunts a friendly Ghost that dies', () => {
  play(0, give(0, 'cursed_heirloom'));
  const g = ghost(0); g.destroyed = true; play(0, give(0, 'grave_squire'));
  if (!find(0, 'poltergeist_porter')) return 'not haunted back';
});

test('Phantom Blacksmith: every Relic +1 (Hero +1 Attack/+1 Durability, Ghost +1/+1)', () => {
  play(0, give(0, 'wailing_chains'), hero(0).uid);
  const g = ghost(0, 2, 3); play(0, give(0, 'rusted_spectral_dagger'), g.uid);
  play(0, give(0, 'phantom_blacksmith'));
  if (w(0).attack !== 3 || w(0).durability !== 3) return `hero ${w(0).attack}/${w(0).durability}`;
  if (effectiveAttack(g) !== 4 || g.health !== 4) return `ghost ${effectiveAttack(g)}/${g.health}`;
});

test("Reaper's Scythe Haunts the minion it kills", () => {
  play(0, give(0, 'reapers_scythe'), hero(0).uid);
  const m = blank(1, 0, 2);
  attack(0, hero(0).uid, m.uid);
  if (!find(0, 'vampire_gargoyle')) return 'not haunted to my side';
});

test('Spirit Bond saves a Relic holder from lethal damage', () => {
  const g = ghost(0, 1, 2); play(0, give(0, 'rusted_spectral_dagger'), g.uid);
  removeEvade(g);
  give(0, 'spirit_bond'); endTurn();
  const m = blank(1, 9, 9); m.sick = false;
  attack(1, m.uid, g.uid, qp('spirit_bond'));
  if (!pl(0).board.includes(g) || !hasKeyword(g, 'Evade')) return 'died or no Evade';
});
function removeEvade(g) { g.keywords = g.keywords.filter((k) => k !== 'Evade'); }

test('Possessed Shield on the Hero: 4 Armor, and 2 more when the Hero is attacked', () => {
  play(0, give(0, 'possessed_shield'), hero(0).uid);
  if (hero(0).armor !== 4) return `armor ${hero(0).armor}`;
  endTurn();
  const m = blank(1, 1, 1); m.sick = false;
  attack(1, m.uid, hero(0).uid);
  if (hero(0).armor !== 5) return `armor ${hero(0).armor}`;
});

test('Banshee Blade-Bearer takes up a Phantom Blade (6 Attack)', () => {
  play(0, give(0, 'banshee_blade_bearer'));
  const b = find(0, 'banshee_blade_bearer');
  if (b.relic?.cardId !== 'phantom_blade' || effectiveAttack(b) !== 6) return `${effectiveAttack(b)}`;
});

test('Requiem of Arms: Relic holders +1/+1, Hero Weapon +2 Durability', () => {
  play(0, give(0, 'wailing_chains'), hero(0).uid);
  const g = ghost(0, 2, 3); play(0, give(0, 'rusted_spectral_dagger'), g.uid);
  const plain = ghost(0, 2, 3);
  play(0, give(0, 'requiem_of_arms'));
  if (w(0).durability !== 4) return 'durability';
  if (effectiveAttack(g) !== 4 || effectiveAttack(plain) !== 2) return `${effectiveAttack(g)} ${effectiveAttack(plain)}`;
});

test("The Hollow Knight takes the Hero's Relic and grows per Relic played", () => {
  play(0, give(0, 'rusted_spectral_dagger'), hero(0).uid);
  play(0, give(0, 'wailing_chains'), hero(0).uid); // 2 Relics played
  pl(0).mana.current = 10;
  play(0, give(0, 'the_hollow_knight'));
  const k = find(0, 'the_hollow_knight');
  if (k.relic?.cardId !== 'wailing_chains') return 'no relic';
  if (effectiveAttack(k) !== 4 + 2 + 2 || k.health !== 8) return `${effectiveAttack(k)}/${k.health}`;
});

test('Soulforge Relic: Haunts when attacking; Haunts 2 when it breaks', () => {
  for (const id of ['vampire_bat', 'vampire_thrall', 'blood_mite', 'nightstalker', 'vampire_bat']) corpse(0, id);
  play(0, give(0, 'soulforge_relic'), hero(0).uid);
  w(0).durability = 1;
  const n = pl(0).board.length;
  attack(0, hero(0).uid, hero(1).uid);
  if (w(0)) return 'did not break';
  if (pl(0).board.length !== n + 3) return `board ${pl(0).board.length - n}`;
});

console.log(`\n${passed} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
