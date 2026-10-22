// Rules tests for the Void: Hollow (bonuses while your hand is empty), Discard, Feed the Void,
// the Void fusions and the two new Evolved Xenos.
//   node tools/test-void.mjs

import { buildDeck, copyLimit, FACTION_DECKS, PLAYABLE_FACTIONS } from '../src/cards/index.js';
import { addToHand, costOf, effectiveAttack, hasKeyword, summonMinion } from '../src/engine/core.js';
import { applyAction, createGame, getLegalActions } from '../src/engine/engine.js';
import { XENO_FORMS } from '../src/engine/effects.js';
import { allCards, getCard } from '../src/engine/registry.js';
import { ART, FUSION_HERO_ART, HERO_ART } from '../src/cards/art-manifest.js';
import { DECK_TYPES } from '../src/cards/faction-info.js';
import { existsSync } from 'node:fs';

let s;
let failures = 0;
let passed = 0;

// Player 0 runs Void (+ Sharks); player 1 runs Dragons + Robots.
function fresh(fa = ['Void', 'Sharks']) {
  const fb = ['Dragons', 'Robots'];
  const players = [{ name: 'A', factions: fa, deck: buildDeck(fa) }, { name: 'B', factions: fb, deck: buildDeck(fb) }];
  s = createGame({ seed: 7, rules: { mulligan: false, secondPlayerPotions: false, openingHandHelp: false }, players });
  for (const p of s.players) { p.hand = []; p.traps = []; p.mana.max = 10; p.mana.current = 10; p.mana.primal = 0; p.mana.base = 10; }
}
const pl = (p) => s.players[p];
const put = (p, id) => { const m = summonMinion(s, p, id); m.sick = false; return m; };
const give = (p, id) => addToHand(s, p, id);
const find = (p, id) => pl(p).board.find((m) => m.cardId === id);
const blank = (p, atk, hp) => { const m = put(p, 'vampire_gargoyle'); m.keywords = []; m.attack = atk; m.health = hp; m.maxHealth = hp; return m; };
const hero = (p) => pl(p).hero;

// Answers every pending prompt: passes reactions, and picks `pick(options)` (default the first) for choices.
function settle(pick = () => 0) {
  for (let i = 0; i < 50 && s.pending; i++) {
    if (s.pending.type === 'reaction') applyAction(s, { type: 'pass', player: s.pending.player });
    else if (s.pending.type === 'choice') applyAction(s, { type: 'choose', player: s.pending.player, index: pick(s.pending.options) });
    else break;
  }
}
function play(p, inst, target, pick) {
  applyAction(s, { type: 'play', player: p, card: inst.uid, ...(target != null ? { target } : {}) });
  settle(pick);
}
function heroSpell(p, id, target, pick) {
  applyAction(s, { type: 'heroSpell', player: p, card: id, ...(target != null ? { target } : {}) });
  settle(pick);
}
function fusion(p, id, target, pick) {
  pl(p).fusion = { cardId: id, charge: 3 };
  applyAction(s, { type: 'heroSpell', player: p, card: id, ...(target != null ? { target } : {}) });
  settle(pick);
}
function attack(p, attacker, defender) {
  applyAction(s, { type: 'attack', player: p, attacker, defender });
  settle();
}
const canAttackNow = (m) => getLegalActions(s).some((a) => a.type === 'attack' && a.attacker === m.uid);
// Picks the option whose card has this id.
const pickId = (id) => (opts) => Math.max(0, opts.findIndex((o) => o.cardId === id));
function test(name, fn) {
  fresh();
  try { const r = fn(); if (r) { failures++; console.log(`FAIL ${name}: ${r}`); } else { passed++; console.log(`ok   ${name}`); } }
  catch (e) { failures++; console.log(`FAIL ${name}: ${e.stack.split('\n').slice(0, 3).join(' | ')}`); }
}

const VOID_IDS = allCards().filter((c) => c.faction === 'Void').map((c) => c.id);
const FUSION_IDS = allCards().filter((c) => c.fusion?.includes('Void')).map((c) => c.id);

