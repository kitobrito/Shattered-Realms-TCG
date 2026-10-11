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
import { LEARNED_WEIGHTS } from './weights.js';

const SETTINGS = { beam: 5, depth: 7, maxNodes: 700 };

// Evaluation weights. BASE_WEIGHTS are the hand-set originals (Medium);
// LEARNED_WEIGHTS were tuned by self-play training (tools/train-ai.mjs).
export const BASE_WEIGHTS = {
  hp: 1, oppHp: 1.05, lowHp: 12, lowHpSlope: 0.8,
  atk: 1, health: 0.9, keyword: 1, ongoing: 1.5, ongoingCost: 0.25, egg: 3, oppBoard: 1.05, doomed: 0.4,
  hand: 1.3, oppHand: 1.1, trap: 1.5, oppTrap: 1.2, bonusMana: 1.2, mushroom: 0.75, corpse: 0.8,
  burnHero: 1.6, burnMinion: 0.8, lethalRisk: 60, threat: 0.35, myLethal: 25, myThreat: 0,
};

// Difficulty levels. reply: also predict the opponent's attacks back before
// judging a plan; peek: that prediction may use the opponent's real hand
// (Impossible only); blunder: chance of a random move (Easy).
export const DIFFICULTIES = {
  easy: { beam: 2, depth: 3, maxNodes: 60, blunder: 0.25, weights: BASE_WEIGHTS, noReact: true, keepHand: true },
  medium: { weights: BASE_WEIGHTS },
  hard: { weights: LEARNED_WEIGHTS },
  veryHard: { beam: 7, depth: 8, maxNodes: 1200, reply: 4, weights: LEARNED_WEIGHTS },
  impossible: { beam: 9, depth: 9, maxNodes: 2000, reply: 6, peek: true, weights: LEARNED_WEIGHTS },
};

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

