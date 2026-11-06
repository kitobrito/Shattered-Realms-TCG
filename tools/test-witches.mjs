// Rules tests for the Witches: Wands (ranged Hero weapons), Silence, Counter, Silence the Hero,
// spell taxes and the Legendary Weapons.
//   node tools/test-witches.mjs

import { existsSync } from 'node:fs';
import { buildDeck, FACTION_DECKS, LEGENDARY } from '../src/cards/index.js';
import { ART, HERO_ART, FUSION_HERO_ART, RAGE_RUNNER_ART, CLICKER_ART } from '../src/cards/art-manifest.js';
import { addToHand, costOf, effectiveAttack, hasKeyword, summonMinion } from '../src/engine/core.js';
import { applyAction, createGame, fusionFor, getLegalActions } from '../src/engine/engine.js';
import { allCards, getCard } from '../src/engine/registry.js';
import { evolveChestburster } from '../src/engine/effects.js';
import { FACTIONS } from '../src/engine/rules.js';

let s;
let failures = 0, passed = 0;

// Player 0 runs Witches + Vampires; player 1 runs Dragons + Robots (lots of spells).
function fresh() {
  const fa = ['Witches', 'Vampires'], fb = ['Dragons', 'Robots'];
  const players = [{ name: 'A', factions: fa, deck: buildDeck(fa) }, { name: 'B', factions: fb, deck: buildDeck(fb) }];
  s = createGame({ seed: 11, rules: { mulligan: false, secondPlayerPotions: false, openingHandHelp: false }, players });
  for (const p of s.players) { p.hand = []; p.mana.max = 10; p.mana.current = 10; p.mana.primal = 0; p.mana.base = 10; }
}
const pl = (p) => s.players[p];
const hero = (p) => pl(p).hero;
const put = (p, id) => { const m = summonMinion(s, p, id); m.sick = false; return m; };
const give = (p, id) => addToHand(s, p, id);
const blank = (p, atk, hp, kws = []) => { const m = put(p, 'vampire_gargoyle'); m.keywords = [...kws]; m.attack = atk; m.health = hp; m.maxHealth = hp; return m; };
const sil = (m) => hasKeyword(m, 'Silenced');
function settle(react = () => null) {
  for (let i = 0; i < 50 && s.pending; i++) {
    if (s.pending.type === 'reaction') applyAction(s, react(getLegalActions(s)) ?? { type: 'pass', player: s.pending.player });
    else if (s.pending.type === 'choice') applyAction(s, { type: 'choose', player: s.pending.player, index: 0 });
    else break;
  }
}
const play = (p, inst, target, react) => { applyAction(s, { type: 'play', player: p, card: inst.uid, ...(target != null ? { target } : {}) }); settle(react); };
const attack = (p, attacker, defender) => { applyAction(s, { type: 'attack', player: p, attacker, defender }); settle(); };
const endTurn = (p) => { applyAction(s, { type: 'endTurn', player: p }); settle(); for (const x of s.players) { x.mana.current = 10; } };
const heroSpell = (p, id, target) => { applyAction(s, { type: 'heroSpell', player: p, card: id, ...(target != null ? { target } : {}) }); settle(); };
const canHeroSpell = (p, id) => getLegalActions(s).some((a) => a.type === 'heroSpell' && a.player === p && a.card === id);
function test(name, fn) {
  fresh();
  try { const r = fn(); if (r) { failures++; console.log(`FAIL ${name}: ${r}`); } else { passed++; console.log(`ok   ${name}`); } }
  catch (e) { failures++; console.log(`FAIL ${name}: ${e.stack.split('\n').slice(0, 3).join(' | ')}`); }
}

