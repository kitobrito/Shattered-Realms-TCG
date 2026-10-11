// Rules tests for the expansion cards (15 Radioactive, 15 Vampires, 15 Dinosaurs).
// Each test sets up a small board, plays the card through the real engine,
// and checks the outcome.   node tools/test-expansion-cards.mjs

import { buildDeck } from '../src/cards/index.js';
import { addToHand, radiationOf, summonMinion, hasKeyword, effectiveAttack } from '../src/engine/core.js';
import { applyAction, createGame, getLegalActions } from '../src/engine/engine.js';
import { getCard } from '../src/engine/registry.js';

let s;
let failures = 0;
let passed = 0;

function fresh(fa = ['Radioactive', 'Vampires']) {
  const fb = ['Vampires', 'Robots'];
  s = createGame({ seed: 5, rules: { mulligan: false, secondPlayerPotions: false, openingHandHelp: false },
    players: [{ name: 'A', factions: fa, deck: buildDeck(fa) }, { name: 'B', factions: fb, deck: buildDeck(fb) }] });
  for (const p of s.players) { p.hand = []; p.mana.max = 10; p.mana.current = 10; p.mana.primal = 0; p.mana.base = 10; }
}
const pl = (p) => s.players[p];
const put = (p, id, opts = {}) => { const m = summonMinion(s, p, id, opts); m.sick = false; return m; };
const give = (p, id) => addToHand(s, p, id);
const minion = (uid) => s.players.flatMap((x) => x.board).find((m) => m.uid === uid);
const msgs = () => s.log.map((l) => l.msg);

// Resolve pending decisions: reactions pass unless `react` picks one; choices take the first option.
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

function test(name, fn, factions) {
  fresh(factions);
  try {
    const problem = fn();
    if (problem) { failures++; console.log(`FAIL ${name}: ${problem}`); } else { passed++; console.log(`ok   ${name}`); }
  } catch (e) { failures++; console.log(`FAIL ${name}: threw ${e.stack.split('\n').slice(0, 3).join(' | ')}`); }
}

