// Rules tests for the elemental Dragons: Nidhöggr, Stormscale Drake, Nessira, Tidepool Whelp
// and the Fourfold Hydra.
//   node tools/test-dragons-elements.mjs

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

// Player 0 runs Dragons (+ Sharks); player 1 runs Vampires + Robots.
function fresh(fa = ['Dragons', 'Sharks']) {
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


const IDS = ['tidepool_whelp', 'stormscale_drake', 'nessira_wyrm_of_the_deep_loch', 'nidhoggr_the_stormfrost_wyrm', 'the_fourfold_hydra'];

test('five elemental Dragons with art; the three big ones are one-of legendaries', () => {
  for (const id of IDS) {
    const c = getCard(id);
    if (!c || c.faction !== 'Dragons' || !c.extra) return `bad ${id}`;
    if (!ART[id] || !existsSync(new URL(`../${ART[id]}`, import.meta.url))) return `no art for ${id}`;
  }
  for (const id of IDS.slice(2)) if (!getCard(id).legendary || copyLimit(id) !== 1) return `${id} not legendary`;
});

test('Tidepool Whelp restores 2 Health to your Hero', () => {
  hero(0).health = 20;
  play(0, give(0, 'tidepool_whelp'));
  if (hero(0).health !== 22) return `${hero(0).health}`;
});

test('Stormscale Drake: Rush, and chain lightning after it attacks', () => {
  const e = blank(1, 0, 10);
  play(0, give(0, 'stormscale_drake'));
  const d = find(0, 'stormscale_drake');
  const before = hero(1).health + e.health;
  attack(0, d.uid, e.uid);
  const lost = before - (hero(1).health + e.health);
  if (lost !== 5) return `total damage ${lost} (4 from the attack + 1 lightning expected)`;
});

test('Nessira returns enemy minions costing 2 or less to hand, leaves bigger ones', () => {
  const small = put(1, 'vampire_bat'), big = put(1, 'vampire_gargoyle');
  const bigCost = getCard('vampire_gargoyle').cost;
  play(0, give(0, 'nessira_wyrm_of_the_deep_loch'));
  if (pl(1).board.includes(small)) return 'small minion stayed';
  if (!pl(1).hand.some((c) => c.cardId === 'vampire_bat')) return 'not in their hand';
  if (bigCost > 2 && !pl(1).board.includes(big)) return 'big minion left';
});

test('Nidhöggr strikes 3 times for 2 and Freezes survivors', () => {
  const a = blank(1, 1, 20);
  pl(1).hero.health = 30;
  play(0, give(0, 'nidhoggr_the_stormfrost_wyrm'));
  const dealt = (30 - hero(1).health) + (20 - a.health);
  if (dealt !== 6) return `dealt ${dealt}`;
  if (a.health < 20 && !hasKeyword(a, 'Frozen')) return 'survivor not Frozen';
});

test('The Fourfold Hydra: Burn the Hero, Freeze one, 2 lightning, heal 3', () => {
  const a = blank(1, 1, 10), b = blank(1, 1, 10);
  hero(0).health = 20;
  play(0, give(0, 'the_fourfold_hydra'));
  if (!(hero(1).burn > 0)) return 'enemy Hero not Burning';
  if (![a, b].some((m) => hasKeyword(m, 'Frozen'))) return 'nobody Frozen';
  if ((10 - a.health) + (10 - b.health) !== 2) return `lightning ${(10 - a.health) + (10 - b.health)}`;
  if (hero(0).health !== 23) return `healed to ${hero(0).health}`;
});

console.log(`\n${passed} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
