// Rules tests for Divine's expansion, The Radiant Armory (24 cards).
//   node tools/test-divine-armory.mjs

import { existsSync } from 'node:fs';
import { buildDeck, FACTION_LISTS, FACTION_POOLS } from '../src/cards/index.js';
import { ART } from '../src/cards/art-manifest.js';
import { allCards, getCard } from '../src/engine/registry.js';
import { addToHand, summonMinion } from '../src/engine/core.js';
import { applyAction, createGame, getLegalActions } from '../src/engine/engine.js';
import { isLocked } from '../src/ui/unlocks.js';
import { chooseAction } from '../src/ai/smart.js';

let s, failures = 0, passed = 0;
function fresh() {
  const fa = ['Divine', 'Robots'], fb = ['Vampires', 'Robots'];
  s = createGame({ seed: 11, rules: { mulligan: false, secondPlayerPotions: false, openingHandHelp: false }, players: [{ name: 'A', factions: fa, deck: buildDeck(fa) }, { name: 'B', factions: fb, deck: buildDeck(fb) }] });
  for (const p of s.players) { p.hand = []; p.mana.max = 10; p.mana.current = 10; p.mana.primal = 0; p.mana.base = 10; }
  s.activePlayer = 0;
}
const pl = (p) => s.players[p];
const hero = (p) => pl(p).hero;
const put = (p, id) => { const m = summonMinion(s, p, id); m.sick = false; return m; };
const onBoard = (p, uid) => pl(p).board.some((m) => m.uid === uid);
function settle() {
  for (let i = 0; i < 60 && s.pending; i++) {
    if (s.pending.type === 'reaction') applyAction(s, { type: 'pass', player: s.pending.player });
    else if (s.pending.type === 'choice') applyAction(s, { type: 'choose', player: s.pending.player, index: 0 });
    else break;
  }
}
const play = (p, id, target) => { const inst = addToHand(s, p, id); applyAction(s, { type: 'play', player: p, card: inst.uid, ...(target != null ? { target } : {}) }); settle(); return inst; };
const attack = (a, d) => { applyAction(s, { type: 'attack', player: 0, attacker: a, defender: d }); settle(); };
const has = (m, k) => m.keywords.includes(k) || (m.lingerKeywords ?? []).some((x) => x.k === k) || (m.tempKeywords ?? []).includes(k);
const bare = (m, hp = 20) => { m.keywords = []; m.health = m.maxHealth = hp; return m; };
function test(name, fn) {
  fresh();
  try { const r = fn(); if (r) { failures++; console.log(`FAIL ${name}: ${r}`); } else { passed++; console.log(`ok   ${name}`); } }
  catch (e) { failures++; console.log(`FAIL ${name}: ${e.stack.split('\n').slice(0, 3).join(' | ')}`); }
}

const SET = allCards().filter((c) => c.set === 'The Radiant Armory');

test('24 cards: Divine, unlockable, art on disk, not in the standard 30 but in the pool', () => {
  if (SET.length !== 24) return `${SET.length} cards`;
  for (const c of SET) {
    if (c.faction !== 'Divine' || !c.extra) return `${c.id} not a Divine expansion card`;
    if (!ART[c.id] || !existsSync(ART[c.id])) return `${c.id} has no art`;
    if (FACTION_LISTS.Divine.includes(c.id)) return `${c.id} is in the standard 30`;
    if (!FACTION_POOLS.Divine.includes(c.id)) return `${c.id} is not in the Divine pool`;
    if (!isLocked(c.id)) return `${c.id} starts unlocked`;
  }
  const legends = SET.filter((c) => c.legendary).map((c) => c.id).sort().join(',');
  if (legends !== 'archangel_auriel,archangel_gabriel,archangel_michael,archangel_raphael,sunsplitter,the_holy_divine') return `legendaries: ${legends}`;
});

