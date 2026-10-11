// Core state primitives shared by the engine, effects, and targeting.
// Game state is plain JSON: no classes, Sets, or functions, so it can be
// cloned (AI search), saved, and sent over the network unchanged.

import { getCard } from './registry.js';
import { randomInt } from './rng.js';
import { FACTION_TAGS } from './rules.js';

export const opponentOf = (p) => 1 - p;

export function newUid(state) {
  return state.nextUid++;
}

export function log(state, msg) {
  state.log.push({ turn: state.turn, msg });
  if (state.log.length > 400) state.log.shift();
}

export function heroOf(state, p) {
  return state.players[p].hero;
}

export function findCharacter(state, id) {
  if (id == null) return null;
  for (const pl of state.players) {
    if (pl.hero.uid === id) return pl.hero;
    const m = pl.board.find((x) => x.uid === id);
    if (m) return m;
  }
  return null;
}

// Minions in resolution order: active player's board first, then the opponent's.
export function minionsInOrder(state) {
  const a = state.activePlayer;
  return [...state.players[a].board, ...state.players[opponentOf(a)].board];
}

// Attack = base + "this turn" modifiers + "until your next turn" modifiers.
export function effectiveAttack(c) {
  const linger = (c.lingerAttack ?? []).reduce((s, x) => s + x.amount, 0);
  // Wasteland Ghoul: extra Attack while it has Radiation.
  const rad = c.kind === 'minion' && radiationOf(c) > 0 ? (getCard(c.cardId).attackWhileIrradiated ?? 0) : 0;
  return Math.max(0, c.attack + c.tempAttack + linger + (c.auraAttack ?? 0) + rad);
}

// ---- Radiation (Radioactive) -------------------------------------------------
// c.radPerm: permanent Radiation; c.radTemp: [{ amount, left, by }] — expires after
// `left` end-of-turns of player `by`. A living character with Radiation X lowers the
// Health of every other non-irradiated character by X (engine applyAuras).
export const radiationOf = (c) => (c?.radPerm ?? 0) + (c?.radTemp ?? []).reduce((s, x) => s + x.amount, 0);

export function applyRadiation(state, c, amount, opts = {}) {
  if (!c || amount <= 0 || c.health <= 0 || c.destroyed) return;
  if (opts.turns) (c.radTemp ??= []).push({ amount, left: opts.turns, by: opts.by });
  else c.radPerm = (c.radPerm ?? 0) + amount;
  log(state, `☢ ${nameOf(state, c)} is irradiated (Radiation ${radiationOf(c)}${opts.turns ? `, ${opts.turns} turns` : ''}).`);
  emit(state, { type: 'radiationApplied', target: c.uid, player: c.controller ?? c.owner, amount });
}

export function clearRadiation(state, c) {
  if (!radiationOf(c)) return;
  c.radPerm = 0;
  c.radTemp = [];
  log(state, `${nameOf(state, c)}'s Radiation is removed.`);
}

// Health reduction (not damage): lowers current and maximum Health.
export function reduceHealthStat(state, c, amount) {
  if (!c || amount <= 0) return;
  c.maxHealth -= amount;
  c.health -= amount;
  log(state, `${nameOf(state, c)}'s Health is reduced by ${amount}.`);
  if (c.kind === 'minion') emit(state, { type: 'minionLostStats', target: c.uid, player: c.controller, source: null });
}

// Late-bound engine queries,

// Keywords come from three lists: permanent, "this turn", and "until a
// player's next turn" ({ k, until }).
export function hasKeyword(c, k) {
  return c.keywords.includes(k) || (c.tempKeywords ?? []).includes(k) || (c.lingerKeywords ?? []).some((x) => x.k === k);
}

export function allKeywords(c) {
  return [...new Set([...c.keywords, ...(c.tempKeywords ?? []), ...(c.lingerKeywords ?? []).map((x) => x.k)])];
}

// Silent removal (expiry, Reborn used up).
export function removeKeyword(c, k) {
  c.keywords = c.keywords.filter((x) => x !== k);
  if (c.tempKeywords) c.tempKeywords = c.tempKeywords.filter((x) => x !== k);
  if (c.lingerKeywords) c.lingerKeywords = c.lingerKeywords.filter((x) => x.k !== k);
}

