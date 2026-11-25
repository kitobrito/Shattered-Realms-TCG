// Ghouls rules: Hunter or Hunted (the chosen Kagune or Quinque), Corpses and every Ghouls card, checked against their text.
// Each test sets up a small board and runs the real engine.
//   node tools/test-ghouls.mjs

import { buildDeck, FACTION_LISTS, LEGENDARY } from '../src/cards/index.js';
import { addToHand, hasKeyword, summonMinion, effectiveAttack } from '../src/engine/core.js';
import { applyAction, createGame, fusionFor, getLegalActions, run as drain } from '../src/engine/engine.js';
import { FACTIONS } from '../src/engine/rules.js';
import { resolveEffect } from '../src/engine/effects.js';
import { allCards, getCard } from '../src/engine/registry.js';

let s;
let CHOICE = 'rinkaku'; // the Ghouls player's Hero choice for the next fresh game
let failures = 0;
let passed = 0;

function fresh(partner = 'Sharks', foe = ['Vampires', 'Dragons']) {
  const fa = ['Ghouls', partner];
  const players = [{ name: 'A', factions: fa, deck: buildDeck(fa), heroChoice: CHOICE }, { name: 'B', factions: foe, deck: buildDeck(foe) }];
  s = createGame({ seed: 7, rules: { mulligan: false, secondPlayerPotions: false, openingHandHelp: false }, players });
  for (const p of s.players) { p.hand = []; p.mana.max = 10; p.mana.current = 10; p.mana.primal = 0; p.mana.base = 10; }
}
const pl = (p) => s.players[p];
const hero = (p) => pl(p).hero;
const put = (p, id) => { const m = summonMinion(s, p, id); m.sick = false; return m; };
const give = (p, id) => addToHand(s, p, id);
const blank = (p, atk, hp, kws = []) => { const m = put(p, 'vampire_gargoyle'); m.keywords = [...kws]; m.attack = atk; m.health = hp; m.maxHealth = hp; return m; };
// Put the starting Kagune/Quinque away, for tests about other cards.
const unarm = (p) => { hero(p).attack = 0; hero(p).weapon = null; hero(p).grantedTriggers = []; delete hero(p).auraKeywords; };
const lost = (m) => m.maxHealth - m.health;
const onBoard = (p, id) => pl(p).board.filter((m) => m.cardId === id && m.health > 0 && !m.destroyed);

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

function test(name, fn, ...args) {
  fresh(...args);
  try {
    const problem = fn();
    if (problem) { failures++; console.log(`FAIL ${name}: ${problem}`); } else { passed++; console.log(`ok   ${name}`); }
  } catch (e) { failures++; console.log(`FAIL ${name}: threw ${e.stack.split('\n').slice(0, 3).join(' | ')}`); }
}


const G = 'Ghouls';
const card = (id) => getCard(id);
const corpses = (p, n) => { pl(p).corpses = n; };

// ---- The set ----
test('30 standard cards, Hunter or Hunted outside the deck, one token, two Legendaries', () => {
  if (FACTION_LISTS[G].length !== 30) return `standard ${FACTION_LISTS[G].length}`;
  const hs = allCards().filter((c) => c.faction === G && c.heroSpell);
  if (hs.length !== 1 || hs[0].id !== 'hunter_or_hunted' || !hs[0].passive) return 'hero spell';
  const tokens = allCards().filter((c) => c.faction === G && c.token).map((c) => c.id);
  if (tokens.join() !== 'masked_ghoul') return tokens.join();
  const leg = FACTION_LISTS[G].filter((id) => LEGENDARY.has(id)).sort().join();
  if (leg !== 'goro_mikazuki_the_carrion_king,reika_fushimi_the_executioner') return leg;
  const by = (t) => FACTION_LISTS[G].filter((id) => card(id).tribes?.includes(t)).length;
  if (by('Ghoul') !== 6 || by('Investigator') !== 4 || by('Quinx') !== 5) return `tribes ${by('Ghoul')}/${by('Investigator')}/${by('Quinx')}`;
  const types = FACTION_LISTS[G].map((id) => card(id)).reduce((o, c) => ((o[c.heroWeapon ? 'weapon' : c.quickPlay ? 'qp' : c.type] = (o[c.heroWeapon ? 'weapon' : c.quickPlay ? 'qp' : c.type] ?? 0) + 1), o), {});
  if (types.minion !== 15 || types.weapon !== 4 || types.trap !== 2 || types.qp !== 2 || types.spell !== 7) return JSON.stringify(types);
});
test('Ghouls leave Corpses on their side', () => {
  const m = put(0, 'mio_kisaragi_needlepoint');
  run({ op: 'damage', target: { uid: m.uid }, amount: 5 }, 1);
  if ((pl(0).corpses ?? 0) < 1) return `corpses ${pl(0).corpses}`;
});

