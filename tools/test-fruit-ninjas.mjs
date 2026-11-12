// Fruit Ninjas rules: Fruits, Slice, Multislice, Combo, Harvest and every Fruit Ninjas card,
// checked against their text. Each test sets up a small board and runs the real engine.
//   node tools/test-fruit-ninjas.mjs

import { buildDeck, FACTION_LISTS, FACTION_POOLS, LEGENDARY } from '../src/cards/index.js';
import { FRUIT_IDS } from '../src/cards/fruit-ninjas.js';
import { addToHand, costOf, hasKeyword, summonMinion, effectiveAttack } from '../src/engine/core.js';
import { applyAction, attackTargets, createGame, fusionFor, getLegalActions, run as drain } from '../src/engine/engine.js';
import { resolveEffect } from '../src/engine/effects.js';
import { allCards, getCard } from '../src/engine/registry.js';
import { ART } from '../src/cards/art-manifest.js';
import fs from 'node:fs';

let s;
let failures = 0;
let passed = 0;

function fresh(partner = 'Sharks', foe = ['Vampires', 'Dragons']) {
  const fa = ['Fruit Ninjas', partner];
  const players = [{ name: 'A', factions: fa, deck: buildDeck(fa) }, { name: 'B', factions: foe, deck: buildDeck(foe) }];
  s = createGame({ seed: 7, rules: { mulligan: false, secondPlayerPotions: false, openingHandHelp: false }, players });
  for (const p of s.players) { p.hand = []; p.mana.max = 10; p.mana.current = 10; p.mana.primal = 0; p.mana.base = 10; }
}
const pl = (p) => s.players[p];
const hero = (p) => pl(p).hero;
const put = (p, id) => { const m = summonMinion(s, p, id); m.sick = false; return m; };
const give = (p, id) => addToHand(s, p, id);
const blank = (p, atk, hp, kws = []) => { const m = put(p, 'vampire_gargoyle'); m.keywords = [...kws]; m.attack = atk; m.health = hp; m.maxHealth = hp; return m; };
const lost = (m) => m.maxHealth - m.health;
const onBoard = (p, id) => pl(p).board.filter((m) => m.cardId === id && m.health > 0 && !m.destroyed);
const fruits = (p) => pl(p).board.filter((m) => getCard(m.cardId).tribes?.includes('Fruit'));

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
function heroSpell(p, cardId, target) {
  applyAction(s, { type: 'heroSpell', player: p, card: cardId, ...(target != null ? { target } : {}) });
  settle();
}
function attack(p, attacker, defender, react) {
  applyAction(s, { type: 'attack', player: p, attacker, defender });
  settle(react);
}
function endTurn() {
  applyAction(s, { type: 'endTurn', player: s.activePlayer });
  settle();
  for (const p of s.players) { p.mana.max = 10; p.mana.current = 10; p.mana.primal = 0; p.mana.base = 10; }
}
function run(effect, controller = 0, extra = {}) {
  resolveEffect(s, effect, { controller, self: null, ...extra });
  s.queue.push({ kind: 'deaths' });
  drain(s);
  settle();
}
const sliceIt = (fruit) => run({ op: 'slice', target: { uid: fruit.uid } });

function test(name, fn, ...args) {
  fresh(...args);
  try {
    const problem = fn();
    if (problem) { failures++; console.log(`FAIL ${name}: ${problem}`); } else { passed++; console.log(`ok   ${name}`); }
  } catch (e) { failures++; console.log(`FAIL ${name}: threw ${e.stack.split('\n').slice(0, 3).join(' | ')}`); }
}

