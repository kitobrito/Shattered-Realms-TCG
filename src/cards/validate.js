// Card and deck validation. Run `npm run validate` after adding cards.
// A card is "incomplete" (not an error) when the designer has not finished it,
// e.g. missing stats; incomplete cards are excluded from deck building.

import { EFFECT_OPS } from '../engine/effects.js';
import { allCards, hasCard, getCard } from '../engine/registry.js';
import {
  BOARD_EVENTS, CARD_TYPES, FACTIONS, KEYWORDS, REACTION_WINDOWS, TRIGGER_EVENTS,
  NEUTRAL, UNDEFINED_KEYWORDS,
} from '../engine/rules.js';

const TARGET_TYPES = ['minion', 'hero', 'character'];
const TARGET_SIDES = ['friendly', 'enemy', 'any'];

function checkEffects(card, effects, where, errors) {
  if (!Array.isArray(effects) || !effects.length) { errors.push(`${where}: needs a non-empty effects list`); return; }
  for (const e of effects) {
    if (!EFFECT_OPS[e.op]) errors.push(`${where}: unknown effect op "${e.op}"`);
    if (e.target === 'chosen' && !card.target) errors.push(`${where}: uses "chosen" but the card has no target spec`);
    if (e.target === 'chosen2' && !card.target2) errors.push(`${where}: uses "chosen2" but the card has no target2 spec`);
    if (e.op === 'summon') {
      for (const id of [e.cardId, ...(e.pool ?? [])].filter(Boolean)) if (!hasCard(id)) errors.push(`${where}: summons unknown card "${id}"`);
      if (!e.cardId && !e.pool && !e.copyOf && !e.eventCard && !e.randomMinion && !e.fromGraveyard && !e.fromDeadZombies) errors.push(`${where}: summon needs cardId, pool, copyOf, eventCard or randomMinion`);
    }
    if (e.op === 'sequence') checkEffects(card, e.effects, where, errors);
    if (e.else) checkEffects(card, e.else, `${where} (else)`, errors);
  }
}

export function validateCard(card) {
  const errors = [];
  const incomplete = [];
  const isInt = (n) => Number.isInteger(n) && n >= 0;

  if (!card.id || typeof card.id !== 'string') errors.push('missing id');
  if (!card.name) errors.push('missing name');
  // Fusion Hero Spells (and their token) belong to a faction pair, not one faction.
  if (!FACTIONS.includes(card.faction) && !(card.faction === NEUTRAL && card.token) && !(card.faction === 'Fusion' && (card.fusion || card.token))) errors.push(`unknown faction "${card.faction}"`);
  if (card.fusion && !card.fusion.every((f) => FACTIONS.includes(f))) errors.push('fusion names an unknown faction');
  if (!CARD_TYPES.includes(card.type)) errors.push(`unknown type "${card.type}"`);
  if (!isInt(card.cost) || card.cost > 10) errors.push(`invalid cost ${card.cost}`);
  if (typeof card.text !== 'string') errors.push('missing display text');

  if (card.type === 'minion') {
    if (card.attack == null) incomplete.push('Attack not specified');
    else if (!isInt(card.attack)) errors.push(`invalid attack ${card.attack}`);
    if (card.health == null) incomplete.push('Health not specified');
    else if (!isInt(card.health) || card.health < 1) errors.push(`invalid health ${card.health}`);
  }
  for (const k of card.keywords ?? []) {
    if (!KEYWORDS.includes(k)) errors.push(`unknown keyword "${k}"`);
    else if (UNDEFINED_KEYWORDS.includes(k) && !card.pending) incomplete.push(`${k} is not defined yet`);
  }
  if (card.pending) incomplete.push(card.pending);
  if (card.heroSpell && card.type !== 'spell') errors.push('Hero Spells must be spells');

  for (const spec of [card.target, card.target2].filter(Boolean)) {
    if (!TARGET_TYPES.includes(spec.type)) errors.push(`bad target type "${spec.type}"`);
    if (!TARGET_SIDES.includes(spec.side)) errors.push(`bad target side "${spec.side}"`);
  }
  // Pending cards are recorded designs, not yet wired up: skip behaviour checks.
  if (card.pending) return { errors, incomplete };

  for (const [i, t] of (card.triggers ?? []).entries()) {
    if (!TRIGGER_EVENTS.includes(t.on)) errors.push(`trigger ${i}: unknown event "${t.on}"`);
    checkEffects(card, t.effects, `trigger ${i} (${t.on})`, errors);
  }
  for (const a of [].concat(card.aura ?? [])) if (!(a.target && (a.health || a.attack))) errors.push('aura needs a target and health or attack');
  if (card.type === 'spell' && !card.passive) checkEffects(card, card.effects, 'spell', errors);
  if (card.type === 'trap') {
    if (!card.trap || !BOARD_EVENTS.includes(card.trap.on)) errors.push('trap needs trap.on with a board event');
    else checkEffects(card, card.trap.effects, 'trap', errors);
  }
  if (card.quickPlay) {
    if (card.type !== 'spell') errors.push('only spells can be Quick Play');
    for (const w of card.quickPlay.windows ?? []) if (!REACTION_WINDOWS.includes(w)) errors.push(`unknown Quick Play window "${w}"`);
  }
  return { errors, incomplete };
}

