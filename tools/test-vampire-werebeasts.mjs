// Rules tests for the three legendary vampire werebeasts (Varkhul, Malgrath, Nyxara).
//   node tools/test-vampire-werebeasts.mjs

import { buildDeck } from '../src/cards/index.js';
import { addToHand, hasKeyword, summonMinion } from '../src/engine/core.js';
import { applyAction, createGame, getLegalActions } from '../src/engine/engine.js';
import { getCard } from '../src/engine/registry.js';
import { ART } from '../src/cards/art-manifest.js';
import { existsSync } from 'node:fs';

let s, failures = 0, passed = 0;
function fresh() {
  const fa = ['Vampires', 'Aliens'], fb = ['Dragons', 'Robots'];
  s = createGame({ seed: 5, rules: { mulligan: false, secondPlayerPotions: false, openingHandHelp: false },
    players: [{ name: 'A', factions: fa, deck: buildDeck(fa) }, { name: 'B', factions: fb, deck: buildDeck(fb) }] });
  for (const p of s.players) { p.hand = []; p.mana.max = 10; p.mana.current = 10; p.mana.primal = 0; p.mana.base = 10; }
}
const pl = (p) => s.players[p];
const settle = () => { for (let i = 0; i < 50 && s.pending; i++) applyAction(s, s.pending.type === 'reaction' ? { type: 'pass', player: s.pending.player } : { type: 'choose', player: s.pending.player, index: 0 }); };
const put = (p, id) => { const m = summonMinion(s, p, id); m.sick = false; return m; };
const blank = (p, atk, hp) => { const m = put(p, 'forge_drone'); m.keywords = []; m.attack = atk; m.health = hp; m.maxHealth = hp; return m; };
const attack = (a, d) => { applyAction(s, { type: 'attack', player: 0, attacker: a, defender: d }); settle(); };
const canAttack = (uid) => getLegalActions(s).some((x) => x.type === 'attack' && x.attacker === uid);
function test(name, fn) { fresh(); try { const r = fn(); if (r) { failures++; console.log(`FAIL ${name}: ${r}`); } else { passed++; console.log(`ok   ${name}`); } } catch (e) { failures++; console.log(`FAIL ${name}: ${e.stack.split('\n').slice(0, 2).join(' | ')}`); } }

test('all three exist: legendary Vampire Lycans in Beast Form, with art, one copy per deck', () => {
  for (const id of ['varkhul_the_crimson_maw', 'malgrath_the_bloodmoon_behemoth', 'nyxara_the_crimson_nightstalker']) {
    const c = getCard(id);
    if (!c?.legendary || c.faction !== 'Vampires' || !c.tribes.includes('Vampire') || !c.tribes.includes('Lycan') || c.form !== 'beast') return `${id} ${JSON.stringify(c?.tribes)}`;
    if (!ART[id] || !existsSync(new URL(`../${ART[id]}`, import.meta.url))) return `no art ${id}`;
  }
});
test('Varkhul: Rush on arrival; a kill grants one more attack, only once per turn', () => {
  const inst = addToHand(s, 0, 'varkhul_the_crimson_maw');
  applyAction(s, { type: 'play', player: 0, card: inst.uid }); settle();
  const v = pl(0).board.find((m) => m.cardId === 'varkhul_the_crimson_maw');
  const e1 = blank(1, 1, 2), e2 = blank(1, 1, 2), e3 = blank(1, 1, 2);
  if (!canAttack(v.uid)) return 'no Rush';
  attack(v.uid, e1.uid);
  if (!canAttack(v.uid)) return 'no second attack after a kill';
  attack(v.uid, e2.uid);
  if (canAttack(v.uid)) return 'a third attack';
  if (pl(1).board.includes(e1) || pl(1).board.includes(e2) || !pl(1).board.includes(e3)) return 'wrong minions died';
});
test('Varkhul: no second attack if the first one does not kill', () => {
  const v = put(0, 'varkhul_the_crimson_maw'); const e = blank(1, 1, 20);
  attack(v.uid, e.uid);
  if (canAttack(v.uid)) return 'attacked again without a kill';
});
test('Malgrath: +1/+1 each time your Hero loses Health', () => {
  const m = put(0, 'malgrath_the_bloodmoon_behemoth');
  for (let i = 0; i < 2; i++) { const t = addToHand(s, 0, 'blood_tithe'); applyAction(s, { type: 'play', player: 0, card: t.uid }); settle(); }
  if (m.attack !== 8 || m.maxHealth !== 10 || pl(0).hero.health !== 26) return `${m.attack}/${m.maxHealth}`;
  if (!hasKeyword(m, 'Taunt') || !hasKeyword(m, 'Lifesteal')) return 'keywords';
});
test('Nyxara: kills anything it hits (Venomous) and slips back into Stealth', () => {
  const n = put(0, 'nyxara_the_crimson_nightstalker'); const big = blank(1, 2, 30);
  attack(n.uid, big.uid);
  if (pl(1).board.includes(big)) return 'big minion survived';
  if (!hasKeyword(n, 'Stealth')) return 'no Stealth after the kill';
});
test('Nyxara: attacking the Hero reveals her (no kill, no Stealth back)', () => {
  const n = put(0, 'nyxara_the_crimson_nightstalker');
  attack(n.uid, pl(1).hero.uid);
  if (hasKeyword(n, 'Stealth')) return 'regained Stealth without a kill';
});

test('they never offer a Transform', () => {
  const v = put(0, 'varkhul_the_crimson_maw'); put(0, 'malgrath_the_bloodmoon_behemoth'); put(0, 'nyxara_the_crimson_nightstalker');
  if (getLegalActions(s).some((a) => a.type === 'transform')) return 'transform offered';
});

console.log(`\n${passed} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