// ---- Hunter or Hunted: the Hero's starting weapon ----
const withChoice = (c, fn) => () => { CHOICE = c; fresh(); CHOICE = 'rinkaku'; return fn(); };
const strike = (target) => { hero(0).attacksThisTurn = 0; attack(0, hero(0).uid, target); };
test('every choice starts the match holding its weapon', () => {
  const hs = card('hunter_or_hunted');
  for (const [k, c] of Object.entries(hs.heroChoices)) {
    CHOICE = k; fresh();
    const w = hero(0).weapon;
    if (!w || w.name !== c.weapon.name || w.attack !== c.weapon.attack || w.durability !== c.weapon.durability) return `${k}: ${JSON.stringify(w)}`;
    if (hero(0).attack !== c.weapon.attack) return `${k}: hero attack ${hero(0).attack}`;
    if (!getCard(w.cardId)) return `${k}: card ${w.cardId}`;
    if (pl(0).heroChoice !== k) return `${k}: remembered ${pl(0).heroChoice}`;
  }
  CHOICE = 'rinkaku';
  const sides = Object.values(hs.heroChoices).reduce((o, c) => ((o[c.side] = (o[c.side] ?? 0) + 1), o), {});
  if (sides.Ghoul !== 4 || sides.Investigator !== 4) return JSON.stringify(sides);
});
test('no choice (the AI): one is picked at random', withChoice(undefined, () => {
  if (!hero(0).weapon || !card('hunter_or_hunted').heroChoices[pl(0).heroChoice]) return JSON.stringify(pl(0).heroChoice);
}));
test('Rinkaku: Lifesteal heals the Hero', withChoice('rinkaku', () => {
  hero(0).health = 20; const m = blank(1, 0, 5);
  strike(m.uid);
  if (hero(0).health !== 21 || m.health !== 4) return `hero ${hero(0).health}, minion ${m.health}`;
}));
test('Ukaku: ranged, the Hero takes no damage back', withChoice('ukaku', () => {
  const m = blank(1, 4, 9); const h = hero(0).health;
  strike(m.uid);
  if (hero(0).health !== h || m.health !== 8) return `hero ${hero(0).health}/${h}, minion ${m.health}`;
}));
test('Koukaku: 1 Armor after each attack', withChoice('koukaku', () => {
  hero(0).armor = 0; const m = blank(1, 0, 5);
  strike(m.uid);
  if (hero(0).armor !== 1) return `armor ${hero(0).armor}`;
}));
test('Bikaku: double hit, two attacks a turn', withChoice('bikaku', () => {
  const m = blank(1, 0, 9);
  hero(0).attacksThisTurn = 0;
  attack(0, hero(0).uid, m.uid); attack(0, hero(0).uid, m.uid);
  if (m.health !== 7) return `minion ${m.health}`;
  if (getLegalActions(s).some((a) => a.type === 'attack' && a.attacker === hero(0).uid)) return 'a third attack is allowed';
}));
test('Guillotine: destroys a damaged minion it attacks, only hits a healthy one', withChoice('guillotine', () => {
  const a = blank(1, 0, 9), b = blank(1, 0, 9);
  strike(a.uid);
  if (a.health !== 7) return `healthy ${a.health}`;
  b.health = 8;
  strike(b.uid);
  if (!(b.destroyed || b.health <= 0)) return `damaged survived ${b.health}`;
}));
test('Thunderclap: the Hero takes no damage back', withChoice('thunderclap', () => {
  const m = blank(1, 4, 9); const h = hero(0).health;
  strike(m.uid);
  if (hero(0).health !== h || m.health !== 7) return `hero ${hero(0).health}/${h}, minion ${m.health}`;
}));
test('Marionette: Freezes before the hit', withChoice('marionette', () => {
  const m = blank(1, 0, 9);
  strike(m.uid);
  if (!hasKeyword(m, 'Frozen') || m.health !== 7) return `frozen ${hasKeyword(m, 'Frozen')}, ${m.health}`;
}));
test('Gravebreaker: 1 damage to all enemy minions after each attack', withChoice('gravebreaker', () => {
  const a = blank(1, 0, 9), b = blank(1, 0, 9);
  strike(a.uid);
  if (a.health !== 7 || b.health !== 8) return `${a.health}/${b.health}`;
}));
test('a used Kagune regains 1 Durability each turn, up to full', withChoice('koukaku', () => {
  const m = blank(1, 0, 30);
  strike(m.uid);
  if (hero(0).weapon?.durability !== 1) return `after a hit ${hero(0).weapon?.durability}`;
  endTurn(); endTurn();
  if (hero(0).weapon?.durability !== 2) return `next turn ${hero(0).weapon?.durability}`;
  endTurn(); endTurn(); endTurn(); endTurn();
  if (hero(0).weapon?.durability !== 2) return `capped ${hero(0).weapon?.durability}`;
}));
test('a broken Kagune starts growing back the next turn, 1 Durability at a time', withChoice('rinkaku', () => {
  const m = blank(1, 0, 30);
  strike(m.uid); strike(m.uid);
  if (hero(0).weapon) return 'did not break';
  endTurn(); endTurn();
  const w = hero(0).weapon;
  if (!w || w.name !== 'Rinkaku Kagune' || w.durability !== 1 || w.maxDurability !== 2 || hero(0).attack !== 1) return `back: ${JSON.stringify(w)} atk ${hero(0).attack}`;
  endTurn(); endTurn();
  if (hero(0).weapon?.durability !== 2) return `then ${hero(0).weapon?.durability}`;
  strike(m.uid); strike(m.uid);
  if (hero(0).weapon) return 'second break';
  endTurn(); endTurn();
  if (hero(0).weapon?.durability !== 1) return 'did not grow back twice';
  if (!hasKeyword(hero(0), 'Lifesteal') && !(hero(0).auraKeywords ?? []).includes('Lifesteal')) return 'lost Lifesteal';
}));
test('a Kagune waits while the Hero holds another weapon', withChoice('koukaku', () => {
  const m = blank(1, 0, 30);
  for (let i = 0; i < 2; i++) strike(m.uid);
  if (hero(0).weapon) return 'did not break';
  play(0, give(0, 'thunderclap'));
  endTurn(); endTurn(); endTurn(); endTurn();
  if (hero(0).weapon?.name !== 'Thunderclap') return `held ${hero(0).weapon?.name}`;
  for (let i = 0; i < 3; i++) strike(m.uid); // the Thunderclap card is 2/3
  if (hero(0).weapon) return 'Thunderclap did not break';
  endTurn(); endTurn();
  if (hero(0).weapon?.name !== 'Koukaku Kagune' || hero(0).weapon.durability !== 1) return `after: ${hero(0).weapon?.name}`;
}));
test('a Quinque breaks for good', withChoice('thunderclap', () => {
  const m = blank(1, 0, 30);
  for (let i = 0; i < 2; i++) strike(m.uid);
  if (hero(0).weapon) return 'did not break';
  for (let i = 0; i < 8; i++) endTurn();
  if (hero(0).weapon) return `came back ${hero(0).weapon.name}`;
}));