// ---- The faction ----
test('Witches: a 30-card deck with 11 minions, 2 Legendary Weapons, 1 Legendary Trap and no legendary minions', () => {
  const deck = FACTION_DECKS.Witches.map(getCard);
  if (deck.length !== 30) return `${deck.length} cards`;
  if (deck.filter((c) => c.type === 'minion').length !== 11) return 'minion count';
  const legends = deck.filter((c) => LEGENDARY.has(c.id));
  const weapons = legends.filter((c) => c.type === 'spell' && c.heroWeapon), traps = legends.filter((c) => c.type === 'trap');
  if (weapons.length !== 2 || traps.length !== 1 || legends.length !== 3) return legends.map((c) => c.id).join(',');
});
test('every Witch card, fusion, hero, fusion hero, back, board, Rage Runner, Clicker and Xeno has art', () => {
  const missing = [];
  for (const c of allCards().filter((x) => x.faction === 'Witches' || x.fusion?.includes('Witches') || x.id === 'xeno_hexmorph')) if (!ART[c.id] || !existsSync(ART[c.id])) missing.push(c.id);
  for (const f of [HERO_ART.Witches, RAGE_RUNNER_ART.Witches, CLICKER_ART.Witches, 'art/backs/witches.jpg', 'art/boards-v2/witches.jpg', 'art/boards-portrait/witches.jpg',
    'art/frames/legendary-spell-witches.webp', 'art/frames/trap-witches.webp']) if (!f || !existsSync(f)) missing.push(f);
  for (const f of FACTIONS.filter((x) => FACTION_DECKS[x]?.length && x !== 'Witches')) {
    const key = [f.toLowerCase().replace(/ /g, '-'), 'witches'].sort().join('-');
    if (!FUSION_HERO_ART[key] || !existsSync(FUSION_HERO_ART[key])) missing.push(`fusion hero ${f}`);
    if (!fusionFor([f, 'Witches'])) missing.push(`fusion spell ${f}`);
  }
  if (missing.length) return missing.join(', ');
});

// ---- Wands ----
test('Wandcraft equips a 1/2 Apprentice Wand; cast again it adds +1 Durability instead', () => {
  heroSpell(0, 'wandcraft');
  const w = hero(0).weapon;
  if (!w || !w.wand || w.attack !== 1 || w.durability !== 2) return JSON.stringify(w);
  pl(0).heroSpells.find((h) => h.cardId === 'wandcraft').uses = 0;
  heroSpell(0, 'wandcraft');
  if (hero(0).weapon.durability !== 3 || hero(0).weapon.attack !== 1) return JSON.stringify(hero(0).weapon);
});
test('A Wand attack takes no damage back and uses 1 Durability', () => {
  heroSpell(0, 'wandcraft');
  const e = blank(1, 5, 4);
  const hp = hero(0).health;
  attack(0, hero(0).uid, e.uid);
  if (e.health !== 3) return `target hp ${e.health}`;
  if (hero(0).health !== hp) return `hero took ${hp - hero(0).health}`;
  if (hero(0).weapon.durability !== 1) return `durability ${hero(0).weapon.durability}`;
});
test('A non-Wand weapon (The Witching Hour Broom) does take damage back, and gives Twin Strike', () => {
  play(0, give(0, 'the_witching_hour_broom'));
  const e = blank(1, 3, 20);
  const hp = hero(0).health;
  attack(0, hero(0).uid, e.uid);
  if (hero(0).health !== hp - 3) return `hero hp ${hp} -> ${hero(0).health}`;
  if (!getLegalActions(s).some((a) => a.type === 'attack' && a.attacker === hero(0).uid)) return 'no second attack';
});
test('The Witching Hour Broom deals 2 to all enemy minions when equipped; Twin Strike leaves with the Broom', () => {
  const a = blank(1, 2, 3, ['Taunt']), b = blank(1, 2, 3);
  play(0, give(0, 'the_witching_hour_broom'));
  if (a.health !== 1 || b.health !== 1) return `${a.health} / ${b.health}`;
  if (sil(a)) return 'still silences';
  heroSpell(0, 'wandcraft');
  if (hasKeyword(hero(0), 'Twin Strike')) return 'Twin Strike stayed after the Broom was replaced';
});
test('Wand of Hushing Silences the minion before the hit lands (Evade is stripped first)', () => {
  play(0, give(0, 'wand_of_hushing'));
  const e = blank(1, 2, 4, ['Evade', 'Taunt']);
  attack(0, hero(0).uid, e.uid);
  if (!sil(e) || e.health !== 3) return `silenced ${sil(e)} hp ${e.health}`;
});
test('Wand of Unmaking destroys a Silenced minion it attacks, but not an un-Silenced one', () => {
  play(0, give(0, 'wand_of_unmaking'));
  const plain = blank(1, 1, 9), quiet = blank(1, 1, 9);
  play(0, give(0, 'silencing_charm'), quiet.uid);
  attack(0, hero(0).uid, plain.uid);
  if (plain.health !== 7 || plain.destroyed) return `plain ${plain.health}`;
  hero(0).attacksThisTurn = 0;
  attack(0, hero(0).uid, quiet.uid);
  if (pl(1).board.includes(quiet)) return 'silenced one survived';
});
test('Cinderthorn Wand: after the Hero attacks, every enemy minion takes 1', () => {
  const a = blank(1, 1, 5), b = blank(1, 1, 5);
  play(0, give(0, 'cinderthorn_wand'));
  attack(0, hero(0).uid, hero(1).uid);
  if (a.health !== 4 || b.health !== 4) return `${a.health} / ${b.health}`;
});
test('Wand of Binding Freezes the minion it hit', () => {
  play(0, give(0, 'wand_of_binding'));
  const e = blank(1, 1, 5);
  attack(0, hero(0).uid, e.uid);
  if (!hasKeyword(e, 'Frozen')) return 'not frozen';
});
test('Coven Sister gives the Wand +1 Attack; Black Cat grows when the Hero attacks with a Wand', () => {
  put(0, 'coven_sister'); const cat = put(0, 'black_cat_familiar');
  heroSpell(0, 'wandcraft');
  if (effectiveAttack(hero(0)) !== 2) return `hero attack ${effectiveAttack(hero(0))}`;
  attack(0, hero(0).uid, hero(1).uid);
  if (cat.attack !== 3) return `cat ${cat.attack}`;
});
test('Vesper: Silences the target first, destroys an already-Silenced one, gains Durability on enemy spells', () => {
  play(0, give(0, 'vesper_the_coven_mothers_wand'));
  const e = blank(1, 1, 9);
  attack(0, hero(0).uid, e.uid);
  if (!sil(e) || e.health !== 6) return `first hit: silenced ${sil(e)} hp ${e.health}`;
  hero(0).attacksThisTurn = 0;
  attack(0, hero(0).uid, e.uid);
  if (pl(1).board.includes(e)) return 'second hit did not destroy';
  const d = hero(0).weapon.durability;
  endTurn(0);
  play(1, give(1, 'fireball'), hero(0).uid);
  if (hero(0).weapon.durability !== d + 1) return `durability ${d} -> ${hero(0).weapon.durability}`;
});

