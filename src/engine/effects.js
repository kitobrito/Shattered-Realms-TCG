// Effect operations. Cards reference these by `op` name with parameters, so
// new cards are data, and only genuinely new mechanics need a new op here.
//
// Every op receives (state, effect, ctx) where ctx = { self, controller, chosen, chosen2, event }.
// Accelerated Incubation: a marked minion's Exit also happens when it leaves the
// board without dying (returned to hand, transformed). Used once.
function exitOnLeave(state, m) {
  if (!m.exitOnLeave) return;
  m.exitOnLeave = false;
  log(state, `${nameOf(state, m)} hatches as it leaves!`);
  const card = getCard(m.cardId);
  const ctx = { self: m.uid, controller: m.controller, event: { type: 'minionLeft', source: m.uid } };
  for (const t of (card.triggers ?? []).filter((x) => x.on === 'deathrattle')) {
    pushFront(state, [...t.effects.map((effect) => ({ kind: 'effect', effect, ctx })), { kind: 'deaths' }]);
  }
}

// The skinwalker's stolen stats, positive keywords, and visible likeness last only in Beast Form.
export function takeHide(state, wearer, victim) {
  if (!wearer || !victim || wearer.kind !== 'minion' || victim.kind !== 'minion' || wearer.health <= 0) return;
  const old = wearer.borrowedHideBonus;
  if (old) {
    wearer.attack = Math.max(0, wearer.attack - old.attack);
    wearer.maxHealth = Math.max(1, wearer.maxHealth - old.health);
    wearer.health = Math.min(wearer.health, wearer.maxHealth);
    wearer.keywords = wearer.keywords.filter((k) => !old.keywords.includes(k));
  }
  const keywords = allKeywords(victim).filter((k) => !NEGATIVE_KEYWORDS.includes(k));
  const gainedKeywords = keywords.filter((k) => !hasKeyword(wearer, k));
  const attack = Math.max(0, effectiveAttack(victim));
  const health = Math.max(0, victim.maxHealth ?? getCard(victim.cardId).health);
  applyBuff(state, wearer, { attack, health });
  for (const k of gainedKeywords) addKeyword(wearer, k, false, state);
  wearer.borrowedHideBonus = { attack, health, keywords: gainedKeywords };
  wearer.borrowedHide = victim.cardId;
  log(state, `${nameOf(state, wearer)} steals ${nameOf(state, victim)}'s hide and takes its shape.`);
}

// Any effect may carry `if: <condition>` (and optional `else: [effects]`).

import {
  addToHand, allKeywords, dealDamage, drawCards, effectiveAttack, emit, findCharacter, hasKeyword, heal, heroOf,
  hooks, log, loseHealth, loseKeyword, nameOf, opponentOf, pushFront, removeKeyword, summonMinion, createMinion,
  applyBurn, burnCards, hasTribe, isBurning, isDarkOrUndead,
  applyRadiation, clearRadiation, radiationOf, reduceHealthStat, markPrey, checkPrey, isShark,
  corrode, acidCoat, dissolve, removeTempBuffs, applyHolyFlame, applyBleed, dropMinionRelic,
  descentDepth, maxHand, sinkOneCircle,
  traceFx, gainVolts, isConductive,
} from './core.js';
import { allCards, collectibleMinions, getCard, registerCustom } from './registry.js';
import { pickRandom, randomInt, shuffle } from './rng.js';
import { FACTION_TAGS, NEGATIVE_KEYWORDS, POSITIVE_KEYWORDS, RANDOM_KEYWORD_POOL, REMADE_FORMS } from './rules.js';
import { minionPasses, resolveSelector, targetCandidates } from './targeting.js';
import { enterBattlefield, queueSelfTrigger, selfTriggerSteps } from './triggers.js';

const each = (state, sel, ctx, fn) => {
  for (const id of resolveSelector(state, sel, ctx)) {
    const c = findCharacter(state, id);
    if (c && !spellWarded(state, c, ctx)) fn(c);
  }
};

// Ghosts' Spell Ward: the next enemy spell that would affect this minion has no effect on it,
// then the Ward is gone (every part of that one spell is blocked, not just the first).
function spellWarded(state, c, ctx) {
  if (c.kind !== 'minion' || c.controller === ctx.controller || !ctx.cardId) return false;
  if (getCard(ctx.cardId).type !== 'spell') return false;
  if (c.wardBlocks === ctx.self) return true;
  if (!hasKeyword(c, 'Spell Ward')) return false;
  loseKeyword(state, c, 'Spell Ward');
  c.wardBlocks = ctx.self;
  log(state, `🛡 ${nameOf(state, c)}'s Spell Ward blocks ${getCard(ctx.cardId).name}.`);
  return true;
}

// ---- Ghosts: the Graveyard ------------------------------------------------
// Minions that actually died (not spells, burned cards or Obliterated minions), from
// one or both Graveyards. Each entry is { uid, cardId, owner, died: true }.
function deadEntries(state, ctx, from = 'either', f = {}) {
  const sides = from === 'enemy' ? [opponentOf(ctx.controller)] : from === 'friendly' ? [ctx.controller] : [ctx.controller, opponentOf(ctx.controller)];
  return sides.flatMap((p) => state.players[p].graveyard.filter((g) => {
    if (!g.died) return false;
    const c = getCard(g.cardId);
    if (c.type !== 'minion' || c.unique || c.isHive) return false;
    if (f.maxCost != null && c.cost > f.maxCost) return false;
    if (f.tribe && !hasTribe(c.tribes, f.tribe)) return false;
    return true;
  }));
}

// Haunt one Graveyard entry: it leaves the Graveyard and is summoned on ctx.controller's
// side (its owner stays the same, so if it dies again it goes back to its owner's Graveyard).
// mods: { attack?, health? (deltas), setHealth?, keywords?, payCost? }
function hauntEntry(state, entry, ctx, mods = {}) {
  const me = state.players[ctx.controller];
  if (me.board.length >= state.rules.maxBoardSize) { log(state, `${me.name}'s board is full; nothing can be Haunted.`); return null; }
  const grave = state.players[entry.owner].graveyard;
  const i = grave.indexOf(entry);
  if (i < 0) return null;
  grave.splice(i, 1);
  const m = summonMinion(state, ctx.controller, entry.cardId, { silent: true });
  if (!m) return null;
  m.owner = entry.owner;
  m.haunted = true;
  if (mods.attack) m.attack = Math.max(0, m.attack + mods.attack);
  if (mods.health) { m.maxHealth = Math.max(1, m.maxHealth + mods.health); m.health = Math.min(m.maxHealth, Math.max(1, m.health + mods.health)); }
  if (mods.setHealth != null) { m.health = mods.setHealth; m.maxHealth = mods.setHealth; }
  for (const k of mods.keywords ?? []) addKeyword(m, k, false, state);
  if (mods.onRebornSummon) m.onRebornSummon = mods.onRebornSummon;
  if (mods.tag) m.hauntTag = mods.tag; // Call Beyond the Veil: locked while this one lives
  log(state, `👻 ${me.name} Haunts ${getCard(entry.cardId).name}${entry.owner !== ctx.controller ? ` from ${state.players[entry.owner].name}'s Graveyard` : ''}.`);
  ctx.summoned = m.uid;
  enterBattlefield(state, m);
  emit(state, { type: 'minionHaunted', source: m.uid, player: ctx.controller, cardId: entry.cardId });
  if (mods.payCost) loseHealth(state, heroOf(state, ctx.controller).uid, getCard(entry.cardId).cost, { paid: true });
  return m;
}

const STAT_MODS = ['attack', 'health', 'setHealth', 'keywords', 'payCost', 'onRebornSummon', 'tag'];
const modsOf = (e) => Object.fromEntries(STAT_MODS.filter((k) => e[k] != null).map((k) => [k, e[k]]));

// ---- Ultraterrestrials: Displacement ---------------------------------------------
// A Displaced minion leaves the battlefield for Beyond Reality (state.beyond): it can't attack,
// be attacked or targeted, doesn't use a board slot, and its abilities stop. It returns at the
// start of the named player's turn (after `skips` extra such turns), with any return bonus.
// opts: { returnAt, by, skips?, attack?, health?, keywords?, exhausted?, toController?, onReturn?, ctx? }
export function displaceMinion(state, m, opts) {
  if (!m || m.kind !== 'minion') return false;
  const pl = state.players[m.controller];
  const i = pl.board.indexOf(m);
  if (i < 0) return false;
  pl.board.splice(i, 1);
  burstShell(state, m, i); // Harvest Moon: whatever it held bursts out where it stood
  // Temporary effects end when it leaves (this-turn Attack, Health and keywords).
  m.tempAttack = 0; m.tempKeywords = []; m.prey = false;
  if (m.tempHealth > 0) { m.maxHealth -= m.tempHealth; m.health = Math.min(m.health, m.maxHealth); }
  m.tempHealth = 0;
  if (m.tempControl) { m.controller = m.owner; m.tempControl = null; }
  // Riftling: your next Displacement this turn lasts 1 more turn.
  const by = state.players[opts.by];
  let skips = opts.skips ?? 0;
  if (by && by.riftBonusTurn === state.turn) { skips += 1; by.riftBonusTurn = null; }
  state.beyond ??= [];
  state.beyond.push({
    minion: m, controller: opts.toController ?? m.controller, from: m.controller, returnAt: opts.returnAt, skips, by: opts.by,
    attack: opts.attack ?? 0, health: opts.health ?? 0, keywords: [...(opts.keywords ?? [])], exhausted: !!opts.exhausted,
    onReturn: opts.onReturn?.length ? { effects: opts.onReturn, ctx: opts.ctx } : null, turn: state.turn,
  });
  log(state, `🌀 ${nameOf(state, m)} is Displaced Beyond Reality.`);
  emit(state, { type: 'minionDisplaced', source: m.uid, player: m.controller, by: opts.by });
  return true;
}

// ---- Sand Sharks: Burrow and Surface ---------------------------------------------
// A Burrowed minion stays on the board but has Stealth until the start of its controller's next
// turn, when it Surfaces: the Stealth ends and its Surface effects happen (twice while its
// controller has a Dune Matriarch).
export function burrowMinion(state, m) {
  if (!m || m.kind !== 'minion' || m.health <= 0 || m.destroyed || m.burrowed) return false;
  m.burrowed = true;
  log(state, `🏜 ${nameOf(state, m)} Burrows.`);
  emit(state, { type: 'minionBurrowed', source: m.uid, player: m.controller });
  return true;
}

export function surfaceMinion(state, m, opts = {}) {
  if (!m?.burrowed) return false;
  m.burrowed = false;
  m.surfacedTurn = state.turn; // Tremor counts the minions that Surfaced this turn
  if (opts.attack) m.attack += opts.attack;
  log(state, `🏜 ${nameOf(state, m)} Surfaces${opts.attack ? ` (+${opts.attack} Attack)` : ''}!`);
  const card = getCard(m.cardId);
  const twice = state.players[m.controller].board.some((x) => getCard(x.cardId).doubleSurface && x.health > 0 && !x.destroyed);
  const steps = [];
  for (let i = 0; i < (twice ? 2 : 1); i++) steps.push(...selfTriggerSteps(state, card, 'surface', { self: m.uid, controller: m.controller }));
  if (steps.length) pushFront(state, steps);
  emit(state, { type: 'minionSurfaced', source: m.uid, player: m.controller });
  return true;
}

// ---- Void: discarding --------------------------------------------------------------
// A discarded card goes from its owner's hand to their Graveyard. It counts toward "cards
// you've discarded this game" (Abyssal Leviathan, Nihilax) and tells the board (Nebula Gnawer).
// ctx (optional) remembers how many cards this effect discarded and their printed cost.
export function discardFromHand(state, p, uid, ctx) {
  const pl = state.players[p];
  const i = pl.hand.findIndex((c) => c.uid === uid);
  if (i < 0) return null;
  const [inst] = pl.hand.splice(i, 1);
  pl.graveyard.push(inst);
  pl.discarded = (pl.discarded ?? 0) + 1;
  const card = getCard(inst.cardId);
  log(state, `🌑 ${pl.name} discards ${card.name}.`);
  emit(state, { type: 'cardDiscarded', player: p, cardId: inst.cardId, cost: card.cost });
  if (ctx) { ctx.discarded = (ctx.discarded ?? 0) + 1; ctx.discardedCost = (ctx.discardedCost ?? 0) + card.cost; }
  return inst;
}

// Void (Singularity): Pull — take a card out of the enemy deck into your hand. If your hand
// was empty (Collapse), a minion gets a random bonus keyword and any other card costs (1) less.
// Wormhole Stalker's discount applies to every card you Pull while it lives.
export function pullFromEnemyDeck(state, p, uid, collapse) {
  const foe = state.players[opponentOf(p)];
  const i = foe.deck.findIndex((c) => c.uid === uid);
  if (i < 0) return null;
  const [taken] = foe.deck.splice(i, 1);
  const card = getCard(taken.cardId);
  const pl = state.players[p];
  const off = pl.board.filter((m) => !m.textLost && m.health > 0 && !m.destroyed).reduce((t, m) => t + (getCard(m.cardId).pullDiscount ?? 0), 0);
  const extra = { pulled: true };
  if (taken.mushrooms) extra.mushrooms = taken.mushrooms; // Fungus Mushrooms ride along
  if (collapse && card.type === 'minion') extra.bonusKeywords = randomKeywords(state, POSITIVE_KEYWORDS, card.keywords ?? [], 1);
  const costOff = off + (collapse && card.type !== 'minion' ? 1 : 0);
  if (costOff) extra.costMod = -costOff;
  const inst = addToHand(state, p, taken.cardId, extra);
  pl.pulled = (pl.pulled ?? 0) + 1;
  log(state, `🕳️ ${pl.name} Pulls ${card.name} from ${foe.name}'s deck${collapse ? ` (Collapse: ${extra.bonusKeywords?.length ? `+${extra.bonusKeywords[0]}` : 'costs (1) less'})` : ''}.`);
  emit(state, { type: 'cardPulled', player: p, cardId: taken.cardId, collapse: !!collapse });
  return inst;
}

// ---- Lycanthropes: Transform -------------------------------------------------------
// A Lycanthrope is two cards: its Humanoid Form (the card you play) and its Beast Form (a
// hidden twin, `beastForm` / `humanForm` link them). Transforming swaps which card the minion
// is, so its art, abilities and auras change with it. Changes made to it carry over: the
// difference between the two printed stat lines is applied on top, damage stays (but never
// kills: at least 1 Health is left), and so do buffs and granted keywords.
export const formOf = (m) => getCard(m.cardId)?.form ?? null;
export function canShift(m) {
  const card = m && m.kind === 'minion' ? getCard(m.cardId) : null;
  return !!(card && (card.beastForm || card.humanForm) && m.health > 0 && !m.destroyed);
}

export function shiftMinion(state, m, to = null) {
  if (!canShift(m)) return false;
  const old = getCard(m.cardId);
  const intoId = old.beastForm ?? old.humanForm;
  const nw = getCard(intoId);
  if (to && nw.form !== to) return false;
  // Safety net: no chain of effects can flip one minion back and forth forever.
  m.shifts ??= { turn: state.turn, n: 0 };
  if (m.shifts.turn !== state.turn) m.shifts = { turn: state.turn, n: 0 };
  if (++m.shifts.n > 6) return false;
  const damage = Math.max(0, m.maxHealth - m.health);
  // A stolen hide lasts only while the skinwalker wears Beast Form.
  if (nw.form === 'human' && m.borrowedHideBonus) {
    const hide = m.borrowedHideBonus;
    m.attack = Math.max(0, m.attack - hide.attack);
    m.maxHealth = Math.max(1, m.maxHealth - hide.health);
    for (const k of hide.keywords) m.keywords = m.keywords.filter((x) => x !== k);
    delete m.borrowedHideBonus;
    delete m.borrowedHide;
  }
  if (nw.form === 'human') delete m.takeHideUntilTurn;
  m.attack = Math.max(0, m.attack + (nw.attack ?? 0) - (old.attack ?? 0));
  m.maxHealth = Math.max(1, m.maxHealth + (nw.health ?? 0) - (old.health ?? 0));
  m.health = Math.max(1, Math.min(m.maxHealth, m.maxHealth - damage));
  const oldKw = old.keywords ?? [];
  const newKw = nw.keywords ?? [];
  m.keywords = m.keywords.filter((k) => !oldKw.includes(k) || newKw.includes(k));
  if (!m.keywords.includes('Silenced')) for (const k of newKw) if (!m.keywords.includes(k)) m.keywords.push(k);
  const oldSt = old.statics ?? [];
  m.statics = [...(m.statics ?? []).filter((x) => !oldSt.includes(x)), ...(nw.statics ?? [])];
  m.cardId = intoId;
  log(state, `🌕 ${old.name} transforms into its ${nw.form === 'beast' ? 'Beast' : 'Humanoid'} Form!`);
  emit(state, { type: 'minionTransformed', source: m.uid, player: m.controller, form: nw.form });
  return true;
}

// ---- Aliens (Hive Brood): Implant, Chestbursters and Evolving ----------------------
// An Implanted enemy minion carries a parasite (a granted Exit for the Implanter). When it dies,
// a 1/1 Chestburster bursts out on the Implanter's side, remembering its host's faction. At the
// start of its controller's turns it grows; after EVOLVE_TURNS of them (1 with a Brood Tender) it
// Evolves into the Xeno of that faction. With Hive Queen Xa'ral it bursts out already Evolved.
export const EVOLVE_TURNS = 2;
export const XENO_FORMS = {
  Vampires: 'xeno_nosferatu', Aliens: 'xeno_warrior', Dinosaurs: 'xeno_raptor', Plants: 'xeno_thornback',
  Fungus: 'spore_xeno', Zombies: 'xeno_revenant', Sharks: 'deep_xeno', Dragons: 'xeno_drake', Demons: 'xeno_fiend',
  Divine: 'xeno_seraph', Robots: 'xeno_mech', Radioactive: 'glowing_xeno', Bees: 'xeno_hornet', Ghosts: 'phantom_xeno',
  Ultraterrestrials: 'void_xeno', Acidic: 'acid_xeno', Lycanthropes: 'xeno_lycan', Void: 'umbral_xeno', 'Ice Age': 'woolly_xeno', Eels: 'xeno_voltwyrm', Witches: 'xeno_hexmorph',
};
const controls = (state, p, flag) => state.players[p].board.some((x) => getCard(x.cardId)[flag] && x.health > 0 && !x.destroyed);
export const evolveTurnsFor = (state, p) => Math.max(1, EVOLVE_TURNS - (controls(state, p, 'fasterEvolve') ? 1 : 0));

export function evolveChestburster(state, m) {
  if (!m || m.cardId !== 'chestburster') return false;
  const into = XENO_FORMS[m.hostFaction] ?? 'xeno_drone';
  const sick = m.sick;
  EFFECT_OPS.transform(state, { target: { uid: m.uid }, into }, { controller: m.controller, self: m.uid });
  m.sick = sick;
  delete m.evolveProgress;
  log(state, `👽 It Evolves: ${getCard(into).name}!`);
  queueSelfTrigger(state, m, 'summon');
  emit(state, { type: 'minionEvolved', source: m.uid, player: m.controller });
  return true;
}

// Start of player p's turn: their Chestbursters grow one turn; ready ones Evolve.
export function tickChestbursters(state, p) {
  const need = evolveTurnsFor(state, p);
  for (const m of [...state.players[p].board]) {
    if (m.cardId !== 'chestburster' || m.health <= 0 || m.destroyed) continue;
    m.evolveProgress = (m.evolveProgress ?? 0) + 1;
    if (m.evolveProgress >= need) evolveChestburster(state, m);
  }
}

// ---- Ice Age (Frozen in Time): Thawing ------------------------------------------------
// A Thawing (N) minion arrives sealed in ice (m.encased = N): it can't attack, can't be attacked,
// takes no damage and has no Taunt. At the start of each of its controller's turns the count
// drops by 1; at 0 it breaks free ("When it breaks free" triggers on: 'thaw', and the
// minionThawed event). Silence breaks it free at once (without its trigger).
export function breakFree(state, m) {
  if (!m || !(m.encased > 0)) return false;
  delete m.encased;
  log(state, `🧊 ${nameOf(state, m)} breaks free of the ice!`);
  queueSelfTrigger(state, m, 'thaw');
  emit(state, { type: 'minionThawed', source: m.uid, player: m.controller });
  return true;
}
// Brings the count down by n (Meltwater, Una); 0 breaks it free.
export function thawBy(state, m, n) {
  if (!m || !(m.encased > 0) || m.health <= 0 || m.destroyed) return;
  m.encased = Math.max(0, m.encased - n);
  if (m.encased === 0) { m.encased = 1; breakFree(state, m); }
}
export function tickThawing(state, p) {
  for (const m of [...state.players[p].board]) if (m.encased > 0) thawBy(state, m, 1);
}

// Brings a Displaced minion back (now, or as soon as its controller has room).
export function returnFromBeyond(state, entry) {
  const pl = state.players[entry.controller];
  if (pl.board.length >= state.rules.maxBoardSize) {
    if (!entry.waiting) log(state, `${nameOf(state, entry.minion)} has no room to return and waits Beyond Reality.`);
    entry.waiting = true;
    return false;
  }
  state.beyond.splice(state.beyond.indexOf(entry), 1);
  const m = entry.minion;
  m.controller = entry.controller;
  if (entry.attack) m.attack = Math.max(0, m.attack + entry.attack);
  if (entry.health) { m.maxHealth += entry.health; m.health += entry.health; }
  for (const k of entry.keywords) addKeyword(m, k, false, state);
  if (entry.exhausted) m.exhausted = true;   // can't attack during its next turn
  if (entry.controller !== entry.from) { m.sick = true; m.attacksThisTurn = 0; }
  m.justReturned = true;
  pl.board.push(m);
  const bonus = [entry.attack || entry.health ? `+${entry.attack}/+${entry.health}` : '', ...entry.keywords].filter(Boolean).join(', ');
  log(state, `🌀 ${nameOf(state, m)} returns from Beyond Reality${bonus ? ` (${bonus})` : ''}.`);
  if (entry.onReturn) pushFront(state, [...entry.onReturn.effects.map((effect) => ({ kind: 'effect', effect, ctx: { ...entry.onReturn.ctx, returned: m.uid } })), { kind: 'deaths' }]);
  emit(state, { type: 'minionReturned', source: m.uid, player: m.controller });
  // Machine Elf Choir: Breakthrough effects happen twice (an echo only Breakthrough triggers listen to).
  if (state.players[m.controller].board.some((x) => getCard(x.cardId).doubleBreakthrough && x.health > 0 && !x.destroyed)) {
    emit(state, { type: 'minionReturned', source: m.uid, player: m.controller, echo: true });
  }
  return true;
}

// Start of player p's turn: everything due back at p's turn returns (or counts down).
export function processBeyond(state, p) {
  for (const entry of [...(state.beyond ?? [])]) {
    if (entry.waiting) { returnFromBeyond(state, entry); continue; }
    if (entry.returnAt !== p) continue;
    if (entry.skips > 0) { entry.skips -= 1; continue; }
    returnFromBeyond(state, entry);
  }
}

// ---- Plants (Harvest Moon): Shell ---------------------------------------------------
// A Pumpkin with Shell holds friendly Plants inside it (m.shell). A held Plant is off the board:
// it can't attack, be attacked or targeted, doesn't use a board slot, and its abilities stop.
// It grows at the start of its controller's turn and bursts back out where the Pumpkin stood
// when the Pumpkin dies or leaves the board. card.shell: { size = 1, growth = 1 }.
export const shellOf = (m) => (m?.kind === 'minion' && !m.textLost ? getCard(m.cardId).shell ?? null : null);
export const shellHeld = (m) => m?.shell ?? [];
export const shellRoom = (m) => { const sh = shellOf(m); return sh ? (sh.size ?? 1) - shellHeld(m).length : 0; };

function clearTemps(m) {
  m.tempAttack = 0; m.tempKeywords = []; m.prey = false;
  if (m.tempHealth > 0) { m.maxHealth -= m.tempHealth; m.health = Math.min(m.health, m.maxHealth); }
  m.tempHealth = 0;
}

// Moves friendly minion m into the pumpkin's Shell. Returns true if it went in.
export function tuckIntoShell(state, pumpkin, m) {
  if (!pumpkin || !m || m.kind !== 'minion' || m === pumpkin || shellRoom(pumpkin) <= 0) return false;
  if (m.controller !== pumpkin.controller || m.health <= 0 || m.destroyed) return false;
  const board = state.players[m.controller].board;
  const i = board.indexOf(m);
  if (i < 0 || !board.includes(pumpkin)) return false;
  board.splice(i, 1);
  clearTemps(m);
  // Its own held Plants (a Pumpkin inside a Pumpkin) burst out first, where it stood.
  burstShell(state, m, i);
  (pumpkin.shell ??= []).push(m);
  log(state, `🎃 ${nameOf(state, m)} hides inside ${nameOf(state, pumpkin)}.`);
  emit(state, { type: 'shellTucked', source: m.uid, target: pumpkin.uid, player: m.controller });
  return true;
}

// Creates a new minion straight inside the pumpkin's Shell (Pumpkin Patch, Hallowroot).
export function spawnIntoShell(state, pumpkin, cardId) {
  if (!pumpkin || shellRoom(pumpkin) <= 0) return null;
  const m = createMinion(state, cardId, pumpkin.controller);
  (pumpkin.shell ??= []).push(m);
  log(state, `🎃 A ${getCard(cardId).name} grows inside ${nameOf(state, pumpkin)}.`);
  emit(state, { type: 'shellTucked', source: m.uid, target: pumpkin.uid, player: m.controller });
  return m;
}

// Everything inside bursts out at board position `at` (where the Pumpkin was), left to right.
// A Plant with no room on its side's board is crushed (it goes to the Graveyard, no Exit).
export function burstShell(state, pumpkin, at = null, opts = {}) {
  const held = shellHeld(pumpkin);
  if (!held.length) return [];
  pumpkin.shell = [];
  const out = [];
  let pos = at;
  for (const m of held) {
    const pl = state.players[m.controller];
    if (pl.board.length >= state.rules.maxBoardSize) {
      log(state, `${nameOf(state, m)} has no room to burst out and is crushed.`);
      state.players[m.owner].graveyard.push({ uid: m.uid, cardId: m.cardId, owner: m.owner, died: true });
      continue;
    }
    const sameSide = pumpkin.controller === m.controller;
    const p = sameSide && pos != null ? Math.min(pos, pl.board.length) : pl.board.length;
    pl.board.splice(p, 0, m);
    if (sameSide && pos != null) pos = p + 1;
    if (opts.attack) m.attack += opts.attack;
    if (opts.health) { m.maxHealth += opts.health; m.health += opts.health; }
    out.push(m);
    log(state, `🎃 ${nameOf(state, m)} bursts out of ${nameOf(state, pumpkin)}${opts.attack || opts.health ? ` (+${opts.attack ?? 0}/+${opts.health ?? 0})` : ''}!`);
    traceFx(state, { type: 'shellBurst', source: pumpkin.uid, target: m.uid });
    emit(state, { type: 'shellBurst', source: m.uid, from: pumpkin.uid, player: m.controller });
  }
  return out;
}

// Start of player p's turn: Plants inside p's Pumpkins grow and are ready to fight when they come out.
export function growShells(state, p) {
  for (const pumpkin of state.players[p].board) {
    const sh = shellOf(pumpkin);
    for (const m of shellHeld(pumpkin)) {
      const g = sh?.growth ?? 1;
      if (g) { m.attack += g; m.maxHealth += g; m.health += g; }
      m.sick = false; m.attacksThisTurn = 0;
      if (g) log(state, `🌱 ${nameOf(state, m)} grows inside ${nameOf(state, pumpkin)} (+${g}/+${g}).`);
    }
  }
}

const cardMatches = (card, f = {}) =>
  (!f.type || card.type === f.type) &&
  (!f.upgrade || !!card.upgrade) &&
  (f.maxCost == null || card.cost <= f.maxCost) &&
  (!f.tribe || hasTribe(card.tribes, f.tribe)) &&
  (!f.tribes || f.tribes.some((t) => hasTribe(card.tribes, t))) &&
  (!f.faction || card.faction === f.faction) &&
  (!f.cardId || card.id === f.cardId) &&
  (!f.thawing || !!card.thawing) &&
  (!f.wand || !!card.wand); // Witches: a Wand card (Forbidden Grimoire)

// ---- Conditions -----------------------------------------------------------
// { controls: { tribe?, cardId?, excludeSelf? } }  — you control a matching minion
// { subject: selector, attackAtMost?, healthAtMost?, dead?, alive?, tribe?, attackLessThanSelf? }
export function checkCondition(state, cond, ctx) {
  if (!cond) return true;
  // { all: [conditions] } — every one must hold.
  if (cond.all) return cond.all.every((c) => checkCondition(state, c, ctx));
  // Robots (Arsenal): { armorAtLeast: N } — your Hero has N+ Armor; { heroHasWeapon } — your Hero holds a Weapon.
  if (cond.armorAtLeast != null) return (heroOf(state, ctx.controller).armor ?? 0) >= cond.armorAtLeast;
  // { eventTargetGone } — the attacked character is dead or already off the board (Power Fist).
  if (cond.eventTargetGone != null) { const t = findCharacter(state, ctx.event?.target); return (!t || t.health <= 0 || !!t.destroyed) === cond.eventTargetGone; }
  if (cond.heroHasWeapon != null) return !!heroOf(state, ctx.controller).weapon === cond.heroHasWeapon;
  // Witches: { heroHasWand } — your Hero holds a Wand (Wandcraft, Black Cat Familiar).
  if (cond.heroHasWand != null) return !!heroOf(state, ctx.controller).weapon?.wand === cond.heroHasWand;
  // { eventDeadFaction } — the minion that just died was from this faction (Graceful Return).
  if (cond.eventDeadFaction) return !!ctx.event?.dead?.cardId && getCard(ctx.event.dead.cardId).faction === cond.eventDeadFaction;
  // Ice Age: { enemyFrozen } — an enemy minion is Frozen (Dire Wolf).
  if (cond.enemyFrozen != null) return state.players[opponentOf(ctx.controller)].board.some((m) => hasKeyword(m, 'Frozen') && m.health > 0 && !m.destroyed) === cond.enemyFrozen;
  // Void: { handEmpty } — your hand is empty (Hollow); { handAtLeast: N } — you hold N+ cards.
  if (cond.handEmpty != null) return (state.players[ctx.controller].hand.length === 0) === cond.handEmpty;
  if (cond.handAtLeast != null) return state.players[ctx.controller].hand.length >= cond.handAtLeast;
  // { enemyHandEmpty: true } — Ashen Curse.
  if (cond.enemyHandEmpty != null) return (state.players[opponentOf(ctx.controller)].hand.length === 0) === cond.enemyHandEmpty;
  // Harvest Moon: { selfHolding } — this Pumpkin has something inside it.
  if (cond.selfHolding != null) return (shellHeld(findCharacter(state, ctx.self)).length > 0) === cond.selfHolding;
  if (cond.controls) {
    const f = cond.controls;
    // min: how many such minions (Omega Assembly); minUpgrades / hasWeapon: Robots.
    const n = state.players[ctx.controller].board.filter((m) =>
      (!f.tribe || hasTribe(m.tribes, f.tribe)) && (!f.cardId || m.cardId === f.cardId) &&
      (!f.excludeSelf || m.uid !== ctx.self) && (f.minHealth == null || m.health >= f.minHealth) &&
      (f.minUpgrades == null || (m.upgrades ?? 0) >= f.minUpgrades) && (!f.hasWeapon || !!m.weapon) &&
      (f.minVolts == null || (m.volts ?? 0) >= f.minVolts)).length;
    return n >= (f.min ?? 1);
  }
  // { eventDeadUpgrades: N } — the minion that just died had at least N Upgrades (Final Assembly).
  if (cond.eventDeadUpgrades != null) return (ctx.event?.dead?.upgrades ?? 0) >= cond.eventDeadUpgrades;
  // { enemyIrradiated: true } — the opponent controls a character with Radiation (Fallout Scavenger).
  if (cond.enemyIrradiated != null) {
    const opp = state.players[opponentOf(ctx.controller)];
    return [opp.hero, ...opp.board].some((c) => radiationOf(c) > 0) === cond.enemyIrradiated;
  }
  // Ghosts: a minion died this turn / during the previous turn (Grave Lantern, Tomb Without a Door).
  if (cond.deathsThisTurn != null) return ((state.deathsThisTurn ?? 0) > 0) === cond.deathsThisTurn;
  if (cond.deathsLastTurn != null) return ((state.deathsLastTurn ?? 0) > 0) === cond.deathsLastTurn;
  // { extinctionWithin: N } — your next Extinction is N or fewer of your turns away (Fossils Beyond the Veil).
  if (cond.extinctionWithin != null) {
    const ext = state.players[ctx.controller].extinction;
    return !!ext && ext.nextAt - ext.turns <= cond.extinctionWithin;
  }
  // { deadInGraveyard: { from?, maxCost?, tribe? } } — a minion that can be Haunted has died (Ghosts).
  if (cond.deadInGraveyard) return deadEntries(state, ctx, cond.deadInGraveyard.from, cond.deadInGraveyard).length > 0;
  // { noHauntAlive: tag } — none of your minions Haunted by that card is still in play.
  if (cond.noHauntAlive) return !state.players[ctx.controller].board.some((m) => m.hauntTag === cond.noHauntAlive);
  // Sharks: { enemyPrey: true } — an enemy minion is Marked Prey.
  if (cond.enemyPrey != null) return state.players[opponentOf(ctx.controller)].board.some((m) => m.prey) === cond.enemyPrey;
  // { ctxFlag } — an earlier effect of this card set the flag (a minion was cleansed).
  if (cond.ctxFlag) return !!ctx[cond.ctxFlag];
  // Bees: { queenUnderground: true } — your Queen is hiding in your Hidden Nest (Hornet expansion).
  if (cond.queenUnderground != null) return !!state.players[ctx.controller].queenUnderground === cond.queenUnderground;
  // { myTurn: true } — it is the card controller's turn (Blood Alchemist).
  if (cond.myTurn != null) return (state.activePlayer === ctx.controller) === cond.myTurn;
  // { heroLostHealthThisTurn: true } — your Hero lost Health this turn (Crimson Oracle).
  if (cond.heroLostHealthThisTurn != null) return (state.players[ctx.controller].lostHealthTurn === state.turn) === cond.heroLostHealthThisTurn;
  // { eventTargetSurvives: true } — the damage in this wouldTakeDamage window won't kill its target (Last Line of the Colony).
  if (cond.eventTargetSurvives != null) {
    const t = findCharacter(state, ctx.event?.target);
    return (!!t && t.health > (ctx.event?.amount ?? 0)) === cond.eventTargetSurvives;
  }
  if (cond.subject) {
    const c = findCharacter(state, resolveSelector(state, cond.subject, ctx)[0]);
    if (!c) return false;
    const dead = c.health <= 0 || c.destroyed;
    if (cond.dead && !dead) return false;
    if (cond.alive && dead) return false;
    if (cond.tribe && !hasTribe(c.tribes, cond.tribe)) return false;
    if (cond.darkOrUndead && !isDarkOrUndead(c)) return false;
    if (cond.notTribe && hasTribe(c.tribes, cond.notTribe)) return false;
    if (cond.cardId && c.cardId !== cond.cardId) return false;
    if (cond.attackAtLeast != null && effectiveAttack(c) < cond.attackAtLeast) return false;
    if (cond.attackAtMost != null && effectiveAttack(c) > cond.attackAtMost) return false;
    if (cond.healthAtMost != null && c.health > cond.healthAtMost) return false;
    if (cond.infected != null && (c.infected != null) !== cond.infected) return false;
    if (cond.keyword && !hasKeyword(c, cond.keyword)) return false;
    if (cond.notKeyword && hasKeyword(c, cond.notKeyword)) return false;
    if (cond.prey != null && !!c.prey !== cond.prey) return false;
    if (cond.corroded != null && ((c.corrosion ?? 0) > 0) !== cond.corroded) return false; // Acidic
    if (cond.kind && c.kind !== cond.kind) return false;
    if (cond.burning != null && isBurning(c) !== cond.burning) return false;
    if (cond.darkOrUndead != null && isDarkOrUndead(c) !== cond.darkOrUndead) return false;
    if (cond.irradiated != null && (radiationOf(c) > 0) !== cond.irradiated) return false;
    if (cond.side === 'friendly' && (c.controller ?? c.owner) !== ctx.controller) return false;
    if (cond.side === 'enemy' && (c.controller ?? c.owner) === ctx.controller) return false;
    if (cond.hasUpgrade != null && (c.upgrades > 0) !== cond.hasUpgrade) return false;
    if (cond.minUpgrades != null && (c.upgrades ?? 0) < cond.minUpgrades) return false;
    if (cond.hasWeapon != null && !!c.weapon !== cond.hasWeapon) return false;
    // Divine Intervention: only a minion without Reborn that hasn't already come back through it.
    if (cond.canGainReborn && (hasKeyword(c, 'Reborn') || c.rebornUsed)) return false;
    if (cond.attackLessThanSelf) {
      const self = findCharacter(state, ctx.self);
      if (!self || effectiveAttack(c) >= effectiveAttack(self)) return false;
    }
    return true;
  }
  throw new Error(`Unknown condition: ${JSON.stringify(cond)}`);
}

// Silenced removes every other keyword the character has.
// Frozen lasts until the minion has missed its controller's next turn: frozen
// during its controller's own turn, it thaws at the end of their following turn.
// lingerUntil = a player index: the keyword lasts until that player's next turn.
// With `state`, gaining a new keyword raises keywordGained (Probe Drone).
export function addKeyword(c, k, temporary = false, state = null, lingerUntil = null) {
  // Ice Age: Thick Fur can't be Frozen.
  if (k === 'Frozen' && hasKeyword(c, 'Thick Fur')) return;
  // Checked first: Silence clears the keyword list, so a second Silence must not count as new.
  const isNew = !hasKeyword(c, k);
  if (k === 'Silenced') {
    if (c.encased > 0) delete c.encased; // Frozen in Time: silence breaks the ice (no Breaks free)
    if (c.volts) c.volts = 0; // Eels: Silence drains its Volts
    for (const old of allKeywords(c)) state ? loseKeyword(state, c, old) : null;
    c.keywords = []; c.tempKeywords = []; c.lingerKeywords = [];
  }
  if (lingerUntil != null) {
    c.lingerKeywords ??= [];
    c.lingerKeywords.push({ k, until: lingerUntil });
  } else {
    if (k === 'Frozen' && state && !temporary) c.thawAfter = state.activePlayer === c.controller ? 2 : 1;
    const list = temporary ? c.tempKeywords : c.keywords;
    if (!list.includes(k)) list.push(k);
  }
  if (isNew && state) emit(state, { type: 'keywordGained', target: c.uid, player: c.controller, keyword: k,
    ...(k === 'Silenced' && state.players[1 - c.controller]?.factions?.includes('Witches') ? { hex: true } : {}) });
}

function randomKeywords(state, pool, have, n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const k = pickRandom(state, pool.filter((x) => !have.includes(x) && !out.includes(x)));
    if (k) out.push(k);
  }
  return out;
}

