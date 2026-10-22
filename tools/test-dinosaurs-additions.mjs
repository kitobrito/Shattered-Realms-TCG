// Rules tests for Meteorite and the new Dinosaurs (Ceratosaurus family, Dive Bomber and others).
//   node tools/test-dinosaurs-additions.mjs

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

// Player 0 runs Dinosaurs (+ Sharks); player 1 runs Vampires + Robots.
function fresh(fa = ['Dinosaurs', 'Sharks']) {
  const fb = ['Vampires', 'Robots'];
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



const IDS = ['meteorite', 'meteor_strike', 'ankylosaurus_bone_crusher', 'dilophosaurus_venom_spitter', 'pachycephalosaurus', 'juvenile_ceratosaurus', 'bull_ceratosaurus', 'female_ceratosaurus', 'pterodactyl_dive_bomber', 'pterodactyl_diveling'];
// A game where player 0's deck holds Meteorite.
function freshMeteorite() {
  const fa = ['Dinosaurs', 'Sharks'], fb = ['Vampires', 'Robots'];
  const deck = ['meteorite', ...buildDeck(fa).slice(1)];
  s = createGame({ seed: 7, rules: { mulligan: false, secondPlayerPotions: false, openingHandHelp: false }, players: [{ name: 'A', factions: fa, deck }, { name: 'B', factions: fb, deck: buildDeck(fb) }] });
}

test('all new cards exist with art; the two Ceratosaurus parents are legendary', () => {
  for (const id of IDS) if (!getCard(id) || !ART[id] || !existsSync(new URL(`../${ART[id]}`, import.meta.url))) return `missing ${id}`;
  if (!getCard('bull_ceratosaurus').legendary || !getCard('female_ceratosaurus').legendary) return 'not legendary';
});

test('Meteorite is never drawn: it leaves the deck and swaps the Hero Spell', () => {
  freshMeteorite();
  const all = [...pl(0).deck, ...pl(0).hand];
  if (all.some((c) => c.cardId === 'meteorite')) return 'Meteorite is in deck or hand';
  if (!pl(0).heroSpells.some((h) => h.cardId === 'meteor_strike')) return 'no Meteor Strike';
  if (pl(0).passives.includes('extinction_cycle')) return 'still has Extinction Cycle';
  if (pl(0).extinction) return 'Extinction still counting';
});

test('Meteorite: normal Mana growth, no Primal Mana', () => {
  freshMeteorite();
  for (let i = 0; i < 6; i++) { applyAction(s, { type: 'endTurn', player: s.activePlayer }); settle(); }
  const m = pl(0).mana;
  if ((m.primal ?? 0) !== 0) return `primal ${m.primal}`;
  if (m.max !== pl(1).mana.max && m.max !== pl(1).mana.max + 1 && m.max !== pl(1).mana.max - 1) return `max ${m.max} vs ${pl(1).mana.max}`;
});

test('Meteor Strike spends all Mana for that many 1-damage hits on minions only', () => {
  freshMeteorite();
  for (const p of s.players) { p.hand = []; }
  s.activePlayer = 0; pl(0).mana.max = 6; pl(0).mana.current = 6; pl(0).mana.primal = 0; pl(0).mana.temp = 0;
  const a = blank(0, 1, 20), b = blank(1, 1, 20);
  const heroes = [hero(0).health, hero(1).health];
  applyAction(s, { type: 'heroSpell', player: 0, card: 'meteor_strike' }); settle();
  const hits = (20 - a.health) + (20 - b.health);
  if (hits !== 6) return `hits ${hits}`;
  if (pl(0).mana.current !== 0) return `mana left ${pl(0).mana.current}`;
  if (hero(0).health !== heroes[0] || hero(1).health !== heroes[1]) return 'a Hero was hit';
});

test('without Meteorite, Dinosaurs keep Extinction Cycle (and Meteor Strike is not a normal Hero Spell)', () => {
  if (pl(0).heroSpells.some((h) => h.cardId === 'meteor_strike')) return 'Meteor Strike leaked';
  if (!pl(0).extinction) return 'no Extinction';
});

test('Juvenile Ceratosaurus draws the Bull from the deck', () => {
  pl(0).deck.push({ uid: 9700, cardId: 'bull_ceratosaurus', owner: 0 });
  play(0, give(0, 'juvenile_ceratosaurus'));
  if (!pl(0).hand.some((c) => c.cardId === 'bull_ceratosaurus')) return 'no Bull in hand';
  if (pl(0).deck.some((c) => c.cardId === 'bull_ceratosaurus')) return 'still in deck';
});

test('Bull Ceratosaurus (9 Mana, Rush) brings the Female from your hand', () => {
  give(0, 'female_ceratosaurus');
  play(0, give(0, 'bull_ceratosaurus'));
  if (!find(0, 'bull_ceratosaurus') || !find(0, 'female_ceratosaurus')) return 'missing one';
  if (pl(0).hand.some((c) => c.cardId === 'female_ceratosaurus')) return 'Female still in hand';
  if (getCard('bull_ceratosaurus').cost !== 9) return 'cost';
});

test('Female Ceratosaurus lays a Large Dinosaur Egg when she attacks the enemy Hero', () => {
  const f = put(0, 'female_ceratosaurus');
  attack(0, f.uid, hero(1).uid);
  if (!find(0, 'large_dinosaur_egg')) return 'no Egg';
});

test('Pterodactyl Dive Bomber: two 2/1 Divelings attack the chosen minion', () => {
  const e = blank(1, 0, 10);
  play(0, give(0, 'pterodactyl_dive_bomber'), e.uid);
  if (10 - e.health !== 4) return `took ${10 - e.health}`;
  if (pl(0).board.filter((m) => m.cardId === 'pterodactyl_diveling').length !== 2) return 'Divelings missing';
});

test('Dilophosaurus kills what it attacks; Pachycephalosaurus has Rush', () => {
  const e = blank(1, 1, 30);
  const d = put(0, 'dilophosaurus_venom_spitter');
  attack(0, d.uid, e.uid);
  if (pl(1).board.includes(e) && e.health > 0 && !e.destroyed) return 'Venomous failed';
  if (!getCard('pachycephalosaurus').keywords.includes('Rush')) return 'no Rush';
});

console.log(`\n${passed} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
