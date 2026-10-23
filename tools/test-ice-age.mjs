// Rules tests for the Ice Age: Thick Fur (can't be Frozen), Hardy (1 less damage per hit),
// the passive Great Freeze, the Ice Age cards and their fusions.
//   node tools/test-ice-age.mjs

import { buildDeck, FACTION_DECKS, PLAYABLE_FACTIONS } from '../src/cards/index.js';
import { addToHand, dealDamage, effectiveAttack, hasKeyword, summonMinion } from '../src/engine/core.js';
import { applyAction, createGame, getLegalActions, GREAT_FREEZE_EVERY } from '../src/engine/engine.js';
import { allCards, getCard } from '../src/engine/registry.js';
import { evolveChestburster } from '../src/engine/effects.js';
import { ART, FUSION_HERO_ART, HERO_ART } from '../src/cards/art-manifest.js';
import { DECK_TYPES } from '../src/cards/faction-info.js';
import { BOARD_ART, LANDSCAPE_BOARDS, PORTRAIT_BOARDS } from '../src/cards/board-art.js';
import { existsSync } from 'node:fs';

let s;
let failures = 0;
let passed = 0;

// Player 0 runs Ice Age (+ a partner); player 1 runs Dragons + Robots.
function fresh(fa = ['Ice Age', 'Plants']) {
  const fb = ['Dragons', 'Robots'];
  const players = [{ name: 'A', factions: fa, deck: buildDeck(fa) }, { name: 'B', factions: fb, deck: buildDeck(fb) }];
  s = createGame({ seed: 7, rules: { mulligan: false, secondPlayerPotions: false, openingHandHelp: false }, players });
  for (const p of s.players) { p.hand = []; p.traps = []; p.mana.max = 10; p.mana.current = 10; p.mana.primal = 0; p.mana.base = 10; }
}
const pl = (p) => s.players[p];
const put = (p, id) => { const m = summonMinion(s, p, id); m.sick = false; return m; };
const give = (p, id) => addToHand(s, p, id);
const find = (p, id) => pl(p).board.find((m) => m.cardId === id);
const blank = (p, atk, hp) => { const m = put(p, 'vampire_gargoyle'); m.keywords = []; m.attack = atk; m.health = hp; m.maxHealth = hp; return m; };
const hero = (p) => pl(p).hero;
const frozen = (c) => hasKeyword(c, 'Frozen');
const logText = () => s.log.map((l) => (typeof l === 'string' ? l : l.text ?? l.msg ?? JSON.stringify(l)));

function settle(pick = () => 0) {
  for (let i = 0; i < 50 && s.pending; i++) {
    if (s.pending.type === 'reaction') applyAction(s, { type: 'pass', player: s.pending.player });
    else if (s.pending.type === 'choice') applyAction(s, { type: 'choose', player: s.pending.player, index: pick(s.pending.options) });
    else break;
  }
}
function play(p, inst, target, pick) {
  applyAction(s, { type: 'play', player: p, card: inst.uid, ...(target != null ? { target } : {}) });
  settle(pick);
}
function fusion(p, id, target, pick) {
  pl(p).fusion = { cardId: id, charge: 3 };
  applyAction(s, { type: 'heroSpell', player: p, card: id, ...(target != null ? { target } : {}) });
  settle(pick);
}
function attack(p, attacker, defender) {
  applyAction(s, { type: 'attack', player: p, attacker, defender });
  settle();
}
function endTurn() {
  const p = s.activePlayer;
  applyAction(s, { type: 'endTurn', player: p });
  settle();
  for (const x of s.players) { x.mana.current = 10; }
}
const canAttack = (m) => getLegalActions(s).some((a) => a.type === 'attack' && a.attacker === m.uid);
function test(name, fn, fa) {
  fresh(fa);
  try { const r = fn(); if (r) { failures++; console.log(`FAIL ${name}: ${r}`); } else { passed++; console.log(`ok   ${name}`); } }
  catch (e) { failures++; console.log(`FAIL ${name}: ${e.stack.split('\n').slice(0, 3).join(' | ')}`); }
}

const ICE_IDS = allCards().filter((c) => c.faction === 'Ice Age').map((c) => c.id);
const FUSION_IDS = allCards().filter((c) => c.fusion?.includes('Ice Age')).map((c) => c.id);