// Gene Splicing: enemy minion + your minion → one Hybrid card.
function makeHybrid(state, enemyId, mineId) {
  const a = getCard(enemyId);
  const b = getCard(mineId);
  const keywords = [...new Set([...(a.keywords ?? []), ...(b.keywords ?? [])])];
  return {
    id: `hybrid_${state.nextUid++}`, custom: true, hybrid: true,
    name: `${a.name.split(' ').at(-1)}-${b.name.split(' ').at(-1)} Hybrid`,
    faction: b.faction, type: 'minion',
    tribes: [...new Set([...(a.tribes ?? []), ...(b.tribes ?? [])])],
    cost: Math.min(10, a.cost + b.cost),
    attack: (a.attack ?? 0) + (b.attack ?? 0),
    health: (a.health ?? 0) + (b.health ?? 0),
    keywords,
    triggers: [...(a.triggers ?? []), ...(b.triggers ?? [])],
    target: b.target ?? a.target,
    aura: a.aura ?? b.aura, costAura: a.costAura ?? b.costAura,
    text: [a.text, b.text].filter(Boolean).join(' '),
    art: a.art, artFrom: a.artFrom ?? a.id,
  };
}

export function applyBuff(state, c, e) {
  const parts = [];
  // Radioactive passive: their minions ignore Attack / Health reductions their enemies cause.
  if (e.byController != null && c.kind === 'minion' && c.controller !== e.byController && getCard(c.cardId).faction === 'Radioactive'
    && ((e.attack ?? 0) < 0 || (e.health ?? 0) < 0)) {
    e = { ...e, attack: Math.max(0, e.attack ?? 0), health: Math.max(0, e.health ?? 0) };
    log(state, `${nameOf(state, c)} shrugs off the reduction.`);
  }
  if (e.attack) {
    if (e.temporary) c.tempAttack += e.attack;
    else if (e.lingerUntil != null) c.lingerAttack.push({ amount: e.attack, until: e.lingerUntil });
    else c.attack = Math.max(0, c.attack + e.attack);
    parts.push(`${e.attack > 0 ? '+' : ''}${e.attack} Attack`);
    if (e.attack > 0) emit(state, { type: 'attackGained', target: c.uid, player: c.controller, amount: e.attack });
  }
  if (e.health) {
    c.maxHealth += e.health;
    c.health += e.health;
    // Temporary Health until the caster's next turn (Sanctuary); otherwise this turn.
    if (e.temporaryHealth && e.lingerUntil != null) (c.lingerHealth ??= []).push({ amount: e.health, until: e.lingerUntil });
    else if (e.temporaryHealth) c.tempHealth += e.health;
    // Permanent Health raises are Bonus Health (Reliquary Keeper). silentBonus: its own growth doesn't count.
    if (e.health > 0 && !e.temporaryHealth && !e.silentBonus) emit(state, { type: 'bonusHealth', target: c.uid, player: c.controller ?? c.owner, amount: e.health });
    parts.push(`${e.health > 0 ? '+' : ''}${e.health} Health`);
    if (e.health > 0) emit(state, { type: 'healthGained', target: c.uid, player: c.controller, amount: e.health });
  }
  if (c.kind === 'minion' && ((e.attack ?? 0) < 0 || (e.health ?? 0) < 0)) {
    emit(state, { type: 'minionLostStats', target: c.uid, player: c.controller, source: null });
  }
  if (e.health) checkPrey(state, c, e.health > 0);
  for (const k of e.keywords ?? []) addKeyword(c, k, false, state);
  for (const k of e.temporaryKeywords ?? []) addKeyword(c, k, true, state);
  for (const k of e.lingerKeywords ?? []) addKeyword(c, k, false, state, e.lingerUntil);
  const kws = [...(e.keywords ?? []), ...(e.temporaryKeywords ?? []), ...(e.lingerKeywords ?? [])];
  if (kws.length) parts.push(kws.join(', '));
  const temp = e.temporary || e.temporaryHealth || e.temporaryKeywords;
  if (parts.length) log(state, `${nameOf(state, c)} gets ${parts.join(' / ')}${temp ? ' this turn' : e.lingerUntil != null ? ' until its caster\'s next turn' : ''}.`);
}

// ---- Eels: Chain and Discharge ------------------------------------------------------
// Chain X: X damage to the first enemy, then it jumps to the nearest enemy minion it hasn't hit
// (by board position; the right-hand one on a tie), 1 weaker per jump. A jump off a Conductive
// minion loses nothing; Storm Coil Eel makes the first jump free and The Thunderhead every jump.
// Power left after every enemy minion was hit goes into the enemy Hero, and the Chain ends.
// It skips Stealth, Burrowed, Thawing and dying minions when it jumps.
// opts: { start: uid (the first target), jumpFrom: uid (start beside it at full power, without hitting it),
//   lifesteal, burn, corrode, radiate, preyLast, healPerHit, freeze }
// Returns the number of targets hit.
function chainCanHit(m) {
  return m.health > 0 && !m.destroyed && !hasKeyword(m, 'Stealth') && !m.burrowed && !(m.encased > 0);
}
function nearestUnhit(board, fromIdx, hit) {
  let best = null;
  board.forEach((m, i) => {
    if (hit.has(m.uid) || !chainCanHit(m)) return;
    const d = Math.abs(i - fromIdx);
    if (!best || d < best.d || (d === best.d && i > best.i)) best = { m, i, d };
  });
  return best?.m ?? null;
}
export function chainLightning(state, ctx, power, opts = {}) {
  const foe = opponentOf(ctx.controller);
  const board = state.players[foe].board;
  const mine = state.players[ctx.controller].board.filter((m) => m.health > 0 && !m.destroyed && !m.textLost);
  // lossless: this Chain never weakens (Ohmra's unleash); The Thunderhead makes every Chain so.
  const lossless = !!opts.lossless || mine.some((m) => getCard(m.cardId).chainLossless);
  let freeJumps = mine.some((m) => getCard(m.cardId).chainFirstJumpFree) ? 1 : 0;
  const hit = new Set();
  const hits = [];
  let cur = opts.start != null ? findCharacter(state, opts.start) : null;
  let fromIdx = null;
  if (opts.jumpFrom != null) {
    const from = findCharacter(state, opts.jumpFrom);
    fromIdx = from ? board.indexOf(from) : -1;
    if (from) hit.add(from.uid);
    cur = fromIdx >= 0 ? nearestUnhit(board, fromIdx, hit) : pickRandom(state, board.filter(chainCanHit));
  }
  if (!cur) cur = pickRandom(state, board.filter(chainCanHit)) ?? heroOf(state, foe);
  if (power <= 0) return 0;
  log(state, `⚡ Chain ${power}!`);
  while (cur && power > 0) {
    hit.add(cur.uid);
    const blocked = spellWarded(state, cur, ctx);
    const dealt = blocked ? 0 : dealDamage(state, ctx.self, cur.uid, power, { sourceController: ctx.controller, lifesteal: opts.lifesteal });
    hits.push({ uid: cur.uid, amount: power, dealt });
    if (!blocked && cur.kind === 'minion') {
      if (opts.burn) applyBurn(state, cur, opts.burn);
      if (opts.corrode) corrode(state, cur, opts.corrode, ctx.controller);
      if (opts.radiate) applyRadiation(state, cur, opts.radiate, { turns: 2, by: ctx.controller });
      if (opts.freeze && cur.health > 0) addKeyword(cur, 'Frozen', false, state);
    }
    // Ampere Moray: a Chain hitting a Conductive minion charges it up.
    if (cur.kind === 'minion' && isConductive(cur)) {
      for (const m of mine) if (getCard(m.cardId).voltsOnConductiveHit) gainVolts(state, m, getCard(m.cardId).voltsOnConductiveHit);
    }
    if (cur.kind === 'hero') break;
    const idx = board.indexOf(cur);
    const keep = isConductive(cur) || lossless || (freeJumps > 0 && (freeJumps--, true));
    if (!keep) power -= 1;
    if (power <= 0) break;
    cur = nearestUnhit(board, idx, hit) ?? (hit.has(heroOf(state, foe).uid) ? null : heroOf(state, foe));
  }
  if (opts.preyLast) { const last = [...hits].reverse().find((h) => findCharacter(state, h.uid)?.kind === 'minion'); if (last) markPrey(state, findCharacter(state, last.uid), true); }
  if (opts.healPerHit && hits.length) heal(state, heroOf(state, ctx.controller).uid, opts.healPerHit * hits.length, { source: ctx.self });
  const srcMinion = opts.from ?? (findCharacter(state, ctx.self)?.kind === 'minion' ? ctx.self : null);
  traceFx(state, { type: 'chain', source: srcMinion, caster: heroOf(state, ctx.controller).uid, player: ctx.controller, cardId: ctx.cardId, hits: hits.map(({ uid, amount }) => ({ uid, amount })) });
  emit(state, { type: 'chainResolved', player: ctx.controller, hits: hits.length });
  return hits.length;
}
// A minion spends all its Volts on a Chain. start: the first target (else a random enemy).
export function dischargeMinion(state, m, opts = {}) {
  const n = m?.volts ?? 0;
  if (!m || n <= 0) return 0;
  m.volts = 0;
  log(state, `⚡ ${nameOf(state, m)} Discharges (${n})!`);
  emit(state, { type: 'discharged', source: m.uid, player: m.controller, amount: n });
  return chainLightning(state, { self: m.uid, controller: m.controller, cardId: m.cardId }, n, { start: opts.start, from: m.uid });
}
const CHAIN_OPTS = ['lifesteal', 'burn', 'corrode', 'radiate', 'preyLast', 'healPerHit', 'freeze', 'lossless'];

function syncDualWield(hero) {
  const keywords = (hero.auraKeywords ?? []).filter((k) => k !== 'Twin Strike');
  if (hero.dualWield && hero.weapon && hero.weapon2 && hero.weapon.cardId !== hero.weapon2.cardId) keywords.push('Twin Strike');
  hero.auraKeywords = keywords;
}

