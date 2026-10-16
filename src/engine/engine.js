// Game engine: state creation, the action API, and the step machine.
//
// Every player action is turned into a queue of serializable steps. run()
// drains the queue until it is empty, the game ends, or a step pauses for a
// player decision (a Quick Play reaction window or a Discover choice). Because
// the paused queue is part of state, a game can be saved, cloned, or sent over
// the network at any point, including mid-resolution.

import {
  addToHand, costOf, createHero, dealDamage, drawCards, effectiveAttack, emit, findCharacter,
  hasKeyword, hooks, log, loseHealth, minionsInOrder, nameOf, opponentOf, pushFront, removeKeyword,
  summonMinion, isBurning, manaFor, payMana, radiationOf,
  isShark, huntsPrey, heal, heroOf,
} from './core.js';
import { checkCondition, processBeyond, resolveEffect, surfaceMinion, tickChestbursters } from './effects.js';
import { factionHook } from './factions.js';
import { allCards, getCard, restoreCustomCards } from './registry.js';
import { pickRandom, shuffle } from './rng.js';
import { DEFAULT_QUICK_PLAY_WINDOWS, DEFAULT_RULES } from './rules.js';
import { matchFilter, resolveSelector, targetCandidates } from './targeting.js';
import { dispatchEvent, enterBattlefield, selfTriggerSteps } from './triggers.js';

// ---- Setup ---------------------------------------------------------------

// Hero Spells sit outside the 30-card decks: each picked faction contributes its own.
// Fusion Hero Spell for a two-faction deck (cards with fusion: [A, B]).
export function fusionFor(factions) {
  if (factions.length !== 2) return null;
  return allCards().find((c) => c.fusion && c.fusion.every((f) => factions.includes(f))) ?? null;
}
export const FUSION_CHARGE = 3;

export function heroSpellsFor(factions) {
  return allCards().filter((c) => c.heroSpell && factions.includes(c.faction));
}

// A faction whose only Hero Spell is passive (Dinosaurs, Bees) has nothing to press,
// so its Fusion charges on its own instead (see startTurn).
const passiveOnly = new Map();
export function hasPassiveHeroSpell(faction) {
  if (!passiveOnly.has(faction)) {
    const own = heroSpellsFor([faction]);
    passiveOnly.set(faction, own.length > 0 && own.every((c) => c.passive));
  }
  return passiveOnly.get(faction);
}

// players: [{ name, factions: [a, b], deck: [cardId, ...] }, ...]
// The deck is the two factions' fixed decks combined (see cards/index.js buildDeck).
export function createGame({ players, seed = Date.now(), rules = {} }) {
  const state = {
    rules: { ...DEFAULT_RULES, ...rules },
    rng: seed | 0,
    nextUid: 1,
    turn: 0,
    activePlayer: 0,
    players: [],
    queue: [],
    buffer: [],
    pending: null,
    gameOver: false,
    winner: null,
    log: [],
  };
  players.forEach((cfg, p) => {
    const heroSpells = heroSpellsFor(cfg.factions);
    const pl = {
      index: p, name: cfg.name ?? `Player ${p + 1}`, factions: [...cfg.factions],
      hero: createHero(state, p),
      mana: { current: 0, max: 0, bonusNextTurn: 0 }, turnsTaken: 0,
      heroSpells: heroSpells.filter((c) => !c.passive).map((c) => ({ cardId: c.id, uses: 0 })),
      // Fusion: charges by 1 per Hero Spell use (and every other turn per passive faction); usable at 3.
      fusion: fusionFor(cfg.factions) ? { cardId: fusionFor(cfg.factions).id, charge: 0 } : null,
      passives: heroSpells.filter((c) => c.passive).map((c) => c.id),
      extinction: cfg.factions.includes('Dinosaurs')
        ? { turns: 0, nextAt: state.rules.extinctionEvery, mode: 'normal', shower: 0 } : null,
      deck: cfg.deck.map((cardId) => ({ uid: state.nextUid++, cardId, owner: p })),
      hand: [], traps: [], board: [], graveyard: [], fatigue: 0,
      corpses: 0, deadZombies: [], zombieDeathsThisTurn: 0, // Zombies
    };
    shuffle(state, pl.deck);
    state.players.push(pl);
    // Bees: the game starts with The Living Hive on the board.
    if (cfg.factions.includes('Bees')) {
      const hive = summonMinion(state, p, 'the_hive', { silent: true });
      if (hive) hive.sick = false;
    }
  });
  drawCards(state, 0, state.rules.startingHandFirst);
  drawCards(state, 1, state.rules.startingHandSecond);
  if (state.rules.openingHandHelp) [0, 1].forEach((p) => ensureEarlyPlay(state, p));
  state.buffer = [];
  // Mulligan: Player 1, then Player 2, may swap opening cards before turn 1.
  if (state.rules.mulligan) state.pending = { type: 'mulligan', player: 0 };
  else beginGame(state);
  run(state);
  return state;
}

// Opening-hand help: a starting hand with no minion costing openingHandHelp or less
// swaps its most expensive card for a random cheap minion from the deck, so nobody
// starts with nothing to put on the board. Same rule for both players.
function ensureEarlyPlay(state, p) {
  const pl = state.players[p];
  const cheap = (c) => { const card = getCard(c.cardId); return card.type === 'minion' && card.cost <= state.rules.openingHandHelp; };
  if (!pl.hand.length || pl.hand.some(cheap)) return;
  const incoming = pickRandom(state, pl.deck.filter(cheap));
  if (!incoming) return;
  const out = pl.hand.reduce((a, b) => (getCard(b.cardId).cost > getCard(a.cardId).cost ? b : a));
  pl.hand[pl.hand.indexOf(out)] = incoming;
  pl.deck[pl.deck.indexOf(incoming)] = out;
  shuffle(state, pl.deck);
}

// After the mulligan: going second gets the Mana Potion (an extra card was already
// dealt), then Player 1's first turn starts.
function beginGame(state) {
  state.queue.push({ kind: 'startTurn', player: 0 });
  const potions = state.rules.secondPlayerPotions;
  if (potions?.length > 1) {
    // Going second: pick one potion (resolves before Player 1's first turn).
    state.pending = {
      type: 'choice', player: 1, prompt: 'Going second: choose a potion', resolve: 'effects', ctx: { controller: 1 },
      options: potions.map((cardId) => ({ cardId, label: getCard(cardId).name, effects: [{ op: 'addToHand', cardId }] })),
    };
  } else if (state.rules.coinCardId) {
    addToHand(state, 1, state.rules.coinCardId);
  }
}

// Every subset of a hand, as sorted uid lists (a hand of 4 → 16 options).
function subsets(uids) {
  return uids.reduce((acc, uid) => [...acc, ...acc.map((s) => [...s, uid])], [[]]).map((s) => s.sort((a, b) => a - b));
}