// ---- Radioactive ----------------------------------------------------------------
test('Fallout Scavenger: +1/+1 only if the enemy has Radiation', () => {
  play(0, give(0, 'fallout_scavenger'));
  const a = pl(0).board.at(-1);
  if (a.attack !== 1 || a.maxHealth !== 2) return `no Radiation: got ${a.attack}/${a.maxHealth}`;
  pl(1).hero.radPerm = 1;
  play(0, give(0, 'fallout_scavenger'));
  const b = pl(0).board.at(-1);
  // (the irradiated enemy Hero's aura also lowers its Health by 1, so check Attack)
  if (b.attack !== 2) return `with Radiation: Attack ${b.attack}`;
});
test('Isotope Rat: Exit irradiates an enemy minion', () => {
  const foe = put(1, 'vampire_gargoyle');
  const rat = put(0, 'isotope_rat');
  attack(0, rat.uid, foe.uid);
  if (pl(0).board.includes(rat)) return 'rat did not die';
  if (radiationOf(minion(foe.uid)) !== 1) return `enemy Radiation ${radiationOf(minion(foe.uid))}`;
});
test('Containment Officer: +1 Health when another friendly minion gains Radiation', () => {
  const off = put(0, 'containment_officer');
  const other = put(0, 'vampire_gargoyle');
  play(0, give(0, 'controlled_exposure'), other.uid);
  const grew = () => msgs().filter((m) => /Containment Officer gets \+1 Health/.test(m)).length;
  if (grew() !== 1) return 'did not grow';
  play(0, give(0, 'controlled_exposure'), off.uid);
  if (grew() !== 1) return 'grew from its own Radiation';
});
test('Gamma Hound: 1 damage to irradiated enemy minions only', () => {
  const hot = put(1, 'vampire_gargoyle'); hot.radPerm = 1;
  const cold = put(1, 'vampire_matriarch');
  const coldHp = cold.health;
  play(0, give(0, 'gamma_hound'));
  if (!msgs().some((m) => /Gamma Hound deals 1 to Vampire Gargoyle/.test(m))) return 'irradiated minion not hit';
  if (msgs().some((m) => /deals 1 to Vampire Matriarch/.test(m)) || cold.health < coldHp - 1) return 'clean minion was hit';
});
test('Irradiated Behemoth: heals your Hero 2 when it gains Radiation', () => {
  const b = put(0, 'irradiated_behemoth');
  pl(0).hero.health = 20;
  play(0, give(0, 'controlled_exposure'), b.uid);
  if (pl(0).hero.health < 21) return `Hero Health ${pl(0).hero.health} (want 22, or 21 after the aura)`;
  if (!hasKeyword(b, 'Taunt')) return 'no Taunt';
});
test('Isotope Engineer: irradiates a friendly minion and Discovers a spell', () => {
  const ally = put(0, 'vampire_gargoyle');
  const before = pl(0).hand.length;
  play(0, give(0, 'isotope_engineer'), ally.uid);
  if (radiationOf(ally) !== 1) return `ally Radiation ${radiationOf(ally)}`;
  const got = pl(0).hand.length - before;
  if (got !== 1) return `hand change ${got}`;
  if (getCard(pl(0).hand.at(-1).cardId).type !== 'spell') return 'Discovered card is not a spell';
});
test('Critical Mass Mutant: +1/+1 per irradiated enemy character', () => {
  const g = put(1, 'vampire_gargoyle');
  const m2 = put(1, 'vampire_matriarch');
  put(1, 'vampire_bat');
  pl(1).hero.radPerm = 1; g.radPerm = 1; m2.radPerm = 1;
  play(0, give(0, 'critical_mass_mutant'));
  const m = pl(0).board.at(-1);
  if (m.attack !== 8) return `Attack ${m.attack} (want 8)`;
});
test('Meltdown Colossus: irradiates an enemy minion at end of turn', () => {
  put(0, 'meltdown_colossus');
  const foe = put(1, 'the_crimson_king');
  endTurn();
  if (radiationOf(minion(foe.uid)) < 1) return 'no Radiation after end of turn';
});
test('Controlled Exposure: irradiates a friendly minion and draws', () => {
  const ally = put(0, 'vampire_gargoyle');
  const inst = give(0, 'controlled_exposure');
  const before = pl(0).hand.length;
  play(0, inst, ally.uid);
  if (radiationOf(ally) !== 1) return 'no Radiation';
  if (pl(0).hand.length !== before) return `hand ${before} -> ${pl(0).hand.length} (card played, one drawn = same)`;
});
test('Reactor Overload: Radiation removed becomes that much damage', () => {
  const a = put(0, 'the_crimson_king'); a.radPerm = 2;
  const b = put(0, 'vampire_matriarch'); b.radPerm = 1;
  put(1, 'the_unstable_colossus'); put(1, 'werepyre_abomination');
  play(0, give(0, 'reactor_overload'));
  if (radiationOf(a) || radiationOf(b)) return 'Radiation left on my minions';
  const hits = msgs().filter((m) => /deals 1 to/.test(m)).length;
  if (hits !== 3) return `${hits} hits (want 3)`;
});
test('Radioactive Fallout: 2 damage to all, survivors gain Radiation', () => {
  const big = put(1, 'the_unstable_colossus');
  const small = put(1, 'vampire_bat');
  const mine = put(0, 'the_crimson_king');
  play(0, give(0, 'radioactive_fallout'));
  if (minion(small.uid)) return 'a 1-Health minion survived';
  if (radiationOf(minion(big.uid)) !== 1 || radiationOf(minion(mine.uid)) !== 1) return 'survivors not irradiated';
});
test('Emergency Decontamination: clears Radiation and heals 3', () => {
  const ally = put(0, 'the_unstable_colossus'); ally.radPerm = 2; ally.health -= 4;
  const hp = ally.health;
  play(0, give(0, 'emergency_decontamination'), ally.uid);
  if (radiationOf(ally)) return 'Radiation not removed';
  if (ally.health !== hp + 3) return `Health ${hp} -> ${ally.health}`;
});
test('Gamma Reversal: +2 Radiation when an enemy minion gains Radiation', () => {
  const target = put(0, 'the_unstable_colossus');
  give(1, 'gamma_reversal');
  play(0, give(0, 'controlled_exposure'), target.uid, qp('gamma_reversal'));
  if (radiationOf(target) !== 3) return `Radiation ${radiationOf(target)} (want 3)`;
});
test('Breach Protocol: an enemy minion played gains Radiation', () => {
  endTurn(); // B's turn: set the trap
  play(1, give(1, 'breach_protocol'));
  endTurn();
  play(0, give(0, 'the_unstable_colossus'));
  if (radiationOf(pl(0).board.at(-1)) !== 1) return 'played minion not irradiated';
});
test('Critical Failure: an attacker gains Radiation 2 and takes 2', () => {
  endTurn();
  play(1, give(1, 'critical_failure'));
  endTurn();
  const att = put(0, 'the_unstable_colossus');
  const hp = att.health;
  attack(0, att.uid, pl(1).hero.uid);
  if (radiationOf(att) !== 2) return `Radiation ${radiationOf(att)}`;
  if (att.health > hp - 2) return `Health ${hp} -> ${att.health}`;
});