// ---- The set ----
test('45 cards + 5 weapons: 30 standard, 20 Shadow Orchard; Harvest and 3 tokens outside the deck', () => {
  if (FACTION_LISTS['Fruit Ninjas'].length !== 30) return `standard ${FACTION_LISTS['Fruit Ninjas'].length}`;
  if (FACTION_POOLS['Fruit Ninjas'].length !== 50) return `pool ${FACTION_POOLS['Fruit Ninjas'].length}`;
  const hs = allCards().filter((c) => c.faction === 'Fruit Ninjas' && c.heroSpell);
  if (hs.length !== 1 || hs[0].id !== 'harvest') return 'hero spell';
  const tokens = allCards().filter((c) => c.faction === 'Fruit Ninjas' && c.token).map((c) => c.id).sort();
  if (tokens.join() !== 'mirage,orchard_shinobi,phantom_shinobi') return tokens.join();
  const legends = allCards().filter((c) => c.faction === 'Fruit Ninjas' && c.legendary).length;
  if (legends !== 10) return `${legends} legendaries`;
});
test('Every Fruit is a 0/1 that cannot attack, with a Slice effect', () => {
  for (const id of FRUIT_IDS) {
    const c = getCard(id);
    if (c.attack !== 0 || c.health !== 1 || !c.cantAttack || !c.slice?.length || !c.tribes.includes('Fruit')) return id;
  }
  const f = put(0, 'thunder_lemon');
  if (getLegalActions(s).some((a) => a.type === 'attack' && a.attacker === f.uid)) return 'a Fruit could attack';
});
test('Every Fruit Ninjas card, token and fusion has art on disk', () => {
  const ids = allCards().filter((c) => c.faction === 'Fruit Ninjas' || c.fusion?.includes('Fruit Ninjas')).map((c) => c.id);
  const missing = ids.filter((id) => !ART[id] || !fs.existsSync(new URL(`../${ART[id]}`, import.meta.url)));
  if (missing.length) return missing.join(', ');
});

// ---- Harvest ----
test('Harvest summons a random Fruit', () => {
  heroSpell(0, 'harvest');
  if (fruits(0).length !== 1) return `${fruits(0).length} fruits`;
  if (!FRUIT_IDS.includes(fruits(0)[0].cardId)) return fruits(0)[0].cardId;
});

test('Harvest slices your leftmost Fruit first, then grows a new one', () => {
  const e = blank(1, 1, 9);
  const lemon = put(0, 'thunder_lemon');
  heroSpell(0, 'harvest');
  if (lemon.health > 0 && !lemon.destroyed) return 'the old Fruit was not sliced';
  if (lost(e) !== 2) return `enemy lost ${lost(e)}`;
  if (fruits(0).filter((f) => f.health > 0 && !f.destroyed).length !== 1) return 'no new Fruit';
});

