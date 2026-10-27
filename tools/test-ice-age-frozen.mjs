// Rules tests for Ice Age: Frozen in Time (Thawing). Each test sets up a small board, plays the card
// through the real engine, and checks the outcome.   node tools/test-ice-age-frozen.mjs

import { buildDeck } from '../src/cards/index.js';
import { addToHand, costOf, effectiveAttack, hasKeyword, heal, radiationOf, summonMinion } from '../src/engine/core.js';
import { applyAction, attackTargets, createGame, getLegalActions } from '../src/engine/engine.js';
import { resolveEffect } from '../src/engine/effects.js';
import { getCard } from '../src/engine/registry.js';
import { ART } from '../src/cards/art-manifest.js';

let s;
let failures = 0;
let passed = 0;

// Player 0 runs Ice Age (+ `partner`); player 1 runs `foe`.
function fresh(partner = 'Vampires', foe = ['Dragons', 'Robots']) {
  const fa = ['Ice Age', partner];
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

const resolve = (effect) => { resolveEffect(s, effect, { controller: 0, self: pl(0).hero.uid }); settle(); };
const foeMinion = (atk = 3, hp = 4, p = 1) => { const m = put(p, 'vampire_gargoyle'); m.keywords = []; m.attack = atk; m.health = hp; m.maxHealth = hp; return m; };
const canAttackWith = (m) => getLegalActions(s).some((a) => a.type === 'attack' && a.attacker === m.uid);
// End my turn and the opponent's: my next turn starts (Thawing counts down then).
const fullRound = () => { endTurn(); endTurn(); };
const zap = (target, amount = 5) => { play(0, give(0, 'flint_spear_volley'), target.uid); };

test('A Thawing minion arrives sealed in ice: no attacks, no damage', () => {
  play(0, give(0, 'encased_homotherium'));
  const m = find(0, 'encased_homotherium');
  if (m.encased !== 2) return `encased ${m.encased}`;
  m.sick = false;
  if (canAttackWith(m)) return 'could attack';
  zap(m);
  if (m.health !== 3) return `took damage: ${m.health}`;
});
test('Enemies can\'t attack a minion in ice, and its Taunt doesn\'t count yet', () => {
  const t = put(1, 'glacier_mastodon');
  const targets = attackTargets(s, 0);
  if (targets.includes(t.uid)) return 'ice block is attackable';
  if (!targets.includes(pl(1).hero.uid)) return 'Taunt in ice blocked the Hero';
});
test('Thawing (2) breaks free at the start of its second turn and can attack', () => {
  play(0, give(0, 'encased_homotherium'));
  const m = find(0, 'encased_homotherium');
  fullRound();
  if (m.encased !== 1) return `after 1 round ${m.encased}`;
  if (canAttackWith(m)) return 'attacked while still sealed';
  fullRound();
  if (m.encased) return `still sealed ${m.encased}`;
  if (!canAttackWith(m)) return 'cannot attack after breaking free';
});
test('Frostbitten Hare: breaks free next turn and draws a card', () => {
  play(0, give(0, 'frostbitten_hare'));
  const before = pl(0).hand.length;
  fullRound();
  const hare = find(0, 'frostbitten_hare');
  if (hare.encased) return 'still sealed';
  // one card from the normal draw, one from the Hare
  if (pl(0).hand.length !== before + 2) return `hand ${before} -> ${pl(0).hand.length}`;
});
test('Ice-Carver: a friendly minion breaking free gets +1/+1', () => {
  put(0, 'ice_carver');
  play(0, give(0, 'frostbitten_hare'));
  fullRound();
  const h = find(0, 'frostbitten_hare');
  if (h.attack !== 3 || h.health !== 2) return `${h.attack}/${h.health}`;
});
test('Meltwater: Thawing minions are 1 turn closer (Thawing 1 breaks free now) and draws', () => {
  play(0, give(0, 'encased_homotherium'));
  const m = find(0, 'encased_homotherium');
  const mw = give(0, 'meltwater');
  const hand = pl(0).hand.length;
  play(0, mw);
  if (m.encased !== 1) return `encased ${m.encased}`;
  if (pl(0).hand.length !== hand) return 'no draw'; // Meltwater leaves the hand, its draw comes in
  play(0, give(0, 'meltwater'));
  if (m.encased) return 'did not break free';
});
test('Flash Thaw: breaks it free now with Rush', () => {
  play(0, give(0, 'glacier_mastodon'));
  const m = find(0, 'glacier_mastodon');
  play(0, give(0, 'flash_thaw'), m.uid);
  if (m.encased) return 'still sealed';
  if (!hasKeyword(m, 'Rush') || !hasKeyword(m, 'Taunt')) return 'missing Rush/Taunt';
  foeMinion(2, 2);
  if (!canAttackWith(m)) return 'cannot attack with Rush';
});
test('Deep Freeze: the enemy minion misses its next two turns and can\'t be hit', () => {
  const e = foeMinion(4, 4);
  e.sick = false;
  play(0, give(0, 'deep_freeze'), e.uid);
  if (e.encased !== 3) return `encased ${e.encased}`;
  if (attackTargets(s, 0).includes(e.uid)) return 'attackable';
  endTurn();
  if (getLegalActions(s).some((a) => a.type === 'attack' && a.attacker === e.uid)) return 'attacked on its 1st turn';
  fullRound();
  if (getLegalActions(s).some((a) => a.type === 'attack' && a.attacker === e.uid)) return 'attacked on its 2nd turn';
  fullRound();
  if (e.encased) return `still sealed ${e.encased}`;
});
test('Ice Tomb: the attacker is sealed in ice and the attack is stopped', () => {
  play(0, give(0, 'ice_tomb'));
  endTurn();
  const e = foeMinion(5, 5); e.sick = false;
  const hp = pl(0).hero.health;
  attack(1, e.uid, pl(0).hero.uid);
  if (!(e.encased > 0)) return 'not sealed';
  if (pl(0).hero.health !== hp) return `hero took ${hp - pl(0).hero.health}`;
});
test('Silence breaks the ice at once, without its Breaks free effect', () => {
  play(0, give(0, 'frostbitten_hare'));
  const h = find(0, 'frostbitten_hare');
  const hand = pl(0).hand.length;
  resolve({ op: 'buff', target: { uid: h.uid }, keywords: ['Silenced'] });
  if (h.encased) return 'still sealed';
  if (pl(0).hand.length !== hand) return 'drew a card';
});
test('Una: Arrival and each turn start bring Thawing minions closer', () => {
  play(0, give(0, 'glacier_mastodon'));
  const m = find(0, 'glacier_mastodon');
  play(0, give(0, 'una_the_glacier_keeper'));
  if (m.encased !== 2) return `after Arrival ${m.encased}`;
  fullRound();
  if (m.encased) return `after a round ${m.encased}`;
});
test('Kalak breaks free and destroys every Frozen enemy minion', () => {
  play(0, give(0, 'kalak_the_thousand_year_mammoth'));
  const k = find(0, 'kalak_the_thousand_year_mammoth');
  k.encased = 1;
  endTurn();
  const a = foeMinion(2, 9), b = foeMinion(2, 9), c = foeMinion(2, 9);
  resolve({ op: 'buff', target: { uid: a.uid }, keywords: ['Frozen'] });
  resolve({ op: 'buff', target: { uid: b.uid }, keywords: ['Frozen'] });
  endTurn(); // my turn starts: Kalak breaks free
  if (k.encased) return 'still sealed';
  if (onBoard(a) || onBoard(b)) return 'Frozen minion survived';
  if (!onBoard(c)) return 'unfrozen minion destroyed';
});
test('Elasmotherium deals 4 to a random enemy minion when it breaks free', () => {
  play(0, give(0, 'elasmotherium_the_siberian_unicorn'));
  const e = foeMinion(1, 6);
  play(0, give(0, 'flash_thaw'), find(0, 'elasmotherium_the_siberian_unicorn').uid);
  if (e.health !== 2) return `health ${e.health}`;
});
test('Glacier Prospector draws a Thawing minion', () => {
  pl(0).deck.unshift({ uid: s.nextUid++, cardId: 'arctic_fox' }, { uid: s.nextUid++, cardId: 'glacier_mastodon' });
  play(0, give(0, 'glacier_prospector'));
  if (!pl(0).hand.some((c) => getCard(c.cardId).thawing)) return 'no Thawing minion drawn';
});
test('Neanderthal Ice Digger summons a Frostbitten Hare in ice', () => {
  play(0, give(0, 'neanderthal_ice_digger'));
  const h = find(0, 'frostbitten_hare');
  if (!h || h.encased !== 1) return `hare ${h?.encased}`;
});
test('All 15 cards are unlockable extras with art; Una and Kalak are legendary', () => {
  const ids = ['glacier_prospector', 'frostbitten_hare', 'ice_carver', 'encased_homotherium', 'thawed_steppe_bison', 'neanderthal_ice_digger', 'arctodus_short_faced_bear',
    'elasmotherium_the_siberian_unicorn', 'glacier_mastodon', 'una_the_glacier_keeper', 'kalak_the_thousand_year_mammoth', 'meltwater', 'flash_thaw', 'deep_freeze', 'ice_tomb'];
  const bad = ids.filter((id) => !getCard(id)?.extra || !ART[id]);
  if (bad.length) return bad.join(',');
  if (!getCard('una_the_glacier_keeper').legendary || !getCard('kalak_the_thousand_year_mammoth').legendary) return 'legendaries';
});

console.log(`\n${passed} passed, ${failures} failed`);
if (failures) process.exit(1);
