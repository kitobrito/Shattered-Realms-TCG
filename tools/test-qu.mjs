// Rules tests for the Qu (All Tomorrows) cards: Remake and the Remade human tokens.
//   node tools/test-qu.mjs

import { buildDeck } from '../src/cards/index.js';
import { addToHand, hasKeyword, summonMinion } from '../src/engine/core.js';
import { applyAction, createGame, getLegalActions } from '../src/engine/engine.js';
import { getCard } from '../src/engine/registry.js';
import { ART } from '../src/cards/art-manifest.js';
import { existsSync } from 'node:fs';

let s;
let failures = 0;
let passed = 0;

// Player 0 runs Aliens (+ Vampires); player 1 runs Dragons + Robots.
function fresh() {
  const fa = ['Aliens', 'Vampires'], fb = ['Dragons', 'Robots'];
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

const REMADE = ['remade_gravital', 'remade_swimmer', 'remade_loper', 'remade_worm_person', 'remade_snake_person', 'remade_colonial'];
const isRemade = (m) => REMADE.includes(m.cardId);
function attack(p, attacker, defender, react) {
  applyAction(s, { type: 'attack', player: p, attacker, defender });
  settle(react);
}
function test(name, fn) {
  fresh();
  try { const r = fn(); if (r) { failures++; console.log(`FAIL ${name}: ${r}`); } else { passed++; console.log(`ok   ${name}`); } }
  catch (e) { failures++; console.log(`FAIL ${name}: ${e.stack.split('\n').slice(0, 3).join(' | ')}`); }
}

test('all 12 Qu cards exist, with art; the legendary is legendary', () => {
  for (const id of ['qu_remaker', 'qu_gene_priest', 'the_qu_shapers_of_worlds', 'the_remaking', 'the_great_remaking', 'sentence_of_the_qu', ...REMADE]) {
    const c = getCard(id);
    if (!c) return `missing ${id}`;
    if (!ART[id] || !existsSync(new URL(`../${ART[id]}`, import.meta.url))) return `no art for ${id}`;
  }
  if (!getCard('the_qu_shapers_of_worlds').legendary) return 'Shapers not legendary';
});
test('Qu Remaker: Remakes a cheap enemy minion; it keeps its side', () => {
  const e = put(1, 'vampire_gargoyle'); const r = give(0, 'qu_remaker');
  play(0, r, e.uid);
  if (!isRemade(e) || e.controller !== 1) return `${e.cardId} ${e.controller}`;
});
test('Qu Remaker: cannot target a minion costing 4 or more (but can still be played)', () => {
  put(1, 'devolved_scientist'); const r = give(0, 'qu_remaker');
  const opts = getLegalActions(s).filter((a) => a.type === 'play' && a.card === r.uid);
  if (opts.length !== 1 || opts[0].target != null) return JSON.stringify(opts);
});
test('The Remaking: you choose the form', () => {
  const e = put(1, 'devolved_scientist'); const sp = give(0, 'the_remaking');
  applyAction(s, { type: 'play', player: 0, card: sp.uid, target: e.uid });
  if (s.pending?.type !== 'choice') return 'no choice';
  const i = s.pending.options.findIndex((o) => o.cardId === 'remade_worm_person');
  applyAction(s, { type: 'choose', player: 0, index: i }); settle();
  if (e.cardId !== 'remade_worm_person' || e.attack !== 1 || e.health !== 1 || !hasKeyword(e, 'Silenced')) return `${e.cardId} ${e.attack}/${e.health}`;
});
test('The Great Remaking: every enemy minion, none of mine', () => {
  const a = put(1, 'devolved_scientist'), b = put(1, 'vampire_gargoyle'), mine = put(0, 'devolved_scientist');
  play(0, give(0, 'the_great_remaking'));
  if (!isRemade(a) || !isRemade(b) || isRemade(mine)) return `${a.cardId} ${b.cardId} ${mine.cardId}`;
});
test('Sentence of the Qu: the attack is stopped and the attacker Remade', () => {
  play(0, give(0, 'sentence_of_the_qu'));
  s.activePlayer = 1;
  const att = blank(1, 5, 5); const heroHp = pl(0).hero.health;
  attack(1, att.uid, pl(0).hero.uid);
  if (!isRemade(att)) return `attacker ${att.cardId}`;
  if (pl(0).hero.health !== heroHp) return `hero took ${heroHp - pl(0).hero.health}`;
});
test('Qu Gene-Priest grows when an enemy minion is Remade', () => {
  const pr = put(0, 'qu_gene_priest'); const e = put(1, 'vampire_gargoyle');
  play(0, give(0, 'qu_remaker'), e.uid);
  if (pr.attack !== 3 || pr.maxHealth !== 4) return `${pr.attack}/${pr.maxHealth}`;
  if (!pr.keywords.length) return 'no keyword';
});
test('The Qu, Shapers of Worlds: Arrival Remake + end of turn Remakes the priciest un-Remade enemy', () => {
  const cheap = put(1, 'vampire_gargoyle'), big = put(1, 'devolved_scientist'), mid = put(1, 'qu_remaker');
  play(0, give(0, 'the_qu_shapers_of_worlds'), cheap.uid);
  if (!isRemade(cheap)) return 'arrival target not Remade';
  applyAction(s, { type: 'endTurn', player: 0 }); settle();
  if (!isRemade(big)) return `costliest not Remade: ${big.cardId}`;
  if (isRemade(mid)) return 'Remade more than one';
});
test('Remade forms behave: Gravital cannot attack; Snake Person arrives Frozen and thaws; Colonial burns', () => {
  const g = put(1, 'vampire_gargoyle'), sn = put(1, 'vampire_gargoyle'), co = put(1, 'vampire_gargoyle');
  for (const [m, f] of [[g, 'remade_gravital'], [sn, 'remade_snake_person'], [co, 'remade_colonial']]) {
    const sp = give(0, 'the_remaking'); pl(0).mana.current = 10;
    applyAction(s, { type: 'play', player: 0, card: sp.uid, target: m.uid });
    applyAction(s, { type: 'choose', player: 0, index: s.pending.options.findIndex((o) => o.cardId === f) }); settle();
  }
  if (!hasKeyword(sn, 'Frozen')) return 'snake not frozen';
  applyAction(s, { type: 'endTurn', player: 0 }); settle();
  const atk = getLegalActions(s).filter((a) => a.type === 'attack').map((a) => a.attacker);
  if (atk.includes(g.uid)) return 'Gravital can attack';
  if (atk.includes(sn.uid)) return 'Snake Person can attack while Frozen';
  applyAction(s, { type: 'endTurn', player: 1 }); settle();
  applyAction(s, { type: 'endTurn', player: 0 }); settle();
  if (hasKeyword(sn, 'Frozen')) return 'snake never thawed';
  if (co.health >= 3 && pl(1).board.includes(co)) return `colonial at ${co.health}`;
});
test('Remake picks only Remade forms, and a Remade minion becomes a different one', () => {
  const e = put(1, 'vampire_gargoyle');
  for (let i = 0; i < 12; i++) {
    const before = e.cardId;
    play(0, give(0, 'qu_remaker'), e.uid); pl(0).mana.current = 10;
    if (!isRemade(e)) return e.cardId;
    if (i && e.cardId === before) return 'same form twice';
    pl(0).board.length = 0;
  }
});

console.log(`\n${passed} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