// Replacements are drawn first, then the swapped cards are shuffled back,
// so a swapped card can't come straight back.
function mulligan(state, { player: p, replace }) {
  const pl = state.players[p];
  const out = pl.hand.filter((c) => replace.includes(c.uid));
  pl.hand = pl.hand.filter((c) => !replace.includes(c.uid));
  drawCards(state, p, out.length);
  pl.deck.push(...out);
  shuffle(state, pl.deck);
  state.buffer = [];
  log(state, `${pl.name} ${out.length ? `replaces ${out.length} card${out.length === 1 ? '' : 's'}` : 'keeps their hand'}.`);
  state.pending = p === 0 ? { type: 'mulligan', player: 1 } : null;
  if (!state.pending) beginGame(state);
}

// ---- Legal actions -------------------------------------------------------

function canAttack(c) {
  if (c.kind === 'minion' && getCard(c.cardId).cantAttack) return false; // The Living Hive
  if (effectiveAttack(c) <= 0 || hasKeyword(c, 'Frozen') || c.cantAttackThisTurn) return false;
  if (c.attacksThisTurn >= (hasKeyword(c, 'Twin Strike') ? 2 : 1) + (c.bonusAttacks ?? 0)) return false;
  // Frenzy of the Pack: a Shark that just arrived may still attack Marked Prey.
  if (c.kind === 'minion' && c.sick && !hasKeyword(c, 'Charge') && !hasKeyword(c, 'Rush') && !c.preyRush) return false;
  return true;
}

export function attackTargets(state, p) {
  const enemy = state.players[opponentOf(p)];
  const visible = enemy.board.filter((m) => !hasKeyword(m, 'Stealth'));
  const taunts = visible.filter((m) => hasKeyword(m, 'Taunt'));
  if (taunts.length) return taunts.map((m) => m.uid);
  // Hive Enforcer: while it's in play, the enemy Hive can't be attacked.
  const guarded = enemy.board.some((m) => getCard(m.cardId).guardsHive && m.health > 0 && !m.destroyed);
  return [enemy.hero.uid, ...visible.filter((m) => !(guarded && getCard(m.cardId).isHive)).map((m) => m.uid)];
}

// Rush: on the turn it arrives, a minion may attack only minions.
function defendersFor(state, c) {
  let all = attackTargets(state, c.controller);
  // Sharks: Marked Prey can't hide in Stealth from a Shark (Blood in the Water); Goblin Shark
  // sees every Stealthed minion. (Taunt still has to be dealt with first.)
  if (isShark(c)) {
    const enemy = state.players[opponentOf(c.controller)];
    const taunts = enemy.board.some((m) => hasKeyword(m, 'Taunt') && !hasKeyword(m, 'Stealth'));
    const seesAll = getCard(c.cardId).seesStealth;
    const hidden = enemy.board.filter((m) => hasKeyword(m, 'Stealth') && (seesAll || (m.prey && huntsPrey(state, c.controller))));
    if (!taunts) all = [...all, ...hidden.map((m) => m.uid)];
  }
  // Frenzy of the Pack: an arriving Shark may only attack Marked Prey.
  if (c.kind === 'minion' && c.sick && c.preyRush && !hasKeyword(c, 'Charge') && !hasKeyword(c, 'Rush')) {
    return all.filter((id) => findCharacter(state, id)?.prey);
  }
  // Feralized Survivor: can't attack Heroes.
  if (c.kind === 'minion' && getCard(c.cardId).cantAttackHeroes) all = all.filter((id) => findCharacter(state, id).kind === 'minion');
  if (c.kind === 'minion' && c.sick && !hasKeyword(c, 'Charge')) {
    return all.filter((id) => findCharacter(state, id).kind === 'minion');
  }
  return all;
}

// type: 'play' | 'quickPlay' | 'heroSpell'; `id` is the hand uid (or Hero Spell card id).
function playOptions(state, p, card, id, type) {
  const base = { type, player: p, card: id };
  if (!card.target) return [base];
  const bySpell = card.type === 'spell'; // Elusive minions can't be chosen by enemy spells
  const first = targetCandidates(state, card.target, p, null, bySpell);
  if (!first.length) return card.type === 'minion' ? [base] : [];
  const out = [];
  for (const t of first) {
    if (!card.target2) { out.push({ ...base, target: t }); continue; }
    const second = targetCandidates(state, card.target2, p, t, bySpell);
    // target2Optional: still playable with no second target (Sinkhole with no friendly minion).
    if (!second.length && card.target2Optional) out.push({ ...base, target: t });
    for (const t2 of second) out.push({ ...base, target: t, target2: t2 });
  }
  return out;
}

function hasRoom(state, p, card) {
  const pl = state.players[p];
  if (card.requiresCorpses && (pl.corpses ?? 0) < card.requiresCorpses) return false;
  // playIf: a condition that must hold to play the card (Bees: "your Hive is in play").
  if (card.playIf && !checkCondition(state, card.playIf, { controller: p })) return false;
  if ((card.type === 'minion' || card.needsBoardSpace) && pl.board.length >= state.rules.maxBoardSize) return false;
  if (card.type === 'trap' && pl.traps.length >= state.rules.maxTraps) return false;
  return true;
}

function eligibleQuickPlays(state, p, windowName, windowCtx) {
  const out = [];
  for (const inst of state.players[p].hand) {
    const card = getCard(inst.cardId);
    const qp = card.quickPlay;
    if (!qp || !(qp.windows ?? DEFAULT_QUICK_PLAY_WINDOWS).includes(windowName)) continue;
    if (costOf(state, inst) > manaFor(state.players[p], card) || !hasRoom(state, p, card)) continue;
    if (!matchFilter(state, qp.filter, { controller: p, self: inst.uid, event: windowCtx?.event })) continue;
    out.push(...playOptions(state, p, card, inst.uid, 'quickPlay'));
  }
  return out;
}