test('Ice Age is a playable realm: 30 cards, a passive Hero Spell and a token, 4th in the Attrition row', () => {
  if (!PLAYABLE_FACTIONS.includes('Ice Age')) return 'not playable';
  if (FACTION_DECKS['Ice Age'].length !== 30) return `deck has ${FACTION_DECKS['Ice Age'].length}`;
  if (!getCard('the_great_freeze')?.passive) return 'Great Freeze not a passive Hero Spell';
  if (!getCard('cave_bear_cub')?.token) return 'no Cave Bear Cub token';
  const row = DECK_TYPES.find((d) => d.factions.includes('Ice Age'));
  if (row?.name !== 'Attrition' || row.factions.length !== 4) return `row: ${row?.name} ${row?.factions}`;
  if (FUSION_IDS.length !== PLAYABLE_FACTIONS.length - 1) return `${FUSION_IDS.length} fusions for ${PLAYABLE_FACTIONS.length - 1} partners`;
});

test('every Ice Age card, fusion, hero, fusion hero, back, board and the legendary frame has art', () => {
  const missing = [];
  for (const id of [...ICE_IDS, ...FUSION_IDS]) if (!ART[id] || !existsSync(ART[id].split('?')[0])) missing.push(id);
  if (!HERO_ART['Ice Age'] || !existsSync(HERO_ART['Ice Age'])) missing.push('hero');
  for (const f of PLAYABLE_FACTIONS.filter((f) => f !== 'Ice Age')) {
    const key = ['ice-age', f.toLowerCase().replace(/\s+/g, '-')].sort().join('-');
    const path = FUSION_HERO_ART[key] ?? FUSION_HERO_ART[`ice-age-${f.toLowerCase()}`] ?? FUSION_HERO_ART[`${f.toLowerCase()}-ice-age`];
    if (!path || !existsSync(path)) missing.push(`fusion hero ${f}`);
  }
  for (const f of ['art/backs/ice-age.jpg', 'art/frames/legendary-minion-ice-age.webp', BOARD_ART['Ice Age'], PORTRAIT_BOARDS['Ice Age']?.src, LANDSCAPE_BOARDS['Ice Age']?.src]) {
    if (!f || !existsSync(f)) missing.push(f ?? 'board entry');
  }
  if (missing.length) return `missing: ${missing.join(', ')}`;
  if (!getCard('grog_the_neanderthal_chieftain').legendary || !getCard('old_tusker_the_herd_mother').legendary) return 'legendaries not marked';
});

test('Thick Fur: a Freeze does nothing to it', () => {
  const fox = put(1, 'arctic_fox');
  const plain = blank(1, 2, 4);
  const elk = give(0, 'irish_elk');
  play(0, elk, fox.uid);
  if (frozen(fox)) return 'Arctic Fox was Frozen';
  const elk2 = give(0, 'irish_elk');
  play(0, elk2, plain.uid);
  if (!frozen(plain)) return 'a plain minion was not Frozen';
});

test('Thick Fur Cloak lets a Frozen-prone minion shrug off Avalanche', () => {
  const a = blank(1, 1, 8); const b = blank(1, 1, 8);
  play(0, give(0, 'thick_fur_cloak'), a.uid);
  play(0, give(0, 'avalanche'));
  if (frozen(a)) return 'cloaked minion Frozen';
  if (!frozen(b)) return 'other minion not Frozen';
  if (a.health !== 9 || b.health !== 6) return `health ${a.health} / ${b.health}`;
});

test('Hardy: 1 less damage from each hit, never below 1', () => {
  const bear = put(0, 'cave_bear');
  dealDamage(s, null, bear.uid, 3);
  if (bear.health !== 5) return `3 damage left ${bear.health}/7 (want 5)`;
  dealDamage(s, null, bear.uid, 1);
  if (bear.health !== 4) return `1 damage left ${bear.health} (want 4)`;
});

test('Hardy in combat: a 5-Attack minion hits a Glyptodon for 4', () => {
  const g = put(0, 'glyptodon');
  endTurn();
  const att = blank(1, 5, 5);
  attack(1, att.uid, g.uid);
  if (g.health !== 2) return `Glyptodon at ${g.health} (want 2)`;
  if (att.health !== 4) return `attacker at ${att.health} (want 4)`;
});

test('Grog gives your other minions Hardy (and loses it when he dies)', () => {
  const m = blank(0, 1, 6);
  play(0, give(0, 'grog_the_neanderthal_chieftain'));
  if (!hasKeyword(m, 'Hardy')) return 'no Hardy from Grog';
  const grog = find(0, 'grog_the_neanderthal_chieftain');
  if (hasKeyword(grog, 'Hardy')) return 'Grog gave himself Hardy';
  dealDamage(s, null, m.uid, 3);
  if (m.health !== 4) return `minion at ${m.health} (want 4)`;
  grog.health = 0; endTurn();
  if (hasKeyword(m, 'Hardy')) return 'Hardy stayed after Grog died';
});

