// Quick Plays: borrowed Mana on the opponent's turn, the reflex discount, and every realm has some.
//   node tools/test-quick-play.mjs
import { buildDeck, FACTION_POOLS, PLAYABLE_FACTIONS } from '../src/cards/index.js';
import { addToHand, quickPlayBudget, quickPlayCost, summonMinion } from '../src/engine/core.js';
import { applyAction, createGame, getLegalActions } from '../src/engine/engine.js';
import { getCard } from '../src/engine/registry.js';

let s, failures = 0, passed = 0;
function fresh(a = ['Ice Age'], b = ['Vampires']) {
  s = createGame({ seed: 3, rules: { mulligan: false, secondPlayerPotions: false, openingHandHelp: false },
    players: [{ name: 'A', factions: a, deck: buildDeck(a) }, { name: 'B', factions: b, deck: buildDeck(b) }] });
  for (const p of s.players) p.hand = [];
}
const test = (name, fn) => { fresh(); try { const r = fn(); if (r) { failures++; console.log(`FAIL ${name}: ${r}`); } else { passed++; console.log(`ok   ${name}`); } } catch (e) { failures++; console.log(`FAIL ${name}: ${e.stack.split('\n').slice(0, 2).join(' | ')}`); } };
// Ends turns until it is `p`'s opponent's turn, with a minion of theirs ready to attack.
function toEnemyTurn(p) {
  while (s.activePlayer === p || s.pending) {
    if (s.pending?.type === 'reaction') applyAction(s, { type: 'pass', player: s.pending.player });
    else if (s.pending?.type === 'choice') applyAction(s, { type: 'choose', player: s.pending.player, index: 0 });
    else applyAction(s, { type: 'endTurn', player: s.activePlayer });
  }
}

test('On the opponent\'s turn a Quick Play costs 1 less (never below 1), on your own turn full price', () => {
  const vol = addToHand(s, 0, 'flint_spear_volley'); // 2 Mana
  const fox = addToHand(s, 0, 'garlic_and_salt');    // a 1-Mana Quick Play of another realm, just for the price rule
  s.activePlayer = 0;
  if (quickPlayCost(s, vol) !== 2) return `own turn ${quickPlayCost(s, vol)}`;
  s.activePlayer = 1;
  if (quickPlayCost(s, vol) !== 1) return `off turn ${quickPlayCost(s, vol)}`;
  if (quickPlayCost(s, fox) !== 1) return `1-cost went to ${quickPlayCost(s, fox)}`;
});
test('Borrowed Mana: left-over first, then next turn\'s, and it comes off the next refill', () => {
  toEnemyTurn(0);
  const me = s.players[0];
  me.mana.max = 4; me.mana.current = 1; me.qpDebt = 0;
  if (quickPlayBudget(s, 0) !== 1 + 5) return `budget ${quickPlayBudget(s, 0)}`;
  const foe = summonMinion(s, 1, 'vampire_gargoyle'); foe.sick = false;
  const card = addToHand(s, 0, 'glacial_fortress'); // 4 Mana, 3 off-turn
  summonMinion(s, 0, 'arctic_fox');
  applyAction(s, { type: 'attack', player: 1, attacker: foe.uid, defender: s.players[0].hero.uid });
  const act = getLegalActions(s).find((a) => a.type === 'quickPlay' && a.card === card.uid);
  if (!act) return 'not offered';
  applyAction(s, act);
  if (me.mana.current !== 0) return `left-over not spent first (${me.mana.current})`;
  if (me.qpDebt !== 2) return `debt ${me.qpDebt}`;
  while (s.pending) applyAction(s, s.pending.type === 'reaction' ? { type: 'pass', player: s.pending.player } : { type: 'choose', player: s.pending.player, index: 0 });
  applyAction(s, { type: 'endTurn', player: 1 });
  while (s.pending) applyAction(s, s.pending.type === 'reaction' ? { type: 'pass', player: s.pending.player } : { type: 'choose', player: s.pending.player, index: 0 });
  if (me.mana.max !== 5 || me.mana.current !== 3) return `next turn ${me.mana.current}/${me.mana.max} (want 3/5)`;
  if (me.qpDebt) return 'debt not cleared';
});
test('No Quick Play is offered that you can\'t afford even with next turn\'s Mana', () => {
  toEnemyTurn(0);
  const me = s.players[0];
  me.mana.max = 1; me.mana.current = 0; me.qpDebt = 0; // next turn: 2 Mana
  const card = addToHand(s, 0, 'glacial_fortress');    // 3 off-turn
  const foe = summonMinion(s, 1, 'vampire_gargoyle'); foe.sick = false;
  summonMinion(s, 0, 'arctic_fox');
  applyAction(s, { type: 'attack', player: 1, attacker: foe.uid, defender: s.players[0].hero.uid });
  if (getLegalActions(s).some((a) => a.type === 'quickPlay' && a.card === card.uid)) return 'offered beyond the budget';
});
test('Every realm has at least two Quick Plays', () => {
  const short = PLAYABLE_FACTIONS.filter((f) => (FACTION_POOLS[f] ?? []).filter((id) => getCard(id).quickPlay).length < 2);
  if (short.length) return short.join(', ');
});
console.log(`\n${passed} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
