// Rules tests for the Ultraterrestrial faction (Displacement), its Hero Spell and its Fusions. Each test sets up a small board, plays the card through the real engine,
// and checks the outcome.   node tools/test-ultraterrestrials.mjs

import { buildDeck } from '../src/cards/index.js';
import { addToHand, costOf, effectiveAttack, hasKeyword, radiationOf, summonMinion } from '../src/engine/core.js';
import { applyAction, createGame, getLegalActions } from '../src/engine/engine.js';
import { getCard } from '../src/engine/registry.js';

let s;
let failures = 0;
let passed = 0;

// Player 0 runs Ultraterrestrials (+ `partner`); player 1 runs `foe`.
function fresh(partner = 'Vampires', foe = ['Dragons', 'Robots']) {
  const fa = ['Ultraterrestrials', partner];
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


// ---- Displacement ---------------------------------------------------------------------
test('Between Worlds: a friendly minion leaves, then returns at your next turn with +1/+1', () => {
  const m = put(0, 'phase_jelly');
  heroSpell(0, 'between_worlds', m.uid);
  if (onBoard(m) || !away(m)) return 'not Displaced';
  endTurn();
  if (onBoard(m)) return 'back too early';
  endTurn();
  if (!onBoard(m)) return 'did not return';
  if (m.attack !== 4 || m.maxHealth !== 5) return `stats ${m.attack}/${m.maxHealth}`;
});
test('Between Worlds: an enemy minion returns exhausted and can\'t attack its next turn', () => {
  const e = put(1, 'vampire_gargoyle');
  heroSpell(0, 'between_worlds', e.uid);
  endTurn();                       // their turn: it is gone
  if (onBoard(e)) return 'still on their board';
  endTurn();                       // my turn: it returns
  if (!onBoard(e) || e.controller !== 1) return 'did not return to its owner';
  endTurn();                       // their turn: exhausted
  if (getLegalActions(s).some((a) => a.type === 'attack' && a.attacker === e.uid)) return 'it can attack';
  endTurn(); endTurn();
  if (!getLegalActions(s).some((a) => a.type === 'attack' && a.attacker === e.uid)) return 'still exhausted a turn later';
});
test('Displaced minions can\'t be attacked or targeted and free a board slot', () => {
  for (let i = 0; i < 7; i++) put(0, 'riftling');
  const m = pl(0).board[0];
  play(0, give(0, 'pocket_dimension'), m.uid);
  if (pl(0).board.length !== 6) return `board ${pl(0).board.length}`;
  endTurn();
  if (getLegalActions(s).some((a) => a.target === m.uid || a.defender === m.uid)) return 'still targetable';
});
test('Displaced minions\' abilities stop while away (no triggers)', () => {
  const sen = put(0, 'dimensional_sentinel');
  const r = put(0, 'riftling');
  play(0, give(0, 'pocket_dimension'), sen.uid);
  play(0, give(0, 'pocket_dimension'), r.uid);
  if (sen.tempAttack) return 'the away Sentinel still reacted';
});
test('A full board makes a returning minion wait Beyond Reality', () => {
  const m = put(0, 'phase_jelly');
  play(0, give(0, 'pocket_dimension'), m.uid);
  for (let i = 0; i < 7; i++) put(0, 'riftling');
  endTurn(); endTurn();
  if (onBoard(m) || !away(m)) return 'it vanished or squeezed in';
  pl(0).board.pop();
  endTurn();
  if (!onBoard(m)) return 'did not come back when room opened';
});

// ---- Minions ---------------------------------------------------------------------------
test('Riftling: your next Displacement this turn lasts 1 more turn', () => {
  play(0, give(0, 'riftling'));
  const m = put(0, 'phase_jelly');
  play(0, give(0, 'pocket_dimension'), m.uid);
  endTurn(); endTurn();
  if (onBoard(m)) return 'returned on time (no extra turn)';
  endTurn(); endTurn();
  if (!onBoard(m)) return 'never returned';
});
test('Phase Skitter: losing Evade Displaces it', () => {
  const m = put(0, 'phase_skitter');
  endTurn();
  play(1, give(1, 'fireball'), m.uid);
  if (onBoard(m) || !away(m)) return 'not Displaced after losing Evade';
});
test('Paradox Crystal: 1 Armor the first time you Displace a friendly minion each turn', () => {
  put(0, 'paradox_crystal');
  const a = put(0, 'riftling'); const b = put(0, 'riftling');
  play(0, give(0, 'pocket_dimension'), a.uid);
  play(0, give(0, 'pocket_dimension'), b.uid);
  if (pl(0).hero.armor !== 1) return `armor ${pl(0).hero.armor}`;
});
test('Observer Outside Time: keep one of the top 3 on top, the rest go to the bottom', () => {
  const top = pl(0).deck.slice(0, 3).map((c) => c.uid);
  play(0, give(0, 'observer_outside_time'));
  const d = pl(0).deck;
  if (d[0].uid !== top[0]) return 'chosen card not on top';
  if (!top.slice(1).every((u) => d.slice(-2).some((c) => c.uid === u))) return 'others not at the bottom';
});
test('Rift Hunter: Displaces a random enemy minion with 2 or less Attack', () => {
  const big = put(1, 'vampire_gargoyle'); big.attack = 5;
  const small = put(1, 'riftling');
  play(0, give(0, 'rift_hunter'));
  if (onBoard(small) || !onBoard(big)) return 'wrong minion';
});
test('Phase Jelly: restores 2 Health to your Hero when it returns', () => {
  const m = put(0, 'phase_jelly');
  pl(0).hero.health = 20;
  play(0, give(0, 'pocket_dimension'), m.uid);
  endTurn(); endTurn();
  if (pl(0).hero.health !== 22) return `hero ${pl(0).hero.health}`;
});
test('Chrono-Warp Adept: a friendly Displaced minion returns a turn sooner', () => {
  const m = put(0, 'phase_jelly');
  play(0, give(0, 'pocket_dimension'), m.uid);
  play(0, give(0, 'chrono_warp_adept'));
  if (!onBoard(m)) return 'did not return early';
});
test('Reality Stalker: 2 damage to a minion that returned this turn', () => {
  const m = put(1, 'vampire_gargoyle');
  heroSpell(0, 'between_worlds', m.uid);
  endTurn(); endTurn();
  play(0, give(0, 'reality_stalker'), m.uid);
  if (m.health !== m.maxHealth - 2) return `health ${m.health}/${m.maxHealth}`;
});
test('Reality Stalker can\'t target a minion that didn\'t return this turn', () => {
  const m = put(1, 'vampire_gargoyle');
  const inst = give(0, 'reality_stalker');
  if (getLegalActions(s).some((a) => a.type === 'play' && a.card === inst.uid && a.target === m.uid)) return 'targets it';
});
test('Dimensional Sentinel: +1 Attack this turn when you Displace a friendly minion', () => {
  const sen = put(0, 'dimensional_sentinel');
  const r = put(0, 'riftling');
  play(0, give(0, 'pocket_dimension'), r.uid);
  if (effectiveAttack(sen) !== 4) return `attack ${effectiveAttack(sen)}`;
  endTurn();
  if (effectiveAttack(sen) !== 3) return 'the Attack did not wear off';
});
test('Parallel Self: summons a 1/1 Echo Copy with no effects', () => {
  play(0, give(0, 'parallel_self'));
  const e = find(0, 'echo_copy');
  if (!e || e.attack !== 1 || e.health !== 1) return 'no Echo Copy';
});
test('Probability Engine: 1 temporary Mana next turn when a minion returns, once per turn', () => {
  put(0, 'probability_engine');
  const a = put(0, 'riftling'); const b = put(0, 'riftling');
  play(0, give(0, 'pocket_dimension'), a.uid);
  play(0, give(0, 'pocket_dimension'), b.uid);
  applyAction(s, { type: 'endTurn', player: 0 }); settle();
  applyAction(s, { type: 'endTurn', player: 1 }); settle();
  if (pl(0).mana.bonusNextTurn !== 1) return `bonus ${pl(0).mana.bonusNextTurn}`;
});
test('Null Behemoth: Displaces another friendly minion and gets +2/+2 when it returns', () => {
  const r = put(0, 'riftling');
  play(0, give(0, 'null_behemoth'), r.uid);
  const nb = find(0, 'null_behemoth');
  if (onBoard(r)) return 'not Displaced';
  endTurn(); endTurn();
  if (!onBoard(r)) return 'did not return';
  if (nb.attack !== 8 || nb.health !== 8) return `behemoth ${nb.attack}/${nb.health}`;
});
test('Sovereign of Elsewhere: the first Displaced minion each turn returns with +1/+1', () => {
  put(0, 'sovereign_of_elsewhere');
  const a = put(0, 'phase_jelly'); const b = put(0, 'phase_jelly');
  play(0, give(0, 'pocket_dimension'), a.uid);
  play(0, give(0, 'pocket_dimension'), b.uid);
  endTurn(); endTurn();
  if (a.attack !== 4 || b.attack !== 3) return `a ${a.attack} b ${b.attack}`;
});
test('The Unplaceable: all other minions leave and return to their own sides', () => {
  const mine = put(0, 'riftling'); const theirs = put(1, 'vampire_gargoyle');
  play(0, give(0, 'the_unplaceable'));
  if (pl(0).board.length !== 1 || pl(1).board.length) return 'others still on the board';
  endTurn(); endTurn();
  if (!pl(0).board.includes(mine) || !pl(1).board.includes(theirs)) return 'did not return to their sides';
});

// ---- Spells -----------------------------------------------------------------------------
test('Banish from This World: only an enemy minion with 3 or less Attack', () => {
  const big = put(1, 'vampire_gargoyle'); big.attack = 4;
  const inst = give(0, 'banish_from_this_world');
  if (getLegalActions(s).some((a) => a.type === 'play' && a.card === inst.uid && a.target === big.uid)) return 'targets 4 Attack';
  const small = put(1, 'riftling');
  play(0, inst, small.uid);
  if (onBoard(small)) return 'not Displaced';
});
test('Temporal Reversal: back to hand, costs 1 less', () => {
  const m = put(0, 'phase_jelly');
  play(0, give(0, 'temporal_reversal'), m.uid);
  const c = pl(0).hand.find((x) => x.cardId === 'phase_jelly');
  if (!c || costOf(s, c) !== 2) return `cost ${c && costOf(s, c)}`;
});
test('Folded Space: a friendly and an enemy minion both leave', () => {
  const a = put(0, 'riftling'); const b = put(1, 'vampire_gargoyle');
  applyAction(s, { type: 'play', player: 0, card: give(0, 'folded_space').uid, target: a.uid, target2: b.uid }); settle();
  if (onBoard(a) || onBoard(b)) return 'still on the board';
});
test('Impossible Blueprint: Discover an Ultraterrestrial minion, 2 less (minimum 1)', () => {
  play(0, give(0, 'impossible_blueprint'));
  const c = pl(0).hand[0];
  if (!c) return 'nothing Discovered';
  const card = getCard(c.cardId);
  if (card.faction !== 'Ultraterrestrials' || card.type !== 'minion') return `got ${c.cardId}`;
  if (costOf(s, c) !== Math.max(1, card.cost - 2)) return `cost ${costOf(s, c)} for ${card.cost}`;
});
test('Scale Paradox: +4/+4 this turn, then Displaced at the end of your turn', () => {
  const m = put(0, 'phase_jelly');
  play(0, give(0, 'scale_paradox'), m.uid);
  if (effectiveAttack(m) !== 7 || m.health !== 8) return `buffed ${effectiveAttack(m)}/${m.health}`;
  endTurn();
  if (onBoard(m)) return 'not Displaced at end of turn';
  endTurn();
  if (!onBoard(m) || m.maxHealth !== 4 || effectiveAttack(m) !== 3) return `returned ${effectiveAttack(m)}/${m.maxHealth}`;
});
test('Reality Overlap: every minion with 2 or less Attack leaves', () => {
  const a = put(0, 'riftling'); const b = put(1, 'vampire_gargoyle'); b.attack = 3; const c = put(1, 'riftling');
  play(0, give(0, 'reality_overlap'));
  if (onBoard(a) || onBoard(c) || !onBoard(b)) return 'wrong minions';
});
test('Collapse the Coordinates: all enemies leave; draw 1 per 2', () => {
  for (let i = 0; i < 5; i++) put(1, 'riftling');
  const hand = pl(0).hand.length;
  play(0, give(0, 'collapse_the_coordinates'));
  if (pl(1).board.length) return 'enemies remain';
  if (pl(0).hand.length !== hand + 2) return `drew ${pl(0).hand.length - hand}`;
});

// ---- Traps ------------------------------------------------------------------------------
test('Invisible Threshold: an enemy attacking your Hero is Displaced; the attack fizzles', () => {
  play(0, give(0, 'invisible_threshold'));
  endTurn();
  const e = put(1, 'vampire_gargoyle');
  const hp = pl(0).hero.health;
  attack(1, e.uid, pl(0).hero.uid);
  if (pl(0).hero.health !== hp) return 'the Hero took damage';
  if (onBoard(e)) return 'attacker still there';
  endTurn();
  if (onBoard(e)) return 'back on my turn (should wait for theirs)';
  endTurn();
  if (!onBoard(e)) return 'never returned';
});
test('Paradox Mine: an enemy 4+ cost minion gets -2 Attack this turn', () => {
  play(0, give(0, 'paradox_mine'));
  endTurn();
  play(1, give(1, 'null_behemoth'));
  const nb = find(1, 'null_behemoth');
  if (effectiveAttack(nb) !== 4) return `attack ${effectiveAttack(nb)}`;
});
test('Mirror of Elsewhere: the targeted friendly minion leaves and the spell misses it', () => {
  const m = put(0, 'phase_jelly');
  play(0, give(0, 'mirror_of_elsewhere'));
  endTurn();
  play(1, give(1, 'fireball'), m.uid);
  if (onBoard(m) || !away(m)) return 'not Displaced';
  if (m.health !== 4) return `took damage (${m.health})`;
});
test('Wrong Reality: an enemy minion goes back to their hand and costs 1 more', () => {
  play(0, give(0, 'wrong_reality'));
  endTurn();
  play(1, give(1, 'vampire_gargoyle'));
  if (find(1, 'vampire_gargoyle')) return 'still on the board';
  const c = pl(1).hand.find((x) => x.cardId === 'vampire_gargoyle');
  if (!c || costOf(s, c) !== 4) return `cost ${c && costOf(s, c)}`;
});

// ---- Quick Plays --------------------------------------------------------------------------
test('Out of Phase: a friendly minion about to be hit is Displaced instead', () => {
  const m = put(0, 'phase_jelly');
  give(0, 'out_of_phase');
  endTurn();
  const e = put(1, 'vampire_gargoyle');
  attack(1, e.uid, m.uid, qp('out_of_phase'));
  if (onBoard(m) || m.health !== 4) return `health ${m.health}, on board ${onBoard(m)}`;
});
test('Spatial Redirection: the enemy spell goes to another target', () => {
  const m = put(0, 'phase_jelly'); put(0, 'riftling');
  give(0, 'spatial_redirection');
  endTurn();
  play(1, give(1, 'fireball'), m.uid, qp('spatial_redirection'));
  if (m.health !== 4) return 'it still hit the original target';
});
test('Borrowed Seconds: +2 Health this turn; draw if it survives', () => {
  const m = put(0, 'phase_jelly');
  give(0, 'borrowed_seconds');
  endTurn();
  const hand = pl(0).hand.length;
  play(1, give(1, 'fireball'), m.uid, (legal) => legal.find((a) => a.type === 'quickPlay' && a.target === m.uid));
  if (!onBoard(m)) return 'died';
  endTurn();
  if (pl(0).hand.length < hand) return 'no card drawn';
});
test('Emergency Dimensional Shift: all friendly minions leave until your next turn', () => {
  put(0, 'riftling'); put(0, 'phase_jelly');
  give(0, 'emergency_dimensional_shift');
  endTurn();
  play(1, give(1, 'fireball'), pl(1).hero.uid, qp('emergency_dimensional_shift'));
  if (pl(0).board.length) return 'minions still there';
  endTurn();
  if (pl(0).board.length !== 2) return 'did not return';
});

// ---- Fusions -------------------------------------------------------------------------------
const fuse = (id, target, partner) => { pl(0).fusion.charge = 3; heroSpell(0, id, target); };
test('Blood Elsewhere (Vampires): 2 damage on return and 2 Health for you', () => {
  const e = put(1, 'vampire_gargoyle'); pl(0).hero.health = 20;
  fuse('blood_elsewhere', e.uid);
  endTurn(); endTurn();
  if (e.health !== e.maxHealth - 2) return `enemy ${e.health}`;
  if (pl(0).hero.health !== 21) return `hero ${pl(0).hero.health}`;
});
test('Abducted Beyond (Aliens): it returns under your control', () => {
  const e = put(1, 'vampire_gargoyle');
  fuse('abducted_beyond', e.uid);
  endTurn(); endTurn();
  if (!pl(0).board.includes(e) || e.controller !== 0) return 'not mine';
}, 'Aliens');
test('Fossil Rift (Dinosaurs): +2/+2 on return (+4/+4 for a Dinosaur)', () => {
  const m = put(0, 'phase_jelly');
  fuse('fossil_rift', m.uid);
  endTurn(); endTurn();
  if (m.attack !== 5 || m.health !== 6) return `${m.attack}/${m.health}`;
}, 'Dinosaurs');
test('Seeds Out of Time (Plants): a Seedling arrives next turn with +2/+2', () => {
  fuse('seeds_out_of_time');
  if (find(0, 'seedling')) return 'arrived immediately';
  endTurn(); endTurn();
  const sd = find(0, 'seedling');
  if (!sd) return 'no Seedling';
}, 'Plants');
test('Spores from Elsewhere (Fungus): 2 Mushrooms and a small enemy leaves', () => {
  const small = put(1, 'riftling');
  fuse('spores_from_elsewhere');
  if (onBoard(small)) return 'not Displaced';
  const n = pl(1).deck.reduce((t, c) => t + (c.mushrooms ?? 0), 0);
  if (n !== 2) return `${n} Mushrooms`;
}, 'Fungus');
test('Return Twice (Zombies): returns with Reborn', () => {
  const m = put(0, 'phase_jelly');
  fuse('return_twice', m.uid);
  endTurn(); endTurn();
  if (!hasKeyword(m, 'Reborn')) return 'no Reborn';
}, 'Zombies');
test('Rift Flame (Dragons): Burn 2 on return', () => {
  const e = put(1, 'vampire_gargoyle');
  fuse('rift_flame', e.uid);
  endTurn(); endTurn();
  if (!(e.burn >= 2)) return `burn ${e.burn}`;
}, 'Dragons');
test('Infernal Detour (Demons): lose 3; enemies with 3 or less Attack leave', () => {
  const a = put(1, 'riftling'); const b = put(1, 'vampire_gargoyle'); b.attack = 5;
  const hp = pl(0).hero.health;
  fuse('infernal_detour');
  if (onBoard(a) || !onBoard(b)) return 'wrong minions';
  if (pl(0).hero.health !== hp - 3) return 'no Health lost';
}, 'Demons');
test('Sanctum Between Worlds (Divine): cleansed, returns with +2 Health and Evade', () => {
  const m = put(0, 'phase_jelly'); m.keywords.push('Frozen');
  fuse('sanctum_between_worlds', m.uid);
  endTurn(); endTurn();
  if (hasKeyword(m, 'Frozen') || !hasKeyword(m, 'Evade') || m.maxHealth !== 6) return 'wrong result';
}, 'Divine');
test('Phase Upgrade (Robots): a Robot returns Upgraded with +2/+2', () => {
  const r = put(0, 'maintenance_bot');
  const a0 = r.attack;
  fuse('phase_upgrade', r.uid);
  endTurn(); endTurn();
  if (r.attack !== a0 + 2 || !(r.upgrades > 0)) return `attack ${r.attack} upgrades ${r.upgrades}`;
}, 'Robots');
test('Half-Life Shift (Radioactive): returns with Radiation', () => {
  const e = put(1, 'vampire_gargoyle');
  fuse('half_life_shift', e.uid);
  endTurn(); endTurn();
  if (!(radiationOf(e) > 0)) return 'no Radiation';
}, 'Radioactive');
test('Hive Outside Time (Bees): two Worker Bees arrive next turn with +1/+1', () => {
  const before = pl(0).board.filter((m) => m.cardId === 'worker_bee').length;
  fuse('hive_outside_time');
  if (pl(0).board.filter((m) => m.cardId === 'worker_bee').length !== before) return 'arrived immediately';
  applyAction(s, { type: 'endTurn', player: 0 }); settle();
  applyAction(s, { type: 'endTurn', player: 1 }); settle();
  const bees = pl(0).board.filter((m) => m.cardId === 'worker_bee' && m.attack === 2);
  if (bees.length !== 2) return `${bees.length} buffed bees`;
}, 'Bees');
test('Haunting Elsewhere (Ghosts): Haunt, Displaced, returns with Reborn', () => {
  bury(1, 'vampire_gargoyle');
  fuse('haunting_elsewhere');
  if (find(0, 'vampire_gargoyle')) return 'arrived immediately';
  endTurn(); endTurn();
  const m = find(0, 'vampire_gargoyle');
  if (!m || !hasKeyword(m, 'Reborn')) return 'no Reborn Haunt';
}, 'Ghosts');

console.log(`\n${passed} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