// ---- Counter ----
test('Counter-Hex: the enemy spell is spent and does nothing; the trap is used up', () => {
  play(0, give(0, 'counter_hex')); endTurn(0);
  const hp = hero(0).health;
  play(1, give(1, 'fireball'), hero(0).uid);
  if (hero(0).health !== hp) return `took ${hp - hero(0).health}`;
  if (pl(0).traps.length) return 'trap still set';
  if (pl(1).hand.some((c) => c.cardId === 'fireball')) return 'spell came back';
});
test('Only one Counter fires per spell: a second Counter-Hex waits for the next spell', () => {
  play(0, give(0, 'counter_hex')); play(0, give(0, 'counter_hex')); endTurn(0);
  const hp = hero(0).health;
  play(1, give(1, 'fireball'), hero(0).uid);
  if (pl(0).traps.length !== 1) return `${pl(0).traps.length} traps left after one spell`;
  play(1, give(1, 'fireball'), hero(0).uid);
  if (pl(0).traps.length !== 0 || hero(0).health !== hp) return `traps ${pl(0).traps.length} hp ${hero(0).health}`;
});
test('Hero Spells are not Countered (the trap stays)', () => {
  play(0, give(0, 'counter_hex')); endTurn(0);
  const id = pl(1).heroSpells[0].cardId;
  const opts = getLegalActions(s).filter((a) => a.type === 'heroSpell' && a.card === id);
  if (!opts.length) return 'no hero spell available';
  applyAction(s, opts[0]); settle();
  if (pl(0).traps.length !== 1) return 'countered a hero spell';
});
test('Spell Snare counters only spells that cost (2) or less', () => {
  play(0, give(0, 'spell_snare')); endTurn(0);
  const big = blank(0, 1, 9);
  play(1, give(1, 'dragons_breath'), big.uid); // costs 4
  if (big.health !== 4) return `big spell was stopped (${big.health})`;
  if (pl(0).traps.length !== 1) return 'snare fired on a 4-cost';
  const hp = hero(0).health;
  play(1, give(1, 'fireball'), hero(0).uid);
  if (hero(0).health !== hp || pl(0).traps.length) return 'snare missed a 2-cost';
});
test('Mirror Hex (Legendary): counters and the copy costs (0)', () => {
  play(0, give(0, 'mirror_hex')); endTurn(0);
  play(1, give(1, 'fireball'), hero(0).uid);
  const copy = pl(0).hand.find((c) => c.cardId === 'fireball');
  if (!copy) return 'no copy';
  if (costOf(s, copy) !== 0) return `copy costs ${costOf(s, copy)}`;
  if (!getCard('mirror_hex').legendary) return 'not legendary';
});
test('Nullify (Quick Play) counters a 4+ cost enemy spell, and is not offered for a cheap one', () => {
  endTurn(0);
  const n = give(0, 'nullify');
  let offered = false;
  play(1, give(1, 'fireball'), hero(0).uid, (acts) => { offered ||= acts.some((a) => a.type === 'quickPlay' && a.card === n.uid); return null; });
  if (offered) return 'offered on a 2-cost';
  const m = blank(0, 1, 9);
  play(1, give(1, 'dragons_breath'), m.uid, (acts) => acts.find((a) => a.type === 'quickPlay' && a.card === n.uid) ?? null);
  if (m.health !== 9) return `not countered (${m.health})`;
});