test('Void is a playable realm: 30 standard cards, a Hero Spell and a token, in the Aggro row', () => {
  if (!PLAYABLE_FACTIONS.includes('Void')) return 'not playable';
  if (FACTION_DECKS.Void.length !== 30) return `deck has ${FACTION_DECKS.Void.length}`;
  if (!getCard('feed_the_void')?.heroSpell) return 'no hero spell';
  if (!getCard('void_spawn')?.token) return 'no Void Spawn token';
  const aggro = DECK_TYPES.find((d) => d.name === 'Aggro');
  if (!aggro.factions.includes('Void') || aggro.factions.length !== 3) return `Aggro row: ${aggro.factions}`;
  if (DECK_TYPES.some((d) => d.factions.length !== 3)) return 'a row is not three realms';
});

test('every Void card, fusion, Xeno and hero has art on disk; Nihilax is legendary and one-of', () => {
  for (const id of [...VOID_IDS, ...FUSION_IDS, 'xeno_lycan', 'umbral_xeno']) {
    if (!ART[id] || !existsSync(new URL(`../${ART[id]}`, import.meta.url))) return `no art for ${id}`;
  }
  if (FUSION_IDS.length !== 17) return `${FUSION_IDS.length} Void fusions`;
  if (!existsSync(new URL(`../${HERO_ART.Void}`, import.meta.url))) return 'no hero';
  const others = PLAYABLE_FACTIONS.filter((f) => f !== 'Void');
  for (const f of others) if (!FUSION_HERO_ART[`void-${f.toLowerCase()}`]) return `no fusion hero with ${f}`;
  for (const f of ['backs/void.jpg', 'boards-v2/void.jpg', 'boards-portrait/void.jpg', 'frames/legendary-minion-void.webp']) {
    if (!existsSync(new URL(`../art/${f}`, import.meta.url))) return `missing art/${f}`;
  }
  if (!getCard('nihilax_the_world_eater').legendary) return 'Nihilax not legendary';
  if (copyLimit('nihilax_the_world_eater') !== 1) return 'Nihilax copy limit';
});

test('Hollow: Voidling has +2 Attack only while your hand is empty', () => {
  const v = put(0, 'voidling');
  give(0, 'shadow_mite');
  applyAction(s, { type: 'endTurn', player: 0 }); settle(); // auras recompute; it's now B's turn
  if (effectiveAttack(v) !== 1) return `with a card in hand: ${effectiveAttack(v)}`;
  pl(0).hand = []; pl(0).deck = []; // no draw at the start of A's turn
  applyAction(s, { type: 'endTurn', player: 1 }); settle();
  if (effectiveAttack(v) !== 3) return `with an empty hand: ${effectiveAttack(v)}`;
});

test('Hollow: playing your last card wakes it at once (Starless Prowler can Charge)', () => {
  const inst = give(0, 'starless_prowler');
  play(0, inst);
  const m = find(0, 'starless_prowler');
  if (!m) return 'not played';
  if (!hasKeyword(m, 'Charge')) return 'no Charge with an empty hand';
  if (!canAttackNow(m)) return 'cannot attack the turn it was played';
});

test('Hollow: with a card left in hand, Starless Prowler has no Charge', () => {
  const inst = give(0, 'starless_prowler');
  give(0, 'shadow_mite');
  play(0, inst);
  const m = find(0, 'starless_prowler');
  if (hasKeyword(m, 'Charge')) return 'has Charge';
  if (canAttackNow(m)) return 'can attack';
});

test('Feed the Void: you choose the discard; the minion gets +2/+2; the counter goes up', () => {
  const m = blank(0, 2, 2);
  const a = give(0, 'shadow_mite'), b = give(0, 'riftmaw_devourer');
  heroSpell(0, 'feed_the_void', m.uid, pickId('riftmaw_devourer'));
  if (m.attack !== 4 || m.health !== 4) return `stats ${m.attack}/${m.health}`;
  if (pl(0).hand.length !== 1 || pl(0).hand[0].uid !== a.uid) return 'wrong card discarded';
  if (!pl(0).graveyard.some((c) => c.uid === b.uid)) return 'discarded card not in Graveyard';
  if (pl(0).discarded !== 1) return `discarded ${pl(0).discarded}`;
});

