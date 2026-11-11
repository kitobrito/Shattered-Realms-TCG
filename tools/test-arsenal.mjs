// Rules tests for the Arsenal weapons (Aliens, Demons, Acidic, Divine, Vampires) and the Aliens balance pass.
//   node tools/test-arsenal.mjs

import { existsSync } from 'node:fs';
import { buildDeck } from '../src/cards/index.js';
import { getCard } from '../src/engine/registry.js';
import { addToHand, dealDamage, hasKeyword, radiationOf, summonMinion } from '../src/engine/core.js';
import { applyAction, createGame } from '../src/engine/engine.js';

let s, failures = 0, passed = 0;
function fresh(faction) {
  const fa = [faction, faction === 'Robots' ? 'Bees' : 'Robots'], fb = ['Bees', 'Plants'];
  s = createGame({ seed: 7, rules: { mulligan: false, secondPlayerPotions: false, openingHandHelp: false }, players: [{ name: 'A', factions: fa, deck: buildDeck(fa) }, { name: 'B', factions: fb, deck: buildDeck(fb) }] });
  for (const p of s.players) { p.hand = []; p.mana.max = 10; p.mana.current = 10; p.mana.primal = 0; p.mana.base = 10; }
  s.activePlayer = 0;
}
const hero = (p) => s.players[p].hero;
function settle() {
  for (let i = 0; i < 60 && s.pending; i++) {
    if (s.pending.type === 'reaction') applyAction(s, { type: 'pass', player: s.pending.player });
    else if (s.pending.type === 'choice') applyAction(s, { type: 'choose', player: s.pending.player, index: 0 });
    else break;
  }
}
const play = (id, target) => { const inst = addToHand(s, 0, id); applyAction(s, { type: 'play', player: 0, card: inst.uid, ...(target != null ? { target } : {}) }); settle(); };
const attack = (d) => { applyAction(s, { type: 'attack', player: 0, attacker: hero(0).uid, defender: d }); settle(); };
// A plain enemy minion: no keywords, so the Hero can swing at it.
const dummy = (attack = 3, health = 20) => { const m = summonMinion(s, 1, 'nightwatch_recruit'); m.keywords = []; m.attack = attack; m.health = m.maxHealth = health; return m; };
function test(name, faction, fn) {
  fresh(faction);
  try { const r = fn(); if (r) { failures++; console.log(`FAIL ${name}: ${r}`); } else { passed++; console.log(`ok   ${name}`); } }
  catch (e) { failures++; console.log(`FAIL ${name}: ${e.stack.split('\n').slice(0, 3).join(' | ')}`); }
}

test('Ray Gun: 3/3 Ranged; each shot gives Radiation 1 and Burn 1, and the Hero takes nothing back', 'Aliens', () => {
  play('ray_gun');
  const w = hero(0).weapon;
  if (!(w?.attack === 3 && w.durability === 3 && w.ranged)) return `weapon ${JSON.stringify(w)}`;
  const m = dummy(); const hp = hero(0).health;
  attack(m.uid);
  if ((m.burn ?? 0) < 1) return `burn ${m.burn}`;
  if (radiationOf(m) !== 1) return `Radiation ${radiationOf(m)}`;
  // Ranged: no hit back. (Radiation's own rule lowers every un-irradiated character's Health by 1, the Hero's too.)
  if (s.log.some((l) => /deals \d+ to A\b/.test(l.msg ?? l))) return 'the Hero took damage back';
  if (hero(0).health < hp - 1) return `the Hero lost ${hp - hero(0).health} Health`;
  if (w.durability !== 2) return `durability ${w.durability}`;
});

test("Satan's Infernal Pitchfork: 6/6; sets minions and the enemy Hero on fire", 'Demons', () => {
  play('satans_infernal_pitchfork');
  if (hero(0).weapon?.attack !== 6 || hero(0).weapon.durability !== 6) return 'not 6/6';
  const m = dummy(3, 20);
  attack(m.uid);
  if (m.health !== 14 || (m.burn ?? 0) < 1) return `minion hp ${m.health}, burn ${m.burn}`;
  hero(0).attacksThisTurn = 0;
  attack(hero(1).uid);
  if ((hero(1).burn ?? 0) < 1) return `enemy Hero burn ${hero(1).burn}`;
});

test('Liquifier: 2/3 Ranged; Corrosion 3 on the minion it shoots', 'Acidic', () => {
  play('liquifier');
  if (!(hero(0).weapon?.ranged && hero(0).weapon.attack === 2 && hero(0).weapon.durability === 3)) return 'not 2/3 Ranged';
  const m = dummy(4, 20);
  attack(m.uid);
  if (m.attack !== 1) return `attack ${m.attack} (want 4 - 3 = 1)`;
  if (m.health !== 18) return `health ${m.health}`;
});

