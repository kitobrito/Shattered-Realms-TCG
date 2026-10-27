// Rules tests for the Divine's Holy Pyre expansion (Holy Flame, Reduce to Ash). Each test sets
// up a small board, plays the card through the real engine, and checks the outcome.
//   node tools/test-divine-pyre.mjs

import { buildDeck } from '../src/cards/index.js';
import { addToHand, effectiveAttack, hasKeyword, summonMinion } from '../src/engine/core.js';
import { applyAction, createGame, getLegalActions } from '../src/engine/engine.js';
import { getCard } from '../src/engine/registry.js';
import { targetCandidates } from '../src/engine/targeting.js';
import { ART } from '../src/cards/art-manifest.js';
import { existsSync } from 'node:fs';

let s;
let failures = 0;
let passed = 0;

// Player 0 runs Divine + Robots; player 1 runs Ghosts + Zombies (Dark / Undead targets).
function fresh() {
  const fa = ['Divine', 'Robots'], fb = ['Ghosts', 'Zombies'];
  const players = [{ name: 'A', factions: fa, deck: buildDeck(fa) }, { name: 'B', factions: fb, deck: buildDeck(fb) }];
  s = createGame({ seed: 7, rules: { mulligan: false, secondPlayerPotions: false, openingHandHelp: false }, players });
  for (const p of s.players) { p.hand = []; p.mana.max = 10; p.mana.current = 10; p.mana.primal = 0; p.mana.base = 10; }
}
const pl = (p) => s.players[p];
const put = (p, id) => { const m = summonMinion(s, p, id); m.sick = false; return m; };
const give = (p, id) => addToHand(s, p, id);
const find = (p, id) => pl(p).board.find((m) => m.cardId === id);
// A plain enemy (or friendly) minion with chosen stats and no keywords.
const blank = (p, atk, hp) => { const m = put(p, 'forge_drone'); m.keywords = []; m.attack = atk; m.health = hp; m.maxHealth = hp; return m; };