// A keyword the minion *loses* (stripped, transferred, Evade used up) —
// raises keywordLost (Gene-Thief Operative listens for it).
export function loseKeyword(state, c, k) {
  if (!hasKeyword(c, k)) return;
  removeKeyword(c, k);
  emit(state, { type: 'keywordLost', target: c.uid, player: c.controller, keyword: k });
}

export function nameOf(state, c) {
  if (!c) return '?';
  return c.kind === 'hero' ? state.players[c.owner].name : getCard(c.cardId).name;
}

// Effective cost of a card in hand: base + its own modifier (Abduction Ray,
// Replication Protocol) + auras from its owner's minions (Fleet Commander).
// Mushrooms (Fungus): a count on card instances in a deck.
export function mushroomsIn(deck) {
  return deck.reduce((n, c) => n + (c.mushrooms ?? 0), 0);
}

export function costOf(state, inst) {
  const card = getCard(inst.cardId);
  let aura = 0;
  // Fungus Giant: costs 1 less for each N Mushrooms in the enemy deck.
  if (card.costPerEnemyMushrooms && state) {
    aura -= Math.floor(mushroomsIn(state.players[opponentOf(inst.owner)].deck) / card.costPerEnemyMushrooms);
  }
  for (const m of state?.players[inst.owner]?.board ?? []) {
    const a = getCard(m.cardId).costAura;
    if (a && a.type === card.type) aura += a.amount;
  }
  // Dinosaurs: Brood Architect — the first Egg you play each turn costs less.
  if ((card.tribes ?? []).includes('Egg') && state && state.players[inst.owner]?.eggPlayedTurn !== state.turn) {
    for (const m of state.players[inst.owner]?.board ?? []) aura -= getCard(m.cardId).firstEggDiscount ?? 0;
  }
  // Robots: Chief Engineer — the next Upgrade you play costs less.
  if (card.upgrade && state) aura -= state.players[inst.owner]?.upgradeDiscount ?? 0;
  return Math.max(0, card.cost + (inst.costMod ?? 0) + aura);
}

export function createHero(state, p) {
  return {
    uid: newUid(state), kind: 'hero', owner: p, controller: p,
    health: state.rules.startingHealth, maxHealth: state.rules.startingHealth,
    armor: 0, attack: 0, tempAttack: 0, lingerAttack: [], attacksThisTurn: 0,
    healthLost: 0, keywords: [], tempKeywords: [], statics: [],
  };
}

export function createMinion(state, cardId, controller) {
  const card = getCard(cardId);
  return {
    uid: newUid(state), kind: 'minion', cardId,
    owner: controller, controller,
    attack: card.attack, health: card.health, maxHealth: card.health,
    tempAttack: 0, lingerAttack: [], tempHealth: 0, auraHealth: 0,
    keywords: [...(card.keywords ?? [])], tempKeywords: [],
    statics: [...(card.statics ?? [])],
    tribes: [...(card.tribes ?? [])],
    faction: card.faction,
    sick: true, attacksThisTurn: 0,
    lastDamagedBy: null, lastDamagedByController: null,
    destroyed: false, tempControl: null, returnAtEndOfTurn: false,
  };
}

// ---- Dark / Undead (Divine) --------------------------------------------------
export function tagsOf(c) {
  if (!c || c.kind !== 'minion') return [];
  const card = getCard(c.cardId);
  return card.tags ?? FACTION_TAGS[card.faction] ?? [];
}
export const isDarkOrUndead = (c) => tagsOf(c).some((t) => t === 'Dark' || t === 'Undead');

// ---- Primal Mana (Dinosaurs) ------------------------------------------------
// mana.primal of a player's current Mana is Primal: it can only pay for
// Dinosaur cards. mana.base = their normal crystals; max - base are Primal.

export const isDinosaurCard = (card) => card?.faction === 'Dinosaurs';

