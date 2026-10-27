// Rules tests for the Zombies' Rage Outbreak cards (Infect, Rage). Each test sets up a small board, plays the card through the real engine,
// and checks the outcome.   node tools/test-acidic.mjs

import { buildDeck } from '../src/cards/index.js';
import { addToHand, costOf, effectiveAttack, hasKeyword, heal, radiationOf, summonMinion } from '../src/engine/core.js';
import { applyAction, createGame, getLegalActions } from '../src/engine/engine.js';
import { getCard } from '../src/engine/registry.js';
import { ART, RAGE_RUNNER_ART } from '../src/cards/art-manifest.js';
import { existsSync } from 'node:fs';

let s;
let failures = 0;
let passed = 0;

// Player 0 runs Zombies (+ `partner`); player 1 runs `foe`.
function fresh(partner = 'Vampires', foe = ['Dragons', 'Robots']) {
  const fa = ['Zombies', partner];
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
const atkOf = (m) => effectiveAttack(m);
const foe = (atk = 3, hp = 4, p = 1) => { const m = put(p, 'vampire_gargoyle'); m.keywords = []; m.attack = atk; m.health = hp; m.maxHealth = hp; return m; };
const runners = (p) => count(p, 'rage_runner');

test('Patient Zero Infects; the Infected minion dying gives the infector a 2/1 Rush Rage Runner', () => {
  const e = foe(2, 3);
  play(0, give(0, 'patient_zero'), e.uid);
  if (e.infected !== 0) return 'not infected';
  const k = put(0, 'tri_maw_hydra');
  attack(0, k.uid, e.uid);
  const r = find(0, 'rage_runner');
  if (!r || r.attack !== 2 || r.health !== 1 || !hasKeyword(r, 'Rush')) return `runner ${r && `${r.attack}/${r.health}`}`;
  if (runners(1)) return 'the wrong side got a runner';
});
test('Infecting twice does nothing more (one Rage Runner)', () => {
  const e = foe(2, 3);
  play(0, give(0, 'patient_zero'), e.uid);
  play(0, give(0, 'patient_zero'), e.uid);
  attack(0, put(0, 'tri_maw_hydra').uid, e.uid);
  if (runners(0) !== 1) return `runners ${runners(0)}`;
});
test('Rage: damage it survives gives +1 Attack', () => {
  const m = put(0, 'sprinting_infected');
  const e = foe(1, 9);
  attack(0, m.uid, e.uid);
  if (atkOf(m) !== 4) return `attack ${atkOf(m)}`;
});
test('Rage Chimpanzee Infects the minion it attacks', () => {
  const c = put(0, 'rage_chimpanzee');
  const e = foe(1, 9);
  attack(0, c.uid, e.uid);
  if (e.infected !== 0) return 'not infected';
  if (onBoard(c)) return 'the 1-Health chimp should die to the counter-hit';
});
test('Lab Escapee Exit Infects a random enemy minion', () => {
  const l = put(0, 'lab_escapee');
  const e = foe(5, 9);
  attack(0, l.uid, e.uid);
  if (onBoard(l)) return 'escapee survived';
  if (e.infected !== 0) return 'not infected';
});
test('Infected Rat Swarm leaves two 1/1 Rush Plague Rats', () => {
  const r = put(0, 'infected_rat_swarm');
  const e = foe(5, 9);
  attack(0, r.uid, e.uid);
  if (count(0, 'plague_rat') !== 2) return `rats ${count(0, 'plague_rat')}`;
});
test('Rage Hound grows when it kills', () => {
  const h = put(0, 'rage_hound');
  const e = foe(1, 2);
  attack(0, h.uid, e.uid);
  if (atkOf(h) !== 6 || h.health !== 3) return `${atkOf(h)}/${h.health}`;
});
test('Quarantine Breach Infects only enemies with 3 or less Health', () => {
  const a = foe(1, 3), b = foe(1, 4);
  play(0, give(0, 'quarantine_breach'));
  if (a.infected !== 0 || b.infected != null) return `${a.infected} ${b.infected}`;
});
test('Contaminated Blood Infects, and destroys an already Infected minion (which leaves a Rage Runner)', () => {
  const e = foe(1, 9);
  play(0, give(0, 'contaminated_blood'), e.uid);
  if (e.infected !== 0 || !onBoard(e)) return 'first cast';
  play(0, give(0, 'contaminated_blood'), e.uid);
  if (onBoard(e)) return 'not destroyed';
  if (runners(0) !== 1) return `runners ${runners(0)}`;
});
test('Rage Virus gives Zombies Rage and Infects an enemy', () => {
  const w = put(0, 'walker');
  const e = foe(1, 9);
  play(0, give(0, 'rage_virus'));
  if (!hasKeyword(w, 'Rage')) return 'zombie not raging';
  if (e.infected !== 0) return 'not infected';
});
test('Infected Crows hits all enemies for 1 then Infects the survivors', () => {
  const a = foe(1, 1), b = foe(1, 4);
  play(0, give(0, 'infected_crows'));
  if (onBoard(a)) return 'a survived';
  if (b.health !== 3 || b.infected !== 0) return `b ${b.health} ${b.infected}`;
});
test('Hazmat Husk: Taunt, Rage, and 2 Corpses when it dies', () => {
  const h = put(0, 'hazmat_husk');
  const before = pl(0).corpses ?? 0;
  const e = foe(2, 20, 1); e.sick = false;
  endTurn();
  attack(1, e.uid, h.uid);
  if (atkOf(h) !== 4) return `rage ${atkOf(h)}`;
  const k = foe(9, 9, 1); k.sick = false;
  attack(1, k.uid, h.uid);
  if (onBoard(h)) return 'husk survived';
  if ((pl(0).corpses ?? 0) - before < 3) return `corpses +${(pl(0).corpses ?? 0) - before} (2 from Exit + 1 for a dead Zombie)`;
});
test('Sealed Ward: an attacking enemy is Infected and loses 2 Attack this turn', () => {
  play(0, give(0, 'sealed_ward'));
  endTurn();
  const e = foe(4, 9, 1); e.sick = false;
  attack(1, e.uid, pl(0).hero.uid);
  if (e.infected !== 0) return 'not infected';
  if (pl(0).hero.health !== 30 - 2) return `hero ${pl(0).hero.health}`;
});
test('Silverback Abomination eats up to 3 Corpses for +1/+1 each', () => {
  pl(0).corpses = 5;
  play(0, give(0, 'silverback_abomination'));
  const g = find(0, 'silverback_abomination');
  if (g.attack !== 9 || g.health !== 8 || pl(0).corpses !== 2) return `${g.attack}/${g.health} corpses ${pl(0).corpses}`;
});
test('The Outbreak Infects every enemy, and its Rage Runners are 4/3', () => {
  const a = foe(1, 2), b = foe(1, 2);
  play(0, give(0, 'the_outbreak'));
  if (a.infected !== 0 || b.infected !== 0) return 'not all infected';
  attack(0, put(0, 'tri_maw_hydra').uid, a.uid);
  const r = find(0, 'rage_runner');
  if (!r || r.attack !== 4 || r.health !== 3) return `runner ${r && `${r.attack}/${r.health}`}`;
});
test('All 15 new cards are unlockable extras with art', () => {
  const ids = ['patient_zero', 'rage_chimpanzee', 'lab_escapee', 'sprinting_infected', 'blood_vomiter', 'infected_rat_swarm', 'rage_hound', 'quarantine_breach',
    'contaminated_blood', 'rage_virus', 'infected_crows', 'hazmat_husk', 'sealed_ward', 'silverback_abomination', 'the_outbreak'];
  const bad = ids.filter((id) => !getCard(id)?.extra || !ART[id]);
  if (bad.length) return bad.join(',');
});

test('A Rage Runner wears the look of the faction it burst out of, and nothing else changes', () => {
  const out = [];
  for (const id of ['vampire_gargoyle', 'patient_zero']) {
    const e = put(1, id); e.keywords = []; e.attack = 1; e.health = 1; e.maxHealth = 1;
    play(0, give(0, 'patient_zero'), e.uid);
    attack(0, put(0, 'tri_maw_hydra').uid, e.uid);
    const r = pl(0).board.filter((m) => m.cardId === 'rage_runner').at(-1);
    if (!r) return `no runner from ${id}`;
    if (r.lookFaction !== getCard(id).faction) return `${id}: look ${r.lookFaction}`;
    if (r.attack !== 2 || r.health !== 1 || r.keywords.join() !== 'Rush') return `${id}: runner ${r.attack}/${r.health} ${r.keywords}`;
    out.push(r.lookFaction);
  }
  if (out.join() !== 'Vampires,Zombies') return out.join();
});
test('Every faction has its own Rage Runner picture', () => {
  const facs = ['Acidic', 'Aliens', 'Bees', 'Demons', 'Dinosaurs', 'Divine', 'Dragons', 'Fungus', 'Ghosts', 'Ice Age', 'Lycanthropes', 'Plants', 'Radioactive', 'Robots', 'Sharks', 'Ultraterrestrials', 'Vampires', 'Void', 'Zombies'];
  const bad = facs.filter((f) => !RAGE_RUNNER_ART[f] || !existsSync(new URL(`../${RAGE_RUNNER_ART[f]}`, import.meta.url)));
  if (bad.length) return bad.join(',');
});

console.log(`\n${passed} passed, ${failures} failed`);
if (failures) process.exit(1);