test(`The Great Freeze: at the end of the Ice Age player's ${GREAT_FREEZE_EVERY}th turn, all without Thick Fur freeze (Heroes too)`, () => {
  if (s.activePlayer !== 0) return 'test assumes A starts';
  const enemy = blank(1, 3, 6);
  const mine = blank(0, 2, 6);
  const furry = put(0, 'woolly_rhinoceros');
  for (let t = 1; t < GREAT_FREEZE_EVERY; t++) {
    endTurn(); endTurn();
    if (frozen(enemy) || frozen(mine)) return `froze early, after turn ${t}`;
  }
  if (pl(0).greatFreeze.every - pl(0).greatFreeze.turns !== 0) return `badge would show ${pl(0).greatFreeze.every - pl(0).greatFreeze.turns} on the 4th turn`;
  endTurn(); // end of A's 4th turn
  if (!frozen(enemy)) return 'enemy minion not Frozen';
  if (!frozen(mine)) return 'my plain minion not Frozen';
  if (!frozen(hero(1)) || !frozen(hero(0))) return `heroes frozen: A ${frozen(hero(0))} B ${frozen(hero(1))}`;
  if (frozen(furry)) return 'Thick Fur minion was Frozen';
  if (!logText().some((l) => l.includes('THE GREAT FREEZE'))) return 'no log line for the banner';
  if (pl(0).greatFreeze.turns !== 0) return 'counter did not reset';
  // B's turn: B's minion and hero are Frozen and can't attack.
  if (canAttack(enemy)) return 'Frozen enemy minion could attack';
  endTurn();
  if (frozen(enemy) || frozen(hero(1))) return 'B did not thaw after their frozen turn';
  // A's turn: A's own plain minion sat out this turn, the Thick Fur one did not.
  if (canAttack(mine)) return 'my Frozen minion could attack';
  if (!canAttack(furry)) return 'Thick Fur minion could not attack';
  endTurn();
  if (frozen(mine) || frozen(hero(0))) return 'A did not thaw after their frozen turn';
});

test('The Great Freeze only exists for an Ice Age player, and repeats', () => {
  if (pl(1).greatFreeze) return 'non-Ice Age player has a Great Freeze';
  const e = blank(1, 1, 9);
  for (let t = 0; t < GREAT_FREEZE_EVERY * 2; t++) { endTurn(); endTurn(); }
  const count = logText().filter((l) => l.includes('THE GREAT FREEZE')).length;
  if (count !== 2) return `${count} Great Freezes in ${GREAT_FREEZE_EVERY * 2} turns`;
  if (!e) return 'no minion';
});

test('Cave Painter brings the next Great Freeze 1 turn sooner', () => {
  const before = pl(0).greatFreeze.turns;
  play(0, give(0, 'cave_painter'));
  if (pl(0).greatFreeze.turns !== before + 1) return `turns ${before} -> ${pl(0).greatFreeze.turns}`;
  const e = blank(1, 1, 9);
  for (let t = 1; t < GREAT_FREEZE_EVERY - 1; t++) { endTurn(); endTurn(); }
  endTurn();
  if (!frozen(e)) return 'Great Freeze did not come a turn early';
});

test('Sabertooth Cat deals double damage to a Frozen minion', () => {
  const a = blank(1, 0, 20); const b = blank(1, 0, 20);
  a.keywords.push('Frozen');
  const cat = put(0, 'sabertooth_cat');
  attack(0, cat.uid, a.uid);
  if (a.health !== 12) return `Frozen target at ${a.health} (want 12)`;
  cat.attacksThisTurn = 0; cat.exhausted = false;
  const cat2 = put(0, 'sabertooth_cat');
  attack(0, cat2.uid, b.uid);
  if (b.health !== 16) return `unfrozen target at ${b.health} (want 16)`;
});

test('Dire Wolf has +2 Attack while an enemy minion is Frozen', () => {
  const w = put(0, 'dire_wolf'); const e = blank(1, 1, 5);
  endTurn(); endTurn();
  if (effectiveAttack(w) !== 3) return `Attack ${effectiveAttack(w)} with nothing Frozen`;
  e.keywords.push('Frozen');
  play(0, give(0, 'huddle_for_warmth'));
  if (effectiveAttack(w) !== 5) return `Attack ${effectiveAttack(w)} with a Frozen enemy`;
});