// Mana this player can spend on this card.
export function manaFor(pl, card) {
  return pl.mana.current - (isDinosaurCard(card) ? 0 : (pl.mana.primal ?? 0));
}

// Dinosaur cards spend Primal Mana first; other cards only normal Mana.
export function payMana(pl, card, cost) {
  const m = pl.mana;
  let rest = cost;
  if (isDinosaurCard(card)) {
    const fromPrimal = Math.min(m.primal ?? 0, rest);
    m.primal = (m.primal ?? 0) - fromPrimal;
    rest -= fromPrimal;
  }
  // Temporary Mana (Mana Potion and the like) is spent before regular Mana.
  m.temp = Math.max(0, (m.temp ?? 0) - rest);
  m.current -= cost;
  m.primal = Math.min(m.primal ?? 0, Math.max(0, m.current));
  m.temp = Math.min(m.temp, Math.max(0, m.current - (m.primal ?? 0)));
}

// ---- Burn (Dragons) -----------------------------------------------------
// A character's Burn value (c.burn). At the end of its controller's turn it
// takes that much damage, then the value rises by 1 (engine burn step).

export const isBurning = (c) => (c?.burn ?? 0) > 0;

// Applying Burn X: the value becomes X if it was lower; otherwise it rises by X.
// Characters that are already dying don't catch fire.
export function applyBurn(state, c, amount) {
  if (!c || amount <= 0 || c.health <= 0 || c.destroyed) return;
  const cur = c.burn ?? 0;
  // A fresh Burn lasts burnTurns ticks; adding to a Burn already going raises the value, not the time left.
  if (cur <= 0) c.burnLeft = state.rules.burnTurns ?? 2;
  c.burn = cur < amount ? amount : cur + amount;
  log(state, `🔥 ${nameOf(state, c)} is Burning (${c.burn}).`);
  emit(state, { type: 'burnApplied', target: c.uid, player: c.controller ?? c.owner, amount: c.burn });
}

// Burning cards: from the hand (random cards) or the top of the deck. Burned
// cards go to the graveyard without being drawn or played.
export function burnCards(state, p, from, count, byPlayer) {
  const pl = state.players[p];
  for (let i = 0; i < count; i++) {
    const pile = from === 'hand' ? pl.hand : pl.deck;
    if (!pile.length) return;
    const idx = from === 'hand' ? randomInt(state, pile.length) : 0;
    const [card] = pile.splice(idx, 1);
    pl.graveyard.push(card);
    log(state, `🔥 ${pl.name}'s ${getCard(card.cardId).name} is burned${from === 'deck' ? ' from the deck' : ''}.`);
    emit(state, { type: 'cardBurned', player: p, by: byPlayer, cardId: card.cardId, cardUid: card.uid, from });
  }
}

// Late-bound engine queries, so effects can ask "could this player react?"
// without a circular import. engine.js fills these in.
export const hooks = {
  hasReaction: () => false,
  preventLethal: () => false, // Last Resort Protocol (engine fills it in)
};

// ---- Step queue helpers ---------------------------------------------------

// Steps pushed to the front resolve next (depth-first), in the order given.
export function pushFront(state, steps) {
  if (steps.length) state.queue.unshift(...steps);
}

// Events (and self-triggers) raised while a step resolves are buffered and
// run right after that step finishes, in the order raised, before any
// follow-up steps the step queued.
export function emit(state, event) {
  state.buffer.push({ kind: 'event', event });
}

// ---- Health changes -------------------------------------------------------

function reduceHealth(c, amount) {
  c.health -= amount;
}