// ---- Vampires ---------------------------------------------------------------------
test('Crimson Duelist: +2 Attack when attacking a minion', () => {
  const d = put(0, 'crimson_duelist');
  const foe = put(1, 'the_unstable_colossus');
  const hp = foe.health;
  attack(0, d.uid, foe.uid);
  if (minion(foe.uid).health !== hp - 5) return `dealt ${hp - minion(foe.uid).health} (want 5)`;
});
test('Blood Alchemist: Hero loses Health on your turn -> a Vampire gets +1 Attack', () => {
  const al = put(0, 'blood_alchemist');
  play(0, give(0, 'blood_tithe'));
  if (al.attack !== 3) return `Attack ${al.attack} (want 3)`;
});
test('Crypt Executioner: destroys a damaged enemy with 2 or less Attack', () => {
  const hurt = put(1, 'vampire_thrall'); hurt.health = 1;
  const fine = put(1, 'vampire_gargoyle');
  const inst = give(0, 'crypt_executioner');
  const targets = getLegalActions(s).filter((a) => a.card === inst.uid).map((a) => a.target);
  if (targets.includes(fine.uid)) return 'undamaged minion was targetable';
  play(0, inst, hurt.uid);
  if (minion(hurt.uid)) return 'not destroyed';
});
test('Crimson Oracle: draws at end of turn if your Hero lost Health', () => {
  put(0, 'crimson_oracle');
  play(0, give(0, 'blood_tithe'));
  const before = pl(0).hand.length;
  endTurn();
  if (pl(0).hand.length !== before + 1) return `hand ${before} -> ${pl(0).hand.length}`;
  fresh();
  put(0, 'crimson_oracle');
  const b2 = pl(0).hand.length;
  endTurn();
  if (pl(0).hand.length !== b2) return 'drew without losing Health';
});
test('Bloodmoon Gargant: +1 Health when another friendly Vampire dies', () => {
  const g = put(0, 'bloodmoon_gargant');
  const bat = put(0, 'vampire_bat');
  const foe = put(1, 'the_unstable_colossus');
  attack(0, bat.uid, foe.uid);
  if (g.maxHealth !== 6) return `max Health ${g.maxHealth}`;
  if (!g.tribes.includes('Beast')) return 'not a Beast';
});
test('Lord of the Unburied: one 1/1 Thrall per turn', () => {
  put(0, 'lord_of_the_unburied');
  const foe = put(1, 'the_unstable_colossus');
  attack(0, put(0, 'vampire_bat').uid, foe.uid);
  attack(0, put(0, 'vampire_bat').uid, foe.uid);
  const thralls = pl(0).board.filter((m) => m.cardId === 'vampire_thrall');
  if (thralls.length !== 1) return `${thralls.length} Thralls`;
  if (thralls[0].maxHealth !== 1) return `Thrall Health ${thralls[0].maxHealth}`;
});
test('Queen of the Red Veil: small Vampires become 3/3 and keep abilities', () => {
  const thrall = put(0, 'vampire_thrall');
  const king = put(0, 'the_crimson_king');
  play(0, give(0, 'queen_of_the_red_veil'));
  if (thrall.attack !== 3 || thrall.maxHealth !== 3) return `Thrall is ${thrall.attack}/${thrall.maxHealth}`;
  if (!hasKeyword(thrall, 'Lifesteal')) return 'lost Lifesteal';
  if (king.attack === 3) return 'big Vampire changed';
});
test('Blood Tithe: lose 2 Health, draw a card', () => {
  const hp = pl(0).hero.health;
  const inst = give(0, 'blood_tithe');
  const before = pl(0).hand.length;
  play(0, inst);
  if (pl(0).hero.health !== hp - 2) return `Health ${hp} -> ${pl(0).hero.health}`;
  if (pl(0).hand.length !== before) return 'no card drawn';
});
test('Shadow Veil: Stealth + Evade until your next turn', () => {
  const v = put(0, 'vampire_gargoyle');
  play(0, give(0, 'shadow_veil'), v.uid);
  endTurn();
  if (!hasKeyword(v, 'Stealth') || !hasKeyword(v, 'Evade')) return 'gone during the enemy turn';
  endTurn();
  if (hasKeyword(v, 'Stealth') || hasKeyword(v, 'Evade')) return 'still there on your next turn';
});
test('Turn the Thirst: +3/+2 Lifesteal, destroyed at end of turn', () => {
  const v = put(0, 'vampire_gargoyle');
  const atk = v.attack;
  play(0, give(0, 'turn_the_thirst'), v.uid);
  if (v.attack !== atk + 3 || !hasKeyword(v, 'Lifesteal')) return 'buff missing';
  endTurn();
  if (minion(v.uid)) return 'not destroyed at end of turn';
});
test('Sanguine Recollection: two different dead Vampires return with 1 Health', () => {
  const foe = put(1, 'the_unstable_colossus');
  attack(0, put(0, 'vampire_bat').uid, foe.uid);
  attack(0, put(0, 'vampire_thrall').uid, foe.uid);
  attack(0, put(0, 'vampire_thrall').uid, foe.uid);
  play(0, give(0, 'sanguine_recollection'));
  const back = pl(0).board;
  const ids = back.map((m) => m.cardId).sort().join(',');
  if (ids !== 'vampire_bat,vampire_thrall') return `summoned ${ids}`;
  if (back.some((m) => m.maxHealth !== 1)) return 'not 1 Health';
});
test('Crimson Snare: an attacker on your Hero gets -3 this attack and -1 permanently', () => {
  endTurn();
  play(1, give(1, 'crimson_snare'));
  endTurn();
  // A non-Radioactive attacker (Radioactive minions ignore enemy Attack reductions).
  const att = put(0, 'the_crimson_king');
  const a0 = effectiveAttack(att);
  const hp = pl(1).hero.health;
  attack(0, att.uid, pl(1).hero.uid);
  if (hp - pl(1).hero.health !== Math.max(0, a0 - 3)) return `Hero took ${hp - pl(1).hero.health} (want ${a0 - 3})`;
  endTurn();
  if (effectiveAttack(att) !== a0 - 1) return `Attack afterwards ${effectiveAttack(att)} (want ${a0 - 1})`;
});
test('Mirror of the Damned: an enemy spell on your Vampire is redirected', () => {
  const v = put(1, 'vampire_gargoyle');
  put(1, 'the_unstable_colossus');
  put(0, 'wasteland_ghoul');
  endTurn();
  play(1, give(1, 'mirror_of_the_damned'));
  endTurn();
  play(0, give(0, 'dna_destabilization'), v.uid);
  if (!msgs().some((m) => /redirected/.test(m))) return 'not redirected';
  if (minion(v.uid).maxHealth !== getCard('vampire_gargoyle').health) return 'the Vampire was still hit';
});
test('Supernatural Reflexes: a Vampire gets +2 Attack and Lifesteal when an enemy attacks', () => {
  const v = put(1, 'vampire_gargoyle');
  give(1, 'supernatural_reflexes');
  const att = put(0, 'the_unstable_colossus');
  applyAction(s, { type: 'attack', player: 0, attacker: att.uid, defender: v.uid });
  for (let i = 0; i < 10 && s.pending; i++) {
    const legal = getLegalActions(s);
    const a = legal.find((x) => x.type === 'quickPlay' && x.target === v.uid) ?? legal.find((x) => x.type === 'pass');
    applyAction(s, a);
  }
  if (!msgs().some((m) => /Vampire Gargoyle gets \+2 Attack \/ Lifesteal/.test(m))) return `no buff: ${msgs().slice(-5).join(' / ')}`;
});
test('Bloodguard Intercession: prevents 3 damage, +1 Attack for a Vampire', () => {
  const v = put(1, 'vampire_matriarch');
  give(1, 'bloodguard_intercession');
  const att = put(0, 'the_unstable_colossus'); // 7 Attack
  const hp = v.health;
  attack(0, att.uid, v.uid, qp('bloodguard_intercession'));
  const after = minion(v.uid);
  if (!after) return 'Vampire died (damage not reduced enough?)';
  if (hp - after.health !== 4) return `took ${hp - after.health} (want 4)`;
});

