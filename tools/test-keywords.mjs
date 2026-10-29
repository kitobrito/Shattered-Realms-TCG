// Keyword rules: every core keyword and status checked against its description in KEYWORD_TEXT (rules.js).
// Each test sets up a small board and runs the real engine.   node tools/test-keywords.mjs

import { buildDeck } from '../src/cards/index.js';
import { addToHand, costOf, dealDamage, effectiveAttack, hasKeyword, heal, radiationOf, summonMinion } from '../src/engine/core.js';
import { applyAction, attackTargets, createGame, getLegalActions } from '../src/engine/engine.js';
import { resolveEffect } from '../src/engine/effects.js';
import { getCard } from '../src/engine/registry.js';

let s;
let failures = 0;
let passed = 0;

// Player 0 runs Vampires (+ partner); player 1 runs foe.
function fresh(partner = 'Dragons', foe = ['Divine', 'Robots']) {
  const fa = ['Vampires', partner];
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
const resolve = (effect, controller = 0) => { resolveEffect(s, effect, { controller, self: pl(controller).hero.uid }); settle(); };
// A blank minion with exactly these stats and keywords (a stripped Vampire Gargoyle).
const blank = (p, atk, hp, kws = []) => { const m = put(p, 'vampire_gargoyle'); m.keywords = [...kws]; m.attack = atk; m.health = hp; m.maxHealth = hp; return m; };
const canAttackWith = (m) => getLegalActions(s).some((a) => a.type === 'attack' && a.attacker === m.uid);
const canAttackTarget = (m, t) => getLegalActions(s).some((a) => a.type === 'attack' && a.attacker === m.uid && a.defender === t.uid);
const canTarget = (inst, t) => getLegalActions(s).some((a) => a.type === 'play' && a.card === inst.uid && a.target === t.uid);
const alive = (m) => s.players.some((x) => x.board.includes(m)) && m.health > 0 && !m.destroyed;
const hp = (p) => pl(p).hero.health;
const turnTo = (p) => { while (s.activePlayer !== p) endTurn(); };
const fullRound = () => { endTurn(); endTurn(); };

// ---- Taunt ----
test('Taunt: enemies must attack the Taunt first (minions and Hero)', () => {
  const t = blank(1, 1, 5, ['Taunt']); const other = blank(1, 1, 5);
  const a = blank(0, 2, 5);
  if (canAttackTarget(a, other) || canAttackTarget(a, pl(1).hero)) return 'could attack past the Taunt';
  if (!canAttackTarget(a, t)) return 'could not attack the Taunt';
});
test('Taunt: a Taunt in Stealth does not count', () => {
  blank(1, 1, 5, ['Taunt', 'Stealth']); const a = blank(0, 2, 5);
  if (!canAttackTarget(a, pl(1).hero)) return 'stealthed Taunt still blocked the Hero';
});
// ---- Stealth ----
test("Stealth: can't be attacked or targeted by enemies; lost when it attacks", () => {
  const st = blank(1, 1, 5, ['Stealth']); const a = blank(0, 2, 5);
  if (canAttackTarget(a, st)) return 'could attack a Stealth minion';
  if (canTarget(give(0, 'vampire_bite'), st)) return 'enemy spell could target a Stealth minion';
  endTurn();
  attack(1, st.uid, pl(0).hero.uid);
  if (hasKeyword(st, 'Stealth')) return 'Stealth stayed after attacking';
});
test('Stealth: its owner can still target it', () => {
  const st = blank(0, 1, 5, ['Stealth']);
  if (!canTarget(give(0, 'blood_shield') , st) && !canTarget(give(0, 'unholy_empowerment'), st)) {
    // Use a friendly-target spell from the deck pool if those aren't single-target.
    const ok = getLegalActions(s).some((a) => a.type === 'heroSpell' && a.target === st.uid);
    if (!ok) return 'owner could not target its own Stealth minion';
  }
});
// ---- Lifesteal ----
test('Lifesteal: damage it deals heals its Hero (attacking and defending)', () => {
  pl(0).hero.health = 20;
  const ls = blank(0, 3, 9, ['Lifesteal']); const foe = blank(1, 2, 9);
  attack(0, ls.uid, foe.uid);
  if (hp(0) !== 23) return `after attacking: ${hp(0)}`;
  endTurn();
  attack(1, foe.uid, ls.uid);
  if (hp(0) !== 26) return `after defending: ${hp(0)}`;
});
// ---- Evade ----
test('Evade: the first damage does nothing, the second lands', () => {
  const e = blank(0, 1, 5, ['Evade']);
  dealDamage(s, pl(1).hero.uid, e.uid, 3); settle();
  if (e.health !== 5 || hasKeyword(e, 'Evade')) return `first hit: hp ${e.health} evade ${hasKeyword(e, 'Evade')}`;
  dealDamage(s, pl(1).hero.uid, e.uid, 3); settle();
  if (e.health !== 2) return `second hit: hp ${e.health}`;
});
// ---- Elusive ----
test("Elusive: can't be targeted by enemy spells, but can be attacked", () => {
  const el = blank(1, 1, 5, ['Elusive']); const a = blank(0, 2, 5);
  if (canTarget(give(0, 'vampire_bite'), el)) return 'enemy spell targeted an Elusive minion';
  if (!canAttackTarget(a, el)) return 'could not attack an Elusive minion';
});
// ---- Spell Ward ----
test('Spell Ward: the next enemy spell has no effect on it, then the Ward is gone', () => {
  const w = blank(1, 1, 9, ['Spell Ward']);
  play(0, give(0, 'vampire_bite'), w.uid);
  if (w.health !== 9) return `first spell hit: hp ${w.health}`;
  if (hasKeyword(w, 'Spell Ward')) return 'Ward still there after blocking';
  play(0, give(0, 'vampire_bite'), w.uid);
  if (w.health !== 6) return `second spell: hp ${w.health}`;
});
// ---- Poisonous ----
test('Poisonous: when it dies, the enemy that killed it dies too', () => {
  const p = blank(1, 1, 1, ['Poisonous']); const a = blank(0, 5, 9);
  attack(0, a.uid, p.uid);
  if (alive(p)) return 'Poisonous minion survived';
  if (alive(a)) return 'its killer survived';
});
// ---- Venomous ----
test('Venomous: kills any enemy minion it attacks', () => {
  const v = blank(0, 1, 9, ['Venomous']); const big = blank(1, 2, 20);
  attack(0, v.uid, big.uid);
  if (alive(big)) return `target survived with ${big.health}`;
});
// ---- Rage ----
test('Rage: takes damage and survives → +1 Attack', () => {
  const r = blank(0, 2, 9, ['Rage']);
  dealDamage(s, pl(1).hero.uid, r.uid, 2); settle();
  if (effectiveAttack(r) !== 3) return `attack ${effectiveAttack(r)}`;
});
// ---- Devour ----
test('Devour: destroys an enemy minion → +1/+1', () => {
  const d = blank(0, 4, 9, ['Devour']); const f = blank(1, 1, 2);
  attack(0, d.uid, f.uid);
  if (effectiveAttack(d) !== 5 || d.maxHealth !== 10) return `${effectiveAttack(d)}/${d.maxHealth}`;
});
// ---- Charge / Rush ----
test('Charge: can attack the Hero the turn it is played', () => {
  const c = summonMinion(s, 0, 'vampire_gargoyle'); c.keywords = ['Charge']; c.attack = 2;
  if (!canAttackTarget(c, pl(1).hero)) return 'Charge could not attack the Hero';
});
test('Rush: can attack minions, not the Hero, the turn it is played', () => {
  const f = blank(1, 1, 5);
  const r = summonMinion(s, 0, 'vampire_gargoyle'); r.keywords = ['Rush']; r.attack = 2;
  if (canAttackTarget(r, pl(1).hero)) return 'Rush could attack the Hero';
  if (!canAttackTarget(r, f)) return 'Rush could not attack a minion';
});
// ---- Twin Strike ----
test('Twin Strike: two attacks a turn, not three', () => {
  const t = blank(0, 1, 9, ['Twin Strike']);
  attack(0, t.uid, pl(1).hero.uid);
  if (!canAttackWith(t)) return 'no second attack';
  attack(0, t.uid, pl(1).hero.uid);
  if (canAttackWith(t)) return 'a third attack';
});
// ---- Reborn ----
test('Reborn: comes back once with 1 Health, not twice', () => {
  const r = put(1, 'vampire_gargoyle'); r.keywords = ['Reborn'];
  play(0, give(0, 'vampire_bite'), r.uid); play(0, give(0, 'vampire_bite'), r.uid);
  const back = pl(1).board.find((m) => m.cardId === 'vampire_gargoyle');
  if (!back || back.uid === r.uid || back.health !== 1) return `came back: ${back?.health} same ${back?.uid === r.uid}`;
  play(0, give(0, 'vampire_bite'), back.uid);
  if (pl(1).board.some((m) => m.cardId === 'vampire_gargoyle')) return 'came back a second time';
});
// ---- Overheal ----
test('Overheal: healing at full Health raises maximum Health', () => {
  const m = blank(0, 1, 5);
  heal(s, m.uid, 3, { overheal: true });
  if (m.maxHealth !== 8 || m.health !== 8) return `${m.health}/${m.maxHealth}`;
  heal(s, m.uid, 3);
  if (m.maxHealth !== 8) return 'plain heal raised max Health';
});
// ---- Silenced ----
test('Silenced: all its other keywords are removed', () => {
  const m = blank(1, 1, 5, ['Taunt', 'Lifesteal', 'Evade']);
  resolve({ op: 'buff', target: { uid: m.uid }, keywords: ['Silenced'] });
  const left = m.keywords.filter((k) => k !== 'Silenced');
  if (left.length || !hasKeyword(m, 'Silenced')) return `left: ${left}`;
});
// ---- Frozen ----
test("Frozen: can't attack; thaws after missing its controller's next turn", () => {
  const m = blank(0, 2, 5);
  endTurn(); // enemy turn: they freeze it
  resolve({ op: 'buff', target: { uid: m.uid }, keywords: ['Frozen'] }, 1);
  endTurn(); // my turn
  if (canAttackWith(m)) return 'attacked while Frozen';
  endTurn(); endTurn(); // missed that turn; next turn it may attack
  if (hasKeyword(m, 'Frozen') || !canAttackWith(m)) return `still frozen next turn: ${hasKeyword(m, 'Frozen')}`;
});
test('Frozen on my own turn: misses my next turn, then thaws', () => {
  const m = blank(0, 2, 5);
  resolve({ op: 'buff', target: { uid: m.uid }, keywords: ['Frozen'] }, 1);
  fullRound();
  if (canAttackWith(m)) return 'attacked on the next turn';
  fullRound();
  if (!canAttackWith(m)) return 'still frozen a turn later';
});
// ---- Blind ----
test('Blind: its attacks hit a random character, friend or foe', () => {
  const b = blank(0, 1, 50, ['Blind']); const friend = blank(0, 0, 50); blank(1, 0, 50);
  const targets = new Set();
  for (let i = 0; i < 30; i++) {
    b.attacksThisTurn = 0;
    const before = new Map(s.players.flatMap((x) => [x.hero, ...x.board]).map((c) => [c.uid, c.health]));
    attack(0, b.uid, pl(1).hero.uid);
    for (const c of s.players.flatMap((x) => [x.hero, ...x.board])) if (c.health < before.get(c.uid) && c.uid !== b.uid) targets.add(c.uid);
  }
  if (!targets.has(friend.uid) && !targets.has(pl(0).hero.uid)) return 'never hit a friendly character';
  if (targets.size < 3) return `only hit ${targets.size} different characters`;
});
// ---- Recoil ----
test('Recoil: takes half (rounded down) of the damage it deals', () => {
  const r = blank(0, 5, 10, ['Recoil']);
  attack(0, r.uid, pl(1).hero.uid);
  if (r.health !== 8) return `health ${r.health} (wants 8)`;
});
// ---- Burned ----
test("Burned: loses 1 Health at the end of its controller's turn", () => {
  const b = blank(0, 1, 5, ['Burned']);
  endTurn();
  if (b.health !== 4) return `after my turn: ${b.health}`;
  endTurn();
  if (b.health !== 4) return `after their turn: ${b.health}`;
});
// ---- Burn ----
test("Burn: at the end of the burner's turn, takes its value, then the value rises by 1; lasts 2 turns", () => {
  const m = blank(1, 1, 30);
  resolve({ op: 'applyBurn', target: { uid: m.uid }, amount: 2 });
  endTurn();
  if (m.health !== 28) return `first tick: ${m.health}`;
  endTurn(); endTurn();
  if (m.health !== 25) return `second tick: ${m.health}`;
  endTurn(); endTurn();
  if (m.health !== 25) return `ticked a third time: ${m.health}`;
});
test('Burn: applying more adds to it but does not extend it', () => {
  const m = blank(1, 1, 30);
  resolve({ op: 'applyBurn', target: { uid: m.uid }, amount: 2 });
  resolve({ op: 'applyBurn', target: { uid: m.uid }, amount: 2 });
  if (m.burn !== 4) return `value ${m.burn}`;
});
// ---- Cleanse ----
test('Cleanse: removes Burn, Radiation, Frozen, Burned and Blind', () => {
  const m = blank(0, 1, 30, ['Frozen', 'Burned', 'Blind']);
  resolve({ op: 'applyBurn', target: { uid: m.uid }, amount: 2 }, 1);
  resolve({ op: 'radiate', target: { uid: m.uid }, amount: 1, turns: 2 }, 1);
  resolve({ op: 'cleanse', target: { uid: m.uid } });
  const left = ['Frozen', 'Burned', 'Blind'].filter((k) => hasKeyword(m, k));
  if (left.length || m.burn > 0 || radiationOf(m) > 0) return `left: ${left} burn ${m.burn} rad ${radiationOf(m)}`;
});
// ---- Temporary Health ----
test('Temporary Health: absorbs damage first, then goes away', () => {
  const m = blank(0, 1, 5);
  resolve({ op: 'buff', target: { uid: m.uid }, health: 3, temporaryHealth: true });
  dealDamage(s, pl(1).hero.uid, m.uid, 2); settle();
  if (m.health !== 6) return `after 2 damage: ${m.health}`;
  fullRound();
  if (m.health > 5 || m.maxHealth > 5) return `still has it: ${m.health}/${m.maxHealth}`;
});
// ---- Armor ----
test('Armor: soaks up damage to the Hero first', () => {
  pl(0).hero.armor = 3; const h = hp(0);
  dealDamage(s, pl(1).hero.uid, pl(0).hero.uid, 5); settle();
  if (pl(0).hero.armor !== 0 || hp(0) !== h - 2) return `armor ${pl(0).hero.armor} hp ${hp(0)}`;
});
// ---- Thick Fur / Hardy ----
test("Thick Fur: can't be Frozen", () => {
  const m = blank(0, 1, 5, ['Thick Fur']);
  resolve({ op: 'buff', target: { uid: m.uid }, keywords: ['Frozen'] }, 1);
  if (hasKeyword(m, 'Frozen')) return 'was Frozen';
});
test('Hardy: takes 1 less damage from each hit, never less than 1', () => {
  const m = blank(0, 1, 9, ['Hardy']);
  dealDamage(s, pl(1).hero.uid, m.uid, 3); settle();
  if (m.health !== 7) return `3 dmg → ${9 - m.health}`;
  dealDamage(s, pl(1).hero.uid, m.uid, 1); settle();
  if (m.health !== 6) return `1 dmg → ${7 - m.health}`;
});
// ---- Radiation ----
test('Radiation: lowers the Health of every other character without Radiation; they can\'t be healed', () => {
  const src = blank(1, 1, 5); const a = blank(0, 1, 5); const b = blank(1, 1, 5);
  const heroBefore = hp(0);
  play(0, give(0, 'radiation_leak'), src.uid);
  if (a.health !== 4 || b.health !== 4 || src.health !== 5) return `a ${a.health} b ${b.health} src ${src.health}`;
  if (hp(0) !== heroBefore - 1) return `hero ${heroBefore} → ${hp(0)}`;
  heal(s, a.uid, 3);
  if (a.health !== 4) return `healed through Radiation: ${a.health}`;
});

// ---- Interactions ----
test('Poisonous killed by a spell: nothing else dies (no enemy minion killed it)', () => {
  const p = blank(1, 1, 1, ['Poisonous']); const mine = blank(0, 2, 5); const h = hp(0);
  play(0, give(0, 'vampire_bite'), p.uid);
  if (alive(p)) return 'still alive';
  if (!alive(mine) || hp(0) <= 0) return 'something of mine died';
});
test('Poisonous vs a Hero attacker: the Hero does not die', () => {
  const p = blank(1, 1, 1, ['Poisonous']); pl(0).hero.attack = 3;
  attack(0, pl(0).hero.uid, p.uid);
  if (alive(p)) return 'minion survived';
  if (s.gameOver) return 'the game ended';
});
test('Venomous attacking the Hero only deals its Attack', () => {
  const v = blank(0, 2, 5, ['Venomous']); const h = hp(1);
  attack(0, v.uid, pl(1).hero.uid);
  if (hp(1) !== h - 2) return `hero ${h} → ${hp(1)}`;
});
test('Venomous defending: per its text it only kills what it attacks', () => {
  const v = blank(1, 1, 9, ['Venomous']); const a = blank(0, 2, 20);
  attack(0, a.uid, v.uid);
  if (!alive(a)) return 'the attacker died to a defending Venomous minion';
});
test('Evade blocks a Venomous attack (no damage, no kill)', () => {
  const v = blank(0, 1, 9, ['Venomous']); const e = blank(1, 1, 9, ['Evade']);
  attack(0, v.uid, e.uid);
  if (!alive(e)) return 'Evade minion died';
  if (hasKeyword(e, 'Evade')) return 'Evade not used up';
});
test('Lifesteal into Evade heals nothing', () => {
  pl(0).hero.health = 20;
  const ls = blank(0, 3, 9, ['Lifesteal']); const e = blank(1, 0, 9, ['Evade']);
  attack(0, ls.uid, e.uid);
  if (hp(0) !== 20) return `healed to ${hp(0)}`;
});
test('Lifesteal into Hardy heals what was actually dealt', () => {
  pl(0).hero.health = 20;
  const ls = blank(0, 3, 9, ['Lifesteal']); const h = blank(1, 0, 9, ['Hardy']);
  attack(0, ls.uid, h.uid);
  if (hp(0) !== 22) return `healed to ${hp(0)} (wants 22)`;
});
test('Rage: no growth when Evade blocks the hit', () => {
  const r = blank(0, 2, 9, ['Rage', 'Evade']);
  dealDamage(s, pl(1).hero.uid, r.uid, 2); settle();
  if (effectiveAttack(r) !== 2) return `attack ${effectiveAttack(r)}`;
});
test('Recoil into Evade: no damage dealt, no recoil', () => {
  const r = blank(0, 6, 10, ['Recoil']); const e = blank(1, 0, 9, ['Evade']);
  attack(0, r.uid, e.uid);
  if (r.health !== 10) return `health ${r.health}`;
});
test('Silence removes Reborn: it does not come back', () => {
  const r = blank(1, 1, 3, ['Reborn']);
  resolve({ op: 'buff', target: { uid: r.uid }, keywords: ['Silenced'] });
  play(0, give(0, 'vampire_bite'), r.uid);
  if (pl(1).board.length) return 'came back';
});
test('Stealth and Elusive minions still take board-wide damage', () => {
  const a = blank(1, 1, 5, ['Stealth']); const b = blank(1, 1, 5, ['Elusive']);
  resolve({ op: 'damage', target: { minions: { side: 'enemy' } }, amount: 2 });
  if (a.health !== 3 || b.health !== 3) return `${a.health} ${b.health}`;
});
test('Elusive: enemy minion Arrivals can still target it (only spells are blocked)', () => {
  const e = blank(1, 1, 5, ['Elusive']);
  const spear = give(0, 'neanderthal_spearman');
  if (!canTarget(spear, e)) return 'Arrival could not target an Elusive minion';
}, 'Ice Age');
test('Spell Ward blocks a board-wide enemy spell too, once', () => {
  const w = blank(1, 1, 9, ['Spell Ward']); const o = blank(1, 1, 9);
  play(0, give(0, 'scorching_breath'));
  if (w.health !== 9 || o.health !== 8) return `ward ${w.health} other ${o.health}`;
});
test('Frozen Twin Strike minion: no attacks at all', () => {
  const t = blank(0, 1, 9, ['Twin Strike', 'Frozen']);
  if (canAttackWith(t)) return 'attacked while Frozen';
});
test('Thick Fur also stops Freeze effects from spells', () => {
  const m = blank(1, 1, 9, ['Thick Fur']);
  play(0, give(0, 'thin_ice'));
  resolve({ op: 'buff', target: { minions: { side: 'enemy' } }, keywords: ['Frozen'] });
  if (hasKeyword(m, 'Frozen')) return 'was Frozen';
});
test('Charge lost to Silence: a just-played minion can no longer attack', () => {
  const c = summonMinion(s, 0, 'vampire_gargoyle'); c.keywords = ['Charge']; c.attack = 2;
  resolve({ op: 'buff', target: { uid: c.uid }, keywords: ['Silenced'] }, 1);
  if (canAttackWith(c)) return 'still attacked';
});
test('Taunt behind an Evade Taunt: both still count as Taunts', () => {
  const t1 = blank(1, 1, 5, ['Taunt', 'Evade']); blank(1, 1, 5);
  const a = blank(0, 2, 5);
  if (!canAttackTarget(a, t1) || canAttackTarget(a, pl(1).hero)) return 'Taunt rules broken with Evade';
});
test('Divine Hardy + Armor: Hero Armor still soaks before Health', () => {
  pl(0).hero.armor = 2; const h = hp(0);
  dealDamage(s, pl(1).hero.uid, pl(0).hero.uid, 1); settle();
  if (pl(0).hero.armor !== 1 || hp(0) !== h) return `armor ${pl(0).hero.armor} hp ${hp(0)}`;
});

// ---- Realm statuses ----
test("Corrosion: lowers Attack (never Health); at 0 Attack it can't attack", () => {
  const m = blank(0, 3, 5);
  resolve({ op: 'corrode', target: { uid: m.uid }, amount: 2 }, 1);
  if (effectiveAttack(m) !== 1 || m.health !== 5) return `${effectiveAttack(m)}/${m.health}`;
  resolve({ op: 'corrode', target: { uid: m.uid }, amount: 2 }, 1);
  if (effectiveAttack(m) !== 0 || canAttackWith(m)) return `attack ${effectiveAttack(m)}, can attack ${canAttackWith(m)}`;
});
test('Corrosion: a minion that leaves play and comes back is fresh', () => {
  const m = put(0, 'vampire_gargoyle');
  resolve({ op: 'corrode', target: { uid: m.uid }, amount: 2 }, 1);
  resolve({ op: 'returnToHand', target: { uid: m.uid } }, 1);
  const inst = pl(0).hand.find((h) => h.cardId === 'vampire_gargoyle');
  play(0, inst);
  const back = find(0, 'vampire_gargoyle');
  if (!back || effectiveAttack(back) !== getCard('vampire_gargoyle').attack) return `came back with ${back && effectiveAttack(back)}`;
});
test('Marked Prey: lasts until healed above 3 Health', () => {
  const m = blank(1, 1, 6); m.health = 3;
  resolve({ op: 'markPrey', target: { uid: m.uid } });
  if (!m.prey) return 'not marked';
  heal(s, m.uid, 2); settle(); endTurn();
  if (m.prey) return 'still Prey at 5 Health';
});
test('Displace: gone from the board, frees its space, comes back at the start of the named turn', () => {
  const m = blank(1, 2, 5); const a = blank(0, 3, 5);
  resolve({ op: 'displace', target: { uid: m.uid } });
  if (pl(1).board.includes(m)) return 'still on the board';
  if (canAttackTarget(a, m)) return 'could be attacked';
  endTurn();
  if (pl(1).board.some((x) => x.uid === m.uid)) return 'came back on their turn (should wait for mine)';
  endTurn();
  if (!pl(1).board.some((x) => x.uid === m.uid)) return 'did not come back at the start of my next turn';
});
test('Holy Flame: end of my turn, double damage to a Dark minion, then burns down; blocks healing', () => {
  const m = blank(1, 1, 20); // a Vampire: Dark
  resolve({ op: 'holyFlame', target: { uid: m.uid }, amount: 2 });
  heal(s, m.uid, 5);
  endTurn();
  if (m.health !== 16) return `after the first burn: ${m.health} (wants 16)`;
  if (m.holyFlame !== 1) return `flame ${m.holyFlame}`;
});
test('Reduced to Ash: dies in Holy Flame → no Graveyard, no Reborn', () => {
  const m = blank(1, 1, 2, ['Reborn']);
  resolve({ op: 'holyFlame', target: { uid: m.uid }, amount: 3 });
  endTurn();
  if (pl(1).board.length) return 'came back';
  if (pl(1).graveyard.some((g) => g.uid === m.uid)) return 'went to the Graveyard';
});
test('Burrow: Stealth until the start of my next turn, then it Surfaces', () => {
  const m = blank(0, 2, 5); const foe = blank(1, 3, 5);
  resolve({ op: 'burrow', target: { uid: m.uid } });
  endTurn();
  if (canAttackTarget(foe, m)) return 'enemy could attack it while Burrowed';
  endTurn();
  if (m.burrowed || hasKeyword(m, 'Stealth')) return 'did not Surface';
});
test('Burrow: a Burrowed minion that attacks Surfaces and leaves Stealth', () => {
  const m = blank(0, 2, 5);
  resolve({ op: 'burrow', target: { uid: m.uid } });
  attack(0, m.uid, pl(1).hero.uid);
  if (m.burrowed || hasKeyword(m, 'Stealth')) return `burrowed ${m.burrowed} stealth ${hasKeyword(m, 'Stealth')}`;
});
test('Implant: when the host dies a Chestburster bursts out on the Implanter\'s side, and Evolves after 2 of my turns', () => {
  const host = blank(1, 1, 2);
  resolve({ op: 'implant', target: { uid: host.uid } });
  play(0, give(0, 'vampire_bite'), host.uid);
  const cb = find(0, 'chestburster');
  if (!cb) return 'no Chestburster';
  fullRound(); fullRound();
  const now = pl(0).board.find((x) => x.uid === cb.uid);
  if (!now || now.cardId === 'chestburster') return `did not Evolve: ${now?.cardId}`;
});
test('Infect: when it dies, the Infecter summons a 2/1 Rage Runner with Rush', () => {
  const m = blank(1, 1, 2);
  resolve({ op: 'infect', target: { uid: m.uid } });
  play(0, give(0, 'vampire_bite'), m.uid);
  const r = pl(0).board.find((x) => getCard(x.cardId).name === 'Rage Runner');
  if (!r) return 'no Rage Runner on my side';
  if (r.attack !== 2 || r.health !== 1 || !hasKeyword(r, 'Rush')) return `${r.attack}/${r.health} rush ${hasKeyword(r, 'Rush')}`;
});
test('Mushrooms: drawing the card deals 1 damage per Mushroom on it, then they are gone', () => {
  const top = pl(1).deck[0]; top.mushrooms = 3; const h = hp(1);
  endTurn();
  if (hp(1) !== h - 3) return `hero ${h} → ${hp(1)}`;
  const drawn = pl(1).hand.find((c) => c.uid === top.uid);
  if (drawn?.mushrooms) return 'Mushrooms still on the card';
});
test('Hollow: the bonus is on only while the hand is empty', () => {
  const v = put(0, 'voidling'); const foe = blank(1, 0, 30);
  pl(0).hand = [];
  give(0, 'vampire_bite'); give(0, 'vampire_bite');
  play(0, pl(0).hand[0], foe.uid);
  if (effectiveAttack(v) !== 1) return `one card left: ${effectiveAttack(v)}`;
  play(0, pl(0).hand[0], foe.uid);
  if (effectiveAttack(v) !== 3) return `empty hand: ${effectiveAttack(v)}`;
}, 'Void');

console.log(`\n${passed} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
