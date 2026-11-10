// Rules tests for the Arsenal weapons (Aliens, Demons, Acidic, Divine, Vampires) and the Aliens balance pass.
//   node tools/test-arsenal.mjs

import { buildDeck } from '../src/cards/index.js';
import { getCard } from '../src/engine/registry.js';
import { addToHand, dealDamage, radiationOf, summonMinion } from '../src/engine/core.js';
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

test("Bloodripper's Talon: a 1/4 weapon for 1", 'Vampires', () => {
  play('bloodrippers_talon');
  if (hero(0).weapon?.attack !== 1 || hero(0).weapon.durability !== 4 || getCard('bloodrippers_talon').cost !== 1) return 'not a 1-cost 1/4';
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

test('The Arsenal weapons are unlockable (extra) cards in their own set', 'Aliens', () => {
  for (const id of ['ray_gun', 'satans_infernal_pitchfork', 'liquifier', 'archangels_divine_shield', 'holy_flail_of_righteous_fury', 'bloodrippers_talon']) {
    const c = getCard(id);
    if (!c.extra || c.set !== 'Arsenal' || !c.heroWeapon) return `${id}: ${JSON.stringify({ extra: c.extra, set: c.set })}`;
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

console.log(`\n${passed} passed, ${failures} failed`);
if (failures) process.exit(1);