export const EFFECT_OPS = {
  // { target, from } — a Beast Form steals the dead minion's hide.
  takeHide(state, e, ctx) {
    const victim = findCharacter(state, resolveSelector(state, e.from, ctx)[0]);
    each(state, e.target, ctx, (wearer) => takeHide(state, wearer, victim));
  },
  // Mark a minion to take a hide on its next combat kill this turn.
  grantHideOnKill(state, e, ctx) {
    each(state, e.target, ctx, (m) => { m.takeHideUntilTurn = state.turn; });
  },
  // ---- Eels ----
  // { target, amount, overcap? } — the minions gain Volts.
  gainVolts(state, e, ctx) {
    each(state, e.target, ctx, (m) => gainVolts(state, m, e.amount ?? 1, { overcap: e.overcap }));
  },
  // { target } — Overcharge: double its Volts (past the limit).
  doubleVolts(state, e, ctx) {
    each(state, e.target, ctx, (m) => gainVolts(state, m, m.volts ?? 0, { overcap: true }));
  },
  // { target } — Conductive until the end of the turn.
  conductive(state, e, ctx) {
    each(state, e.target, ctx, (m) => {
      if (m.kind !== 'minion' || m.health <= 0 || m.destroyed || m.conductive) return;
      m.conductive = true;
      log(state, `💧 ${nameOf(state, m)} is Conductive.`);
      emit(state, { type: 'conductive', target: m.uid, player: m.controller });
    });
  },
  // { amount, start?: selector (the first target, else random), jumpFrom?: selector, ...CHAIN_OPTS }
  chain(state, e, ctx) {
    const opts = Object.fromEntries(CHAIN_OPTS.filter((k) => e[k] != null).map((k) => [k, e[k]]));
    const start = e.start ? resolveSelector(state, e.start, ctx)[0] : undefined;
    const jumpFrom = e.jumpFrom ? resolveSelector(state, e.jumpFrom, ctx)[0] : undefined;
    // The first target has to be an enemy (a friendly or missing pick means a random enemy).
    const s = findCharacter(state, start);
    const ok = s && (s.controller ?? s.owner) !== ctx.controller && s.health > 0;
    let amount = e.amount;
    // amountIf: { if, amount } — a stronger Chain when the condition holds (Null Current).
    if (e.amountIf && checkCondition(state, e.amountIf.if, ctx)) amount = e.amountIf.amount;
    chainLightning(state, ctx, amount, { ...opts, start: ok ? s.uid : undefined, jumpFrom });
  },
  // { target, start?, drawIfHits? } — the chosen minions Discharge (start: the first target);
  // drawIfHits: N — draw a card if a Chain hit N or more targets (Arc Flash).
  discharge(state, e, ctx) {
    const start = e.start ? resolveSelector(state, e.start, ctx)[0] : undefined;
    each(state, e.target, ctx, (m) => {
      const hits = dischargeMinion(state, m, { start });
      if (e.drawIfHits && hits >= e.drawIfHits) drawCards(state, ctx.controller, 1);
    });
  },
  // Leviathan of the Deep Storm: every other friendly minion Discharges, one after another.
  dischargeAll(state, e, ctx) {
    for (const m of [...state.players[ctx.controller].board]) {
      if (m.uid === ctx.self || !(m.volts > 0) || m.health <= 0 || m.destroyed) continue;
      dischargeMinion(state, m);
    }
  },
  // Short Circuit: your minion with the most Volts Discharges, starting at `at`.
  dischargeMost(state, e, ctx) {
    const pool = state.players[ctx.controller].board.filter((m) => m.volts > 0 && m.health > 0 && !m.destroyed);
    if (!pool.length) return;
    const top = Math.max(...pool.map((m) => m.volts));
    const m = pool.find((x) => x.volts === top);
    dischargeMinion(state, m, { start: e.at ? resolveSelector(state, e.at, ctx)[0] : undefined });
  },
  // A minion died holding Volts (engine deaths step): half of them (rounded down) go off as a
  // Chain at a random enemy. (Balance: a full-strength Discharge on every death made Eels win ~80%.)
  deathDischarge(state, e, ctx) {
    const n = Math.floor(e.volts / 2);
    if (n <= 0) return;
    log(state, `⚡ ${getCard(e.cardId).name} Discharges as it dies (${n})!`);
    emit(state, { type: 'discharged', source: e.uid, player: ctx.controller, amount: n, onDeath: true });
    chainLightning(state, { controller: ctx.controller, self: null, cardId: e.cardId }, n, { from: e.uid });
  },

  // Ohmra, the Living Battery (end of your turn): every other friendly minion's Volts flow into
  // her (no limit). At 10 or more she unleashes them all as a Chain that never gets weaker.
  ohmraDrain(state, e, ctx) {
    const self = findCharacter(state, ctx.self);
    if (!self || self.health <= 0 || self.destroyed) return;
    for (const m of state.players[ctx.controller].board) {
      if (m.uid === self.uid || !(m.volts > 0) || m.health <= 0 || m.destroyed) continue;
      const n = m.volts;
      m.volts = 0;
      log(state, `⚡ ${nameOf(state, m)}'s ${n} Volt${n === 1 ? '' : 's'} flow into ${nameOf(state, self)}.`);
      gainVolts(state, self, n, { overcap: true });
    }
    const n = self.volts ?? 0;
    if (n < (e.unleashAt ?? 10)) return;
    self.volts = 0;
    log(state, `⚡ ${nameOf(state, self)} unleashes ${n} Volts!`);
    emit(state, { type: 'discharged', source: self.uid, player: ctx.controller, amount: n });
    chainLightning(state, { self: self.uid, controller: ctx.controller, cardId: self.cardId }, n, { from: self.uid, lossless: true });
  },
  // Thalassa, the Endless Storm: a storm over the board for the rest of the game; at the end of
  // each of your turns it Chains `amount` at a random enemy (engine 'storm' step). It stacks.
  endlessStorm(state, e, ctx) {
    const pl = state.players[ctx.controller];
    pl.storm = (pl.storm ?? 0) + (e.amount ?? 2);
    log(state, `⛈ An endless storm gathers over ${pl.name}'s side of the river (Chain ${pl.storm} each turn).`);
    emit(state, { type: 'stormGathers', player: ctx.controller, amount: pl.storm });
  },

  // ---- New legendaries ----
  // Drosera, the Dewtrap Queen: devour a random Frozen enemy minion with `maxHealth` or less
  // Health; she gains its Attack and Health.
  devourFrozen(state, e, ctx) {
    const me = findCharacter(state, ctx.self);
    if (!me || me.health <= 0 || me.destroyed) return;
    const prey = pickRandom(state, state.players[opponentOf(ctx.controller)].board
      .filter((m) => m.health > 0 && !m.destroyed && hasKeyword(m, 'Frozen') && m.health <= (e.maxHealth ?? 4)));
    if (!prey) return;
    const atk = effectiveAttack(prey), hp = Math.max(0, prey.health);
    prey.destroyed = true;
    prey.lastDamagedBy = ctx.self;
    prey.lastDamagedByController = ctx.controller;
    log(state, `🌺 ${nameOf(state, me)} devours ${nameOf(state, prey)}, stuck fast in her dew!`);
    applyBuff(state, me, { attack: atk, health: hp });
  },
  // The Pale Wanderer: { from, to } — `to` gains the positive keywords `from` has.
  copyKeywords(state, e, ctx) {
    const src = findCharacter(state, resolveSelector(state, e.from, ctx)[0]);
    const dest = findCharacter(state, resolveSelector(state, e.to, ctx)[0]);
    if (!src || !dest) return;
    const kws = allKeywords(src).filter((k) => !NEGATIVE_KEYWORDS.includes(k) && !hasKeyword(dest, k));
    for (const k of kws) addKeyword(dest, k, false, state);
    log(state, `${nameOf(state, dest)} copies ${kws.join(', ') || 'nothing'} from ${nameOf(state, src)}.`);
  },
  // Pulsar, the Neutron Heart: discard your hand; gain +per/+per for each card discarded.
  discardHandGrow(state, e, ctx) {
    const pl = state.players[ctx.controller];
    const before = pl.hand.length;
    for (const c of [...pl.hand]) discardFromHand(state, ctx.controller, c.uid, ctx);
    const n = before - pl.hand.length;
    const me = findCharacter(state, ctx.self);
    if (me && n > 0) applyBuff(state, me, { attack: n * (e.per ?? 1), health: n * (e.per ?? 1) });
  },

  // Run several effects as one (useful with `if` / `else`).
  sequence(state, e, ctx) {
    for (const sub of e.effects) resolveEffect(state, sub, ctx);
  },

  // { target, attack?, health?, temporary? (Attack this turn), untilYourNextTurn?,
  //   temporaryHealth?, keywords?, temporaryKeywords? }
  buff(state, e, ctx) {
    // "until your next turn" is stored as the player whose next turn clears it.
    let resolved = e.untilYourNextTurn ? { ...e, lingerUntil: ctx.controller } : e;
    // eventKeyword: gain the keyword named by the triggering event (Gene-Thief Operative).
    if (e.eventKeyword) resolved = { ...resolved, keywords: ctx.event?.keyword ? [ctx.event.keyword] : [] };
    // attackFromEnemyMushrooms: { max } — +1 Attack per Mushroom in the enemy deck (Nano-Spores).
    if (e.attackFromEnemyMushrooms) {
      const n = state.players[opponentOf(ctx.controller)].deck.reduce((t, c) => t + (c.mushrooms ?? 0), 0);
      resolved = { ...resolved, attack: Math.min(e.attackFromEnemyMushrooms.max ?? 99, n) };
    }
    // attackPerEventAmount: +N Attack per unit of the event's amount (Fungal Colossus, per Mushroom).
    if (e.attackPerEventAmount) resolved = { ...resolved, attack: e.attackPerEventAmount * (ctx.event?.amount ?? 0) };
    // perAshed: { max } — +1/+1 per enemy you've Reduced to Ash this game (Ashen Penitent).
    if (e.perAshed) {
      const n = Math.min(e.perAshed.max ?? 99, state.players[ctx.controller].ashed ?? 0);
      if (!n) return;
      resolved = { ...resolved, attack: n, health: n };
    }
    // perRelicsPlayed: { max } — +1/+1 per Relic you've played this game (The Hollow Knight).
    if (e.perRelicsPlayed) {
      const n = Math.min(e.perRelicsPlayed.max ?? 99, state.players[ctx.controller].relicsPlayed ?? 0);
      if (!n) return;
      resolved = { ...resolved, attack: n, health: n };
    }
    // perFriendlyDeaths: { max } — +1/+1 per friendly minion that died this game (Gravebloom).
    if (e.perFriendlyDeaths) {
      const n = Math.min(e.perFriendlyDeaths.max ?? 99, state.players[ctx.controller].minionDeaths ?? 0);
      if (!n) return;
      resolved = { ...resolved, attack: n, health: n };
    }
    // perDiscarded: { max } — +1/+1 per card this effect discarded (Starfall Feast, Nihilax).
    if (e.perDiscarded) {
      const n = Math.min(e.perDiscarded.max ?? 99, ctx.discarded ?? 0);
      if (!n) return;
      resolved = { ...resolved, attack: n * (e.perDiscarded.attack ?? 1), health: n * (e.perDiscarded.health ?? 1) };
    }
    each(state, e.target, ctx, (c) => applyBuff(state, c, { ...resolved, byController: ctx.controller }));
  },

  // { effects } — Aftershocks (Tremor): run the effects once, then once more for each other
  // friendly minion that Surfaced this turn (start-of-turn Surfaces all land before this runs).
  aftershocks(state, e, ctx) {
    const others = state.players[ctx.controller].board
      .filter((m) => m.uid !== ctx.self && m.surfacedTurn === state.turn && m.health > 0 && !m.destroyed).length;
    if (others) log(state, `🏜 Aftershocks! The quake strikes ${1 + others} times.`);
    for (let i = 0; i <= others; i++) for (const sub of e.effects) resolveEffect(state, sub, ctx);
  },

  // Demons (Circles of Hell): sink the battle one circle deeper (Baphomet).
  descend(state) {
    sinkOneCircle(state);
  },
  // { depth } — Satan: in the deepest circle, the enemy Hero loses half their Health (rounded down).
  satansJudgement(state, e, ctx) {
    if (descentDepth(state) < (e.depth ?? 9)) return;
    const foe = heroOf(state, opponentOf(ctx.controller));
    const n = Math.floor(foe.health / 2);
    if (n <= 0) return;
    log(state, `😈 Judgement from the Pit: ${nameOf(state, foe)} loses half their Health.`);
    loseHealth(state, foe.uid, n, { paid: false });
  },

  // ---- Ice Age ----
  // Cave Painter: the next Great Freeze comes N turns sooner.
  hastenFreeze(state, e, ctx) {
    const gf = state.players[ctx.controller].greatFreeze;
    if (!gf) return;
    gf.turns += e.turns ?? 1;
    log(state, `❄ The Great Freeze draws nearer.`);
  },

  // Frozen in Time: { target, turns } — Thawing minions come that many turns closer to breaking free.
  thaw(state, e, ctx) {
    each(state, e.target, ctx, (m) => { if (m.kind === 'minion') thawBy(state, m, e.turns ?? 1); });
  },
  // { target } — break free now (Flash Thaw).
  breakFree(state, e, ctx) {
    each(state, e.target, ctx, (m) => { if (m.kind === 'minion') breakFree(state, m); });
  },
  // { target, turns } — seal a minion in ice: it gets Thawing (turns) (Deep Freeze, Ice Tomb).
  encase(state, e, ctx) {
    each(state, e.target, ctx, (m) => {
      if (m.kind !== 'minion' || m.health <= 0 || m.destroyed) return;
      m.encased = Math.max(m.encased ?? 0, e.turns ?? 2);
      log(state, `🧊 ${nameOf(state, m)} is sealed in ice.`);
      emit(state, { type: 'minionEncased', target: m.uid, player: m.controller });
    });
  },

  // ---- Dinosaurs (Meteorite) ----
  // Meteor Strike: 1 damage to a random minion (either side) for each Mana spent on it.
  meteorStrike(state, e, ctx) {
    const n = ctx.spent ?? 0;
    log(state, `☄ ${n} meteor${n === 1 ? '' : 's'} fall!`);
    for (let i = 0; i < n; i++) {
      const pool = [...state.players[0].board, ...state.players[1].board].filter((m) => m.health > 0 && !m.destroyed);
      const m = pickRandom(state, pool);
      if (!m) break;
      dealDamage(state, ctx.self, m.uid, 1, { sourceController: ctx.controller });
    }
  },
  // { cardId } — Bull Ceratosaurus: put a copy of that card from your hand onto the battlefield.
  summonFromHand(state, e, ctx) {
    const pl = state.players[ctx.controller];
    const i = pl.hand.findIndex((c) => c.cardId === e.cardId);
    if (i < 0) return;
    const [inst] = pl.hand.splice(i, 1);
    const m = summonMinion(state, ctx.controller, inst.cardId);
    if (!m) { pl.hand.splice(i, 0, inst); return; }
    log(state, `${getCard(inst.cardId).name} answers the call!`);
    ctx.summoned = m.uid;
    enterBattlefield(state, m);
  },

  // ---- Void ----
  // { then?, random? } — discard a card from your hand (you choose, unless random or it's your
  // only card). `then` happens only if a card was discarded ("Discard a card. If you do, ...").
  discard(state, e, ctx) {
    const hand = state.players[ctx.controller].hand;
    if (!hand.length) return;
    const steps = (uid) => [{ op: 'discardCard', uid }, ...(e.then ?? [])];
    if (hand.length === 1 || e.random) {
      const uid = (e.random ? pickRandom(state, hand) : hand[0]).uid;
      for (const sub of steps(uid)) resolveEffect(state, sub, ctx);
      return;
    }
    state.pending = {
      type: 'choice', player: ctx.controller, prompt: e.prompt ?? 'Discard a card', resolve: 'effects', ctx,
      options: hand.map((c) => ({ cardId: c.cardId, label: getCard(c.cardId).name, effects: steps(c.uid) })),
    };
  },
  discardCard(state, e, ctx) {
    discardFromHand(state, ctx.controller, e.uid, ctx);
  },
  // { then? } — discard your whole hand; `then` happens if at least one card went.
  discardHand(state, e, ctx) {
    const pl = state.players[ctx.controller];
    for (const c of [...pl.hand]) discardFromHand(state, ctx.controller, c.uid, ctx);
    if (ctx.discarded) for (const sub of e.then ?? []) resolveEffect(state, sub, ctx);
  },

  // { filter?, collapse? (always Collapse), ifCollapse?, repeat? } — Pull: Discover a card from
  // the enemy deck (3 options) and take it. `ifCollapse` runs after a Collapsed Pull (Quasar Maw);
  // `repeat` Pulls again that many more times (Gravitational Collapse: one per card discarded).
  pull(state, e, ctx) {
    const p = ctx.controller;
    const repeat = e.repeatPerDiscarded ? Math.min(e.repeatPerDiscarded.max ?? 99, ctx.discarded ?? 0) - 1 : (e.repeat ?? 0);
    if (repeat < 0) return;
    const deck = state.players[opponentOf(p)].deck;
    const byCard = new Map();
    for (const inst of deck) if (cardMatches(getCard(inst.cardId), e.filter) && !byCard.has(inst.cardId)) byCard.set(inst.cardId, inst.uid);
    const options = shuffle(state, [...byCard].map(([cardId, uid]) => ({ cardId, uid }))).slice(0, 3);
    if (!options.length) { log(state, 'Nothing to Pull.'); return; }
    const collapse = !!e.collapse || state.players[p].hand.length === 0;
    const next = { ...e, repeat: repeat - 1, repeatPerDiscarded: undefined };
    const steps = (uid) => [{ op: 'pullCard', uid, collapse }, ...(collapse ? e.ifCollapse ?? [] : []), ...(repeat > 0 ? [next] : [])];
    if (options.length === 1) { for (const sub of steps(options[0].uid)) resolveEffect(state, sub, ctx); return; }
    state.pending = {
      type: 'choice', player: p, prompt: collapse ? 'Pull a card (Collapse!)' : 'Pull a card from the enemy deck', resolve: 'effects', ctx,
      options: options.map((o) => ({ cardId: o.cardId, label: getCard(o.cardId).name, effects: steps(o.uid) })),
    };
  },
  pullCard(state, e, ctx) {
    pullFromEnemyDeck(state, ctx.controller, e.uid, e.collapse);
  },
  // { filter? } — White Hole Emissary: summon a random minion straight out of the enemy deck.
  summonFromEnemyDeck(state, e, ctx) {
    const deck = state.players[opponentOf(ctx.controller)].deck;
    const pool = deck.filter((c) => getCard(c.cardId).type === 'minion' && cardMatches(getCard(c.cardId), e.filter));
    const pick = pickRandom(state, pool);
    if (!pick) { log(state, 'No minion left in the enemy deck.'); return; }
    deck.splice(deck.indexOf(pick), 1);
    const m = summonMinion(state, ctx.controller, pick.cardId);
    if (m) { ctx.summoned = m.uid; log(state, `⚪ The White Hole casts out ${getCard(pick.cardId).name}!`); enterBattlefield(state, m); }
  },
  // Gravity Snare: you Pull the card the enemy just drew, out of their hand.
  pullDrawn(state, e, ctx) {
    const ev = ctx.event; if (!ev?.cardUid) return;
    const foe = state.players[ev.player];
    const i = foe.hand.findIndex((c) => c.uid === ev.cardUid);
    if (i < 0) return;
    const [inst] = foe.hand.splice(i, 1);
    foe.deck.unshift(inst); // briefly back on top, then Pulled like any other card
    pullFromEnemyDeck(state, ctx.controller, inst.uid, state.players[ctx.controller].hand.length === 0);
  },

  // { target } — Swallow Whole (King Meg): the source destroys the target outright and
  // permanently gains its current Attack and Health.
  swallow(state, e, ctx) {
    const me = findCharacter(state, ctx.self);
    if (!me || me.kind !== 'minion' || me.destroyed) return;
    each(state, e.target, ctx, (c) => {
      if (c.kind !== 'minion' || c.destroyed || c.health <= 0) return;
      const atk = Math.max(0, effectiveAttack(c)), hp = Math.max(0, c.health);
      c.destroyed = true;
      c.lastDamagedBy = ctx.self;
      c.lastDamagedByController = ctx.controller;
      log(state, `🦈 ${nameOf(state, me)} swallows ${nameOf(state, c)} whole (+${atk}/+${hp}).`);
      applyBuff(state, me, { attack: atk, health: hp, byController: ctx.controller });
    });
  },

  // { target, options: [buff params, ...] } — one option at random.
  randomBuff(state, e, ctx) {
    each(state, e.target, ctx, (c) => applyBuff(state, c, pickRandom(state, e.options)));
  },

  // { target, amount, amountIf?: { if, amount }, lifesteal? }
  // If the defending player holds a "would take damage" Quick Play for a
  // target, that damage pauses for their window and resolves afterwards.
  damage(state, e, ctx) {
    let base = e.amountIf && checkCondition(state, e.amountIf.if, ctx) ? e.amountIf.amount : e.amount;
    // Demons: one per enemy card above N (Royal Debt Collector); cards they drew this turn (Hellfire Decree).
    if (e.amountFromEnemyHand) base = Math.max(0, state.players[opponentOf(ctx.controller)].hand.length - (e.amountFromEnemyHand.over ?? 0));
    if (e.amountFromEnemyDraws) { const f = state.players[opponentOf(ctx.controller)]; base = (e.amountFromEnemyDraws.plus ?? 0) + (f.drawsTurn === state.turn ? f.drawsThisTurn : 0); }
    if ((e.amountFromEnemyHand || e.amountFromEnemyDraws) && !base) return;
    // amountFromCorpses: { max } — as much damage as you have Corpses (Fester).
    if (e.amountFromCorpses) base = Math.min(e.amountFromCorpses.max ?? 99, state.players[ctx.controller].corpses ?? 0);
    if (e.amountFromCorpses && !base) return;
    // amountFromArmor: { max } — as much damage as your Hero has Armor (Bulwark Sentinel).
    if (e.amountFromArmor) base = Math.min(e.amountFromArmor.max ?? 99, heroOf(state, ctx.controller).armor ?? 0);
    // amountFromSelfAttack — as much damage as this minion's Attack (Arsenal Overseer).
    if (e.amountFromSelfAttack) { const me = findCharacter(state, ctx.self); base = me ? effectiveAttack(me) : 0; }
    // amountFromWeapons — the total Attack of both your weapons (Crossfire Execution).
    if (e.amountFromWeapons) { const h = heroOf(state, ctx.controller); base = (h.weapon?.attack ?? 0) + (h.weapon2?.attack ?? 0); if (!base) return; }
    if ((e.amountFromArmor || e.amountFromSelfAttack) && !base) return;
    // Void: amountPerDiscarded: { each, max } — per card this effect discarded (Star-Swallower);
    // amountFromDiscardCost — the discarded cards' printed cost (Eclipse Maw).
    if (e.amountPerDiscarded) base = Math.min(e.amountPerDiscarded.max ?? 99, (ctx.discarded ?? 0) * (e.amountPerDiscarded.each ?? 1));
    if (e.amountFromDiscardCost) base = ctx.discardedCost ?? 0;
    if ((e.amountPerDiscarded || e.amountFromDiscardCost) && !base) return;
    // amountPerCount: { count: selector, each, max } — extra damage per matching character (Colossus Prime).
    if (e.amountPerCount) base += Math.min(e.amountPerCount.max ?? 99, resolveSelector(state, e.amountPerCount.count, ctx).length * (e.amountPerCount.each ?? 1));
    const deferred = [];
    each(state, e.target, ctx, (c) => {
      // burningBonus: extra damage to a target that is Burning (Dragons).
      // darkBonus: extra holy damage to a Dark minion (Divine).
      if (e.perHolyFlame && !(c.holyFlame > 0)) return;
      const amount = (e.perHolyFlame ? c.holyFlame : base) + (e.burningBonus && isBurning(c) ? e.burningBonus : 0) + (e.darkBonus && isDarkOrUndead(c) ? e.darkBonus : 0)
        + (e.irradiatedBonus && radiationOf(c) > 0 ? e.irradiatedBonus : 0);
      const responder = opponentOf(state.activePlayer);
      const event = { type: 'wouldTakeDamage', source: ctx.self, target: c.uid, player: c.controller, amount };
      if (!e.windowed && c.controller === responder && hooks.hasReaction(state, responder, 'wouldTakeDamage', { event })) {
        deferred.push(
          { kind: 'window', name: 'wouldTakeDamage', priority: responder, ctx: { event } },
          { kind: 'effect', effect: { op: 'damage', target: { uid: c.uid }, amount, lifesteal: e.lifesteal, freeze: e.freeze, windowed: true }, ctx },
        );
        return;
      }
      dealDamage(state, ctx.self, c.uid, amount, { sourceController: ctx.controller, lifesteal: e.lifesteal });
      // freeze: the survivors are Frozen too (Frost Dragons: Ice Shard Barrage, Avalanche Dragon, Frostbite).
      if (e.freeze && c.kind === 'minion' && c.health > 0 && !c.destroyed) addKeyword(c, 'Frozen', false, state);
      // obliterateKilled: a minion this destroys is removed from the game (Reactor Meltdown, Ground Zero).
      if (e.obliterateKilled && c.kind === 'minion' && c.health <= 0) c.obliterate = true;
    });
    pushFront(state, deferred);
  },

  // ---- Dragons ----
  // { target, amount } — apply Burn (see core applyBurn).
  applyBurn(state, e, ctx) {
    each(state, e.target, ctx, (c) => applyBurn(state, c, e.amount));
  },

  // { target, amount, oncePerTurn? } — raise a Burning character's Burn value
  // (Feed the Flames, Furnace Dragon). oncePerTurn: a key; each character can
  // be raised by that source only once per turn.
  addBurn(state, e, ctx) {
    each(state, e.target, ctx, (c) => {
      if (!isBurning(c) || c.health <= 0) return;
      if (e.oncePerTurn) {
        c.burnRaised ??= {};
        if (c.burnRaised[e.oncePerTurn] === state.turn) return;
        c.burnRaised[e.oncePerTurn] = state.turn;
      }
      c.burn += e.amount;
      log(state, `🔥 ${nameOf(state, c)}'s Burn rises to ${c.burn}.`);
    });
  },

  // { from: 'hand' | 'deck', count } — burn the opponent's cards.
  burnCards(state, e, ctx) {
    burnCards(state, opponentOf(ctx.controller), e.from, e.count ?? 1, ctx.controller);
  },

  // { target, amount: number | 'all' } — prevent the next damage the target would take.
  preventDamage(state, e, ctx) {
    each(state, e.target, ctx, (c) => {
      state.damagePrevention ??= {};
      const cur = state.damagePrevention[c.uid] ?? 0;
      state.damagePrevention[c.uid] = e.amount === 'all' || cur === 'all' ? 'all' : cur + e.amount;
    });
  },

  // { target, negative?, count? } — keywords the character doesn't have yet,
  // from the designer's random pool (or the negative list).
  giveRandomKeyword(state, e, ctx) {
    each(state, e.target, ctx, (c) => {
      for (let i = 0; i < (e.count ?? 1); i++) {
        const pool = (e.negative ? NEGATIVE_KEYWORDS : RANDOM_KEYWORD_POOL).filter((k) => !hasKeyword(c, k));
        const k = pickRandom(state, pool);
        if (!k) return;
        addKeyword(c, k, e.temporary, state);
        log(state, `${nameOf(state, c)} gains ${k}.`);
      }
    });
  },

  // { target, keyword } — for cards that say they remove a keyword (e.g. Stealth).
  removeKeyword(state, e, ctx) {
    each(state, e.target, ctx, (c) => loseKeyword(state, c, e.keyword));
  },

  // { target } — remove every keyword (Subjugator Drone).
  stripKeywords(state, e, ctx) {
    each(state, e.target, ctx, (c) => {
      const lost = allKeywords(c);
      for (const k of lost) loseKeyword(state, c, k);
      if (lost.length) log(state, `${nameOf(state, c)} loses ${lost.join(', ')}.`);
    });
  },

  // { from, to } — remove all of `from`'s keywords and give them to `to`
  // (Genetic Snare, Gene Corruption). If `to` is empty the keywords are just lost.
  transferKeywords(state, e, ctx) {
    const src = findCharacter(state, resolveSelector(state, e.from, ctx)[0]);
    if (!src) return;
    const kws = allKeywords(src);
    for (const k of kws) loseKeyword(state, src, k);
    const dest = findCharacter(state, resolveSelector(state, e.to, ctx)[0]);
    if (dest) for (const k of kws) addKeyword(dest, k, false, state);
    log(state, `${nameOf(state, src)} loses ${kws.join(', ') || 'nothing'}${dest && kws.length ? ` to ${nameOf(state, dest)}` : ''}.`);
  },

  // Hive Synchronization: every friendly minion gets every (positive) keyword
  // that any friendly minion has.
  shareKeywords(state, e, ctx) {
    const board = state.players[ctx.controller].board;
    const shared = [...new Set(board.flatMap((m) => allKeywords(m)))].filter((k) => !NEGATIVE_KEYWORDS.includes(k));
    for (const m of board) for (const k of shared) addKeyword(m, k, false, state);
    if (shared.length) log(state, `Your minions share ${shared.join(', ')}.`);
  },

  // Discover a Keyword: choose 1 of 3 random keywords for the target.
  // { target, temporary? }
  discoverKeyword(state, e, ctx) {
    const c = findCharacter(state, resolveSelector(state, e.target, ctx)[0]);
    if (!c) return;
    const opts = randomKeywords(state, RANDOM_KEYWORD_POOL, allKeywords(c), 3);
    if (!opts.length) return;
    state.pending = {
      type: 'choice', player: ctx.controller, prompt: `Discover a Keyword for ${nameOf(state, c)}`, resolve: 'effects', ctx,
      options: opts.map((k) => ({
        label: k,
        effects: [{ op: 'buff', target: { uid: c.uid }, [e.temporary ? 'temporaryKeywords' : 'keywords']: [k] }],
      })),
    };
  },

  // Terraform: Discover a minion from any faction; it goes to your hand as a
  // 4/4 with 2 random keywords. { attack, health, randomKeywords }
  discoverAnyMinion(state, e, ctx) {
    const pool = shuffle(state, collectibleMinions().map((c) => c.id)).slice(0, 3);
    state.pending = {
      type: 'choice', player: ctx.controller, prompt: 'Discover a minion', resolve: 'effects', ctx,
      options: pool.map((id) => ({
        cardId: id, label: getCard(id).name,
        effects: [{ op: 'addVariantToHand', base: id, attack: e.attack, health: e.health, randomKeywords: e.randomKeywords }],
      })),
    };
  },

  // Adds a modified copy of a card to your hand as a new card.
  // { base | randomBase: { faction, noKeywords }, attack?, health?, randomKeywords? }
  //   eventCard: the card of the event's minion (Mycelial Rebirth); attackDelta / healthDelta: +N to its stats.
  addVariantToHand(state, e, ctx) {
    let baseId = e.eventCard ? ctx.event?.cardId : e.base;
    if (e.randomBase) {
      baseId = pickRandom(state, collectibleMinions((c) => c.faction === e.randomBase.faction &&
        (!e.randomBase.noKeywords || !(c.keywords ?? []).length)).map((c) => c.id));
    }
    if (!baseId) return;
    const base = getCard(baseId);
    const extra = randomKeywords(state, RANDOM_KEYWORD_POOL, base.keywords ?? [], e.randomKeywords ?? 0);
    const card = {
      ...base, id: `variant_${state.nextUid++}`, custom: true,
      attack: e.attack ?? (base.attack ?? 0) + (e.attackDelta ?? 0),
      health: e.health ?? (base.health ?? 0) + (e.healthDelta ?? 0),
      keywords: [...(base.keywords ?? []), ...extra],
      text: [extra.join(', ') + (extra.length ? '.' : ''), base.text].filter(Boolean).join(' '),
      artFrom: base.artFrom ?? base.id,
    };
    registerCustom(state, card);
    addToHand(state, ctx.controller, card.id);
    log(state, `${state.players[ctx.controller].name} gets ${card.name} (${card.attack}/${card.health}${extra.length ? `, ${extra.join(', ')}` : ''}).`);
  },

  // Gene Splicing: Discover a minion from your deck to splice with the chosen enemy minion.
  geneSplice(state, e, ctx) {
    const enemy = findCharacter(state, ctx.chosen);
    if (!enemy || enemy.kind !== 'minion') return;
    const deck = state.players[ctx.controller].deck;
    const byCard = new Map();
    for (const inst of deck) if (getCard(inst.cardId).type === 'minion' && !byCard.has(inst.cardId)) byCard.set(inst.cardId, inst.uid);
    const options = shuffle(state, [...byCard]).slice(0, 3);
    if (!options.length) { log(state, 'No minion in your deck to splice.'); return; }
    state.pending = {
      type: 'choice', player: ctx.controller, prompt: `Splice with ${nameOf(state, enemy)}`, resolve: 'effects', ctx,
      options: options.map(([cardId, uid]) => ({
        cardId, label: getCard(cardId).name,
        effects: [{ op: 'makeHybrid', enemyCardId: enemy.cardId, deckUid: uid }],
      })),
    };
  },

  // { enemyCardId, deckUid } — the deck minion is replaced by the Hybrid,
  // shuffled into a random spot in the top half of the deck (draws come from the top).
  makeHybrid(state, e, ctx) {
    const deck = state.players[ctx.controller].deck;
    const i = deck.findIndex((c) => c.uid === e.deckUid);
    if (i < 0) return;
    const [inst] = deck.splice(i, 1);
    const card = makeHybrid(state, e.enemyCardId, inst.cardId);
    registerCustom(state, card);
    const topHalf = Math.ceil(deck.length / 2);
    deck.splice(randomInt(state, topHalf + 1), 0, { uid: state.nextUid++, cardId: card.id, owner: ctx.controller });
    log(state, `${state.players[ctx.controller].name} shuffles ${card.name} (${card.cost} Mana, ${card.attack}/${card.health}) into the top half of their deck.`);
  },

  // { count } — set different Traps from your deck, up to the Trap limit.
  setTrapsFromDeck(state, e, ctx) {
    const pl = state.players[ctx.controller];
    const seen = new Set();
    let set = 0;
    for (const inst of [...pl.deck]) {
      if (set >= e.count || pl.traps.length >= state.rules.maxTraps) break;
      if (getCard(inst.cardId).type !== 'trap' || seen.has(inst.cardId)) continue;
      seen.add(inst.cardId);
      pl.deck.splice(pl.deck.indexOf(inst), 1);
      pl.traps.push(inst);
      set++;
    }
    log(state, `${pl.name} sets ${set} Trap${set === 1 ? '' : 's'} from their deck.`);
  },

  // { amount, side?: 'enemy', perEnemyKilled?: [effects] } — damage every minion
  // (Genetic Scourge), or only enemy minions (Spore Burst).
  damageAll(state, e, ctx) {
    const hit = e.side === 'enemy'
      ? [...state.players[opponentOf(ctx.controller)].board]
      : [...state.players[0].board, ...state.players[1].board];
    // amountPerDiscarded: { max } — 1 per card this effect discarded (Extinction Event).
    const amount = e.amountPerDiscarded ? Math.min(e.amountPerDiscarded.max ?? 99, ctx.discarded ?? 0) : e.amount;
    if (!amount) return;
    for (const m of hit) dealDamage(state, ctx.self, m.uid, amount, { sourceController: ctx.controller });
    const killed = hit.filter((m) => m.controller !== ctx.controller && (m.health <= 0 || m.destroyed)).length;
    for (let i = 0; i < killed; i++) for (const sub of e.perEnemyKilled ?? []) resolveEffect(state, sub, ctx);
  },

  // Overmind Xal'at: absorb the stats and keywords of all other friendly minions.
  absorbFriendly(state, e, ctx) {
    const self = findCharacter(state, ctx.self);
    if (!self) return;
    const board = state.players[ctx.controller].board;
    const others = board.filter((m) => m !== self);
    for (const m of others) {
      self.attack += effectiveAttack(m);
      self.health += m.health;
      self.maxHealth += m.health;
      for (const k of allKeywords(m)) addKeyword(self, k, false, state);
      const at = board.indexOf(m);
      board.splice(at, 1);
      state.players[m.owner].graveyard.push({ uid: m.uid, cardId: m.cardId, owner: m.owner });
      burstShell(state, m, at);
    }
    if (others.length) log(state, `${nameOf(state, self)} absorbs ${others.length} minion${others.length === 1 ? '' : 's'} (${self.attack}/${self.health}).`);
  },

  // The Qu Bio-Engineer: choose `times` times — an ally gets a random keyword,
  // or an enemy gets a random negative keyword.
  boonOrBane(state, e, ctx) {
    const minions = [...state.players[ctx.controller].board, ...state.players[opponentOf(ctx.controller)].board]
      .filter((m) => m.uid !== ctx.self);
    if (!minions.length || !e.times) return;
    const next = e.times > 1 ? [{ op: 'boonOrBane', times: e.times - 1 }] : [];
    state.pending = {
      type: 'choice', player: ctx.controller, prompt: `Choose a minion (${e.times} left)`, resolve: 'effects', ctx,
      options: minions.map((m) => {
        const ally = m.controller === ctx.controller;
        return {
          label: `${nameOf(state, m)} (${ally ? 'ally: random keyword' : 'enemy: random negative'})`,
          effects: [{ op: 'giveRandomKeyword', target: { uid: m.uid }, negative: !ally }, ...next],
        };
      }),
    };
  },

  // Neural Disruptor: the card that was just played gets a new random target.
  redirectTarget(state, e, ctx) {
    const ev = ctx.event;
    if (!ev?.target || ev.cardId == null) return;
    const card = getCard(ev.cardId);
    if (!card.target) return;
    const options = targetCandidates(state, card.target, ev.player, null, card.type === 'spell').filter((id) => id !== ev.target);
    const next = pickRandom(state, options);
    if (next == null) { log(state, 'There is no other target to redirect to.'); return; }
    for (const step of state.queue) {
      if (step.ctx?.self === ev.source && step.ctx.chosen === ev.target) step.ctx = { ...step.ctx, chosen: next };
    }
    log(state, `${card.name} is redirected to ${nameOf(state, findCharacter(state, next))}!`);
  },

  // Sub-Space Jump: leave the board until your next turn, then return with a buff.
  // { target, attack?, health? }
  banish(state, e, ctx) {
    each(state, e.target, ctx, (m) => {
      if (m.kind !== 'minion') return;
      const pl = state.players[m.controller];
      const at = pl.board.indexOf(m);
      pl.board.splice(at, 1);
      burstShell(state, m, at);
      pl.limbo ??= [];
      pl.limbo.push({ minion: m, returnAt: ctx.controller, attack: e.attack ?? 0, health: e.health ?? 0 });
      log(state, `${nameOf(state, m)} jumps into sub-space.`);
    });
  },

  // Abduct: move an enemy minion from the battlefield to your hand.
  abduct(state, e, ctx) {
    each(state, e.target, ctx, (m) => {
      if (m.kind !== 'minion') return;
      const board = state.players[m.controller].board;
      const at = board.indexOf(m);
      board.splice(at, 1);
      log(state, `${nameOf(state, m)} is Abducted!`);
      burstShell(state, m, at);
      addToHand(state, ctx.controller, m.cardId);
    });
  },

  // The player picks one option: { prompt, options: [{ label, effects }] }.
  chooseOne(state, e, ctx) {
    state.pending = {
      type: 'choice', player: ctx.controller, prompt: e.prompt ?? 'Choose one', resolve: 'effects', ctx,
      options: e.options.map((o) => ({ label: o.label, effects: o.effects })),
    };
  },

  // { cardId } — put a card into your hand.
  addToHand(state, e, ctx) {
    let cardId = e.cardId;
    // fromGraveyard: a random friendly minion that died this game, not a token (Corpse Bloom).
    if (e.fromGraveyard) {
      const pool = [...new Set(state.players[ctx.controller].graveyard.filter((g) => g.died).map((g) => g.cardId)
        .filter((id) => getCard(id)?.type === 'minion' && !getCard(id).token))];
      if (!pool.length) { log(state, 'No friendly minion has died yet.'); return; }
      cardId = pickRandom(state, pool);
    }
    addToHand(state, ctx.controller, cardId, { ...(e.costMod ? { costMod: e.costMod } : {}), ...(e.minCost != null ? { minCost: e.minCost } : {}) });
  },

  // { amount } — extra Mana this turn only (Mana Potion).
  gainMana(state, e, ctx) {
    const m = state.players[ctx.controller].mana;
    m.current += e.amount;
    m.temp = (m.temp ?? 0) + e.amount; // temporary: spent first, shown gold
    log(state, `${state.players[ctx.controller].name} gains ${e.amount} Mana this turn.`);
  },

  // { target, amount | amountFromEvent, overheal? }
  heal(state, e, ctx) {
    const amount = e.amountFromEvent ? (ctx.event?.amount ?? 0) : e.amount;
    each(state, e.target, ctx, (c) => heal(state, c.uid, amount, { overheal: e.overheal, source: ctx.self, ignoreRadiation: e.ignoreRadiation }));
  },

  // { target, amount, forSummon? } — Health loss that is not damage (a cost paid with Health).
  loseHealth(state, e, ctx) {
    each(state, e.target, ctx, (c) => loseHealth(state, c.uid, e.amount, { forSummon: e.forSummon }));
  },

  // { target } — swap a minion's Attack and Health (Kaleidoscope Jester).
  swapStats(state, e, ctx) {
    each(state, e.target, ctx, (m) => {
      if (m.kind !== 'minion') return;
      const a = effectiveAttack(m), h = m.health;
      m.attack = h - (effectiveAttack(m) - m.attack); m.health = a; m.maxHealth = Math.max(a, 1);
      if (m.health <= 0) m.destroyed = true;
      log(state, `🃏 ${nameOf(state, m)}'s Attack and Health swap (${h}/${a}).`);
    });
  },

  // ---- Radioactive ----
  // { target, amount, turns? } — Radiation (permanent unless `turns`, counted on the caster's turn ends).
  radiate(state, e, ctx) {
    each(state, e.target, ctx, (c) => applyRadiation(state, c, e.amount, { turns: e.turns, by: ctx.controller }));
  },

  // { target, amount } Bleed (Bloodripper's Talon): adds to the character's Bleed.
  bleed(state, e, ctx) {
    each(state, e.target, ctx, (c) => applyBleed(state, c, e.amount ?? 1, ctx.controller));
  },

  // { target } — remove all Radiation (Radiation Surgeon).
  // { target } Cleanse: remove Burn, Radiation and harmful keywords (Frozen, Burned, Blind).
  cleanse(state, e, ctx) {
    const BAD = ['Frozen', 'Burned', 'Blind'];
    each(state, e.target, ctx, (c) => {
      let any = false;
      if ((c.burn ?? 0) > 0) { c.burn = 0; c.burnLeft = 0; any = true; }
      if ((c.bleed ?? 0) > 0) { c.bleed = 0; any = true; }
      if (radiationOf(c)) { clearRadiation(state, c); any = true; }
      for (const k of ['keywords', 'tempKeywords']) {
        if (Array.isArray(c[k]) && c[k].some((x) => BAD.includes(x))) { c[k] = c[k].filter((x) => !BAD.includes(x)); any = true; }
      }
      if (Array.isArray(c.lingerKeywords) && c.lingerKeywords.some((x) => BAD.includes(x.k))) { c.lingerKeywords = c.lingerKeywords.filter((x) => !BAD.includes(x.k)); any = true; }
      if (any) { log(state, `✨ ${nameOf(state, c)} is cleansed.`); traceFx(state, { type: 'cleansed', target: c.uid }); }
      if (any && c.kind === 'minion') ctx.cleansedMinion = true;
    });
  },

  clearRadiation(state, e, ctx) {
    each(state, e.target, ctx, (c) => clearRadiation(state, c));
  },

  // { target, damageTo } — Reactor Overload: remove all Radiation from the targets; then,
  // one at a time, deal 1 damage to a random character from damageTo per Radiation removed.
  overload(state, e, ctx) {
    let n = 0;
    each(state, e.target, ctx, (c) => { n += radiationOf(c); clearRadiation(state, c); });
    if (!n) { log(state, 'There was no Radiation to overload.'); return; }
    log(state, `☢ Overload! ${n} Radiation becomes ${n} damage.`);
    const hit = { op: 'damage', target: { randomOf: e.damageTo }, amount: 1 };
    pushFront(state, Array.from({ length: n }, () => ({ kind: 'effect', effect: hit, ctx })));
  },

  // { target, amount, irradiatedBonus?, obliterateKilled? } — reduce Health (not damage).
  // Faction passive: Radioactive minions ignore Health reductions their enemies cause.
  reduceHealth(state, e, ctx) {
    each(state, e.target, ctx, (c) => {
      if (c.kind === 'minion' && getCard(c.cardId).faction === 'Radioactive' && c.controller !== ctx.controller) {
        log(state, `${nameOf(state, c)} shrugs off the reduction.`);
        return;
      }
      reduceHealthStat(state, c, e.amount + (e.irradiatedBonus && radiationOf(c) > 0 ? e.irradiatedBonus : 0));
      if (e.obliterateKilled && c.kind === 'minion' && c.health <= 0) c.obliterate = true;
    });
  },

  // { target } — The Irradiated Genius: ignore Radiation auras until your next turn.
  radProof(state, e, ctx) {
    each(state, e.target, ctx, (c) => { c.radProofUntil = ctx.controller; });
  },

  // ---- Fusions ----
  // { amount } — Dinosaurs: extra Primal Mana this turn (Dinosaur cards only).
  gainPrimal(state, e, ctx) {
    if (state.players[ctx.controller].extinction?.shower) {
      log(state, 'The Meteor Shower blocks Primal Mana.');
      return;
    }
    const m = state.players[ctx.controller].mana;
    m.current += e.amount;
    m.primal = (m.primal ?? 0) + e.amount;
    log(state, `${state.players[ctx.controller].name} gains ${e.amount} Primal Mana this turn.`);
  },

  // { trigger } — the caster's Hero gains a lasting ability ("this game").
  heroTrigger(state, e, ctx) {
    const h = heroOf(state, ctx.controller);
    (h.grantedTriggers ??= []).push({ ...e.trigger, controller: ctx.controller });
    if (e.log) log(state, e.log);
  },

  // { turns, pool } — Primal Seed: counts down at the start of your turn, then hatches into a random minion.
  hatchCountdown(state, e, ctx) {
    const m = findCharacter(state, ctx.self);
    if (!m) return;
    m.hatchIn = (m.hatchIn ?? e.turns) - 1;
    if (m.hatchIn > 0) { log(state, `${nameOf(state, m)} will hatch in ${m.hatchIn} turn${m.hatchIn === 1 ? '' : 's'}.`); return; }
    const id = pickRandom(state, collectibleMinions((c) => cardMatches(c, e.pool) && (e.pool.cost == null || c.cost === e.pool.cost)).map((c) => c.id));
    if (id) EFFECT_OPS.transform(state, { target: 'self', into: id }, ctx);
  },

  // Abduction Rite: pay Health = your Summoning Tier, take control of a random enemy minion
  // that costs that much or less until the end of your turn.
  abductionRite(state, e, ctx) {
    const pl = state.players[ctx.controller];
    const tier = Math.min(10, pl.summonTier ?? 1);
    loseHealth(state, pl.hero.uid, tier);
    const pick = pickRandom(state, state.players[opponentOf(ctx.controller)].board.filter((m) => getCard(m.cardId).cost <= tier).map((m) => m.uid));
    if (pick == null) { log(state, 'No enemy minion is cheap enough to abduct.'); return; }
    EFFECT_OPS.takeControlTemporarily(state, { target: { uid: pick }, until: 'endOfTurn' }, ctx);
  },

  // ---- Robots ----
  // { amount } — the next Robot Upgrade you play costs N less (Chief Engineer).
  upgradeDiscount(state, e, ctx) {
    const pl = state.players[ctx.controller];
    pl.upgradeDiscount = (pl.upgradeDiscount ?? 0) + e.amount;
    log(state, `${pl.name}'s next Upgrade costs ${e.amount} less.`);
  },

  // { target } — counts one Upgrade on the minion and announces it (Scrapper Spider, Overclocked Destroyer).
  markUpgrade(state, e, ctx) {
    each(state, e.target, ctx, (m) => {
      if (m.kind !== 'minion') return;
      m.upgrades = (m.upgrades ?? 0) + 1;
      emit(state, { type: 'upgradeInstalled', target: m.uid, player: m.controller, cardId: ctx.cardId });
    });
  },

  // { target, name, attack, trigger } — attach a Weapon. One Weapon slot: a new one replaces the old
  // (its Attack bonus and its effect go). Also counts as an Upgrade.
  equipWeapon(state, e, ctx) {
    each(state, e.target, ctx, (m) => {
      if (m.kind !== 'minion') return;
      if (m.weapon) {
        m.attack = Math.max(0, m.attack - (m.weapon.attack ?? 0));
        m.grantedTriggers = (m.grantedTriggers ?? []).filter((t) => !t.weapon);
        log(state, `${nameOf(state, m)} drops its ${m.weapon.name}.`);
      }
      m.weapon = { name: e.name, attack: e.attack ?? 0 };
      m.attack += e.attack ?? 0;
      if (e.trigger) (m.grantedTriggers ??= []).push({ ...e.trigger, controller: ctx.controller, weapon: true });
      log(state, `${nameOf(state, m)} equips ${e.name}${e.attack ? ` (+${e.attack} Attack)` : ''}.`);
      if (e.attack > 0) emit(state, { type: 'attackGained', target: m.uid, player: m.controller, amount: e.attack });
    });
    EFFECT_OPS.markUpgrade(state, { target: e.target }, ctx);
  },

  // ---- Divine ----
  // { target, amount } — +N maximum Health, then restore N Health (Blessing of Vitality, Beacon Angel, Archangel).
  vitality(state, e, ctx) {
    each(state, e.target, ctx, (c) => {
      if (c.health <= 0 || c.destroyed) return;
      c.maxHealth += e.amount;
      log(state, `${nameOf(state, c)} gains +${e.amount} maximum Health.`);
      emit(state, { type: 'bonusHealth', target: c.uid, player: c.controller ?? c.owner, amount: e.amount });
      heal(state, c.uid, e.amount, { source: ctx.self });
    });
  },

  // ---- Demons ----
  // Infernal Summoning: pay Health equal to your Summoning Tier, summon a random
  // Demon of that cost, then the Tier rises by 1 (both cap at 10).
  // Fusion options: { pay: false } (Health paid elsewhere), { rise: false }, { keywords }, { healBack: true }.
  infernalSummon(state, e, ctx) {
    const pl = state.players[ctx.controller];
    const tier = Math.min(10, pl.summonTier ?? 1);
    if (e.pay !== false) loseHealth(state, pl.hero.uid, tier, { forSummon: true });
    // No Demon at exactly this cost: the closest cheaper one.
    let pool = [];
    for (let c = tier; c >= 1 && !pool.length; c--) {
      pool = collectibleMinions((card) => card.faction === 'Demons' && (card.tribes ?? []).includes('Demon') && card.cost === c).map((card) => card.id);
    }
    if (e.rise !== false) pl.summonTier = Math.min(10, tier + 1);
    log(state, `😈 Infernal Summoning (Tier ${tier}).`);
    if (e.healBack) heal(state, pl.hero.uid, tier, { overheal: true, source: ctx.self });
    if (!pool.length) return;
    const m = summonMinion(state, ctx.controller, pickRandom(state, pool), { keywords: e.keywords });
    if (m) { ctx.summoned = m.uid; enterBattlefield(state, m); }
  },

  // { target } — destroy a friendly minion; your Hero restores Health equal to its Mana cost (Soul Sacrifice).
  sacrifice(state, e, ctx) {
    each(state, e.target, ctx, (c) => {
      if (c.kind !== 'minion') return;
      c.destroyed = true;
      log(state, `${nameOf(state, c)} is sacrificed.`);
      heal(state, heroOf(state, ctx.controller).uid, getCard(c.cardId).cost ?? 0, { source: ctx.self });
    });
  },

  // { to } — the attack being declared now hits `to` instead (Unleash the Beast).
  redirectAttack(state, e, ctx) {
    const to = resolveSelector(state, e.to, ctx)[0];
    const step = state.queue.find((s) => s.kind === 'combat' && s.attacker === ctx.event?.source);
    if (!to || !step) return;
    // onlyFromHero: only an attack aimed at a Hero is taken over.
    if (e.onlyFromHero && findCharacter(state, step.defender)?.kind !== 'hero') return;
    step.defender = to;
    log(state, `The attack is redirected to ${nameOf(state, findCharacter(state, to))}.`);
  },

  // { attacker, defender } — the two fight right away (Gateway Collapse).
  fight(state, e, ctx) {
    const a = resolveSelector(state, e.attacker, ctx)[0];
    const d = resolveSelector(state, e.defender, ctx)[0];
    if (!a || !d) return;
    log(state, `${nameOf(state, findCharacter(state, a))} attacks ${nameOf(state, findCharacter(state, d))}.`);
    pushFront(state, [{ kind: 'combat', attacker: a, defender: d }, { kind: 'deaths' }]);
  },

  // Card to summon: cardId | pool: [ids] (random each) | copyOf: selector | eventCard: true
  //   | randomMinion: { tribe?, costFromDead? }
  // { count?, side?: 'friendly' | 'enemy', attack?, health?, keywords?, randomKeywords? }
  summon(state, e, ctx) {
    const p = e.side === 'enemy' ? opponentOf(ctx.controller) : ctx.controller;
    let fixed = e.cardId;
    if (e.copyOf) fixed = findCharacter(state, resolveSelector(state, e.copyOf, ctx)[0])?.cardId;
    if (e.eventCard) fixed = ctx.event?.cardId;
    let pool = e.pool;
    // A random friendly Zombie that died this game (Raise the Dead, Graveyard Awakening).
    if (e.fromDeadZombies) pool = [...new Set(state.players[ctx.controller].deadZombies ?? [])];
    // fromGraveyard: { tribes?: [...] } — a random friendly minion that died this game (Fusions).
    if (e.fromGraveyard) {
      const tribes = e.fromGraveyard.tribes;
      pool = [...new Set(state.players[ctx.controller].graveyard.map((g) => g.cardId).filter((id) => {
        const c = getCard(id);
        return c.type === 'minion' && !c.token && (!tribes || tribes.some((t) => hasTribe(c.tribes, t)));
      }))];
      if (!pool.length) { log(state, 'No such minion has died yet.'); return; }
    }
    if (e.randomMinion) {
      // { tribe?, costFromDead? } — e.g. "a random Dinosaur that costs the same as the Egg".
      const cost = e.randomMinion.costFromDead ? ctx.event?.dead?.storedCost : e.randomMinion.cost;
      pool = collectibleMinions((c) => cardMatches(c, e.randomMinion) && (cost == null || c.cost === cost)).map((c) => c.id);
    }
    if (!fixed && !pool?.length) { if (e.fromDeadZombies) log(state, 'No friendly Zombie has died yet.'); return; }
    // countFromCorpses: { per, max } — one per N friendly Corpses (Zombie Apocalypse).
    // countPerDepth: { max } — one per circle the battle has sunk (Lilith).
    const count = e.countFromCorpses
      ? Math.min(e.countFromCorpses.max ?? 99, Math.floor((state.players[ctx.controller].corpses ?? 0) / e.countFromCorpses.per))
      : e.countPerDepth ? Math.min(e.countPerDepth.max ?? 7, descentDepth(state)) : (e.count ?? 1);
    for (let i = 0; i < count; i++) {
      // distinct: never the same card twice (Sanguine Recollection).
      if (e.distinct && !fixed && !pool.length) break;
      let cardId = fixed ?? pickRandom(state, pool);
      // replaceIfControls: { cardId, with } — summon `with` instead while you control that card
      // (Mycelia, the Hive Mind: Infections raise Clickers instead of Rage Runners).
      const swap = e.replaceIfControls && state.players[p].board.some((x) => x.cardId === e.replaceIfControls.cardId && x.health > 0 && !x.destroyed);
      if (swap) cardId = e.replaceIfControls.with;
      if (e.distinct && !fixed) pool = pool.filter((id) => id !== cardId);
      // bonusIfControls: { cardId, attack, health } — bigger while you control that card (The Outbreak).
      const bonus = !swap && e.bonusIfControls && state.players[p].board.some((x) => x.cardId === e.bonusIfControls.cardId && x.health > 0 && !x.destroyed) ? e.bonusIfControls : null;
      const base = bonus ? getCard(cardId) : null;
      const m = summonMinion(state, p, cardId, { attack: bonus ? base.attack + bonus.attack : e.attack, health: bonus ? base.health + bonus.health : e.health, keywords: e.keywords });
      if (m) ctx.summoned = m.uid;
      if (m && e.regen) m.regen = e.regen; // Acidic: Regenerate on a summoned copy
      // lookOfDead: drawn in the faction of the minion whose Exit this is (Rage Runners). Art only.
      if (m && e.lookOfDead) { const f = getCard(ctx.cardId)?.faction; if (f) m.lookFaction = f; }
      if (m && e.loseKeywords) for (const k of e.loseKeywords) removeKeyword(m, k);
      if (m && e.randomKeywords) {
        for (const k of randomKeywords(state, RANDOM_KEYWORD_POOL, m.keywords, e.randomKeywords)) addKeyword(m, k, false, state);
      }
      if (m) enterBattlefield(state, m);
    }
  },

  // ---- Bees ----
  // The Living Hive's Exit: the Queen emerges, with any Health Royal Chambers stored up.
  queenEmerges(state, e, ctx) {
    const pl = state.players[ctx.controller];
    if (pl.queenUnderground) { log(state, '🕳️ The Hive falls, but it is empty: the Queen is safe Underground.'); return; }
    pl.queenEmerged = true;
    const m = summonMinion(state, ctx.controller, 'the_queen');
    if (!m) return;
    ctx.summoned = m.uid;
    const bonus = pl.queenBonusHealth ?? 0;
    if (bonus) { m.health += bonus; m.maxHealth += bonus; }
    log(state, `👑 The Queen emerges from the Hive${bonus ? ` (+${bonus} Health from Royal Chambers)` : ''}!`);
    enterBattlefield(state, m);
  },

  // Burrow the Queen (Hornet expansion): dig a Hidden Nest and move the Queen into it, from the
  // board (keeping her stats and keywords) or from inside the Living Hive (she hasn't emerged yet).
  // If she is gone for good, the Nest is dug empty.
  burrowQueen(state, e, ctx) {
    const pl = state.players[ctx.controller];
    const queen = pl.board.find((m) => m.cardId === 'the_queen');
    if (queen) {
      pl.queenUnderground = { attack: queen.attack, health: queen.health, maxHealth: queen.maxHealth, keywords: [...queen.keywords] };
      pl.board.splice(pl.board.indexOf(queen), 1);
      log(state, '👑 The Queen retreats Underground.');
    } else if (!pl.queenEmerged && !(pl.uniquesDead ?? []).includes('the_queen')) {
      pl.queenUnderground = { fromHive: true };
      log(state, '👑 The Queen is carried out of the Hive and Underground.');
    }
    const nest = summonMinion(state, ctx.controller, 'underground_nest');
    if (!nest) {
      // No room for the Nest: she stays where she was.
      if (queen) { pl.board.push(queen); }
      pl.queenUnderground = null;
      return;
    }
    ctx.summoned = nest.uid;
    enterBattlefield(state, nest);
  },

  // The Queen comes back out of the Hidden Nest with { attack, health, keywords? } more
  // (the Nest's Exit, The Hornet Empress).
  queenResurfaces(state, e, ctx) {
    const pl = state.players[ctx.controller];
    const under = pl.queenUnderground;
    if (!under) return;
    const card = getCard('the_queen');
    const base = under.fromHive
      ? { attack: card.attack, health: card.health + (pl.queenBonusHealth ?? 0), keywords: [] }
      : { ...under, health: under.health, keywords: under.keywords };
    const m = summonMinion(state, ctx.controller, 'the_queen', { attack: base.attack + (e.attack ?? 0), health: base.health + (e.health ?? 0), keywords: [...base.keywords, ...(e.keywords ?? [])] });
    if (!m) return; // board full: she stays Underground
    pl.queenUnderground = null;
    pl.queenEmerged = true;
    if (!under.fromHive) m.maxHealth = Math.max(m.health, under.maxHealth + (e.health ?? 0));
    ctx.summoned = m.uid;
    log(state, `👑 The Queen bursts out of the Hidden Nest (+${e.attack ?? 0}/+${e.health ?? 0})!`);
    enterBattlefield(state, m);
  },

  // ---- Plants: Carnivorous Garden ----
  // Devour: the minion that just destroyed an enemy gains +1/+1.
  devour(state, e, ctx) {
    const c = findCharacter(state, ctx.self);
    if (!c || c.kind !== 'minion' || c.health <= 0 || c.destroyed) return;
    applyBuff(state, c, { attack: 1, health: 1 });
    log(state, `🌿 ${nameOf(state, c)} devours its prey (+1/+1).`);
    emit(state, { type: 'devoured', source: c.uid, player: c.controller });
  },

  // Titan Arum: destroy the enemy minion with the highest Attack and gain its Attack and Health.
  devourStrongest(state, e, ctx) {
    const me = findCharacter(state, ctx.self);
    const foes = state.players[opponentOf(ctx.controller)].board.filter((m) => m.health > 0 && !m.destroyed);
    if (!foes.length) return;
    const top = Math.max(...foes.map((m) => effectiveAttack(m)));
    const prey = pickRandom(state, foes.filter((m) => effectiveAttack(m) === top));
    const atk = effectiveAttack(prey), hp = Math.max(0, prey.health);
    prey.destroyed = true;
    prey.lastDamagedBy = ctx.self;
    prey.lastDamagedByController = ctx.controller;
    log(state, `🌺 ${nameOf(state, me ?? prey)} devours ${nameOf(state, prey)}!`);
    if (me && me.health > 0) applyBuff(state, me, { attack: atk, health: hp });
  },

  // Royal Chamber: the Queen has +1 Health (now if she's in play, otherwise when she emerges).
  royalChamber(state, e, ctx) {
    const pl = state.players[ctx.controller];
    const queen = pl.board.find((m) => m.cardId === 'the_queen');
    const under = pl.queenUnderground;
    if (queen) applyBuff(state, queen, { health: e.amount ?? 1 });
    else if (under && !under.fromHive) { under.health += e.amount ?? 1; under.maxHealth += e.amount ?? 1; }
    else if (!pl.queenEmerged) pl.queenBonusHealth = (pl.queenBonusHealth ?? 0) + (e.amount ?? 1);
  },

  // { target, tribe }
  addTribe(state, e, ctx) {
    each(state, e.target, ctx, (c) => {
      if (c.kind === 'minion' && !c.tribes.includes(e.tribe)) c.tribes.push(e.tribe);
      log(state, `${nameOf(state, c)} becomes a ${e.tribe}.`);
    });
  },

  // { target, attack, health, name? } — set base stats (Queen of the Red Veil: 3/3 Blood Shades).
  setStats(state, e, ctx) {
    each(state, e.target, ctx, (c) => {
      if (c.kind !== 'minion') return;
      c.attack = e.attack;
      c.maxHealth = e.health;
      c.health = e.health;
      if (e.look) c.look = e.look; // drawn as that card on the board (Blood Shades)
      log(state, `${nameOf(state, c)} becomes a ${e.attack}/${e.health}${e.name ? ` ${e.name}` : ''}.`);
    });
  },

  // { key, effects } — runs at most once per turn for this minion (Lord of the Unburied).
  oncePerTurn(state, e, ctx) {
    const self = findCharacter(state, ctx.self);
    if (!self) return;
    self.oncePerTurn ??= {};
    if (self.oncePerTurn[e.key] === state.turn) return;
    self.oncePerTurn[e.key] = state.turn;
    for (const sub of e.effects) resolveEffect(state, sub, ctx);
  },

  // { count: selector, attack?, health? } — self gains stats per matching character.
  gainStatsPerCount(state, e, ctx) {
    const self = findCharacter(state, ctx.self);
    if (!self) return;
    const n = Math.min(e.max ?? 99, resolveSelector(state, e.count, ctx).length);
    if (n > 0) applyBuff(state, self, { attack: n * (e.attack ?? 0), health: n * (e.health ?? 0) });
  },

  // { per, attack?, health? } — per `per` Health your Hero is currently missing.
  buffPerHealthLost(state, e, ctx) {
    const self = findCharacter(state, ctx.self);
    if (!self) return;
    const h = heroOf(state, ctx.controller);
    const n = Math.floor(Math.max(0, h.maxHealth - h.health) / e.per);
    if (n > 0) applyBuff(state, self, { attack: n * (e.attack ?? 0), health: n * (e.health ?? 0) });
  },

  // Temporary Mana Crystal(s) usable next turn only.
  gainManaNextTurn(state, e, ctx) {
    state.players[ctx.controller].mana.bonusNextTurn += e.amount;
    log(state, `${state.players[ctx.controller].name} will gain ${e.amount} temporary Mana next turn.`);
  },

  // { target, until: 'endOfTurn' | 'controllersNextTurnEnd' }
  // 'endOfTurn' returns the minion at the end of the current turn; the other
  // (Succubus) at the end of the new controller's next turn-end.
  takeControlTemporarily(state, e, ctx) {
    each(state, e.target, ctx, (m) => {
      if (m.kind !== 'minion' || m.controller === ctx.controller) return;
      const from = state.players[m.controller];
      const to = state.players[ctx.controller];
      if (to.board.length >= state.rules.maxBoardSize) return;
      from.board.splice(from.board.indexOf(m), 1);
      to.board.push(m);
      const returnAt = e.until === 'endOfTurn' ? state.activePlayer : ctx.controller;
      m.tempControl = { returnTo: m.controller, returnAtEndOfTurnOf: returnAt };
      m.controller = ctx.controller;
      m.sick = !!e.keepSick; // keepSick: only Rush lets it attack (Mind Control Beam)
      m.attacksThisTurn = 0;
      log(state, `${to.name} takes control of ${nameOf(state, m)}.`);
    });
  },

  // { count?, filter?: { type?, tribe? } } — draws matching cards when filtered.
  // { count, filter?, side?: 'enemy' } — side 'enemy': your opponent draws.
  draw(state, e, ctx) {
    const p = e.side === 'enemy' ? opponentOf(ctx.controller) : ctx.controller;
    drawCards(state, p, e.count ?? 1, e.filter ? (card) => cardMatches(card, e.filter) : null);
  },

  // ---- Demons: Kings of Hell ----
  // Tithe N: both players draw N cards (you first).
  tithe(state, e, ctx) {
    log(state, `🪙 Tithe ${e.count}: both players draw.`);
    drawCards(state, ctx.controller, e.count);
    drawCards(state, opponentOf(ctx.controller), e.count);
  },
  // { max, damagePerEnemyCard } — both players draw until they hold `max` cards; then deal damage
  // to the enemy Hero for each card the opponent drew (Bael).
  fillHands(state, e, ctx) {
    const me = state.players[ctx.controller], foe = state.players[opponentOf(ctx.controller)];
    drawCards(state, ctx.controller, Math.max(0, Math.min(e.max, maxHand(state)) - me.hand.length));
    const n = Math.max(0, Math.min(e.max, maxHand(state)) - foe.hand.length);
    drawCards(state, opponentOf(ctx.controller), n);
    if (n && e.damagePerEnemyCard) dealDamage(state, ctx.self, foe.hero.uid, n * e.damagePerEnemyCard, { sourceController: ctx.controller });
  },
  // { amount } — your next Demon this turn costs less (Infernal Contract).
  demonDiscount(state, e, ctx) {
    state.players[ctx.controller].demonDiscount = { turn: state.turn, amount: e.amount };
  },
  // { amount } — the card just drawn costs more this turn (Royal Tax).
  taxDrawn(state, e, ctx) {
    const pl = state.players[ctx.event?.player];
    const inst = pl?.hand.find((h) => h.uid === ctx.event?.cardUid);
    if (!inst) return;
    inst.taxTurn = state.turn; inst.tax = (inst.tax ?? 0) + e.amount;
    log(state, `🪙 ${getCard(inst.cardId).name} is taxed: +${e.amount} cost this turn.`);
  },

  // Discover: choose 1 of up to 3 different matching cards from your deck; it goes to your hand.
  // { from: 'deck', filter }
  discover(state, e, ctx) {
    const deck = state.players[ctx.controller].deck;
    const byCard = new Map();
    for (const inst of deck) if (cardMatches(getCard(inst.cardId), e.filter) && !byCard.has(inst.cardId)) byCard.set(inst.cardId, inst.uid);
    const options = shuffle(state, [...byCard].map(([cardId, uid]) => ({ cardId, uid }))).slice(0, 3);
    if (!options.length) { log(state, 'Nothing to Discover.'); return; }
    state.pending = { type: 'choice', player: ctx.controller, prompt: 'Discover a card', options, resolve: 'deckToHand', costMod: e.costMod ?? 0 };
  },

  // { target, count?, costChange? } — add copies of the target's card to your hand.
  copyToHand(state, e, ctx) {
    each(state, e.target, ctx, (c) => {
      if (c.kind !== 'minion') return;
      for (let i = 0; i < (e.count ?? 1); i++) addToHand(state, ctx.controller, c.cardId, e.costChange ? { costMod: e.costChange } : {});
    });
  },

  // ---- Plants (Harvest Moon): Shell ops ----
  // { target?, count? } — put the chosen friendly Plant (then random others, up to `count`) inside self's Shell.
  shellIn(state, e, ctx) {
    const pumpkin = findCharacter(state, ctx.self);
    if (!pumpkin || !shellOf(pumpkin)) return;
    const want = e.count ?? 1;
    let n = 0;
    const chosen = e.target ? resolveSelector(state, e.target, ctx).map((id) => findCharacter(state, id)) : [];
    for (const m of chosen) if (n < want && minionPasses(m, { tribe: 'Plant', notTribe: 'Pumpkin' }) && tuckIntoShell(state, pumpkin, m)) n += 1;
    while (n < want && shellRoom(pumpkin) > 0) {
      const pool = state.players[pumpkin.controller].board.filter((m) => m !== pumpkin && m.health > 0 && !m.destroyed && minionPasses(m, { tribe: 'Plant', notTribe: 'Pumpkin' }));
      const m = pickRandom(state, pool);
      if (!m || !tuckIntoShell(state, pumpkin, m)) break;
      n += 1;
    }
  },

  // { target, cardId } — a new minion grows straight inside the target Pumpkin's Shell.
  shellSpawn(state, e, ctx) {
    for (const id of resolveSelector(state, e.target, ctx)) spawnIntoShell(state, findCharacter(state, id), e.cardId);
  },

  // { target, attack?, health?, heal? } — the Plants inside the target Pumpkins get a buff / healing.
  shellBuff(state, e, ctx) {
    for (const id of resolveSelector(state, e.target, ctx)) {
      const pumpkin = findCharacter(state, id);
      for (const m of shellHeld(pumpkin)) {
        if (e.attack) m.attack += e.attack;
        if (e.health) { m.maxHealth += e.health; m.health += e.health; }
        if (e.heal && m.health < m.maxHealth) {
          const h = Math.min(e.heal, m.maxHealth - m.health);
          m.health += h;
          log(state, `🕯 ${nameOf(state, m)} is healed for ${h} inside ${nameOf(state, pumpkin)}.`);
        }
        if (e.attack || e.health) log(state, `${nameOf(state, m)} gains +${e.attack ?? 0}/+${e.health ?? 0} inside ${nameOf(state, pumpkin)}.`);
      }
    }
  },

  // Rotting Carve: { target, attack, health } — break the friendly Pumpkin open: its Plants burst out
  // with the bonus, the Pumpkin is destroyed, and each Plant deals damage equal to its Attack to a random enemy.
  carvePumpkin(state, e, ctx) {
    for (const id of resolveSelector(state, e.target, ctx)) {
      const pumpkin = findCharacter(state, id);
      if (!pumpkin || pumpkin.kind !== 'minion') continue;
      const board = state.players[pumpkin.controller].board;
      const out = burstShell(state, pumpkin, board.indexOf(pumpkin) + 1, { attack: e.attack ?? 0, health: e.health ?? 0 });
      pumpkin.destroyed = true;
      pumpkin.lastDamagedBy = ctx.self;
      pumpkin.lastDamagedByController = ctx.controller;
      for (const m of out) {
        const foes = [heroOf(state, opponentOf(m.controller)), ...state.players[opponentOf(m.controller)].board.filter((x) => x.health > 0 && !x.destroyed)];
        const t = pickRandom(state, foes);
        if (t) dealDamage(state, m.uid, t.uid, effectiveAttack(m));
      }
    }
  },

  // Hallowroot: { target } — take one Plant out of the friendly Pumpkin, gain its Attack and Health,
  // and put a Seedling inside in its place.
  harvestShell(state, e, ctx) {
    const self = findCharacter(state, ctx.self);
    for (const id of resolveSelector(state, e.target, ctx)) {
      const pumpkin = findCharacter(state, id);
      const held = shellHeld(pumpkin);
      if (!self || !held.length) continue;
      const m = held.shift();
      self.attack += effectiveAttack(m);
      self.maxHealth += m.health; self.health += m.health;
      state.players[m.owner].graveyard.push({ uid: m.uid, cardId: m.cardId, owner: m.owner });
      log(state, `${nameOf(state, self)} reaps ${nameOf(state, m)} from ${nameOf(state, pumpkin)} (+${effectiveAttack(m)}/+${m.health}).`);
      spawnIntoShell(state, pumpkin, e.cardId ?? 'seedling');
    }
  },

  // { target, costChange? } — return a minion to its owner's hand.
  returnToHand(state, e, ctx) {
    each(state, e.target, ctx, (m) => {
      if (m.kind !== 'minion') return;
      exitOnLeave(state, m);
      const board = state.players[m.controller].board;
      const at = board.indexOf(m);
      board.splice(at, 1);
      log(state, `${nameOf(state, m)} returns to ${state.players[m.owner].name}'s hand.`);
      burstShell(state, m, at);
      addToHand(state, m.owner, m.cardId, e.costChange ? { costMod: e.costChange } : {});
    });
  },

  // { target } — the minion returns to its owner's hand at the end of the turn.
  returnAtEndOfTurn(state, e, ctx) {
    each(state, e.target, ctx, (m) => { if (m.kind === 'minion') m.returnAtEndOfTurn = true; });
  },

  // Transform into a fixed card (`into`) or a random minion from `pool`:
  // { target, into? , pool?: { type?, tribe?, faction?, costDelta? }, storeCost? }
  // storeCost remembers the original Mana Cost on the new minion (Fossilization's Egg).
  transform(state, e, ctx) {
    each(state, e.target, ctx, (m) => {
      if (m.kind !== 'minion') return;
      const originalCost = getCard(m.cardId).cost;
      let intoId = e.into;
      if (!intoId) {
        const cost = originalCost + (e.pool.costDelta ?? 0);
        intoId = pickRandom(state, collectibleMinions((c) => cardMatches(c, e.pool) && c.cost === cost && c.id !== m.cardId))?.id;
      }
      if (!intoId) { log(state, `${nameOf(state, m)} has nothing to transform into.`); return; }
      const card = getCard(intoId);
      if (e.storeCost) m.storedCost = originalCost;
      exitOnLeave(state, m);
      // keepHealthBonus: Health it had gained over its card stays (Selective Breeding).
      const bonus = e.keepHealthBonus ? Math.max(0, m.maxHealth - (getCard(m.cardId).health ?? 0)) : 0;
      log(state, `${nameOf(state, m)} transforms into ${card.name}.`);
      Object.assign(m, {
        cardId: card.id, attack: card.attack, health: card.health, maxHealth: card.health,
        tempAttack: 0, lingerAttack: [], tempHealth: 0, auraHealth: 0,
        keywords: [...(card.keywords ?? [])], tempKeywords: [], statics: [...(card.statics ?? [])],
        tribes: [...(card.tribes ?? [])], faction: card.faction,
      });
      if (bonus) { m.maxHealth += bonus; m.health += bonus; }
      // Harvest Moon: a Pumpkin turned into something without a Shell lets its Plants out.
      if (!card.shell && m.shell?.length) { const b = state.players[m.controller].board; burstShell(state, m, b.indexOf(m) + 1); }
    });
  },

  // { target } — Accelerated Incubation: its Exit also fires if it leaves without dying.
  exitOnLeave(state, e, ctx) {
    each(state, e.target, ctx, (c) => { if (c.kind === 'minion') c.exitOnLeave = true; });
  },

  // { target } — Selective Breeding: choose a different Dinosaur Egg for it to become
  // (Health it gained stays).
  chooseEgg(state, e, ctx) {
    const m = findCharacter(state, resolveSelector(state, e.target, ctx)[0]);
    if (!m || m.kind !== 'minion') return;
    const eggs = collectibleMinions((c) => (c.tribes ?? []).includes('Egg') && c.id !== m.cardId);
    if (!eggs.length) return;
    state.pending = {
      type: 'choice', player: ctx.controller, prompt: 'Choose the Egg it becomes', resolve: 'effects', ctx,
      options: eggs.map((c) => ({ label: c.name, cardId: c.id, effects: [{ op: 'transform', target: { uid: m.uid }, into: c.id, keepHealthBonus: true }] })),
    };
  },

  // { target, noExit? }
  // Tarman: { target } — drags a minion down into the tar (destroyed), with a log line the UI animates.
  tarPit(state, e, ctx) {
    each(state, e.target, ctx, (c) => {
      if (c.kind !== 'minion' || c.health <= 0 || c.destroyed) return;
      log(state, `🛢 ${nameOf(state, c)} is dragged down into the tar!`);
      EFFECT_OPS.destroy(state, { target: { uid: c.uid } }, ctx);
    });
  },

  destroy(state, e, ctx) {
    each(state, e.target, ctx, (c) => {
      if (c.kind !== 'minion') return;
      if (e.noExit) c.noExit = true;
      if (e.obliterate) c.obliterate = true; // removed: no Graveyard, Exit or Reborn (Return to the Stomach)
      c.destroyed = true;
      c.lastDamagedBy = ctx.self;
      c.lastDamagedByController = ctx.controller;
    });
  },

  // The Last Exorcist: destroy Dark minions on the enemy board and in their hand.
  destroyDarkMinions(state, _e, ctx) {
    const enemy = state.players[opponentOf(ctx.controller)];
    const isDarkMinionCard = (card) => card.type === 'minion' && (card.tags ?? FACTION_TAGS[card.faction] ?? []).includes('Dark');
    for (const minion of enemy.board) {
      if (!isDarkMinionCard(getCard(minion.cardId))) continue;
      minion.destroyed = true;
      minion.lastDamagedBy = ctx.self;
      minion.lastDamagedByController = ctx.controller;
    }
    const kept = [];
    for (const inst of enemy.hand) {
      const card = getCard(inst.cardId);
      if (!isDarkMinionCard(card)) { kept.push(inst); continue; }
      enemy.graveyard.push(inst);
      log(state, `☀ ${enemy.name}'s ${card.name} is destroyed in hand.`);
      emit(state, { type: 'cardBurned', player: enemy.index, by: ctx.controller, cardId: card.id, cardUid: inst.uid, from: 'hand' });
    }
    enemy.hand = kept;
  },

  // Mushrooms (Fungus): { count, countPer?: selector, onto?: 'eventCard' }
  // Each Mushroom lands on a random card in the enemy deck (they can stack).
  // countPer: count × the number of matching characters (Mycelium Lord).
  // onto 'eventCard': all of them onto the card the event names (Hidden Spores).
  placeMushrooms(state, e, ctx) {
    const p = opponentOf(ctx.controller);
    const pl = state.players[p];
    const n = (e.count ?? 1) * (e.countPer ? resolveSelector(state, e.countPer, ctx).length : 1);
    if (n <= 0) return;
    if (e.onto === 'eventCard') {
      const uid = ctx.event?.cardUid;
      const inst = [...pl.hand, ...pl.graveyard, ...pl.deck].find((c) => c.uid === uid);
      if (!inst) return;
      inst.mushrooms = (inst.mushrooms ?? 0) + n;
      log(state, `🍄 ${n} Mushroom${n === 1 ? '' : 's'} sprout on the card ${pl.name} drew.`);
      return;
    }
    if (!pl.deck.length) { log(state, `${pl.name} has no cards in their deck for Mushrooms.`); return; }
    for (let i = 0; i < n; i++) {
      const inst = pickRandom(state, pl.deck);
      inst.mushrooms = (inst.mushrooms ?? 0) + 1;
    }
    log(state, `🍄 ${n} Mushroom${n === 1 ? '' : 's'} placed in ${pl.name}'s deck.`);
  },

  // { target, trigger: { on, filter?, effects } } — attach an ability to minions
  // (Fungal Infection, Consume Decay). It acts for the player who granted it.
  // { target } — Infect (Zombies): mark enemy minions; when an Infected minion dies, whoever
  // Infected it summons a 2/1 Rage Runner with Rush (+2/+2 while they control The Outbreak).
  // A minion is Infected once; Infecting it again does nothing.
  infect(state, e, ctx) {
    each(state, e.target, ctx, (m) => {
      if (m.kind !== 'minion' || m.health <= 0 || m.destroyed || m.infected != null) return;
      m.infected = ctx.controller;
      m.grantedTriggers ??= [];
      m.grantedTriggers.push({ on: 'deathrattle', controller: ctx.controller, infection: true,
        effects: [{ op: 'summon', cardId: 'rage_runner', lookOfDead: true, bonusIfControls: { cardId: 'the_outbreak', attack: 2, health: 2 }, replaceIfControls: { cardId: 'mycelia_the_hive_mind', with: 'clicker' } }] });
      log(state, `🦠 ${nameOf(state, m)} is Infected.`);
      emit(state, { type: 'infected', target: m.uid, player: m.controller, by: ctx.controller });
    });
  },

  grantTrigger(state, e, ctx) {
    each(state, e.target, ctx, (m) => {
      if (m.kind !== 'minion') return;
      m.grantedTriggers ??= [];
      m.grantedTriggers.push({ ...e.trigger, controller: ctx.controller, ...(e.temporary ? { temporary: true } : {}) });
    });
    if (e.log) log(state, e.log);
  },

  // { target, cantAttack? } — gain control of a minion permanently (Cordyceps Mind Control).
  takeControl(state, e, ctx) {
    each(state, e.target, ctx, (m) => {
      if (m.kind !== 'minion' || m.controller === ctx.controller) return;
      const from = state.players[m.controller];
      const to = state.players[ctx.controller];
      if (to.board.length >= state.rules.maxBoardSize) { log(state, `${to.name}'s board is full.`); return; }
      from.board.splice(from.board.indexOf(m), 1);
      to.board.push(m);
      m.controller = ctx.controller;
      m.tempControl = null;
      m.attacksThisTurn = 0;
      if (e.cantAttack) m.cantAttackThisTurn = true;
      log(state, `${to.name} takes control of ${nameOf(state, m)}.`);
    });
  },

  // ---- Zombies: Corpses ----
  // { count, effects, otherwise? } — spend friendly Corpses; the effects happen only if you had
  // enough (otherwise the `otherwise` effects do: Return to the Soil).
  // { upTo, each } — spend as many as you have, up to N, and repeat `each` once per Corpse
  // spent (Sludge Hulk, The Rot King).
  consumeCorpses(state, e, ctx) {
    const pl = state.players[ctx.controller];
    if (e.upTo != null) {
      const n = Math.min(e.upTo, pl.corpses ?? 0);
      if (!n) { log(state, 'No Corpses to spend.'); return; }
      pl.corpses -= n;
      log(state, `🪦 ${pl.name} consumes ${n} Corpse${n === 1 ? '' : 's'}.`);
      for (let i = 0; i < n; i++) for (const sub of e.each ?? []) resolveEffect(state, sub, ctx);
      return;
    }
    if ((pl.corpses ?? 0) < e.count) {
      if (e.otherwise) { for (const sub of e.otherwise) resolveEffect(state, sub, ctx); return; }
      log(state, `Not enough Corpses (${pl.corpses ?? 0}/${e.count}).`); return;
    }
    pl.corpses -= e.count;
    log(state, `🪦 ${pl.name} consumes ${e.count} Corpse${e.count === 1 ? '' : 's'}.`);
    for (const sub of e.effects ?? []) resolveEffect(state, sub, ctx);
  },

  // { count, side?: 'friendly' | 'enemy' } — create Corpses.
  addCorpses(state, e, ctx) {
    const p = e.side === 'enemy' ? opponentOf(ctx.controller) : ctx.controller;
    const pl = state.players[p];
    pl.corpses = (pl.corpses ?? 0) + (e.count ?? 1);
    log(state, `🪦 A Corpse is left on ${pl.name}'s side.`);
  },

  // { count } — the Colonial filter-feeds: each player loses up to `count` Corpses.
  eatCorpses(state, e) {
    for (const pl of state.players) {
      const n = Math.min(e.count ?? 1, pl.corpses ?? 0);
      if (!n) continue;
      pl.corpses -= n;
      log(state, `🧽 A Colonial eats ${n} of ${pl.name}'s Corpse${n === 1 ? '' : 's'}.`);
    }
  },

  // { target, keyword, attack, attackIfHas } — Zombie Surge: those without the keyword
  // gain it and `attack` this turn; those that already had it gain `attackIfHas` instead.
  surge(state, e, ctx) {
    each(state, e.target, ctx, (m) => {
      if (hasKeyword(m, e.keyword)) applyBuff(state, m, { attack: e.attackIfHas, temporary: true });
      else applyBuff(state, m, { attack: e.attack, temporary: true, temporaryKeywords: [e.keyword] });
    });
  },

  // ---- Acidic ----
  // { target, amount, drawPerZeroed?: max, healHeroByLost? } — apply Corrosion (core corrode).
  // drawPerZeroed: draw a card per minion this brought to 0 Attack (Caustic Bath).
  // healHeroByLost: restore your Hero's Health by the Attack lost (Hemolytic Draught).
  corrode(state, e, ctx) {
    let zeroed = 0;
    let lost = 0;
    each(state, e.target, ctx, (c) => {
      const before = effectiveAttack(c);
      lost += corrode(state, c, e.amount, ctx.controller);
      if (before > 0 && c.kind === 'minion' && effectiveAttack(c) === 0) zeroed++;
    });
    if (e.drawPerZeroed && zeroed) drawCards(state, ctx.controller, Math.min(e.drawPerZeroed, zeroed));
    if (e.healHeroByLost && lost > 0) heal(state, heroOf(state, ctx.controller).uid, lost, { source: ctx.self });
  },
  // { target }
  acidCoat(state, e, ctx) {
    each(state, e.target, ctx, (c) => acidCoat(state, c));
  },
  // { target } — Dissolve (core dissolve): destroy it, distilling it into a spell for you.
  dissolve(state, e, ctx) {
    each(state, e.target, ctx, (c) => dissolve(state, c, ctx.controller, { whole: !!e.whole }));
  },
  // { target } — Molecular Breakdown: its temporary buffs are removed.
  removeTempBuffs(state, e, ctx) {
    each(state, e.target, ctx, (c) => { if (c.kind === 'minion') removeTempBuffs(state, c); });
  },
  // Reactive Spill: take back the Attack the triggering buff gave (event.amount), this turn's first.
  undoAttackGain(state, e, ctx) {
    each(state, e.target, ctx, (c) => {
      let left = ctx.event?.amount ?? 0;
      const t = Math.min(left, Math.max(0, c.tempAttack)); c.tempAttack -= t; left -= t;
      if (left > 0) c.attack = Math.max(0, c.attack - left);
      log(state, `🧪 ${nameOf(state, c)} loses the Attack it just gained.`);
    });
  },
  // Stop the attack that opened this window (Rusted Jaws, Emergency Neutralizer).
  stopAttack(state, e, ctx) {
    const step = state.queue.find((s) => s.kind === 'combat' && s.attacker === ctx.event?.source);
    if (!step) return;
    step.cancelled = true;
    log(state, `${nameOf(state, findCharacter(state, step.attacker))}'s attack is stopped.`);
  },
  // { amount, attackPer } — Armor Leech: strip Armor from the enemy Hero; +1 Attack per attackPer removed.
  stripArmor(state, e, ctx) {
    const hero = heroOf(state, opponentOf(ctx.controller));
    const n = Math.min(hero.armor ?? 0, e.amount);
    if (!n) return;
    hero.armor -= n;
    log(state, `🧪 ${n} Armor dissolves from ${nameOf(state, hero)}.`);
    const self = findCharacter(state, ctx.self);
    const gain = Math.floor(n / (e.attackPer ?? 1));
    if (self && gain) applyBuff(state, self, { attack: gain });
  },
  // { from } — Ooze Mimic: this minion's Attack becomes the chosen minion's Attack.
  copyAttack(state, e, ctx) {
    const src = findCharacter(state, resolveSelector(state, e.from, ctx)[0]);
    const self = findCharacter(state, ctx.self);
    if (!src || !self) return;
    self.attack = effectiveAttack(src);
    self.tempAttack = 0;
    log(state, `${nameOf(state, self)} copies ${nameOf(state, src)}'s Attack (${self.attack}).`);
  },
  // Caustic Reservoir: the chosen minion keeps corroding at the start of each of your turns.
  setReservoir(state, e, ctx) {
    const id = resolveSelector(state, e.target, ctx)[0];
    if (id != null) state.players[ctx.controller].reservoir = id;
  },

  // ---- Sharks ----
  // { target, force? } — mark as Prey (without force, only at 3 Health or less).
  // lowest: mark the enemy minion with the least Health instead.
  markPrey(state, e, ctx) {
    if (e.lowest) {
      const enemies = state.players[opponentOf(ctx.controller)].board.filter((m) => m.health > 0 && !m.destroyed);
      if (!enemies.length) return;
      const low = Math.min(...enemies.map((m) => m.health));
      markPrey(state, pickRandom(state, enemies.filter((m) => m.health === low)), true);
      return;
    }
    each(state, e.target, ctx, (c) => markPrey(state, c, !!e.force));
  },

  // Aliens (Hive Brood). { target } — Implant the targets (enemy minions without an Implant yet).
  implant(state, e, ctx) {
    each(state, e.target, ctx, (m) => {
      if (m.kind !== 'minion' || m.health <= 0 || m.destroyed || m.implanted != null) return;
      m.implanted = ctx.controller;
      (m.grantedTriggers ??= []).push({ on: 'deathrattle', controller: ctx.controller, implant: true, effects: [{ op: 'chestburst' }] });
      log(state, `🥚 ${nameOf(state, m)} is Implanted.`);
      emit(state, { type: 'implanted', target: m.uid, player: m.controller, by: ctx.controller, source: ctx.self ?? null });
    });
  },
  // An Implanted minion died (ctx.cardId: the host): a Chestburster bursts out for ctx.controller.
  chestburst(state, e, ctx) {
    const m = summonMinion(state, ctx.controller, 'chestburster');
    if (!m) return;
    m.hostFaction = getCard(ctx.cardId)?.faction ?? null;
    m.evolveProgress = 0;
    log(state, `👽 A Chestburster bursts out of ${getCard(ctx.cardId)?.name ?? 'its host'}!`);
    enterBattlefield(state, m);
    emit(state, { type: 'chestburst', source: m.uid, player: ctx.controller, host: ctx.self ?? null });
    if (controls(state, ctx.controller, 'instantEvolve')) evolveChestburster(state, m);
  },

  // ---- Aliens (The Qu) ----
  // { target, into? } — Remake: the minion Transforms into a Remade human (`into`, or a random one).
  // The Snake Person is cold-blooded: it arrives Frozen and thaws like any Frozen minion.
  remake(state, e, ctx) {
    each(state, e.target, ctx, (m) => {
      if (m.kind !== 'minion' || m.health <= 0 || m.destroyed) return;
      const into = e.into ?? pickRandom(state, REMADE_FORMS.filter((id) => id !== m.cardId));
      log(state, `🧬 The Qu Remake ${nameOf(state, m)}.`);
      EFFECT_OPS.transform(state, { target: { uid: m.uid }, into }, ctx);
      if (getCard(into).arrivesFrozen) addKeyword(m, 'Frozen', false, state);
      emit(state, { type: 'remade', target: m.uid, player: m.controller, by: ctx.controller });
    });
  },
  // { target } — The Remaking: choose which Remade human it becomes.
  chooseRemake(state, e, ctx) {
    const m = findCharacter(state, resolveSelector(state, e.target, ctx)[0]);
    if (!m || m.kind !== 'minion') return;
    state.pending = {
      type: 'choice', player: ctx.controller, prompt: 'Choose what it is Remade into', resolve: 'effects', ctx,
      options: REMADE_FORMS.filter((id) => id !== m.cardId).map((id) => ({ label: getCard(id).name, cardId: id, effects: [{ op: 'remake', target: { uid: m.uid }, into: id }] })),
    };
  },

  // ---- Lycanthropes ----
  // { target, to?: 'beast' | 'human', drawPer? } — Transform the targets (only those that would end in
  // `to`, if given). drawPer: draw a card for every N that transformed (Primal Unleashing).
  // selfPer: N — this minion gains +N/+N for each one (The First Beast). then: effects run for each
  // minion that transformed, as 'chosen' (Instinctive Defense: it gains Taunt).
  shift(state, e, ctx) {
    let n = 0;
    each(state, e.target, ctx, (m) => {
      if (!shiftMinion(state, m, e.to ?? null)) return;
      n += 1;
      for (const sub of e.then ?? []) resolveEffect(state, sub, { ...ctx, chosen: m.uid });
    });
    if (e.drawPer && n >= e.drawPer) drawCards(state, ctx.controller, Math.floor(n / e.drawPer));
    const self = e.selfPer && n ? findCharacter(state, ctx.self) : null;
    if (self) applyBuff(state, self, { attack: n * e.selfPer, health: n * e.selfPer });
  },
  // { target, filter: { form?, full?, ...minion filters }, effects, else? } — effects only for a
  // target that passes (Instinct Surge: "if it is in Beast Form"; Primal Recovery: "if at full Health").
  ifTarget(state, e, ctx) {
    for (const id of resolveSelector(state, e.target, ctx)) {
      const c = findCharacter(state, id);
      if (!c) continue;
      const f = e.filter ?? {};
      const ok = c.kind === 'minion' && (f.full == null || (c.health >= c.maxHealth) === f.full) && minionPasses(c, f);
      for (const sub of (ok ? e.effects : e.else) ?? []) resolveEffect(state, sub, { ...ctx, chosen: id });
    }
  },

  // Sand Sharks. { target } — Burrow the targets (Dig In, Duck Under, Sandstorm Stalker).
  burrow(state, e, ctx) {
    each(state, e.target, ctx, (c) => burrowMinion(state, c));
  },
  // { target, attack? } — Surface Burrowed targets now (Erupt, Tremor Sense: +attack).
  surface(state, e, ctx) {
    each(state, e.target, ctx, (c) => surfaceMinion(state, c, { attack: e.attack ?? 0 }));
  },
  // { target, now? } — the targets can't attack during their controller's next turn
  // (now: nor again this turn).
  exhaust(state, e, ctx) {
    each(state, e.target, ctx, (c) => {
      if (c.kind !== 'minion') return;
      c.exhausted = true;
      if (e.now) c.cantAttackThisTurn = true;
      log(state, `${nameOf(state, c)} can't attack next turn.`);
    });
  },

  // { target } — reveal: the targets lose Stealth (a Burrowed minion is dug out; it doesn't Surface).
  revealStealth(state, e, ctx) {
    each(state, e.target, ctx, (c) => {
      if (!hasKeyword(c, 'Stealth')) return;
      if (c.burrowed) c.burrowed = false;
      loseKeyword(state, c, 'Stealth');
      log(state, `👁 ${nameOf(state, c)} is revealed.`);
    });
  },

  // Hammerhead Scout: reveal a random card in the enemy hand; a minion with 3 or less
  // Health is marked as Prey while it stays there.
  huntHand(state, e, ctx) {
    const hand = state.players[opponentOf(ctx.controller)].hand;
    const inst = pickRandom(state, hand);
    if (!inst) { log(state, 'Their hand is empty.'); return; }
    const card = getCard(inst.cardId);
    log(state, `👁 Revealed from ${state.players[opponentOf(ctx.controller)].name}'s hand: ${card.name}.`);
    if (card.type === 'minion' && (card.health ?? 99) <= (e.maxHealth ?? 3)) { inst.prey = true; log(state, `🩸 ${card.name} is Marked Prey in their hand.`); }
  },

  // Megalodon / Nothing Escapes the Current: destroy a Marked Prey with at most maxHealth Health;
  // otherwise deal otherwiseDamage to it. Uses the chosen target, or (auto) the weakest Prey in
  // play; with none in play, a Prey card in the enemy hand or deck is revealed and destroyed.
  executePrey(state, e, ctx) {
    const opp = state.players[opponentOf(ctx.controller)];
    let m = findCharacter(state, ctx.chosen);
    if (!(m?.prey) && e.auto) {
      const prey = opp.board.filter((x) => x.prey && x.health > 0 && !x.destroyed);
      m = prey.sort((a, b) => a.health - b.health)[0] ?? null;
    }
    if (m && m.prey) {
      if (m.health <= e.maxHealth) { m.destroyed = true; log(state, `🦈 ${nameOf(state, m)} is executed.`); }
      else if (e.otherwiseDamage) dealDamage(state, ctx.self, m.uid, e.otherwiseDamage);
      return;
    }
    for (const zone of ['hand', 'deck']) {
      const inst = opp[zone].find((c) => c.prey && (getCard(c.cardId).health ?? 99) <= e.maxHealth);
      if (!inst) continue;
      opp[zone].splice(opp[zone].indexOf(inst), 1);
      opp.graveyard.push(inst);
      log(state, `🦈 Revealed from ${opp.name}'s ${zone}: ${getCard(inst.cardId).name} is executed.`);
      if (zone === 'deck') shuffle(state, opp.deck);
      return;
    }
    log(state, 'There is no Marked Prey to execute.');
  },

  // Frenzy of the Pack: these Sharks may attack Marked Prey this turn even if they just arrived.
  preyRush(state, e, ctx) {
    each(state, e.target, ctx, (m) => { if (m.kind === 'minion') m.preyRush = true; });
  },

  // ---- Ultraterrestrials ----
  // { target, until?: 'myNextTurn' | 'theirNextTurn' (the minion's controller's), attack?, health?,
  //   keywords?, exhausted?, ifFriendly?: {...}, ifEnemy?: {...}, toController?: 'me', onReturn?: [effects],
  //   drawPer?: N (draw a card per N Displaced) }
  displace(state, e, ctx) {
    let n = 0;
    each(state, e.target, ctx, (m) => {
      if (m.kind !== 'minion') return;
      const side = m.controller === ctx.controller ? e.ifFriendly : e.ifEnemy;
      const o = { ...e, ...(side ?? {}) };
      const returnAt = o.until === 'theirNextTurn' ? m.controller : ctx.controller;
      if (displaceMinion(state, m, {
        returnAt, by: ctx.controller, attack: o.attack, health: o.health, keywords: o.keywords, exhausted: o.exhausted,
        toController: o.toController === 'me' ? ctx.controller : undefined, onReturn: o.onReturn, ctx: { self: ctx.self, controller: ctx.controller },
      })) n++;
    });
    if (e.drawPer && n >= e.drawPer) drawCards(state, ctx.controller, Math.floor(n / e.drawPer));
  },

  // Riftling: your next Displacement this turn lasts 1 more turn.
  riftBonus(state, e, ctx) {
    state.players[ctx.controller].riftBonusTurn = state.turn;
  },

  // Sovereign of Elsewhere: the minion that was just Displaced gets a bonus when it returns.
  boostBeyond(state, e, ctx) {
    const entry = (state.beyond ?? []).find((x) => x.minion.uid === ctx.event?.source);
    if (!entry) return;
    entry.attack += e.attack ?? 0;
    entry.health += e.health ?? 0;
    log(state, `${nameOf(state, entry.minion)} will return with +${e.attack ?? 0}/+${e.health ?? 0}.`);
  },

  // Chrono-Warp Adept: a friendly Displaced minion's absence is 1 turn shorter
  // (one due back at your next turn returns right away).
  hastenBeyond(state, e, ctx) {
    const mine = (state.beyond ?? []).filter((x) => x.controller === ctx.controller);
    if (!mine.length) { log(state, 'No friendly minion is Beyond Reality.'); return; }
    const entry = mine.reduce((a, b) => (b.skips > a.skips ? b : a));
    if (entry.skips > 0) { entry.skips -= 1; log(state, `${nameOf(state, entry.minion)} will return a turn sooner.`); }
    else returnFromBeyond(state, entry);
  },

  // Observer Outside Time: look at the top 3 cards; choose one to stay on top, the rest go to the bottom.
  scry(state, e, ctx) {
    const pl = state.players[ctx.controller];
    const top = pl.deck.slice(0, e.count ?? 3);
    if (top.length <= 1) return;
    state.pending = {
      type: 'choice', player: ctx.controller, prompt: 'Keep one on top (the rest go to the bottom)', resolve: 'effects', ctx,
      options: top.map((c) => ({ cardId: c.cardId, label: getCard(c.cardId).name, effects: [{ op: 'arrangeTop', keep: c.uid, others: top.filter((x) => x !== c).map((x) => x.uid) }] })),
    };
  },
  arrangeTop(state, e, ctx) {
    const deck = state.players[ctx.controller].deck;
    const take = (uid) => { const i = deck.findIndex((c) => c.uid === uid); return i < 0 ? null : deck.splice(i, 1)[0]; };
    const keep = take(e.keep);
    for (const uid of e.others) { const c = take(uid); if (c) deck.push(c); }
    if (keep) deck.unshift(keep);
  },

  // Impossible Blueprint: Discover a minion of a faction; it costs less (not below minCost).
  // { faction, costMod, minCost }
  discoverFaction(state, e, ctx) {
    const pool = shuffle(state, collectibleMinions((c) => c.faction === e.faction).map((c) => c.id)).slice(0, e.count ?? 3);
    if (!pool.length) return;
    // random: no choice, just add one (Abyssal Bloodhound without Prey).
    if (e.random) { addToHand(state, ctx.controller, pool[0], e.costMod ? { costMod: e.costMod } : {}); log(state, `${state.players[ctx.controller].name} gets ${getCard(pool[0]).name}.`); return; }
    state.pending = {
      type: 'choice', player: ctx.controller, prompt: 'Discover a minion', resolve: 'effects', ctx,
      options: pool.map((id) => ({ cardId: id, label: getCard(id).name, effects: [{ op: 'addToHand', cardId: id, costMod: e.costMod, minCost: e.minCost }] })),
    };
  },

  // ---- Ghosts ----
  // Haunt random minions that died this game. { count?, distinct?, from?: 'either' | 'enemy' | 'friendly',
  //   maxCost?, tribe?, requireEnemy? (the first comes from the enemy Graveyard if it can), ...STAT_MODS }
  haunt(state, e, ctx) {
    const count = e.count ?? 1;
    const taken = new Set();
    for (let i = 0; i < count; i++) {
      let pool = deadEntries(state, ctx, e.from, e).filter((g) => !(e.distinct || count > 1) || !taken.has(g.cardId));
      if (e.requireEnemy && i === 0) {
        const enemy = pool.filter((g) => g.owner !== ctx.controller);
        if (enemy.length) pool = enemy;
      }
      const pick = pickRandom(state, pool);
      if (!pick) { if (i === 0) log(state, 'No minion that can be Haunted has died yet.'); return; }
      taken.add(pick.cardId);
      if (!hauntEntry(state, pick, ctx, modsOf(e))) return;
    }
  },

  // Haunt the minion that just died (from the event) or a marked one. { eventDead?, uid?, ...STAT_MODS }
  hauntDead(state, e, ctx) {
    const uid = e.uid ?? (e.eventDead ? ctx.event?.source : e.eventTargetDead ? ctx.event?.target : null);
    const entry = state.players.flatMap((pl) => pl.graveyard).find((g) => g.uid === uid && g.died);
    if (!entry) return;
    hauntEntry(state, entry, ctx, modsOf(e));
  },

  // If the target dies before the given turn ends, ctx.controller Haunts it. { target, turns?, ...STAT_MODS }
  markHaunt(state, e, ctx) {
    each(state, e.target, ctx, (m) => {
      if (m.kind !== 'minion') return;
      m.hauntOnDeath = { controller: ctx.controller, until: state.turn + (e.turns ?? 0), mods: modsOf(e) };
    });
  },

  // Choose a dead minion (up to 3 different options), then run `then` with it as `entry`.
  // { from?, maxCost?, prompt, then: 'toHand' | 'haunt' | 'copyText' | 'ghostHybrid', costMod?, ...STAT_MODS }
  chooseDead(state, e, ctx) {
    const byCard = new Map();
    for (const g of shuffle(state, deadEntries(state, ctx, e.from, e))) if (!byCard.has(g.cardId)) byCard.set(g.cardId, g);
    const options = [...byCard.values()].slice(0, 3);
    if (!options.length) { log(state, 'No minion has died yet.'); return; }
    const next = (g) => {
      if (e.then === 'toHand') return [{ op: 'addToHand', cardId: g.cardId, costMod: e.costMod }];
      if (e.then === 'copyText') return [{ op: 'copyText', target: 'self', cardId: g.cardId }];
      if (e.then === 'ghostHybrid') return [{ op: 'ghostHybrid', enemy: ctx.chosen, uid: g.uid }];
      return [{ op: 'hauntDead', uid: g.uid, ...modsOf(e) }];
    };
    state.pending = {
      type: 'choice', player: ctx.controller, prompt: e.prompt ?? 'Choose a minion from the Graveyard', resolve: 'effects', ctx,
      options: options.map((g) => ({ cardId: g.cardId, label: getCard(g.cardId).name, effects: next(g) })),
    };
  },

  // Mirror Haunt: this minion gains another minion's printed keywords and triggered text until it leaves play.
  // (Its Arrival has already happened, so a copied Arrival does nothing.) { target, cardId }
  copyText(state, e, ctx) {
    const src = getCard(e.cardId);
    each(state, e.target, ctx, (m) => {
      if (m.kind !== 'minion') return;
      for (const k of src.keywords ?? []) addKeyword(m, k, false, state);
      m.grantedTriggers ??= [];
      for (const t of src.triggers ?? []) if (t.on !== 'battlecry') m.grantedTriggers.push({ ...t, controller: m.controller });
      m.copiedText = { cardId: src.id, text: src.text };
      log(state, `🪞 ${nameOf(state, m)} copies the text of ${src.name}.`);
    });
  },

  // Spectral Gene Splicing: a Ghostly Hybrid of an enemy minion and a dead minion is summoned
  // on your side with the dead minion's stats (the dead one leaves its Graveyard). { enemy, uid }
  ghostHybrid(state, e, ctx) {
    const enemy = findCharacter(state, e.enemy);
    const entry = state.players.flatMap((pl) => pl.graveyard).find((g) => g.uid === e.uid && g.died);
    if (!entry) return;
    const dead = getCard(entry.cardId);
    const living = enemy?.kind === 'minion' ? getCard(enemy.cardId) : null;
    const grave = state.players[entry.owner].graveyard;
    grave.splice(grave.indexOf(entry), 1);
    const card = {
      id: `ghost_hybrid_${state.nextUid++}`, custom: true, hybrid: true, token: true,
      name: `Ghostly ${(living ?? dead).name.split(' ').at(-1)}`,
      faction: 'Ghosts', type: 'minion', tribes: [...new Set(['Ghost', ...(dead.tribes ?? []), ...(living?.tribes ?? [])])],
      cost: Math.min(10, Math.max(dead.cost, living?.cost ?? 0)), attack: dead.attack, health: dead.health,
      keywords: [...new Set([...(dead.keywords ?? []), ...(living?.keywords ?? [])])],
      triggers: [...(dead.triggers ?? []), ...(living?.triggers ?? [])].filter((t) => t.on !== 'battlecry'),
      text: [living?.text, dead.text].filter(Boolean).join(' '),
      art: dead.art, artFrom: dead.artFrom ?? dead.id,
    };
    registerCustom(state, card);
    const m = summonMinion(state, ctx.controller, card.id);
    if (!m) return;
    log(state, `🧬 ${card.name} rises (${card.attack}/${card.health}).`);
    enterBattlefield(state, m);
    emit(state, { type: 'minionHaunted', source: m.uid, player: ctx.controller, cardId: card.id });
  },

  // Look at the top N cards of your deck and draw the first matching one; shuffle the deck.
  // { count, filter }
  drawFromTop(state, e, ctx) {
    const pl = state.players[ctx.controller];
    const top = pl.deck.slice(0, e.count ?? 3);
    const hit = top.find((c) => cardMatches(getCard(c.cardId), e.filter));
    if (hit) {
      pl.deck.splice(pl.deck.indexOf(hit), 1);
      pl.deck.unshift(hit);
      drawCards(state, ctx.controller, 1);
    } else log(state, `No ${e.filter?.tribe ?? 'matching card'} among the top ${top.length} cards.`);
    shuffle(state, pl.deck);
  },

  // The enemy card that was just played no longer affects the character it targeted
  // (Not of This World, Mirror of the Departed). { elusive?: give that character Elusive this turn }
  counterTarget(state, e, ctx) {
    const ev = ctx.event;
    if (!ev?.target) return;
    for (const step of state.queue) {
      if (step.ctx?.self === ev.source && step.ctx.chosen === ev.target) step.ctx = { ...step.ctx, chosen: null };
    }
    const t = findCharacter(state, ev.target);
    if (t && e.elusive) addKeyword(t, 'Elusive', true, state);
    log(state, `${ev.cardId ? getCard(ev.cardId).name : 'The spell'} passes through ${nameOf(state, t)}.`);
  },

  // Refuse the Grave: the friendly minion that just died comes back as if Reborn (1 Health).
  rebornNow(state, e, ctx) {
    const ev = ctx.event;
    const entry = state.players.flatMap((pl) => pl.graveyard).find((g) => g.uid === ev?.source && g.died);
    if (!entry) { log(state, 'It cannot return.'); return; }
    const grave = state.players[entry.owner].graveyard;
    grave.splice(grave.indexOf(entry), 1);
    const m = summonMinion(state, ctx.controller, entry.cardId, { silent: true });
    if (!m) return;
    m.owner = entry.owner;
    m.health = state.rules.rebornHealth; m.maxHealth = state.rules.rebornHealth;
    removeKeyword(m, 'Reborn');
    m.rebornUsed = true;
    log(state, `${nameOf(state, m)} refuses the grave and returns.`);
    enterBattlefield(state, m);
    emit(state, { type: 'minionReborn', source: m.uid, player: ctx.controller });
  },

  // { target } — Resurrection: grant Reborn; a minion can only be chosen once.
  resurrect(state, e, ctx) {
    each(state, e.target, ctx, (m) => {
      if (m.kind !== 'minion') return;
      m.resurrected = true;
      // The granted Reborn lasts until the start of the caster's next turn.
      addKeyword(m, 'Reborn', false, state, ctx.controller);
      log(state, `${nameOf(state, m)} gains Reborn until its caster's next turn.`);
    });
  },

  // { amount } — friendly hero gains Armor.
  gainArmor(state, e, ctx) {
    // amountFromAttackOf: the Armor equals that character's Attack (Sacred Immolation).
    const n = e.amountFromAttackOf ? effectiveAttack(findCharacter(state, resolveSelector(state, e.amountFromAttackOf, ctx)[0]) ?? { attack: 0, tempAttack: 0 }) : e.amount;
    heroOf(state, ctx.controller).armor += n;
    traceFx(state, { type: 'armorGained', target: heroOf(state, ctx.controller).uid, amount: n });
  },

  // ---- Robots (Arsenal Protocol): Hero Weapons ----
  // { cardId, name, attack, durability, triggers?, ifNoWeapon? } — your Hero equips a Weapon: it gains
  // the Weapon's Attack and can attack (once a turn). Each attack uses 1 Durability; at 0 it breaks.
  // One Weapon at a time: a new one replaces the old. triggers act as the Hero ({ source: 'self' } = the Hero).
  equipHeroWeapon(state, e, ctx) {
    const hero = heroOf(state, ctx.controller);
    if (e.ifNoWeapon && hero.weapon) return;
    const wcard = getCard(e.cardId ?? ctx.cardId);
    const dual = hero.dualWield && !e.wand && !wcard?.wand;
    let slot = 1;
    // A two-handed weapon (Graveshredder) fills both slots: it replaces whatever is held, and a weapon
    // equipped while holding it replaces it.
    const twoHanded = !!(e.twoHanded ?? wcard?.twoHanded);
    if (dual && !twoHanded && hero.weapon && !hero.weapon.twoHanded && hero.weapon.cardId !== (e.cardId ?? ctx.cardId) && !hero.weapon2) slot = 2;
    if (twoHanded && hero.weapon2) hero.weapon2 = null;
    const oldWeapon = slot === 2 ? hero.weapon2 : hero.weapon;
    if (oldWeapon) { if (slot === 2) hero.weapon2 = null; else dropHeroWeapon(state, hero, 'drops'); }
    const weapon = { cardId: e.cardId ?? ctx.cardId, name: e.name, attack: e.attack, durability: e.durability, maxDurability: e.durability,
      ...(e.prey ? { prey: e.prey, preyBonus: e.preyBonus ?? 0 } : {}), ...(e.heroOnly ? { heroOnly: true } : {}),
      ...(e.ranged ? { ranged: true } : {}), ...(e.heroShield ? { heroShield: true } : {}), ...(e.cooldown ? { cooldown: e.cooldown } : {}), ...(e.executeFaction ? { executeFaction: e.executeFaction } : {}),
      // Monster Hunter (Sun & Moon): bonus against a tribe or a tag, two-handed, several attacks a turn, Sun's shot.
      ...(e.preyTribe ? { preyTribe: e.preyTribe, preyBonus: e.preyBonus ?? 0 } : {}), ...(e.preyTag ? { preyTag: e.preyTag, preyBonus: e.preyBonus ?? 0 } : {}),
      ...(twoHanded ? { twoHanded: true } : {}), ...(e.attacksPerTurn ? { attacksPerTurn: e.attacksPerTurn } : {}), ...(e.sunShot ? { sunShot: e.sunShot } : {}), ...(e.killHeal ? { killHeal: e.killHeal, killHealFaction: e.killHealFaction } : {}),
      // Witches: a Wand fires from afar (engine combat: the Hero takes no damage back); keywords the Hero has while holding it.
      ...(e.wand ?? wcard?.wand ? { wand: true } : {}), ...(e.keywords ? { keywords: [...e.keywords] } : {}) };
    // Witches (Spellbound): Rune Slots (Apprentice 1, most Wands 2, legendary 3), a built-in enchantment,
    // and runes carried over from the last Wand once the Spellbook is half written.
    if (weapon.wand) {
      weapon.slots = e.slots ?? wcard?.runeSlots ?? 2;
      weapon.runes = [];
      if (e.enchant ?? wcard?.enchant) weapon.runes.push({ kind: 'ench', id: e.enchant ?? wcard.enchant });
    }
    if (slot === 2) hero.weapon2 = weapon;
    else hero.weapon = weapon;
    if (weapon.wand) {
      // Carried-over runes go on once the new Wand is in the hand (addRune writes to hero.weapon).
      const stash = state.players[ctx.controller].spellbook?.stash;
      if (stash?.length) { for (const r of stash) addRune(state, hero, r); state.players[ctx.controller].spellbook.stash = null; log(state, `📖 The enchantments carry over to the ${weapon.name}.`); }
    }
    if (slot === 1) hero.attack = (hero.attack ?? 0) + e.attack;
    hero.lastEquippedSlot = slot;
    syncDualWield(hero);
    for (const t of e.triggers ?? []) (hero.grantedTriggers ??= []).push({ ...t, controller: ctx.controller, weapon: true });
    log(state, `${nameOf(state, hero)} equips ${e.name} (${e.attack}/${e.durability}).`);
    emit(state, { type: 'weaponEquipped', source: hero.uid, player: ctx.controller });
  },

  // { attack?, durability? } — your Hero's Weapon gets more Attack / Durability (no Weapon: nothing).
  // both: every weapon held (Blessed Bandolier); justEquipped: the weapon just equipped (Silver Smelter).
  buffHeroWeapon(state, e, ctx) {
    const hero = heroOf(state, ctx.controller);
    const slots = e.both ? [1, 2] : e.justEquipped ? [hero.lastEquippedSlot ?? 1] : [1];
    for (const slot of slots) {
      const w = slot === 2 ? hero.weapon2 : hero.weapon;
      if (!w) continue;
      w.attack += e.attack ?? 0;
      if (slot === 1) hero.attack += e.attack ?? 0;
      w.durability += e.durability ?? 0;
      w.maxDurability = Math.max(w.maxDurability, w.durability);
      log(state, `${nameOf(state, hero)}'s ${w.name} becomes ${w.attack}/${w.durability}.`);
    }
  },
  // Monster Hunter (Sun & Moon). { faction, costMod } — Discover a weapon of that realm (Bounty Board).
  discoverWeapon(state, e, ctx) {
    const pool = shuffle(state, allCards().filter((c) => c.heroWeapon && c.faction === e.faction && !c.token && !c.custom).map((c) => c.id)).slice(0, e.count ?? 3);
    if (!pool.length) return;
    state.pending = {
      type: 'choice', player: ctx.controller, prompt: 'Discover a weapon', resolve: 'effects', ctx,
      options: pool.map((id) => ({ cardId: id, label: getCard(id).name, effects: [{ op: 'addToHand', cardId: id, costMod: e.costMod }] })),
    };
  },
  // { target, amount } — its Attack becomes `amount` for the rest of this turn (Silvered Net).
  attackBecomes(state, e, ctx) {
    each(state, e.target, ctx, (c) => {
      const drop = effectiveAttack(c) - (e.amount ?? 1);
      if (drop <= 0) return;
      c.tempAttack = (c.tempAttack ?? 0) - drop;
      log(state, `${nameOf(state, c)}'s Attack becomes ${e.amount ?? 1} this turn.`);
    });
  },
  // This turn your weapons' bonus damage works against every realm (The Monster Codex).
  monsterCodex(state, e, ctx) {
    state.players[ctx.controller].codexTurn = state.turn;
    log(state, `📖 ${state.players[ctx.controller].name}'s weapons know every monster this turn.`);
  },

  // ---- Acidic (The Half-Digested): melting gear ----
  // { side: 'enemy' | 'friendly' } — that Hero's Weapon is destroyed (Dissolve Arms, Peptic Snare).
  destroyHeroWeapon(state, e, ctx) {
    const hero = heroOf(state, e.side === 'friendly' ? ctx.controller : opponentOf(ctx.controller));
    if (hero.weapon) dropHeroWeapon(state, hero, 'melts');
  },

  // { side, amount } — that Hero loses up to `amount` Armor (all if amount is 'all').
  loseArmor(state, e, ctx) {
    const hero = heroOf(state, e.side === 'friendly' ? ctx.controller : opponentOf(ctx.controller));
    const n = e.amount === 'all' ? hero.armor : Math.min(hero.armor, e.amount);
    if (n > 0) { hero.armor -= n; log(state, `🧪 ${nameOf(state, hero)} loses ${n} Armor.`); }
  },

  // The Undigested King: every enemy Weapon and Relic melts and the enemy Hero's Armor is gone;
  // this minion gains +1/+1 for each Weapon or Relic destroyed.
  meltEnemyArsenal(state, e, ctx) {
    const foe = state.players[opponentOf(ctx.controller)];
    let n = 0;
    if (foe.hero.weapon) { dropHeroWeapon(state, foe.hero, 'melts'); n++; }
    for (const m of foe.board) {
      if (m.relic) { dropMinionRelic(state, m); n++; }
      if (m.weapon) {
        m.attack = Math.max(0, m.attack - (m.weapon.attack ?? 0));
        m.grantedTriggers = (m.grantedTriggers ?? []).filter((t) => !t.weapon);
        m.weapon = null; n++;
      }
    }
    if (foe.hero.armor > 0) { log(state, `🧪 ${nameOf(state, foe.hero)}'s Armor dissolves.`); foe.hero.armor = 0; }
    const me = findCharacter(state, ctx.self);
    if (me && n) applyBuff(state, me, { attack: n, health: n });
  },

  // ---- Divine (The Holy Pyre): Holy Flame and Reduce to Ash ----
  // { target, amount } — set the targets alight with Holy Flame (adds to any already there).
  holyFlame(state, e, ctx) {
    each(state, e.target, ctx, (c) => applyHolyFlame(state, c, e.amount ?? 1, ctx.controller));
  },

  // { target } — Reduce a minion to Ash now (Halo Shatter).
  reduceToAsh(state, e, ctx) {
    each(state, e.target, ctx, (c) => {
      if (c.kind !== 'minion') return;
      c.holyFlame = Math.max(1, c.holyFlame ?? 0);
      c.destroyed = true;
    });
  },

  // Dawnbreaker: every enemy minion in Holy Flame is Reduced to Ash; a 1/1 Ember Spirit for each.
  ashTheBurning(state, e, ctx) {
    const burning = state.players[opponentOf(ctx.controller)].board.filter((m) => m.holyFlame > 0 && m.health > 0 && !m.destroyed);
    for (const m of burning) m.destroyed = true;
    if (burning.length) EFFECT_OPS.summon(state, { cardId: e.cardId ?? 'ember_spirit', count: burning.length }, ctx);
  },

  // ---- Ghosts (The Cursed Armory): Relics ----
  // A Relic card (card.relic: { attack, durability, hero: { triggers, onEquip, onBreak }, ghost: { attack, health, keywords, triggers } })
  // is equipped to your Hero (as a Hero Weapon) or to a friendly Ghost (stats, keywords and effects; it doesn't wear out).
  // { target | toHero, cardId?, durability?, lingering? } — lingering: a Ghost holding it died; it drifts to your Hero if the Hero is unarmed.
  equipRelic(state, e, ctx) {
    const card = getCard(e.cardId ?? ctx.cardId);
    const r = card.relic;
    const ids = e.toHero ? [heroOf(state, ctx.controller).uid] : resolveSelector(state, e.target, ctx);
    for (const id of ids) {
      const c = findCharacter(state, id);
      if (!c) continue;
      if (c.kind === 'hero') {
        if (e.lingering && c.weapon) { log(state, `${card.name} fades away.`); continue; }
        EFFECT_OPS.equipHeroWeapon(state, { cardId: card.id, name: card.name, attack: r.attack, durability: e.durability ?? r.durability, triggers: r.hero?.triggers }, ctx);
        if (e.lingering) log(state, `👻 ${card.name} lingers and drifts to ${nameOf(state, c)}.`);
        for (const x of r.hero?.onEquip ?? []) resolveEffect(state, x, ctx);
      } else {
        if (c.relic) dropMinionRelic(state, c);
        const g = r.ghost ?? {};
        c.relic = { cardId: card.id, name: card.name, attack: g.attack ?? 0, health: g.health ?? 0, keywords: [...(g.keywords ?? [])], durability: r.durability };
        c.attack += c.relic.attack;
        if (c.relic.health) { c.maxHealth += c.relic.health; c.health += c.relic.health; }
        for (const k of c.relic.keywords) addKeyword(c, k, false, state);
        for (const t of g.triggers ?? []) (c.grantedTriggers ??= []).push({ ...t, controller: ctx.controller, relic: true });
        log(state, `${nameOf(state, c)} takes up ${card.name}.`);
      }
    }
  },

  // { attack?, health?, durability?, pick: 'all' | 'random' } — Relics you hold: on your Hero, +Attack / +Durability;
  // on a Ghost, +Attack / +Health (Grave Squire, Phantom Blacksmith, Requiem of Arms).
  buffRelics(state, e, ctx) {
    const hero = heroOf(state, ctx.controller);
    const holders = [...(hero.weapon && getCard(hero.weapon.cardId)?.relic ? [hero] : []), ...state.players[ctx.controller].board.filter((m) => m.relic)];
    const chosen = e.pick === 'random' ? [pickRandom(state, holders)].filter(Boolean) : holders;
    for (const c of chosen) {
      if (c.kind === 'hero') EFFECT_OPS.buffHeroWeapon(state, { attack: e.attack ?? 0, durability: e.durability ?? 0 }, ctx);
      else applyBuff(state, c, { attack: e.attack ?? 0, health: e.health ?? 0 });
    }
  },

  // A Relic card was played (The Hollow Knight counts them).
  countRelic(state, e, ctx) {
    const pl = state.players[ctx.controller];
    pl.relicsPlayed = (pl.relicsPlayed ?? 0) + 1;
  },

  // { target } — your Hero's Relic moves to the target Ghost (Poltergeist Porter, The Hollow Knight).
  moveHeroRelic(state, e, ctx) {
    const hero = heroOf(state, ctx.controller);
    const w = hero.weapon;
    if (!w || !getCard(w.cardId)?.relic) return;
    dropHeroWeapon(state, hero, 'moves');
    EFFECT_OPS.equipRelic(state, { target: e.target, cardId: w.cardId }, ctx);
  },

  // ---- Witches (The Coven): anti-spell ----
  // Counter the spell card that opened this window: none of its effects happen (it is still cast and
  // spent). { copy?: add a copy of it to your hand } — traps on cardPlayed (Counter-Hex, Mirror Hex)
  // and Quick Plays in the cardPlayed window (Nullify).
  counterSpell(state, e, ctx) {
    const ev = ctx.event;
    if (!ev || ev.cardType !== 'spell' || ev.countered) return;
    ev.countered = true;
    state.queue = state.queue.filter((s) => !(s.kind === 'effect' && s.ctx?.self === ev.source));
    log(state, `🔮 ${getCard(ev.cardId)?.name ?? 'The spell'} is countered!`);
    traceFx(state, { type: 'countered', player: ev.player, cardId: ev.cardId });
    // copyCostMod: the copy is cheaper (Mirror Hex: costMod -99 makes it free).
    if (e.copy && ev.cardId) addToHand(state, ctx.controller, ev.cardId, e.copyCostMod ? { costMod: e.copyCostMod } : {});
  },
  // The card that opened this event goes to your hand as a copy (Grimoire Thief).
  copyEventCard(state, e, ctx) {
    const id = ctx.event?.cardId;
    if (id && !getCard(id)?.token) addToHand(state, ctx.controller, id);
  },
  // Silence the enemy Hero: their Hero Spell can't be used until the end of their next turn
  // (the cooldown ticks down at the start of each of their turns: engine startTurn).
  silenceHero(state, e, ctx) {
    const pl = state.players[e.side === 'friendly' ? ctx.controller : opponentOf(ctx.controller)];
    // Before a player's first turn the cooldown doesn't tick (engine startTurn), so 1 is enough then.
    const cd = pl.turnsTaken >= 1 ? 2 : 1;
    for (const hs of pl.heroSpells) hs.cooldown = Math.max(hs.cooldown ?? 0, cd);
    log(state, `🤐 ${pl.name}'s Hero is Silenced: no Hero Spell next turn.`);
    traceFx(state, { type: 'heroSilenced', target: pl.hero.uid });
  },
  // { amount } — the opponent's spell cards cost (amount) more on their next turn (Grim Toll).
  spellTax(state, e, ctx) {
    const p = opponentOf(ctx.controller);
    const turn = state.activePlayer === p ? state.turn : state.turn + 1;
    const pl = state.players[p];
    pl.spellTax = { amount: (pl.spellTax?.turn === turn ? pl.spellTax.amount : 0) + e.amount, turn };
    log(state, `${pl.name}'s spells cost (${e.amount}) more next turn.`);
  },


  // ---- Witches (Spellbound): the Spellbook, Rune Slots, Wandweaving, Inscribe, Masteries ----
  // { amount, wandAmount?, scribe? } — write pages in your Spellbook. A scribe (scribe: true) writes
  // only while it isn't Silenced. wandAmount: pages written instead while your Hero holds a Wand.
  writePages(state, e, ctx) {
    if (e.scribe) { const me = findCharacter(state, ctx.self); if (!me || me.health <= 0 || hasKeyword(me, 'Silenced')) return; }
    const pl = state.players[ctx.controller];
    const n = e.wandAmount && pl.hero.weapon?.wand ? e.wandAmount : (e.amount ?? 1);
    writeSpellbook(state, ctx.controller, n);
  },
  // Wandweave: equip an Apprentice Wand if your Hero has none, then choose 1 of 3 enchantments
  // for it (random from WAND_ENCHANTS). Writes 1 page once chosen.
  wandweave(state, e, ctx) {
    const hero = heroOf(state, ctx.controller);
    if (!hero.weapon?.wand) EFFECT_OPS.equipHeroWeapon(state, { cardId: 'apprentice_wand', name: 'Apprentice Wand', attack: 1, durability: 2, wand: true }, ctx);
    const pool = shuffle(state, Object.keys(WAND_ENCHANTS).slice()).slice(0, e.choices ?? 3);
    state.pending = {
      type: 'choice', player: ctx.controller, prompt: 'Wandweave: choose an enchantment for your Wand', resolve: 'effects', ctx,
      options: pool.map((k) => ({ label: `${WAND_ENCHANTS[k].name}: ${WAND_ENCHANTS[k].text}`, effects: [{ op: 'addEnchant', kind: k }, { op: 'writePages', amount: 1 }] })),
    };
  },
  // { kind } — put an enchantment on your Wand (it takes a Rune Slot).
  addEnchant(state, e, ctx) {
    const hero = heroOf(state, ctx.controller);
    if (addRune(state, hero, { kind: 'ench', id: e.kind })) log(state, `🪄 ${nameOf(state, hero)}'s ${hero.weapon.name} is enchanted with ${WAND_ENCHANTS[e.kind].name}.`);
  },
  // Inscribe: choose a spell from your hand to attach to your Wand (pay its cost, unless inscribing is free).
  inscribe(state, e, ctx) {
    const pl = state.players[ctx.controller];
    const hero = pl.hero;
    if (!hero.weapon?.wand) { log(state, 'There is no Wand to Inscribe.'); return; }
    const free = inscribeIsFree(pl);
    const spells = pl.hand.filter((c) => inscribable(getCard(c.cardId)) && (free || getCard(c.cardId).cost <= pl.mana.current));
    if (!spells.length) { log(state, 'No spell in hand can be Inscribed.'); return; }
    state.pending = {
      type: 'choice', player: ctx.controller, prompt: 'Inscribe a spell onto your Wand', resolve: 'effects', ctx,
      options: [...spells.map((c) => ({ cardId: c.cardId, label: getCard(c.cardId).name, effects: [{ op: 'inscribeCard', uid: c.uid }] })),
        { label: 'Keep them in your hand', effects: [] }],
    };
  },
  // { uid } — the chosen hand card goes onto the Wand.
  inscribeCard(state, e, ctx) {
    const pl = state.players[ctx.controller];
    const i = pl.hand.findIndex((c) => c.uid === e.uid);
    if (i < 0 || !pl.hero.weapon?.wand) return;
    const card = getCard(pl.hand[i].cardId);
    if (!inscribeIsFree(pl)) {
      if (card.cost > pl.mana.current) return;
      pl.mana.current -= card.cost;
    }
    const [inst] = pl.hand.splice(i, 1);
    addRune(state, pl.hero, { kind: 'inscr', cardId: inst.cardId });
    log(state, `📜 ${pl.name} Inscribes ${card.name} onto the ${pl.hero.weapon.name}.`);
    traceFx(state, { type: 'inscribed', target: pl.hero.uid, cardId: inst.cardId });
    emit(state, { type: 'spellInscribed', player: ctx.controller, cardId: inst.cardId });
    writeSpellbook(state, ctx.controller, 1);
  },
  // Rune Carver: the Wand gains a Rune Slot.
  addRuneSlot(state, e, ctx) {
    const w = heroOf(state, ctx.controller).weapon;
    if (!w?.wand) return;
    w.slots = (w.slots ?? 2) + (e.amount ?? 1);
    log(state, `${w.name} gains a Rune Slot (${w.slots}).`);
  },
  // A Wand attack's runes. phase 'before' (the target is still there): Rabbitcurse, Hushing,
  // Spellstrike and inscribed spells; phase 'after': Hexfire, Arcane Echo, Frostbite, Mana Siphon.
  wandRunes(state, e, ctx) {
    const hero = heroOf(state, ctx.controller);
    const w = hero.weapon;
    if (!w?.wand || !w.runes?.length) return;
    const target = ctx.event?.target;
    const times = state.players[ctx.controller].wandEcho ? 2 : 1;
    for (let k = 0; k < times; k++) for (const r of [...w.runes]) {
      const t = findCharacter(state, target);
      const live = t && t.health > 0 && !t.destroyed;
      if (e.phase === 'before') {
        if (r.kind === 'inscr') {
          const reps = getCard(w.cardId)?.doubleInscribed ? 2 : 1;
          for (let j = 0; j < reps; j++) castSpellAt(state, r.cardId, target, ctx.controller);
        } else if (r.id === 'rabbitcurse' && live && t.kind === 'minion') {
          EFFECT_OPS.transform(state, { target: { uid: t.uid }, into: 'witch_rabbit' }, ctx);
        } else if (r.id === 'hushing' && live && t.kind === 'minion') {
          addKeyword(t, 'Silenced', false, state);
        } else if (r.id === 'spellstrike') {
          const pl = state.players[ctx.controller];
          const ok = pl.hand.filter((c) => inscribable(getCard(c.cardId)) && getCard(c.cardId).cost <= pl.mana.current);
          const pick = pickRandom(state, ok);
          if (pick) {
            pl.hand.splice(pl.hand.indexOf(pick), 1); pl.graveyard.push(pick);
            pl.mana.current -= getCard(pick.cardId).cost;
            castSpellAt(state, pick.cardId, target, ctx.controller);
          }
        }
      } else if (r.kind === 'ench') {
        if (r.id === 'hexfire') {
          if (live && t.kind === 'minion') {
            const row = state.players[t.controller].board, i = row.indexOf(t);
            for (const m of [row[i - 1], t, row[i + 1]].filter(Boolean)) dealDamage(state, hero.uid, m.uid, 1);
          }
        } else if (r.id === 'arcaneEcho') {
          const foes = [heroOf(state, opponentOf(ctx.controller)), ...state.players[opponentOf(ctx.controller)].board].filter((c) => c.health > 0 && !c.destroyed);
          const hit = pickRandom(state, foes);
          if (hit) dealDamage(state, hero.uid, hit.uid, 2);
        } else if (r.id === 'frostbite') {
          if (live) addKeyword(t, 'Frozen', false, state);
        } else if (r.id === 'manaSiphon') {
          EFFECT_OPS.gainMana(state, { amount: 1 }, ctx);
        }
      }
    }
  },
  // { kind } — the finished Spellbook's Mastery (Dark Arts, Living Grimoire, Beast-Tamer).
  setMastery(state, e, ctx) {
    const pl = state.players[ctx.controller];
    (pl.spellbook ??= { pages: 0 }).mastery = e.kind;
    log(state, `📖 ${pl.name} masters ${MASTERY_NAMES[e.kind]}!`);
    traceFx(state, { type: 'mastery', target: pl.hero.uid, kind: e.kind });
    if (e.kind === 'beastTamer') {
      state.pending = {
        type: 'choice', player: ctx.controller, prompt: 'Beast-Tamer: choose your companion', resolve: 'effects', ctx,
        options: ['frisk_baby', 'spindex_the_giant_spider', 'toby_the_black_panther'].map((id) => ({ cardId: id, label: getCard(id).name, effects: [{ op: 'summon', cardId: id }] })),
      };
    }
  },
  // Frisk grows a stage, keeping his damage. { into }
  growInto(state, e, ctx) {
    const m = findCharacter(state, ctx.self);
    if (!m || m.kind !== 'minion' || m.health <= 0) return;
    const hurt = Math.max(0, m.maxHealth - m.health);
    EFFECT_OPS.transform(state, { target: { uid: m.uid }, into: e.into }, ctx);
    m.health = Math.max(1, m.health - hurt);
    traceFx(state, { type: 'grew', target: m.uid });
  },
  // Spindex: remember the Health of what it attacks; if that dies, heal a third of it and hatch a Baby Spider.
  spindexMark(state, e, ctx) {
    const me = findCharacter(state, ctx.self), t = findCharacter(state, ctx.event?.target);
    if (me && t?.kind === 'minion') me.preyMaxHealth = t.maxHealth;
  },
  spindexFeast(state, e, ctx) {
    const me = findCharacter(state, ctx.self);
    if (!me || !me.preyMaxHealth) return;
    const t = findCharacter(state, ctx.event?.target);
    const killed = !t || t.health <= 0 || t.destroyed;
    const hp = me.preyMaxHealth; me.preyMaxHealth = 0;
    if (!killed) return;
    heal(state, me.uid, Math.ceil(hp / 3), { source: me.uid });
    EFFECT_OPS.summon(state, { cardId: 'baby_spider' }, ctx);
  },
  // Toby: Silence the target first; an already-Silenced target is destroyed and Toby takes no damage.
  tobyPounce(state, e, ctx) {
    const t = findCharacter(state, ctx.event?.target);
    if (!t || t.kind !== 'minion') return;
    if (hasKeyword(t, 'Silenced')) {
      t.destroyed = true;
      log(state, `🐆 Toby tears through the Silenced ${nameOf(state, t)}.`);
      EFFECT_OPS.stopAttack(state, {}, ctx);
    } else addKeyword(t, 'Silenced', false, state);
  },

  // After your Hero attacks with a Weapon: it loses 1 Durability (engine declareAttack).
  wearHeroWeapon(state, e, ctx) {
    const hero = heroOf(state, ctx.controller);
    const slot = e.slot === 2 ? 2 : 1;
    const w = slot === 2 ? hero.weapon2 : hero.weapon;
    if (!w) return;
    // Eclipse: while Sun and Moon are both held, neither loses Durability.
    if (hero.eclipse) return;
    if (w.cooldown) w.cooldownUntilTurn = (state.players[ctx.controller].turnsTaken ?? 0) + w.cooldown + 1;
    w.durability -= 1;
    // Witches: Ward of Binding (a Trap) saves a Wand that would break.
    if (w.durability <= 0 && w.wand) {
      const pl = state.players[ctx.controller];
      const trap = pl.traps.find((t) => getCard(t.cardId).trap?.on === 'wandWouldBreak');
      if (trap) {
        pl.traps.splice(pl.traps.indexOf(trap), 1); pl.graveyard.push(trap);
        w.durability = 1;
        log(state, `Trap revealed: ${getCard(trap.cardId).name}! The ${w.name} holds together.`);
        emit(state, { type: 'trapTriggered', player: ctx.controller, cardId: trap.cardId });
        return;
      }
    }
    if (w.durability <= 0) {
      if (slot === 2) hero.weapon2 = null;
      else {
        dropHeroWeapon(state, hero, 'breaks');
        if (hero.dualWield && hero.weapon2) {
          hero.weapon = hero.weapon2; hero.weapon2 = null; hero.attack = (hero.attack ?? 0) + hero.weapon.attack;
        }
      }
      syncDualWield(hero);
    }
  },

  // Dinosaur Extinction Cycle modifiers for the caster's next Extinction.
  // { mode: 'bothBoards' | 'meteorShower' }
  setExtinctionMode(state, e, ctx) {
    const ext = state.players[ctx.controller].extinction;
    if (!ext) return;
    ext.mode = e.mode;
    log(state, `The next Extinction will be ${e.mode === 'bothBoards' ? 'an Extremely Large Meteor' : 'a Meteor Shower'}.`);
  },

  // { turns }
  delayExtinction(state, e, ctx) {
    const ext = state.players[ctx.controller].extinction;
    if (!ext) return;
    ext.nextAt += e.turns;
    log(state, `Extinction is delayed by ${e.turns} turns.`);
  },
};


