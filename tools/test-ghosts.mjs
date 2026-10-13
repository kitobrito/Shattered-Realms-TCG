// Rules tests for the Ghost faction (Haunt, the Graveyard, Spell Ward), its Hero Spell and
// its Fusions. Each test sets up a small board, plays the card through the real engine,
// and checks the outcome.   node tools/test-ghosts.mjs

import { buildDeck } from '../src/cards/index.js';
import { addToHand, costOf, effectiveAttack, hasKeyword, summonMinion } from '../src/engine/core.js';
import { applyAction, createGame, getLegalActions } from '../src/engine/engine.js';

let s;
let failures = 0;
let passed = 0;

// Player 0 runs Ghosts (+ `partner`); player 1 runs `foe`.
function fresh(partner = 'Vampires', foe = ['Dragons', 'Robots']) {
  const fa = ['Ghosts', partner];
  const players = [{ name: 'A', factions: fa, deck: buildDeck(fa) }, { name: 'B', factions: foe, deck: buildDeck(foe) }];
  s = createGame({ seed: 7, rules: { mulligan: false, secondPlayerPotions: false, openingHandHelp: false }, players });
  for (const p of s.players) { p.hand = []; p.mana.max = 10; p.mana.current = 10; p.mana.primal = 0; p.mana.base = 10; }
}
const pl = (p) => s.players[p];
const put = (p, id, opts = {}) => { const m = summonMinion(s, p, id, opts); m.sick = false; return m; };
const give = (p, id) => addToHand(s, p, id);
// A minion that died earlier this game, lying in player p's Graveyard.
const bury = (p, id) => { const g = { uid: s.nextUid++, cardId: id, owner: p, died: true }; pl(p).graveyard.push(g); return g; };
const dead = (p) => pl(p).graveyard.filter((g) => g.died);
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

// ---- Haunt and the Graveyard ---------------------------------------------------------
test('Minions that die go to their owner\'s Graveyard as real deaths (spells do not count)', () => {
  const a = put(0, 'wandering_spirit');
  const b = put(1, 'vampire_gargoyle');
  attack(0, a.uid, b.uid);
  a.health = 0; a.destroyed = true; endTurn();
  if (!dead(0).some((g) => g.cardId === 'wandering_spirit')) return 'not in the Graveyard';
  give(0, 'slip_between_worlds');
  if (dead(0).some((g) => g.cardId === 'slip_between_worlds')) return 'a spell counted as a death';
});
test('Call Beyond the Veil: Haunts an enemy minion with Reborn; it keeps its owner', () => {
  bury(1, 'vampire_gargoyle');
  heroSpell(0, 'call_beyond_the_veil');
  const m = find(0, 'vampire_gargoyle');
  if (!m) return 'nothing Haunted';
  if (!hasKeyword(m, 'Reborn')) return 'no Reborn';
  if (m.owner !== 1 || m.controller !== 0) return `owner ${m.owner} controller ${m.controller}`;
  if (dead(1).length) return 'it is still in the Graveyard';
});
test('A Haunted minion that dies for good goes back to its owner\'s Graveyard', () => {
  bury(1, 'vampire_gargoyle');
  heroSpell(0, 'call_beyond_the_veil');
  const m = find(0, 'vampire_gargoyle');
  m.destroyed = true; endTurn();          // Reborn: back with 1 Health
  const back = find(0, 'vampire_gargoyle');
  if (!back || back.health !== 1) return 'Reborn did not bring it back';
  back.destroyed = true; endTurn();
  if (!dead(1).some((g) => g.cardId === 'vampire_gargoyle')) return 'not back in its owner\'s Graveyard';
  if (dead(0).some((g) => g.cardId === 'vampire_gargoyle')) return 'went to the Haunter\'s Graveyard';
});
test('Call Beyond the Veil can\'t be cast while nothing has died', () => {
  if (canCast('call_beyond_the_veil')) return 'castable with an empty Graveyard';
  bury(0, 'wandering_spirit');
  if (!canCast('call_beyond_the_veil')) return 'not castable with a dead minion';
});
test('Call Beyond the Veil is locked until its Haunted minion is dead (Reborn included)', () => {
  bury(1, 'vampire_gargoyle'); bury(1, 'hollow_guard');
  heroSpell(0, 'call_beyond_the_veil');
  endTurn(); endTurn();
  if (canCast('call_beyond_the_veil')) return 'castable while its Haunt lives';
  const m = pl(0).board.find((x) => x.hauntTag);
  m.destroyed = true; endTurn(); endTurn();      // Reborn: still the same minion
  if (canCast('call_beyond_the_veil')) return 'castable after Reborn';
  pl(0).board.find((x) => x.hauntTag).destroyed = true; endTurn(); endTurn();
  if (!canCast('call_beyond_the_veil')) return 'still locked after it died';
});
test('Haunt with a full board does nothing (and the minion stays in the Graveyard)', () => {
  for (let i = 0; i < 7; i++) put(0, 'wandering_spirit');
  bury(1, 'vampire_gargoyle');
  const inst = give(0, 'call_of_the_departed');
  if (canPlay(0, inst)) return 'playable with a full board';
  if (dead(1).length !== 1) return 'the Graveyard changed';
});
test('The Bees\' Queen and Hive can\'t be Haunted', () => {
  bury(1, 'the_queen'); bury(1, 'the_hive');
  if (canCast('call_beyond_the_veil')) return 'Queen/Hive count as Haunt targets';
});

