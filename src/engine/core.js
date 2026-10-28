// Core state primitives shared by the engine, effects, and targeting.
// Game state is plain JSON: no classes, Sets, or functions, so it can be
// cloned (AI search), saved, and sent over the network unchanged.

import { getCard, registerCustom } from './registry.js';
import { randomInt } from './rng.js';
import { CIRCLES, FACTION_TAGS } from './rules.js';

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
  // The Chewed One: extra Attack while damaged.
  const hurt = c.kind === 'minion' && c.health < c.maxHealth ? (getCard(c.cardId).attackWhileDamaged ?? 0) : 0;
  return Math.max(0, c.attack + c.tempAttack + linger + (c.auraAttack ?? 0) + rad + hurt);
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
  // Sand Sharks: a Burrowed minion has Stealth until it Surfaces.
  if (k === 'Stealth' && c.burrowed) return true;
  // Ice Age (Frozen in Time): a minion still Thawing in its ice has no Taunt yet.
  if (k === 'Taunt' && c.encased > 0) return false;
  return c.keywords.includes(k) || (c.tempKeywords ?? []).includes(k) || (c.lingerKeywords ?? []).some((x) => x.k === k)
    || (c.auraKeywords ?? []).includes(k);
}

export function allKeywords(c) {
  return [...new Set([...c.keywords, ...(c.tempKeywords ?? []), ...(c.lingerKeywords ?? []).map((x) => x.k), ...(c.auraKeywords ?? [])])];
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
  // Ghosts: Graveyard Colossus — 1 less for every 2 minions that died this game, to a minimum.
  if (card.costPerDeaths && state) aura -= Math.min(Math.floor((state.deathsThisGame ?? 0) / card.costPerDeaths.per), Math.max(0, card.cost - card.costPerDeaths.min));
  // Fungus: The Rot King — 1 less for each Corpse you have.
  // Void (Singularity): costPerPulled: { min } — (1) less per card you've Pulled this game (Dark Star).
  if (card.costPerPulled && state) aura -= Math.min(state.players[inst.owner]?.pulled ?? 0, Math.max(0, card.cost - (card.costPerPulled.min ?? 0)));
  // Void: costPerDiscard: { min } — (1) less per card you've discarded this game (Abyssal Leviathan).
  if (card.costPerDiscard && state) aura -= Math.min(state.players[inst.owner]?.discarded ?? 0, Math.max(0, card.cost - (card.costPerDiscard.min ?? 0)));
  if (card.costPerCorpse && state) aura -= Math.floor((state.players[inst.owner]?.corpses ?? 0) / card.costPerCorpse);
  // Demons (Kings of Hell): Infernal Contract's discount on your next Demon this turn; Royal Tax.
  const dd = state?.players[inst.owner]?.demonDiscount;
  if (dd && dd.turn === state.turn && (card.tribes ?? []).includes('Demon')) aura -= dd.amount;
  if (inst.taxTurn != null && state && inst.taxTurn === state.turn) aura += inst.tax ?? 0;
  // Robots: Chief Engineer — the next Upgrade you play costs less.
  if (card.upgrade && state) aura -= state.players[inst.owner]?.upgradeDiscount ?? 0;
  // Demons: the Circles of Hell (both players) and Satan's discount per circle sunk.
  const depth = descentDepth(state);
  if (depth === 2 && card.type === 'minion') aura -= 1;
  if (depth === 4 && card.type === 'spell') aura -= 1;
  if (depth === 7 && card.type === 'minion' && card.faction === 'Demons') aura -= 2;
  if (card.costPerDepth) aura -= depth * card.costPerDepth;
  return Math.max(inst.minCost ?? card.minCost ?? 0, card.cost + (inst.costMod ?? 0) + aura);
}

