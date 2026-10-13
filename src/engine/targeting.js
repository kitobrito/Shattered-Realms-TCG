// Targeting: who a card may choose, how effect selectors resolve to
// characters at resolution time, and how trigger filters match events.

import { allKeywords, effectiveAttack, findCharacter, hasKeyword, heroOf, isBurning, isDarkOrUndead, minionsInOrder, opponentOf, radiationOf } from './core.js';
import { getCard } from './registry.js';
import { pickRandom } from './rng.js';

// Stealth: enemy cards and abilities cannot choose a Stealthed minion.
// Elusive: enemy spells cannot choose it.
export function canBeChosenBy(target, controller, bySpell = false, spec = null) {
  if (target.kind !== 'minion' || target.controller === controller) return true;
  // Sharks: cards that hunt Marked Prey reach it through Stealth and Elusive; some track any hidden minion.
  if (spec?.prey && target.prey) return true;
  if (spec?.ignoreStealth && !(bySpell && hasKeyword(target, 'Elusive'))) return true;
  if (hasKeyword(target, 'Stealth')) return false;
  if (bySpell && hasKeyword(target, 'Elusive')) return false;
  return true;
}

// Extra minion conditions shared by target specs and selectors.
function minionPasses(m, f) {
  if (f.tribe && !m.tribes.includes(f.tribe)) return false;
  if (f.tribes && !f.tribes.some((t) => m.tribes.includes(t))) return false;
  if (f.notTribe && m.tribes.includes(f.notTribe)) return false;
  if (f.darkOrUndead && !isDarkOrUndead(m)) return false;
  if (f.hasUpgrade && !(m.upgrades > 0)) return false;   // Robots
  if (f.minUpgrades != null && (m.upgrades ?? 0) < f.minUpgrades) return false;
  if (f.hasWeapon && !m.weapon) return false;
  if (f.faction && getCard(m.cardId).faction !== f.faction) return false;
  if (f.irradiated != null && (radiationOf(m) > 0) !== f.irradiated) return false;
  if (f.damaged && !(m.health < m.maxHealth)) return false; // took damage and hasn't fully healed
  if (f.cardId && m.cardId !== f.cardId) return false;
  if (f.maxAttack != null && effectiveAttack(m) > f.maxAttack) return false;
  if (f.hasKeyword && !allKeywords(m).length) return false;
  if (f.alive && (m.health <= 0 || m.destroyed)) return false;
  // Sharks: Marked Prey, at most N Health, in Stealth.
  if (f.prey && !m.prey) return false;
  if (f.maxHealth != null && m.health > f.maxHealth) return false;
  if (f.stealthed && !hasKeyword(m, 'Stealth')) return false;
  if (f.returnedThisTurn && !m.justReturned) return false; // Ultraterrestrials: came back this turn
  if (f.unresurrected && m.resurrected) return false; // Resurrection: once per minion
  // Attack below its card's printed Attack (Mycelium Lord).
  if (f.reducedAttack && effectiveAttack(m) >= (getCard(m.cardId).attack ?? 0)) return false;
  return true;
}

// spec: { type: 'minion' | 'hero' | 'character', side: 'friendly' | 'enemy' | 'any', tribe?, notTribe?, maxAttack? }
export function targetCandidates(state, spec, controller, excludeUid = null, bySpell = false) {
  const out = [];
  for (const p of [controller, opponentOf(controller)]) {
    const side = p === controller ? 'friendly' : 'enemy';
    if (spec.side !== 'any' && spec.side !== side) continue;
    const pl = state.players[p];
    if (spec.type !== 'minion' && !spec.tribe && !spec.tribes && !spec.cardId && !spec.notTribe && !spec.darkOrUndead) out.push(pl.hero);
    if (spec.type !== 'hero') out.push(...pl.board.filter((m) => minionPasses(m, spec)));
  }
  // Eggguard Ankylosaur: enemy spells can't choose that player's Dinosaur Eggs.
  const eggGuarded = (c) => bySpell && c.kind === 'minion' && c.controller !== controller && c.tribes.includes('Egg')
    && state.players[c.controller].board.some((m) => getCard(m.cardId).guardsEggsFromSpells);
  return out
    .filter((c) => c.uid !== excludeUid && canBeChosenBy(c, controller, bySpell, spec) && !eggGuarded(c))
    .map((c) => c.uid);
}

