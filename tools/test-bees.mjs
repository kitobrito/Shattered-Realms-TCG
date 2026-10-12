// Rules tests for the Insect faction (Queen & Hive), its Hero Spells and its Fusions.
// Each test sets up a small board, plays the card through the real engine,
// and checks the outcome.   node tools/test-bees.mjs

import { buildDeck } from '../src/cards/index.js';
import { addToHand, summonMinion, hasKeyword, effectiveAttack } from '../src/engine/core.js';
import { applyAction, attackTargets, createGame, getLegalActions } from '../src/engine/engine.js';
import { getCard } from '../src/engine/registry.js';

let s;
let failures = 0;
let passed = 0;

// Player 0 runs Bees (+ `partner`); player 1 runs `foe`.
function fresh(partner = 'Vampires', foe = ['Vampires', 'Robots']) {
  const fa = ['Bees', partner];
  const players = [{ name: 'A', factions: fa, deck: buildDeck(fa) }, { name: 'B', factions: foe, deck: buildDeck(foe) }];
  s = createGame({ seed: 5, rules: { mulligan: false, secondPlayerPotions: false, openingHandHelp: false }, players });
  for (const p of s.players) { p.hand = []; p.mana.max = 10; p.mana.current = 10; p.mana.primal = 0; p.mana.base = 10; }
}
const pl = (p) => s.players[p];
const put = (p, id, opts = {}) => { const m = summonMinion(s, p, id, opts); m.sick = false; return m; };
const give = (p, id) => addToHand(s, p, id);
const minion = (uid) => s.players.flatMap((x) => x.board).find((m) => m.uid === uid);
const hive = (p = 0) => pl(p).board.find((m) => m.cardId === 'the_hive');
const queen = (p = 0) => pl(p).board.find((m) => m.cardId === 'the_queen');
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

function test(name, fn, ...args) {
  fresh(...args);
  try {
    const problem = fn();
    if (problem) { failures++; console.log(`FAIL ${name}: ${problem}`); } else { passed++; console.log(`ok   ${name}`); }
  } catch (e) { failures++; console.log(`FAIL ${name}: threw ${e.stack.split('\n').slice(0, 3).join(' | ')}`); }
}

// ---- The Hive and the Queen ---------------------------------------------------------
test('The Hive makes a Worker Bee at the end of your turn', () => {
  endTurn();
  if (count(0, 'worker_bee') !== 1) return `bees ${count(0, 'worker_bee')}`;
});
test('The game starts with a 0/5 Hive that can\'t attack', () => {
  const h = hive();
  if (!h || h.attack !== 0 || h.health !== 5) return `hive ${h?.attack}/${h?.health}`;
  if (pl(1).board.length) return 'the non-Insect player got a Hive';
  h.attack = 3;
  if (getLegalActions(s).some((a) => a.type === 'attack' && a.attacker === h.uid)) return 'the Hive can attack';
});
test('Hive destroyed: the Queen (5/1 Venomous) emerges; the Hero takes no damage', () => {
  const hp = pl(0).hero.health;
  hive().health = 0; hive().destroyed = true;
  endTurn();
  const q = queen();
  if (!q) return 'no Queen';
  if (q.attack !== 5 || q.health !== 1 || !hasKeyword(q, 'Venomous')) return `queen ${q.attack}/${q.health}`;
  if (pl(0).hero.health !== hp) return 'the Hero took damage';
});
test('Queen dies: her Hero takes 10 damage, and she can never return', () => {
  hive().destroyed = true;
  endTurn();
  const hp = pl(0).hero.health;
  const foe = put(1, 'vampire_gargoyle');
  attack(1, foe.uid, queen().uid);
  if (queen()) return 'Queen still alive';
  if (pl(0).hero.health !== hp - 10) return `Hero ${hp} -> ${pl(0).hero.health}`;
  summonMinion(s, 0, 'the_queen');
  if (queen()) return 'Queen came back';
});
test('A Queen returned to hand can be played again; a dead Queen never returns', () => {
  hive().destroyed = true; endTurn(); endTurn();
  const q = queen();
  pl(0).board = pl(0).board.filter((m) => m !== q);
  const card = give(0, 'the_queen');
  play(0, card);
  if (!queen()) return 'replayed Queen did not enter play';
  queen().health = 0; endTurn(); endTurn();
  if (queen()) return 'Queen survived';
  play(0, give(0, 'the_queen'));
  if (queen()) return 'a dead Queen came back';
});
test('Queen is Venomous when she attacks', () => {
  hive().destroyed = true;
  endTurn(); endTurn();
  const big = put(1, 'vampire_gargoyle', { health: 20 });
  queen().sick = false;
  attack(0, queen().uid, big.uid);
  if (minion(big.uid)) return 'big minion survived the Queen';
});