export function isComplete(card) {
  const { errors, incomplete } = validateCard(card);
  return !errors.length && !incomplete.length;
}

export function validateAllCards() {
  const seen = new Set();
  return allCards().map((card) => {
    const result = validateCard(card);
    if (seen.has(card.id)) result.errors.push('duplicate id');
    seen.add(card.id);
    return { card, ...result };
  });
}

// A faction's fixed deck: exactly factionDeckSize cards of that faction (no
// tokens or Hero Spells). With requireComplete, every card must be finished.
export function validateFactionDeck(cardIds, faction, rules, { requireComplete = true } = {}) {
  const errors = [];
  if (cardIds.length !== rules.factionDeckSize) errors.push(`${faction} deck has ${cardIds.length} cards; needs ${rules.factionDeckSize}`);
  for (const id of cardIds) {
    if (!hasCard(id)) { errors.push(`unknown card "${id}"`); continue; }
    const card = getCard(id);
    if (card.faction !== faction) errors.push(`${card.name} is not a ${faction} card`);
    if (card.token || card.heroSpell) errors.push(`${card.name} cannot be in a deck`);
    if (requireComplete && !isComplete(card)) errors.push(`${card.name} is incomplete`);
  }
  return [...new Set(errors)];
}

// A player's cut: exactly `cardsCut` different cards, all from their factions.
export function validateCuts(factions, cuts, factionLists, rules) {
  const errors = [];
  const pool = new Set(factions.flatMap((f) => factionLists[f] ?? []));
  if (cuts.length !== rules.cardsCut) errors.push(`cut ${rules.cardsCut} cards (${cuts.length} cut)`);
  if (new Set(cuts).size !== cuts.length) errors.push('a card is cut twice');
  for (const id of cuts) if (!pool.has(id)) errors.push(`${id} is not in your factions`);
  return errors;
}

// A player's pick: factionsPerDeck distinct factions whose decks are valid.
export function validateFactionPick(factions, factionDecks, rules) {
  const errors = [];
  if (factions.length !== rules.factionsPerDeck) errors.push(`pick ${rules.factionsPerDeck} factions`);
  if (new Set(factions).size !== factions.length) errors.push('factions must be different');
  for (const f of factions) {
    if (!factionDecks[f]) errors.push(`${f} has no deck yet`);
    else errors.push(...validateFactionDeck(factionDecks[f], f, rules));
  }
  return errors;
}

// One-faction format: exactly N different cards from the faction's list, each
// duplicated once (so no card goes above the copy limit).
export function validateDuplicates(faction, ids, rules) {
  const errors = [];
  const need = rules.singleFactionDuplicates;
  if (ids.length !== need) errors.push(`choose ${need} duplicates (have ${ids.length})`);
  if (new Set(ids).size !== ids.length && rules.maxCopies <= 2) errors.push(`no card may have more than ${rules.maxCopies} copies`);
  for (const id of ids) {
    const c = getCard(id);
    if (c.faction !== faction || c.token || c.heroSpell) errors.push(`${id} is not a ${faction} deck card`);
  }
  return errors;
}
