// One-ply greedy AI: simulates every legal action on a clone of the state and
// takes the one that most improves a board evaluation. Placeholder for the
// Phase 8 AI; it uses only the public engine API, as a real AI should.

import { allKeywords, effectiveAttack, mushroomsIn } from '../engine/core.js';
import { NEGATIVE_KEYWORDS } from '../engine/rules.js';
import { actingPlayer, applyAction, getLegalActions } from '../engine/engine.js';
import { getCard } from '../engine/registry.js';

function minionValue(m) {
  let v = effectiveAttack(m) * 1.4 + m.health;
  for (const k of allKeywords(m)) {
    if (NEGATIVE_KEYWORDS.includes(k)) v -= 1.5;
    else v += k === 'Taunt' || k === 'Lifesteal' || k === 'Venomous' ? 1 : 0.5;
  }
  return v;
}

export function evaluate(state, me) {
  if (state.gameOver) return state.winner === me ? 1e6 : state.winner == null ? 0 : -1e6;
  const my = state.players[me];
  const opp = state.players[1 - me];
  let score = 0;
  score += my.hero.health * 0.8 - opp.hero.health * 1.0;
  score += my.board.reduce((s, m) => s + minionValue(m), 0);
  score -= opp.board.reduce((s, m) => s + minionValue(m), 0) * 1.1;
  score += my.mana.bonusNextTurn * 1.5;
  score += mushroomsIn(opp.deck) * 0.7 - mushroomsIn(my.deck) * 0.7; // Mushrooms: delayed damage
  const burnValue = (pl) => [pl.hero, ...pl.board].reduce((t, c) => t + (c.burn ?? 0) * (c.kind === 'hero' ? 1.5 : 0.7), 0);
  score += burnValue(opp) - burnValue(my); // Burn: damage still to come
  if (my.factions.includes('Zombies')) score += (my.corpses ?? 0) * 0.7; // Corpses fuel Zombie cards
  if (opp.hero.health <= 10) score += (10 - opp.hero.health) * 0.5; // press toward lethal
  return score;
}

export function chooseAction(state) {
  const me = actingPlayer(state);
  const legal = getLegalActions(state);
  // Mulligan: swap out expensive cards (5+ Mana) to find early plays.
  if (state.pending?.type === 'mulligan') {
    const replace = state.players[me].hand.filter((c) => getCard(c.cardId).cost >= 5).map((c) => c.uid).sort((a, b) => a - b);
    return { type: 'mulligan', player: me, replace };
  }
  // Choices: card picks take the most expensive card; other choices (keywords,
  // which minion to buff/curse) are judged by simulating each option.
  if (state.pending?.type === 'choice') {
    const opts = state.pending.options;
    // Going second: the Health Potion measured stronger (simulated: first-player wins 57% vs 63%).
    const potion = opts.findIndex((o) => o.cardId === 'health_potion');
    if (potion >= 0) return legal[potion];
    if (opts.every((o) => o.cardId)) {
      const best = opts.reduce((b, o, i) => (getCard(o.cardId).cost > getCard(opts[b].cardId).cost ? i : b), 0);
      return legal[best];
    }
    let best = legal[0];
    let bestScore = -Infinity;
    for (const action of legal) {
      const sim = structuredClone(state);
      applyAction(sim, action);
      const score = evaluate(sim, me);
      if (score > bestScore) { bestScore = score; best = action; }
    }
    return best;
  }
  const fallback = legal.find((a) => a.type === 'endTurn' || a.type === 'pass');
  let best = fallback;
  let bestScore = evaluate(state, me) + 0.01;
  for (const action of legal) {
    if (action === fallback) continue;
    const sim = structuredClone(state);
    applyAction(sim, action);
    // A reaction window may pause the clone mid-resolution; assume the
    // opponent passes so the full outcome is scored.
    while (sim.pending?.type === 'reaction' && sim.pending.player !== me) applyAction(sim, { type: 'pass', player: sim.pending.player });
    const score = evaluate(sim, me);
    if (score > bestScore) { bestScore = score; best = action; }
  }
  return best;
}