// ---- Passive Hero Spell: Fusion charging ----------------------------------------------
test('The Living Hive is the only Hero Spell (passive); the Fusion charges every other turn', () => {
  if (pl(0).heroSpells.some((h) => getCard(h.cardId).faction === 'Bees')) return 'Bees have an active Hero Spell';
  if (!pl(0).passives.includes('hive_mind')) return 'no passive';
  const start = pl(0).fusion.charge;
  for (let i = 0; i < 4; i++) endTurn();
  if (pl(0).fusion.charge !== start + 1) return `charge ${start} -> ${pl(0).fusion.charge}`;
}, 'Robots');
test('Bees + Dinosaurs: both passive, so +2 charge every other turn', () => {
  const start = pl(0).fusion.charge;
  for (let i = 0; i < 4; i++) endTurn();
  if (pl(0).fusion.charge !== Math.min(3, start + 2)) return `charge ${start} -> ${pl(0).fusion.charge}`;
}, 'Dinosaurs');

// ---- Minions ----------------------------------------------------------------
test('Waxworker: restores 2 to the Hive', () => {
  hive().health = 2;
  play(0, give(0, 'waxworker'));
  if (hive().health !== 4) return `hive ${hive().health}`;
});
test('Nurse Bee: end of turn, a friendly Insect gets +1 Health', () => {
  pl(0).board = pl(0).board.filter((m) => m.cardId !== 'the_hive');
  put(0, 'the_hive');
  const n = put(0, 'nurse_bee');
  const total = () => pl(0).board.filter((m) => m.tribes.includes('Insect')).reduce((t, m) => t + m.maxHealth, 0);
  const before = total();
  endTurn();
  // the Hive's new Worker Bee (1) + the Nurse's +1
  if (total() !== before + 2) return `Insect Health ${before} -> ${total()}`;
});
test('Hive Sentinel: +1 Health only while the Hive is in play', () => {
  const m = put(0, 'hive_sentinel');
  endTurn(); endTurn();
  if (minion(m.uid).maxHealth !== 4) return `with Hive ${minion(m.uid).maxHealth}`;
  hive().destroyed = true; endTurn();
  if (minion(m.uid).maxHealth !== 3) return `without Hive ${minion(m.uid).maxHealth}`;
});
test('Honey Gatherer: adds Honey; Honey heals the Hive', () => {
  play(0, give(0, 'honey_gatherer'));
  const honey = pl(0).hand.find((h) => h.cardId === 'honey');
  if (!honey) return 'no Honey';
  hive().health = 1;
  play(0, honey, hive().uid);
  if (hive().health !== 3) return `hive ${hive().health}`;
});
test('Royal Bodyguard: enemy spells can\'t target the Queen', () => {
  hive().destroyed = true; endTurn();
  if (hasKeyword(queen(), 'Elusive')) return 'Elusive without a Bodyguard';
  put(0, 'royal_bodyguard'); endTurn();
  if (!hasKeyword(queen(), 'Elusive')) return 'no Elusive';
});
test('Venom Guard: Venomous and Taunt', () => {
  const m = put(0, 'venom_guard');
  if (!hasKeyword(m, 'Venomous') || !hasKeyword(m, 'Taunt')) return 'missing keywords';
});
test('Royal Nurse: Hive +3 max Health and healed 3', () => {
  hive().health = 2;
  play(0, give(0, 'royal_nurse'));
  if (hive().maxHealth !== 8 || hive().health !== 8) return `hive ${hive().health}/${hive().maxHealth}`;
});
test('Hive Enforcer: the Hive can\'t be attacked while it is in play', () => {
  put(0, 'hive_enforcer');
  if (attackTargets(s, 1).includes(hive().uid)) return 'Hive still attackable';
  pl(0).board = pl(0).board.filter((m) => m.cardId !== 'hive_enforcer');
  if (!attackTargets(s, 1).includes(hive().uid)) return 'Hive not attackable without the Enforcer';
});
test('Larval Cluster: grows each turn, becomes a 3/4 Soldier Wasp at 3 Attack', () => {
  const m = put(0, 'larval_cluster');
  endTurn(); endTurn(); endTurn(); endTurn();
  if (minion(m.uid).attack !== 2) return `after 2 turns ${minion(m.uid).attack}`;
  endTurn();
  const w = minion(m.uid);
  if (w.cardId !== 'soldier_wasp' || w.attack !== 3 || w.health !== 4) return `${w.cardId} ${w.attack}/${w.health}`;
});
test('Scout Wasp: Discovers a Bee or Wasp from the deck', () => {
  const before = pl(0).hand.length;
  play(0, give(0, 'scout_wasp'));
  const got = pl(0).hand.at(-1);
  if (pl(0).hand.length !== before + 1) return 'nothing discovered';
  if (!['Bee', 'Wasp'].some((t) => (getCard(got.cardId).tribes ?? []).includes(t))) return `got ${got.cardId}`;
});
test('Construction Swarm: Hive +0/+2 and a Worker Bee', () => {
  play(0, give(0, 'construction_swarm'));
  if (hive().maxHealth !== 7 || count(0, 'worker_bee') !== 1) return `hive ${hive().maxHealth}, bees ${count(0, 'worker_bee')}`;
});
test('Royal Executioner: a kill heals the Hive by 2', () => {
  hive().health = 1;
  const ex = put(0, 'royal_executioner');
  const foe = put(1, 'vampire_gargoyle');
  attack(0, ex.uid, foe.uid);
  if (minion(foe.uid)) return 'enemy survived';
  if (hive().health !== 3) return `hive ${hive().health}`;
});
test('Hive Matron: a Worker Bee each end of turn while the Hive stands', () => {
  put(0, 'hive_matron');
  endTurn();
  // one from the Matron, one from the Hive itself
  if (count(0, 'worker_bee') !== 2) return `bees ${count(0, 'worker_bee')}`;
});
test('Hive Champion: +2 Attack only while the Queen is alive', () => {
  const c = put(0, 'hive_champion');
  endTurn();
  if (effectiveAttack(minion(c.uid)) !== 5) return `no Queen ${effectiveAttack(minion(c.uid))}`;
  hive().destroyed = true; endTurn();
  if (effectiveAttack(minion(c.uid)) !== 7) return `with Queen ${effectiveAttack(minion(c.uid))}`;
});
test('Royal Jelly Keeper: +2/+2 to an Insect, +3/+3 to the Queen', () => {
  const b = put(0, 'worker_bee');
  play(0, give(0, 'royal_jelly_keeper'), b.uid);
  if (minion(b.uid).attack !== 3 || minion(b.uid).health !== 3) return `bee ${minion(b.uid).attack}/${minion(b.uid).health}`;
  hive().destroyed = true; endTurn(); endTurn();
  play(0, give(0, 'royal_jelly_keeper'), queen().uid);
  if (queen().attack !== 8 || queen().health !== 4) return `queen ${queen().attack}/${queen().health}`;
});
test('Hive Overlord: Hive +0/+5 and two Soldier Wasps', () => {
  play(0, give(0, 'hive_overlord'));
  if (hive().maxHealth !== 10 || count(0, 'soldier_wasp') !== 2) return `hive ${hive().maxHealth}, wasps ${count(0, 'soldier_wasp')}`;
});

