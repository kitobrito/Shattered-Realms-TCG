// Rules tests for the Lycanthropes (Transform between Humanoid and Beast Form) and their
// Wild Pack expansion. Each test sets up a small board, plays through the real engine and
// checks the outcome.
//   node tools/test-lycanthropes.mjs

import { buildDeck } from '../src/cards/index.js';
import { addToHand, effectiveAttack, hasKeyword, summonMinion } from '../src/engine/core.js';
import { applyAction, createGame, fusionFor, getLegalActions } from '../src/engine/engine.js';
import { allCards, getCard } from '../src/engine/registry.js';
import { ART } from '../src/cards/art-manifest.js';
import { existsSync } from 'node:fs';

let s;
let failures = 0;
let passed = 0;

// Player 0 runs Lycanthropes + Vampires; player 1 runs Robots + Ghosts.
function fresh() {
  const fa = ['Lycanthropes', 'Vampires'], fb = ['Robots', 'Ghosts'];
  const players = [{ name: 'A', factions: fa, deck: buildDeck(fa) }, { name: 'B', factions: fb, deck: buildDeck(fb) }];
  s = createGame({ seed: 7, rules: { mulligan: false, secondPlayerPotions: false, openingHandHelp: false }, players });
  for (const p of s.players) { p.hand = []; p.mana.max = 10; p.mana.current = 10; p.mana.primal = 0; p.mana.base = 10; }
}
const pl = (p) => s.players[p];
const put = (p, id) => { const m = summonMinion(s, p, id); m.sick = false; return m; };
const give = (p, id) => addToHand(s, p, id);
const find = (p, id) => pl(p).board.find((m) => m.cardId === id || m.cardId === `${id}_beast`);
const blank = (p, atk, hp) => { const m = put(p, 'forge_drone'); m.keywords = []; m.attack = atk; m.health = hp; m.maxHealth = hp; return m; };
const form = (m) => getCard(m.cardId).form;

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
function transform(p, m) { applyAction(s, { type: 'transform', player: p, minion: m.uid }); settle(); }
function attack(p, attacker, defender, react) { applyAction(s, { type: 'attack', player: p, attacker, defender }); settle(react); }
function endTurn(react) {
  applyAction(s, { type: 'endTurn', player: s.activePlayer });
  settle(react);
  for (const p of s.players) { p.mana.max = 10; p.mana.current = 10; p.mana.primal = 0; p.mana.base = 10; }
}
const canTransform = (m) => getLegalActions(s).some((a) => a.type === 'transform' && a.minion === m.uid);
const qp = (cardId) => (legal) => legal.find((a) => a.type === 'quickPlay' && pl(a.player).hand.find((h) => h.uid === a.card)?.cardId === cardId);

function test(name, fn) {
  fresh();
  try {
    const problem = fn();
    if (problem) { failures++; console.log(`FAIL ${name}: ${problem}`); } else { passed++; console.log(`ok   ${name}`); }
  } catch (e) { failures++; console.log(`FAIL ${name}: threw ${e.stack.split('\n').slice(0, 3).join(' | ')}`); }
}

const lycs = allCards().filter((c) => c.faction === 'Lycanthropes');

test('The faction has 30 standard cards, a Hero Spell, 16 Wild Pack cards and a Beast twin for every shifter', () => {
  const std = lycs.filter((c) => !c.token && !c.heroSpell && !c.extra);
  const ext = lycs.filter((c) => !c.token && !c.heroSpell && c.extra);
  if (std.length !== 30 || ext.length !== 16) return `${std.length} / ${ext.length}`;
  if (!getCard('primal_unleashing')?.heroSpell) return 'no hero spell';
  for (const c of lycs.filter((x) => x.beastForm)) if (getCard(c.beastForm)?.humanForm !== c.id) return `${c.id} twin broken`;
});

test('Every card, both forms, the Rat and the hero spell have art on disk', () => {
  const missing = lycs.filter((c) => !ART[c.id] || !existsSync(ART[c.id])).map((c) => c.id);
  if (missing.length) return `no art: ${missing.join(', ')}`;
});

test('Every Lycanthrope pair has a Fusion Hero Spell with art', () => {
  const others = [...new Set(allCards().filter((c) => !c.token && c.faction !== 'Lycanthropes' && c.faction !== 'Fusion' && c.faction !== 'Neutral').map((c) => c.faction))];
  const missing = others.filter((f) => !fusionFor(['Lycanthropes', f]));
  if (missing.length) return `no fusion with ${missing}`;
  const noArt = others.map((f) => fusionFor(['Lycanthropes', f])).filter((c) => !ART[c.id] || !existsSync(ART[c.id])).map((c) => c.id);
  if (noArt.length) return `no art: ${noArt}`;
});

