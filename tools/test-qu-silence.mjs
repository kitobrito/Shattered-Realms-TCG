// Rules tests for the Qu Silence + Remake cards.
//   node tools/test-qu-silence.mjs

import { buildDeck } from '../src/cards/index.js';
import { addToHand, effectiveAttack, hasKeyword, summonMinion } from '../src/engine/core.js';
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
const sil = (m) => hasKeyword(m, 'Silenced');
const tough = (p) => { const m = put(p, 'vampire_gargoyle'); m.keywords = ['Taunt', 'Lifesteal']; m.attack = 3; m.health = 6; m.maxHealth = 6; return m; };
// Remade forms come from the engine's own list (it grows as new forms are added).
const isRemadeNow = (m) => getCard(m.cardId).tribes?.includes('Remade');

test('Qu Hushwing: Arrival Silences an enemy minion (its keywords are gone)', () => {
  const e = tough(1);
  play(0, give(0, 'qu_hushwing'), e.uid);
  if (!sil(e)) return 'not silenced';
  if (hasKeyword(e, 'Taunt') || hasKeyword(e, 'Lifesteal')) return 'kept keywords';
});

test('Sterile Hum: Silences; on an already-Silenced minion it Remakes instead', () => {
  const e = tough(1);
  play(0, give(0, 'sterile_hum'), e.uid);
  if (!sil(e) || isRemadeNow(e)) return `first cast: silenced ${sil(e)} remade ${isRemadeNow(e)}`;
  play(0, give(0, 'sterile_hum'), e.uid);
  if (!isRemadeNow(e)) return 'second cast did not Remake';
});

test('Qu Mute-Weaver: each enemy minion that becomes Silenced takes 1 damage (not on re-Silence)', () => {
  put(0, 'qu_mute_weaver');
  const e = tough(1);
  play(0, give(0, 'qu_hushwing'), e.uid);
  if (e.health !== 5) return `hp ${e.health}`;
  play(0, give(0, 'qu_hushwing'), e.uid);
  if (e.health !== 5) return `damaged again: ${e.health}`;
});

test('Unwriting: Silences enemy minions that cost (3) or less, not the bigger ones', () => {
  const small = put(1, 'vampire_gargoyle'); small.keywords = ['Taunt'];
  const bigId = Object.keys(ART).find((id) => getCard(id)?.type === 'minion' && getCard(id).faction === 'Dragons' && getCard(id).cost >= 6 && !getCard(id).token);
  const big = put(1, bigId);
  play(0, give(0, 'unwriting'));
  if ((getCard(small.cardId).cost ?? 0) <= 3 && !sil(small)) return 'small not silenced';
  if (sil(big)) return 'big silenced';
});

test('Qu Flesh-Scribe: only Silenced enemies can be chosen; it Remakes and draws', () => {
  const plain = tough(1), quiet = tough(1);
  play(0, give(0, 'qu_hushwing'), quiet.uid);
  const inst = give(0, 'qu_flesh_scribe');
  const targets = getLegalActions(s).filter((a) => a.type === 'play' && a.card === inst.uid).map((a) => a.target);
  if (targets.includes(plain.uid) || !targets.includes(quiet.uid)) return `targets ${targets}`;
  const hand = pl(0).hand.length;
  play(0, inst, quiet.uid);
  if (!isRemadeNow(quiet)) return 'not remade';
  if (pl(0).hand.length !== hand) return `hand ${hand} -> ${pl(0).hand.length} (played 1, drew 1)`;
});

test('Qu Gene-Warden: Taunt; Silenced enemy minions have -1 Attack', () => {
  const w = put(0, 'qu_gene_warden');
  const a = tough(1), b = tough(1);
  play(0, give(0, 'qu_hushwing'), a.uid);
  if (!hasKeyword(w, 'Taunt')) return 'no taunt';
  if (effectiveAttack(a) !== 2 || effectiveAttack(b) !== 3) return `${effectiveAttack(a)} / ${effectiveAttack(b)}`;
});

test('Quiet Laboratory: the next minion the opponent plays is Silenced', () => {
  play(0, give(0, 'quiet_laboratory'));
  applyAction(s, { type: 'endTurn', player: 0 }); settle();
  const inst = give(1, 'vampire_gargoyle');
  applyAction(s, { type: 'play', player: 1, card: inst.uid }); settle();
  const m = pl(1).board.find((x) => x.uid === inst.uid) ?? pl(1).board[pl(1).board.length - 1];
  if (!sil(m)) return 'not silenced';
});

test('Erase and Rewrite: Silences then lets you choose its Remade form', () => {
  const e = tough(1);
  const inst = give(0, 'erase_and_rewrite');
  applyAction(s, { type: 'play', player: 0, card: inst.uid, target: e.uid });
  if (s.pending?.type !== 'choice') return 'no choice offered';
  const i = s.pending.options.findIndex((o) => o.cardId === 'remade_gravital');
  applyAction(s, { type: 'choose', player: 0, index: i }); settle();
  if (e.cardId !== 'remade_gravital') return e.cardId;
  if (hasKeyword(e, 'Taunt')) return 'kept Taunt';
});

test('Qu Archivist: Silences every enemy minion, then Remakes the one with the highest Attack', () => {
  const a = tough(1), b = tough(1); b.attack = 7;
  play(0, give(0, 'qu_archivist'));
  if (!isRemadeNow(b)) return 'strongest not remade';
  if (isRemadeNow(a)) return 'remade the wrong one';
  if (!sil(a)) return 'other not silenced';
});

test('Hush, the Silent Choir: enemy minions arrive Silenced; end of turn Remakes a Silenced enemy', () => {
  put(0, 'hush_the_silent_choir');
  const pre = tough(1);
  applyAction(s, { type: 'endTurn', player: 0 }); settle();
  if (isRemadeNow(pre)) return 'remade an un-silenced minion';
  const inst = give(1, 'vampire_gargoyle');
  applyAction(s, { type: 'play', player: 1, card: inst.uid }); settle();
  const m = pl(1).board[pl(1).board.length - 1];
  if (!sil(m)) return 'arrival not silenced';
  applyAction(s, { type: 'endTurn', player: 1 }); settle();
  applyAction(s, { type: 'endTurn', player: 0 }); settle();
  if (!isRemadeNow(m)) return 'silenced enemy not remade at end of turn';
  if (!getCard('hush_the_silent_choir').legendary) return 'not legendary';
});

test('A Remade minion is not Silenced by the Remake (its drawback stays)', () => {
  const e = tough(1);
  const inst = give(0, 'erase_and_rewrite');
  applyAction(s, { type: 'play', player: 0, card: inst.uid, target: e.uid });
  const i = s.pending.options.findIndex((o) => o.cardId === 'remade_loper');
  applyAction(s, { type: 'choose', player: 0, index: i }); settle();
  if (sil(e) || !hasKeyword(e, 'Recoil')) return `silenced ${sil(e)} recoil ${hasKeyword(e, 'Recoil')}`;
});

test('All 10 new Qu cards have art', () => {
  const ids = ['qu_hushwing', 'sterile_hum', 'qu_mute_weaver', 'unwriting', 'qu_flesh_scribe', 'qu_gene_warden', 'quiet_laboratory', 'erase_and_rewrite', 'qu_archivist', 'hush_the_silent_choir'];
  for (const id of ids) {
    if (!getCard(id)?.extra) return `${id} missing or not unlockable`;
    if (!ART[id] || !existsSync(new URL(`../${ART[id]}`, import.meta.url))) return `no art for ${id}`;
  }
});

console.log(`\n${passed} passed, ${failures} failed`);
if (failures) process.exit(1);