test('Flint Spear Volley: 3 damage, or 5 to a Frozen minion', () => {
  const a = blank(1, 0, 9); const b = blank(1, 0, 9);
  b.keywords.push('Frozen');
  play(0, give(0, 'flint_spear_volley'), a.uid);
  play(0, give(0, 'flint_spear_volley'), b.uid);
  if (a.health !== 6 || b.health !== 4) return `${a.health} / ${b.health}`;
});

test('Survival of the Fittest draws 3 with an 8+ Health minion, else 2', () => {
  play(0, give(0, 'survival_of_the_fittest'));
  if (pl(0).hand.length !== 2) return `drew ${pl(0).hand.length} without a big minion`;
  pl(0).hand = [];
  put(0, 'giant_ground_sloth');
  play(0, give(0, 'survival_of_the_fittest'));
  if (pl(0).hand.length !== 3) return `drew ${pl(0).hand.length} with a 9-Health Sloth`;
});

test('Old Tusker gives your other minions +0/+2 and Thick Fur', () => {
  const m = blank(0, 1, 2);
  play(0, give(0, 'old_tusker_the_herd_mother'));
  if (m.health !== 4 || !hasKeyword(m, 'Thick Fur')) return `${m.health} Health, fur ${hasKeyword(m, 'Thick Fur')}`;
});

test('Hidden Den summons a Cave Bear Cub when your Hero takes damage', () => {
  pl(0).traps.push({ cardId: 'hidden_den', uid: 'trap-den' });
  endTurn();
  const att = blank(1, 2, 2);
  attack(1, att.uid, hero(0).uid);
  if (!find(0, 'cave_bear_cub')) return 'no Cave Bear Cub';
});

test('Thin Ice freezes the next minion the opponent plays', () => {
  pl(0).traps.push({ cardId: 'thin_ice', uid: 'trap-ice' });
  endTurn();
  const c = give(1, 'stormscale_drake');
  play(1, c);
  const m = find(1, 'stormscale_drake');
  if (!m || !frozen(m)) return 'played minion not Frozen';
});

// Every Ice Age fusion resolves on a sensible board without errors.
const FUSION_PARTNER = (id) => getCard(id).fusion.find((f) => f !== 'Ice Age');
for (const id of FUSION_IDS) {
  test(`fusion ${getCard(id).name} resolves`, () => {
    const card = getCard(id);
    const partner = FUSION_PARTNER(id);
    const enemy = blank(1, 2, 9);
    const friend = card.target?.tribe || card.target?.lycan ? null : blank(0, 2, 6);
    let lycan = null;
    if (partner === 'Lycanthropes') lycan = put(0, allCards().find((c) => c.faction === 'Lycanthropes' && c.type === 'minion' && c.form).id);
    pl(0).hand = []; give(0, 'arctic_fox'); // for Endless Winter's discard
    const side = card.target?.side;
    const target = !card.target ? null : lycan ? lycan.uid : side === 'enemy' ? enemy.uid : (friend ?? lycan).uid;
    const hpBefore = hero(0).health;
    fusion(0, id, target);
    if (s.pending) return `left a pending ${s.pending.type}`;
    const t = !card.target ? null : side === 'enemy' ? enemy : (lycan ?? friend);
    const txt = card.text;
    if (/Freeze/.test(txt) && /enemy minion/.test(txt) && !frozen(enemy) && id !== 'frozen_in_time') return 'enemy not Frozen';
    if (/Thick Fur/.test(txt) && t && side !== 'enemy' && !hasKeyword(t, 'Thick Fur')) return 'no Thick Fur';
    if (/Hardy/.test(txt) && t && !hasKeyword(t, 'Hardy')) return 'no Hardy';
    if (/Lose (\d)/.test(txt) && hero(0).health !== hpBefore - Number(txt.match(/Lose (\d)/)[1])) return `Hero ${hpBefore} -> ${hero(0).health}`;
  }, ['Ice Age', FUSION_PARTNER(id)]);
}

test('a Chestburster from an Ice Age minion Evolves into the Woolly Xeno', () => {
  const cb = put(0, 'chestburster');
  cb.hostFaction = 'Ice Age';
  evolveChestburster(s, cb);
  const x = pl(0).board.find((m) => m.uid === cb.uid);
  if (x?.cardId !== 'woolly_xeno' || !hasKeyword(x, 'Thick Fur')) return `became ${x?.cardId}`;
  if (!ART.woolly_xeno || !existsSync(ART.woolly_xeno)) return 'no art';
});

console.log(`\n${passed} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