test('Feed the Void needs a card in hand to cast', () => {
  blank(0, 2, 2);
  if (getLegalActions(s).some((a) => a.type === 'heroSpell' && a.card === 'feed_the_void')) return 'castable with an empty hand';
  give(0, 'shadow_mite');
  if (!getLegalActions(s).some((a) => a.type === 'heroSpell' && a.card === 'feed_the_void')) return 'not castable with a card';
});

test('Event Horizon Hound: with an empty hand nothing is discarded and it stays 2/2', () => {
  const inst = give(0, 'event_horizon_hound');
  play(0, inst);
  const m = find(0, 'event_horizon_hound');
  if (m.attack !== 2 || m.health !== 2) return `${m.attack}/${m.health}`;
  give(0, 'shadow_mite');
  const inst2 = give(0, 'event_horizon_hound');
  play(0, inst2); // only one other card: it goes without a prompt
  const m2 = pl(0).board.filter((x) => x.cardId === 'event_horizon_hound')[1];
  if (m2.attack !== 4 || m2.health !== 4) return `second hound ${m2.attack}/${m2.health}`;
  if (pl(0).hand.length) return 'hand not empty';
});

test('Nebula Gnawer and Lightless Behemoth grow whenever you discard', () => {
  const g = put(0, 'nebula_gnawer'), b = put(0, 'lightless_behemoth');
  give(0, 'shadow_mite'); give(0, 'voidling');
  const sf = give(0, 'starfall_feast');
  play(0, sf, g.uid);
  // Two cards discarded: Gnawer +2 Attack from discards, +2/+2 from Starfall Feast.
  if (g.attack !== 4 + 2 + 2) return `Gnawer attack ${g.attack}`;
  if (b.attack !== 6 || b.health !== 8) return `Behemoth ${b.attack}/${b.health}`;
});

test('Eclipse Maw deals the discarded card\'s Cost to the enemy Hero', () => {
  give(0, 'abyssal_leviathan'); // printed Cost 7
  const inst = give(0, 'eclipse_maw');
  const before = hero(1).health;
  play(0, inst);
  if (before - hero(1).health !== 7) return `dealt ${before - hero(1).health}`;
});

test('Star-Swallower: discards your hand, 2 damage per card, up to 10', () => {
  for (let i = 0; i < 7; i++) give(0, 'shadow_mite');
  const inst = give(0, 'star_swallower');
  const before = hero(1).health;
  play(0, inst);
  if (pl(0).hand.length) return 'hand not empty';
  if (before - hero(1).health !== 10) return `dealt ${before - hero(1).health}`;
});

test('Abyssal Leviathan and Nihilax cost less for each card discarded this game', () => {
  const lev = give(0, 'abyssal_leviathan'), nih = give(0, 'nihilax_the_world_eater');
  pl(0).discarded = 3;
  if (costOf(s, lev) !== 4) return `Leviathan ${costOf(s, lev)}`;
  if (costOf(s, nih) !== 5) return `Nihilax ${costOf(s, nih)}`;
  pl(0).discarded = 9;
  if (costOf(s, lev) !== 1) return `Leviathan floor ${costOf(s, lev)}`;
  if (costOf(s, nih) !== 4) return `Nihilax floor ${costOf(s, nih)}`;
});

test('Nihilax: discards your hand and gains +1/+1 per card, with Charge', () => {
  give(0, 'shadow_mite'); give(0, 'voidling'); give(0, 'gloom_lurker');
  const inst = give(0, 'nihilax_the_world_eater');
  play(0, inst);
  const m = find(0, 'nihilax_the_world_eater');
  if (m.attack !== 11 || m.health !== 11) return `${m.attack}/${m.health}`;
  if (!canAttackNow(m)) return 'cannot attack';
});

test('Shadow Brood-Mother: 1/1 Spawn with a card in hand, 2/2 when Hollow', () => {
  give(0, 'shadow_mite');
  play(0, give(0, 'shadow_brood_mother'));
  const small = pl(0).board.filter((m) => m.cardId === 'void_spawn');
  if (small.length !== 2 || small.some((m) => m.attack !== 1)) return `first: ${small.map((m) => m.attack)}`;
  pl(0).hand = [];
  play(0, give(0, 'shadow_brood_mother'));
  const big = pl(0).board.filter((m) => m.cardId === 'void_spawn' && m.attack === 2 && m.health === 2);
  if (big.length !== 2) return `second: ${big.length}`;
});