// ---- Spells ----------------------------------------------------------------
test('Reinforce the Hive: +0/+3; can\'t be played without a Hive', () => {
  play(0, give(0, 'reinforce_the_hive'));
  if (hive().maxHealth !== 8) return `hive ${hive().maxHealth}`;
  hive().destroyed = true; endTurn(); endTurn();
  if (canPlay(0, give(0, 'reinforce_the_hive'))) return 'playable without a Hive';
});
test('Honey Reserve: two Honey', () => {
  play(0, give(0, 'honey_reserve'));
  if (pl(0).hand.filter((h) => h.cardId === 'honey').length !== 2) return 'not two Honey';
});
test('Emergency Repairs: heals the Hive 5', () => {
  hive().health = 0 + 1;
  play(0, give(0, 'emergency_repairs'));
  if (hive().health !== 5) return `hive ${hive().health}`;
});
test('Swarm Muster: three 1/2 Bees with the Hive, 1/1 without', () => {
  play(0, give(0, 'swarm_muster'));
  const bees = pl(0).board.filter((m) => m.cardId === 'worker_bee');
  if (bees.length !== 3 || bees.some((b) => b.health !== 2)) return `bees ${bees.map((b) => b.health)}`;
});
test('Royal Chamber: Hive +0/+4, the Queen later emerges with +1 Health', () => {
  play(0, give(0, 'royal_chamber'));
  if (hive().maxHealth !== 9) return `hive ${hive().maxHealth}`;
  hive().destroyed = true; endTurn();
  if (queen().health !== 2) return `queen ${queen().health}`;
});
test('Royal Command: +3/+3 with the Hive', () => {
  const b = put(0, 'worker_bee');
  play(0, give(0, 'royal_command'), b.uid);
  if (minion(b.uid).attack !== 4) return `bee ${minion(b.uid).attack}`;
});
test('Venomous Uprising: Wasps and Hornets gain Venomous this turn', () => {
  const w = put(0, 'soldier_wasp'); const h = put(0, 'hornet_guard'); const b = put(0, 'worker_bee');
  play(0, give(0, 'venomous_uprising'));
  if (!hasKeyword(w, 'Venomous') || !hasKeyword(h, 'Venomous') || hasKeyword(b, 'Venomous')) return 'wrong minions';
  endTurn();
  if (hasKeyword(minion(w.uid), 'Venomous')) return 'it lasted past the turn';
});
test('Royal Ascension: Queen +4/+4 Taunt, else a Soldier Wasp', () => {
  play(0, give(0, 'royal_ascension'));
  if (count(0, 'soldier_wasp') !== 1) return 'no wasp without a Queen';
  hive().destroyed = true; endTurn(); endTurn();
  play(0, give(0, 'royal_ascension'));
  if (queen().attack !== 9 || !hasKeyword(queen(), 'Taunt')) return `queen ${queen().attack}`;
});