// ---- Slice ----
test('Slice: Thunder Lemon is destroyed and deals 2 to a random enemy minion', () => {
  const e = blank(1, 1, 9);
  const f = put(0, 'thunder_lemon');
  sliceIt(f);
  if (onBoard(0, 'thunder_lemon').length) return 'the Lemon is still there';
  if (lost(e) !== 2) return `enemy lost ${lost(e)}`;
});
test('A Fruit killed by the enemy does nothing (no Slice)', () => {
  const e = blank(1, 1, 9);
  const f = put(0, 'thunder_lemon');
  run({ op: 'damage', target: { uid: f.uid }, amount: 5 }, 1);
  if (onBoard(0, 'thunder_lemon').length) return 'still alive';
  if (lost(e) !== 0) return 'the Slice went off';
});
test('A Silenced Fruit is Sliced for nothing', () => {
  const e = blank(1, 1, 9);
  const f = put(0, 'thunder_lemon');
  run({ op: 'buff', target: { uid: f.uid }, keywords: ['Silenced'] }, 1);
  sliceIt(f);
  if (onBoard(0, 'thunder_lemon').length) return 'not destroyed';
  if (lost(e) !== 0) return 'the Silenced Fruit still worked';
});
test('Blitz Cherry: +2 Attack this turn to a friendly minion, never to another Fruit', () => {
  const a = blank(0, 1, 5);
  put(0, 'healing_peach');
  sliceIt(put(0, 'blitz_cherry'));
  if (effectiveAttack(a) !== 3) return `attack ${effectiveAttack(a)}`;
  if (effectiveAttack(onBoard(0, 'healing_peach')[0]) !== 0) return 'buffed a Fruit';
  endTurn();
  if (effectiveAttack(a) !== 1) return 'did not wear off';
});
test('Healing Peach heals your most damaged character (your Hero when nobody is hurt)', () => {
  const a = blank(0, 1, 9); a.health = 3;
  hero(0).health = 28;
  sliceIt(put(0, 'healing_peach'));
  if (a.health !== 6) return `minion ${a.health}`;
  if (hero(0).health !== 28) return 'healed the Hero instead';
});
test('Iron Coconut: +0/+3 and Taunt', () => {
  const a = blank(0, 1, 2);
  sliceIt(put(0, 'iron_coconut'));
  if (a.health !== 5 || !hasKeyword(a, 'Taunt')) return `${a.health} ${hasKeyword(a, 'Taunt')}`;
});
test('Inferno Pineapple: 2 to one enemy minion and 1 to its neighbours', () => {
  const [l, m, r] = [blank(1, 1, 9), blank(1, 1, 9), blank(1, 1, 9)];
  sliceIt(put(0, 'inferno_pineapple'));
  const hits = [lost(l), lost(m), lost(r)];
  const sum = hits.reduce((a, b) => a + b, 0);
  if (!hits.includes(2) || (hits[1] === 2 ? sum !== 4 : sum !== 3)) return hits.join(',');
});
test('Frost Grape Cluster freezes one enemy minion and gives it -1 Attack until your next turn', () => {
  const e = blank(1, 3, 9);
  sliceIt(put(0, 'frost_grape_cluster'));
  if (!hasKeyword(e, 'Frozen') || effectiveAttack(e) !== 2) return `${hasKeyword(e, 'Frozen')} ${effectiveAttack(e)}`;
  endTurn(); endTurn();
  if (effectiveAttack(e) !== 3) return 'the -1 did not wear off';
});
test('Phantom Dragonfruit summons a 2/2 Phantom Shinobi with Stealth', () => {
  sliceIt(put(0, 'phantom_dragonfruit'));
  const p = onBoard(0, 'phantom_shinobi')[0];
  if (!p || !hasKeyword(p, 'Stealth')) return 'no stealthy Phantom';
});
test('Titan Watermelon: +2/+2', () => {
  const a = blank(0, 1, 1);
  sliceIt(put(0, 'titan_watermelon'));
  if (a.attack !== 3 || a.health !== 3) return `${a.attack}/${a.health}`;
});
test('Chrono Starfruit returns a friendly minion to hand costing 2 less', () => {
  put(0, 'melon_guard');
  sliceIt(put(0, 'chrono_starfruit'));
  const inst = pl(0).hand.find((c) => c.cardId === 'melon_guard');
  if (!inst) return 'not in hand';
  if (costOf(s, inst) !== 0) return `cost ${costOf(s, inst)}`;
});
test('Shadow Kiwi gives a friendly minion Stealth until your next turn', () => {
  const a = blank(0, 1, 5);
  sliceIt(put(0, 'shadow_kiwi'));
  if (!hasKeyword(a, 'Stealth')) return 'no Stealth';
  endTurn();
  if (!hasKeyword(a, 'Stealth')) return 'gone on the enemy turn';
  endTurn();
  if (hasKeyword(a, 'Stealth')) return 'still there on your next turn';
});