export function getLegalActions(state) {
  // Created cards (Hybrids, variants) are looked up from the global registry;
  // make sure it holds *this* game's versions (AI search branches can create
  // different cards under the same id).
  restoreCustomCards(state);
  if (state.gameOver) return [];
  const pend = state.pending;
  if (pend?.type === 'reaction') {
    return [{ type: 'pass', player: pend.player }, ...eligibleQuickPlays(state, pend.player, pend.window, pend.ctx)];
  }
  if (pend?.type === 'choice') {
    return pend.options.map((_, index) => ({ type: 'choose', player: pend.player, index }));
  }
  if (pend?.type === 'mulligan') {
    return subsets(state.players[pend.player].hand.map((c) => c.uid)).map((replace) => ({ type: 'mulligan', player: pend.player, replace }));
  }
  const p = state.activePlayer;
  const pl = state.players[p];
  const actions = [{ type: 'endTurn', player: p }];
  for (const inst of pl.hand) {
    const card = getCard(inst.cardId);
    if (costOf(state, inst) <= manaFor(pl, card) && hasRoom(state, p, card)) actions.push(...playOptions(state, p, card, inst.uid, 'play'));
  }
  for (const hs of pl.heroSpells) {
    const card = getCard(hs.cardId);
    if (hs.uses < state.rules.heroSpellUsesPerTurn && !(hs.cooldown > 0) && card.cost <= manaFor(pl, card) && hasRoom(state, p, card)) {
      actions.push(...playOptions(state, p, card, hs.cardId, 'heroSpell'));
    }
  }
  if (pl.fusion && pl.fusion.charge >= FUSION_CHARGE) {
    const card = getCard(pl.fusion.cardId);
    if (card.cost <= manaFor(pl, card) && hasRoom(state, p, card)) actions.push(...playOptions(state, p, card, card.id, 'heroSpell'));
  }
  for (const c of [pl.hero, ...pl.board]) {
    if (!canAttack(c)) continue;
    for (const d of defendersFor(state, c)) actions.push({ type: 'attack', player: p, attacker: c.uid, defender: d });
  }
  return actions;
}

const KEY_FIELDS = ['type', 'player', 'card', 'target', 'target2', 'attacker', 'defender', 'index'];
const actionKey = (a) => [...KEY_FIELDS.map((k) => a[k] ?? ''), [...(a.replace ?? [])].sort((x, y) => x - y).join(',')].join('|');

export function isLegal(state, action) {
  const key = actionKey(action);
  return getLegalActions(state).some((a) => actionKey(a) === key);
}

// For moves that arrive over the network: the matching legal action (built by the
// engine, so no extra or malformed fields get through), or null if it isn't legal.
// A minion's landing spot is the one extra allowed, as a small integer.
export function legalMatch(state, action) {
  if (!action || typeof action !== 'object') return null;
  const key = actionKey(action);
  const found = getLegalActions(state).find((a) => actionKey(a) === key);
  if (!found) return null;
  const pos = action.position;
  return Number.isInteger(pos) && pos >= 0 && pos <= 10 ? { ...found, position: pos } : { ...found };
}

// ---- Applying actions ----------------------------------------------------

export function applyAction(state, action) {
  restoreCustomCards(state);
  if (!isLegal(state, action)) throw new Error(`Illegal action: ${JSON.stringify(action)}`);
  switch (action.type) {
    case 'endTurn':
      state.queue.push({ kind: 'endTurn', player: action.player });
      break;
    case 'play':
      playCard(state, action);
      break;
    case 'heroSpell':
      castHeroSpell(state, action);
      break;
    case 'attack':
      declareAttack(state, action);
      break;
    case 'pass':
      state.pending = null;
      break;
    case 'quickPlay':
      quickPlay(state, action);
      break;
    case 'choose':
      resolveChoice(state, action);
      break;
    case 'mulligan':
      mulligan(state, action);
      break;
  }
  run(state);
  return state;
}

function takeFromHand(state, p, uid) {
  const pl = state.players[p];
  const idx = pl.hand.findIndex((c) => c.uid === uid);
  const [inst] = pl.hand.splice(idx, 1);
  payMana(pl, getCard(inst.cardId), costOf(state, inst));
  if (getCard(inst.cardId).upgrade) pl.upgradeDiscount = 0; // Chief Engineer's discount is used up
  return { inst, card: getCard(inst.cardId) };
}

function spellSteps(card, ctx, event, p) {
  return [
    { kind: 'event', event },
    // Acidic: Living Flask listens for spells that apply Corrosion.
    ...(card.corrodes ? [{ kind: 'event', event: { type: 'corrosiveSpell', player: p, cardId: card.id } }] : []),
    { kind: 'window', name: 'cardPlayed', priority: opponentOf(p), ctx: { event } },
    ...card.effects.map((effect) => ({ kind: 'effect', effect, ctx })),
    { kind: 'deaths' },
  ];
}


// `position` (optional): where a minion lands on the board, 0 = far left.
// It isn't part of legality: any slot is allowed and it's clamped to the board.
function playCard(state, { player: p, card: uid, target, target2, position }) {
  const pl = state.players[p];
  const { inst, card } = takeFromHand(state, p, uid);
  const chosen = target ?? null;
  const chosen2 = target2 ?? null;
  log(state, `${pl.name} plays ${card.type === 'trap' ? 'a Trap' : card.name}.`);

  // Brood Architect: the first Egg you play each turn costs less.
  if ((card.tribes ?? []).includes('Egg')) pl.eggPlayedTurn = state.turn;
  if (card.type === 'minion') {
    // The minion takes its board slot immediately; its abilities resolve
    // after the opponent's reaction window.
    const slot = Number.isInteger(position) ? Math.max(0, Math.min(position, pl.board.length)) : undefined;
    const m = summonMinion(state, p, card.id, { silent: true, position: slot, fromHand: true });
    if (!m) { pl.graveyard.push(inst); return; } // it couldn't enter play (a Queen who has already died)
    const event = { type: 'cardPlayed', source: m.uid, player: p, cardId: card.id, cardType: 'minion', target: chosen };
    const ctx = { self: m.uid, controller: p, chosen, chosen2 };
    const steps = [
      { kind: 'event', event },
      { kind: 'window', name: 'cardPlayed', priority: opponentOf(p), ctx: { event } },
    ];
    steps.push({ kind: 'selfTrigger', uid: m.uid, on: 'battlecry', ctx });
    if (state.rules.summonTriggersOnPlay) steps.push({ kind: 'selfTrigger', uid: m.uid, on: 'summon', ctx });
    steps.push({ kind: 'event', event: { type: 'minionSummoned', source: m.uid, player: p } }, { kind: 'deaths' });
    state.queue.push(...steps);
  } else if (card.type === 'spell') {
    const event = { type: 'cardPlayed', source: inst.uid, player: p, cardId: card.id, cardType: 'spell', target: chosen };
    state.queue.push(...spellSteps(card, { self: inst.uid, controller: p, chosen, chosen2, cardId: card.id }, event, p));
    pl.graveyard.push(inst);
  } else if (card.type === 'trap') {
    pl.traps.push(inst);
    // The event is public but reveals only that a Trap was set.
    state.queue.push({ kind: 'event', event: { type: 'cardPlayed', source: inst.uid, player: p, cardType: 'trap', hidden: true } });
  }
}

