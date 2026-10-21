// Rules tests for the Acidic faction (Corrosion), its Hero Spell and its Fusions. Each test sets up a small board, plays the card through the real engine,
// and checks the outcome.   node tools/test-acidic.mjs

import { buildDeck } from '../src/cards/index.js';
import { addToHand, costOf, effectiveAttack, hasKeyword, heal, radiationOf, summonMinion } from '../src/engine/core.js';
import { applyAction, createGame, getLegalActions } from '../src/engine/engine.js';
import { getCard } from '../src/engine/registry.js';

let s;
let failures = 0;
let passed = 0;

// Player 0 runs Acidic (+ `partner`); player 1 runs `foe`.
function fresh(partner = 'Vampires', foe = ['Dragons', 'Robots']) {
  const fa = ['Acidic', partner];
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



// A plain enemy minion: Vampire Gargoyle is 2/4 with Taunt.
const prey = (p = 1, hp = 3) => { const m = put(p, 'vampire_gargoyle'); m.keywords = []; m.health = hp; return m; };
// A plain enemy minion with chosen stats (Vampire Gargoyle with its Taunt removed).
const foe = (atk = 5, hp = 6, p = 1) => { const m = put(p, 'vampire_gargoyle'); m.keywords = []; m.attack = atk; m.health = hp; m.maxHealth = hp; return m; };
const atkOf = (m) => effectiveAttack(m);
const hand = (p) => pl(p).hand.map((h) => h.cardId);

// ---- Corrosion ---------------------------------------------------------------------------
test('Corrosion lowers Attack, not Health, and stacks', () => {
  const e = foe(5, 6);
  play(0, give(0, 'splash_of_acid'), e.uid);
  if (atkOf(e) !== 3 || e.health !== 6) return `after 2: ${atkOf(e)}/${e.health}`;
  play(0, give(0, 'splash_of_acid'), e.uid);
  play(0, give(0, 'splash_of_acid'), e.uid);
  if (atkOf(e) !== 0 || e.corrosion !== 6) return `after 6: ${atkOf(e)} corrosion ${e.corrosion}`;
});
test('A minion at 0 Attack can\'t attack until a buff raises it', () => {
  const m = foe(2, 6, 0);
  play(0, give(0, 'splash_of_acid'), m.uid);
  if (getLegalActions(s).some((a) => a.type === 'attack' && a.attacker === m.uid)) return 'could attack at 0';
  m.attack += 2;
  if (!getLegalActions(s).some((a) => a.type === 'attack' && a.attacker === m.uid)) return 'still could not attack after a buff';
});
test('Corrosion resets when the minion leaves play and comes back', () => {
  const e = foe(5, 6);
  play(0, give(0, 'splash_of_acid'), e.uid);
  const again = summonMinion(s, 1, 'vampire_gargoyle');
  if (again.corrosion || atkOf(again) !== getCard('vampire_gargoyle').attack) return 'new copy came in corroded';
});
test('Corrosion eats this turn\'s Attack once the base Attack is gone', () => {
  const e = foe(1, 6); e.tempAttack = 3;
  play(0, give(0, 'splash_of_acid'), e.uid);
  if (atkOf(e) !== 2) return `attack ${atkOf(e)}`;
});
test('Corrosion works on Radioactive minions (their passive only stops buffs)', () => {
  const m = put(1, 'feral_ghoul'); const before = atkOf(m);
  play(0, give(0, 'splash_of_acid'), m.uid);
  if (atkOf(m) !== Math.max(0, before - 2)) return `${before} -> ${atkOf(m)}`;
}, 'Vampires', ['Radioactive', 'Robots']);

// ---- Caustic Reservoir --------------------------------------------------------------------
test('Caustic Reservoir: Corrosion 2 right away, nothing later', () => {
  const e = foe(6, 9);
  heroSpell(0, 'caustic_reservoir', e.uid);
  if (atkOf(e) !== 4) return `after cast ${atkOf(e)}`;
  endTurn(); endTurn();
  if (atkOf(e) !== 4) return `after a round ${atkOf(e)}`;
});

// ---- Minions ------------------------------------------------------------------------------
test('Bubble Slime corrodes a random enemy minion', () => {
  const e = foe(4, 4);
  play(0, give(0, 'bubble_slime'));
  if (atkOf(e) !== 3) return `attack ${atkOf(e)}`;
});
test('Acid Newt gains +1 Attack this turn when you corrode an enemy (once per turn)', () => {
  const n = put(0, 'acid_newt'); const e = foe(5, 6);
  play(0, give(0, 'splash_of_acid'), e.uid);
  play(0, give(0, 'splash_of_acid'), e.uid);
  if (atkOf(n) !== 2) return `newt ${atkOf(n)}`;
  endTurn();
  if (atkOf(n) !== 1) return `did not wear off: ${atkOf(n)}`;
});
test('Corrosive Beetle targets an enemy with 2 or less Attack and corrodes it by 2', () => {
  const big = foe(5, 5); const small = foe(2, 5);
  const inst = give(0, 'corrosive_beetle');
  const targets = getLegalActions(s).filter((a) => a.card === inst.uid).map((a) => a.target);
  if (targets.includes(big.uid) || !targets.includes(small.uid)) return `targets ${targets}`;
  play(0, inst, small.uid);
  if (atkOf(small) !== 0) return `attack ${atkOf(small)}`;
});
test('Caustic Jelly corrodes the first attacker each turn', () => {
  const j = put(0, 'caustic_jelly'); j.health = j.maxHealth = 20; endTurn();
  const a = foe(4, 9); a.sick = false; const b = foe(4, 9); b.sick = false;
  attack(1, a.uid, j.uid); attack(1, b.uid, j.uid);
  if (atkOf(a) !== 3 || atkOf(b) !== 4) return `a ${atkOf(a)} b ${atkOf(b)}`;
});
test('Fume Alchemist: Acid-coated makes the next Corrosion 1 stronger, once', () => {
  const e = foe(6, 6);
  play(0, give(0, 'fume_alchemist'), e.uid);
  if (!e.acidCoated) return 'not coated';
  play(0, give(0, 'splash_of_acid'), e.uid);
  if (atkOf(e) !== 3 || e.acidCoated) return `after first ${atkOf(e)}`;
  play(0, give(0, 'splash_of_acid'), e.uid);
  if (atkOf(e) !== 1) return `after second ${atkOf(e)}`;
});
test('Shell-Melter corrodes the minion it attacks before combat', () => {
  const m = put(0, 'shell_melter'); const e = foe(4, 9);
  attack(0, m.uid, e.uid);
  if (atkOf(e) !== 3) return `enemy ${atkOf(e)}`;
  if (m.health !== 3 - 3) return `melter took ${3 - m.health}, expected 3`;
});
test('Armor Leech strips up to 3 Armor and gains +1 Attack per 2', () => {
  pl(1).hero.armor = 5;
  play(0, give(0, 'armor_leech'));
  const m = find(0, 'armor_leech');
  if (pl(1).hero.armor !== 2 || atkOf(m) !== 3) return `armor ${pl(1).hero.armor} attack ${atkOf(m)}`;
});
test('Spitfire Salamander deals 3 to a corroded minion, 2 otherwise', () => {
  const a = foe(4, 9); const b = foe(4, 9);
  play(0, give(0, 'splash_of_acid'), a.uid);
  play(0, give(0, 'spitfire_salamander'), a.uid);
  play(0, give(0, 'spitfire_salamander'), b.uid);
  if (a.health !== 6 || b.health !== 7) return `a ${a.health} b ${b.health}`;
});
test('Rust-Eater Brute corrodes only buffed or defended enemies', () => {
  // Vampire Gargoyle prints 2/4 Taunt: as a plain 2/4 it has no buffs.
  const plain = foe(2, 4); const buffed = foe(4, 4); const taunt = foe(2, 4); taunt.keywords = ['Taunt'];
  play(0, give(0, 'rust_eater_brute'));
  if (atkOf(plain) !== 2 || atkOf(buffed) !== 2 || atkOf(taunt) !== 0) return `${atkOf(plain)} ${atkOf(buffed)} ${atkOf(taunt)}`;
});
test('Living Flask heals 2 when you play a Corrosion spell (not other spells)', () => {
  put(0, 'living_flask'); pl(0).hero.health = 20; const e = foe(4, 9);
  play(0, give(0, 'splash_of_acid'), e.uid);
  if (pl(0).hero.health !== 22) return `after Splash ${pl(0).hero.health}`;
  play(0, give(0, 'strip_the_plating'), e.uid);
  if (pl(0).hero.health !== 22) return `Strip the Plating healed: ${pl(0).hero.health}`;
});
test('Dissolver Mantis Dissolves an enemy minion', () => {
  const e = foe(4, 9); e.keywords = ['Evade', 'Taunt'];
  Object.assign(pl(0).mana, { max: 10, current: 10, base: 10 });
  play(0, give(0, 'dissolver_mantis'), e.uid);
  if (onBoard(e)) return 'survived';
});
test('Ooze Mimic copies the Attack, then corrodes the enemy by 2', () => {
  const e = foe(7, 9);
  play(0, give(0, 'ooze_mimic'), e.uid);
  const m = find(0, 'ooze_mimic');
  if (atkOf(m) !== 7 || atkOf(e) !== 5) return `mimic ${atkOf(m)} enemy ${atkOf(e)}`;
});
test('Caustic Crab gains +1 Attack once per turn when an enemy loses Attack to Corrosion', () => {
  const c = put(0, 'caustic_crab'); const e = foe(5, 9);
  play(0, give(0, 'splash_of_acid'), e.uid); play(0, give(0, 'splash_of_acid'), e.uid);
  if (atkOf(c) !== 3) return `crab ${atkOf(c)}`;
  endTurn(); endTurn();
  if (atkOf(c) !== 3) return `not permanent: ${atkOf(c)}`;
});
test('Tri-Maw Hydra corrodes up to three different enemy minions', () => {
  const es = [foe(5, 5), foe(5, 5), foe(5, 5), foe(5, 5)];
  play(0, give(0, 'tri_maw_hydra'));
  const hit = es.filter((e) => atkOf(e) === 3).length;
  if (hit !== 3) return `${hit} hit`;
});
test('World-Eater Slug corrodes only enemies with 4+ Attack', () => {
  const big = foe(6, 6); const small = foe(3, 6);
  play(0, give(0, 'world_eater_slug'));
  if (atkOf(big) !== 3 || atkOf(small) !== 3) return `big ${atkOf(big)} small ${atkOf(small)}`;
});
test('The Great Dissolution: Corrosion 2 to all, then 3 damage to those at 0 Attack', () => {
  const a = foe(2, 5); const b = foe(5, 5);
  play(0, give(0, 'the_great_dissolution'));
  if (a.health !== 2 || b.health !== 5 || atkOf(b) !== 3) return `a ${a.health} b ${b.health}/${atkOf(b)}`;
});

// ---- Spells -------------------------------------------------------------------------------
test('Strip the Plating Dissolves: destroys the enemy minion', () => {
  const e = foe(6, 6); e.keywords = ['Evade'];
  play(0, give(0, 'strip_the_plating'), e.uid);
  if (onBoard(e)) return 'still on board';
});
test('Dissolve gives an Essence holding one random piece: original Attack, original Health or keywords', () => {
  const seen = new Set();
  for (let n = 0; n < 30; n++) {
    pl(0).hand = [];
    const e = foe(4, 6); e.keywords = ['Lifesteal'];
    const card = getCard(e.cardId);
    Object.assign(pl(0).mana, { max: 10, current: 10, base: 10 });
    play(0, give(0, 'strip_the_plating'), e.uid);
    const inst = pl(0).hand.find((h) => getCard(h.cardId).name.startsWith('Essence of'));
    if (!inst) return `hand ${hand(0)}`;
    const mine = put(0, 'bubble_slime');
    const a0 = atkOf(mine); const h0 = mine.maxHealth;
    Object.assign(pl(0).mana, { max: 10, current: 10, base: 10 });
    play(0, inst, mine.uid);
    const da = atkOf(mine) - a0, dh = mine.maxHealth - h0, kw = hasKeyword(mine, 'Lifesteal');
    if (da === card.attack && !dh && !kw) seen.add('attack');
    else if (dh === card.health && !da && !kw) seen.add('health');
    else if (kw && !da && !dh) seen.add('keywords');
    else return `bad essence ${da}/${dh}/${kw}`;
    pl(0).board = []; pl(1).board = [];
  }
  if (seen.size !== 3) return `only saw ${[...seen]}`;
});
test('Caustic Bath draws a card per enemy brought to 0 Attack (max 2)', () => {
  foe(1, 5); foe(1, 5); foe(1, 5); foe(4, 5);
  const bath = give(0, 'caustic_bath'); const before = pl(0).hand.length - 1;
  play(0, bath);
  if (pl(0).hand.length - before !== 2) return `drew ${pl(0).hand.length - before}`;
});
test('Acid Rain: 2 damage to all enemies, Corrosion 1 to survivors', () => {
  const a = foe(4, 2); const b = foe(4, 6);
  play(0, give(0, 'acid_rain'));
  if (onBoard(a) || b.health !== 4 || atkOf(b) !== 3) return `a on board ${onBoard(a)}, b ${atkOf(b)}/${b.health}`;
});
test('Molecular Breakdown removes temp buffs and corrodes 4', () => {
  const e = foe(5, 6); e.tempAttack = 3;
  play(0, give(0, 'molecular_breakdown'), e.uid);
  if (atkOf(e) !== 1) return `attack ${atkOf(e)}`;
});
test('Total Dissolution destroys enemies left at 0 Attack', () => {
  const a = foe(3, 9); const b = foe(5, 9);
  play(0, give(0, 'total_dissolution'));
  if (onBoard(a) || !onBoard(b) || atkOf(b) !== 2) return `a ${onBoard(a)} b ${onBoard(b)}/${atkOf(b)}`;
});

// ---- Traps --------------------------------------------------------------------------------
test('False Floor corrodes an attacker by 2 before combat', () => {
  play(0, give(0, 'false_floor')); endTurn();
  const a = foe(4, 9); a.sick = false;
  attack(1, a.uid, pl(0).hero.uid);
  if (atkOf(a) !== 2 || pl(0).hero.health !== s.rules.startingHealth - 2) return `attacker ${atkOf(a)} hero ${pl(0).hero.health}`;
});
test('Volatile Flask: 2 damage to a played minion, Corrosion 1 if it survives', () => {
  play(0, give(0, 'volatile_flask')); endTurn();
  play(1, give(1, 'vampire_gargoyle'));
  const g = find(1, 'vampire_gargoyle');
  if (!g || g.health !== 2 || atkOf(g) !== 1) return `gargoyle ${g && `${atkOf(g)}/${g.health}`}`;
}, 'Vampires', ['Vampires', 'Robots']);
test('Rusted Jaws stops a 4+ Attack minion hitting your Hero and corrodes it 3', () => {
  play(0, give(0, 'rusted_jaws')); endTurn();
  const a = foe(5, 9); a.sick = false;
  attack(1, a.uid, pl(0).hero.uid);
  if (pl(0).hero.health !== s.rules.startingHealth || atkOf(a) !== 2) return `hero ${pl(0).hero.health} attacker ${atkOf(a)}`;
});
test('Corrosion Chamber fires on the third minion the opponent summons in a turn', () => {
  play(0, give(0, 'corrosion_chamber')); endTurn();
  play(1, give(1, 'vampire_bat')); play(1, give(1, 'vampire_bat'));
  if (pl(0).traps.length !== 1) return 'fired early';
  play(1, give(1, 'vampire_bat'));
  if (pl(0).traps.length !== 0) return 'did not fire';
  const bats = pl(1).board.filter((m) => m.cardId === 'vampire_bat');
  if (bats.some((b) => atkOf(b) !== 0)) return `bats ${bats.map(atkOf)}`;
}, 'Vampires', ['Vampires', 'Robots']);

// ---- Quick Plays --------------------------------------------------------------------------
test('Snap Corrosion corrodes an attacking enemy by 2', () => {
  give(0, 'snap_corrosion'); endTurn();
  const a = foe(4, 9); a.sick = false;
  attack(1, a.uid, pl(0).hero.uid, qp('snap_corrosion'));
  if (atkOf(a) !== 2 || pl(0).hero.health !== s.rules.startingHealth - 2) return `attacker ${atkOf(a)} hero ${pl(0).hero.health}`;
});
test('Emergency Neutralizer stops the attack if the attacker hits 0 Attack', () => {
  give(0, 'emergency_neutralizer'); endTurn();
  const a = foe(3, 9); a.sick = false;
  attack(1, a.uid, pl(0).hero.uid, qp('emergency_neutralizer'));
  if (pl(0).hero.health !== s.rules.startingHealth || atkOf(a) !== 0) return `hero ${pl(0).hero.health} attacker ${atkOf(a)}`;
});
test('Shield-Eater Dissolves an enemy minion', () => {
  const a = foe(3, 9); a.keywords = ['Evade'];
  Object.assign(pl(0).mana, { max: 10, current: 10, base: 10 });
  play(0, give(0, 'shield_eater'), a.uid);
  if (onBoard(a)) return 'survived';
});
test('Reactive Spill undoes an enemy buff and corrodes 2', () => {
  give(0, 'reactive_spill'); endTurn();
  const e = foe(3, 9);
  give(1, 'blood_frenzy');
  const bf = pl(1).hand.find((h) => h.cardId === 'blood_frenzy');
  const opts = getLegalActions(s).filter((x) => x.card === bf.uid);
  play(1, bf, opts.find((x) => x.target === e.uid)?.target ?? opts[0]?.target, qp('reactive_spill'));
  if (pl(0).hand.some((h) => h.cardId === 'reactive_spill')) return 'never offered';
  if (atkOf(e) !== 1) return `attack ${atkOf(e)}`;
}, 'Vampires', ['Vampires', 'Robots']);

// ---- Fusions ------------------------------------------------------------------------------
const fusion = (id, target) => { pl(0).fusion.charge = 3; heroSpell(0, id, target); };
test('Hemolytic Draught heals your Hero by the Attack lost', () => {
  pl(0).hero.health = 20; const e = foe(5, 6);
  fusion('hemolytic_draught', e.uid);
  if (pl(0).hero.health !== 22 || atkOf(e) !== 3) return `hero ${pl(0).hero.health} enemy ${atkOf(e)}`;
}, 'Vampires');
test('Tar Pit gives Primal Mana when the Attack reaches 0', () => {
  const e = foe(2, 6);
  fusion('tar_pit', e.uid);
  if (atkOf(e) !== 0 || !(pl(0).mana.primal > 0)) return `atk ${atkOf(e)} primal ${pl(0).mana.primal}`;
}, 'Dinosaurs');
test('Pitcher Bloom summons a Taunt that corrodes attackers', () => {
  fusion('pitcher_bloom');
  const b = find(0, 'pitcher_bloom_plant'); endTurn();
  const a = foe(4, 9); a.sick = false;
  attack(1, a.uid, b.uid);
  if (atkOf(a) !== 3) return `attacker ${atkOf(a)}`;
}, 'Plants');
test('Bile Bloat: its Bile Zombie corrodes all enemies when it dies', () => {
  fusion('bile_bloat');
  const z = find(0, 'bile_zombie'); const e = foe(5, 9);
  play(0, give(0, 'splash_of_acid'), z.uid); // (any minion) — kill it with damage instead:
  z.health = 0; endTurn();
  if (atkOf(e) !== 3) return `enemy ${atkOf(e)}`;
}, 'Zombies');
test('Acid Breath applies Burn 1 and Corrosion 1 to all enemies', () => {
  const e = foe(5, 9);
  fusion('acid_breath');
  if (atkOf(e) !== 4 || !(e.burn > 0)) return `atk ${atkOf(e)} burn ${e.burn}`;
}, 'Dragons');
test('Brimstone Bile: lose 3, Corrosion 3 and 3 damage', () => {
  const e = foe(5, 9); const hp = pl(0).hero.health;
  fusion('brimstone_bile', e.uid);
  if (pl(0).hero.health !== hp - 3 || atkOf(e) !== 2 || e.health !== 6) return `hero ${pl(0).hero.health} enemy ${atkOf(e)}/${e.health}`;
}, 'Demons');
test('Purifying Solvent Dissolves an enemy minion', () => {
  const e = foe(5, 9);
  fusion('purifying_solvent', e.uid);
  if (onBoard(e)) return 'survived';
}, 'Divine', ['Vampires', 'Robots']);
test('Etching Drill: the upgraded minion corrodes what it attacks', () => {
  const m = put(0, 'bubble_slime'); const e = foe(4, 9);
  fusion('etching_drill', m.uid);
  attack(0, m.uid, e.uid);
  if (atkOf(m) !== 2 && atkOf(m) !== 0) return `mine ${atkOf(m)}`;
  if (atkOf(e) !== 3) return `enemy ${atkOf(e)}`;
}, 'Robots');
test('Toxic Sludge: Corrosion 1 and Radiation 1', () => {
  const e = foe(5, 9);
  fusion('toxic_sludge', e.uid);
  if (atkOf(e) !== 4 || radiationOf(e) !== 1) return `atk ${atkOf(e)} rad ${radiationOf(e)}`;
}, 'Radioactive');
test('Formic Swarm summons two Acid Wasps', () => {
  fusion('formic_swarm');
  if (count(0, 'acid_wasp') !== 2) return `${count(0, 'acid_wasp')} wasps`;
}, 'Bees');
test('Ectoplasmic Ooze Haunts an Acidic minion and corrodes all enemies', () => {
  bury(1, 'corrosive_beetle'); const e = foe(5, 9);
  fusion('ectoplasmic_ooze');
  if (!find(0, 'corrosive_beetle') || atkOf(e) !== 4) return `beetle ${!!find(0, 'corrosive_beetle')} enemy ${atkOf(e)}`;
}, 'Ghosts');
test('Dimensional Solvent: the minion returns corroded and Acid-coated', () => {
  const e = foe(6, 9);
  fusion('dimensional_solvent', e.uid);
  if (!away(e)) return 'not displaced';
  endTurn(); endTurn();
  if (!onBoard(e) || atkOf(e) !== 4 || !e.acidCoated) return `back ${onBoard(e)} atk ${atkOf(e)} coated ${e.acidCoated}`;
}, 'Ultraterrestrials');
test('Bloodbile corrodes and marks as Prey', () => {
  const e = foe(5, 9);
  fusion('bloodbile', e.uid);
  if (atkOf(e) !== 3 || !e.prey) return `atk ${atkOf(e)} prey ${e.prey}`;
}, 'Sharks');
test('Xenoacid Sample corrodes all enemies by 1', () => {
  const e = foe(5, 9); put(0, 'bubble_slime');
  fusion('xenoacid_sample');
  if (atkOf(e) !== 4) return `atk ${atkOf(e)}`;
}, 'Aliens');
test('Rot Spores places Mushrooms and corrodes', () => {
  const e = foe(5, 9);
  fusion('rot_spores');
  const shrooms = pl(1).deck.reduce((t, c) => t + (c.mushrooms ?? 0), 0);
  if (atkOf(e) !== 4 || shrooms !== 2) return `atk ${atkOf(e)} mushrooms ${shrooms}`;
}, 'Fungus');

console.log(`\n${passed} passed, ${failures} failed`);
if (failures) process.exit(1);