// ---- Minions -------------------------------------------------------------------------
test('Wandering Spirit: Elusive (enemy spells can\'t target it)', () => {
  const m = put(0, 'wandering_spirit');
  s.activePlayer = 1;
  const fb = give(1, 'fireball');
  if (getLegalActions(s).some((a) => a.type === 'play' && a.card === fb.uid && a.target === m.uid)) return 'Fireball can target it';
});
test('Grave Lantern: Evade only if a minion died this turn', () => {
  play(0, give(0, 'grave_lantern'));
  if (hasKeyword(find(0, 'grave_lantern'), 'Evade')) return 'Evade with no death';
  const x = put(1, 'wandering_spirit'); x.destroyed = true;
  play(0, give(0, 'wandering_spirit'));      // processes the death
  play(0, give(0, 'grave_lantern'));
  if (!pl(0).board.filter((m) => m.cardId === 'grave_lantern').some((m) => hasKeyword(m, 'Evade'))) return 'no Evade after a death';
});
test('Hollow Guard: +1 Attack while it has Evade', () => {
  const m = put(0, 'hollow_guard');
  if (effectiveAttack(m) !== 2) return `attack ${effectiveAttack(m)} without Evade`;
  m.keywords.push('Evade');
  play(0, give(0, 'wandering_spirit'));    // any action re-applies auras
  if (effectiveAttack(m) !== 3) return `attack ${effectiveAttack(m)} with Evade`;
});
test('Whispering Skull: Discover a dead minion into your hand', () => {
  bury(1, 'vampire_gargoyle');
  play(0, give(0, 'whispering_skull'));
  if (!pl(0).hand.some((c) => c.cardId === 'vampire_gargoyle')) return 'not in hand';
});
test('Phantom Duelist: Evade and Reborn', () => {
  const m = put(0, 'phantom_duelist');
  if (!hasKeyword(m, 'Evade') || !hasKeyword(m, 'Reborn')) return 'missing keywords';
});
test('Grave Robber: Haunts a minion costing 2 or less with -1/-1', () => {
  bury(1, 'vampire_gargoyle');    // 3 Mana: too expensive
  bury(1, 'hollow_guard');        // 2 Mana 2/3
  play(0, give(0, 'grave_robber'));
  if (find(0, 'vampire_gargoyle')) return 'Haunted a 3-cost minion';
  const m = find(0, 'hollow_guard');
  if (!m || m.attack !== 1 || m.health !== 2) return `got ${m?.attack}/${m?.health}`;
});
test('Haunt -1/-1 never brings a minion back at 0 Health', () => {
  bury(1, 'wandering_spirit');    // 1/2
  pl(1).graveyard[0].cardId = 'restless_spirit';
  bury(1, 'spectral_insect');     // 1/1
  pl(1).graveyard = pl(1).graveyard.filter((g) => g.cardId === 'spectral_insect');
  play(0, give(0, 'grave_robber'));
  const m = find(0, 'spectral_insect');
  if (!m || m.health < 1) return `health ${m?.health}`;
});
test('Phantom Raven: draws a Ghost from the top 3, then shuffles', () => {
  const deck = pl(0).deck;
  const gi = deck.findIndex((c) => c.cardId === 'wandering_spirit' || c.cardId === 'grave_lantern' || c.cardId === 'hollow_guard');
  const ghost = deck.splice(gi, 1)[0];
  const nonGhost = deck.filter((c) => !['Ghosts'].includes(c.cardId) && !c.cardId.includes('spirit')).slice(0, 2);
  for (const c of nonGhost) deck.splice(deck.indexOf(c), 1);
  deck.unshift(nonGhost[0], nonGhost[1], ghost);
  play(0, give(0, 'phantom_raven'));
  if (!pl(0).hand.some((c) => c.uid === ghost.uid)) return 'the Ghost was not drawn';
});
test('Soul Binder: Haunts a minion costing 3 or less with -1/-1', () => {
  bury(1, 'vampire_gargoyle');
  play(0, give(0, 'soul_binder'));
  const m = find(0, 'vampire_gargoyle');
  if (!m || m.attack !== 1 || m.health !== 3) return `got ${m?.attack}/${m?.health}`;
});
test('Wraith of the Unforgotten: +1/+1 when another friendly minion is Haunted', () => {
  const w = put(0, 'wraith_of_the_unforgotten');
  bury(1, 'vampire_gargoyle');
  heroSpell(0, 'call_beyond_the_veil');
  if (w.attack !== 5 || w.health !== 6) return `wraith ${w.attack}/${w.health}`;
});
test('Knight of the Second Death: comes back through Reborn with Taunt', () => {
  const k = put(0, 'knight_of_the_second_death');
  k.destroyed = true; endTurn();
  const back = find(0, 'knight_of_the_second_death');
  if (!back) return 'not Reborn';
  if (!hasKeyword(back, 'Taunt')) return 'no Taunt';
});
test('Mirror Haunt: copies a dead minion\'s keywords and triggered text', () => {
  bury(1, 'wraith_of_the_unforgotten');     // Elusive + a trigger
  play(0, give(0, 'mirror_haunt'));
  const m = find(0, 'mirror_haunt');
  if (!hasKeyword(m, 'Elusive')) return 'no copied keyword';
  if (!(m.grantedTriggers ?? []).some((t) => t.on === 'minionHaunted')) return 'no copied trigger';
  bury(1, 'vampire_gargoyle');
  heroSpell(0, 'call_beyond_the_veil');
  if (m.attack !== 4) return `copied trigger did not fire (attack ${m.attack})`;
});
test('Veilkeeper: other friendly Ghosts gain Elusive until your next turn', () => {
  const g = put(0, 'grave_lantern');
  play(0, give(0, 'veilkeeper'));
  if (!hasKeyword(g, 'Elusive')) return 'no Elusive';
  if (hasKeyword(find(0, 'veilkeeper'), 'Elusive')) return 'Veilkeeper gave itself Elusive';
  endTurn(); endTurn();
  if (hasKeyword(g, 'Elusive')) return 'Elusive did not wear off';
});
test('Graveyard Colossus: 1 less per 2 deaths this game, never below 3', () => {
  const inst = give(0, 'graveyard_colossus');
  if (costOf(s, inst) !== 6) return `start ${costOf(s, inst)}`;
  s.deathsThisGame = 3;
  if (costOf(s, inst) !== 5) return `3 deaths → ${costOf(s, inst)}`;
  s.deathsThisGame = 20;
  if (costOf(s, inst) !== 3) return `20 deaths → ${costOf(s, inst)}`;
});
test('Banshee Matriarch: Haunts a minion costing 4 or less with Reborn', () => {
  bury(1, 'vampire_gargoyle');
  play(0, give(0, 'banshee_matriarch'));
  const m = find(0, 'vampire_gargoyle');
  if (!m || !hasKeyword(m, 'Reborn')) return 'no Reborn Haunt';
});
test('Soul Reaper: destroys a damaged enemy minion and Haunts it with -2/-2', () => {
  const e = put(1, 'vampire_gargoyle'); e.health = 3;     // 2/4 damaged
  play(0, give(0, 'soul_reaper'), e.uid);
  if (find(1, 'vampire_gargoyle')) return 'still on the enemy board';
  const m = find(0, 'vampire_gargoyle');
  if (!m) return 'not Haunted';
  if (m.attack !== 0 || m.health !== 2) return `got ${m.attack}/${m.health}`;
});
test('Soul Reaper can only target a damaged enemy minion', () => {
  const e = put(1, 'vampire_gargoyle');
  const inst = give(0, 'soul_reaper');
  if (getLegalActions(s).some((a) => a.type === 'play' && a.card === inst.uid && a.target === e.uid)) return 'targets an undamaged minion';
});
test('The Unburied King: Haunts two different minions costing 5 or less, -1/-1', () => {
  bury(1, 'vampire_gargoyle'); bury(1, 'vampire_gargoyle'); bury(0, 'hollow_guard');
  play(0, give(0, 'the_unburied_king'));
  if (count(0, 'vampire_gargoyle') !== 1 || count(0, 'hollow_guard') !== 1) return `gargoyles ${count(0, 'vampire_gargoyle')} guards ${count(0, 'hollow_guard')}`;
});