function matchesMinionFilter(m, f, ctx) {
  if (f.side === 'friendly' && m.controller !== ctx.controller) return false;
  if (f.side === 'enemy' && m.controller === ctx.controller) return false;
  if (f.excludeSelf && m.uid === ctx.self) return false;
  return minionPasses(m, f);
}

// Resolves an effect's target selector to a list of character uids.
// ctx: { self, controller, chosen, chosen2, event }
export function resolveSelector(state, sel, ctx) {
  if (sel == null) return [];
  if (typeof sel === 'string') {
    const one = (id) => (findCharacter(state, id) ? [id] : []);
    switch (sel) {
      case 'self': return one(ctx.self);
      case 'chosen': return one(ctx.chosen);
      case 'chosen2': return one(ctx.chosen2);
      case 'friendlyHero': return [heroOf(state, ctx.controller).uid];
      case 'enemyHero': return [heroOf(state, opponentOf(ctx.controller)).uid];
      case 'killer': return one(ctx.event?.killer);
      case 'eventSource': return one(ctx.event?.source);
      case 'eventTarget': return one(ctx.event?.target);
      case 'summoned': return one(ctx.summoned); // the minion this card's summon effect just made
      case 'returned': return one(ctx.returned); // Ultraterrestrials: the minion returning from Displacement
      default: throw new Error(`Unknown selector: ${sel}`);
    }
  }
  if (sel.uid != null) return findCharacter(state, sel.uid) ? [sel.uid] : [];
  // { characters: { side } } — Heroes and minions (Inferno Tyrant, Dragonfire Storm).
  if (sel.characters) {
    const side = sel.characters.side ?? 'any';
    const out = [];
    for (const p of [ctx.controller, opponentOf(ctx.controller)]) {
      const s = p === ctx.controller ? 'friendly' : 'enemy';
      if (side !== 'any' && side !== s) continue;
      // irradiated: only characters with Radiation (Critical Mass Mutant).
      if (sel.characters.irradiated == null || (radiationOf(heroOf(state, p)) > 0) === sel.characters.irradiated) out.push(heroOf(state, p).uid);
    }
    const mf = { side, ...(sel.characters.irradiated != null ? { irradiated: sel.characters.irradiated } : {}) };
    return [...out, ...minionsInOrder(state).filter((m) => matchesMinionFilter(m, mf, ctx)).map((m) => m.uid)]
      .filter((id) => !(sel.characters.excludeSelf && id === ctx.self));
  }
  if (sel.minions) {
    return minionsInOrder(state).filter((m) => matchesMinionFilter(m, sel.minions, ctx)).map((m) => m.uid);
  }
  if (sel.randomOf) {
    const pick = pickRandom(state, resolveSelector(state, sel.randomOf, ctx));
    return pick == null ? [] : [pick];
  }
  throw new Error(`Unknown selector: ${JSON.stringify(sel)}`);
}

