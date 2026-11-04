// Rules tests for the Plants' Cordyceps Outbreak (Zombies) + Cordyceps Bloom (Fungus). Each test sets up a small board,
// plays the card through the real engine, and checks the outcome.   node tools/test-cordyceps.mjs

import { LEGENDARY, buildDeck } from '../src/cards/index.js';
import { resolveEffect } from '../src/engine/effects.js';
import { addToHand, costOf, effectiveAttack, hasKeyword, heal, radiationOf, summonMinion } from '../src/engine/core.js';
import { applyAction, createGame, getLegalActions } from '../src/engine/engine.js';
import { getCard } from '../src/engine/registry.js';
import { ART, CLICKER_ART } from '../src/cards/art-manifest.js';
import { existsSync, readdirSync, readFileSync } from 'node:fs';

let s;
let failures = 0;
let passed = 0;

// Player 0 runs Plants (+ `partner`); player 1 runs `foe`.
function fresh(partner = 'Zombies', foe = ['Dragons', 'Robots']) {
  const fa = ['Fungus', partner];
  const players = [{ name: 'A', factions: fa, deck: buildDeck(fa) }, { name: 'B', factions: foe, deck: buildDeck(foe) }];
  s = createGame({ seed: 7, rules: { mulligan: false, secondPlayerPotions: false, openingHandHelp: false }, players });
  for (const p of s.players) { p.hand = []; p.mana.max = 10; p.mana.current = 10; p.mana.primal = 0; p.mana.base = 10; }
}
const pl = (p) => s.players[p];
const put = (p, id, opts = {}) => { const m = summonMinion(s, p, id, opts); m.sick = false; return m; };
const give = (p, id) => addToHand(s, p, id);
// A minion that died earlier this game, lying in player p's Graveyard.
const bury = (p, id) => { const g = { uid: s.nextUid++, cardId: id, owner: p, died: true }; pl(p).graveyard.push(g); return g; };
const beyond = () => s.beyond ?? [];
const away = (m) => beyond().some((x) => x.minion.uid === m.uid);
const onBoard = (m) => s.players.some((x) => x.board.includes(m));
const find = (p, id) => pl(p).board.find((m) => m.cardId === id);
const count = (p, id) => pl(p).board.filter((m) => m.cardId === id).length;