// ---- Ghoul minions ----
test('Renji: Rage and Regenerate 2', () => {
  const m = put(0, 'renji_kurose_the_butcher');
  run({ op: 'damage', target: { uid: m.uid }, amount: 3 }, 1);
  if (effectiveAttack(m) !== 5) return `rage ${effectiveAttack(m)}`;
  endTurn(); endTurn();
  if (m.health !== 3) return `regen ${m.health}`;
});
test('Shiori: Rush, Arrival hits two enemy minions for 1', () => {
  const a = blank(1, 1, 3), b = blank(1, 1, 3);
  const m = give(0, 'shiori_amagasa_glasswing'); play(0, m);
  if (lost(a) + lost(b) !== 2) return `${lost(a)}+${lost(b)}`;
  const me = onBoard(0, 'shiori_amagasa_glasswing')[0];
  if (!hasKeyword(me, 'Rush')) return 'no rush';
});
test('Daigo: Taunt and Evade', () => {
  const m = put(0, 'daigo_iwamine_iron_coffin');
  if (!hasKeyword(m, 'Taunt') || !hasKeyword(m, 'Evade')) return 'keywords';
});
test('Natsume: Venomous kills what it attacks', () => {
  const m = put(0, 'natsume_sagara_scorpion'); const big = blank(1, 1, 9);
  attack(0, m.uid, big.uid);
  if (big.health > 0 && !big.destroyed) return `big ${big.health}`;
});
test('Itsuki: Rush, Regenerate 2, Arrival 2 damage to an enemy minion', () => {
  const a = blank(1, 1, 5);
  const m = give(0, 'itsuki_shidara_chimera'); play(0, m);
  if (lost(a) !== 2) return `lost ${lost(a)}`;
});
test('Goro eats up to 4 Corpses for +1/+1 each', () => {
  corpses(0, 6);
  const m = give(0, 'goro_mikazuki_the_carrion_king'); play(0, m);
  const g = onBoard(0, 'goro_mikazuki_the_carrion_king')[0];
  if (effectiveAttack(g) !== 9 || g.maxHealth !== 9) return `${effectiveAttack(g)}/${g.maxHealth}`;
  if (pl(0).corpses !== 2) return `corpses ${pl(0).corpses}`;
  if (!hasKeyword(g, 'Lifesteal') || !hasKeyword(g, 'Devour')) return 'keywords';
});