function castHeroSpell(state, { player: p, card: cardId, target, target2 }) {
  const pl = state.players[p];
  const card = getCard(cardId);
  if (card.fusion) pl.fusion.charge = 0;
  else {
    const hs = pl.heroSpells.find((h) => h.cardId === cardId);
    hs.uses += 1;
    if (card.cooldown) hs.cooldown = card.cooldown; // Controlled Irradiation: usable again after N turns
    if (pl.fusion) pl.fusion.charge = Math.min(FUSION_CHARGE, pl.fusion.charge + 1);
  }
  payMana(pl, card, card.cost);
  log(state, `${pl.name} casts Hero Spell ${card.name}.`);
  const self = state.nextUid++;
  const event = { type: 'cardPlayed', source: self, player: p, cardId, cardType: 'spell', heroSpell: true, target: target ?? null };
  state.queue.push(...spellSteps(card, { self, controller: p, chosen: target ?? null, chosen2: target2 ?? null, cardId }, event, p));
}

function quickPlay(state, { player: p, card: uid, target, target2 }) {
  const pl = state.players[p];
  const windowState = state.pending;
  state.pending = null;
  const { inst, card } = takeFromHand(state, p, uid);
  log(state, `${pl.name} responds with ${card.name} (Quick Play)!`);
  pl.graveyard.push(inst);
  const ctx = { self: inst.uid, controller: p, chosen: target ?? null, chosen2: target2 ?? null, cardId: card.id, event: windowState.ctx?.event };
  pushFront(state, [
    ...(card.corrodes ? [{ kind: 'event', event: { type: 'corrosiveSpell', player: p, cardId: card.id } }] : []),
    ...card.effects.map((effect) => ({ kind: 'effect', effect, ctx })),
    { kind: 'deaths' },
    // Priority passes back: the other player may answer the Quick Play.
    { kind: 'window', name: windowState.window, priority: opponentOf(p), ctx: windowState.ctx },
  ]);
}

function resolveChoice(state, { player: p, index }) {
  const choice = state.pending;
  state.pending = null;
  const opt = choice.options[index];
  if (choice.resolve === 'effects') {
    log(state, `${state.players[p].name} chooses: ${opt.label}.`);
    pushFront(state, [...opt.effects.map((effect) => ({ kind: 'effect', effect, ctx: choice.ctx })), { kind: 'deaths' }]);
  }
  if (choice.resolve === 'deckToHand') {
    const pl = state.players[p];
    const i = pl.deck.findIndex((c) => c.uid === opt.uid);
    if (i >= 0) {
      const [inst] = pl.deck.splice(i, 1);
      if (choice.costMod) inst.costMod = (inst.costMod ?? 0) + choice.costMod; // Fusions: "it costs (N) less"
      if (pl.hand.length < state.rules.maxHandSize) pl.hand.push(inst);
      else pl.graveyard.push(inst);
      log(state, `${pl.name} Discovers ${getCard(inst.cardId).name}.`);
    }
  }
}

// Sharks: extra damage when a Shark attacks. Blood in the Water gives +2 against Marked Prey
// once per turn; Pack Hunters +1 each; Mako Sprinter doubles it; Goblin Shark +1 to wounded minions.
function huntDamage(state, a, d, dmg) {
  if (a.kind !== 'minion' || d.kind !== 'minion') return dmg;
  const card = getCard(a.cardId);
  if (d.prey && isShark(a)) {
    const pl = state.players[a.controller];
    if (huntsPrey(state, a.controller) && pl.preyBonusTurn !== state.turn) {
      pl.preyBonusTurn = state.turn;
      dmg += 2;
      log(state, `🩸 Blood in the Water: +2 Attack against Prey.`);
    }
    dmg += pl.board.filter((m) => getCard(m.cardId).packBonus).length;
    dmg += card.preyAttack ?? 0;
    if (card.doubleVsPrey) dmg *= 2;
  }
  if (card.woundBonus && d.health < d.maxHealth) dmg += 1;
  // Aliens (Hive Brood): extra Attack against an Implanted minion (Xeno Runner).
  if (card.implantAttack && d.implanted != null) dmg += card.implantAttack;
  return dmg;
}

function declareAttack(state, { player: p, attacker, defender }) {
  const a = findCharacter(state, attacker);
  a.attacksThisTurn += 1;
  // Blind: the attack hits a random character, friend or foe.
  let blind = false;
  if (hasKeyword(a, 'Blind')) {
    const all = state.players.flatMap((pl) => [pl.hero, ...pl.board]).filter((c) => c.uid !== attacker);
    defender = pickRandom(state, all).uid;
    blind = true;
  }
  const d = findCharacter(state, defender);
  log(state, `${nameOf(state, a)} attacks ${nameOf(state, d)}${blind ? ' (Blind!)' : ''}.`);
  const event = { type: 'attackDeclared', source: attacker, target: defender, player: p };
  state.queue.push(
    { kind: 'event', event },
    { kind: 'window', name: 'attackDeclared', priority: opponentOf(p), ctx: { event } },
    { kind: 'combat', attacker, defender, friendlyFire: blind },
    { kind: 'deaths' },
    { kind: 'event', event: { type: 'afterAttack', source: attacker, target: defender, player: p } },
  );
}

// ---- Auras ---------------------------------------------------------------

// Continuous effects ("Your other Vampire minions have +1 Health") are
// recomputed after every step, so they turn on and off as minions come and go.
function applyAuras(state) {
  const bonus = new Map();
  const bonusAtk = new Map();
  const bonusKw = new Map();
  for (const s of minionsInOrder(state)) {
    // aura: one { target, attack?, health?, keywords?, if? } or a list of them (Swarm Commander).
    for (const aura of [].concat(getCard(s.cardId).aura ?? [])) {
      const ctx = { self: s.uid, controller: s.controller };
      if (aura.if && !checkCondition(state, aura.if, ctx)) continue;
      for (const id of resolveSelector(state, aura.target, ctx)) {
        if (aura.health) bonus.set(id, (bonus.get(id) ?? 0) + aura.health);
        if (aura.attack) bonusAtk.set(id, (bonusAtk.get(id) ?? 0) + aura.attack);
        if (aura.keywords) bonusKw.set(id, [...(bonusKw.get(id) ?? []), ...aura.keywords]);
      }
    }
  }
  // Keyword auras (Royal Bodyguard) are recomputed outright each step.
  for (const m of minionsInOrder(state)) {
    const kw = bonusKw.get(m.uid);
    if (kw) m.auraKeywords = [...new Set(kw)];
    else if (m.auraKeywords) delete m.auraKeywords;
  }
  // Radiation: every living irradiated character lowers the Health of every other
  // non-irradiated character by its Radiation (stacking). Recomputed like any aura;
  // when the reduction shrinks, the Health comes back. A character brought to 0 dies.
  const sources = state.players.flatMap((pl) => [pl.hero, ...pl.board]).filter((c) => radiationOf(c) > 0 && c.health > 0 && !c.destroyed);
  const totalRad = sources.reduce((s, c) => s + radiationOf(c), 0);
  for (const c of state.players.flatMap((pl) => [pl.hero, ...pl.board])) {
    const proof = c.radProofUntil != null; // The Irradiated Genius: ignores Radiation auras for now
    const want = radiationOf(c) > 0 || proof ? 0 : totalRad;
    const d = want - (c.radReduction ?? 0);
    if (!d) continue;
    c.radReduction = want;
    c.maxHealth -= d;
    c.health -= d;
  }
  // Attack auras (Graveyard Overseer) are recomputed outright each step.
  for (const m of minionsInOrder(state)) m.auraAttack = bonusAtk.get(m.uid) ?? 0;
  for (const m of minionsInOrder(state)) {
    const d = (bonus.get(m.uid) ?? 0) - m.auraHealth;
    if (!d) continue;
    m.auraHealth += d;
    m.maxHealth += d;
    m.health = d > 0 ? m.health + d : Math.min(m.health, m.maxHealth);
  }
}

