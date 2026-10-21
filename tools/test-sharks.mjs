// Rules tests for the Shark faction (Marked Prey), its Hero Spell and its Fusions. Each test sets up a small board, plays the card through the real engine,
// and checks the outcome.   node tools/test-sharks.mjs

import { buildDeck } from '../src/cards/index.js';
import { addToHand, costOf, effectiveAttack, hasKeyword, heal, radiationOf, summonMinion } from '../src/engine/core.js';
import { applyAction, createGame, getLegalActions } from '../src/engine/engine.js';
import { getCard } from '../src/engine/registry.js';

let s;
let failures = 0;
let passed = 0;

// Player 0 runs Sharks (+ `partner`); player 1 runs `foe`.
function fresh(partner = 'Vampires', foe = ['Dragons', 'Robots']) {
  const fa = ['Sharks', partner];
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

// ---- Blood in the Water ------------------------------------------------------------------
test('Blood in the Water: an enemy brought to 3 Health or less becomes Marked Prey', () => {
  const e = put(1, 'vampire_gargoyle'); e.keywords = [];
  play(0, give(0, 'first_blood'), e.uid);
  if (!e.prey) return `not Prey at ${e.health}`;
});
test('Prey mark goes away when healed above 3 (damage never removes it)', () => {
  const e = put(1, 'vampire_gargoyle'); e.keywords = []; e.maxHealth = 9; e.health = 3;
  play(0, give(0, 'first_blood'), e.uid);
  if (!e.prey) return 'not marked';
  heal(s, e.uid, 5);
  if (e.prey) return 'still Prey after healing to ' + e.health;
});
test('Healthy minions are not Prey; your own minions never are', () => {
  const e = put(1, 'vampire_gargoyle'); e.keywords = [];
  const mine = put(0, 'tiger_shark');
  play(0, give(0, 'razor_bite'), mine.uid);
  if (mine.prey) return 'own minion marked';
  if (e.prey) return 'healthy enemy marked';
});
test('A Shark gets +2 Attack against Prey once per turn', () => {
  const a = put(0, 'reef_nibbler'); a.attack = 1;    // 1 + 2
  const b = put(0, 'reef_nibbler'); b.attack = 1;
  const e = prey(1, 3); e.maxHealth = 9; e.health = 3; e.prey = true; e.attack = 0;
  attack(0, a.uid, e.uid);
  if (e.health !== 0) return `first attack left ${e.health}`;
  const f = prey(1, 3); f.maxHealth = 9; f.prey = true; f.attack = 0;
  attack(0, b.uid, f.uid);
  if (f.health !== 2) return `second attack got the bonus too (${f.health})`;
});
test('Sharks can attack Marked Prey in Stealth (others can\'t)', () => {
  const sh = put(0, 'reef_nibbler');
  const e = prey(1, 2); e.keywords = ['Stealth']; e.prey = true;
  const ok = getLegalActions(s).some((a) => a.type === 'attack' && a.attacker === sh.uid && a.defender === e.uid);
  if (!ok) return 'Shark cannot attack the hidden Prey';
  const v = put(0, 'vampire_gargoyle'); v.keywords = [];
  if (getLegalActions(s).some((a) => a.type === 'attack' && a.attacker === v.uid && a.defender === e.uid)) return 'a non-Shark can';
});
test('Shark cards reach Prey through Elusive', () => {
  const e = prey(1, 2); e.keywords = ['Elusive']; e.prey = true;
  const inst = give(0, 'snap_reaction');
  // Snap Reaction is a Quick Play; check targeting via Tiger Shark's Arrival instead
  const t = give(0, 'tiger_shark');
  if (!getLegalActions(s).some((a) => a.type === 'play' && a.card === t.uid && a.target === e.uid)) return 'cannot target Elusive Prey';
});

// ---- Minions -------------------------------------------------------------------------------
test('Reef Nibbler: 1 damage to an enemy with 3 or less Health', () => {
  const big = put(1, 'vampire_gargoyle'); big.keywords = []; big.health = 4;
  const small = prey(1, 2);
  play(0, give(0, 'reef_nibbler'));
  if (small.health !== 1 || big.health !== 4) return `small ${small.health} big ${big.health}`;
});
test('Bloodscent Pup: +1 Attack this turn when an enemy becomes Prey', () => {
  const pup = put(0, 'bloodscent_pup');
  const e = put(1, 'vampire_gargoyle'); e.keywords = [];
  play(0, give(0, 'first_blood'), e.uid);
  if (effectiveAttack(pup) !== 3) return `attack ${effectiveAttack(pup)}`;
});
test('Hammerhead Scout: a small minion in their hand becomes Prey', () => {
  pl(1).hand = []; give(1, 'reef_nibbler');
  play(0, give(0, 'hammerhead_scout'));
  if (!pl(1).hand[0].prey) return 'not marked in hand';
});
test('Mako Sprinter: double damage against Prey', () => {
  const m = put(0, 'mako_sprinter');
  const e = prey(1, 3); e.maxHealth = 20; e.health = 20; e.prey = true; e.attack = 0;
  attack(0, m.uid, e.uid);
  if (e.health !== 10) return `health ${e.health} (expected (3+2)*2 = 10 damage)`;
});
test('Tiger Shark: 2 damage to Prey; Armor if it dies', () => {
  const e = prey(1, 2); e.prey = true;
  play(0, give(0, 'tiger_shark'), e.uid);
  if (pl(0).hero.armor !== 1) return `armor ${pl(0).hero.armor}`;
});
test('Goblin Shark: attacks Stealth minions; +1 damage to damaged minions', () => {
  const g = put(0, 'goblin_shark');
  const e = put(1, 'vampire_gargoyle'); e.keywords = ['Stealth']; e.health = 3; e.maxHealth = 9; e.attack = 0;
  if (!getLegalActions(s).some((a) => a.type === 'attack' && a.attacker === g.uid && a.defender === e.uid)) return 'cannot attack Stealth';
  attack(0, g.uid, e.uid);
  if (e.health > 0 && e.health !== 3 - 3) return `health ${e.health}`;
});
test('Pack Hunters: a Shark Pup, and +1 for Sharks attacking Prey', () => {
  play(0, give(0, 'pack_hunters'));
  const pup = find(0, 'shark_pup');
  if (!pup) return 'no pup';
  pup.sick = false;
  const e = prey(1, 3); e.maxHealth = 20; e.health = 20; e.prey = true; e.attack = 0;
  attack(0, pup.uid, e.uid);
  if (e.health !== 16) return `health ${e.health} (1 + 2 + 1 = 4 damage expected)`;
});
test('Wound Tracker: marks a 3-Health enemy, even in Stealth', () => {
  const e = put(1, 'vampire_gargoyle'); e.keywords = ['Stealth']; e.health = 3;
  pl(1).hero.health = 30;
  // Prey from Blood in the Water would need damage; this is a fresh 3-Health minion
  e.prey = false;
  play(0, give(0, 'wound_tracker'), e.uid);
  if (!e.prey) return 'not marked';
});
test('Great White: killing Prey lets it attack again', () => {
  const g = put(0, 'great_white');
  const e = prey(1, 2); e.prey = true; e.attack = 0;
  attack(0, g.uid, e.uid);
  if (!getLegalActions(s).some((a) => a.type === 'attack' && a.attacker === g.uid)) return 'cannot attack again';
});
test('Sawshark Executioner: 3 damage to Prey; -2 Attack if it survives', () => {
  const big = put(1, 'vampire_gargoyle'); big.keywords = []; big.maxHealth = 9; big.health = 9; big.prey = true; big.attack = 4;
  play(0, give(0, 'sawshark_executioner'), big.uid);
  if (big.health !== 6 || effectiveAttack(big) !== 2) return `health ${big.health} attack ${effectiveAttack(big)}`;
});
test('Bull Shark: Rush (attacks a minion the turn it arrives)', () => {
  const e = prey(1, 4);
  play(0, give(0, 'bull_shark'));
  const b = find(0, 'bull_shark');
  if (!getLegalActions(s).some((a) => a.type === 'attack' && a.attacker === b.uid && a.defender === e.uid)) return 'cannot attack';
});
test('Abyssal Bloodhound: a random Shark, or Discover with Prey', () => {
  pl(0).hand = [];
  play(0, give(0, 'abyssal_bloodhound'));
  if (pl(0).hand.length !== 1 || getCard(pl(0).hand[0].cardId).faction !== 'Sharks') return 'no Shark added';
});
test('Thresher Shark: 1 damage to all enemy minions and marks the low ones', () => {
  const a = prey(1, 4); const b = put(1, 'vampire_gargoyle'); b.keywords = []; b.health = 9; b.maxHealth = 9;
  play(0, give(0, 'thresher_shark'));
  if (a.health !== 3 || !a.prey || b.prey) return `a ${a.health} ${a.prey} b ${b.prey}`;
});
test('Scarred Leviathan: heals your Hero when it damages Prey', () => {
  const l = put(0, 'scarred_leviathan'); pl(0).hero.health = 10;
  const e = prey(1, 3); e.maxHealth = 30; e.health = 3; e.prey = true; e.attack = 0;
  attack(0, l.uid, e.uid);
  if (pl(0).hero.health !== 18) return `hero ${pl(0).hero.health}`;
});
test('Megalodon: destroys a 3-Health Prey; or a Prey in their hand', () => {
  const e = prey(1, 3); e.prey = true; e.maxHealth = 9;
  play(0, give(0, 'megalodon'), e.uid);
  if (!e.destroyed && find(1, 'vampire_gargoyle')) return 'not destroyed';
  pl(1).hand = []; const h = give(1, 'reef_nibbler'); h.prey = true; pl(0).mana.current = 10;
  play(0, give(0, 'megalodon'));
  if (pl(1).hand.length) return 'hand Prey survived';
});
test('Prince of the Red Wake: other Sharks +1/+1 when Prey dies', () => {
  put(0, 'king_of_the_red_wake'); const n = put(0, 'reef_nibbler');
  const e = prey(1, 1); e.prey = true;
  play(0, give(0, 'first_blood'), e.uid);
  if (n.attack !== 3 || n.health !== 3) return `nibbler ${n.attack}/${n.health}`;
});

// ---- Spells ---------------------------------------------------------------------------------
test('Razor Bite: 3 damage, +1 if it is Prey and survives', () => {
  const e = put(1, 'vampire_gargoyle'); e.keywords = []; e.health = 9; e.maxHealth = 9; e.prey = true;
  play(0, give(0, 'razor_bite'), e.uid);
  if (e.health !== 5) return `health ${e.health}`;
});
test('Frenzy of the Pack: +2 Attack; new Sharks may attack Prey', () => {
  const e = prey(1, 3); e.prey = true; e.maxHealth = 20; e.health = 3;
  play(0, give(0, 'reef_nibbler'));
  const n = pl(0).board.at(-1);
  play(0, give(0, 'frenzy_of_the_pack'));
  if (!getLegalActions(s).some((a) => a.type === 'attack' && a.attacker === n.uid && a.defender === e.uid)) return 'cannot attack Prey';
  if (getLegalActions(s).some((a) => a.type === 'attack' && a.attacker === n.uid && a.defender === pl(1).hero.uid)) return 'can attack the Hero';
});
test('Echoes of Blood: reveals Stealth and marks the weak', () => {
  const e = put(1, 'vampire_gargoyle'); e.keywords = ['Stealth']; e.health = 2;
  play(0, give(0, 'echoes_of_blood'));
  if (hasKeyword(e, 'Stealth') || !e.prey) return 'not revealed/marked';
});
test('Feeding Frenzy: 2 damage to all; those left at 1 die', () => {
  const a = prey(1, 3); const b = put(1, 'vampire_gargoyle'); b.keywords = []; b.health = 9; b.maxHealth = 9;
  play(0, give(0, 'feeding_frenzy'));
  if (find(1, 'vampire_gargoyle') === a || pl(1).board.includes(a)) return 'the 1-Health one survived';
  if (b.health !== 7) return `b ${b.health}`;
});
test('Nothing Escapes the Current: destroys weak Prey, else 4 damage', () => {
  const e = prey(1, 3); e.prey = true; e.maxHealth = 9;
  play(0, give(0, 'nothing_escapes_the_current'));
  if (e.health !== 0 && pl(1).board.includes(e)) return `health ${e.health}`;
});

// ---- Traps ------------------------------------------------------------------------------------
test('Beneath the Sand: a 2/1 Rush Shark attacks a weak attacker', () => {
  play(0, give(0, 'beneath_the_sand'));
  endTurn();
  const e = put(1, 'vampire_gargoyle'); e.keywords = []; e.health = 2;
  attack(1, e.uid, pl(0).hero.uid);
  if (pl(1).board.includes(e)) return 'attacker survived';
});
test('Blood Bait: a new enemy minion gets -1 Health this turn and is marked', () => {
  play(0, give(0, 'blood_bait'));
  endTurn();
  play(1, give(1, 'vampire_gargoyle'));
  const g = find(1, 'vampire_gargoyle');
  if (!g || g.health !== 3 || !g.prey) return `health ${g?.health} prey ${g?.prey}`;
});
test('The Killing Current: Prey that attacks takes 2 first', () => {
  play(0, give(0, 'the_killing_current'));
  endTurn();
  const e = put(1, 'vampire_gargoyle'); e.keywords = []; e.health = 2; e.prey = true;
  attack(1, e.uid, pl(0).hero.uid);
  if (pl(1).board.includes(e)) return 'survived';
});
test('Ambush from Below: a 4/3 Rush Shark hits a weak new minion', () => {
  play(0, give(0, 'ambush_from_below'));
  endTurn();
  play(1, give(1, 'blood_mite'));
  if (find(1, 'blood_mite')) return 'it survived';
}, 'Vampires', ['Vampires', 'Robots']);

// ---- Quick Plays ------------------------------------------------------------------------------
test('Snap Reaction: 1 damage to a Marked Prey', () => {
  const e = prey(1, 3); e.prey = true;
  give(0, 'snap_reaction');
  endTurn();
  play(1, give(1, 'fireball'), pl(0).hero.uid, (legal) => legal.find((a) => a.type === 'quickPlay' && a.target === e.uid));
  if (e.health !== 2) return `health ${e.health}`;
}, 'Vampires', ['Dragons', 'Robots']);
test('Scent Through Stone: reveal a Stealth minion, mark and hit it', () => {
  const e = put(1, 'vampire_gargoyle'); e.keywords = ['Stealth']; e.health = 3;
  give(0, 'scent_through_stone');
  endTurn();
  play(1, give(1, 'fireball'), pl(0).hero.uid, (legal) => legal.find((a) => a.type === 'quickPlay' && a.target === e.uid));
  if (hasKeyword(e, 'Stealth') || !e.prey || e.health !== 2) return `stealth ${hasKeyword(e, 'Stealth')} prey ${e.prey} hp ${e.health}`;
}, 'Vampires', ['Dragons', 'Robots']);
test('Intercept: +3 Attack and it fights a Prey', () => {
  const sh = put(0, 'reef_nibbler');
  const e = prey(1, 3); e.prey = true; e.attack = 0;
  give(0, 'intercept');
  endTurn();
  play(1, give(1, 'fireball'), pl(0).hero.uid, (legal) => legal.find((a) => a.type === 'quickPlay' && a.target === sh.uid));
  if (pl(1).board.includes(e)) return 'Prey survived';
}, 'Vampires', ['Dragons', 'Robots']);
test('The Scent Is Fresh: marks, or 3 damage if already Prey', () => {
  const e = prey(1, 3); e.maxHealth = 9; e.prey = true;
  give(0, 'the_scent_is_fresh');
  endTurn();
  play(1, give(1, 'fireball'), pl(0).hero.uid, (legal) => legal.find((a) => a.type === 'quickPlay' && a.target === e.uid));
  if (pl(1).board.includes(e) && e.health > 0) return `health ${e.health}`;
}, 'Vampires', ['Dragons', 'Robots']);

// ---- Fusions ----------------------------------------------------------------------------------
const fuse = (id, target) => { pl(0).fusion.charge = 3; heroSpell(0, id, target); };
const enemy = (hp = 9) => { const e = put(1, 'vampire_gargoyle'); e.keywords = []; e.health = hp; e.maxHealth = hp; return e; };
test('Blood Frenzy Feast (Vampires)', () => { const e = enemy(); pl(0).hero.health = 20; fuse('blood_frenzy_feast', e.uid); if (e.health !== 7 || !e.prey || pl(0).hero.health !== 21) return `${e.health} ${e.prey} ${pl(0).hero.health}`; });
test('Abyssal Probe (Aliens)', () => { const e = enemy(); e.keywords = ['Stealth']; put(0, 'reef_nibbler'); fuse('abyssal_probe', e.uid); if (!e.prey) return 'not marked'; }, 'Aliens');
test('Prehistoric Jaws (Dinosaurs)', () => { const m = put(0, 'reef_nibbler'); fuse('prehistoric_jaws', m.uid); if (m.attack !== 5 || !hasKeyword(m, 'Rush')) return `${m.attack}`; }, 'Dinosaurs');
test('Kelp Snare (Plants)', () => { const a = enemy(5); const b = enemy(8); fuse('kelp_snare'); if (!a.prey || b.prey || !find(0, 'seedling')) return 'wrong'; }, 'Plants');
test('Spore Chum (Fungus)', () => { const e = enemy(); fuse('spore_chum'); if (e.health !== 8) return `${e.health}`; }, 'Fungus');
test('Drowned Dead (Zombies)', () => { const m = put(0, 'reef_nibbler'); fuse('drowned_dead', m.uid); if (!hasKeyword(m, 'Reborn') || pl(0).corpses !== 1) return 'wrong'; }, 'Zombies');
test('Boiling Tide (Dragons)', () => { const e = enemy(3); fuse('boiling_tide'); if (!e.prey || !(e.burn > 0)) return 'wrong'; }, 'Dragons');
test('Hellmaw Hunt (Demons)', () => { const hp = pl(0).hero.health; fuse('hellmaw_hunt'); if (!find(0, 'hellmaw_shark') || pl(0).hero.health !== hp - 3) return 'wrong'; }, 'Demons');
test('Holy Undertow (Divine)', () => { const e = enemy(2); e.prey = true; pl(0).hero.health = 20; fuse('holy_undertow', e.uid); if (pl(1).board.includes(e) && e.health > 0) return 'Prey survived'; if (pl(0).hero.health !== 24) return `hero ${pl(0).hero.health}`; }, 'Divine');
test('Torpedo Fin (Robots)', () => { const m = put(0, 'reef_nibbler'); fuse('torpedo_fin', m.uid); if (m.attack !== 4 || !hasKeyword(m, 'Rush') || !(m.upgrades > 0)) return 'wrong'; }, 'Robots');
test('Glowing Wake (Radioactive)', () => { const e = enemy(); fuse('glowing_wake', e.uid); if (!e.prey || !(radiationOf(e) > 0)) return 'wrong'; }, 'Radioactive');
test('Swarm Bait (Bees)', () => { const e = enemy(3); const before = count(0, 'worker_bee'); fuse('swarm_bait'); if (count(0, 'worker_bee') !== before + 2 || e.health !== 2) return 'wrong'; }, 'Bees');
test('Ghost Fin (Ghosts)', () => { bury(1, 'tiger_shark'); fuse('ghost_fin'); const m = find(0, 'tiger_shark'); if (!m || !hasKeyword(m, 'Rush')) return 'wrong'; }, 'Ghosts');
test('Riptide Rift (Ultraterrestrials)', () => { const e = enemy(); fuse('riptide_rift', e.uid); if (pl(1).board.includes(e)) return 'not displaced'; endTurn(); endTurn(); if (!e.prey || e.health !== 8) return `${e.prey} ${e.health}`; }, 'Ultraterrestrials');

console.log(`\n${passed} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