// ---- Investigators ----
test('Reika destroys a damaged enemy minion (and only a damaged one)', () => {
  const hurt = blank(1, 3, 8); hurt.health = 5; const whole = blank(1, 3, 8);
  const r = give(0, 'reika_fushimi_the_executioner');
  const legal = getLegalActions(s).filter((a) => a.type === 'play' && a.card === r.uid).map((a) => a.target);
  if (legal.includes(whole.uid)) return 'undamaged was a target';
  play(0, r, hurt.uid);
  if (!hurt.destroyed && hurt.health > 0) return 'not destroyed';
});
test('Reika can be played with no damaged enemy', () => {
  blank(1, 3, 8);
  const r = give(0, 'reika_fushimi_the_executioner');
  if (!getLegalActions(s).some((a) => a.type === 'play' && a.card === r.uid)) return 'unplayable';
});
test('Masato deals 2 to an enemy', () => {
  const r = give(0, 'masato_kirihara_thunderclap'); play(0, r, hero(1).uid);
  if (lost(hero(1)) !== 2) return `lost ${lost(hero(1))}`;
});
test('Akane Freezes an enemy minion', () => {
  const t = blank(1, 2, 3); const r = give(0, 'akane_shimizu_the_puppeteer'); play(0, r, t.uid);
  if (!hasKeyword(t, 'Frozen')) return 'not frozen';
});
test('Kenta: +1 Attack and +1 Durability to the Hero Weapon', () => {
  const w = give(0, 'thunderclap'); play(0, w);
  const k = give(0, 'kenta_obayashi_the_undertaker'); play(0, k);
  const hw = hero(0).weapon ?? hero(0).weapons?.[0];
  if (!hw) return 'no weapon';
  if (hw.durability !== 4) return `durability ${hw.durability}`;
  if (effectiveAttack(hero(0)) !== 3) return `attack ${effectiveAttack(hero(0))}`;
});

// ---- Quinx ----
test('Haruka: Taunt, Arrival gain 2 Armor', () => {
  const r = give(0, 'haruka_minase_the_shield'); play(0, r);
  if ((hero(0).armor ?? 0) !== 2) return `armor ${hero(0).armor}`;
});
test('Toma: Rush and Venomous', () => {
  const r = give(0, 'toma_arakida_the_hound'); const big = blank(1, 1, 9); play(0, r);
  const t = onBoard(0, 'toma_arakida_the_hound')[0];
  attack(0, t.uid, big.uid);
  if (big.health > 0 && !big.destroyed) return 'survived';
});
test('Mio deals 1', () => {
  const t = blank(1, 1, 3); const r = give(0, 'mio_kisaragi_needlepoint'); play(0, r, t.uid);
  if (lost(t) !== 1) return `lost ${lost(t)}`;
});
test('Sora Freezes the minion it attacks', () => {
  const m = put(0, 'sora_yanagihara_the_spider'); const t = blank(1, 1, 9);
  attack(0, m.uid, t.uid);
  if (!hasKeyword(t, 'Frozen')) return 'not frozen';
});
test('Yuzuki: Evade and Twin Strike', () => {
  const m = put(0, 'yuzuki_kurobane_black_lotus');
  if (!hasKeyword(m, 'Evade') || !hasKeyword(m, 'Twin Strike')) return 'keywords';
});