// ---- "Would die" Traps ------------------------------------------------------

// The dying minion's opponent may hold a Trap on 'minionWouldDie'. If one
// matches, it fires: the death is prevented and its effects resolve now.
function interceptDeath(state, m) {
  const p = opponentOf(m.controller);
  const pl = state.players[p];
  for (const trap of pl.traps) {
    const card = getCard(trap.cardId);
    if (card.trap?.on !== 'minionWouldDie') continue;
    const ctx = { self: trap.uid, controller: p, event: { type: 'minionWouldDie', source: m.uid, player: m.controller }, cardId: trap.cardId };
    if (!matchFilter(state, card.trap.filter, ctx)) continue;
    pl.traps.splice(pl.traps.indexOf(trap), 1);
    pl.graveyard.push(trap);
    log(state, `Trap revealed: ${card.name}!`);
    m.destroyed = false;
    for (const effect of card.trap.effects) resolveEffect(state, effect, ctx);
    emit(state, { type: 'trapTriggered', player: p, cardId: trap.cardId });
    return m.health > 0 && !m.destroyed;
  }
  return false;
}

// ---- Extinction Cycle (Dinosaurs) ---------------------------------------

// Meteor Shower: remove a player's Primal crystals and any unspent Primal Mana.
function clearPrimal(pl) {
  const m = pl.mana;
  m.max = Math.min(m.max, m.base ?? m.max);
  m.current = Math.max(0, Math.min(m.current - (m.primal ?? 0), m.max + (m.temp ?? 0)));
  m.primal = 0;
}

function extinction(state, p) {
  const pl = state.players[p];
  const ext = pl.extinction;
  if (ext.mode === 'meteorShower') {
    // Instead: 1 random minion is destroyed at each of the next 3 turn-ends, and all of
    // this player's Primal Mana is destroyed; none can be gained until the shower ends.
    log(state, `☄ EXTINCTION! A Meteor Shower begins. ${pl.name}'s Primal Mana is destroyed.`);
    ext.shower = 3;
    clearPrimal(pl);
  } else {
    log(state, `☄ EXTINCTION! ${pl.name}'s Mana Crystals are destroyed.`);
    const victims = ext.mode === 'bothBoards' ? minionsInOrder(state) : pl.board;
    for (const m of victims) m.destroyed = true;
    pl.mana.max = 0;
    pl.mana.current = 0;
    pl.mana.temp = 0;
    pl.mana.base = 0;
    pl.mana.primal = 0;
  }
  ext.turns = 0;
  ext.nextAt = state.rules.extinctionEvery;
  ext.mode = 'normal';
}

// ---- Step machine --------------------------------------------------------