// ---- Witches (Spellbound) helpers ----
export const SPELLBOOK_PAGES = 10;
export const SPELLBOOK_CARRY = 5;
export const WAND_ENCHANTS = {
  rabbitcurse: { name: 'Rabbitcurse', text: 'every minion your Wand hits becomes a 1/1 Rabbit' },
  hexfire: { name: 'Hexfire', text: 'after you attack a minion, it and the minions next to it take 1 damage' },
  arcaneEcho: { name: 'Arcane Echo', text: 'after you attack, deal 2 damage to a random enemy' },
  spellstrike: { name: 'Spellstrike', text: 'when you attack, cast a random spell from your hand you can afford at the target' },
  frostbite: { name: 'Frostbite', text: 'Freeze whatever your Wand hits' },
  hushing: { name: 'Hushing', text: 'permanently Silence any minion your Wand hits, before the hit' },
  manaSiphon: { name: 'Mana Siphon', text: 'gain 1 Mana after you attack' },
  twinBolt: { name: 'Twin Bolt', text: 'your Hero can attack twice each turn' },
};
export const MASTERY_NAMES = { darkArts: 'Dark Arts', livingGrimoire: 'Living Grimoire', beastTamer: 'Beast-Tamer' };
const inscribable = (card) => card?.type === 'spell' && !card.heroSpell && !card.heroWeapon && !card.target2;
const inscribeIsFree = (pl) => pl.spellbook?.mastery === 'livingGrimoire' || !!getCard(pl.hero.weapon?.cardId)?.freeInscribe;
// A rune on the Wand; past its Rune Slots, the oldest is pushed out.
function addRune(state, hero, rune) {
  const w = hero.weapon;
  if (!w?.wand) return false;
  (w.runes ??= []).push(rune);
  while (w.runes.length > (w.slots ?? 2)) {
    const out = w.runes.shift();
    log(state, `${out.kind === 'ench' ? WAND_ENCHANTS[out.id].name : getCard(out.cardId).name} fades from the ${w.name}.`);
  }
  return true;
}
// An inscribed (or Spellstruck) spell is cast for free: at the Wand's target if it can be, else a random valid one.
function castSpellAt(state, cardId, target, p) {
  const card = getCard(cardId);
  const ctx = { self: state.nextUid++, controller: p, cardId };
  if (card.target) {
    const valid = targetCandidates(state, card.target, p, null, true);
    ctx.chosen = valid.includes(target) ? target : pickRandom(state, valid) ?? null;
    if (ctx.chosen == null && card.effects.some((x) => x.target === 'chosen')) { log(state, `${card.name} has no target.`); return; }
  }
  log(state, `📜 The Wand casts ${card.name}.`);
  traceFx(state, { type: 'inscribedCast', target: ctx.chosen ?? null, cardId, player: p });
  for (const x of card.effects) resolveEffect(state, x, ctx);
}
// Write pages; at 5 the Wand's enchantments start carrying over, at 10 the book is finished:
// Wandcraft becomes Wandweaving and the player chooses a Mastery.
function writeSpellbook(state, p, n) {
  const pl = state.players[p];
  const book = (pl.spellbook ??= { pages: 0 });
  if (book.done || n <= 0) return;
  const before = book.pages;
  book.pages = Math.min(SPELLBOOK_PAGES, before + n);
  log(state, `📖 ${pl.name}'s Spellbook: ${book.pages}/${SPELLBOOK_PAGES} pages.`);
  traceFx(state, { type: 'pagesWritten', target: pl.hero.uid, pages: book.pages, amount: book.pages - before });
  if (before < SPELLBOOK_CARRY && book.pages >= SPELLBOOK_CARRY) log(state, `📖 Half written: ${pl.name}'s Wand enchantments now carry over to the next Wand.`);
  if (book.pages < SPELLBOOK_PAGES) return;
  book.done = true;
  const hs = pl.heroSpells.find((h) => h.cardId === 'wandcraft');
  if (hs) hs.cardId = 'wandweaving';
  else if (!pl.heroSpells.some((h) => h.cardId === 'wandweaving')) pl.heroSpells.push({ cardId: 'wandweaving', uses: 0 });
  log(state, `📖 ${pl.name}'s Spellbook is complete! Wandcraft becomes Wandweaving.`);
  traceFx(state, { type: 'bookComplete', target: pl.hero.uid, player: p });
  const ctx = { self: pl.hero.uid, controller: p };
  state.pending = {
    type: 'choice', player: p, prompt: 'Your Spellbook is complete: choose a Mastery', resolve: 'effects', ctx,
    options: [['mastery_dark_arts', 'darkArts'], ['mastery_living_grimoire', 'livingGrimoire'], ['mastery_beast_tamer', 'beastTamer']]
      .map(([id, kind]) => ({ cardId: id, label: getCard(id).name, effects: [{ op: 'setMastery', kind }] })),
  };
}