// ---- Spells --------------------------------------------------------------------------
test('Call of the Departed: Haunts a minion costing 2 or less', () => {
  bury(1, 'hollow_guard');
  play(0, give(0, 'call_of_the_departed'));
  if (!find(0, 'hollow_guard')) return 'not Haunted';
});
test('Slip Between Worlds: Evade and Elusive until your next turn', () => {
  const m = put(0, 'grave_lantern');
  play(0, give(0, 'slip_between_worlds'), m.uid);
  if (!hasKeyword(m, 'Evade') || !hasKeyword(m, 'Elusive')) return 'missing keywords';
  endTurn(); endTurn();
  if (hasKeyword(m, 'Elusive')) return 'Elusive stayed';
});
test('Unquiet Memories: Discover a dead minion that costs 1 less', () => {
  bury(1, 'vampire_gargoyle');
  play(0, give(0, 'unquiet_memories'));
  const c = pl(0).hand.find((x) => x.cardId === 'vampire_gargoyle');
  if (!c) return 'not in hand';
  if (costOf(s, c) !== 2) return `costs ${costOf(s, c)}`;
});
test('Silence the Living: Spell Ward stops the next enemy spell, once', () => {
  const g = put(0, 'hollow_guard');
  play(0, give(0, 'silence_the_living'), g.uid);
  endTurn();
  play(1, give(1, 'fireball'), g.uid);
  if (g.health !== 3) return `took damage through Spell Ward (${g.health})`;
  if (hasKeyword(g, 'Spell Ward')) return 'Ward not removed';
  play(1, give(1, 'fireball'), g.uid);
  if (find(0, 'hollow_guard')) return 'second spell was blocked too';
});
test('Open the Tomb: Haunts a minion costing 4 or less with 1 Health', () => {
  bury(1, 'vampire_gargoyle');
  play(0, give(0, 'open_the_tomb'));
  const m = find(0, 'vampire_gargoyle');
  if (!m || m.health !== 1) return `health ${m?.health}`;
});
test('Stolen Afterlife: only from the opponent\'s Graveyard, -2/-2', () => {
  bury(0, 'hollow_guard');
  const inst = give(0, 'stolen_afterlife');
  if (canPlay(0, inst)) return 'playable with only friendly dead';
  bury(1, 'vampire_gargoyle');
  play(0, inst);
  const m = find(0, 'vampire_gargoyle');
  if (!m || m.attack !== 0 || m.health !== 2) return `got ${m?.attack}/${m?.health}`;
});
test('The Dead March: two different minions with Reborn', () => {
  bury(1, 'vampire_gargoyle'); bury(0, 'hollow_guard');
  play(0, give(0, 'the_dead_march'));
  const a = find(0, 'vampire_gargoyle');
  const b = find(0, 'hollow_guard');
  if (!a || !b || !hasKeyword(a, 'Reborn') || !hasKeyword(b, 'Reborn')) return 'missing';
});
test('Beyond the Veil: three different minions, one from the opponent, -2/-2', () => {
  bury(0, 'hollow_guard'); bury(0, 'grave_robber'); bury(0, 'soul_binder'); bury(1, 'vampire_gargoyle');
  play(0, give(0, 'beyond_the_veil'));
  const mine = pl(0).board.filter((m) => m.haunted);
  if (mine.length !== 3) return `${mine.length} Haunted`;
  if (!mine.some((m) => m.owner === 1)) return 'none from the opponent';
});