// ---- Ninjas ----
test('Orchard Initiate adds a random Fruit to your hand', () => {
  const inst = give(0, 'orchard_initiate');
  play(0, inst);
  if (!pl(0).hand.some((c) => FRUIT_IDS.includes(c.cardId))) return 'no Fruit in hand';
});
test('Cherryblade Scout gains Stealth after you Slice', () => {
  const c = put(0, 'cherryblade_scout');
  sliceIt(put(0, 'healing_peach'));
  if (!hasKeyword(c, 'Stealth')) return 'no Stealth';
});
test('Citrus Runner: +1 Attack this turn whenever you summon a Fruit', () => {
  const c = put(0, 'citrus_runner');
  heroSpell(0, 'harvest');
  if (effectiveAttack(c) !== 2) return `attack ${effectiveAttack(c)}`;
});
test('Peach Blossom Disciple heals 2 only on the first Slice each turn', () => {
  put(0, 'peach_blossom_disciple');
  hero(0).health = 20;
  sliceIt(put(0, 'healing_peach')); // Peach heals the Hero 3, Disciple 2
  sliceIt(put(0, 'thunder_lemon'));
  if (hero(0).health !== 25) return `hero ${hero(0).health}`;
});
test('Melon Guard gains +1 Attack after each Slice', () => {
  const g = put(0, 'melon_guard');
  sliceIt(put(0, 'thunder_lemon'));
  sliceIt(put(0, 'thunder_lemon'));
  if (g.attack !== 3) return `attack ${g.attack}`;
});
test('Razorleaf Apprentice: the next Slice this turn also pings an enemy minion', () => {
  const e = blank(1, 1, 9);
  play(0, give(0, 'razorleaf_apprentice'));
  sliceIt(put(0, 'healing_peach'));
  sliceIt(put(0, 'healing_peach'));
  if (lost(e) !== 1) return `enemy lost ${lost(e)}`;
});
test('Kiwi Shadowstepper gets Stealth only as a Combo', () => {
  const a = give(0, 'kiwi_shadowstepper');
  play(0, a);
  const first = onBoard(0, 'kiwi_shadowstepper')[0];
  if (hasKeyword(first, 'Stealth')) return 'Stealth without a Combo';
  play(0, give(0, 'kiwi_shadowstepper'));
  const second = onBoard(0, 'kiwi_shadowstepper').find((m) => m.uid !== first.uid);
  if (!hasKeyword(second, 'Stealth')) return 'no Stealth on the Combo';
});
test('Banana Acrobat returns to hand at the end of the turn if it survives attacking', () => {
  const b = put(0, 'banana_acrobat');
  const e = blank(1, 0, 9);
  attack(0, b.uid, e.uid);
  endTurn();
  if (onBoard(0, 'banana_acrobat').length) return 'still on the board';
  if (!pl(0).hand.some((c) => c.cardId === 'banana_acrobat')) return 'not in hand';
});
test('Orchard Lookout: a Fruit summon gives another friendly minion +1 Attack this turn', () => {
  put(0, 'orchard_lookout');
  const a = blank(0, 1, 5);
  heroSpell(0, 'harvest');
  if (effectiveAttack(a) !== 2) return `attack ${effectiveAttack(a)}`;
});
test('Twin-Slice Trainee: the first Slice each turn works twice', () => {
  put(0, 'twin_slice_trainee');
  const e = blank(1, 1, 20);
  sliceIt(put(0, 'thunder_lemon'));
  sliceIt(put(0, 'thunder_lemon'));
  if (lost(e) !== 6) return `enemy lost ${lost(e)} (want 4 + 2)`;
});
test('Pineapple Pyromancer pings a random enemy minion whenever you Slice', () => {
  put(0, 'pineapple_pyromancer');
  const e = blank(1, 1, 20);
  sliceIt(put(0, 'healing_peach'));
  if (lost(e) !== 1) return `lost ${lost(e)}`;
});
test('Grapevine Assassin freezes the minion it attacks', () => {
  const g = put(0, 'grapevine_assassin');
  const e = blank(1, 1, 20);
  attack(0, g.uid, e.uid);
  if (!hasKeyword(e, 'Frozen')) return 'not frozen';
  if (hasKeyword(g, 'Stealth')) return 'kept Stealth after attacking';
});
test('Coconut Ironfist takes 1 less from the first hit each turn only', () => {
  const c = put(0, 'coconut_ironfist');
  run({ op: 'damage', target: { uid: c.uid }, amount: 3 }, 1);
  run({ op: 'damage', target: { uid: c.uid }, amount: 1 }, 1);
  if (lost(c) !== 3) return `lost ${lost(c)} (want 2 + 1)`;
});
test('Mango Mirage Dancer: Combo summons a Rush Mirage that dies at the end of the turn', () => {
  play(0, give(0, 'healing_peach'));
  play(0, give(0, 'mango_mirage_dancer'));
  const m = onBoard(0, 'mirage')[0];
  if (!m || !hasKeyword(m, 'Rush')) return 'no Mirage';
  endTurn();
  if (onBoard(0, 'mirage').length) return 'Mirage survived the turn';
});
test('Dragonfruit Duelist adds a random Fruit to hand when it kills a minion', () => {
  const d = put(0, 'dragonfruit_duelist');
  const e = blank(1, 0, 2);
  attack(0, d.uid, e.uid);
  if (!pl(0).hand.some((c) => FRUIT_IDS.includes(c.cardId))) return 'no Fruit';
});
test('Papaya Windwalker gives another friendly minion Rush after a Slice', () => {
  put(0, 'papaya_windwalker');
  const a = blank(0, 1, 5);
  sliceIt(put(0, 'healing_peach'));
  if (!hasKeyword(a, 'Rush')) return 'no Rush';
});
test('Watermelon Executioner: Slice a Fruit, and only then +2/+2', () => {
  const f = put(0, 'thunder_lemon');
  play(0, give(0, 'watermelon_executioner'), f.uid);
  const w = onBoard(0, 'watermelon_executioner')[0];
  if (onBoard(0, 'thunder_lemon').length) return 'Fruit not sliced';
  if (w.attack !== 7 || w.health !== 6) return `${w.attack}/${w.health}`;
  play(0, give(0, 'watermelon_executioner'));
  const w2 = onBoard(0, 'watermelon_executioner').find((m) => m.uid !== w.uid);
  if (w2.attack !== 5) return 'grew without a Fruit';
});
test('Lychee Mistblade: Combo gives another minion Elusive until your next turn', () => {
  const a = blank(0, 1, 5);
  play(0, give(0, 'healing_peach'));
  play(0, give(0, 'lychee_mistblade'));
  if (!hasKeyword(a, 'Elusive')) return 'no Elusive';
});
test('Starfruit Timecutter returns another friendly minion costing 1 less', () => {
  const g = put(0, 'melon_guard');
  play(0, give(0, 'starfruit_timecutter'), g.uid);
  const inst = pl(0).hand.find((c) => c.cardId === 'melon_guard');
  if (!inst || costOf(s, inst) !== 1) return 'not returned at 1 less';
});
test('Grand Orchard Sensei: Fruits cost 1 less (never below 0); other cards do not', () => {
  put(0, 'grand_orchard_sensei');
  const lemon = give(0, 'thunder_lemon');
  const melon = give(0, 'titan_watermelon');
  const guard = give(0, 'melon_guard');
  if (costOf(s, lemon) !== 0 || costOf(s, melon) !== 1 || costOf(s, guard) !== 2) return `${costOf(s, lemon)} ${costOf(s, melon)} ${costOf(s, guard)}`;
});