test("Archangel's Divine Shield: prevents each hit to the Hero for 1 Durability, then breaks", 'Divine', () => {
  play('archangels_divine_shield');
  const h = hero(0), hp = h.health;
  if (!(h.weapon?.heroShield && h.weapon.attack === 1 && h.weapon.durability === 4)) return 'not a 1/4 shield';
  dealDamage(s, null, h.uid, 5);
  if (h.health !== hp || h.weapon.durability !== 3) return `after 5 damage: hp ${h.health}, durability ${h.weapon?.durability}`;
  for (let i = 0; i < 3; i++) dealDamage(s, null, h.uid, 2);
  if (h.health !== hp || h.weapon) return `after 4 hits: hp ${h.health}, weapon ${h.weapon?.name}`;
  dealDamage(s, null, h.uid, 3);
  if (h.health !== hp - 3) return 'damage did not land once the shield was gone';
});

test("Archangel's Divine Shield: swinging at a minion uses 1, the hit back costs 1 more, no Health lost", 'Divine', () => {
  play('archangels_divine_shield');
  const h = hero(0), hp = h.health, m = dummy(3, 20);
  attack(m.uid);
  if (h.health !== hp || h.weapon?.durability !== 2) return `hp ${h.health}, durability ${h.weapon?.durability}`;
});

test('Holy Flail of Righteous Fury: 1/3; gives the target Holy Flame 2', 'Divine', () => {
  play('holy_flail_of_righteous_fury');
  const m = dummy();
  attack(m.uid);
  if ((m.holyFlame ?? 0) !== 2) return `holy flame ${m.holyFlame}`;
});

test("Bloodripper's Talon: 1/6 with Twin Strike; each hit adds Bleed 1 (it stacks)", 'Vampires', () => {
  play('bloodrippers_talon');
  const w = hero(0).weapon;
  if (w?.attack !== 1 || w.durability !== 6 || getCard('bloodrippers_talon').cost !== 1) return `weapon ${JSON.stringify(w)}`;
  if (!hasKeyword(hero(0), 'Twin Strike')) return 'the Hero has no Twin Strike';
  const m = dummy(0, 30);
  attack(m.uid);
  if (m.bleed !== 1) return `after one hit Bleed ${m.bleed}`;
  hero(0).attacksThisTurn = 1; // Twin Strike: a second swing this turn
  attack(m.uid);
  if (m.bleed !== 2) return `after two hits Bleed ${m.bleed}`;
});

test('Bleed: at the end of the bleeder\'s turn the target takes its Bleed as damage, and it stays', 'Vampires', () => {
  const m = dummy(0, 30);
  m.bleed = 3; m.bleedBy = 0;
  const hp = m.health;
  applyAction(s, { type: 'endTurn', player: 0 }); settle();
  if (m.health !== hp - 3) return `health ${hp} -> ${m.health}`;
  if (m.bleed !== 3) return `Bleed fell to ${m.bleed}`;
});

test('Bleed: a Vampire minion that hits a Bleeding enemy heals half the damage (rounded up); others don\'t', 'Vampires', () => {
  const foe = dummy(0, 30); foe.bleed = 1;
  const vamp = summonMinion(s, 0, 'blood_drinker'); vamp.health = 1; vamp.maxHealth = 10; vamp.sick = false; vamp.attack = 3;
  dealDamage(s, vamp.uid, foe.uid, 3);
  if (vamp.health !== 3) return `Vampire minion health ${vamp.health} (want 1 + ceil(3/2) = 3)`;
  const plain = dummy(0, 30); // not bleeding
  dealDamage(s, vamp.uid, plain.uid, 3);
  if (vamp.health !== 3) return 'healed from a target that wasn\'t bleeding';
  const bot = summonMinion(s, 0, 'scrapper_spider'); bot.health = 1; bot.maxHealth = 10;
  dealDamage(s, bot.uid, foe.uid, 2);
  if (bot.health !== 1) return 'a non-Vampire minion healed';
});

test("Bleed: the Hero swinging Bloodripper's Talon heals from a Bleeding target", 'Vampires', () => {
  play('bloodrippers_talon');
  hero(0).health = 20;
  const m = dummy(0, 30); m.bleed = 1;
  attack(m.uid);
  if (hero(0).health !== 21) return `Hero health ${hero(0).health} (want 20 + ceil(1/2) = 21)`;
});

test('A weapon effect leaves with the weapon (no Burn from a bare-handed Hero afterwards)', 'Demons', () => {
  play('satans_infernal_pitchfork');
  hero(0).weapon.durability = 1;
  const a = dummy(0, 30); attack(a.uid);
  if (hero(0).weapon) return 'weapon should have broken';
  hero(0).attacksThisTurn = 0; hero(0).attack = 2;
  const b = dummy(0, 30); attack(b.uid);
  if ((b.burn ?? 0) > 0) return 'the broken Pitchfork still burns';
});

test('The Arsenal weapons are unlockable Legendary Weapons in their realm\'s legendary weapon frame', 'Aliens', () => {
  for (const id of ['ray_gun', 'satans_infernal_pitchfork', 'liquifier', 'archangels_divine_shield', 'holy_flail_of_righteous_fury', 'bloodrippers_talon']) {
    const c = getCard(id);
    if (!c.extra || c.set !== 'Arsenal' || !c.heroWeapon || !c.legendary) return `${id}: ${JSON.stringify({ extra: c.extra, set: c.set, legendary: c.legendary })}`;
    if (!c.frameArt || !existsSync(new URL(`../${c.frameArt}`, import.meta.url))) return `${id}: frame ${c.frameArt}`;
  }
});