// ---- Traps (Bees play second here, so the trap is set before the enemy turn) ----
function setTrap(id) {
  play(0, give(0, id));
  endTurn();
}
test('Defensive Swarm: two Bees, one takes the attack on the Hive', () => {
  setTrap('defensive_swarm');
  const before = count(0, 'worker_bee');
  const foe = put(1, 'vampire_gargoyle');
  attack(1, foe.uid, hive().uid);
  if (hive().health !== 5) return `hive took damage (${hive().health})`;
  if (count(0, 'worker_bee') !== before + 1) return `bees ${before} -> ${count(0, 'worker_bee')}`;
});
test('Decoy Nest: a 0/3 Decoy; it hits its killer for 2', () => {
  setTrap('decoy_nest');
  play(1, give(1, 'vampire_gargoyle'));
  const decoy = pl(0).board.find((m) => m.cardId === 'hive_decoy');
  if (!decoy) return 'no decoy';
  const foe = put(1, 'vampire_gargoyle', { attack: 5, health: 9 });
  attack(1, foe.uid, decoy.uid);
  if (minion(decoy.uid)) return 'decoy alive';
  if (minion(foe.uid).health !== 7) return `attacker ${minion(foe.uid).health}`;
});
test('Royal Ambush: a 3/3 Hornet Guard takes the attack on the Queen', () => {
  hive().destroyed = true;
  setTrap('royal_ambush');
  const foe = put(1, 'vampire_gargoyle');
  attack(1, foe.uid, queen().uid);
  if (!queen()) return 'Queen died';
  if (!pl(0).board.some((m) => m.cardId === 'hornet_guard')) return 'no Hornet Guard';
});

// ---- Quick Plays ----------------------------------------------------------------
test('Royal Sacrifice: prevents 3 damage to the Queen, a Worker Bee is destroyed', () => {
  hive().destroyed = true; endTurn();
  put(0, 'worker_bee');
  const before = count(0, 'worker_bee');
  give(0, 'royal_sacrifice');
  const foe = put(1, 'vampire_gargoyle', { attack: 3 });
  attack(1, foe.uid, queen().uid, qp('royal_sacrifice'));
  if (!queen()) return 'Queen died';
  if (count(0, 'worker_bee') !== before - 1) return 'bee not destroyed';
});
test('Last Line of the Colony: the Hive survives a lethal hit, a Soldier Wasp appears', () => {
  endTurn();
  give(0, 'last_line_of_the_colony');
  const foe = put(1, 'vampire_gargoyle', { attack: 6, health: 9 });
  attack(1, foe.uid, hive().uid, qp('last_line_of_the_colony'));
  if (!hive()) return 'Hive destroyed';
  if (count(0, 'soldier_wasp') !== 1) return 'no Soldier Wasp';
});
test('Stinger Interception: a Wasp takes the attack on the Hero with +3 Attack', () => {
  const w = put(0, 'soldier_wasp');
  endTurn();
  give(0, 'stinger_interception');
  const hp = pl(0).hero.health;
  const foe = put(1, 'vampire_gargoyle', { attack: 2, health: 4 });
  attack(1, foe.uid, pl(0).hero.uid, (legal) => legal.find((a) => a.type === 'quickPlay' && a.target === w.uid));
  if (pl(0).hero.health !== hp) return 'Hero was hit';
  if (minion(foe.uid)) return 'attacker survived the 5-Attack Wasp';
});