// ---- Traps ---------------------------------------------------------------------------
test('Mirror of the Departed: an enemy spell on a friendly minion does nothing to it', () => {
  const g = put(0, 'hollow_guard');
  play(0, give(0, 'mirror_of_the_departed'));
  endTurn();
  play(1, give(1, 'fireball'), g.uid);
  if (g.health !== 3) return `took ${3 - g.health} damage`;
  if (!hasKeyword(g, 'Elusive')) return 'no Elusive this turn';
});
test('Grave Grasp: the attacker gets -3 Attack; if it dies this turn, you Haunt it', () => {
  play(0, give(0, 'grave_grasp'));
  const guard = put(0, 'hollow_guard');
  endTurn();
  const e = put(1, 'vampire_gargoyle');   // 2/4 → -1 Attack → 0
  attack(1, e.uid, guard.uid);
  if (guard.health !== 3) return `guard took ${3 - guard.health}`;
  e.destroyed = true; endTurn();
  const m = find(0, 'vampire_gargoyle');
  if (!m || m.attack !== 1 || m.health !== 3) return `haunt ${m?.attack}/${m?.health}`;
});
test('Tomb Without a Door: a 2/2 Taunt Restless Spirit when the enemy plays a minion', () => {
  play(0, give(0, 'tomb_without_a_door'));
  endTurn();
  play(1, give(1, 'vampire_gargoyle'));
  const r = find(0, 'restless_spirit');
  if (!r || !hasKeyword(r, 'Taunt')) return 'no Restless Spirit';
  if (hasKeyword(r, 'Reborn')) return 'Reborn without a death last turn';
});
test('Tomb Without a Door: the Spirit gets Reborn if a minion died last turn', () => {
  play(0, give(0, 'tomb_without_a_door'));
  const x = put(0, 'wandering_spirit'); x.destroyed = true;
  endTurn();
  play(1, give(1, 'vampire_gargoyle'));
  if (!hasKeyword(find(0, 'restless_spirit'), 'Reborn')) return 'no Reborn';
});