// ---- Silence the Hero, taxes, punishers ----
test('Silence the enemy Hero: no Hero Spell on their next turn, back the turn after', () => {
  play(0, give(0, 'coven_matriarch'));
  endTurn(0);
  const id = pl(1).heroSpells[0].cardId;
  if (canHeroSpell(1, id)) return 'usable on their next turn';
  endTurn(1); endTurn(0);
  if (!canHeroSpell(1, id)) return 'still locked the turn after';
});
test('Tongue-Binding Curse: when they use their Hero Spell, their Hero is Silenced and the Witch draws', () => {
  play(0, give(0, 'tongue_binding_curse')); endTurn(0);
  pl(0).deck.push({ uid: s.nextUid++, cardId: 'academy_initiate', owner: 0 });
  const hand = pl(0).hand.length;
  const act = getLegalActions(s).find((a) => a.type === 'heroSpell' && a.player === 1);
  applyAction(s, act); settle();
  if (pl(0).hand.length !== hand + 1) return 'no draw';
  endTurn(1); endTurn(0);
  if (canHeroSpell(1, act.card)) return 'hero spell not locked next turn';
});
test('Coven Gatekeeper: enemy spell cards cost (1) more; not once it is Silenced', () => {
  const g = put(0, 'coven_gatekeeper');
  const f = give(1, 'fireball');
  if (costOf(s, f) !== 3) return `cost ${costOf(s, f)}`;
  g.keywords = []; g.keywords.push('Silenced');
  if (costOf(s, f) !== 2) return `silenced cost ${costOf(s, f)}`;
});
test('Grim Toll: enemy spell cards cost (2) more on their next turn only', () => {
  play(0, give(0, 'grim_toll'));
  const f = give(1, 'fireball');
  endTurn(0);
  if (costOf(s, f) !== 4) return `next turn ${costOf(s, f)}`;
  endTurn(1); endTurn(0);
  if (costOf(s, f) !== 2) return `turn after ${costOf(s, f)}`;
});
test('Hexbound Prefect: 2 damage to the enemy Hero when they cast a spell card (not a Hero Spell)', () => {
  put(0, 'hexbound_prefect'); endTurn(0);
  const hp = hero(1).health;
  play(1, give(1, 'fireball'), hero(0).uid);
  if (hero(1).health !== hp - 2) return `${hp} -> ${hero(1).health}`;
  const act = getLegalActions(s).find((a) => a.type === 'heroSpell' && a.player === 1);
  if (act) { applyAction(s, act); settle(); if (hero(1).health !== hp - 2) return 'hit on a hero spell'; }
});
test('Grimoire Thief copies the first enemy spell each turn, not the second', () => {
  put(0, 'grimoire_thief'); endTurn(0);
  play(1, give(1, 'fireball'), hero(0).uid);
  play(1, give(1, 'fireball'), hero(0).uid);
  const n = pl(0).hand.filter((c) => c.cardId === 'fireball').length;
  if (n !== 1) return `${n} copies`;
});
test('Backfire Curse: 3 damage to the caster and their Hero is Silenced', () => {
  play(0, give(0, 'backfire_curse')); endTurn(0);
  const hp = hero(1).health;
  play(1, give(1, 'fireball'), hero(0).uid);
  if (hero(1).health !== hp - 3) return `${hp} -> ${hero(1).health}`;
});