export function resolveEffect(state, effect, ctx) {
  // perTurnLimit: this effect happens at most N times per turn for its card (Ash Collector).
  if (effect.perTurnLimit) {
    const self = findCharacter(state, ctx.self);
    if (!self) return;
    if (self.limitTurn !== state.turn) { self.limitTurn = state.turn; self.limitCount = 0; }
    if (self.limitCount >= effect.perTurnLimit) return;
    self.limitCount += 1;
  }
  if (effect.if && !checkCondition(state, effect.if, ctx)) {
    for (const e of effect.else ?? []) resolveEffect(state, e, ctx);
    return;
  }
  const op = EFFECT_OPS[effect.op];
  if (!op) throw new Error(`Unknown effect op: ${effect.op}`);
  op(state, effect, ctx);
}

// The Hero loses its Weapon (it broke or was replaced): its Attack and its effects go.
export { dropMinionRelic };

export function dropHeroWeapon(state, hero, how = 'breaks') {
  const w = hero.weapon;
  if (!w) return;
  hero.attack = Math.max(0, (hero.attack ?? 0) - w.attack);
  hero.grantedTriggers = (hero.grantedTriggers ?? []).filter((t) => !t.weapon);
  // Witches (Spellbound): a half-written Spellbook keeps the Wand's enchantments for the next Wand;
  // with Living Grimoire, its inscribed spells too.
  const book = state.players[hero.controller]?.spellbook;
  if (w.wand && w.runes?.length && book && book.pages >= SPELLBOOK_CARRY) {
    const keep = w.runes.filter((r) => r.kind === 'ench' || book.mastery === 'livingGrimoire');
    if (keep.length) book.stash = keep;
  }
  hero.weapon = null;
  syncDualWield(hero);
  if (how === 'moves') return;
  log(state, how === 'breaks' ? `${nameOf(state, hero)}'s ${w.name} breaks.` : how === 'melts' ? `🧪 ${nameOf(state, hero)}'s ${w.name} melts away.` : `${nameOf(state, hero)} drops the ${w.name}.`);
  // A Relic's last gasp when it breaks (Soulforge Relic).
  if (how === 'breaks') for (const x of getCard(w.cardId)?.relic?.hero?.onBreak ?? []) resolveEffect(state, x, { self: hero.uid, controller: hero.controller });
}