function settle(react = () => null) {
  for (let i = 0; i < 50 && s.pending; i++) {
    if (s.pending.type === 'reaction') applyAction(s, react(getLegalActions(s)) ?? { type: 'pass', player: s.pending.player });
    else if (s.pending.type === 'choice') applyAction(s, { type: 'choose', player: s.pending.player, index: 0 });
    else break;
  }
}
function play(p, inst, target, react) {
  applyAction(s, { type: 'play', player: p, card: inst.uid, ...(target != null ? { target } : {}) });
  settle(react);
}
function heroSpell(p, cardId, target) {
  applyAction(s, { type: 'heroSpell', player: p, card: cardId, ...(target != null ? { target } : {}) });
  settle();
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
const qp = (cardId) => (legal) => legal.find((a) => a.type === 'quickPlay' && s.players[a.player].hand.find((h) => h.uid === a.card)?.cardId === cardId);
const canPlay = (p, inst) => getLegalActions(s).some((a) => a.type === 'play' && a.card === inst.uid);
const canCast = (cardId) => getLegalActions(s).some((a) => a.type === 'heroSpell' && a.card === cardId);


function test(name, fn, ...args) {
  fresh(...args);
  try {
    const problem = fn();
    if (problem) { failures++; console.log(`FAIL ${name}: ${problem}`); } else { passed++; console.log(`ok   ${name}`); }
  } catch (e) { failures++; console.log(`FAIL ${name}: threw ${e.stack.split('\n').slice(0, 3).join(' | ')}`); }
}

const foe = (atk = 3, hp = 4, p = 1) => { const m = put(p, 'vampire_gargoyle'); m.keywords = []; m.attack = atk; m.health = hp; m.maxHealth = hp; return m; };
const infected = (m) => m.infected != null;
const kill = (m) => { m.destroyed = true; play(0, give(0, 'spore_drift'), foe(1, 9).uid); };
const corpses = (p = 0) => pl(p).corpses ?? 0;

test('Cordyceps Runner has Rush; Spore Stalker has Stealth and Infects the chosen enemy', () => {
  const e = foe();
  play(0, give(0, 'cordyceps_runner'));
  const r = find(0, 'cordyceps_runner');
  if (!getLegalActions(s).some((a) => a.type === 'attack' && a.attacker === r.uid && a.defender === e.uid)) return 'runner cannot attack';
  play(0, give(0, 'spore_stalker'), e.uid);
  if (!hasKeyword(find(0, 'spore_stalker'), 'Stealth')) return 'no stealth';
  if (!infected(e)) return 'not infected';
});

test('Clicker hurts any enemy minion that attacks and is Elusive', () => {
  const c = put(0, 'clicker');
  const t = put(0, 'cordyceps_runner');
  endTurn();
  const e = foe(1, 5); e.sick = false;
  attack(1, e.uid, t.uid);
  if (e.health !== 5 - 1 - 2) return `attacker hp ${e.health}`;
  if (!hasKeyword(c, 'Elusive')) return 'not elusive';
});

test('Cordyceps Bloater: each time it takes damage, 1 damage to all enemy minions', () => {
  const b = put(0, 'cordyceps_bloater');
  endTurn();
  const e1 = foe(1, 9), e2 = foe(1, 5); e1.sick = false;
  attack(1, e1.uid, b.uid);
  if (e2.health !== 4) return `bystander ${e2.health}`;
  if (e1.health !== 9 - 4 - 1) return `attacker ${e1.health}`;
});

test('Spore Shambler Exit: 2 damage to enemy minions, then Infects the survivors', () => {
  const sh = put(0, 'spore_shambler');
  const big = foe(1, 5), small = foe(1, 2);
  kill(sh);
  if (big.health !== 3 || !infected(big)) return `big ${big.health} inf ${infected(big)}`;
  if (pl(1).board.includes(small)) return 'small survived';
});

test('The Rat King splits into a Bloater, a Clicker and a Runner', () => {
  const rk = put(0, 'the_rat_king');
  kill(rk);
  const ids = pl(0).board.map((m) => m.cardId).sort().join(',');
  if (ids !== 'clicker,cordyceps_bloater,cordyceps_runner') return ids;
});

test('Necrohydra attacks three times a turn, Burns the minions it hits, and has Reborn', () => {
  const h = put(0, 'necrohydra');
  const e = foe(1, 30);
  for (let i = 0; i < 3; i++) attack(0, h.uid, e.uid);
  if (e.health !== 30 - 18) return `enemy hp ${e.health}`;
  if (getLegalActions(s).some((a) => a.type === 'attack' && a.attacker === h.uid)) return 'a 4th attack offered';
  if (!(e.burn > 0)) return 'not burning';
  if (!hasKeyword(h, 'Reborn')) return 'no reborn';
});

test('Spore Drift Infects and places a Mushroom', () => {
  const e = foe();
  const before = pl(1).deck.reduce((n, c) => n + (c.mushrooms ?? 0), 0);
  play(0, give(0, 'spore_drift'), e.uid);
  const after = pl(1).deck.reduce((n, c) => n + (c.mushrooms ?? 0), 0);
  if (!infected(e) || after !== before + 1) return `inf ${infected(e)} shrooms ${before}->${after}`;
});

test('Cordyceps Sprout Infects a random enemy minion that is not already Infected', () => {
  const a = foe(); resolveEffect(s, { op: 'infect', target: { uid: a.uid } }, { controller: 0 });
  const b = foe();
  play(0, give(0, 'cordyceps_sprout'));
  if (!infected(b)) return 'missed the clean one';
});

test('Fruiting Body Exit Infects all enemy minions; an Infected enemy dying gives you a Rage Runner', () => {
  const fb = put(0, 'fruiting_body');
  const e1 = foe(1, 1), e2 = foe(1, 9);
  kill(fb);
  if (!infected(e1) || !infected(e2)) return 'not all infected';
  resolveEffect(s, { op: 'damage', target: { uid: e1.uid }, amount: 1 }, { controller: 0 });
  play(0, give(0, 'spore_drift'), e2.uid);
  if (!find(0, 'rage_runner')) return 'no rage runner';
});

test('Hyphae Weaver: an enemy you Infected dying gives a Corpse (not an uninfected one)', () => {
  put(0, 'hyphae_weaver');
  const e1 = foe(1, 1), e2 = foe(1, 1);
  play(0, give(0, 'spore_drift'), e1.uid);
  const c0 = corpses();
  resolveEffect(s, { op: 'damage', target: { uid: e1.uid }, amount: 1 }, { controller: 0 });
  play(0, give(0, 'spore_drift'), foe(1, 9).uid);
  if (corpses() !== c0 + 1) return `corpses ${c0} -> ${corpses()}`;
  resolveEffect(s, { op: 'damage', target: { uid: e2.uid }, amount: 1 }, { controller: 0 });
  play(0, give(0, 'spore_drift'), foe(1, 9).uid);
  if (corpses() !== c0 + 1) return 'counted an uninfected death';
});

test('Mind-Thread Stalk gives your Zombies +1/+1', () => {
  const r = put(0, 'clicker');
  put(0, 'mind_thread_stalk');
  play(0, give(0, 'spore_drift'), foe(1, 9).uid);
  if (effectiveAttack(r) !== 4 || r.maxHealth !== 5) return `clicker ${effectiveAttack(r)}/${r.maxHealth}`;
});

test('Spore Bloom: 2 damage to Infected enemies, then Infects the rest', () => {
  const a = foe(1, 5), b = foe(1, 5);
  resolveEffect(s, { op: 'infect', target: { uid: a.uid } }, { controller: 0 });
  play(0, give(0, 'spore_bloom'));
  if (a.health !== 3) return `infected one ${a.health}`;
  if (b.health !== 5 || !infected(b)) return `clean one ${b.health} ${infected(b)}`;
});

test('Host Puppeteer spends a Corpse at end of turn for a Cordyceps Runner (nothing without one)', () => {
  put(0, 'host_puppeteer');
  pl(0).corpses = 1;
  endTurn();
  if (!find(0, 'cordyceps_runner') || corpses() !== 0) return `runner ${!!find(0, 'cordyceps_runner')} corpses ${corpses()}`;
  endTurn(); endTurn();
  if (count(0, 'cordyceps_runner') !== 1) return 'made one without a corpse';
});

test('Rotting Overgrowth: Infected enemy minions have -1 Attack', () => {
  const a = foe(3, 5), b = foe(3, 5);
  resolveEffect(s, { op: 'infect', target: { uid: a.uid } }, { controller: 0 });
  put(0, 'rotting_overgrowth');
  play(0, give(0, 'spore_drift'), foe(1, 9).uid);
  if (effectiveAttack(a) !== 2 || effectiveAttack(b) !== 3) return `${effectiveAttack(a)} / ${effectiveAttack(b)}`;
});

test('Mycelia: Infects all enemies; while she lives Infections raise a Clicker in the dead minion\'s faction', () => {
  const e = foe(1, 1);
  play(0, give(0, 'mycelia_the_hive_mind'));
  if (!infected(e)) return 'not infected';
  resolveEffect(s, { op: 'damage', target: { uid: e.uid }, amount: 1 }, { controller: 0 });
  play(0, give(0, 'spore_drift'), foe(1, 9).uid);
  const c = find(0, 'clicker');
  if (!c) return 'no clicker';
  if (find(0, 'rage_runner')) return 'also a rage runner';
  if (c.lookFaction !== 'Vampires') return `look ${c.lookFaction}`;
  if (!CLICKER_ART.Vampires) return 'no vampire clicker art';
});

test('Without Mycelia, Infections still raise Rage Runners', () => {
  const e = foe(1, 1);
  play(0, give(0, 'spore_drift'), e.uid);
  resolveEffect(s, { op: 'damage', target: { uid: e.uid }, amount: 1 }, { controller: 0 });
  play(0, give(0, 'spore_drift'), foe(1, 9).uid);
  if (!find(0, 'rage_runner') || find(0, 'clicker')) return 'wrong token';
});

test('Ophio spends every Corpse and summons that many cordyceps Zombies', () => {
  pl(0).corpses = 3;
  play(0, give(0, 'ophio_the_cordyceps_crown'));
  const pool = ['cordyceps_runner', 'spore_stalker', 'clicker', 'spore_shambler', 'cordyceps_bloater'];
  const n = pl(0).board.filter((m) => pool.includes(m.cardId)).length;
  if (n !== 3 || corpses() !== 0) return `summoned ${n}, corpses ${corpses()}`;
});

test('Every new card has art, is an unlockable extra in its mini-set; legendaries flagged; 20 Clicker looks', () => {
  const z = ['necrohydra', 'cordyceps_runner', 'spore_stalker', 'clicker', 'cordyceps_bloater', 'spore_shambler', 'the_rat_king'];
  const f = ['spore_drift', 'cordyceps_sprout', 'fruiting_body', 'hyphae_weaver', 'mind_thread_stalk', 'spore_bloom', 'host_puppeteer', 'rotting_overgrowth', 'mycelia_the_hive_mind', 'ophio_the_cordyceps_crown'];
  const missing = [...z, ...f].filter((id) => !ART[id]);
  if (missing.length) return `no art: ${missing}`;
  const bad = [...z.filter((id) => getCard(id).set !== 'Cordyceps Outbreak'), ...f.filter((id) => getCard(id).set !== 'Cordyceps Bloom')];
  bad.push(...[...z, ...f].filter((id) => !getCard(id).extra));
  if (bad.length) return `not in set: ${bad}`;
  for (const id of ['necrohydra', 'the_rat_king', 'mycelia_the_hive_mind', 'ophio_the_cordyceps_crown']) if (!LEGENDARY.has(id)) return `${id} not legendary`;
  if (Object.keys(CLICKER_ART).length !== 20) return `${Object.keys(CLICKER_ART).length} clicker looks`;
  for (const p of [...Object.values(CLICKER_ART), ...[...z, ...f].map((id) => ART[id])]) if (!existsSync(new URL(`../${p}`, import.meta.url))) return `missing file ${p}`;
});

test('No two cards in the game share an id', () => {
  const ids = [];
  for (const fl of readdirSync(new URL('../src/cards/', import.meta.url))) {
    if (fl.endsWith('.js')) ids.push(...[...readFileSync(new URL(`../src/cards/${fl}`, import.meta.url), 'utf8').matchAll(/\bid: '([a-z0-9_]+)'/g)].map((m) => m[1]));
  }
  const dupes = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
  if (dupes.length) return `shared ids: ${dupes}`;
});

console.log(`\n${passed} passed, ${failures} failed`);
if (failures) process.exit(1);
