// Turn-planning AI. Instead of judging one action at a time (greedy.js), it
// searches sequences of actions within its turn (a beam search) and scores
// each plan by the position after the turn ends — so end-of-turn effects
// (Blood Pool, World Tree, Egg Incubator, Extinction…) are part of the plan.
//
// Fair play: it never reads the opponent's hand or either deck's order, and
// every simulated branch gets a fresh random seed, so random outcomes (draws,
// random targets, Discover options) can't be known in advance.

import { allKeywords, effectiveAttack, hasKeyword, mushroomsIn } from '../engine/core.js';
import { actingPlayer, applyAction, getLegalActions } from '../engine/engine.js';
import { getCard } from '../engine/registry.js';

const SETTINGS = { beam: 5, depth: 7, maxNodes: 700 };

// ---- Simulation helpers ------------------------------------------------------

let reseed = 1;
function clone(state) {
  const { log, ...rest } = state;
  const c = structuredClone(rest);
  c.log = [];
  // Re-randomize so the AI can't peek at the real random outcomes.
  c.rng = (c.rng ^ Math.imul(reseed++, 0x9e3779b1)) | 0;
  return c;
}

// The opponent's reaction windows are assumed to pass (their hand is hidden).
function settle(s, me) {
  let guard = 0;
  while (s.pending && s.pending.player !== me && s.pending.type === 'reaction' && guard++ < 20) {
    applyAction(s, { type: 'pass', player: s.pending.player });
  }
  return s;
}

function sim(state, action, me) {
  const c = clone(state);
  applyAction(c, action);
  return settle(c, me);
}

// ---- Evaluation --------------------------------------------------------------

const KEYWORD_VALUE = {
  Taunt: (m) => 1 + m.health * 0.2,
  Stealth: () => 1,
  Lifesteal: (m) => effectiveAttack(m) * 0.5,
  Poisonous: () => 2,
  Venomous: () => 2.5,
  Evade: (m) => 1 + effectiveAttack(m) * 0.3,
  Elusive: () => 0.5,
  'Twin Strike': (m) => effectiveAttack(m) * 0.8,
  Reborn: () => 2,
  Immune: () => 2,
  Frozen: (m) => -effectiveAttack(m) * 0.7,
  Blind: (m) => -effectiveAttack(m) * 0.5,
  Recoil: () => -1,
  Burned: (m) => -Math.min(m.health, 3),
};

function minionValue(m, discount = 1) {
  const card = getCard(m.cardId);
  let v = effectiveAttack(m) * 1.0 + m.health * 0.9;
  for (const k of allKeywords(m)) v += KEYWORD_VALUE[k]?.(m) ?? 0;
  // Ongoing abilities (triggers, auras) are worth more on pricier cards.
  if ((card.triggers ?? []).some((t) => t.on !== 'battlecry' && t.on !== 'summon') || card.aura || card.costAura) v += 1.5 + card.cost * 0.25;
  // A Exit that summons is value banked for later (Eggs!).
  const dr = (card.triggers ?? []).find((t) => t.on === 'deathrattle');
  const eggish = dr && dr.effects.some((e) => e.op === 'summon');
  return eggish ? v * discount + 3 : v * discount;
}

// Health is worth more the lower it gets.
function healthValue(h) {
  if (h <= 0) return -1000;
  return h + (h < 12 ? (h - 12) * 0.8 : 0);
}

// Damage the given player's board could deal to the other hero next turn,
// respecting the defender's Taunts (enemy minions with Taunt soak attackers).
function threat(s, attacker) {
  const att = s.players[attacker];
  const def = s.players[1 - attacker];
  const attackers = att.board.filter((m) => !hasKeyword(m, 'Frozen')).map((m) => effectiveAttack(m) * (hasKeyword(m, 'Twin Strike') ? 2 : 1));
  attackers.sort((a, b) => b - a);
  const taunts = def.board.filter((m) => hasKeyword(m, 'Taunt') && !hasKeyword(m, 'Stealth')).length;
  return attackers.slice(taunts).reduce((a, b) => a + b, 0);
}