const STEPS = {
  event(state, { event }) {
    // Acidic: count each player's minions summoned this turn (Corrosion Chamber).
    if (event.type === 'minionSummoned') {
      const pl = state.players[event.player];
      if (pl.summonTurn !== state.turn) { pl.summonTurn = state.turn; pl.summonCount = 0; }
      pl.summonCount += 1;
    }
    const steps = dispatchEvent(state, event);
    // Acidic: an enemy minion gaining Attack on its own turn opens a Quick Play window (Reactive Spill).
    if (event.type === 'attackGained' && event.player === state.activePlayer) {
      steps.push({ kind: 'window', name: 'enemyBuffed', priority: opponentOf(event.player), ctx: { event } });
    }
    // Damage and Burn damage open a Quick Play window for the waiting player (Dragons).
    if (event.type === 'damageDealt' || event.type === 'burnDamage') {
      steps.push({ kind: 'window', name: event.type, priority: opponentOf(state.activePlayer), ctx: { event } });
    }
    // Demons: Quick Plays for your own attacks and for your own Hero losing Health (on either turn).
    if (event.type === 'attackDeclared') {
      steps.push({ kind: 'window', name: 'friendlyAttack', priority: event.player, ctx: { event } });
    }
    if (event.type === 'heroLostHealth') {
      steps.push({ kind: 'window', name: 'heroLostHealth', priority: event.player, ctx: { event } });
    }
    // Radioactive: Quick Plays for an enemy character gaining Radiation (on either turn).
    if (event.type === 'radiationApplied') {
      steps.push({ kind: 'window', name: 'enemyIrradiated', priority: opponentOf(event.player), ctx: { event } });
    }
    pushFront(state, steps);
  },

  effect(state, { effect, ctx }) {
    resolveEffect(state, effect, ctx);
  },

  selfTrigger(state, { uid, on, ctx }) {
    const m = findCharacter(state, uid);
    if (!m) return;
    pushFront(state, selfTriggerSteps(state, getCard(m.cardId), on, ctx));
  },

  window(state, { name, priority, ctx }) {
    if (eligibleQuickPlays(state, priority, name, ctx).length === 0) return;
    state.pending = { type: 'reaction', player: priority, window: name, ctx };
  },

  combat(state, step) {
    const { attacker, defender, friendlyFire } = step;
    const a = findCharacter(state, attacker);
    const d = findCharacter(state, defender);
    if (!a || !d || a.health <= 0 || d.health <= 0 || (a.controller === d.controller && !friendlyFire)) {
      log(state, 'The attack fizzles.');
      return;
    }
    if (step.cancelled) return; // Acidic: Rusted Jaws / Emergency Neutralizer stopped it
    const aDmg = effectiveAttack(a);
    const dDmg = d.kind === 'minion' ? effectiveAttack(d) : 0;
    // The defending player may react before their minion takes the hit.
    const responder = opponentOf(state.activePlayer);
    const event = { type: 'wouldTakeDamage', source: a.uid, target: d.uid, player: d.controller, amount: aDmg };
    if (!step.windowed && d.kind === 'minion' && d.controller === responder && aDmg > 0 &&
        eligibleQuickPlays(state, responder, 'wouldTakeDamage', { event }).length) {
      pushFront(state, [
        { kind: 'window', name: 'wouldTakeDamage', priority: responder, ctx: { event } },
        { ...step, windowed: true },
      ]);
      return;
    }
    const huntDmg = huntDamage(state, a, d, aDmg);
    const wasPrey = d.kind === 'minion' && d.prey;
    const dealt = dealDamage(state, a.uid, d.uid, huntDmg);
    dealDamage(state, d.uid, a.uid, dDmg);
    // Scarred Leviathan: damage to Marked Prey heals your Hero by as much.
    if (wasPrey && dealt > 0 && a.kind === 'minion' && getCard(a.cardId).leechPrey) heal(state, heroOf(state, a.controller).uid, dealt, { source: a.uid });
    // Great White: killing Marked Prey lets it attack again this turn (once).
    if (wasPrey && d.health <= 0 && a.kind === 'minion' && getCard(a.cardId).extraAttackOnPreyKill && a.extraAttackTurn !== state.turn) {
      a.extraAttackTurn = state.turn;
      a.bonusAttacks = (a.bonusAttacks ?? 0) + 1;
      log(state, `${nameOf(state, a)} can attack again!`);
    }
    // Venomous: kills the enemy minion it attacks (if the hit landed).
    if (dealt > 0 && d.kind === 'minion' && hasKeyword(a, 'Venomous')) {
      d.destroyed = true;
      d.lastDamagedBy = a.uid;
      d.lastDamagedByController = a.controller;
      log(state, `${nameOf(state, d)} succumbs to venom.`);
    }
  },

  deaths(state) {
    let dead = minionsInOrder(state).filter((m) => m.health <= 0 || m.destroyed);
    // "When an enemy minion would die" Traps (Experimental Containment) can save it.
    dead = dead.filter((m) => !interceptDeath(state, m));
    if (!dead.length) return;
    const steps = [];
    // Was each killer a minion? (checked before anyone leaves the board)
    const killerMinion = new Map(dead.map((m) => [m.uid, findCharacter(state, m.lastDamagedBy)?.kind === 'minion']));
    for (const m of dead) {
      const board = state.players[m.controller].board;
      board.splice(board.indexOf(m), 1);
      // Unique minions (the Queen) can never come back once they have died.
      if (getCard(m.cardId).unique) (state.players[m.owner].uniquesDead ??= []).push(m.cardId);
      // Obliterate: removed from the game — no graveyard, no Exit, no Reborn, no death events.
      if (m.obliterate) { log(state, `☢ ${nameOf(state, m)} is obliterated.`); continue; }
      state.players[m.owner].graveyard.push({ uid: m.uid, cardId: m.cardId, owner: m.owner, died: true });
      log(state, `${nameOf(state, m)} dies.`);
      // Ghosts: deaths counted this turn / this game, and per player (friendly minions that died).
      state.deathsThisTurn = (state.deathsThisTurn ?? 0) + 1;
      state.deathsThisGame = (state.deathsThisGame ?? 0) + 1;
      state.players[m.controller].minionDeaths = (state.players[m.controller].minionDeaths ?? 0) + 1;
      const card = getCard(m.cardId);
      const event = {
        type: 'minionDied', source: m.uid, player: m.controller, cardId: m.cardId,
        killer: m.lastDamagedBy, killerPlayer: m.lastDamagedByController, killerMinion: killerMinion.get(m.uid), byBurn: !!m.diedToBurn,
        dead: { kind: 'minion', controller: m.controller, prey: !!m.prey, tribes: [...m.tribes], cardId: m.cardId, storedCost: m.storedCost, upgrades: m.upgrades ?? 0, irradiated: radiationOf(m) > 0, implanted: m.implanted ?? null },
      };
      // Poisonous: the enemy minion that killed it dies too.
      const killer = findCharacter(state, m.lastDamagedBy);
      if (hasKeyword(m, 'Poisonous') && killer?.kind === 'minion' && killer.controller !== m.controller) {
        killer.destroyed = true;
        log(state, `${nameOf(state, killer)} is poisoned.`);
      }
      // Plants (Carnivorous Garden): Devour — the enemy minion that destroyed it gains +1/+1.
      if (killer?.kind === 'minion' && killer.controller !== m.controller && hasKeyword(killer, 'Devour') && killer.health > 0 && !killer.destroyed) {
        steps.push({ kind: 'effect', effect: { op: 'devour' }, ctx: { self: killer.uid, controller: killer.controller, event } });
      }
      // Zombies: a friendly Zombie that dies leaves a Corpse.
      if (m.tribes.includes('Zombie')) {
        const zp = state.players[m.controller];
        zp.corpses = (zp.corpses ?? 0) + 1;
        (zp.deadZombies ??= []).push(m.cardId);
        zp.zombieDeathsThisTurn = (zp.zombieDeathsThisTurn ?? 0) + 1;
        log(state, `🪦 ${nameOf(state, m)} leaves a Corpse.`);
      }
      // noExit: destroyed without its Exit (Emergency Hatching).
      if (!m.noExit) steps.push(...selfTriggerSteps(state, card, 'deathrattle', { self: m.uid, controller: m.controller, event }));
      // Granted Exits (Consume Decay) act for the player who granted them.
      for (const g of (m.grantedTriggers ?? []).filter((t) => t.on === 'deathrattle')) {
        const ctx = { self: m.uid, controller: g.controller, event, cardId: m.cardId };
        steps.push(...g.effects.map((effect) => ({ kind: 'effect', effect, ctx })), { kind: 'deaths' });
      }
      if (hasKeyword(m, 'Reborn')) steps.push({ kind: 'reborn', cardId: m.cardId, controller: m.controller, resurrected: m.resurrected, owner: m.owner, uid: m.uid, onRebornSummon: m.onRebornSummon, hauntTag: m.hauntTag });
      // Ghosts: marked to be Haunted if it dies (Soul Reaper, Grave Grasp, Irradiated Afterlife).
      else if (m.hauntOnDeath && state.turn <= m.hauntOnDeath.until) {
        steps.push({ kind: 'effect', effect: { op: 'hauntDead', uid: m.uid, ...m.hauntOnDeath.mods }, ctx: { controller: m.hauntOnDeath.controller, self: null } });
      }
      steps.push(
        { kind: 'event', event },
        { kind: 'window', name: 'minionDied', priority: opponentOf(state.activePlayer), ctx: { event } },
      );
    }
    steps.push({ kind: 'deaths' });
    pushFront(state, steps);
  },

  // Mushrooms on a drawn card burst: 1 damage to the drawer's Hero per Mushroom.
  mushrooms(state, { player: p, cardUid }) {
    const pl = state.players[p];
    const inst = pl.hand.find((c) => c.uid === cardUid) ?? pl.graveyard.find((c) => c.uid === cardUid);
    const n = inst?.mushrooms ?? 0;
    if (!n) return;
    inst.mushrooms = 0;
    log(state, `🍄 ${n} Mushroom${n === 1 ? '' : 's'} burst from ${pl.name}'s card!`);
    dealDamage(state, null, pl.hero.uid, n, { sourceController: opponentOf(p) });
    emit(state, { type: 'mushroomTriggered', player: p, amount: n, cardUid });
  },

  reborn(state, { cardId, controller, resurrected, owner, uid, onRebornSummon, hauntTag }) {
    // It comes back from the Graveyard, so it is no longer there to be Haunted.
    if (uid != null && owner != null) {
      const grave = state.players[owner].graveyard;
      const i = grave.findIndex((g) => g.uid === uid);
      if (i >= 0) grave.splice(i, 1);
    }
    const m = summonMinion(state, controller, cardId, { silent: true });
    if (!m) return;
    if (owner != null) m.owner = owner;
    if (hauntTag) m.hauntTag = hauntTag; // still the same Haunted minion
    // The Eternal Swarm: whenever it loses Reborn, a 1/1 Spectral Insect appears.
    if (onRebornSummon) pushFront(state, [{ kind: 'effect', effect: { op: 'summon', cardId: onRebornSummon }, ctx: { controller, self: null } }]);
    m.health = state.rules.rebornHealth;
    m.maxHealth = state.rules.rebornHealth;
    removeKeyword(m, 'Reborn');
    if (resurrected) m.resurrected = true; // Resurrection stays used up
    m.rebornUsed = true; // Divine Intervention can't give it Reborn again
    log(state, `${nameOf(state, m)} is Reborn.`);
    enterBattlefield(state, m);
    emit(state, { type: 'minionReborn', source: m.uid, player: controller });
  },

  endTurn(state, { player: p }) {
    log(state, `${state.players[p].name} ends their turn.`);
    const event = { type: 'endOfTurn', player: p };
    pushFront(state, [
      { kind: 'event', event },
      { kind: 'window', name: 'endOfTurn', priority: opponentOf(p), ctx: { event } },
      { kind: 'burn', player: p },
      { kind: 'extinction', player: p },
      { kind: 'deaths' },
      { kind: 'cleanup', player: p },
      { kind: 'startTurn', player: opponentOf(p) },
    ]);
  },

  // Burned: each Burned minion loses 1 Health at the end of its controller's turn.
  // Burn (Dragons): each Burning character of that player takes its Burn value
  // as damage, then the value rises by 1.
  burn(state, { player: p }) {
    const pl = state.players[p];
    for (const m of pl.board) if (hasKeyword(m, 'Burned')) loseHealth(state, m.uid, 1);
    for (const c of [pl.hero, ...pl.board]) {
      if (!isBurning(c) || c.health <= 0 || c.destroyed) continue;
      const n = c.burn;
      const dealt = dealDamage(state, null, c.uid, n, { sourceController: opponentOf(p), burn: true });
      if (c.kind === 'minion') c.diedToBurn = c.health <= 0;
      if (dealt > 0) emit(state, { type: 'burnDamage', target: c.uid, player: p, amount: dealt });
      // After its last tick the fire goes out (Burn lasts at most burnTurns turns).
      c.burnLeft = (c.burnLeft ?? 2) - 1;
      if (c.burnLeft <= 0) { c.burn = 0; log(state, `${nameOf(state, c)} stops Burning.`); } else c.burn = n + 1;
    }
  },

  extinction(state, { player: p }) {
    const ext = state.players[p].extinction;
    if (ext && ext.turns >= ext.nextAt) extinction(state, p);
    // Meteor Shower: one random minion is destroyed at the end of each turn,
    // 3 times, starting with the Extinction turn itself. No Primal Mana meanwhile.
    for (const pl of state.players) {
      if (!pl.extinction?.shower) continue;
      const victim = pickRandom(state, minionsInOrder(state).filter((m) => !m.destroyed));
      if (victim) { victim.destroyed = true; log(state, `A meteor strikes ${nameOf(state, victim)}!`); }
      clearPrimal(pl);
      pl.extinction.shower -= 1;
      if (!pl.extinction.shower) log(state, `The Meteor Shower ends. ${pl.name} can gain Primal Mana again.`);
    }
  },

  cleanup(state, { player: p }) {
    // Temporary Radiation counts down at the end of the turns of the player who applied it.
    for (const c of state.players.flatMap((x) => [x.hero, ...x.board])) {
      if (!c.radTemp?.length) continue;
      for (const r of c.radTemp) if (r.by === p) r.left -= 1;
      const before = radiationOf(c);
      c.radTemp = c.radTemp.filter((r) => r.left > 0);
      if (before && !radiationOf(c)) log(state, `${nameOf(state, c)}'s Radiation fades.`);
    }
    for (const pl of state.players) {
      pl.hero.tempAttack = 0;
      pl.hero.tempKeywords = [];
      for (const m of pl.board) {
        m.tempAttack = 0;
        m.tempKeywords = [];
        m.cantAttackThisTurn = false;
        m.justReturned = false;
        m.preyRush = false;
        m.bonusAttacks = 0;
        if (m.grantedTriggers?.some((t) => t.temporary)) m.grantedTriggers = m.grantedTriggers.filter((t) => !t.temporary);
        if (m.tempHealth > 0) {
          m.maxHealth -= m.tempHealth;
          m.health = Math.min(m.health, m.maxHealth);
        } else if (m.tempHealth < 0) {
          // "-N Health this turn" ends: the Health comes back (Rapid Decay).
          m.maxHealth -= m.tempHealth;
          m.health -= m.tempHealth;
        }
        m.tempHealth = 0;
      }
    }
    // Frozen minions thaw once they've missed one of their controller's turns.
    for (const m of state.players[p].board) {
      if (m.thawAfter == null || !hasKeyword(m, 'Frozen')) continue;
      m.thawAfter -= 1;
      if (m.thawAfter <= 0) { removeKeyword(m, 'Frozen'); m.thawAfter = null; log(state, `${nameOf(state, m)} thaws.`); }
    }
    for (const m of minionsInOrder(state)) {
      // "Return it to your hand at the end of the turn."
      if (m.returnAtEndOfTurn) {
        resolveEffect(state, { op: 'returnToHand', target: 'self' }, { self: m.uid, controller: m.controller });
        continue;
      }
      // Temporarily controlled minions go home.
      if (m.tempControl?.returnAtEndOfTurnOf !== p) continue;
      const from = state.players[m.controller];
      const to = state.players[m.tempControl.returnTo];
      from.board.splice(from.board.indexOf(m), 1);
      m.controller = m.tempControl.returnTo;
      m.tempControl = null;
      if (to.board.length >= state.rules.maxBoardSize) {
        // OPEN QUESTION: what happens if the original owner's board is full?
        log(state, `${nameOf(state, m)} has no room to return and is destroyed.`);
        state.players[m.owner].graveyard.push({ uid: m.uid, cardId: m.cardId, owner: m.owner });
        continue;
      }
      to.board.push(m);
      log(state, `${nameOf(state, m)} returns to ${to.name}.`);
    }
  },

  startTurn(state, { player: p }) {
    state.turn += 1;
    state.activePlayer = p;
    const pl = state.players[p];
    // Sub-Space Jump: banished minions come back with their buff.
    for (const entry of [...(pl.limbo ?? [])]) {
      if (entry.returnAt !== p) continue;
      pl.limbo.splice(pl.limbo.indexOf(entry), 1);
      if (pl.board.length >= state.rules.maxBoardSize) { log(state, `${nameOf(state, entry.minion)} has no room to return.`); continue; }
      const m = entry.minion;
      m.attack += entry.attack; m.health += entry.health; m.maxHealth += entry.health;
      pl.board.push(m);
      log(state, `${nameOf(state, m)} returns from sub-space (+${entry.attack}/+${entry.health}).`);
      enterBattlefield(state, m);
    }
    for (const x of state.players) x.zombieDeathsThisTurn = 0;
    // Ultraterrestrials: Displaced minions due back now return.
    processBeyond(state, p);
    // Sand Sharks: Burrowed minions Surface.
    for (const m of [...pl.board]) if (m.burrowed) surfaceMinion(state, m);
    // Aliens (Hive Brood): Chestbursters grow, and Evolve when they're ready.
    tickChestbursters(state, p);
    // Acidic: Caustic Reservoir keeps eating at its minion each turn it survives.
    if (pl.reservoir != null) {
      const m = state.players[opponentOf(p)].board.find((x) => x.uid === pl.reservoir);
      if (m && m.health > 0 && !m.destroyed) resolveEffect(state, { op: 'corrode', target: { uid: m.uid }, amount: 1 }, { self: pl.hero.uid, controller: p });
      else pl.reservoir = null;
    }
    state.deathsLastTurn = state.deathsThisTurn ?? 0;
    state.deathsThisTurn = 0;
    pl.turnsTaken += 1;
    if (pl.extinction) pl.extinction.turns += 1;
    factionHook(pl, 'turnStartMana')(state, pl);
    pl.hero.attacksThisTurn = 0;
    for (const hs of pl.heroSpells) { hs.uses = 0; if (hs.cooldown > 0 && pl.turnsTaken > 1) hs.cooldown -= 1; }
    // Passive Hero Spells (Extinction Cycle, The Living Hive) can't be used, so each
    // such faction charges the Fusion by 1 every other turn instead.
    const passives = pl.factions.filter(hasPassiveHeroSpell).length;
    if (pl.fusion && passives && pl.turnsTaken % 2 === 0) pl.fusion.charge = Math.min(FUSION_CHARGE, pl.fusion.charge + passives);
    // "Until your next turn" effects that player p applied expire now.
    for (const c of [...state.players.flatMap((x) => [x.hero, ...x.board])]) {
      c.lingerAttack = (c.lingerAttack ?? []).filter((x) => x.until !== p);
      c.lingerKeywords = (c.lingerKeywords ?? []).filter((x) => x.until !== p);
      if (c.radProofUntil === p) c.radProofUntil = null;
      // Temporary Health "until your next turn" (Sanctuary) ends now.
      for (const x of (c.lingerHealth ?? []).filter((x) => x.until === p)) {
        c.maxHealth -= x.amount;
        c.health = Math.min(c.health, c.maxHealth);
      }
      c.lingerHealth = (c.lingerHealth ?? []).filter((x) => x.until !== p);
    }
    for (const m of pl.board) {
      m.sick = false; m.attacksThisTurn = 0;
      // Between Worlds: an enemy minion that came back exhausted can't attack this turn.
      if (m.exhausted) { m.cantAttackThisTurn = true; m.exhausted = false; }
    }
    log(state, `— Turn ${state.turn}: ${pl.name} (${pl.mana.current} Mana) —`);
    drawCards(state, p, 1);
    emit(state, { type: 'startOfTurn', player: p });
    pushFront(state, [{ kind: 'deaths' }]);
  },
};

