// Rules tests for Monster Hunter weapons.
//   node tools/test-monster-hunter.mjs

import { existsSync } from 'node:fs';
import { buildDeck, FACTION_LISTS, FACTION_POOLS } from '../src/cards/index.js';
import { ART } from '../src/cards/art-manifest.js';
import { getCard } from '../src/engine/registry.js';
import { addToHand, summonMinion } from '../src/engine/core.js';
import { applyAction, createGame, getLegalActions } from '../src/engine/engine.js';

let s, failures = 0, passed = 0;
function fresh() {
  const fa = ['Monster Hunter', 'Divine'], fb = ['Vampires', 'Robots'];
  s = createGame({ seed: 7, rules: { mulligan: false, secondPlayerPotions: false, openingHandHelp: false }, players: [{ name: 'A', factions: fa, deck: buildDeck(fa) }, { name: 'B', factions: fb, deck: buildDeck(fb) }] });
  for (const p of s.players) { p.hand = []; p.mana.max = 10; p.mana.current = 10; p.mana.primal = 0; p.mana.base = 10; }
  s.activePlayer = 0;
}
const pl = (p) => s.players[p];
const hero = (p) => pl(p).hero;
const put = (p, id) => { const m = summonMinion(s, p, id); m.sick = false; return m; };
function settle() {
  for (let i = 0; i < 60 && s.pending; i++) {
    if (s.pending.type === 'reaction') applyAction(s, { type: 'pass', player: s.pending.player });
    else if (s.pending.type === 'choice') applyAction(s, { type: 'choose', player: s.pending.player, index: 0 });
    else break;
  }
}
const play = (p, id) => { const inst = addToHand(s, p, id); applyAction(s, { type: 'play', player: p, card: inst.uid }); settle(); };
const canAttack = (a, d) => getLegalActions(s).some((x) => x.type === 'attack' && x.attacker === a && x.defender === d);
const attack = (a, d) => { applyAction(s, { type: 'attack', player: 0, attacker: a, defender: d }); settle(); };
function test(name, fn) {
  fresh();
  try { const r = fn(); if (r) { failures++; console.log(`FAIL ${name}: ${r}`); } else { passed++; console.log(`ok   ${name}`); } }
  catch (e) { failures++; console.log(`FAIL ${name}: ${e.stack.split('\n').slice(0, 3).join(' | ')}`); }
}

test('Hidden Hand Cannon can shoot an enemy minion as well as the enemy Hero', () => {
  const foe = put(1, 'scrapper_spider'); // no Taunt, so the Hero is a legal target too
  foe.keywords = [];
  play(0, 'hidden_hand_cannon');
  if (!canAttack(hero(0).uid, foe.uid)) return 'cannot target the minion';
  if (!canAttack(hero(0).uid, hero(1).uid)) return 'cannot target the Hero';
  attack(hero(0).uid, foe.uid);
  if (pl(1).board.some((m) => m.uid === foe.uid)) return 'minion survived a 7-Attack shot';
});

test('Cross-Hilt Longsword: +3 Attack against Vampires (4 + 3 = 7 damage)', () => {
  const foe = put(1, 'vampire_gargoyle');
  foe.health = foe.maxHealth = 20;
  play(0, 'cross_hilt_longsword');
  attack(hero(0).uid, foe.uid);
  if (foe.health !== 13) return `vampire at ${foe.health}/20 (wanted 13)`;
});

test('Cross-Hilt Longsword: no bonus against a non-Vampire', () => {
  const foe = put(1, 'scrapper_spider');
  foe.health = foe.maxHealth = 20;
  play(0, 'cross_hilt_longsword');
  attack(hero(0).uid, foe.uid);
  if (foe.health !== 16) return `robot at ${foe.health}/20 (wanted 16)`;
});


// ---- Sun & Moon expansion ----
const dual = () => { hero(0).dualWield = true; };
const hp = (m) => m.health;
const big = (p, id) => { const m = put(p, id); m.keywords = []; m.health = m.maxHealth = 30; return m; };
const swing = (d) => { applyAction(s, { type: 'attack', player: 0, attacker: hero(0).uid, defender: d }); settle(); };

