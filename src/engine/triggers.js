// Trigger dispatch. Self triggers (Arrival, Summon, Exit) belong to
// one card; board events are broadcast to every minion and hidden Trap.

import { emit, log, opponentOf } from './core.js';
import { getCard } from './registry.js';
import { pickRandom } from './rng.js';
import { matchFilter, targetCandidates } from './targeting.js';

const usesChosen = (effects) => effects.some((e) => e.target === 'chosen');

// Builds effect steps for one card's self trigger. When the trigger needs a
// chosen target but none was given (e.g. summoned by another effect rather
// than played from hand), a valid target is picked at random.
export function selfTriggerSteps(state, card, on, ctx) {
  const steps = [];
  for (const t of card.triggers ?? []) {
    if (t.on !== on) continue;
    const c = { ...ctx, cardId: card.id };
    if (usesChosen(t.effects) && c.chosen === undefined && card.target) {
      c.chosen = pickRandom(state, targetCandidates(state, card.target, c.controller, c.self)) ?? null;
    }
    for (const effect of t.effects) steps.push({ kind: 'effect', effect, ctx: c });
  }
  if (steps.length) steps.push({ kind: 'deaths' });
  return steps;
}

export function queueSelfTrigger(state, minion, on, extra = {}) {
  if (minion.textLost) return; // Meltdown ate its card text
  const card = getCard(minion.cardId);
  state.buffer.push(...selfTriggerSteps(state, card, on, { self: minion.uid, controller: minion.controller, ...extra }));
}

// A minion created by an effect (not played from hand) enters the battlefield.
export function enterBattlefield(state, minion) {
  queueSelfTrigger(state, minion, 'summon');
  emit(state, { type: 'minionSummoned', source: minion.uid, player: minion.controller });
}

// Collects listener effects for a board event: active player's minions first
// (left to right), then the opponent's, then hidden Traps.
export function dispatchEvent(state, event) {
  const order = [state.activePlayer, opponentOf(state.activePlayer)];
  const steps = [];
  for (const p of order) {
    // Heroes only carry granted triggers (Fusions: "whenever a Mushroom bursts this game…").
    const hero = state.players[p].hero;
    for (const t of hero.grantedTriggers ?? []) {
      if (t.on !== event.type) continue;
      const ctx = { self: hero.uid, controller: t.controller, event };
      if (!matchFilter(state, t.filter, ctx)) continue;
      for (const effect of t.effects) steps.push({ kind: 'effect', effect, ctx });
    }
    for (const m of state.players[p].board) {
      const card = getCard(m.cardId);
      // Granted triggers (Fungal Infection) act for the player who granted them.
      const all = [
        ...(m.textLost ? [] : card.triggers ?? []).map((t) => ({ t, controller: m.controller })),
        ...(m.grantedTriggers ?? []).map((t) => ({ t, controller: t.controller })),
      ];
      for (const { t, controller } of all) {
        if (t.on !== event.type) continue;
        const ctx = { self: m.uid, controller, event, cardId: m.cardId };
        if (!matchFilter(state, t.filter, ctx)) continue;
        for (const effect of t.effects) steps.push({ kind: 'effect', effect, ctx });
      }
    }
  }
  for (const p of order) {
    const pl = state.players[p];
    for (const trap of [...pl.traps]) {
      const card = getCard(trap.cardId);
      const t = card.trap;
      if (!t || t.on !== event.type) continue;
      const ctx = { self: trap.uid, controller: p, event, cardId: trap.cardId };
      if (!matchFilter(state, t.filter, ctx)) continue;
      pl.traps.splice(pl.traps.indexOf(trap), 1);
      pl.graveyard.push(trap);
      log(state, `Trap revealed: ${card.name}!`);
      for (const effect of t.effects) steps.push({ kind: 'effect', effect, ctx });
      steps.push({ kind: 'event', event: { type: 'trapTriggered', player: p, cardId: trap.cardId } });
    }
  }
  if (steps.length) steps.push({ kind: 'deaths' });
  return steps;
}