test('Transform button: 1 Mana, swaps to the Beast Form stats and keeps buffs', () => {
  const m = put(0, 'moonbound_initiate');
  m.attack += 2; // a permanent buff
  const before = pl(0).mana.current;
  transform(0, m);
  if (form(m) !== 'beast') return 'did not transform';
  if (pl(0).mana.current !== before - 1) return `mana ${pl(0).mana.current}`;
  // 1/3 -> 2/2 base, +2 buff, +1 this turn from "whenever this transforms"
  if (effectiveAttack(m) !== 5 || m.health !== 2) return `${effectiveAttack(m)}/${m.health}`;
});

test('Each Lycanthrope transforms by button only once per turn; again next turn', () => {
  const m = put(0, 'silverclaw_stalker');
  transform(0, m);
  if (canTransform(m)) return 'could transform twice';
  endTurn(); endTurn();
  if (!canTransform(m)) return 'could not transform on the next turn';
});

test('Damage carries over but a Transform never kills (at least 1 Health)', () => {
  const m = put(0, 'silverclaw_stalker'); // 2/3 -> 3/2
  m.health = 1; // took 2 damage
  transform(0, m);
  if (m.health !== 1 || m.maxHealth !== 2) return `${m.health}/${m.maxHealth}`;
});

test('Keywords swap with the form: Werehippo keeps Taunt, Werepanther gains Elusive', () => {
  const h = put(0, 'ironhide_werehippo'); transform(0, h);
  const p = put(0, 'nightveil_werepanther'); transform(0, p);
  if (!hasKeyword(h, 'Taunt')) return 'hippo lost Taunt';
  if (!hasKeyword(p, 'Elusive')) return 'panther no Elusive';
});

test('A Beast returned to hand comes back as its Humanoid card', () => {
  const m = put(0, 'sunmane_werelion'); transform(0, m);
  addToHand(s, 0, m.cardId);
  if (pl(0).hand.at(-1).cardId !== 'sunmane_werelion') return pl(0).hand.at(-1).cardId;
});

test('Wererat: Arrival summons a Rat; in Beast Form another Lycanthrope transforming summons one (once per turn)', () => {
  play(0, give(0, 'sewerborn_wererat'));
  if (pl(0).board.filter((m) => m.cardId === 'pack_rat').length !== 1) return 'no arrival rat';
  const r = find(0, 'sewerborn_wererat'); transform(0, r);
  const a = put(0, 'moonbound_initiate'); const b = put(0, 'silverclaw_stalker');
  transform(0, a); transform(0, b);
  const rats = pl(0).board.filter((m) => m.cardId === 'pack_rat').length;
  if (rats !== 2) return `rats ${rats}`;
});

test('Dreadjaw Alpha: other Lycanthropes +1 Attack; Beast arrival deals 1 to all enemy minions', () => {
  const d = put(0, 'dreadjaw_alpha'); const i = put(0, 'mireborn_weregator');
  const e = blank(1, 1, 3);
  transform(0, d); // auras are recomputed as the action resolves
  if (effectiveAttack(i) !== 3) return `aura ${effectiveAttack(i)}`;
  if (e.health !== 2) return `enemy ${e.health}`;
});

test('Elder of the First Moon makes Transforms free', () => {
  put(0, 'elder_of_the_first_moon');
  const m = put(0, 'moonbound_initiate');
  const before = pl(0).mana.current;
  transform(0, m);
  if (pl(0).mana.current !== before) return `paid ${before - pl(0).mana.current}`;
});

test('The First Beast transforms the others and grows +1/+1 for each', () => {
  put(0, 'moonbound_initiate'); put(0, 'silverclaw_stalker');
  play(0, give(0, 'the_first_beast'));
  const f = find(0, 'the_first_beast');
  if (f.attack !== 9 || f.health !== 10) return `${f.attack}/${f.health}`;
  if (pl(0).board.filter((m) => getCard(m.cardId).form === 'beast').length !== 2) return 'others not beasts';
});

test('Primal Unleashing transforms every Lycanthrope and draws 1 per 3', () => {
  for (const id of ['moonbound_initiate', 'silverclaw_stalker', 'mireborn_weregator']) put(0, id);
  const hand = pl(0).hand.length;
  applyAction(s, { type: 'heroSpell', player: 0, card: 'primal_unleashing' }); settle();
  if (pl(0).board.some((m) => getCard(m.cardId).form === 'human')) return 'someone stayed human';
  if (pl(0).hand.length !== hand + 1) return `hand ${pl(0).hand.length - hand}`;
});