function checkGameOver(state) {
  const dead = state.players.filter((pl) => pl.hero.health <= 0);
  if (!dead.length) return;
  state.gameOver = true;
  state.pending = null;
  state.queue = [];
  state.buffer = [];
  state.winner = dead.length === 2 ? null : opponentOf(dead[0].index);
  log(state, state.winner == null ? 'Both heroes fall. Draw!' : `${state.players[state.winner].name} wins!`);
}

export function run(state) {
  let guard = 0;
  const recent = [];
  while (state.queue.length && !state.pending && !state.gameOver) {
    // Safety net: effects that keep triggering each other forever are stopped
    // (the rest of the chain is dropped) instead of freezing the game.
    if (++guard > 20000) {
      const kinds = [...new Set(recent.slice(-50))].join(', ');
      log(state, `⚠ An endless chain of effects was stopped (${kinds}).`);
      state.queue = [];
      state.buffer = [];
      break;
    }
    const step = state.queue.shift();
    recent.push(step.kind + (step.cardId ? `:${step.cardId}` : '') + (step.event?.type ? `:${step.event.type}` : ''));
    if (recent.length > 200) recent.splice(0, 100);
    STEPS[step.kind](state, step);
    if (state.buffer.length) {
      const buffered = state.buffer;
      state.buffer = [];
      pushFront(state, buffered);
    }
    applyAuras(state);
    checkGameOver(state);
  }
  return state;
}

hooks.hasReaction = (state, p, windowName, ctx) => eligibleQuickPlays(state, p, windowName, ctx).length > 0;

// Traps on 'heroLethal' (Last Resort Protocol): fire before lethal damage lands; true = prevented.
hooks.preventLethal = (state, hero) => {
  const pl = state.players[hero.owner];
  const trap = pl.traps.find((t) => getCard(t.cardId).trap?.on === 'heroLethal');
  if (!trap) return false;
  pl.traps.splice(pl.traps.indexOf(trap), 1);
  pl.graveyard.push(trap);
  const card = getCard(trap.cardId);
  log(state, `Trap revealed: ${card.name}!`);
  const ctx = { self: trap.uid, controller: hero.owner, cardId: trap.cardId };
  state.buffer.push(...card.trap.effects.map((effect) => ({ kind: 'effect', effect, ctx })), { kind: 'deaths' },
    { kind: 'event', event: { type: 'trapTriggered', player: hero.owner, cardId: trap.cardId } });
  return true;
};

// The player who must act next (a reaction or choice can belong to the non-active player).
export function actingPlayer(state) {
  return state.pending?.player ?? state.activePlayer;
}