// ---- Dinosaurs ----------------------------------------------------------------------
const DINO = ['Dinosaurs', 'Vampires'];
const eggs = (p) => pl(p).board.filter((m) => m.tribes.includes('Egg'));
const dtest = (name, fn) => test(name, fn, DINO);
dtest('Hatchling Keeper: summons a 0/3 Egg', () => {
  play(0, give(0, 'hatchling_keeper'));
  if (eggs(0).length !== 1 || eggs(0)[0].maxHealth !== 3) return `eggs: ${eggs(0).map((e) => e.cardId)}`;
});
dtest('Nestling Triceratops: Exit summons an Egg', () => {
  const n = put(0, 'nestling_triceratops');
  attack(0, n.uid, put(1, 'the_crimson_king').uid);
  if (eggs(0).length !== 1) return 'no Egg';
});
dtest('Raptor Brood: two 1/1 Raptors', () => {
  play(0, give(0, 'raptor_brood'));
  if (pl(0).board.filter((m) => m.cardId === 'raptor').length !== 2) return 'not two Raptors';
});
dtest('Eggguard Ankylosaur: enemy spells cannot target your Eggs', () => {
  const egg = put(0, 'large_dinosaur_egg');
  const inst = give(1, 'vampire_bite');
  endTurn();
  const before = getLegalActions(s).some((a) => a.card === inst.uid && a.target === egg.uid);
  endTurn(); put(0, 'eggguard_ankylosaur'); endTurn();
  const after = getLegalActions(s).some((a) => a.card === inst.uid && a.target === egg.uid);
  if (!before) return 'Egg was not targetable even without the Ankylosaur';
  if (after) return 'Egg still targetable';
});
dtest('Pterodactyl Hatchling: +1 Health to an Egg; Exit draws an Egg if you have one', () => {
  const egg = put(0, 'large_dinosaur_egg');
  play(0, give(0, 'pterodactyl_hatchling'), egg.uid);
  if (egg.maxHealth !== 4) return `Egg Health ${egg.maxHealth}`;
  const h = pl(0).board.at(-1);
  h.sick = false;
  const before = pl(0).hand.length;
  attack(0, h.uid, put(1, 'the_crimson_king').uid);
  if (pl(0).hand.length !== before + 1) return `hand ${before} -> ${pl(0).hand.length}`;
  if (!getCard(pl(0).hand.at(-1).cardId).tribes.includes('Egg')) return 'drew a non-Egg';
});
dtest('Nesting Mother: a 1/1 Baby Raptor at end of turn while you have an Egg', () => {
  put(0, 'nesting_mother');
  endTurn(); endTurn();
  if (pl(0).board.some((m) => m.cardId === 'baby_raptor')) return 'summoned without an Egg';
  put(0, 'large_dinosaur_egg');
  endTurn();
  if (!pl(0).board.some((m) => m.cardId === 'baby_raptor')) return 'no Baby Raptor';
});
dtest('Brood Architect: Eggs get +1 Health; first Egg each turn costs 1 less', () => {
  put(0, 'brood_architect');
  const a = give(0, 'nest_of_dinosaur_eggs');
  const b = give(0, 'nest_of_dinosaur_eggs');
  const mana = pl(0).mana.current;
  play(0, a);
  if (mana - pl(0).mana.current !== 2) return `first Egg cost ${mana - pl(0).mana.current}`;
  if (eggs(0)[0].maxHealth !== 4) return `Egg Health ${eggs(0)[0].maxHealth}`;
  const m2 = pl(0).mana.current;
  play(0, b);
  if (m2 - pl(0).mana.current !== 3) return `second Egg cost ${m2 - pl(0).mana.current}`;
});
dtest('Colossal Brood Egg: 0/6, Exit summons two Babies', () => {
  const e = put(0, 'colossal_brood_egg');
  e.destroyed = true;
  play(0, give(0, 'blood_tithe')); // any action processes deaths
  const babies = pl(0).board.filter((m) => m.cardId !== 'colossal_brood_egg');
  if (babies.length !== 2) return `${babies.length} babies`;
});
dtest('Relocate the Nest: Egg back to hand costing 2 less', () => {
  const egg = put(0, 'nest_of_dinosaur_eggs');
  play(0, give(0, 'relocate_the_nest'), egg.uid);
  const back = pl(0).hand.find((h) => h.cardId === 'nest_of_dinosaur_eggs');
  if (!back) return 'not in hand';
  if ((back.costMod ?? 0) !== -2) return `cost change ${back.costMod}`;
  if (pl(0).board.some((m) => m.uid === egg.uid)) return 'still on board';
});
dtest('Accelerated Incubation: +2 Health, Exit fires when returned to hand', () => {
  const egg = put(0, 'large_dinosaur_egg');
  play(0, give(0, 'accelerated_incubation'), egg.uid);
  if (egg.maxHealth !== 5) return `Health ${egg.maxHealth}`;
  play(0, give(0, 'relocate_the_nest'), egg.uid);
  if (!pl(0).board.some((m) => m.cardId === 'baby_t_rex')) return 'Exit did not fire';
});
dtest('Emergency Hatching: Egg destroyed without its Exit, a Baby appears', () => {
  const egg = put(0, 'large_dinosaur_egg');
  play(0, give(0, 'emergency_hatching'), egg.uid);
  if (pl(0).board.some((m) => m.uid === egg.uid)) return 'Egg survived';
  if (pl(0).board.length !== 1) return `board: ${pl(0).board.map((m) => m.cardId)}`;
});
dtest('Selective Breeding: choose another Egg; extra Health stays', () => {
  const egg = put(0, 'large_dinosaur_egg');
  egg.maxHealth += 2; egg.health += 2;
  play(0, give(0, 'selective_breeding'), egg.uid);
  const now = minion(egg.uid);
  if (now.cardId === 'large_dinosaur_egg') return 'not transformed';
  if (!now.tribes.includes('Egg')) return 'not an Egg';
  if (now.maxHealth !== getCard(now.cardId).health + 2) return `Health ${now.maxHealth}`;
});
dtest('False Nest: Egg when you have none, else -2 Attack', () => {
  endTurn();
  play(1, give(1, 'false_nest'));
  endTurn();
  play(0, give(0, 'the_crimson_king'));
  if (eggs(1).length !== 1) return 'no Egg summoned';
  fresh(DINO);
  put(1, 'large_dinosaur_egg');
  endTurn(); play(1, give(1, 'false_nest')); endTurn();
  play(0, give(0, 'the_crimson_king'));
  const k = pl(0).board.at(-1);
  if (effectiveAttack(k) !== getCard('the_crimson_king').attack - 2) return `Attack ${effectiveAttack(k)}`;
});
dtest('Maternal Fury: a 2/2 Taunt Baby takes an attack on your Egg', () => {
  const egg = put(1, 'large_dinosaur_egg');
  endTurn(); play(1, give(1, 'maternal_fury')); endTurn();
  const att = put(0, 'the_crimson_king');
  attack(0, att.uid, egg.uid);
  if (!minion(egg.uid) || minion(egg.uid).health !== 3) return 'the Egg was hit';
  if (!msgs().some((m) => /redirected to Baby Dinosaur/.test(m))) return 'not redirected';
});
dtest('Hatchling Intercept: a Baby Raptor takes the attack if you have an Egg', () => {
  const dino = put(1, 'triceratops');
  put(1, 'large_dinosaur_egg');
  give(1, 'hatchling_intercept');
  const att = put(0, 'the_crimson_king');
  attack(0, att.uid, dino.uid, qp('hatchling_intercept'));
  if (minion(dino.uid).health !== minion(dino.uid).maxHealth) return 'the Dinosaur was hit';
  if (!msgs().some((m) => /redirected to Baby Raptor/.test(m))) return 'not redirected';
});

console.log(`\n${passed} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