// ---- Fusions ----------------------------------------------------------------
const fusion = (p, target) => { pl(p).fusion.charge = 3; heroSpell(p, pl(p).fusion.cardId, target); };
test('Blood Nectar (Vampires): +2 Attack and Lifesteal; the Queen also +2 Health', () => {
  hive().destroyed = true; endTurn(); endTurn();
  fusion(0, queen().uid);
  if (queen().health !== 3 || effectiveAttack(queen()) !== 7 || !hasKeyword(queen(), 'Lifesteal')) return `queen ${effectiveAttack(queen())}/${queen().health}`;
}, 'Vampires');
test('Xeno-Brood (Aliens): a Worker Bee with 2 keywords', () => {
  fusion(0);
  const b = pl(0).board.find((m) => m.cardId === 'worker_bee');
  if (!b || b.keywords.length !== 2) return `keywords ${b?.keywords}`;
}, 'Aliens');
test('Amber Fossil (Dinosaurs): 2 Primal Mana and Hive +0/+3', () => {
  fusion(0);
  if (hive().maxHealth !== 8 || pl(0).mana.primal !== 2) return `hive ${hive().maxHealth} primal ${pl(0).mana.primal}`;
}, 'Dinosaurs');
test('Pollination (Plants): a 1/3 Seedling and 1/2 Bee', () => {
  fusion(0);
  const seed = pl(0).board.find((m) => m.cardId === 'seedling'); const b = pl(0).board.find((m) => m.cardId === 'worker_bee');
  if (seed?.health !== 3 || b?.health !== 2) return `${seed?.health} ${b?.health}`;
}, 'Plants');
test('Cordyceps Bloom (Fungus): Mushrooms and a Venomous Bee', () => {
  fusion(0);
  const b = pl(0).board.find((m) => m.cardId === 'worker_bee');
  if (!b || !hasKeyword(b, 'Venomous')) return 'no Venomous bee';
}, 'Fungus');
test('Undying Swarm (Zombies): two Reborn Bees', () => {
  fusion(0);
  const bees = pl(0).board.filter((m) => m.cardId === 'worker_bee');
  if (bees.length !== 2 || !bees.every((b) => hasKeyword(b, 'Reborn'))) return 'wrong bees';
}, 'Zombies');
test('Ember Wasps (Dragons): Burn 2 on the target, Burn 1 on the others', () => {
  const a = put(1, 'vampire_gargoyle'); const b = put(1, 'vampire_gargoyle');
  fusion(0, a.uid);
  if (minion(a.uid).burn?.value !== 2 && minion(a.uid).burn !== 2) return `target burn ${JSON.stringify(minion(a.uid).burn)}`;
  if (!(minion(b.uid).burn?.value === 1 || minion(b.uid).burn === 1)) return `other burn ${JSON.stringify(minion(b.uid).burn)}`;
}, 'Dragons');
test('Infernal Brood (Demons): a Venomous Demon', () => {
  fusion(0);
  const d = pl(0).board.find((m) => m.tribes.includes('Demon'));
  if (!d || !hasKeyword(d, 'Venomous')) return 'no Venomous Demon';
}, 'Demons');
test('Royal Halo (Divine): heal 4 with Overheal; the Queen gets Evade', () => {
  hive().destroyed = true; endTurn(); endTurn();
  fusion(0, queen().uid);
  if (queen().health !== 5 || !hasKeyword(queen(), 'Evade')) return `queen ${queen().health}`;
}, 'Divine');
test('Stinger Module (Robots): a Robot gets +1/+1 and Venomous', () => {
  const r = put(0, 'maintenance_bot');
  fusion(0, r.uid);
  if (!hasKeyword(minion(r.uid), 'Venomous') || minion(r.uid).attack !== 2) return 'not upgraded';
}, 'Robots');
test('Glow Wasps (Radioactive): a Soldier Wasp', () => {
  put(1, 'vampire_gargoyle');
  fusion(0);
  if (count(0, 'soldier_wasp') !== 1) return 'no wasp';
}, 'Radioactive');


console.log(`\n${passed} passed, ${failures} failed`);
process.exitCode = failures ? 1 : 0;