// ---- Silence payoffs ----
test('Bayou Bone-Reader: Silences; an already-Silenced minion is destroyed instead', () => {
  const e = blank(1, 2, 9, ['Taunt']);
  play(0, give(0, 'bayou_bone_reader'), e.uid);
  if (!sil(e) || hasKeyword(e, 'Taunt')) return 'not silenced';
  play(0, give(0, 'bayou_bone_reader'), e.uid);
  if (pl(1).board.includes(e)) return 'not destroyed';
});
test('Hex of Withering: 3 damage, or 5 to a Silenced minion', () => {
  const a = blank(1, 1, 9), b = blank(1, 1, 9);
  play(0, give(0, 'silencing_charm'), b.uid);
  play(0, give(0, 'hex_of_withering'), a.uid);
  play(0, give(0, 'hex_of_withering'), b.uid);
  if (a.health !== 6 || b.health !== 4) return `${a.health} / ${b.health}`;
});
test('Raven Familiar can only target minions that cost (3) or less', () => {
  const big = put(1, 'pit_lord'), small = blank(1, 1, 1);
  const r = give(0, 'raven_familiar');
  const t = getLegalActions(s).filter((a) => a.type === 'play' && a.card === r.uid).map((a) => a.target);
  if (t.includes(big.uid) || !t.includes(small.uid)) return `targets ${t}`;
});
test('Crossroads Witch deals 2 to a random enemy minion at the end of the Witch turn', () => {
  put(0, 'crossroads_witch');
  const m = blank(1, 1, 5);
  endTurn(0);
  if (m.health !== 3) return `health ${m.health}`;
  if (sil(m)) return 'still silences';
});
test('Witches: only 10 cards carry Silence', () => {
  const n = allCards().filter((c) => c.faction === 'Witches' && /silenc/i.test(c.text ?? '')).length;
  if (n !== 10) return `${n} cards mention Silence`;
});
test('Coven Matriarch Silences every enemy minion and the enemy Hero', () => {
  const a = blank(1, 1, 3, ['Taunt']), b = blank(1, 1, 3, ['Lifesteal']);
  play(0, give(0, 'coven_matriarch'));
  if (!sil(a) || !sil(b)) return 'minions';
  endTurn(0);
  if (canHeroSpell(1, pl(1).heroSpells[0].cardId)) return 'hero spell usable';
});
test('Forbidden Grimoire draws a Wand and a Trap from the deck', () => {
  pl(0).deck = [{ uid: s.nextUid++, cardId: 'academy_initiate', owner: 0 }, { uid: s.nextUid++, cardId: 'wand_of_binding', owner: 0 }, { uid: s.nextUid++, cardId: 'counter_hex', owner: 0 }];
  play(0, give(0, 'forbidden_grimoire'));
  const ids = pl(0).hand.map((c) => c.cardId);
  if (!ids.includes('wand_of_binding') || !ids.includes('counter_hex') || ids.includes('academy_initiate')) return ids.join(',');
});
test('Xeno Hexmorph: a Chestburster from a Witch host Evolves and Silences an enemy minion', () => {
  const e = blank(1, 2, 5, ['Taunt']);
  const cb = put(0, 'chestburster'); cb.hostFaction = 'Witches';
  evolveChestburster(s, cb);
  applyAction(s, { type: 'endTurn', player: 0 }); settle();
  if (cb.cardId !== 'xeno_hexmorph') return cb.cardId;
  if (!sil(e)) return 'not silenced';
});

// ---- A whole game with the AI ----
test('AI games with Witches finish without errors', () => {
  for (let seed = 1; seed <= 6; seed++) {
    const fa = seed % 2 ? ['Witches'] : ['Witches', 'Zombies'], fb = seed % 2 ? ['Dragons'] : ['Aliens', 'Robots'];
    const g = createGame({ seed, rules: { mulligan: false }, players: [{ name: 'A', factions: fa, deck: buildDeck(fa) }, { name: 'B', factions: fb, deck: buildDeck(fb) }] });
    let steps = 0;
    while (!g.gameOver && steps++ < 3000) {
      const acts = getLegalActions(g);
      if (!acts.length) break;
      // Prefer attacks and plays to keep the game moving; end the turn otherwise.
      const pick = acts.find((a) => a.type === 'attack') ?? acts.find((a) => a.type === 'play' || a.type === 'heroSpell') ?? acts.find((a) => a.type === 'endTurn') ?? acts[0];
      applyAction(g, pick);
    }
    if (!g.gameOver) return `seed ${seed} did not finish`;
  }
});

console.log(`\n${passed} passed, ${failures} failed`);
if (failures) process.exit(1);