// ---- Quick Plays ---------------------------------------------------------------------
test('Not of This World: an enemy spell on a friendly character does nothing to it', () => {
  const g = put(0, 'hollow_guard');
  give(0, 'not_of_this_world');
  endTurn();
  play(1, give(1, 'fireball'), g.uid, qp('not_of_this_world'));
  if (g.health !== 3) return `took ${3 - g.health} damage`;
});
test('Refuse the Grave: a friendly minion that dies comes back with 1 Health', () => {
  const g = put(0, 'grave_robber');
  give(0, 'refuse_the_grave');
  endTurn();
  play(1, give(1, 'fireball'), g.uid);      // 2/4 → 1 left
  play(1, give(1, 'fireball'), g.uid, qp('refuse_the_grave'));
  const back = find(0, 'grave_robber');
  if (!back || back.health !== 1) return `back ${back?.health}`;
});
test("Death's Claim: an enemy minion that dies is Haunted with -2/-2", () => {
  give(0, 'deaths_claim');
  const guard = put(0, 'graveyard_colossus');
  endTurn();
  const e = put(1, 'vampire_gargoyle'); e.health = 1;
  attack(1, e.uid, guard.uid, qp('deaths_claim'));
  const m = find(0, 'vampire_gargoyle');
  if (!m || m.attack !== 0 || m.health !== 2 || m.owner !== 1) return `haunt ${m?.attack}/${m?.health} owner ${m?.owner}`;
});