// ---- Spells ----
test('Lightning-Fast Julienne: Slice a Fruit and +1 Attack this turn', () => {
  const a = blank(0, 1, 5);
  const f = put(0, 'healing_peach');
  play(0, give(0, 'lightning_fast_julienne'), f.uid, a.uid);
  if (onBoard(0, 'healing_peach').length) return 'not sliced';
  if (effectiveAttack(a) !== 2) return `attack ${effectiveAttack(a)}`;
});
test('Fruitstorm Shuriken: 1 each to three, 2 after a Slice', () => {
  const es = [blank(1, 1, 9), blank(1, 1, 9), blank(1, 1, 9)];
  play(0, give(0, 'fruitstorm_shuriken'));
  if (es.some((e) => lost(e) !== 1)) return es.map(lost).join(',');
  sliceIt(put(0, 'healing_peach'));
  play(0, give(0, 'fruitstorm_shuriken'));
  if (es.some((e) => lost(e) !== 3)) return es.map(lost).join(',');
});
test('Sacred Fruit Offering summons two random Fruits', () => {
  play(0, give(0, 'sacred_fruit_offering'));
  if (fruits(0).length !== 2) return `${fruits(0).length}`;
});
test('Precision Fruitcut: Slice and draw', () => {
  const f = put(0, 'healing_peach');
  const before = pl(0).hand.length;
  play(0, give(0, 'precision_fruitcut'), f.uid);
  if (pl(0).hand.length !== before + 1 - 1 + 1) return `hand ${pl(0).hand.length}`;
  if (onBoard(0, 'healing_peach').length) return 'not sliced';
});
test('Precision Fruitcut cannot be cast without a Fruit', () => {
  const inst = give(0, 'precision_fruitcut');
  if (getLegalActions(s).some((a) => a.type === 'play' && a.card === inst.uid)) return 'castable';
});
test('Blender Barrage slices up to three Fruits, 1 damage to a random enemy for each', () => {
  for (let i = 0; i < 4; i++) put(0, 'healing_peach');
  const h = hero(1).health;
  play(0, give(0, 'blender_barrage'));
  if (fruits(0).filter((f) => f.health > 0 && !f.destroyed).length !== 1) return `${fruits(0).length} Fruits left`;
  if (h - hero(1).health !== 3) return `enemy Hero lost ${h - hero(1).health}`;
});
test('The Thousand Cuts: 3, plus 3 more per Fruit Sliced this turn (up to 3)', () => {
  const e = blank(1, 1, 30);
  sliceIt(put(0, 'healing_peach'));
  sliceIt(put(0, 'healing_peach'));
  play(0, give(0, 'the_thousand_cuts'), e.uid);
  if (lost(e) !== 9) return `lost ${lost(e)}`;
});
test('Counter-Slice: when an enemy attacks, Slice a Fruit and +0/+2 to the defender', () => {
  const d = blank(0, 0, 3);
  put(0, 'healing_peach');
  give(0, 'counter_slice');
  endTurn();
  const a = blank(1, 4, 5);
  attack(1, a.uid, d.uid, (acts) => acts.find((x) => x.type === 'quickPlay'));
  if (d.health <= 0 || d.destroyed) return 'the defender died';
  if (fruits(0).some((f) => f.health > 0 && !f.destroyed)) return 'no Fruit sliced';
});
test('Peel and Vanish returns an attacked minion to hand, 1 cheaper', () => {
  const d = put(0, 'melon_guard');
  give(0, 'peel_and_vanish');
  endTurn();
  const a = blank(1, 4, 5);
  attack(1, a.uid, d.uid, (acts) => acts.find((x) => x.type === 'quickPlay'));
  const inst = pl(0).hand.find((c) => c.cardId === 'melon_guard');
  if (!inst || costOf(s, inst) !== 1) return 'not returned';
  if (lost(a) !== 0) return 'the attacker was hit back';
});
test('Perfect Dice: +0/+2 this turn, and Evade with a Fruit', () => {
  const a = blank(0, 1, 2);
  put(0, 'healing_peach');
  play(0, give(0, 'perfect_dice'), a.uid);
  if (a.health !== 4 || !hasKeyword(a, 'Evade')) return `${a.health} ${hasKeyword(a, 'Evade')}`;
});
test('Hidden Orchard Ambush: an enemy summon brings out a 2/2 Rush Shinobi', () => {
  play(0, give(0, 'hidden_orchard_ambush'));
  endTurn();
  play(1, give(1, 'vampire_gargoyle'));
  if (!onBoard(0, 'orchard_shinobi').length) return 'no Shinobi';
});