test('Hunger of the Void deals 2, or 4 when it was your last card', () => {
  give(0, 'shadow_mite');
  let before = hero(1).health;
  play(0, give(0, 'hunger_of_the_void'), hero(1).uid);
  if (before - hero(1).health !== 2) return `with a card: ${before - hero(1).health}`;
  pl(0).hand = [];
  before = hero(1).health;
  play(0, give(0, 'hunger_of_the_void'), hero(1).uid);
  if (before - hero(1).health !== 4) return `last card: ${before - hero(1).health}`;
});

test('Swallowed by Darkness destroys a minion and discards two cards (choosing each)', () => {
  const e = blank(1, 5, 9);
  give(0, 'shadow_mite'); give(0, 'voidling'); give(0, 'gloom_lurker');
  play(0, give(0, 'swallowed_by_darkness'), e.uid, pickId('voidling'));
  if (!e.destroyed && pl(1).board.includes(e)) return 'not destroyed';
  if (pl(0).hand.length !== 1) return `${pl(0).hand.length} left`;
  if (pl(0).discarded !== 2) return `discarded ${pl(0).discarded}`;
});

test('Devour the Stars: 2 damage per friendly Void minion', () => {
  put(0, 'voidling'); put(0, 'shadow_mite'); put(0, 'reef_nibbler');
  const before = hero(1).health;
  play(0, give(0, 'devour_the_stars'));
  if (before - hero(1).health !== 4) return `dealt ${before - hero(1).health}`;
});

test('Traps: Swallowing Dark hits a played minion for 3; Void Ambush summons two Spawn', () => {
  pl(0).traps.push({ uid: 9001, cardId: 'swallowing_dark', owner: 0 });
  pl(0).traps.push({ uid: 9002, cardId: 'void_ambush', owner: 0 });
  applyAction(s, { type: 'endTurn', player: 0 }); settle();
  for (const p of s.players) { p.mana.current = 10; }
  play(1, give(1, 'vampire_gargoyle'));
  const g = find(1, 'vampire_gargoyle');
  if (g && g.health > 0 && !g.destroyed && g.maxHealth - g.health !== 3) return `gargoyle took ${g.maxHealth - g.health}`;
  const att = put(1, 'vampire_gargoyle');
  attack(1, att.uid, hero(0).uid);
  if (pl(0).board.filter((m) => m.cardId === 'void_spawn').length !== 2) return 'no Spawn';
});

test('Fusions: Extinction Event discards your hand and hits enemy minions per card (max 4)', () => {
  const e = blank(1, 1, 9);
  for (let i = 0; i < 6; i++) give(0, 'shadow_mite');
  fusion(0, 'extinction_event');
  if (9 - e.health !== 4) return `took ${9 - e.health}`;
});

test('Fusions: Abyssal Feeding marks Prey and pumps Sharks and Void minions', () => {
  const e = blank(1, 1, 9);
  const v = put(0, 'voidling'), sh = put(0, 'reef_nibbler'), other = put(0, 'vampire_gargoyle');
  const before = [v.attack, effectiveAttack(sh), effectiveAttack(other)];
  pl(0).hand = [{ uid: 9100, cardId: 'shadow_mite', owner: 0 }]; // keep Voidling's Hollow off
  fusion(0, 'abyssal_feeding', e.uid);
  if (!e.prey) return 'not Prey';
  if (effectiveAttack(v) !== before[0] + 2 || effectiveAttack(sh) !== before[1] + 2) return 'not pumped';
  if (effectiveAttack(other) !== before[2]) return 'pumped a Vampire';
});

test('Evolved Xenos: Lycanthrope and Void hosts have their own forms', () => {
  if (XENO_FORMS.Lycanthropes !== 'xeno_lycan' || XENO_FORMS.Void !== 'umbral_xeno') return JSON.stringify(XENO_FORMS);
  if (!getCard('xeno_lycan').keywords.includes('Rage')) return 'Xeno Lycan has no Rage';
  if (!getCard('umbral_xeno').aura?.if?.handEmpty) return 'Umbral Xeno is not Hollow';
});

console.log(`\n${passed} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