function settle(react = () => null) {
  for (let i = 0; i < 50 && s.pending; i++) {
    if (s.pending.type === 'reaction') applyAction(s, react(getLegalActions(s)) ?? { type: 'pass', player: s.pending.player });
    else if (s.pending.type === 'choice') applyAction(s, { type: 'choose', player: s.pending.player, index: 0 });
    else break;
  }
}
function play(p, inst, target, target2, react) {
  applyAction(s, { type: 'play', player: p, card: inst.uid, ...(target != null ? { target } : {}), ...(target2 != null ? { target2 } : {}) });
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
const toNextTurnOf = (p) => { for (let i = 0; i < 4 && (s.activePlayer !== p || i === 0); i++) endTurn(); };
const qp = (cardId) => (legal) => legal.find((a) => a.type === 'quickPlay' && pl(a.player).hand.find((h) => h.uid === a.card)?.cardId === cardId);
const canAttack = (uid, target) => getLegalActions(s).some((a) => a.type === 'attack' && a.attacker === uid && (target == null || a.defender === target));

function test(name, fn) {
  fresh();
  try {
    const problem = fn();
    if (problem) { failures++; console.log(`FAIL ${name}: ${problem}`); } else { passed++; console.log(`ok   ${name}`); }
  } catch (e) { failures++; console.log(`FAIL ${name}: threw ${e.stack.split('\n').slice(0, 3).join(' | ')}`); }
}

const IDS = ['candle_acolyte', 'smite', 'sunlit_censer_bearer', 'brand_of_the_righteous', 'pyre_warden', 'purging_light', 'seraph_of_embers', 'halo_shatter',
  'ashen_penitent', 'judgment_bell', 'inquisitor_of_the_pyre', 'wall_of_holy_fire', 'sacred_immolation', 'archon_of_the_final_pyre', 'dawnbreaker_the_cleansing_sun'];
const hero = (p) => pl(p).hero;
// An Undead enemy (a Zombie) with chosen stats.
const undead = (p, atk, hp) => { const m = put(p, 'walker'); m.keywords = []; m.attack = atk; m.health = hp; m.maxHealth = hp; (getCard(m.cardId).triggers ?? []).length; return m; };

test('All 15 Holy Pyre cards (+ Ember Spirit) exist, are Divine expansion cards and have art', () => {
  for (const id of [...IDS]) {
    const c = getCard(id);
    if (!c?.extra || c.faction !== 'Divine') return `${id} missing`;
    if (!ART[id] || !existsSync(ART[id])) return `${id} has no art`;
  }
  if (!ART.ember_spirit || !existsSync(ART.ember_spirit)) return 'ember art';
});

test('Holy Flame burns each end of your turn, then burns down by 1', () => {
  const m = blank(1, 0, 10);
  m.holyFlame = 2; m.holyBy = 0;
  endTurn();
  if (m.health !== 8 || m.holyFlame !== 1) return `after 1st tick ${m.health} ${m.holyFlame}`;
  endTurn(); endTurn();
  if (m.health !== 7 || m.holyFlame !== 0) return `after 2nd tick ${m.health} ${m.holyFlame}`;

});

test('A burning character cannot be healed', () => {
  const m = blank(0, 0, 10); m.health = 5; m.holyFlame = 1;
  play(0, give(0, 'health_potion'), m.uid);
  if (m.health !== 5) return `healed to ${m.health}`;
});

test('The Health Potion (going second) heals 3 but never above full (no Overheal)', () => {
  const m = blank(0, 0, 10); m.health = 9;
  play(0, give(0, 'health_potion'), m.uid);
  if (m.health !== 10 || m.maxHealth !== 10) return `health ${m.health}/${m.maxHealth}`;
  m.health = 4;
  play(0, give(0, 'health_potion'), m.uid);
  if (m.health !== 7) return `healed to ${m.health}`;
});

test('Holy Flame deals double to Dark / Undead', () => {
  const z = undead(1, 0, 10);
  if (!getCard(z.cardId).tribes.includes('Zombie')) return 'not a zombie';
  z.holyFlame = 2; z.holyBy = 0;
  endTurn();
  if (z.health !== 6) return `health ${z.health}`;
});

test('A minion that dies in Holy Flame is Reduced to Ash (no Graveyard, no Reborn)', () => {
  const m = blank(1, 0, 1); m.keywords = ['Reborn']; m.holyFlame = 1;
  const gy = pl(1).graveyard.length;
  endTurn();
  if (pl(1).board.includes(m) || pl(1).board.some((x) => x.cardId === 'forge_drone')) return 'still there / reborn';
  if (pl(1).graveyard.length !== gy) return 'went to graveyard';
  if (pl(0).ashed !== 1) return `ashed ${pl(0).ashed}`;
});

test('Smite: 2 damage; Holy Flame only on Dark/Undead', () => {
  const a = blank(1, 0, 9), z = undead(1, 0, 9);
  play(0, give(0, 'smite'), a.uid); play(0, give(0, 'smite'), z.uid);
  if (a.health !== 7 || a.holyFlame) return 'plain target';
  if (z.health !== 7 || z.holyFlame !== 2) return `undead ${z.health} ${z.holyFlame}`;
});

test('Sunlit Censer-Bearer flames a random enemy at end of turn', () => {
  put(0, 'sunlit_censer_bearer'); const m = blank(1, 0, 9);
  endTurn(); // it flames at the end of your turn, and the flame scorches right away
  if (hero(1).health !== 29 && m.health !== 8) return 'nothing scorched';
});

test('Brand of the Righteous: 3 Holy Flame, draws on Dark/Undead', () => {
  const z = undead(1, 0, 9);
  const n = pl(0).hand.length;
  play(0, give(0, 'brand_of_the_righteous'), z.uid);
  if (z.holyFlame !== 3 || pl(0).hand.length !== n + 1) return `${z.holyFlame} hand ${pl(0).hand.length - n}`;
});

test('Pyre Warden heals your Hero when an enemy is Reduced to Ash', () => {
  put(0, 'pyre_warden'); hero(0).health = 20;
  const m = blank(1, 0, 1); m.holyFlame = 1;
  endTurn();
  if (hero(0).health !== 22) return `hero ${hero(0).health}`;
});

test('Purging Light: Quick Play on an enemy attack, 2 Holy Flame and -2 Attack', () => {
  give(0, 'purging_light'); endTurn();
  const m = blank(1, 3, 9); m.sick = false;
  attack(1, m.uid, hero(0).uid, qp('purging_light'));
  if (m.holyFlame !== 2 || hero(0).health !== 29) return `${m.holyFlame} hero ${hero(0).health}`;
});

test('Seraph of Embers: Holy Flame deals 1 extra', () => {
  put(0, 'seraph_of_embers');
  const m = blank(1, 0, 9); m.holyFlame = 1; m.holyBy = 0;
  endTurn();
  if (m.health !== 7) return `${m.health}`;
});

test('Halo Shatter: an enemy Haunt is Reduced to Ash', () => {
  play(0, give(0, 'halo_shatter')); endTurn();
  pl(1).graveyard.push({ uid: 9999, cardId: 'vampire_bat', owner: 1, died: true });
  play(1, give(1, 'call_of_the_departed'));
  if (pl(1).board.some((m) => m.cardId === 'vampire_bat')) return 'haunted minion survived';
});

test('Ashen Penitent grows per enemy Reduced to Ash', () => {
  pl(0).ashed = 5;
  play(0, give(0, 'ashen_penitent'));
  const a = find(0, 'ashen_penitent');
  if (effectiveAttack(a) !== 7 || a.health !== 7) return `${effectiveAttack(a)}/${a.health}`;
});

test('Judgment Bell: damage equal to each Holy Flame; none to unburned', () => {
  const a = blank(1, 0, 9), b = blank(1, 0, 9); a.holyFlame = 3;
  play(0, give(0, 'judgment_bell'));
  if (a.health !== 6 || b.health !== 9) return `${a.health} ${b.health}`;
});

test('Inquisitor of the Pyre flames only Dark/Undead enemies', () => {
  const a = blank(1, 0, 9), z = undead(1, 0, 9);
  play(0, give(0, 'inquisitor_of_the_pyre'));
  if (a.holyFlame || z.holyFlame !== 2) return `${a.holyFlame} ${z.holyFlame}`;
});

test('Wall of Holy Fire: 1 Holy Flame to enemy minions, +1 Health to yours', () => {
  const a = blank(1, 0, 9), mine = blank(0, 1, 3);
  play(0, give(0, 'wall_of_holy_fire'));
  if (a.holyFlame !== 1 || mine.health !== 4) return `${a.holyFlame} ${mine.health}`;
});

test('Sacred Immolation: only burning targets; Armor = its Attack; Reduced to Ash', () => {
  const plain = blank(1, 5, 9), burning = blank(1, 5, 9); burning.holyFlame = 1;
  const ids = targetCandidates(s, getCard('sacred_immolation').target, 0, null, true);
  if (ids.includes(plain.uid) || !ids.includes(burning.uid)) return 'bad targets';
  play(0, give(0, 'sacred_immolation'), burning.uid);
  if (pl(1).board.includes(burning) || hero(0).armor !== 5 || pl(0).ashed !== 1) return `armor ${hero(0).armor} ashed ${pl(0).ashed}`;
});

test('Archon of the Final Pyre: 2 to all enemies and 1 Holy Flame', () => {
  const a = blank(1, 0, 9);
  play(0, give(0, 'archon_of_the_final_pyre'));
  if (a.health !== 7 || a.holyFlame !== 1 || hero(1).health !== 28 || hero(1).holyFlame !== 1) return `${a.health} ${a.holyFlame} ${hero(1).health}`;
});

test('Dawnbreaker ashes every burning enemy minion and summons an Ember Spirit for each', () => {
  const a = blank(1, 0, 9), b = blank(1, 0, 9), c = blank(1, 0, 9); a.holyFlame = 1; b.holyFlame = 2;
  play(0, give(0, 'dawnbreaker_the_cleansing_sun'));
  if (pl(1).board.includes(a) || pl(1).board.includes(b) || !pl(1).board.includes(c)) return 'wrong minions';
  if (pl(0).board.filter((m) => m.cardId === 'ember_spirit').length !== 2) return 'embers';
  if (pl(0).ashed !== 2) return `ashed ${pl(0).ashed}`;
});

console.log(`\n${passed} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