// ---- Demons: The Descent (rules.js CIRCLES) ------------------------------------------
export const descentDepth = (state) => state?.descent?.depth ?? 0;
export const currentCircle = (state) => CIRCLES[descentDepth(state) - 1] ?? null;
// Starts the Descent if a Demon player is in the match (createGame, or lazily for old saves).
export function initDescent(state) {
  if (state.descent) return state.descent;
  if (!state.players.some((p) => p.factions.includes('Demons'))) return null;
  state.descent = { depth: 0, lead: null };
  return state.descent;
}
// Sink the battle n circles deeper (to the Ninth at most). Each round sinks one (startTurn),
// so round 1 is Limbo and round 9 is Treachery; Baphomet sinks one extra.
export function sinkCircles(state, n = 1) {
  const d = initDescent(state);
  for (let i = 0; d && i < n && d.depth < CIRCLES.length; i++) {
    d.depth += 1;
    const c = CIRCLES[d.depth - 1];
    log(state, `🔥 The battle sinks into the ${c.ordinal} Circle: ${c.name}. ${c.text}`);
    emit(state, { type: 'descended', depth: d.depth });
  }
}
// Sink straight to the next circle (Baphomet).
export const sinkOneCircle = (state) => sinkCircles(state, 1);
// Hero Spells cost 1 more in Limbo (Fusions are unaffected).
// costsAllMana (Meteor Strike): it spends all the caster's Mana (never less than its printed cost).
export const heroSpellCost = (state, card, pl = null) => (card.costsAllMana && pl ? Math.max(card.cost, manaFor(pl, card)) : card.cost)
  + (descentDepth(state) === 1 && !card.fusion ? 1 : 0);
// Gluttony: hands hold only 7 cards.
export const maxHand = (state) => (descentDepth(state) === 3 ? Math.min(7, state.rules.maxHandSize) : state.rules.maxHandSize);

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
    // Built-in permanent Radiation (The Elephant's Foot).
    ...(card.radiation ? { radPerm: card.radiation } : {}),
    sick: true, attacksThisTurn: 0,
    lastDamagedBy: null, lastDamagedByController: null,
    destroyed: false, tempControl: null, returnAtEndOfTurn: false,
  };
}

// Tribes: a card that asks for a Robot also takes a Mech (a piloted machine), so Robot
// synergies keep working on Mechs.
export const hasTribe = (tribes, t) => (tribes ?? []).includes(t) || (t === 'Robot' && (tribes ?? []).includes('Mech'));

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
// A character's Burn value (c.burn). At the end of its enemy's turn it takes that
// much damage, then the value rises by 1 (engine burn step).

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