test('Aliens balance pass: Probe Drone 2/3, Gene Mutation +1/+1, Replication copies (2) less, UFO Abductor 7', 'Aliens', () => {
  if (getCard('probe_drone').health !== 3) return 'Probe Drone';
  if (getCard('ufo_abductor').cost !== 7) return 'UFO Abductor';
  const m = summonMinion(s, 0, 'probe_drone'); const a = m.attack, h = m.health;
  play('gene_mutation', m.uid);
  if (m.attack < a + 1 || m.health < h + 1) return `Gene Mutation: ${a}/${h} -> ${m.attack}/${m.health}`;
  const before = s.players[0].hand.length;
  play('replication_protocol', m.uid);
  const copies = s.players[0].hand.slice(before);
  if (copies.length !== 2) return `${copies.length} copies`;
  const deck = buildDeck(['Aliens', 'Robots']);
  if (!deck.includes('grey_scout') || !deck.includes('gene_thief_operative') || deck.includes('terraform') || deck.includes('experimental_containment')) return 'pair deck swap';
});

test('Shield-Eater (Legendary): Dissolves an enemy minion; its Essence holds all of it (Attack, Health and keywords)', 'Acidic', () => {
  const c = getCard('shield_eater');
  if (!c.legendary || c.frameArt !== 'art/frames/legendary-weapon-acidic.png') return 'not legendary in the Acidic frame';
  const m = summonMinion(s, 1, 'nightwatch_recruit'); const card = getCard('nightwatch_recruit');
  m.keywords = ['Taunt'];
  const before = s.players[0].hand.length;
  play('shield_eater', m.uid);
  const ess = s.players[0].hand.slice(before).map((h) => getCard(h.cardId)).find((x) => /^Essence of/.test(x?.name ?? ''));
  if (!ess) return 'no Essence';
  const fx = ess.effects[0];
  if (fx.attack !== card.attack || fx.health !== card.health || !(fx.keywords ?? []).includes('Taunt')) return `Essence gives ${JSON.stringify(fx)}`;
  // Strip the Plating still gives one random piece.
  const m2 = summonMinion(s, 1, 'nightwatch_recruit'); m2.keywords = ['Taunt'];
  s.players[0].mana.current = 10;
  const b2 = s.players[0].hand.length;
  play('strip_the_plating', m2.uid);
  const e2 = s.players[0].hand.slice(b2).map((h) => getCard(h.cardId)).find((x) => /^Essence of/.test(x?.name ?? ''));
  const pieces = ['attack', 'health', 'keywords'].filter((k) => e2.effects[0][k] != null);
  if (pieces.length !== 1) return `Strip the Plating gave ${pieces.join('+')}`;
});

test("Caustic Reservoir spells out the rule: a minion at 0 Attack with 6 Corrosion is Dissolved", 'Acidic', () => {
  if (!/A minion at 0 Attack with 6 or more Corrosion on it is Dissolved/.test(getCard('caustic_reservoir').text)) return 'text';
  const m = summonMinion(s, 1, 'nightwatch_recruit'); m.attack = 1; m.corrosion = 5;
  play('splash_of_acid', m.uid);
  if (!m.destroyed && m.health > 0) return `still alive (attack ${m.attack}, corrosion ${m.corrosion})`;
});

test('The Great Dissolution: Taunt; an enemy minion that attacks it gets Corrosion 2 before the hit (and so does one it attacks)', 'Acidic', () => {
  const g = summonMinion(s, 0, 'the_great_dissolution'); g.sick = false;
  if (!hasKeyword(g, 'Taunt')) return 'no Taunt';
  // The enemy attacks it: 5 Attack corroded to 3 before damage, so it takes 3.
  s.activePlayer = 1;
  const foe = summonMinion(s, 1, 'nightwatch_recruit'); foe.keywords = []; foe.attack = 5; foe.health = foe.maxHealth = 20; foe.sick = false;
  const hp = g.health;
  applyAction(s, { type: 'attack', player: 1, attacker: foe.uid, defender: g.uid }); settle();
  if (foe.attack !== 3) return `attacker Attack ${foe.attack} (want 5 - 2 = 3)`;
  if (g.health !== hp - 3) return `took ${hp - g.health} (want 3)`;
  // It attacks an enemy: the defender is corroded first, so it hits back for 2 less.
  s.activePlayer = 0;
  const d = summonMinion(s, 1, 'nightwatch_recruit'); d.keywords = []; d.attack = 4; d.health = d.maxHealth = 20;
  const hp2 = g.health; g.attacksThisTurn = 0;
  applyAction(s, { type: 'attack', player: 0, attacker: g.uid, defender: d.uid }); settle();
  if (d.attack !== 2 || g.health !== hp2 - 2) return `defender Attack ${d.attack}, hit back for ${hp2 - g.health} (want 2 and 2)`;
});

console.log(`\n${passed} passed, ${failures} failed`);
if (failures) process.exit(1);