export function evaluate(s, me) {
  if (s.gameOver) return s.winner === me ? 1e6 : s.winner == null ? 0 : -1e6;
  const my = s.players[me];
  const opp = s.players[1 - me];
  const myH = my.hero.health + my.hero.armor;
  const oppH = opp.hero.health + opp.hero.armor;
  let score = healthValue(myH) - healthValue(oppH) * 1.05;

  // My Extinction about to fire: my board is worth less (Eggs keep value).
  const ext = my.extinction;
  const doomed = ext && ext.nextAt - ext.turns <= 1 ? 0.4 : 1;
  score += my.board.reduce((t, m) => t + minionValue(m, doomed), 0);
  score -= opp.board.reduce((t, m) => t + minionValue(m), 0) * 1.05;

  score += my.hand.length * 1.3 - opp.hand.length * 1.1;
  score += my.traps.length * 1.5 - opp.traps.length * 1.2;
  score += my.mana.bonusNextTurn * 1.2;
  // Mushrooms are damage waiting in a deck (the count is public; positions aren't used).
  score += mushroomsIn(opp.deck) * 0.75 - mushroomsIn(my.deck) * 0.75;
  // Corpses fuel Zombie cards (only worth something to a Zombie player).
  const corpseValue = (pl) => (pl.factions.includes('Zombies') ? (pl.corpses ?? 0) * 0.8 : 0);
  score += corpseValue(my) - corpseValue(opp);
  // Burn is damage still to come (and it grows): about two ticks' worth.
  const burnValue = (pl) => [pl.hero, ...pl.board].reduce((t, c) => t + (c.burn ?? 0) * (c.kind === 'hero' ? 1.6 : 0.8), 0);
  score += burnValue(opp) - burnValue(my);

  // What the opponent threatens on their turn, and what I threaten back.
  const theirs = threat(s, 1 - me);
  if (theirs >= myH) score -= 60;
  score -= theirs * 0.35;
  const mine = threat(s, me);
  if (mine >= oppH) score += 25;
  return score;
}

// Score a plan's end state after the turn ends (end-of-turn effects resolve).
function scoreAfterEnd(s, me) {
  const legal = getLegalActions(s);
  const end = legal.find((a) => a.type === 'endTurn');
  if (!end) return -Infinity;
  return evaluate(sim(s, end, me), me);
}

// ---- Decisions -----------------------------------------------------------------

// Keep a curve: cheap cards stay; at most one 4-drop; swap anything bigger.
function mulligan(state, me) {
  const hand = state.players[me].hand.map((c) => ({ uid: c.uid, cost: getCard(c.cardId).cost }));
  const keep = new Set(hand.filter((c) => c.cost <= 3).map((c) => c.uid));
  const four = hand.find((c) => c.cost === 4);
  if (four && keep.size) keep.add(four.uid);
  return { type: 'mulligan', player: me, replace: hand.filter((c) => !keep.has(c.uid)).map((c) => c.uid).sort((a, b) => a - b) };
}

// A reaction (Quick Play) is worth it only if it clearly beats passing.
function react(state, me, legal) {
  let best = legal.find((a) => a.type === 'pass');
  let bestScore = evaluate(sim(state, best, me), me) + 1.5;
  for (const a of legal) {
    if (a.type === 'pass') continue;
    const score = evaluate(sim(state, a, me), me);
    if (score > bestScore) { bestScore = score; best = a; }
  }
  return best;
}

// Beam search over this turn's action sequences; returns the first action of
// the best plan found. Called again for every action, so it re-plans as the
// real game unfolds (random results, opponent reactions).
function plan(state, me, opts) {
  const { beam, depth, maxNodes } = { ...SETTINGS, ...opts };
  const myTurn = state.activePlayer === me && !state.pending;
  let best = { score: myTurn ? scoreAfterEnd(state, me) : -Infinity, first: getLegalActions(state).find((a) => a.type === 'endTurn') };
  let frontier = [{ s: state, first: null }];
  let nodes = 0;
  for (let d = 0; d < depth && frontier.length && nodes < maxNodes; d++) {
    const children = [];
    for (const node of frontier) {
      for (const a of getLegalActions(node.s)) {
        if (a.type === 'endTurn' || a.player !== me) continue;
        const c = sim(node.s, a, me);
        const first = node.first ?? a;
        if (c.gameOver && c.winner === me) return first; // lethal
        children.push({ s: c, first, quick: evaluate(c, me) });
        if (++nodes >= maxNodes) break;
      }
      if (nodes >= maxNodes) break;
    }
    children.sort((x, y) => y.quick - x.quick);
    frontier = children.slice(0, beam);
    for (const node of frontier) {
      const finished = node.s.activePlayer === me && !node.s.pending;
      const score = finished ? scoreAfterEnd(node.s, me) : node.quick;
      if (score > best.score) best = { score, first: node.first };
    }
  }
  return best.first ?? getLegalActions(state)[0];
}

export function chooseAction(state, opts = {}) {
  const me = actingPlayer(state);
  const legal = getLegalActions(state);
  if (state.pending?.type === 'mulligan') return mulligan(state, me);
  if (state.pending?.type === 'reaction') return react(state, me, legal);
  // Going second: take the Health Potion (it measured stronger than the Mana Potion).
  const potion = state.pending?.type === 'choice' ? state.pending.options.findIndex((o) => o.cardId === 'health_potion') : -1;
  if (potion >= 0) return legal[potion];
  return plan(state, me, opts);
}