test('Dawnforged Blade: 2 Attack, +2 against a Dark minion', () => {
  const vamp = bare(put(1, 'vampire_gargoyle'));
  const bot = bare(put(1, 'scrapper_spider'));
  play(0, 'dawnforged_blade');
  if (hero(0).attack !== 2) return `Hero attack ${hero(0).attack}`;
  attack(hero(0).uid, vamp.uid);
  if (vamp.health !== 16) return `vampire at ${vamp.health} (wanted 16)`;
  s.players[0].hero.attacksThisTurn = 0; hero(0).exhausted = false;
  hero(0).attacked = false;
  hero(0).health = hero(0).maxHealth;
  attack(hero(0).uid, bot.uid);
  if (bot.health !== 20 && bot.health !== 18) return `robot at ${bot.health}`;
});

test('Hammer of the Dawnsmith: each swing gains 2 Armor', () => {
  const foe = bare(put(1, 'scrapper_spider')); foe.attack = 0; // no damage back to eat the Armor
  play(0, 'hammer_of_the_dawnsmith');
  const a0 = hero(0).armor;
  attack(hero(0).uid, foe.uid);
  if (hero(0).armor - a0 < 2) return `armor ${a0} -> ${hero(0).armor}`;
  if (foe.health !== 17) return `foe at ${foe.health} (wanted 17)`;
});

test('Seraph\'s Spear: Ranged (no damage back), heals the Hero 2 with Overheal', () => {
  const foe = bare(put(1, 'scrapper_spider'));
  foe.attack = 5;
  play(0, 'seraphs_spear');
  const before = hero(0).health, max = hero(0).maxHealth;
  attack(hero(0).uid, foe.uid);
  if (hero(0).health < before) return `took damage back (${before} -> ${hero(0).health})`;
  if (hero(0).maxHealth !== max + 2 && hero(0).health !== before + 2) return `no heal (hp ${hero(0).health}/${hero(0).maxHealth})`;
});

test('Bow of the First Morning: each swing heals friendly minions 1', () => {
  const ally = put(0, 'lightbound_acolyte'); ally.health = 1;
  const foe = bare(put(1, 'scrapper_spider'));
  play(0, 'bow_of_the_first_morning');
  attack(hero(0).uid, foe.uid);
  if (ally.health !== 2) return `ally at ${ally.health}`;
});

test('Censer Flail of Judgment: each swing gives every enemy minion Holy Flame 1', () => {
  const a = bare(put(1, 'scrapper_spider')), b = bare(put(1, 'vampire_gargoyle'));
  play(0, 'censer_flail_of_judgment');
  attack(hero(0).uid, a.uid);
  if ((a.holyFlame ?? 0) < 1 || (b.holyFlame ?? 0) < 1) return `flame ${a.holyFlame}/${b.holyFlame}`;
});

test('Sunsplitter: Lifesteal and +3 against Dark (5 + 3 = 8)', () => {
  const vamp = bare(put(1, 'vampire_gargoyle'), 30); vamp.attack = 0;
  hero(0).health = 10;
  play(0, 'sunsplitter');
  attack(hero(0).uid, vamp.uid);
  if (vamp.health !== 22) return `vampire at ${vamp.health} (wanted 22)`;
  if (hero(0).health < 18) return `no Lifesteal (hero ${hero(0).health})`;
});

test('Aegis of Dawn: Evade and 2 Temporary Health on a friendly minion', () => {
  const ally = put(0, 'lightbound_acolyte');
  play(0, 'aegis_of_dawn', ally.uid);
  if (!ally.keywords.includes('Evade')) return `keywords ${ally.keywords}`;
  if ((ally.tempHealth ?? 0) < 2 && ally.health < 4) return `no temporary health (${JSON.stringify({ h: ally.health, t: ally.tempHealth })})`;
});

test('Bulwark Seraph and Radiant Juggernaut: Taunt and Armor', () => {
  play(0, 'bulwark_seraph');
  if (hero(0).armor !== 3) return `armor ${hero(0).armor} after Bulwark`;
  play(0, 'radiant_juggernaut');
  if (hero(0).armor !== 8) return `armor ${hero(0).armor} after Juggernaut`;
  if (!pl(0).board.every((m) => m.keywords.includes('Taunt'))) return 'missing Taunt';
});