// ---- Fusions -------------------------------------------------------------------------
test('Infernal Séance (Demons): Haunt cost ≤3 with Reborn; lose Health equal to its cost', () => {
  pl(0).fusion.charge = 3; bury(1, 'vampire_gargoyle');
  const hp = pl(0).hero.health;
  heroSpell(0, 'infernal_seance');
  const m = find(0, 'vampire_gargoyle');
  if (!m || !hasKeyword(m, 'Reborn')) return 'no Reborn Haunt';
  if (pl(0).hero.health !== hp - 3) return `lost ${hp - pl(0).hero.health}`;
}, 'Demons');
test('Sanctuary of the Departed (Divine): Haunt only if a minion was cleansed', () => {
  pl(0).fusion.charge = 3; bury(1, 'vampire_gargoyle');
  const g = put(0, 'hollow_guard'); g.keywords.push('Frozen');
  heroSpell(0, 'sanctuary_of_the_departed', g.uid);
  if (hasKeyword(g, 'Frozen')) return 'not cleansed';
  if (!find(0, 'vampire_gargoyle')) return 'no Haunt after cleansing';
}, 'Divine');
test('Sanctuary of the Departed: no Haunt when nothing was cleansed', () => {
  pl(0).fusion.charge = 3; bury(1, 'vampire_gargoyle');
  const g = put(0, 'hollow_guard');
  heroSpell(0, 'sanctuary_of_the_departed', g.uid);
  if (find(0, 'vampire_gargoyle')) return 'Haunted anyway';
}, 'Divine');
test('Fossils Beyond the Veil (Dinosaurs): Haunt a Dinosaur ≤4 with Reborn', () => {
  pl(0).fusion.charge = 3;
  bury(1, 'vampire_gargoyle');
  if (canCast('fossils_beyond_the_veil')) return 'castable with no dead Dinosaur';
  bury(1, 'baby_t_rex');
  heroSpell(0, 'fossils_beyond_the_veil');
  const m = find(0, 'baby_t_rex');
  if (!m || !hasKeyword(m, 'Reborn')) return 'no Dinosaur';
}, 'Dinosaurs');
test('Spectral Gene Splicing (Aliens): a Ghostly Hybrid with the dead minion\'s stats', () => {
  pl(0).fusion.charge = 3; bury(1, 'hollow_guard');
  const e = put(1, 'vampire_gargoyle');
  heroSpell(0, 'spectral_gene_splicing', e.uid);
  const h = pl(0).board.find((m) => m.cardId.startsWith('ghost_hybrid'));
  if (!h) return 'no Hybrid';
  if (h.attack !== 2 || h.health !== 3) return `stats ${h.attack}/${h.health}`;
  if (!hasKeyword(h, 'Taunt')) return 'missing keywords';
  if (!find(1, 'vampire_gargoyle')) return 'the enemy minion left';
}, 'Aliens');
test('Soulbound Upgrade (Robots): Elusive on a non-Robot', () => {
  pl(0).fusion.charge = 3; bury(1, 'vampire_gargoyle');
  heroSpell(0, 'soulbound_upgrade');
  const m = find(0, 'vampire_gargoyle');
  if (!m || !hasKeyword(m, 'Elusive') || m.attack !== 2) return 'wrong result';
}, 'Robots');
test('The Eternal Swarm (Bees): Reborn Haunt that leaves a Spectral Insect', () => {
  pl(0).fusion.charge = 3; bury(1, 'hollow_guard');
  heroSpell(0, 'the_eternal_swarm');
  const m = find(0, 'hollow_guard');
  if (!m || !hasKeyword(m, 'Reborn')) return 'no Reborn Haunt';
  m.destroyed = true; endTurn();
  if (!find(0, 'spectral_insect')) return 'no Spectral Insect';
}, 'Bees');
test('Irradiated Afterlife (Radioactive): the Ghost is Haunted back if it dies', () => {
  pl(0).fusion.charge = 3;
  const g = put(0, 'hollow_guard');
  heroSpell(0, 'irradiated_afterlife', g.uid);
  g.destroyed = true; endTurn();
  const back = find(0, 'hollow_guard');
  if (!back || back.health !== 1) return `back ${back?.health}`;
}, 'Radioactive');
test('Bloodless Hunger (Vampires): lose 1, Haunt with Lifesteal and Elusive', () => {
  pl(0).fusion.charge = 3; bury(1, 'vampire_gargoyle');
  const hp = pl(0).hero.health;
  heroSpell(0, 'bloodless_hunger');
  const m = find(0, 'vampire_gargoyle');
  if (!m || !hasKeyword(m, 'Lifesteal') || !hasKeyword(m, 'Elusive')) return 'missing keywords';
  if (pl(0).hero.health !== hp - 1) return 'no Health lost';
});
test('Gravebloom (Plants): +1/+1 per friendly death, up to +3/+3', () => {
  pl(0).fusion.charge = 3; bury(1, 'hollow_guard');
  pl(0).minionDeaths = 5;
  heroSpell(0, 'gravebloom');
  const m = find(0, 'hollow_guard');
  if (!m || m.attack !== 5 || m.health !== 6) return `got ${m?.attack}/${m?.health}`;
}, 'Plants');
test('Undying Possession (Zombies): Reborn, or a Haunt if it already had Reborn', () => {
  pl(0).fusion.charge = 3; bury(1, 'hollow_guard');
  const g = put(0, 'grave_lantern');
  heroSpell(0, 'undying_possession', g.uid);
  if (!hasKeyword(g, 'Reborn')) return 'no Reborn';
  if (find(0, 'hollow_guard')) return 'Haunted without prior Reborn';
  pl(0).fusion.charge = 3;
  const d = put(0, 'phantom_duelist');
  heroSpell(0, 'undying_possession', d.uid);
  if (!find(0, 'hollow_guard')) return 'no Haunt';
}, 'Zombies');
test('Mycelium Séance (Fungus): 2 Mushrooms and a Haunt', () => {
  pl(0).fusion.charge = 3; bury(1, 'hollow_guard');
  heroSpell(0, 'mycelium_seance');
  const n = pl(1).deck.reduce((t, c) => t + (c.mushrooms ?? 0), 0);
  if (n !== 2) return `${n} Mushrooms`;
  if (!find(0, 'hollow_guard')) return 'no Haunt';
}, 'Fungus');
test('Wyrm of the Afterlife (Dragons): Elusive Dragon that Burns the enemy Hero each turn', () => {
  pl(0).fusion.charge = 3;
  const id = bury(1, 'ashwing_dragon').cardId;
  const dragon = id;
  heroSpell(0, 'wyrm_of_the_afterlife');
  const m = find(0, id);
  if (!m || !hasKeyword(m, 'Elusive')) return `no Elusive Dragon (${dragon})`;
  endTurn();
  if (!(pl(1).hero.burn > 0)) return 'no Burn on the enemy Hero';
}, 'Dragons');

console.log(`\n${passed} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