// ---- Kagune ----
test('Rinkaku Kagune: +2/+1, Rage, heal 3', () => {
  const m = blank(0, 1, 6); m.health = 2; const c = give(0, 'rinkaku_kagune'); play(0, c, m.uid);
  if (effectiveAttack(m) !== 3 || m.maxHealth !== 7 || m.health !== 6) return `${effectiveAttack(m)}/${m.health}/${m.maxHealth}`;
  if (!hasKeyword(m, 'Rage')) return 'no rage';
});
test('Ukaku Kagune: +1 Attack, Rush, 1 damage to an enemy minion', () => {
  const m = blank(0, 1, 2); const e = blank(1, 1, 3); const c = give(0, 'ukaku_kagune'); play(0, c, m.uid);
  if (effectiveAttack(m) !== 2 || !hasKeyword(m, 'Rush') || lost(e) !== 1) return `${effectiveAttack(m)} ${lost(e)}`;
});
test('Koukaku Kagune: +0/+2, Taunt, 2 Armor', () => {
  const m = blank(0, 1, 2); const c = give(0, 'koukaku_kagune'); play(0, c, m.uid);
  if (m.maxHealth !== 4 || !hasKeyword(m, 'Taunt') || (hero(0).armor ?? 0) !== 2) return `${m.maxHealth} ${hero(0).armor}`;
});
test('Bikaku Kagune: +1/+1 and Venomous', () => {
  const m = blank(0, 1, 2); const c = give(0, 'bikaku_kagune'); play(0, c, m.uid);
  if (!hasKeyword(m, 'Venomous') || m.maxHealth !== 3) return 'buff';
});

// ---- Quinques ----
const heroWeapon = () => hero(0).weapon ?? hero(0).weapons?.[0];
test('Guillotine destroys the minion the Hero attacks', () => {
  const w = give(0, 'guillotine'); play(0, w); const t = blank(1, 0, 12);
  attack(0, hero(0).uid, t.uid);
  if (t.health > 0 && !t.destroyed) return `t ${t.health}`;
});
test('Thunderclap: the Hero takes no damage attacking with it', () => {
  const w = give(0, 'thunderclap'); play(0, w); const t = blank(1, 5, 9);
  attack(0, hero(0).uid, t.uid);
  if (lost(hero(0)) !== 0) return `hero lost ${lost(hero(0))}`;
  if (lost(t) !== 2) return `t lost ${lost(t)}`;
});
test('Marionette Freezes the minion before the hit', () => {
  const w = give(0, 'marionette'); play(0, w); const t = blank(1, 1, 9);
  attack(0, hero(0).uid, t.uid);
  if (!hasKeyword(t, 'Frozen')) return 'not frozen';
});
test('Gravebreaker: 1 damage to all enemy minions after the Hero attacks', () => {
  const w = give(0, 'gravebreaker'); play(0, w); const a = blank(1, 0, 5), b = blank(1, 0, 5);
  attack(0, hero(0).uid, a.uid);
  if (lost(a) !== 4 || lost(b) !== 1) return `${lost(a)} ${lost(b)}`;
});