test('Wall of Halos: every friendly minion gets Taunt and 3 Temporary Health', () => {
  const a = put(0, 'lightbound_acolyte'), b = put(0, 'cherub_guardian');
  play(0, 'wall_of_halos');
  for (const m of [a, b]) { if (!has(m, 'Taunt')) return `${m.cardId} has no Taunt`; if ((m.tempHealth ?? 0) < 3 && !(m.lingerHealth ?? []).some((x) => x.amount >= 3)) return `${m.cardId} temp ${JSON.stringify([m.tempHealth, m.lingerHealth])}`; }
});

test('Mirror-Shield Paladin: losing Evade deals 3 to a random enemy minion', () => {
  const pal = put(0, 'mirror_shield_paladin');
  const foe = bare(put(1, 'scrapper_spider')); foe.attack = 2;
  s.activePlayer = 1; foe.sick = false;
  applyAction(s, { type: 'attack', player: 1, attacker: foe.uid, defender: pal.uid }); settle();
  if (pal.keywords.includes('Evade')) return 'still has Evade';
  if (foe.health !== 14) return `foe at ${foe.health} (wanted 14: 3 from the shield, 3 hit back)`;
});

test('Blessed Mail gains 5 Armor; Halo Helm gives +2 max Health and Taunt', () => {
  play(0, 'blessed_mail');
  if (hero(0).armor !== 5) return `armor ${hero(0).armor}`;
  const ally = put(0, 'lightbound_acolyte');
  const max = ally.maxHealth;
  play(0, 'halo_helm', ally.uid);
  if (ally.maxHealth !== max + 2) return `max ${ally.maxHealth}`;
  if (!ally.keywords.includes('Taunt')) return 'no Taunt';
});

test('Armorer of the Celestial Forge: equipping gives 2 Armor and +1 Durability', () => {
  put(0, 'armorer_of_the_celestial_forge');
  play(0, 'dawnforged_blade');
  if (hero(0).armor !== 2) return `armor ${hero(0).armor}`;
  if (hero(0).weapon.durability !== 3) return `durability ${hero(0).weapon.durability}`;
});

test('Valoriel: Rush and equips a 3/2 Sword of Heaven', () => {
  play(0, 'archangel_valoriel');
  const v = pl(0).board.find((m) => m.cardId === 'archangel_valoriel');
  if (!v.keywords.includes('Rush')) return 'no Rush';
  if (hero(0).weapon?.name !== 'Sword of Heaven' || hero(0).weapon.attack !== 3 || hero(0).weapon.durability !== 2) return `weapon ${JSON.stringify(hero(0).weapon)}`;
});

test('Seraphine: other minions get Evade and Temporary Health', () => {
  const a = put(0, 'lightbound_acolyte');
  play(0, 'archangel_seraphine');
  if (!has(a, 'Evade')) return 'ally has no Evade';
});

test('Thamuel summons two 1/1 Taunt Spirits', () => {
  play(0, 'archangel_thamuel');
  if (pl(0).board.filter((m) => m.cardId === 'spirit').length !== 2) return `board ${pl(0).board.map((m) => m.cardId)}`;
});

test('Oriphiel: Holy Flame 2 on every enemy, 4 on Dark ones', () => {
  const bot = bare(put(1, 'scrapper_spider')), vamp = bare(put(1, 'vampire_gargoyle'));
  play(0, 'archangel_oriphiel');
  if (bot.holyFlame !== 2) return `robot flame ${bot.holyFlame}`;
  if (vamp.holyFlame !== 4) return `vampire flame ${vamp.holyFlame}`;
});

test('Lumiel gives a friendly minion +1/+2 and Evade', () => {
  const ally = put(0, 'lightbound_acolyte');
  const [a, h] = [ally.attack, ally.health];
  play(0, 'archangel_lumiel', ally.uid);
  if (ally.attack !== a + 1 || ally.health !== h + 2 || !ally.keywords.includes('Evade')) return `${ally.attack}/${ally.health} ${ally.keywords}`;
});

test('Auriel: 5 Armor and a Divine weapon to Discover, 2 cheaper', () => {
  play(0, 'archangel_auriel');
  if (hero(0).armor !== 5) return `armor ${hero(0).armor}`;
  const got = pl(0).hand.map((c) => getCard(c.cardId));
  const w = got.find((c) => c.heroWeapon && c.faction === 'Divine');
  if (!w) return `hand ${got.map((c) => c.id)}`;
});

