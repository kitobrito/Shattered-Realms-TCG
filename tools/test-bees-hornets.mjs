// Rules tests for the Bees' Hornet expansion (The Hidden Nest, Queen Underground). Each test sets up a small board,
// plays the card through the real engine, and checks the outcome.   node tools/test-bees-hornets.mjs

import { buildDeck } from '../src/cards/index.js';
import { addToHand, costOf, effectiveAttack, hasKeyword, heal, radiationOf, summonMinion } from '../src/engine/core.js';
import { applyAction, createGame, getLegalActions } from '../src/engine/engine.js';
import { getCard } from '../src/engine/registry.js';
import { ART } from '../src/cards/art-manifest.js';

let s;
let failures = 0;
let passed = 0;

// Player 0 runs Bees (+ `partner`); player 1 runs `foe`.
function fresh(partner = 'Vampires', foe = ['Dragons', 'Robots']) {
  const fa = ['Bees', partner];
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

const atkOf = (m) => effectiveAttack(m);
const foe = (atk = 3, hp = 4, p = 1) => { const m = put(p, 'vampire_gargoyle'); m.keywords = []; m.attack = atk; m.health = hp; m.maxHealth = hp; return m; };
const hive = () => find(0, 'the_hive');
const nest = () => find(0, 'hidden_nest');
const queen = () => find(0, 'the_queen');
const under = () => !!pl(0).queenUnderground;
const refill = () => { for (const p of s.players) p.mana.current = 10; };
const burrow = () => { play(0, give(0, 'burrow_the_queen')); refill(); };
// Player 1 casts Scorched Earth (2 damage to all minions) on their turn, then it is player 0's turn again.
function scorch() {
  endTurn();
  play(1, give(1, 'scorched_earth'));
  endTurn();
}
// Bring the Hive down: it dies and the Queen (if she's inside) emerges.
function breakHive() { const h = hive(); h.health = 2; scorch(); }

test('Burrow the Queen from inside the Hive: a 0/5 Stealth Nest appears and the Queen is Underground', () => {
  burrow();
  const n = nest();
  if (!n || n.attack !== 0 || n.health !== 5 || !hasKeyword(n, 'Stealth')) return `nest ${n && `${n.attack}/${n.health}`}`;
  if (!under()) return 'not underground';
  if (!hive()) return 'the Hive should still stand';
});

test('After Burrowing, the Hive falls empty; the Queen comes out of the Nest at 7/3 when it dies', () => {
  burrow();
  breakHive();
  if (hive()) return 'hive still up';
  if (queen()) return 'the Queen came out of the empty Hive';
  if (!under()) return 'she should still be Underground';
  nest().health = 2;
  scorch();
  const q = queen();
  if (!q || q.attack !== 7 || q.health !== 3 || !hasKeyword(q, 'Venomous')) return `queen ${q && `${q.attack}/${q.health}`}`;
  if (under()) return 'still marked Underground';
});

test('Burrowing a Queen already on the board keeps her stats and costs no Health; she comes back with +2/+2', () => {
  breakHive();
  const q = queen();
  q.attack = 6; q.health = 4; q.maxHealth = 4;
  const hp = pl(0).hero.health;
  burrow();
  if (queen()) return 'Queen still on the board';
  if (pl(0).hero.health !== hp) return 'hero took damage';
  if ((pl(0).uniquesDead ?? []).includes('the_queen')) return 'counted as dead';
  nest().health = 2;
  scorch();
  const back = queen();
  // She comes out after the Scorched Earth damage, so she keeps the full +2/+2.
  if (!back || back.attack !== 8 || back.health !== 6) return `queen ${back && `${back.attack}/${back.health}`}`;
});

test('The Hidden Nest cannot be attacked or targeted by the enemy', () => {
  burrow();
  endTurn();
  const e = put(1, 'tri_maw_hydra');
  const targets = getLegalActions(s).filter((a) => a.type === 'attack' && a.attacker === e.uid).map((a) => a.defender);
  if (targets.includes(nest().uid)) return 'the Nest can be attacked';
});

test('The Nest summons a 1/1 Rush Hornet Drone at the end of your turn', () => {
  burrow();
  const before = count(0, 'hornet_drone');
  endTurn();
  const d = find(0, 'hornet_drone');
  if (count(0, 'hornet_drone') !== before + 1 || d.attack !== 1 || d.health !== 1 || !hasKeyword(d, 'Rush')) return 'no drone';
});

test('Burrow the Queen while she is already Underground gives the Nest +0/+5 instead', () => {
  burrow();
  burrow();
  if (count(0, 'hidden_nest') !== 1) return 'a second nest';
  if (nest().health !== 10) return `nest health ${nest().health}`;
});

test('Burrow the Queen after she has died digs an empty Nest (not Underground)', () => {
  breakHive();
  queen().health = 1;
  scorch();
  if (queen()) return 'queen alive';
  burrow();
  if (!nest()) return 'no nest';
  if (under()) return 'should not be Underground';
});

test('The Hornet Empress: the Queen bursts out with +4/+4 and Rush; the Nest stays', () => {
  burrow();
  play(0, give(0, 'the_hornet_empress'));
  const q = queen();
  if (!q || q.attack !== 9 || q.health !== 5 || !hasKeyword(q, 'Rush')) return `queen ${q && `${q.attack}/${q.health}`}`;
  if (!nest()) return 'nest gone';
  if (under()) return 'still Underground';
  nest().health = 2; scorch();
  if (count(0, 'the_queen') !== 1) return 'a second Queen';
});

test('The Hornet Empress does nothing extra if the Queen is not Underground', () => {
  play(0, give(0, 'the_hornet_empress'));
  if (queen()) return 'Queen appeared';
  if (!find(0, 'the_hornet_empress')) return 'no empress';
});

test('Ashwing Hornet and Soil Sentry are stronger while the Queen is Underground', () => {
  const a = put(0, 'ashwing_hornet'); const ss = put(0, 'soil_sentry');
  if (atkOf(a) !== 2 || atkOf(ss) !== 2) return 'wrong base attack';
  burrow();
  if (atkOf(a) !== 3 || atkOf(ss) !== 3) return `underground ${atkOf(a)} / ${atkOf(ss)}`;
});

test('Burrow Scout draws a card only while the Queen is Underground', () => {
  play(0, give(0, 'burrow_scout'));
  const n0 = pl(0).hand.length;
  if (n0 !== 0) return 'drew without Underground';
  burrow();
  play(0, give(0, 'burrow_scout'));
  if (pl(0).hand.length !== 1) return `hand ${pl(0).hand.length}`;
});

test('Shifting Tunnels returns an attacker to hand only while the Queen is Underground', () => {
  play(0, give(0, 'shifting_tunnels'));
  endTurn();
  const e = put(1, 'tri_maw_hydra');
  attack(1, e.uid, pl(0).hero.uid);
  if (!pl(0).traps.length) return 'trap fired without Underground';
  endTurn();
  burrow();
  endTurn();
  const e2 = put(1, 'tri_maw_hydra');
  const hp = pl(0).hero.health;
  attack(1, e2.uid, pl(0).hero.uid);
  if (pl(1).board.includes(e2)) return 'attacker still on board';
  if (!pl(1).hand.some((h) => h.cardId === 'tri_maw_hydra')) return 'not in hand';
  if (pl(0).hero.health !== hp) return 'the attack still hit';
});

test('Brood Chamber: two 1/1 Rush Drones; with Stealth while the Queen is Underground', () => {
  play(0, give(0, 'brood_chamber'));
  const d = pl(0).board.filter((m) => m.cardId === 'hornet_drone');
  if (d.length !== 2 || d.some((m) => hasKeyword(m, 'Stealth'))) return 'first cast wrong';
  burrow();
  play(0, give(0, 'brood_chamber'));
  const d2 = pl(0).board.filter((m) => m.cardId === 'hornet_drone' && !d.includes(m));
  if (d2.length !== 2 || !d2.every((m) => hasKeyword(m, 'Stealth'))) return 'no stealth';
});

test('Royal Tunneler gives the Nest +0/+3 and another friendly minion (not a Hive) Stealth', () => {
  burrow();
  const w = put(0, 'waxworker');
  play(0, give(0, 'royal_tunneler'));
  if (nest().health !== 8) return `nest ${nest().health}`;
  if (!hasKeyword(w, 'Stealth')) return 'waxworker not stealthed';
  if (hasKeyword(find(0, 'royal_tunneler'), 'Stealth')) return 'gave itself Stealth';
});

test('Hornet Ambusher is a 3/1 with Stealth and Venomous', () => {
  play(0, give(0, 'hornet_ambusher'));
  const m = find(0, 'hornet_ambusher');
  if (m.attack !== 3 || m.health !== 1 || !hasKeyword(m, 'Stealth') || !hasKeyword(m, 'Venomous')) return 'wrong';
});

test('Hornet Assassin gains +1/+1 when it destroys a minion', () => {
  const a = put(0, 'hornet_assassin');
  if (!hasKeyword(a, 'Stealth') || a.attack !== 4 || a.health !== 2) return 'wrong base';
  const e = foe(1, 4);
  attack(0, a.uid, e.uid);
  if (pl(1).board.includes(e)) return 'target survived';
  if (a.attack !== 5 || a.health !== 2) return `assassin ${a.attack}/${a.health} (4/2, -1 from the hit, +1/+1)`;
});

test('Black Brood Mother makes a Drone at end of turn only while the Queen is Underground', () => {
  put(0, 'black_brood_mother');
  endTurn(); endTurn();
  if (count(0, 'hornet_drone')) return 'drone without Underground';
  burrow();
  const before = count(0, 'hornet_drone');
  endTurn();
  if (count(0, 'hornet_drone') !== before + 2) return `drones ${count(0, 'hornet_drone') - before} (nest + mother = 2)`;
});

test('Collapse the Tunnels: 2 damage to enemy minions; Nest +0/+3 while Underground', () => {
  burrow();
  const e = foe(2, 5); const mine = put(0, 'waxworker');
  play(0, give(0, 'collapse_the_tunnels'));
  if (e.health !== 3) return `enemy ${e.health}`;
  if (mine.health !== 3) return 'hit a friendly';
  if (nest().health !== 8) return `nest ${nest().health}`;
});

test('Nest Warden: Taunt; its Exit gives the Nest +0/+5', () => {
  burrow();
  const w = put(0, 'nest_warden');
  if (!hasKeyword(w, 'Taunt')) return 'no taunt';
  w.health = 1;
  scorch();
  if (pl(0).board.includes(w)) return 'warden survived';
  if (nest().health !== 8) return `nest ${nest().health} (5 - 2 scorch + 5)`;
});

test('Tunnel Digger gives the Nest +0/+2', () => {
  burrow();
  play(0, give(0, 'tunnel_digger'));
  if (nest().health !== 7) return `nest ${nest().health}`;
});

test('Vanishing Swarm: your Insects have Stealth through the enemy turn, then lose it', () => {
  const w = put(0, 'waxworker');
  play(0, give(0, 'vanishing_swarm'));
  if (!hasKeyword(w, 'Stealth')) return 'no stealth';
  endTurn();
  if (!hasKeyword(w, 'Stealth')) return 'lost it during the enemy turn';
  endTurn();
  if (hasKeyword(w, 'Stealth')) return 'still stealthed on my next turn';
});

test('Royal Chamber while the Queen is Underground adds to her Health for when she comes out', () => {
  breakHive();
  burrow();
  play(0, give(0, 'royal_chamber'));
  nest().health = 2; scorch();
  const q = queen();
  if (!q || q.health !== 4) return `queen ${q && `${q.attack}/${q.health}`} (1 + 1 + 2)`;
});

test('A Queen who came back out still costs 10 Health when she dies', () => {
  burrow();
  play(0, give(0, 'the_hornet_empress'));
  const hp = pl(0).hero.health;
  queen().health = 1;
  scorch();
  if (queen()) return 'queen alive';
  if (pl(0).hero.health !== hp - 10) return `hero ${hp} -> ${pl(0).hero.health}`;
});

test('Every new card and token has art and is an unlockable extra', () => {
  const ids = ['tunnel_digger', 'burrow_scout', 'ashwing_hornet', 'vanishing_swarm', 'shifting_tunnels', 'burrow_the_queen', 'soil_sentry', 'hornet_ambusher', 'brood_chamber', 'royal_tunneler', 'hornet_assassin', 'black_brood_mother', 'collapse_the_tunnels', 'nest_warden', 'the_hornet_empress'];
  const missing = [...ids, 'hidden_nest', 'hornet_drone'].filter((id) => !ART[id]);
  if (missing.length) return `no art: ${missing}`;
  const notExtra = ids.filter((id) => !getCard(id).extra);
  if (notExtra.length) return `not extra: ${notExtra}`;
});

console.log(`\n${passed} passed, ${failures} failed`);
if (failures) process.exit(1);