// Holy Flame (Divine, The Holy Pyre): a lasting holy fire. At the end of the burner's turn it deals
// its value as damage (double to Dark / Undead), then burns down by 1; a burning character can't be healed, and a
// minion that dies while burning is Reduced to Ash (removed: no Graveyard, Exit or Reborn).
export function applyHolyFlame(state, c, amount, by) {
  if (!c || amount <= 0 || c.health <= 0 || c.destroyed) return;
  c.holyFlame = (c.holyFlame ?? 0) + amount;
  c.holyBy = by;
  log(state, `✨ ${nameOf(state, c)} burns with Holy Flame (${c.holyFlame}).`);
  emit(state, { type: 'holyFlameApplied', target: c.uid, player: c.controller ?? c.owner, amount: c.holyFlame });
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
// ---- Sharks: Marked Prey ---------------------------------------------------------
// Blood in the Water (the Sharks' passive Hero Spell): an enemy minion brought to 3 Health
// or less becomes Marked Prey. The mark stays until it leaves play or is healed above 3.
// Cards can also mark minions directly (markPrey with force).
export const PREY_HEALTH = 3;
export const isShark = (c) => c?.kind === 'minion' && (c.tribes ?? []).includes('Shark');
export const huntsPrey = (state, p) => state.players[p]?.factions?.includes('Sharks');
export function markPrey(state, m, force = false) {
  if (!m || m.kind !== 'minion' || m.prey || m.health <= 0 || m.destroyed) return false;
  if (!force && m.health > PREY_HEALTH) return false;
  m.prey = true;
  log(state, `🩸 ${nameOf(state, m)} is Marked Prey.`);
  emit(state, { type: 'preyMarked', source: m.uid, player: m.controller });
  return true;
}
// healed: Health went up (healing or a buff), which can lift the mark; damage never does.
export function checkPrey(state, m, healed = false) {
  if (!m || m.kind !== 'minion') return;
  if (m.prey && healed && m.health > PREY_HEALTH) { m.prey = false; log(state, `${nameOf(state, m)} is no longer Prey.`); return; }
  if (!m.prey && m.health > 0 && m.health <= PREY_HEALTH && huntsPrey(state, opponentOf(m.controller))) markPrey(state, m);
}

// ---- Acidic: Corrosion, Dissolve, Acid-coated ---------------------------------------
// Corrosion X permanently lowers a minion's Attack by X (its Health is untouched). It eats
// the minion's own Attack first, then any Attack it has this turn. It lasts while the
// minion stays in play; a minion that leaves and comes back is a fresh copy. At 0 Attack
// it can't attack until something raises its Attack again.
// Ruling: Corrosion dissolves Radioactive minions too (their passive only shrugs off buffs).
// Acid-coated: the next Corrosion on that minion is 1 stronger, then the coating is gone.
export function corrode(state, m, amount, by = null) {
  if (!m || m.kind !== 'minion' || m.health <= 0 || m.destroyed || amount <= 0) return 0;
  if (m.acidCoated) { amount += 1; m.acidCoated = false; }
  // Meltdown: Corrosion on a minion already at 0 Attack eats something else instead.
  if (effectiveAttack(m) <= 0) {
    m.corrosion = (m.corrosion ?? 0) + amount;
    log(state, `🧪 ${nameOf(state, m)} corrodes further (Corrosion ${m.corrosion}).`);
    meltdown(state, m, by);
    return 0;
  }
  const before = effectiveAttack(m);
  let left = amount;
  const fromBase = Math.min(left, m.attack);
  m.attack -= fromBase; left -= fromBase;
  if (left > 0 && m.tempAttack > 0) { const t = Math.min(left, m.tempAttack); m.tempAttack -= t; left -= t; }
  m.corrosion = (m.corrosion ?? 0) + amount;
  const after = effectiveAttack(m);
  const lost = before - after;
  log(state, `🧪 ${nameOf(state, m)} corrodes (Corrosion ${amount}): ${before} → ${after} Attack.`);
  emit(state, { type: 'corrosionApplied', target: m.uid, player: m.controller, by, amount, lost, zeroed: before > 0 && after === 0 });
  meltdown(state, m, by);
  return lost;
}

// Meltdown (Acidic): a minion at 0 Attack carrying 6 or more Corrosion is Dissolved.
export const MELTDOWN_CORROSION = 6;
function meltdown(state, m, by) {
  if (effectiveAttack(m) > 0 || (m.corrosion ?? 0) < MELTDOWN_CORROSION) return;
  log(state, `🧪 Meltdown: ${nameOf(state, m)} has corroded away completely.`);
  emit(state, { type: 'meltdown', target: m.uid, player: m.controller, by });
  dissolve(state, m, by);
}
const NEGATIVE = ['Silenced', 'Frozen', 'Blind', 'Recoil', 'Burned'];

// A Ghost lets go of its Relic (it took up another): the Relic's stats, keywords and effects go.
export function dropMinionRelic(state, m) {
  const r = m.relic;
  if (!r) return;
  m.attack = Math.max(0, m.attack - r.attack);
  if (r.health) { m.maxHealth -= r.health; m.health = Math.min(m.health, m.maxHealth); }
  for (const k of r.keywords) removeKeyword(m, k);
  m.grantedTriggers = (m.grantedTriggers ?? []).filter((t) => !t.relic);
  m.relic = null;
}

export function acidCoat(state, m) {
  if (!m || m.kind !== 'minion' || m.health <= 0) return;
  m.acidCoated = true;
  log(state, `🧪 ${nameOf(state, m)} is Acid-coated.`);
}

// Defensive effects Dissolve strips, the strongest first (Evade is the game's Divine Shield).
export const DEFENSIVE_KEYWORDS = ['Evade', 'Spell Ward', 'Immune', 'Reborn', 'Taunt', 'Elusive', 'Stealth'];
// Keywords a minion carries itself (not lent by an aura, which would come straight back).
const ownKeyword = (m, k) => m.keywords.includes(k) || (m.tempKeywords ?? []).includes(k) || (m.lingerKeywords ?? []).some((x) => x.k === k);
export const defensiveKeywordOf = (m) => DEFENSIVE_KEYWORDS.find((k) => ownKeyword(m, k)) ?? null;

export function hasTempBuffs(m) {
  return m.tempAttack > 0 || m.tempHealth > 0 || (m.tempKeywords ?? []).length > 0
    || (m.lingerAttack ?? []).some((x) => x.amount > 0) || (m.lingerHealth ?? []).some((x) => x.amount > 0) || (m.lingerKeywords ?? []).length > 0;
}

// Returns what was removed ({ attack, health, keywords }) or null.
export function removeTempBuffs(state, m) {
  if (!hasTempBuffs(m)) return null;
  const taken = {
    attack: Math.max(0, m.tempAttack) + (m.lingerAttack ?? []).reduce((t, x) => t + Math.max(0, x.amount), 0),
    keywords: [...new Set([...(m.tempKeywords ?? []), ...(m.lingerKeywords ?? []).map((x) => x.k)])],
  };
  if (m.tempAttack > 0) m.tempAttack = 0;
  m.lingerAttack = (m.lingerAttack ?? []).filter((x) => x.amount < 0);
  const extra = (m.tempHealth > 0 ? m.tempHealth : 0) + (m.lingerHealth ?? []).reduce((t, x) => t + Math.max(0, x.amount), 0);
  if (extra > 0) {
    m.maxHealth -= extra;
    m.health = Math.max(1, Math.min(m.health, m.maxHealth));
  }
  if (m.tempHealth > 0) m.tempHealth = 0;
  m.lingerHealth = (m.lingerHealth ?? []).filter((x) => x.amount < 0);
  for (const k of [...(m.tempKeywords ?? []), ...(m.lingerKeywords ?? []).map((x) => x.k)]) emit(state, { type: 'keywordLost', target: m.uid, player: m.controller, keyword: k });
  m.tempKeywords = [];
  m.lingerKeywords = [];
  log(state, `🧪 ${nameOf(state, m)}'s temporary buffs dissolve.`);
  return { ...taken, health: extra };
}

// Dissolving a minion distills it into a spell in the dissolver's hand that gives one
// of their own minions one random piece of it for good: its printed Attack, its printed
// Health, or its keywords. It costs 2.
function distill(state, by, taken) {
  if (by == null || (!taken.attack && !taken.health && !taken.keywords.length)) return;
  const parts = [
    taken.attack ? `+${taken.attack} Attack` : '', taken.health ? `+${taken.health} Health` : '',
    taken.keywords.join(', '),
  ].filter(Boolean);
  const card = {
    id: `essence_${state.nextUid++}`, custom: true, token: true, faction: 'Acidic', type: 'spell',
    name: `Essence of ${taken.name}`, art: '🧪', artFrom: taken.cardId, cost: 2,
    text: `Give a friendly minion ${parts.join(' and ')}.`,
    target: { type: 'minion', side: 'friendly' },
    effects: [{ op: 'buff', target: 'chosen',
      ...(taken.attack ? { attack: taken.attack } : {}),
      ...(taken.health ? { health: taken.health } : {}),
      ...(taken.keywords.length ? { keywords: taken.keywords } : {}) }],
  };
  registerCustom(state, card);
  addToHand(state, by, card.id);
  log(state, `🧪 ${state.players[by].name} distills ${taken.name} into ${card.name} (${parts.join(', ')}).`);
}

// Rust-Eater Brute: a minion "has buffs" when it is above its printed stats or carries
// temporary buffs or keywords its card doesn't print.
export function isBuffed(m) {
  const card = getCard(m.cardId);
  if (hasTempBuffs(m)) return true;
  if (m.attack > (card.attack ?? 0) || m.maxHealth > (card.health ?? 0)) return true;
  return m.keywords.some((k) => !(card.keywords ?? []).includes(k));
}

// Dissolve: destroy a minion and distill its Attack, Health or keywords into a spell
// in the dissolver's hand (see distill).
export function dissolve(state, m, by = null) {
  if (!m || m.kind !== 'minion' || m.health <= 0 || m.destroyed) return null;
  // One random piece of it: its printed Attack, its printed Health, or its keywords.
  const card = getCard(m.cardId);
  const keywords = allKeywords(m).filter((k) => ownKeyword(m, k));
  const options = [
    ...(card.attack > 0 ? [{ attack: card.attack, health: 0, keywords: [] }] : []),
    ...(card.health > 0 ? [{ attack: 0, health: card.health, keywords: [] }] : []),
    ...(keywords.length ? [{ attack: 0, health: 0, keywords }] : []),
  ];
  const taken = { name: nameOf(state, m), cardId: m.cardId,
    ...(options.length ? options[randomInt(state, options.length)] : { attack: 0, health: 0, keywords: [] }) };
  m.destroyed = true;
  if (by != null) { m.lastDamagedByController = by; }
  log(state, `🧪 ${taken.name} dissolves.`);
  distill(state, by, taken);
  emit(state, { type: 'dissolved', target: m.uid, player: m.controller, by, result: 'destroyed' });
  return 'destroyed';
}

export function emit(state, event) {
  state.buffer.push({ kind: 'event', event });
  FX_TRACE.get(state)?.push(event);
}

// The screen's record of what a move did, in order (events plus a few visual-only marks), so each
// keyword can be animated from what really happened. Only kept while the UI asks for it (around a
// move it is about to show); the rules never read it, and the AI's copies of the game never have one.
const FX_TRACE = new WeakMap();
export function startFxTrace(state) { FX_TRACE.set(state, []); }
export function takeFxTrace(state) { const t = FX_TRACE.get(state) ?? []; FX_TRACE.delete(state); return t; }
export function traceFx(state, mark) { FX_TRACE.get(state)?.push({ fx: true, ...mark }); }

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
  // Ice Age (Frozen in Time): a minion still Thawing is sealed in ice and takes no damage.
  if (t.encased > 0) {
    log(state, `${nameOf(state, t)} is sealed in ice.`);
    return 0;
  }
  if (hasKeyword(t, 'Immune')) {
    log(state, `${nameOf(state, t)} is Immune.`);
    return 0;
  }
  if (hasKeyword(t, 'Evade')) {
    loseKeyword(state, t, 'Evade');
    log(state, `${nameOf(state, t)} Evades the damage.`);
    return 0;
  }
  // Ice Age: Hardy takes 1 less damage from each hit (never below 1).
  if (amount > 1 && hasKeyword(t, 'Hardy')) amount -= 1;
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
    checkPrey(state, t);
    // Rage: damage it survives makes it angrier.
    if (amount > 0 && t.health > 0 && !t.destroyed && hasKeyword(t, 'Rage')) { t.attack += 1; log(state, `😡 ${nameOf(state, t)} rages (+1 Attack).`); traceFx(state, { type: 'rage', target: t.uid }); }
  }
  log(state, `${src ? nameOf(state, src) : opts.burn ? '🔥 Burn' : 'Effect'} deals ${amount} to ${nameOf(state, t)}.`);
  emit(state, { type: 'damageDealt', source: sourceId, target: t.uid, player: t.controller, amount });

  if ((src && hasKeyword(src, 'Lifesteal')) || opts.lifesteal) {
    if (srcController != null) {
      const hero = heroOf(state, srcController);
      traceFx(state, { type: 'lifesteal', source: src?.uid ?? hero.uid, from: t.uid, target: hero.uid, amount });
      heal(state, hero.uid, amount, { source: sourceId });
    }
  }
  // Recoil: the source takes half (rounded down) of the damage it deals.
  if (src && src.uid !== t.uid && hasKeyword(src, 'Recoil') && Math.floor(amount / 2) > 0) {
    log(state, `${nameOf(state, src)} suffers Recoil.`);
    traceFx(state, { type: 'recoil', source: t.uid, target: src.uid, amount: Math.floor(amount / 2) });
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
  if ((t.holyFlame ?? 0) > 0) { log(state, `✨ ${nameOf(state, t)} can't be healed while it burns with Holy Flame.`); return 0; }
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
  checkPrey(state, t, true);
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
  // Lycanthropes: a card always goes to a hand in its Humanoid Form (the Beast Form is board-only).
  cardId = getCard(cardId)?.humanForm ?? cardId;
  const inst = { uid: newUid(state), cardId, owner: p, ...extra };
  if (pl.hand.length >= maxHand(state)) {
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
    const burned = pl.hand.length >= maxHand(state);
    if (burned) {
      pl.graveyard.push(card);
      log(state, `${pl.name}'s hand is full; ${getCard(card.cardId).name} is burned.`);
    } else {
      pl.hand.push(card);
    }
    // Demons (Kings of Hell): cards drawn this turn (Hellfire Decree).
    if (pl.drawsTurn !== state.turn) { pl.drawsTurn = state.turn; pl.drawsThisTurn = 0; }
    pl.drawsThisTurn += 1;
    // A burned card still counts as drawn. The draw event comes first (Hidden
    // Spores can add Mushrooms to the card), then any Mushrooms on it burst.
    emit(state, { type: 'cardDrawn', player: p, cardUid: card.uid, cardId: card.cardId, burned });
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
  // Unique (the Queen): one at a time, and never again once she has died.
  if (getCard(cardId).unique && (pl.board.some((x) => x.cardId === cardId) || (pl.uniquesDead ?? []).includes(cardId))) {
    log(state, `${getCard(cardId).name} can't return.`);
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
  // Sand Sharks: a minion with Burrow arrives Burrowed (Stealth until it Surfaces).
  if (m.keywords.includes('Burrow')) m.burrowed = true;
  // Ice Age (Frozen in Time): a Thawing minion arrives sealed in ice for that many of its turns.
  if (getCard(cardId).thawing) m.encased = getCard(cardId).thawing;
  return m;
}