test('Michael: Rush, 4 damage to enemy Dark minions only, equips a 4/3 Lifesteal Flaming Sword', () => {
  const bot = bare(put(1, 'scrapper_spider')), vamp = bare(put(1, 'vampire_gargoyle'));
  play(0, 'archangel_michael');
  if (vamp.health !== 16 || bot.health !== 20) return `vampire ${vamp.health}, robot ${bot.health}`;
  const w = hero(0).weapon;
  if (w?.name !== 'Flaming Sword' || w.attack !== 4 || !w.keywords?.includes('Lifesteal')) return `weapon ${JSON.stringify(w)}`;
});

test('Gabriel draws 2 cards and heals the Hero 4', () => {
  hero(0).health = 20;
  play(0, 'archangel_gabriel');
  if (pl(0).hand.length !== 2) return `hand ${pl(0).hand.length}`;
  if (hero(0).health !== 24) return `hero ${hero(0).health}`;
});

test('Raphael heals 5 and Cleanses every friendly character', () => {
  const ally = put(0, 'lightbound_acolyte'); ally.health = 1; ally.burn = 2;
  hero(0).health = 10;
  play(0, 'archangel_raphael');
  if (hero(0).health !== 15) return `hero ${hero(0).health}`;
  if ((ally.burn ?? 0) !== 0) return `ally still burning (${ally.burn})`;
  if (ally.health < 2) return `ally at ${ally.health}`;
});

test('The Holy Divine: destroys enemy Dark minions, buffs the rest of your side, 10 Armor', () => {
  const bot = bare(put(1, 'scrapper_spider')), vamp = bare(put(1, 'vampire_gargoyle'));
  const ally = put(0, 'lightbound_acolyte');
  const [a, h] = [ally.attack, ally.health];
  play(0, 'the_holy_divine');
  if (onBoard(1, vamp.uid)) return 'Dark minion survived';
  if (!onBoard(1, bot.uid)) return 'non-Dark minion destroyed';
  if (ally.attack !== a + 2 || ally.health !== h + 2) return `ally ${ally.attack}/${ally.health}`;
  if (!ally.keywords.includes('Evade') || !ally.keywords.includes('Reborn')) return `ally keywords ${ally.keywords}`;
  const hd = pl(0).board.find((m) => m.cardId === 'the_holy_divine');
  if (hd.attack !== 10 || hd.keywords.includes('Reborn')) return 'The Holy Divine buffed itself';
  if (hero(0).armor !== 10) return `armor ${hero(0).armor}`;
});

test('AI vs AI: decks full of the new cards play to the end without errors', () => {
  // Divine + Vampires with 20 Radiant Armory cards swapped in (legendaries once), so the AI casts them.
  const fa = ['Divine', 'Vampires'], fb = ['Demons', 'Robots'];
  const armory = [...SET.filter((c) => !c.legendary).flatMap((c) => [c.id]), ...SET.filter((c) => c.legendary).map((c) => c.id)];
  const deck = [...armory, ...buildDeck(fa)].slice(0, buildDeck(fa).length);
  const played = new Set();
  for (const seed of [3, 4, 5, 6]) {
    const g = createGame({ seed, players: [{ name: 'A', factions: fa, deck }, { name: 'B', factions: fb, deck: buildDeck(fb) }] });
    let i = 0;
    for (; i < 3000 && !g.gameOver; i++) {
      const a = chooseAction(g, { beam: 2, depth: 2, maxNodes: 60 });
      if (a.type === 'play') { const c = g.players[a.player].hand.find((h) => h.uid === a.card); if (c && getCard(c.cardId).set === 'The Radiant Armory') played.add(c.cardId); }
      applyAction(g, a);
    }
    if (!g.gameOver) return `seed ${seed} did not finish in ${i} actions`;
  }
  if (played.size < 8) return `the AI only played ${played.size} of the new cards (${[...played]})`;
  console.log(`     (the AI played ${played.size} different Radiant Armory cards)`);
});

console.log(`\n${passed} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