// Any player's Quick Play windows pass (used for the predicted opponent turn).
function settleAll(s) {
  let guard = 0;
  while (s.pending?.type === 'reaction' && guard++ < 20) applyAction(s, { type: 'pass', player: s.pending.player });
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

function minionValue(m, W, discount = 1) {
  const card = getCard(m.cardId);
  let v = effectiveAttack(m) * W.atk + m.health * W.health;
  for (const k of allKeywords(m)) v += (KEYWORD_VALUE[k]?.(m) ?? 0) * W.keyword;
  // Ongoing abilities (triggers, auras) are worth more on pricier cards.
  if ((card.triggers ?? []).some((t) => t.on !== 'battlecry' && t.on !== 'summon') || card.aura || card.costAura) v += W.ongoing + card.cost * W.ongoingCost;
  // A Exit that summons is value banked for later (Eggs!).
  const dr = (card.triggers ?? []).find((t) => t.on === 'deathrattle');
  const eggish = dr && dr.effects.some((e) => e.op === 'summon');
  return eggish ? v * discount + W.egg : v * discount;
}

// Health is worth more the lower it gets.
function healthValue(h, W) {
  if (h <= 0) return -1000;
  return h + (h < W.lowHp ? (h - W.lowHp) * W.lowHpSlope : 0);
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

export function evaluate(s, me, W = BASE_WEIGHTS) {
  if (s.gameOver) return s.winner === me ? 1e6 : s.winner == null ? 0 : -1e6;
  const my = s.players[me];
  const opp = s.players[1 - me];
  const myH = my.hero.health + my.hero.armor;
  const oppH = opp.hero.health + opp.hero.armor;
  let score = healthValue(myH, W) * W.hp - healthValue(oppH, W) * W.oppHp;

  // My Extinction about to fire: my board is worth less (Eggs keep value).
  const ext = my.extinction;
  const doomed = ext && ext.nextAt - ext.turns <= 1 ? W.doomed : 1;
  score += my.board.reduce((t, m) => t + minionValue(m, W, doomed), 0);
  score -= opp.board.reduce((t, m) => t + minionValue(m, W), 0) * W.oppBoard;

  score += my.hand.length * W.hand - opp.hand.length * W.oppHand;
  score += my.traps.length * W.trap - opp.traps.length * W.oppTrap;
  score += my.mana.bonusNextTurn * W.bonusMana;
  // Mushrooms are damage waiting in a deck (the count is public; positions aren't used).
  score += (mushroomsIn(opp.deck) - mushroomsIn(my.deck)) * W.mushroom;
  // Corpses fuel Zombie cards (only worth something to a Zombie player).
  const corpseValue = (pl) => (pl.factions.includes('Zombies') ? (pl.corpses ?? 0) * W.corpse : 0);
  score += corpseValue(my) - corpseValue(opp);
  // Burn is damage still to come (and it grows): about two ticks' worth.
  const burnValue = (pl) => [pl.hero, ...pl.board].reduce((t, c) => t + (c.burn ?? 0) * (c.kind === 'hero' ? W.burnHero : W.burnMinion), 0);
  score += burnValue(opp) - burnValue(my);

  // What the opponent threatens on their turn, and what I threaten back.
  const theirs = threat(s, 1 - me);
  if (theirs >= myH) score -= W.lethalRisk;
  score -= theirs * W.threat;
  const mine = threat(s, me);
  if (mine >= oppH) score += W.myLethal;
  score += mine * W.myThreat;
  return score;
}

// Score a plan's end state after the turn ends (end-of-turn effects resolve).
function scoreAfterEnd(s, me, W) {
  const legal = getLegalActions(s);
  const end = legal.find((a) => a.type === 'endTurn');
  if (!end) return -Infinity;
  return evaluate(sim(s, end, me), me, W);
}

// Predict the opponent's next turn: they make their best attacks one at a time
// (and, with peek, may also play cards from their real hand). Returns my score
// after that turn. Without peek it uses only what's on the board.
function scoreWithReply(s, me, W, peek) {
  const legal = getLegalActions(s);
  const end = legal.find((a) => a.type === 'endTurn');
  if (!end) return -Infinity;
  let cur = sim(s, end, me);
  settleAll(cur);
  const opp = 1 - me;
  for (let step = 0; step < 8 && !cur.gameOver && cur.activePlayer === opp && !cur.pending; step++) {
    const options = getLegalActions(cur).filter((a) => a.type === 'attack' || (peek && a.type === 'play')).slice(0, 24);
    let best = null;
    let bestScore = evaluate(cur, opp, W) + 0.5;
    for (const a of options) {
      const c = settleAll(sim(cur, a, me));
      if (c.pending) continue; // a choice mid-play: skip rather than guess
      const sc = evaluate(c, opp, W);
      if (sc > bestScore) { bestScore = sc; best = c; }
    }
    if (!best) break;
    cur = best;
  }
  return evaluate(cur, me, W);
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
function react(state, me, legal, W) {
  let best = legal.find((a) => a.type === 'pass');
  let bestScore = evaluate(sim(state, best, me), me, W) + 1.5;
  for (const a of legal) {
    if (a.type === 'pass') continue;
    const score = evaluate(sim(state, a, me), me, W);
    if (score > bestScore) { bestScore = score; best = a; }
  }
  return best;
}

// Beam search over this turn's action sequences; returns the first action of
// the best plan found. Called again for every action, so it re-plans as the
// real game unfolds (random results, opponent reactions).
// With reply, the best few finished plans are re-judged by predicting the
// opponent's attacks back, and the plan that holds up best is chosen.
function plan(state, me, opts) {
  const { beam, depth, maxNodes, reply, peek } = { ...SETTINGS, ...opts };
  const W = opts.weights ?? BASE_WEIGHTS;
  const myTurn = state.activePlayer === me && !state.pending;
  const endNow = getLegalActions(state).find((a) => a.type === 'endTurn');
  const finished = []; // { s, first, score } plans that end the turn cleanly
  let best = { score: myTurn ? scoreAfterEnd(state, me, W) : -Infinity, first: endNow };
  if (myTurn) finished.push({ s: state, first: endNow, score: best.score });
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
        children.push({ s: c, first, quick: evaluate(c, me, W) });
        if (++nodes >= maxNodes) break;
      }
      if (nodes >= maxNodes) break;
    }
    children.sort((x, y) => y.quick - x.quick);
    frontier = children.slice(0, beam);
    for (const node of frontier) {
      const done = node.s.activePlayer === me && !node.s.pending;
      const score = done ? scoreAfterEnd(node.s, me, W) : node.quick;
      if (done) finished.push({ s: node.s, first: node.first, score });
      if (score > best.score) best = { score, first: node.first };
    }
  }
  if (reply && finished.length > 1) {
    finished.sort((x, y) => y.score - x.score);
    let top = null;
    for (const f of finished.slice(0, reply)) {
      const score = scoreWithReply(f.s, me, W, peek);
      if (!top || score > top.score) top = { score, first: f.first };
    }
    if (top?.first) best = top;
  }
  return best.first ?? getLegalActions(state)[0];
}

// opts: a difficulty name ('easy' … 'impossible') or search settings.
export function chooseAction(state, opts = {}) {
  if (typeof opts === 'string') opts = DIFFICULTIES[opts] ?? {};
  const W = opts.weights ?? BASE_WEIGHTS;
  const me = actingPlayer(state);
  const legal = getLegalActions(state);
  if (state.pending?.type === 'mulligan') {
    return opts.keepHand ? { type: 'mulligan', player: me, replace: [] } : mulligan(state, me);
  }
  if (state.pending?.type === 'reaction') {
    return opts.noReact ? legal.find((a) => a.type === 'pass') : react(state, me, legal, W);
  }
  // Going second: take the Health Potion (it measured stronger than the Mana Potion).
  const potion = state.pending?.type === 'choice' ? state.pending.options.findIndex((o) => o.cardId === 'health_potion') : -1;
  if (potion >= 0) return legal[potion];
  // Easy: now and then just does something random instead of planning.
  if (opts.blunder && Math.random() < opts.blunder) {
    const moves = legal.filter((a) => a.type !== 'endTurn');
    if (moves.length) return moves[Math.floor(Math.random() * moves.length)];
  }
  return plan(state, me, opts);
}
