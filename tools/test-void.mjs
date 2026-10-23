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
  if (DECK_TYPES.some((d) => d.factions.length < 3)) return 'a row has fewer than three realms';
});

test('every Void card, fusion, Xeno and hero has art on disk; Nihilax is legendary and one-of', () => {
  for (const id of [...VOID_IDS, ...FUSION_IDS, 'xeno_lycan', 'umbral_xeno']) {
    if (!ART[id] || !existsSync(new URL(`../${ART[id]}`, import.meta.url))) return `no art for ${id}`;
  }
  if (FUSION_IDS.length !== PLAYABLE_FACTIONS.length - 1) return `${FUSION_IDS.length} Void fusions`;
  if (!existsSync(new URL(`../${HERO_ART.Void}`, import.meta.url))) return 'no hero';
  const others = PLAYABLE_FACTIONS.filter((f) => f !== 'Void');
  for (const f of others) {
    const slug = f.toLowerCase().replace(/\s+/g, '-');
    if (!FUSION_HERO_ART[`void-${slug}`] && !FUSION_HERO_ART[`${slug}-void`]) return `no fusion hero with ${f}`;
  }
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

// ---- Singularity (expansion): Pull and Collapse ----
const foeDeckHas = (id) => pl(1).deck.some((c) => c.cardId === id);
function stackFoeDeck(ids) { pl(1).deck = ids.map((id, i) => ({ uid: 9500 + i, cardId: id, owner: 1 })); }

test('Singularity: 15 expansion cards with art; Gargantua is legendary', () => {
  const ids = allCards().filter((c) => c.faction === 'Void' && c.extra).map((c) => c.id);
  if (ids.length !== 15) return `${ids.length} expansion cards`;
  for (const id of ids) if (!ART[id] || !existsSync(new URL(`../${ART[id]}`, import.meta.url))) return `no art for ${id}`;
  if (!getCard('gargantua_the_living_singularity').legendary) return 'Gargantua not legendary';
});

test('Pull: choose 1 of 3 from the enemy deck; it leaves their deck and joins your hand', () => {
  stackFoeDeck(['vampire_gargoyle', 'bloodhound', 'crimson_duelist', 'blood_drinker']);
  give(0, 'shadow_mite'); // a card in hand: no Collapse
  let offered = [];
  play(0, give(0, 'wormhole'), null, (opts) => { offered = opts.map((o) => o.cardId); return Math.max(0, opts.findIndex((o) => o.cardId === 'bloodhound')); });
  if (offered.length !== 3) return `offered ${offered.length}`;
  if (foeDeckHas('bloodhound') && offered.includes('bloodhound')) return 'still in their deck';
  const got = pl(0).hand.find((c) => c.pulled);
  if (!got || !offered.includes(got.cardId)) return 'not in hand';
  if (got.bonusKeywords?.length) return 'Collapsed with a card in hand';
  if (pl(1).deck.length !== 3) return `their deck has ${pl(1).deck.length}`;
});

test('Collapse: Pulling with an empty hand gives a minion a bonus keyword it keeps on the board', () => {
  stackFoeDeck(['bloodhound']);
  play(0, give(0, 'wormhole')); // the only card in hand; it's gone when Wormhole resolves
  const got = pl(0).hand.find((c) => c.pulled);
  if (!got?.bonusKeywords?.length) return 'no bonus keyword';
  const k = got.bonusKeywords[0];
  play(0, got);
  const m = find(0, 'bloodhound');
  if (!m || !hasKeyword(m, k)) return `played without ${k}`;
});

test('Collapse: a Pulled spell costs (1) less instead', () => {
  stackFoeDeck(['blood_drain']);
  play(0, give(0, 'wormhole'));
  const got = pl(0).hand.find((c) => c.pulled);
  if (!got) return 'nothing pulled';
  if (costOf(s, got) !== getCard('blood_drain').cost - 1) return `costs ${costOf(s, got)}`;
});

test('Lensing Wisp Pulls a spell; Spaghettifier Pulls a minion', () => {
  stackFoeDeck(['vampire_gargoyle', 'bloodhound', 'blood_drain', 'vampire_bite']);
  give(0, 'shadow_mite');
  play(0, give(0, 'lensing_wisp'));
  if (getCard(pl(0).hand.find((c) => c.pulled)?.cardId ?? 'shadow_mite').type !== 'spell') return 'Wisp pulled a non-spell';
  pl(0).hand = [{ uid: 9600, cardId: 'shadow_mite', owner: 0 }];
  play(0, give(0, 'spaghettifier'));
  if (getCard(pl(0).hand.find((c) => c.pulled)?.cardId ?? 'blood_drain').type !== 'minion') return 'Spaghettifier pulled a non-minion';
});

test('Accretion Serpent grows on each Pull; Wormhole Stalker makes Pulled cards cheaper', () => {
  const sp = put(0, 'accretion_serpent'); put(0, 'wormhole_stalker');
  stackFoeDeck(['bloodhound', 'vampire_gargoyle']);
  give(0, 'shadow_mite');
  play(0, give(0, 'wormhole'));
  if (sp.attack !== 3 || sp.health !== 3) return `Serpent ${sp.attack}/${sp.health}`;
  const got = pl(0).hand.find((c) => c.pulled);
  if (costOf(s, got) !== getCard(got.cardId).cost - 1) return `Pulled card costs ${costOf(s, got)}`;
});

test('Pulsar Hound gains Attack when you play a Pulled card', () => {
  const h = put(0, 'pulsar_hound');
  stackFoeDeck(['bloodhound']);
  give(0, 'shadow_mite');
  play(0, give(0, 'wormhole'));
  play(0, pl(0).hand.find((c) => c.pulled));
  if (h.attack !== 4) return `Hound attack ${h.attack}`;
  play(0, pl(0).hand.find((c) => c.cardId === 'shadow_mite'));
  if (h.attack !== 4) return 'grew from a normal card';
});

test('Gargantua Pulls 3 cards, all Collapsed', () => {
  stackFoeDeck(['bloodhound', 'vampire_gargoyle', 'crimson_duelist', 'blood_drinker', 'blood_drain']);
  give(0, 'shadow_mite');
  play(0, give(0, 'gargantua_the_living_singularity'));
  const got = pl(0).hand.filter((c) => c.pulled);
  if (got.length !== 3) return `pulled ${got.length}`;
  for (const c of got) if (getCard(c.cardId).type === 'minion' ? !c.bonusKeywords?.length : !(c.costMod < 0)) return `${c.cardId} not Collapsed`;
  if (pl(1).deck.length !== 2) return `their deck ${pl(1).deck.length}`;
});

test('Gravitational Collapse: discard 3, Pull 3 (Collapsed); counts as discards', () => {
  stackFoeDeck(['bloodhound', 'vampire_gargoyle', 'crimson_duelist', 'blood_drinker', 'blood_drain', 'vampire_bite']);
  give(0, 'shadow_mite'); give(0, 'voidling'); give(0, 'gloom_lurker');
  play(0, give(0, 'gravitational_collapse'));
  const got = pl(0).hand.filter((c) => c.pulled);
  if (got.length !== 3 || pl(0).hand.length !== 3) return `hand ${pl(0).hand.length}, pulled ${got.length}`;
  if (pl(0).discarded !== 3) return `discarded ${pl(0).discarded}`;
  if (pl(0).pulled !== 3) return `pulled count ${pl(0).pulled}`;
});

test('Quasar Maw Pulls twice only when it Collapses', () => {
  stackFoeDeck(['bloodhound', 'vampire_gargoyle', 'crimson_duelist', 'blood_drinker']);
  play(0, give(0, 'quasar_maw'));
  if (pl(0).hand.filter((c) => c.pulled).length !== 2) return `Collapsed: ${pl(0).hand.length}`;
  give(0, 'shadow_mite');
  play(0, give(0, 'quasar_maw'));
  if (pl(0).hand.filter((c) => c.pulled).length !== 3) return `not Collapsed: ${pl(0).hand.filter((c) => c.pulled).length}`;
});

test('Dark Star costs (1) less per card Pulled, not below 2', () => {
  const d = give(0, 'dark_star');
  pl(0).pulled = 3; if (costOf(s, d) !== 3) return `3 pulled: ${costOf(s, d)}`;
  pl(0).pulled = 9; if (costOf(s, d) !== 2) return `floor: ${costOf(s, d)}`;
});

test('White Hole Emissary summons a minion out of the enemy deck', () => {
  stackFoeDeck(['blood_drain', 'bloodhound']);
  play(0, give(0, 'white_hole_emissary'));
  if (!find(0, 'bloodhound')) return 'no Bloodhound on my side';
  if (foeDeckHas('bloodhound')) return 'still in their deck';
});

test('Spaghettification Pulls only if the minion dies', () => {
  stackFoeDeck(['bloodhound', 'vampire_gargoyle']);
  const big = blank(1, 1, 9), small = blank(1, 1, 2);
  give(0, 'shadow_mite');
  play(0, give(0, 'spaghettification'), big.uid);
  if (pl(0).hand.some((c) => c.pulled)) return 'Pulled after a survivor';
  play(0, give(0, 'spaghettification'), small.uid);
  if (!pl(0).hand.some((c) => c.pulled)) return 'no Pull after a kill';
});

test('Gravity Snare: the card your opponent draws is Pulled into your hand', () => {
  stackFoeDeck(['bloodhound', 'vampire_gargoyle']);
  pl(0).traps.push({ uid: 9003, cardId: 'gravity_snare', owner: 0 });
  give(0, 'shadow_mite');
  applyAction(s, { type: 'endTurn', player: 0 }); settle();
  if (!pl(0).hand.some((c) => c.pulled && c.cardId === 'bloodhound')) return `my hand: ${pl(0).hand.map((c) => c.cardId)}`;
  if (pl(1).hand.some((c) => c.cardId === 'bloodhound')) return 'still in their hand';
});

test('Hawking Wraith Pulls when it dies', () => {
  stackFoeDeck(['bloodhound', 'vampire_gargoyle']);
  const w = put(0, 'hawking_wraith');
  give(0, 'shadow_mite');
  play(0, give(0, 'spaghettification'), w.uid);
  play(0, give(0, 'spaghettification'), w.uid);
  if (!pl(0).hand.some((c) => c.pulled)) return 'no Pull';
});

console.log(`\n${passed} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