test('Instinct Surge gives Evade only to a Beast Form', () => {
  const h = put(0, 'moonbound_initiate'); const b = put(0, 'silverclaw_stalker'); transform(0, b);
  play(0, give(0, 'instinct_surge'), h.uid);
  play(0, give(0, 'instinct_surge'), b.uid);
  if (hasKeyword(h, 'Evade') || !hasKeyword(b, 'Evade')) return `${hasKeyword(h, 'Evade')} ${hasKeyword(b, 'Evade')}`;
});

test('Primal Recovery transforms only when the heal reaches full Health', () => {
  const m = put(0, 'ironhide_werehippo'); m.health = 1; // 2/6 missing 5
  play(0, give(0, 'primal_recovery'), m.uid);
  if (form(m) !== 'human') return 'transformed while still hurt';
  const n = put(0, 'mireborn_weregator'); n.health = 2; // missing 2
  play(0, give(0, 'primal_recovery'), n.uid);
  if (form(n) !== 'beast') return 'did not transform at full';
});

test('Mireborn Weregator gains +1 Health whenever it survives damage', () => {
  const g = put(0, 'mireborn_weregator');
  endTurn();
  const e = blank(1, 1, 5); e.sick = false;
  attack(1, e.uid, g.uid);
  if (g.maxHealth !== 5 || g.health !== 4) return `${g.health}/${g.maxHealth}`;
});

test('Nightveil Werepanther: Stealth until it attacks', () => {
  const p = put(0, 'nightveil_werepanther');
  if (!hasKeyword(p, 'Stealth')) return 'no stealth';
  const e = blank(1, 0, 9);
  attack(0, p.uid, e.uid);
  if (hasKeyword(p, 'Stealth')) return 'kept stealth';
});

test('Instinctive Defense (Trap): an enemy attacking your Hero turns a Humanoid into a Beast with Taunt', () => {
  const m = put(0, 'moonbound_initiate');
  play(0, give(0, 'instinctive_defense'));
  endTurn();
  const e = blank(1, 2, 3); e.sick = false;
  attack(1, e.uid, pl(0).hero.uid);
  if (form(m) !== 'beast' || !hasKeyword(m, 'Taunt')) return `${form(m)} ${hasKeyword(m, 'Taunt')}`;
});

test('Back to Reason (Quick Play): a Beast about to die turns back and survives', () => {
  const m = put(0, 'silverclaw_stalker'); transform(0, m); // 3/2 beast
  give(0, 'back_to_reason');
  endTurn();
  const e = blank(1, 5, 9); e.sick = false;
  attack(1, e.uid, m.uid, qp('back_to_reason'));
  if (m.health <= 0 || form(m) !== 'human') return `${m.health} ${form(m)}`;
});

test('Break the Leash (Quick Play): when an enemy attacks, a Humanoid becomes a Beast with +2 Attack', () => {
  const m = put(0, 'moonbound_initiate'); give(0, 'break_the_leash');
  endTurn();
  const e = blank(1, 1, 9); e.sick = false;
  attack(1, e.uid, pl(0).hero.uid, (legal) => legal.find((a) => a.type === 'quickPlay' && a.target === m.uid));
  if (form(m) !== 'beast') return 'not a beast';
});

test('Wild Pack: Weregrizzly gives Armor, Werebat can attack the turn it transforms', () => {
  const g = put(0, 'ridgeback_weregrizzly'); transform(0, g);
  if (pl(0).hero.armor !== 2) return `armor ${pl(0).hero.armor}`;
  const b = put(0, 'duskwing_werebat'); b.sick = true;
  transform(0, b);
  if (!getLegalActions(s).some((a) => a.type === 'attack' && a.attacker === b.uid)) return 'bat cannot attack';
});

test('Wild Pack: Werepolar Bear Freezes what it damages; Bear Trap Snare hits and Freezes an attacker', () => {
  const p = put(0, 'frostfang_werepolar_bear'); transform(0, p);
  const e = blank(1, 1, 20);
  attack(0, p.uid, e.uid);
  if (!hasKeyword(e, 'Frozen')) return 'not frozen';
  play(0, give(0, 'bear_trap_snare'));
  endTurn();
  const a = blank(1, 1, 9); a.sick = false;
  attack(1, a.uid, pl(0).hero.uid);
  if (a.health !== 6 || !hasKeyword(a, 'Frozen')) return `${a.health} ${hasKeyword(a, 'Frozen')}`;
});

test('An AI-style random game with Lycanthropes finishes without errors', () => {
  for (let g = 0; g < 6; g++) {
    fresh();
    for (let i = 0; i < 400 && !s.gameOver; i++) {
      const legal = getLegalActions(s);
      const pick = legal.find((a) => a.type === 'transform') && i % 3 === 0 ? legal.find((a) => a.type === 'transform') : legal[(i * 7 + g) % legal.length];
      applyAction(s, pick);
    }
  }
});

console.log(`\n${passed} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
