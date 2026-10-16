// Rules tests for the Plants' Carnivorous Garden expansion (Devour). Each test sets up a small board,
// plays the card through the real engine, and checks the outcome.   node tools/test-plants-carnivorous.mjs

import { buildDeck } from '../src/cards/index.js';
import { addToHand, costOf, effectiveAttack, hasKeyword, heal, radiationOf, summonMinion } from '../src/engine/core.js';
import { applyAction, createGame, getLegalActions } from '../src/engine/engine.js';
import { getCard } from '../src/engine/registry.js';
import { ART } from '../src/cards/art-manifest.js';
import { readdirSync, readFileSync } from 'node:fs';

let s;
let failures = 0;
let passed = 0;

// Player 0 runs Plants (+ `partner`); player 1 runs `foe`.
function fresh(partner = 'Vampires', foe = ['Dragons', 'Robots']) {
  const fa = ['Plants', partner];
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
const refill = () => { for (const p of s.players) p.mana.current = 10; };
const sprouts = (p = 0) => count(p, 'flytrap_sprout');

test('Devour: killing an enemy minion gives +1/+1 (no heal)', () => {
  const m = put(0, 'snapjaw_sprout');
  m.attack = 3; // let it win the fight
  const e = foe(1, 2);
  attack(0, m.uid, e.uid);
  if (pl(1).board.includes(e)) return 'enemy survived';
  // 1/2 set to 3 Attack, takes 1 in the fight, then +1/+1.
  if (m.attack !== 4 || m.health !== 2 || m.maxHealth !== 3) return `snapjaw ${m.attack}/${m.health} (max ${m.maxHealth})`;
});

test('Venus Flytrap (the original Plant) has Devour and feeds Carrion Gardener', () => {
  const g = put(0, 'carrion_gardener');
  const m = put(0, 'venus_flytrap');
  if (!hasKeyword(m, 'Devour')) return 'no Devour keyword';
  const e = foe(1, 2);
  attack(0, m.uid, e.uid);
  if (pl(1).board.includes(e)) return 'enemy survived';
  if (m.attack !== 3 || m.health !== 2 || m.maxHealth !== 3) return `flytrap ${m.attack}/${m.health} (max ${m.maxHealth})`;
  if (sprouts() !== 1) return `Carrion Gardener made ${sprouts()} sprouts`;
  if (!pl(0).board.includes(g)) return 'gardener missing';
});

test('Devour does nothing if the devourer dies in the same fight', () => {
  const m = put(0, 'snapjaw_sprout');
  const e = foe(5, 1);
  attack(0, m.uid, e.uid);
  if (pl(0).board.includes(m)) return 'snapjaw should be dead';
});

test('Devour does not fire when the enemy only takes damage', () => {
  const m = put(0, 'pitcher_plant');
  const e = foe(1, 9);
  attack(0, m.uid, e.uid);
  if (m.attack !== 2 || m.maxHealth !== 5) return `pitcher ${m.attack}/${m.maxHealth}`;
});

test('Sticky Sundew freezes an enemy minion and deals 1 damage', () => {
  const e = foe(3, 4);
  play(0, give(0, 'sticky_sundew'), e.uid);
  if (!hasKeyword(e, 'Frozen') || e.health !== 3) return `frozen ${hasKeyword(e, 'Frozen')} hp ${e.health}`;
});

test('Bladderwort Snapper can attack a minion the turn it arrives and Devours', () => {
  const e = foe(0, 2);
  play(0, give(0, 'bladderwort_snapper'));
  const b = find(0, 'bladderwort_snapper');
  attack(0, b.uid, e.uid);
  if (pl(1).board.includes(e)) return 'enemy survived';
  if (b.attack !== 3 || b.health !== 2) return `snapper ${b.attack}/${b.health}`;
});

test('Sundew Lurer freezes an enemy minion that attacks it', () => {
  const l = put(0, 'sundew_lurer');
  endTurn();
  const e = foe(2, 5);
  e.sick = false;
  attack(1, e.uid, l.uid);
  if (!hasKeyword(e, 'Frozen')) return 'attacker not frozen';
});

test('Hunger of the Garden gives +1/+1 and Devour', () => {
  const w = put(0, 'treant');
  play(0, give(0, 'hunger_of_the_garden'), w.uid);
  if (!hasKeyword(w, 'Devour') || w.attack !== 6 || w.health !== 6) return `sproutling ${w.attack}/${w.health} devour ${hasKeyword(w, 'Devour')}`;
});

test('Pitfall Pitcher destroys an attacker with 3 or less Attack', () => {
  play(0, give(0, 'pitfall_pitcher'));
  endTurn();
  const e = foe(3, 9); e.sick = false;
  const hp = pl(0).hero.health;
  attack(1, e.uid, pl(0).hero.uid);
  if (pl(1).board.includes(e)) return 'attacker survived';
  if (pl(0).hero.health !== hp) return 'the attack still hit';
});

test('Pitfall Pitcher deals 3 damage to a bigger attacker', () => {
  play(0, give(0, 'pitfall_pitcher'));
  endTurn();
  const e = foe(5, 9); e.sick = false;
  attack(1, e.uid, pl(0).hero.uid);
  if (e.health !== 6) return `attacker health ${e.health}`;
});

test('Giant Flytrap: its Arrival damage killing a minion counts as a Devour', () => {
  const e = foe(4, 2);
  play(0, give(0, 'giant_flytrap'), e.uid);
  const v = find(0, 'giant_flytrap');
  if (pl(1).board.includes(e)) return 'enemy survived';
  if (v.attack !== 3 || v.health !== 3) return `flytrap ${v.attack}/${v.health}`;
});

test('Carrion Gardener summons a Flytrap Sprout when another Plant Devours', () => {
  put(0, 'carrion_gardener');
  const m = put(0, 'snapjaw_sprout'); m.attack = 3;
  const e = foe(1, 2);
  attack(0, m.uid, e.uid);
  const sp = find(0, 'flytrap_sprout');
  if (sprouts() !== 1 || sp.attack !== 1 || sp.health !== 2 || !hasKeyword(sp, 'Devour')) return `sprouts ${sprouts()}`;
});

test('Garden Frenzy: +1 Attack and Devour this turn only', () => {
  const w = put(0, 'treant');
  play(0, give(0, 'garden_frenzy'));
  if (!hasKeyword(w, 'Devour') || atkOf(w) !== 6) return `this turn ${atkOf(w)} devour ${hasKeyword(w, 'Devour')}`;
  endTurn();
  if (hasKeyword(w, 'Devour') || atkOf(w) !== 5) return `after ${atkOf(w)} devour ${hasKeyword(w, 'Devour')}`;
});

test('Digestive Enzymes destroys a damaged enemy minion and heals 4', () => {
  const e = foe(3, 6); e.health = 4;
  const undamaged = foe(3, 6);
  pl(0).hero.health = 20;
  const inst = give(0, 'digestive_enzymes');
  const targets = getLegalActions(s).filter((a) => a.type === 'play' && a.card === inst.uid).map((a) => a.target);
  if (targets.includes(undamaged.uid)) return 'could target an undamaged minion';
  play(0, inst, e.uid);
  if (pl(1).board.includes(e)) return 'not destroyed';
  if (pl(0).hero.health !== 24) return `hero ${pl(0).hero.health}`;
});

test('Cobra Lily: Venomous kills a big minion and it Devours', () => {
  const c = put(0, 'cobra_lily');
  const e = foe(2, 20);
  attack(0, c.uid, e.uid);
  if (pl(1).board.includes(e)) return 'enemy survived';
  if (c.attack !== 4 || c.health !== 2) return `lily ${c.attack}/${c.health}`;
});

test('Flytrap Matriarch summons a Flytrap Sprout at the end of your turn', () => {
  put(0, 'flytrap_matriarch');
  endTurn();
  if (sprouts() !== 1) return `sprouts ${sprouts()}`;
});

test('Monstrous Nepenthes restores 2 Health to your Hero when it Devours', () => {
  const n = put(0, 'monstrous_nepenthes');
  pl(0).hero.health = 20;
  const e = foe(1, 3);
  attack(0, n.uid, e.uid);
  if (pl(0).hero.health !== 22) return `hero ${pl(0).hero.health}`;
  if (n.attack !== 5 || n.health !== 7) return `nepenthes ${n.attack}/${n.health}`;
});

test('Titan Arum destroys the strongest enemy minion and gains its stats', () => {
  const small = foe(2, 2); const big = foe(5, 4);
  play(0, give(0, 'titan_arum'));
  const t = find(0, 'titan_arum');
  if (pl(1).board.includes(big)) return 'big survived';
  if (!pl(1).board.includes(small)) return 'ate the wrong one';
  if (t.attack !== 11 || t.health !== 10) return `titan ${t.attack}/${t.health}`;
});

test('Titan Arum on an empty enemy board is just a 6/6', () => {
  play(0, give(0, 'titan_arum'));
  const t = find(0, 'titan_arum');
  if (t.attack !== 6 || t.health !== 6) return `titan ${t.attack}/${t.health}`;
});

test('Every new card and the token have art and the cards are unlockable extras', () => {
  const ids = ['snapjaw_sprout', 'sticky_sundew', 'bladderwort_snapper', 'sundew_lurer', 'hunger_of_the_garden', 'pitfall_pitcher', 'giant_flytrap', 'carrion_gardener', 'garden_frenzy', 'digestive_enzymes', 'pitcher_plant', 'cobra_lily', 'flytrap_matriarch', 'monstrous_nepenthes', 'titan_arum'];
  const missing = [...ids, 'flytrap_sprout'].filter((id) => !ART[id]);
  if (missing.length) return `no art: ${missing}`;
  const notExtra = ids.filter((id) => !getCard(id).extra);
  if (notExtra.length) return `not extra: ${notExtra}`;
});

test('No two cards in the game share an id (a later one would silently replace the earlier)', () => {
  const ids = [];
  for (const f of readdirSync(new URL('../src/cards/', import.meta.url))) {
    if (f.endsWith('.js')) ids.push(...[...readFileSync(new URL(`../src/cards/${f}`, import.meta.url), 'utf8').matchAll(/\bid: '([a-z0-9_]+)'/g)].map((m) => m[1]));
  }
  const dupes = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
  if (dupes.length) return `shared ids: ${dupes}`;
});

console.log(`\n${passed} passed, ${failures} failed`);
if (failures) process.exit(1);
