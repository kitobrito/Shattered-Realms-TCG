// Rules tests for King Meg, The Apex Predator (legendary Shark): Swallow Whole.
//   node tools/test-king-meg.mjs

import { buildDeck } from '../src/cards/index.js';
import { effectiveAttack, summonMinion } from '../src/engine/core.js';
import { applyAction, createGame } from '../src/engine/engine.js';
import { getCard } from '../src/engine/registry.js';

let s, failures = 0, passed = 0;
function fresh() {
  const fa = ['Sharks', 'Vampires'], fb = ['Robots', 'Ghosts'];
  s = createGame({ seed: 3, rules: { mulligan: false, secondPlayerPotions: false, openingHandHelp: false },
    players: [{ name: 'A', factions: fa, deck: buildDeck(fa) }, { name: 'B', factions: fb, deck: buildDeck(fb) }] });
  for (const p of s.players) { p.hand = []; p.mana.max = 10; p.mana.current = 10; p.mana.primal = 0; p.mana.base = 10; }
}
const settle = () => { for (let i = 0; i < 50 && s.pending; i++) applyAction(s, s.pending.type === 'reaction' ? { type: 'pass', player: s.pending.player } : { type: 'choose', player: s.pending.player, index: 0 }); };
const blank = (p, atk, hp) => { const m = summonMinion(s, p, 'forge_drone'); m.sick = false; m.keywords = []; m.attack = atk; m.health = hp; m.maxHealth = hp; return m; };
const meg = () => { const m = summonMinion(s, 0, 'king_meg_the_apex_predator'); m.sick = false; return m; };
const attack = (a, t) => { applyAction(s, { type: 'attack', player: 0, attacker: a.uid, defender: t.uid }); settle(); };
function test(name, fn) { fresh(); try { const r = fn(); if (r) { failures++; console.log(`FAIL ${name}: ${r}`); } else { passed++; console.log(`ok   ${name}`); } } catch (e) { failures++; console.log(`FAIL ${name}: ${e.stack.split('\n')[0]}`); } }

test('King Meg exists, is a legendary 10-Mana 8/10 Rush Shark', () => {
  const c = getCard('king_meg_the_apex_predator');
  if (!c.legendary || c.cost !== 10 || c.attack !== 8 || c.health !== 10 || !c.keywords.includes('Rush')) return JSON.stringify(c);
});
test('Attacking Marked Prey swallows it whole: destroyed, its stats gained for good, no damage taken', () => {
  const k = meg(); const p = blank(1, 4, 3); p.prey = true;
  attack(k, p);
  if (s.players[1].board.includes(p)) return 'prey survived';
  if (effectiveAttack(k) !== 12 || k.maxHealth !== 13 || k.health !== 13) return `${effectiveAttack(k)}/${k.health}/${k.maxHealth}`;
});
test('Attacking a minion that is not Prey is a normal fight', () => {
  const k = meg(); const e = blank(1, 3, 20);
  attack(k, e);
  if (e.health !== 12 || k.health !== 7 || effectiveAttack(k) !== 8) return `${e.health} ${k.health} ${effectiveAttack(k)}`;
});

console.log(`\n${passed} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