// ---- Legendaries ----
test('Kenzaru: Multislice (3), 2 damage to a random enemy each', () => {
  put(0, 'healing_peach'); put(0, 'healing_peach');
  const h = hero(1).health;
  play(0, give(0, 'kenzaru_the_thousand_slice_master'));
  if (fruits(0).some((f) => f.health > 0 && !f.destroyed)) return 'Fruit left';
  if (h - hero(1).health !== 4) return `enemy Hero lost ${h - hero(1).health}`;
});
test('Miyori: the first Slice each turn gives your other minions +1/+1', () => {
  put(0, 'miyori_the_blossom_blade');
  const a = blank(0, 1, 1);
  sliceIt(put(0, 'healing_peach'));
  sliceIt(put(0, 'healing_peach'));
  if (a.attack !== 2 || a.maxHealth !== 2) return `${a.attack}/${a.maxHealth}`;
});
test('Raiketsu: Slice a Fruit and attack twice this turn', () => {
  const f = put(0, 'healing_peach');
  play(0, give(0, 'raiketsu_the_citrus_thunder'), f.uid);
  const r = onBoard(0, 'raiketsu_the_citrus_thunder')[0];
  const [e1, e2] = [blank(1, 0, 30), blank(1, 0, 30)];
  attack(0, r.uid, e1.uid);
  attack(0, r.uid, e2.uid);
  if (lost(e1) !== 6 || lost(e2) !== 6) return `${lost(e1)} ${lost(e2)}`;
});
test('Shizuka summons two stealthy Phantom Shinobi', () => {
  play(0, give(0, 'shizuka_the_phantom_orchard'));
  if (onBoard(0, 'phantom_shinobi').length !== 2) return `${onBoard(0, 'phantom_shinobi').length}`;
});
test('Emperor Pomelo: three Fruits, and the next three Slices work twice', () => {
  const e = blank(1, 1, 30);
  play(0, give(0, 'emperor_pomelo_the_forbidden_harvest'));
  if (fruits(0).length !== 3) return `${fruits(0).length} Fruits`;
  for (const f of fruits(0)) f.cardId = 'thunder_lemon'; // known Fruits for the count
  run({ op: 'multislice', count: 3 });
  sliceIt(put(0, 'thunder_lemon'));
  if (lost(e) !== 14) return `lost ${lost(e)} (want 3x4 + 2)`;
});