// ---- Arata, spells ----
test('Arata Prototype: 6 Armor, +2 Attack this turn, then 1 Health a turn', () => {
  unarm(0); const c = give(0, 'arata_prototype'); play(0, c);
  if ((hero(0).armor ?? 0) !== 6 || effectiveAttack(hero(0)) !== 2) return `${hero(0).armor} ${effectiveAttack(hero(0))}`;
  const before = hero(0).health; endTurn(); endTurn();
  if (hero(0).health !== before - 1) return `health ${before} -> ${hero(0).health}`;
  if (effectiveAttack(hero(0)) !== 0) return 'attack stayed';
});
test('RC Cell Regeneration: 4 Health, or 8 with a Corpse', () => {
  const m = blank(0, 1, 12); m.health = 2; corpses(0, 0);
  let c = give(0, 'rc_cell_regeneration'); play(0, c, m.uid);
  if (m.health !== 6) return `small ${m.health}`;
  corpses(0, 1); m.health = 2; c = give(0, 'rc_cell_regeneration'); play(0, c, m.uid);
  if (m.health !== 10) return `big ${m.health}`;
});
test('Cannibalistic Evolution: +2/+2 Devour; with 2 Corpses also Lifesteal', () => {
  const m = blank(0, 1, 1); corpses(0, 1); let c = give(0, 'cannibalistic_evolution'); play(0, c, m.uid);
  if (effectiveAttack(m) !== 3 || !hasKeyword(m, 'Devour') || hasKeyword(m, 'Lifesteal')) return 'no corpse version';
  if (pl(0).corpses !== 1) return 'spent a corpse it could not use';
  const n = blank(0, 1, 1); corpses(0, 2); c = give(0, 'cannibalistic_evolution'); play(0, c, n.uid);
  if (!hasKeyword(n, 'Lifesteal') || pl(0).corpses !== 0) return 'corpse version';
});

// ---- Traps, Quick Plays ----
test('CCG Ambush: 3 damage to the next minion the enemy summons', () => {
  const t = give(0, 'ccg_ambush'); play(0, t); endTurn();
  const e = give(1, 'vampire_gargoyle'); play(1, e);
  const m = pl(1).board.find((x) => x.cardId === 'vampire_gargoyle');
  if (m && m.health > 0 && m.maxHealth - m.health < 3) return `took ${m.maxHealth - m.health}`;
});
test('Hidden Predator: 2 damage to the attacker and a Masked Ghoul', () => {
  const t = give(0, 'hidden_predator'); play(0, t); endTurn();
  const e = blank(1, 1, 9);
  attack(1, e.uid, hero(0).uid);
  if (lost(e) < 2) return `attacker lost ${lost(e)}`;
  if (!onBoard(0, 'masked_ghoul').length) return 'no ghoul';
});
test('Kagune Counterattack: 3 damage to an attacking minion', () => {
  const qp = give(0, 'kagune_counterattack'); endTurn();
  const e = blank(1, 1, 9);
  attack(1, e.uid, hero(0).uid, (acts) => acts.find((a) => a.type === 'quickPlay' && a.card === qp.uid));
  if (lost(e) !== 3) return `lost ${lost(e)}`;
});
test('Emergency Frame Release: +3/+3 Recoil, +4/+4 on a Quinx', () => {
  const m = blank(0, 1, 1); let c = give(0, 'emergency_frame_release'); play(0, c, m.uid);
  if (effectiveAttack(m) !== 4 || !hasKeyword(m, 'Recoil')) return `plain ${effectiveAttack(m)}`;
  const q = put(0, 'haruka_minase_the_shield'); c = give(0, 'emergency_frame_release'); play(0, c, q.uid);
  if (effectiveAttack(q) !== 5 || q.maxHealth !== 7) return `quinx ${effectiveAttack(q)}/${q.maxHealth}`;
});


// ---- Fusion Hero Spells ----
test('A Fusion Hero Spell for Ghouls and every other realm', () => {
  const miss = FACTIONS.filter((f) => f !== G && FACTION_LISTS[f] && !fusionFor([G, f]));
  if (miss.length) return miss.join();
});
for (const partner of FACTIONS.filter((f) => f !== G && FACTION_LISTS[f])) {
  test(`Fusion with ${partner} casts and does something`, () => {
    const fu = fusionFor([G, partner]); unarm(0);
    const mine = blank(0, 2, 6); mine.health = 4; const foe = blank(1, 2, 6); foe.health = 5; corpses(0, 2);
    const snap = () => JSON.stringify([pl(0).board.map((m) => [m.attack, m.health, m.keywords]), pl(1).board.map((m) => [m.attack, m.health, m.keywords]), hero(0).health, hero(0).armor, hero(1).health, pl(0).corpses, pl(1).deck.length, hero(0).weapon?.attack, hero(0).tempAttack]);
    const before = snap();
    const t = fu.target ? (fu.target.side === 'enemy' ? foe.uid : mine.uid) : undefined;
    run({ op: 'sequence', effects: fu.effects }, 0, { chosen: t, self: hero(0).uid, cardId: fu.id });
    if (snap() === before) return 'nothing changed';
  }, 'Sharks', ['Vampires', 'Dragons']);
}
test('Swarm of Wings: both Worker Bees have Rush', () => {
  run({ op: 'sequence', effects: fusionFor([G, 'Bees']).effects }, 0, { self: hero(0).uid });
  const bees = onBoard(0, 'worker_bee');
  if (bees.length !== 2 || !bees.every((b) => hasKeyword(b, 'Rush'))) return `${bees.length} bees`;
});