test('Sun & Moon: 15 unlockable cards with art, the Hunting Dog token, two special revolver frames', () => {
  const ids = ['gunsmiths_apprentice', 'hunting_dog_handler', 'bounty_board', 'blessed_bandolier', 'silvered_net', 'silver_smelter', 'trophy_snare', 'veterans_scar', 'the_monster_codex', 'crossfire_execution', 'the_hunt_master', 'cryptid_cleaver', 'graveshredder', 'moon_revolver', 'sun_revolver'];
  const extra = FACTION_POOLS['Monster Hunter'].filter((id) => !FACTION_LISTS['Monster Hunter'].includes(id));
  for (const id of ids) if (!extra.includes(id)) return `${id} not an expansion card`;
  for (const id of [...ids, 'hunting_dog']) if (!ART[id] || !existsSync(ART[id])) return `no art for ${id}`;
  for (const id of ['moon_revolver', 'sun_revolver']) if (!existsSync(getCard(id).frameArt)) return `no frame for ${id}`;
});
test('Gunsmith\'s Apprentice: +1 Attack to your weapon', () => {
  play(0, 'rowan_stake'); play(0, 'gunsmiths_apprentice');
  if (hero(0).weapon.attack !== 3) return `weapon ${hero(0).weapon.attack}`;
});
test('Hunting Dog Handler: summons a 1/1 Rush Hunting Dog', () => {
  play(0, 'hunting_dog_handler');
  const dog = pl(0).board.find((m) => m.cardId === 'hunting_dog');
  if (!dog || !dog.keywords.includes('Rush')) return 'no dog';
});
test('Bounty Board: Discovers a Monster Hunter weapon that costs 1 less', () => {
  play(0, 'bounty_board');
  const got = pl(0).hand[pl(0).hand.length - 1];
  const c = getCard(got?.cardId);
  if (!c?.heroWeapon || c.faction !== 'Monster Hunter') return `got ${got?.cardId}`;
  if ((got.costMod ?? 0) !== -1) return `costMod ${got.costMod}`;
});
test('Blessed Bandolier: both weapons +1/+1', () => {
  dual(); play(0, 'rowan_stake'); play(0, 'silver_bolt_crossbow'); play(0, 'blessed_bandolier');
  const [a, b] = [hero(0).weapon, hero(0).weapon2];
  if (a.attack !== 3 || a.durability !== 2 || b.attack !== 4 || b.durability !== 4) return `${a.attack}/${a.durability} ${b.attack}/${b.durability}`;
});
test('Silver Smelter: the weapon you equip (either slot) gains +1 Durability', () => {
  dual(); put(0, 'silver_smelter'); play(0, 'rowan_stake'); play(0, 'silver_bolt_crossbow');
  if (hero(0).weapon.durability !== 2 || hero(0).weapon2.durability !== 4) return `${hero(0).weapon.durability} ${hero(0).weapon2.durability}`;
});
test('Silvered Net: an attacking enemy minion hits for 1', () => {
  const t = addToHand(s, 0, 'silvered_net'); applyAction(s, { type: 'play', player: 0, card: t.uid }); settle();
  const foe = put(1, 'vampire_gargoyle'); foe.keywords = []; foe.attack = 6;
  s.activePlayer = 1;
  const before = hero(0).health;
  applyAction(s, { type: 'attack', player: 1, attacker: foe.uid, defender: hero(0).uid }); settle();
  if (before - hero(0).health !== 1) return `took ${before - hero(0).health}`;
});
test('Trophy Snare: when your Hero kills a minion, draw and gain 2 Armor', () => {
  const t = addToHand(s, 0, 'trophy_snare'); applyAction(s, { type: 'play', player: 0, card: t.uid }); settle();
  play(0, 'rowan_stake');
  const foe = put(1, 'scrapper_spider'); foe.keywords = []; foe.health = foe.maxHealth = 1;
  const hand = pl(0).hand.length, armor = hero(0).armor;
  swing(foe.uid);
  if (pl(0).hand.length !== hand + 1 || hero(0).armor !== armor + 2) return `hand ${pl(0).hand.length - hand} armor ${hero(0).armor - armor}`;
});
test('Veteran\'s Scar: Armor equal to your Hero\'s Attack', () => {
  play(0, 'silver_bolt_crossbow'); const a = hero(0).armor; play(0, 'veterans_scar');
  if (hero(0).armor - a !== 3) return `armor +${hero(0).armor - a}`;
});
test('The Monster Codex: a prey weapon gets its bonus against any realm this turn', () => {
  play(0, 'holy_water_sprayer'); // 2 Attack, +2 against Ghosts
  const foe = big(1, 'scrapper_spider');
  play(0, 'the_monster_codex'); swing(foe.uid);
  if (30 - hp(foe) !== 4) return `dealt ${30 - hp(foe)}`;
});
test('Crossfire Execution: damage equal to both weapons\' Attack', () => {
  dual(); play(0, 'rowan_stake'); play(0, 'silver_bolt_crossbow');
  const foe = big(1, 'scrapper_spider');
  const t = addToHand(s, 0, 'crossfire_execution'); applyAction(s, { type: 'play', player: 0, card: t.uid, target: foe.uid }); settle();
  if (30 - hp(foe) !== 5) return `dealt ${30 - hp(foe)}`;
});
test('The Hunt Master: your Hero attacks two extra times each turn', () => {
  put(0, 'the_hunt_master'); play(0, 'silver_bolt_crossbow');
  const foe = big(1, 'scrapper_spider');
  for (let i = 0; i < 3; i++) { if (!canAttack(hero(0).uid, foe.uid)) return `stopped after ${i}`; swing(foe.uid); }
  if (canAttack(hero(0).uid, foe.uid)) return 'a fourth attack';
});
test('Cryptid Cleaver: +2 Attack against a Cryptid, not against others', () => {
  play(0, 'cryptid_cleaver');
  const cr = big(1, 'the_pale_wanderer'); swing(cr.uid);
  if (30 - hp(cr) !== 5) return `cryptid took ${30 - hp(cr)}`;
});
test('Graveshredder: fills both slots, four attacks a turn, +2 against Zombies', () => {
  dual(); play(0, 'rowan_stake'); play(0, 'silver_bolt_crossbow'); play(0, 'graveshredder');
  if (hero(0).weapon?.cardId !== 'graveshredder' || hero(0).weapon2) return 'slots';
  const z = big(1, 'walker');
  for (let i = 0; i < 4; i++) { if (!canAttack(hero(0).uid, z.uid)) return `stopped after ${i}`; swing(z.uid); }
  if (canAttack(hero(0).uid, z.uid)) return 'a fifth attack';
  if (30 - hp(z) !== 16) return `zombie took ${30 - hp(z)}`;
});
test('Moon: Ranged, +3 Attack against a Dark minion', () => {
  play(0, 'moon_revolver');
  const v = big(1, 'vampire_gargoyle'); const h = hero(0).health; swing(v.uid);
  if (30 - hp(v) !== 6) return `dealt ${30 - hp(v)}`;
  if (hero(0).health !== h) return 'took return damage';
});
test('Sun: after attacking with it, 2 damage to the enemy Hero', () => {
  play(0, 'sun_revolver');
  const foe = big(1, 'scrapper_spider'); const eh = hero(1).health; swing(foe.uid);
  if (eh - hero(1).health !== 2) return `enemy Hero took ${eh - hero(1).health}`;
});
test('Eclipse: Sun + Moon give +3 Attack, Lifesteal, and no Durability lost', () => {
  dual(); play(0, 'moon_revolver'); play(0, 'sun_revolver');
  const foe = big(1, 'scrapper_spider');
  hero(0).health = 20;
  swing(foe.uid); // Moon: 3 + 3
  swing(foe.uid); // Sun: 4 + 3, then 2 to the Hero
  if (30 - hp(foe) !== 13) return `dealt ${30 - hp(foe)}`;
  if (hero(0).weapon.durability !== 3 || hero(0).weapon2.durability !== 2) return 'durability lost';
  if (hero(0).health <= 20) return `no lifesteal (${hero(0).health})`;
});

console.log(`\n${passed} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