// ---- Weapons ----
test('Murakiri: after your Hero attacks, Slice your leftmost Fruit', () => {
  play(0, give(0, 'murakiri_the_forbidden_edge'));
  put(0, 'healing_peach');
  attack(0, hero(0).uid, hero(1).uid);
  if (fruits(0).some((f) => f.health > 0 && !f.destroyed)) return 'not sliced';
});
test("Raijin's Fang: slicing a Thunder Lemon also deals 2 to a random enemy minion", () => {
  play(0, give(0, 'raijins_fang'));
  put(0, 'thunder_lemon');
  const e = blank(1, 0, 30);
  attack(0, hero(0).uid, hero(1).uid);
  if (lost(e) !== 4) return `lost ${lost(e)}`;
});
test('The Eightfold Harvest pings a random enemy minion after each Hero attack', () => {
  play(0, give(0, 'the_eightfold_harvest'));
  const e = blank(1, 0, 30);
  attack(0, hero(0).uid, hero(1).uid);
  if (lost(e) !== 1) return `lost ${lost(e)}`;
});
test('Kagehana: your Hero is in Stealth until your next turn (cannot be attacked or targeted)', () => {
  play(0, give(0, 'kagehana_the_silent_bloom'));
  attack(0, hero(0).uid, hero(1).uid);
  endTurn();
  if (attackTargets(s, 1).includes(hero(0).uid)) return 'the Hero can still be attacked';
  endTurn();
  if (hasKeyword(hero(0), 'Stealth')) return 'still in Stealth on your turn';
});
test('Kusanagi no Kajitsu: Multislice (2) after each Hero attack', () => {
  play(0, give(0, 'kusanagi_no_kajitsu_the_divine_harvest'));
  put(0, 'healing_peach'); put(0, 'healing_peach'); put(0, 'healing_peach');
  attack(0, hero(0).uid, hero(1).uid);
  if (fruits(0).filter((f) => f.health > 0 && !f.destroyed).length !== 1) return 'did not slice two';
});