// ---- Kakuja Nights: the four Legendaries ----
test('Kakuja Nights: four Legendary expansion cards with art', () => {
  const ids = ['mukuro_the_thousand_mouthed', 'ren_takamori_arata_vanguard', 'aiko_sendo_frameless', 'requiem'];
  for (const id of ids) { const c = card(id); if (!c?.extra || !LEGENDARY.has(id)) return `${id} not a Legendary expansion card`; }
  if (FACTION_LISTS[G].some((id) => ids.includes(id))) return 'in the standard list';
});
test('Mukuro: Arrival eats up to 3 Corpses, 3 damage to a random enemy minion each', () => {
  const a = blank(1, 0, 9), b = blank(1, 0, 9); corpses(0, 5);
  play(0, give(0, 'mukuro_the_thousand_mouthed'));
  if (pl(0).corpses !== 2) return `corpses ${pl(0).corpses}`;
  if (lost(a) + lost(b) !== 9) return `damage ${lost(a)} + ${lost(b)}`;
  const m = onBoard(0, 'mukuro_the_thousand_mouthed')[0];
  if (!hasKeyword(m, 'Lifesteal') || !hasKeyword(m, 'Devour')) return 'keywords';
});
test('Ren Takamori: Taunt, 4 Armor, the Hero weapon +1 Attack and +1 Durability', () => {
  CHOICE = 'rinkaku'; fresh(); hero(0).armor = 0;
  const before = hero(0).weapon.durability;
  play(0, give(0, 'ren_takamori_arata_vanguard'));
  if (hero(0).armor !== 4) return `armor ${hero(0).armor}`;
  if (hero(0).weapon.durability !== before + 1) return `durability ${hero(0).weapon.durability}`;
  const m = blank(1, 0, 9); hero(0).attacksThisTurn = 0; attack(0, hero(0).uid, m.uid);
  if (m.health !== 7) return `hit for ${9 - m.health} (want 2)`;
});
test('Aiko Sendo: Rush, Twin Strike, Lifesteal; takes 2 damage at the end of her turn', () => {
  play(0, give(0, 'aiko_sendo_frameless'));
  const m = onBoard(0, 'aiko_sendo_frameless')[0];
  if (!['Rush', 'Twin Strike', 'Lifesteal'].every((k) => hasKeyword(m, k))) return 'keywords';
  endTurn();
  if (m.health !== 4) return `health ${m.health}`;
});
test('Requiem: a 3/3 Lifesteal weapon that destroys the minion it hits', () => {
  unarm(0); hero(0).health = 20;
  play(0, give(0, 'requiem'));
  if (hero(0).weapon?.name !== 'Requiem' || hero(0).weapon.attack !== 3) return JSON.stringify(hero(0).weapon);
  const m = blank(1, 0, 20); hero(0).attacksThisTurn = 0; attack(0, hero(0).uid, m.uid);
  if (!(m.destroyed || m.health <= 0)) return `survived ${m.health}`;
  if (hero(0).health !== 23) return `hero ${hero(0).health}`;
});

// ---- Full games ----
test('Full games with Ghouls finish without errors', () => {
  const partners = ['Vampires', 'Zombies', 'Monster Hunter', 'Fruit Ninjas', 'Witches', 'Robots'];
  for (let seed = 1; seed <= 12; seed++) {
    const fa = ['Ghouls', partners[seed % partners.length]]; const fb = ['Dragons', 'Plants'];
    const g = createGame({ seed, rules: { mulligan: false }, players: [{ name: 'A', factions: fa, deck: buildDeck(fa) }, { name: 'B', factions: fb, deck: buildDeck(fb) }] });
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