// Matches a trigger/Quick Play/Trap filter against an event.
// Keys: source, target, killer (character refs); player, killerPlayer
// ('friendly' | 'enemy'); cardType (for cardPlayed); lethal (for wouldTakeDamage).
export function matchFilter(state, filter, ctx) {
  if (!filter) return true;
  const ev = ctx.event ?? {};
  for (const [key, want] of Object.entries(filter)) {
    if (key === 'player' || key === 'killerPlayer') {
      const val = key === 'player' ? ev.player : ev.killerPlayer;
      if (want === 'friendly' && val !== ctx.controller) return false;
      if (want === 'enemy' && (val == null || val === ctx.controller)) return false;
      continue;
    }
    if (key === 'cardType') {
      if (ev.cardType !== want) return false;
      continue;
    }
    // Zombies: "when three or more friendly Zombies have died this turn" (Endless Horde).
    if (key === 'minZombieDeaths') {
      if ((state.players[ctx.controller].zombieDeathsThisTurn ?? 0) < want) return false;
      continue;
    }
    if (key === 'minCorpses') {
      if ((state.players[ctx.controller].corpses ?? 0) < want) return false;
      continue;
    }
    // Radioactive: the minion that died had Radiation (Chain Reaction).
    if (key === 'deadIrradiated') {
      if (!!ev.dead?.irradiated !== want) return false;
      continue;
    }
    // keywordLost / keywordGained: which keyword (Aegis Bearer).
    if (key === 'keyword') {
      if (ev.keyword !== want) return false;
      continue;
    }
    // Demons: Health paid as a cost (not damage); paid to summon a Demon; a Hero Spell was used.
    if (key === 'paid' || key === 'forSummon' || key === 'heroSpell') {
      if (!!ev[key] !== want) return false;
      continue;
    }
    // Dragons: the minion died to Burn damage; the event's source / target is Burning.
    if (key === 'byBurn') {
      if (!!ev.byBurn !== want) return false;
      continue;
    }
    if (key === 'sourceBurning' || key === 'targetBurning') {
      const c = findCharacter(state, key === 'sourceBurning' ? ev.source : ev.target);
      if (isBurning(c) !== want) return false;
      continue;
    }
    // Ultraterrestrials: who Displaced the minion; the played card's cost.
    if (key === 'by') {
      if (want === 'friendly' && ev.by !== ctx.controller) return false;
      if (want === 'enemy' && (ev.by == null || ev.by === ctx.controller)) return false;
      continue;
    }
    if (key === 'minCost') {
      if (!ev.cardId || (getCard(ev.cardId).cost ?? 0) < want) return false;
      continue;
    }
    // Sharks: the minion that died was Marked Prey.
    if (key === 'deadPrey') {
      if (!!ev.dead?.prey !== want) return false;
      continue;
    }
    if (key === 'killerMinion') {
      if (!!ev.killerMinion !== want) return false;
      continue;
    }
    if (key === 'lethal') {
      // wouldTakeDamage: the incoming damage would kill the target.
      const t = findCharacter(state, ev.target);
      if (!t || (ev.amount >= t.health) !== want) return false;
      continue;
    }
    if (!matchRef(state, ev[key], want, ctx, ev)) return false;
  }
  return true;
}

// A character ref is a string ('self', 'enemyHero', 'friendlyMinion', …) or an
// object { side: 'friendly' | 'enemy' | 'any', tribe?, cardId? } for minions.
// Minions that already died are matched from the event's `dead` snapshot.
function matchRef(state, id, want, ctx, ev) {
  const c = findCharacter(state, id) ?? (ev.dead && id === ev.source ? ev.dead : null);
  const friendly = c?.controller === ctx.controller;
  if (typeof want === 'object') {
    if (c?.kind !== 'minion') return false;
    if (want.side === 'friendly' && !friendly) return false;
    if (want.side === 'enemy' && friendly) return false;
    if (want.tribe && !c.tribes.includes(want.tribe)) return false;
    if (want.cardId && c.cardId !== want.cardId) return false;
    if (want.notCardId && c.cardId === want.notCardId) return false;
    if (want.notSelf && id === ctx.self) return false;
    if (want.darkOrUndead && !isDarkOrUndead(c)) return false;
    if (want.irradiated != null && (radiationOf(c) > 0) !== want.irradiated) return false;
    if (want.maxAttack != null && effectiveAttack(c) > want.maxAttack) return false;
    if (want.maxHealth != null && c.health > want.maxHealth) return false;
    if (want.prey && !c.prey) return false;
    if (want.faction && getCard(c.cardId).faction !== want.faction) return false;
    return true;
  }
  switch (want) {
    case 'self': return id === ctx.self;
    case 'notSelf': return id !== ctx.self;
    case 'friendlyHero': return id === heroOf(state, ctx.controller).uid;
    case 'enemyHero': return id === heroOf(state, opponentOf(ctx.controller)).uid;
    case 'anyHero': return c?.kind === 'hero';
    case 'friendlyMinion': return c?.kind === 'minion' && friendly;
    case 'enemyMinion': return c?.kind === 'minion' && !friendly;
    case 'anyMinion': return c?.kind === 'minion';
    case 'enemyCharacter': return !!c && !friendly;
    case 'friendlyCharacter': return !!c && friendly;
    default: throw new Error(`Unknown filter ref: ${want}`);
  }
}