// ---- Fusion Hero Spells ----
const FUSION_PARTNERS = ['Acidic', 'Aliens', 'Bees', 'Demons', 'Dinosaurs', 'Divine', 'Dragons', 'Eels', 'Fungus', 'Ghosts', 'Ice Age',
  'Lycanthropes', 'Monster Hunter', 'Plants', 'Radioactive', 'Robots', 'Sharks', 'Ultraterrestrials', 'Vampires', 'Void', 'Witches', 'Zombies'];
test('A Fusion Hero Spell for every one of the 22 partners, each cast cleanly', () => {
  for (const partner of FUSION_PARTNERS) {
    fresh(partner);
    const f = fusionFor(['Fruit Ninjas', partner]);
    if (!f || !f.fusion.includes('Fruit Ninjas')) return `no fusion with ${partner}`;
    blank(0, 1, 5); blank(1, 2, 6); blank(1, 2, 6);
    const fruit = put(0, 'healing_peach');
    pl(0).fusion.charge = 3;
    const act = getLegalActions(s).find((a) => a.type === 'heroSpell' && a.card === f.id);
    if (!act) return `${f.name} not castable`;
    applyAction(s, f.target ? { ...act, target: fruit.uid } : act);
    settle();
    if (f.target && fruit.health > 0 && !fruit.destroyed) return `${f.name} did not Slice`;
    if (!f.target && !fruits(0).some((m) => m.uid !== fruit.uid)) return `${f.name} summoned no Fruit`;
  }
});
test('Swarming Harvest: slicing that Fruit also summons a Worker Bee', () => {
  fresh('Bees');
  run({ op: 'summon', pool: ['healing_peach'] });
  run({ op: 'addSliceEffect', target: { uid: fruits(0)[0].uid }, effects: [{ op: 'summon', cardId: 'worker_bee' }] });
  sliceIt(fruits(0)[0]);
  if (!onBoard(0, 'worker_bee').length) return 'no Bee';
}, 'Bees');
test('Rotten Harvest: the Fruit leaves a 1/2 Zombie when it dies', () => {
  const f = put(0, 'healing_peach');
  run({ op: 'grantTrigger', target: { uid: f.uid }, trigger: { on: 'deathrattle', effects: [{ op: 'summon', cardId: 'zombie', health: 2 }] } });
  sliceIt(f);
  const z = onBoard(0, 'zombie')[0];
  if (!z || z.health !== 2) return 'no 1/2 Zombie';
});

// ---- Whole games ----
test('Quick games with Fruit Ninjas (alone, with a partner, and with Sensei/Pomelo in) finish without errors', () => {
  for (let seed = 1; seed <= 8; seed++) {
    const fa = seed % 2 ? ['Fruit Ninjas'] : ['Fruit Ninjas', ['Zombies', 'Sharks', 'Witches', 'Eels'][seed % 4]];
    const fb = seed % 2 ? ['Dragons'] : ['Aliens', 'Robots'];
    // The expansion cards play too: swap the whole pool in over the games.
    const pool = FACTION_POOLS['Fruit Ninjas'];
    const lineups = { 'Fruit Ninjas': seed > 4 ? pool.slice(20, 50) : pool.slice(0, 30) };
    const g = createGame({ seed, rules: { mulligan: false }, players: [{ name: 'A', factions: fa, deck: buildDeck(fa, null, lineups) }, { name: 'B', factions: fb, deck: buildDeck(fb) }] });
    let steps = 0;
    while (!g.gameOver && steps++ < 4000) {
      const acts = getLegalActions(g);
      if (!acts.length) break;
      const pick = acts.find((a) => a.type === 'attack') ?? acts.find((a) => a.type === 'play' || a.type === 'heroSpell' || a.type === 'quickPlay') ?? acts.find((a) => a.type === 'endTurn') ?? acts[0];
      applyAction(g, pick);
    }
    if (!g.gameOver) return `seed ${seed} did not finish`;
  }
});

console.log(`\n${passed} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