// opts: { sourceController (for non-character sources like spells), lifesteal }
// Returns the damage actually dealt.
export function dealDamage(state, sourceId, targetId, amount, opts = {}) {
  const t = findCharacter(state, targetId);
  if (!t) return 0;
  // Prevention set by a "would take damage" Quick Play (Blood Shield, Protective Mother).
  const prevent = state.damagePrevention?.[targetId];
  if (prevent != null) {
    delete state.damagePrevention[targetId];
    const blocked = prevent === 'all' ? amount : Math.min(prevent, amount);
    if (blocked > 0) log(state, `${blocked} damage to ${nameOf(state, t)} is prevented.`);
    amount -= blocked;
  }
  if (amount <= 0) return 0;
  if (hasKeyword(t, 'Immune')) {
    log(state, `${nameOf(state, t)} is Immune.`);
    return 0;
  }
  if (hasKeyword(t, 'Evade')) {
    loseKeyword(state, t, 'Evade');
    log(state, `${nameOf(state, t)} Evades the damage.`);
    return 0;
  }
  const src = findCharacter(state, sourceId);
  const srcController = src ? src.controller : (opts.sourceController ?? null);
  if (t.kind === 'hero') {
    const absorbed = Math.min(t.armor, amount);
    // Lethal damage to a Hero can be stopped by a Trap (Last Resort Protocol).
    if (amount - absorbed >= t.health && hooks.preventLethal(state, t)) { log(state, `The lethal damage to ${nameOf(state, t)} is prevented.`); return 0; }
    t.armor -= absorbed;
    const lost = amount - absorbed;
    t.health -= lost;
    t.healthLost += lost;
    if (lost > 0) { state.players[t.owner].lostHealthTurn = state.turn; emit(state, { type: 'heroLostHealth', target: t.uid, player: t.owner, amount: lost, source: sourceId }); }
  } else {
    reduceHealth(t, amount);
    t.lastDamagedBy = sourceId;
    t.lastDamagedByController = srcController;
    emit(state, { type: 'minionLostStats', target: t.uid, player: t.controller, source: sourceId });
  }
  log(state, `${src ? nameOf(state, src) : opts.burn ? '🔥 Burn' : 'Effect'} deals ${amount} to ${nameOf(state, t)}.`);
  emit(state, { type: 'damageDealt', source: sourceId, target: t.uid, player: t.controller, amount });

  if ((src && hasKeyword(src, 'Lifesteal')) || opts.lifesteal) {
    if (srcController != null) heal(state, heroOf(state, srcController).uid, amount, { source: sourceId });
  }
  // Recoil: the source takes half (rounded down) of the damage it deals.
  if (src && src.uid !== t.uid && hasKeyword(src, 'Recoil') && Math.floor(amount / 2) > 0) {
    log(state, `${nameOf(state, src)} suffers Recoil.`);
    dealDamage(state, null, src.uid, Math.floor(amount / 2));
  }
  return amount;
}

// Healing caps at max Health unless `overheal` is set. Overheal (as defined):
// if the target is already at max Health, max Health rises by the amount.
// OPEN QUESTION: partial excess (e.g. 4/5 healed 3) currently just caps at 5/5.
export function heal(state, targetId, amount, opts = {}) {
  const t = findCharacter(state, targetId);
  if (!t || amount <= 0) return 0;
  // Radiation: a character whose Health a Radiation aura is lowering can't be healed
  // (ignoreRadiation: Irradiated Behemoth's heal still works).
  if ((t.radReduction ?? 0) > 0 && !opts.ignoreRadiation) { log(state, `☢ ${nameOf(state, t)} can't be healed while irradiated.`); return 0; }
  let healed = 0;
  if (t.health >= t.maxHealth) {
    if (!opts.overheal) return 0;
    t.maxHealth += amount;
    t.health += amount;
    healed = amount;
    // Overheal (Divine): the raise is Bonus Health.
    emit(state, { type: 'overhealed', source: opts.source ?? null, target: t.uid, player: t.controller ?? t.owner, amount });
    emit(state, { type: 'bonusHealth', target: t.uid, player: t.controller ?? t.owner, amount });
  } else {
    healed = Math.min(amount, t.maxHealth - t.health);
    t.health += healed;
  }
  log(state, `${nameOf(state, t)} restores ${healed} Health.`);
  emit(state, { type: 'characterHealed', source: opts.source ?? null, target: t.uid, player: t.controller, amount: healed });
  emit(state, { type: 'healthGained', target: t.uid, player: t.controller, amount: healed });
  return healed;
}

// Health loss that is not damage (costs like Blood Frenzy).
// opts.paid: a cost paid with Health by your own card (Demons: "pay Health");
// opts.forSummon: paid to summon a Demon (Soul Collector).
export function loseHealth(state, targetId, amount, opts = {}) {
  const t = findCharacter(state, targetId);
  if (!t || amount <= 0) return;
  if (t.kind === 'hero') t.health -= amount;
  else reduceHealth(t, amount);
  log(state, `${nameOf(state, t)} loses ${amount} Health.`);
  if (t.kind === 'hero') {
    t.healthLost += amount;
    state.players[t.owner].lostHealthTurn = state.turn;
    emit(state, { type: 'heroLostHealth', target: t.uid, player: t.owner, amount, source: null, paid: opts.paid !== false, forSummon: !!opts.forSummon });
  } else {
    emit(state, { type: 'minionLostStats', target: t.uid, player: t.controller, source: null });
  }
}

// ---- Card movement --------------------------------------------------------

export function addToHand(state, p, cardId, extra = {}) {
  const pl = state.players[p];
  const inst = { uid: newUid(state), cardId, owner: p, ...extra };
  if (pl.hand.length >= state.rules.maxHandSize) {
    pl.graveyard.push(inst);
    log(state, `${pl.name}'s hand is full; ${getCard(cardId).name} is burned.`);
    return null;
  }
  pl.hand.push(inst);
  return inst;
}

export function drawCards(state, p, count = 1, filter = null) {
  const pl = state.players[p];
  for (let i = 0; i < count; i++) {
    let idx = 0;
    if (filter) {
      idx = pl.deck.findIndex((c) => filter(getCard(c.cardId)));
      if (idx < 0) { log(state, `${pl.name} has no matching card to draw.`); continue; }
    }
    const [card] = pl.deck.splice(idx, 1);
    if (!card) {
      if (!state.rules.fatigue) continue;
      pl.fatigue += 1;
      log(state, `${pl.name} is out of cards (fatigue ${pl.fatigue}).`);
      dealDamage(state, null, pl.hero.uid, pl.fatigue);
      continue;
    }
    if (pl.hand.length >= state.rules.maxHandSize) {
      pl.graveyard.push(card);
      log(state, `${pl.name}'s hand is full; ${getCard(card.cardId).name} is burned.`);
    } else {
      pl.hand.push(card);
    }
    // A burned card still counts as drawn. The draw event comes first (Hidden
    // Spores can add Mushrooms to the card), then any Mushrooms on it burst.
    emit(state, { type: 'cardDrawn', player: p, cardUid: card.uid, cardId: card.cardId });
    state.buffer.push({ kind: 'mushrooms', player: p, cardUid: card.uid });
  }
}

// Puts a new minion onto p's board. Stat/keyword overrides come from the
// summoning card's text (e.g. "summon a 2/2 Vampire Thrall with Taunt").
export function summonMinion(state, p, cardId, opts = {}) {
  const pl = state.players[p];
  if (pl.board.length >= state.rules.maxBoardSize) {
    log(state, `${pl.name}'s board is full; ${getCard(cardId).name} is not summoned.`);
    return null;
  }
  const m = createMinion(state, cardId, p);
  if (opts.attack != null) m.attack = opts.attack;
  if (opts.health != null) { m.health = opts.health; m.maxHealth = opts.health; }
  for (const k of opts.keywords ?? []) if (!m.keywords.includes(k)) m.keywords.push(k);
  // Radiation: a minion created by an effect that the aura would bring to 0 Health never forms
  // (so "summon on death" effects can't loop forever under a strong aura).
  if (!opts.fromHand) {
    const aura = state.players.flatMap((x) => [x.hero, ...x.board]).filter((c) => c.health > 0 && !c.destroyed).reduce((t, c) => t + radiationOf(c), 0);
    if (aura > 0 && m.health <= aura) {
      log(state, `☢ ${getCard(cardId).name} is too irradiated to form.`);
      return null;
    }
  }
  const pos = opts.position ?? pl.board.length;
  pl.board.splice(Math.min(pos, pl.board.length), 0, m);
  if (!opts.silent) log(state, `${pl.name} summons ${getCard(cardId).name}.`);
  return m;
}
