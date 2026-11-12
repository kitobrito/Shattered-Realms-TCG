// The points economy: daily missions earn points, points buy card packs, duplicates recycle into points.
//
//   Dailies    4 missions per player per day (UTC). Each completed mission pays DAILY_POINTS. A mission
//              not finished by the end of its day is gone; the next day brings 4 new ones. Only wins in
//              public games (Quick Match and Ranked) count. Playing alone never earns points.
//   Packs      PACK_COST points: PACK_SIZE random expansion cards from one realm. Each card leans toward
//              cards you don't own yet, but can be one you already have (a duplicate). Each card has a
//              LEGENDARY_CHANCE of being a legendary.
//   Duplicates recycle for RECYCLE.normal / RECYCLE.legendary points each.
//   Buying     a single expansion card you don't own: CARD_PRICE.normal, or CARD_PRICE.legendary for a
//              legendary. A realm's alternate board (ALT_BOARDS): BOARD_PRICE, unless you already have it
//              (bought, or unlocked by owning every card of its set).
//   Wins       still unlock expansion cards (2 per win, from the realms you won with), but only until you
//              own FREE_PER_FACTION of that realm's expansion cards. The rest come from packs.
//
// An account carries: points, cards (owned expansion ids), dupes ({ id: count }), dailies
// boards (alternate board ids bought), ({ day, list: [{ id, kind, ..., need, progress, done }] }), cardsImported (one-time import of the
// cards a player unlocked in their browser before accounts kept them).

import { allCards, getCard } from '../src/engine/registry.js';
import { PLAYABLE_FACTIONS } from '../src/cards/index.js';
import { ALT_BOARDS } from '../src/cards/board-art.js';

export const DAILY_POINTS = 80;
export const DAILIES_PER_DAY = 5;
export const PACK_COST = 160;
// The Legendary Pack: LEGENDARY_PACK_COST points, PACK_SIZE cards from any realm, completely random,
// with one guaranteed legendary (one you don't own yet when there is any).
export const LEGENDARY_PACK_COST = 640;
export const PACK_SIZE = 7;
export const LEGENDARY_CHANCE = 0.01;
export const NEW_CARD_BIAS = 0.65; // chance a pack card is drawn from the cards you don't own (when there are any)
export const RECYCLE = { normal: 20, legendary: 400 };
export const FREE_PER_FACTION = 10;
// Every account starts with START_POINTS (accounts made before points existed get them once, on sign-in).
export const START_POINTS = 1000;
export function grantStartPoints(acc) {
  if (acc.startPoints || acc.bot) return false;
  acc.startPoints = true;
  acc.points = (acc.points ?? 0) + START_POINTS;
  return true;
}
export const CARD_PRICE = { normal: 100, legendary: 1600 };
export const BOARD_PRICE = 1600;
export const UNLOCKS_PER_WIN = 2;

let EXTRAS = null;
const extras = () => (EXTRAS ??= allCards().filter((c) => c.extra && !c.token && !c.custom && !c.alwaysUnlocked));
export const expansionOf = (faction) => extras().filter((c) => c.faction === faction);
export const isExpansionCard = (id) => extras().some((c) => c.id === id);

export const dayOf = (now = Date.now()) => new Date(now).toISOString().slice(0, 10);
export const msUntilReset = (now = Date.now()) => {
  const next = new Date(now); next.setUTCHours(24, 0, 0, 0);
  return next.getTime() - now;
};

// A small seeded random (mulberry32) so a player's missions for a day are the same every time they look.
function rng(seedText) {
  let h = 1779033703 ^ seedText.length;
  for (let i = 0; i < seedText.length; i++) { h = Math.imul(h ^ seedText.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  let a = h >>> 0;
  return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const pick = (r, list) => list[Math.floor(r() * list.length)];

// The mission kinds. Each says what a win must look like to count, and how it reads.
const KINDS = {
  fusion: { need: 3, make: (r) => { const a = pick(r, PLAYABLE_FACTIONS); let b = pick(r, PLAYABLE_FACTIONS); while (b === a) b = pick(r, PLAYABLE_FACTIONS); return { factions: [a, b].sort() }; },
    text: (m) => `Win ${m.need} public games with the ${m.factions[0]} + ${m.factions[1]} fusion`,
    counts: (m, w) => w.factions.length === 2 && m.factions.every((f) => w.factions.includes(f)) },
  faction: { need: 3, make: (r) => ({ faction: pick(r, PLAYABLE_FACTIONS) }),
    text: (m) => `Win ${m.need} public games with ${m.faction} in your deck`,
    counts: (m, w) => w.factions.includes(m.faction) },
  ranked: { need: 2, make: () => ({}), text: (m) => `Win ${m.need} Ranked games`, counts: (m, w) => w.mode === 'ranked' },
  single: { need: 3, make: () => ({}), text: (m) => `Win ${m.need} public games with a single-realm deck`, counts: (m, w) => w.factions.length === 1 },
  pair: { need: 3, make: () => ({}), text: (m) => `Win ${m.need} public games with a two-realm deck`, counts: (m, w) => w.factions.length === 2 },
  any: { need: 4, make: () => ({}), text: (m) => `Win ${m.need} Quick Match or Ranked games`, counts: () => true },
};

// The 4 missions for this player on this day: always a fusion mission, then three different others.
export function makeDailies(key, day) {
  const r = rng(`${key}:${day}`);
  const kinds = ['fusion'];
  const rest = ['faction', 'ranked', 'single', 'pair', 'any'];
  while (kinds.length < DAILIES_PER_DAY && rest.length) {
    const k = rest.splice(Math.floor(r() * rest.length), 1)[0];
    if (k === 'single' && kinds.includes('pair')) continue; // never ask for both deck shapes on one day
    if (k === 'pair' && kinds.includes('single')) continue;
    kinds.push(k);
  }
  return kinds.map((kind, i) => {
    const m = { id: `${day}-${i}`, kind, need: KINDS[kind].need, progress: 0, done: false, ...KINDS[kind].make(r) };
    return { ...m, text: KINDS[kind].text(m) };
  });
}

// Make sure the account has today's missions (yesterday's unfinished ones are simply replaced).
export function refreshDailies(acc, now = Date.now()) {
  const day = dayOf(now);
  if (acc.dailies?.day !== day) { acc.dailies = { day, list: makeDailies(acc.key, day) }; return true; }
  // More missions a day than when today's list was made (4 became 5): add the new ones, keep progress.
  // Missions come out in the same order for an account and day, so the new ones follow on.
  const list = acc.dailies.list;
  if (list.length < DAILIES_PER_DAY) {
    const added = makeDailies(acc.key, day).slice(list.length).filter((m) => !list.some((x) => x.kind === m.kind || x.id === m.id));
    list.push(...added);
    return added.length > 0;
  }
  return false;
}

// A win in a public game: advance every mission it counts for; pay for the ones it completes.
// win: { mode: 'quick' | 'ranked', factions: [...] }. Returns the missions completed by this win.
export function recordPublicWin(acc, win, now = Date.now()) {
  if (win.mode !== 'quick' && win.mode !== 'ranked') return [];
  refreshDailies(acc, now);
  const completed = [];
  for (const m of acc.dailies.list) {
    if (m.done || !KINDS[m.kind]?.counts(m, win)) continue;
    m.progress = Math.min(m.need, m.progress + 1);
    if (m.progress >= m.need) { m.done = true; acc.points = (acc.points ?? 0) + DAILY_POINTS; completed.push({ id: m.id, text: m.text, points: DAILY_POINTS }); }
  }
  return completed;
}

const ownedSet = (acc) => new Set(acc.cards ?? []);
export const ownedIn = (acc, faction) => { const have = ownedSet(acc); return expansionOf(faction).filter((c) => have.has(c.id)).length; };

// A win unlocks up to UNLOCKS_PER_WIN cards from the realms won with, taking turns between them,
// legendaries last, and only while the player owns fewer than FREE_PER_FACTION of that realm's cards.
export function awardWinUnlocks(acc, factions, random = Math.random) {
  const have = ownedSet(acc);
  const won = [];
  const realms = [...new Set(factions)].filter((f) => PLAYABLE_FACTIONS.includes(f));
  for (let i = 0; won.length < UNLOCKS_PER_WIN && realms.length; i++) {
    const open = realms.filter((f) => expansionOf(f).filter((c) => have.has(c.id)).length < FREE_PER_FACTION && expansionOf(f).some((c) => !have.has(c.id)));
    if (!open.length) break;
    const pool = expansionOf(open[i % open.length]).filter((c) => !have.has(c.id));
    const normal = pool.filter((c) => !c.legendary);
    const from = normal.length ? normal : pool;
    const card = from[Math.floor(random() * from.length)];
    have.add(card.id);
    won.push(card.id);
  }
  acc.cards = [...have];
  return won;
}

// Open a pack of a realm. Returns { cards: [{ id, duplicate }] } or { error }.
export function openPack(acc, faction, random = Math.random) {
  if (!PLAYABLE_FACTIONS.includes(faction)) return { error: 'Pick a realm.' };
  if ((acc.points ?? 0) < PACK_COST) return { error: `A pack costs ${PACK_COST} points. You have ${acc.points ?? 0}.` };
  const all = expansionOf(faction);
  const have = ownedSet(acc);
  acc.points -= PACK_COST;
  acc.dupes ??= {};
  const cards = [];
  for (let i = 0; i < PACK_SIZE; i++) {
    const legendary = random() < LEGENDARY_CHANCE && all.some((c) => c.legendary);
    let tier = all.filter((c) => !!c.legendary === legendary);
    if (!tier.length) tier = all;
    const fresh = tier.filter((c) => !have.has(c.id));
    const from = fresh.length && random() < NEW_CARD_BIAS ? fresh : tier;
    const card = from[Math.floor(random() * from.length)];
    const duplicate = have.has(card.id);
    if (duplicate) acc.dupes[card.id] = (acc.dupes[card.id] ?? 0) + 1;
    else have.add(card.id);
    cards.push({ id: card.id, duplicate });
  }
  acc.cards = [...have];
  return { cards };
}

// Open the Legendary Pack. Returns { cards: [{ id, duplicate }] } or { error }.
export function openLegendaryPack(acc, random = Math.random) {
  if ((acc.points ?? 0) < LEGENDARY_PACK_COST) return { error: `The Legendary Pack costs ${LEGENDARY_PACK_COST} points. You have ${acc.points ?? 0}.` };
  const all = extras();
  const have = ownedSet(acc);
  acc.points -= LEGENDARY_PACK_COST;
  acc.dupes ??= {};
  const legendaries = all.filter((c) => c.legendary);
  const freshLegendaries = legendaries.filter((c) => !have.has(c.id));
  const guaranteed = (freshLegendaries.length ? freshLegendaries : legendaries)[Math.floor(random() * (freshLegendaries.length || legendaries.length))];
  const slot = Math.floor(random() * PACK_SIZE);
  const cards = [];
  for (let i = 0; i < PACK_SIZE; i++) {
    let card = guaranteed;
    if (i !== slot) {
      const legendary = random() < LEGENDARY_CHANCE;
      const tier = all.filter((c) => !!c.legendary === legendary);
      card = tier[Math.floor(random() * tier.length)];
    }
    const duplicate = have.has(card.id);
    if (duplicate) acc.dupes[card.id] = (acc.dupes[card.id] ?? 0) + 1;
    else have.add(card.id);
    cards.push({ id: card.id, duplicate, faction: card.faction });
  }
  acc.cards = [...have];
  return { cards };
}

// Buy one expansion card the player doesn't own yet.
export const cardPrice = (id) => (getCard(id)?.legendary ? CARD_PRICE.legendary : CARD_PRICE.normal);
export function buyCard(acc, id) {
  if (typeof id !== 'string' || !isExpansionCard(id)) return { error: "That card isn't for sale." };
  const have = ownedSet(acc);
  if (have.has(id)) return { error: 'You already own that card.' };
  const price = cardPrice(id);
  if ((acc.points ?? 0) < price) return { error: `${getCard(id).name} costs ${price} points. You have ${acc.points ?? 0}.` };
  acc.points -= price;
  have.add(id);
  acc.cards = [...have];
  return { id, price };
}

// An alternate board, and how many of the cards that unlock it the player owns (as the client counts it).
export function findBoard(id) {
  for (const [faction, list] of Object.entries(ALT_BOARDS)) { const b = list.find((x) => x.id === id); if (b) return { board: b, faction }; }
  return null;
}
export function boardCards({ board, faction }) {
  if (board.set) return extras().filter((c) => c.set === board.set).map((c) => c.id);
  if (board.cards) return board.cards;
  return extras().filter((c) => c.faction === faction && !c.set).map((c) => c.id);
}
export const ownsBoard = (acc, id) => {
  if ((acc.boards ?? []).includes(id)) return true;
  const f = findBoard(id); if (!f) return false;
  const need = boardCards(f), have = ownedSet(acc);
  return need.length > 0 && need.every((c) => have.has(c));
};
export function buyBoard(acc, id) {
  const f = typeof id === 'string' ? findBoard(id) : null;
  if (!f) return { error: "That board isn't for sale." };
  if (ownsBoard(acc, id)) return { error: 'You already have that board.' };
  if ((acc.points ?? 0) < BOARD_PRICE) return { error: `${id} costs ${BOARD_PRICE} points. You have ${acc.points ?? 0}.` };
  acc.points -= BOARD_PRICE;
  acc.boards = [...(acc.boards ?? []), id];
  return { id, faction: f.faction, price: BOARD_PRICE };
}

export const recycleValue = (id) => (getCard(id)?.legendary ? RECYCLE.legendary : RECYCLE.normal);

// Recycle duplicates: { id, count } (count defaults to all of that card), or all: true for every one.
export function recycle(acc, { id = null, count = null, all = false } = {}) {
  acc.dupes ??= {};
  const ids = all ? Object.keys(acc.dupes) : [id];
  let points = 0, n = 0;
  for (const c of ids) {
    const have = acc.dupes[c] ?? 0;
    const take = all ? have : Math.max(0, Math.min(have, count ?? have));
    if (!take) continue;
    points += take * recycleValue(c);
    n += take;
    acc.dupes[c] = have - take;
    if (!acc.dupes[c]) delete acc.dupes[c];
  }
  if (!n) return { error: 'No duplicates to recycle.' };
  acc.points = (acc.points ?? 0) + points;
  return { recycled: n, points };
}

// One time: bring over the expansion cards a player had unlocked in their browser.
export function importCards(acc, ids) {
  if (acc.cardsImported) return [];
  acc.cardsImported = true;
  const have = ownedSet(acc);
  const added = (Array.isArray(ids) ? ids : []).filter((id) => typeof id === 'string' && isExpansionCard(id) && !have.has(id));
  for (const id of added) have.add(id);
  acc.cards = [...have];
  return added;
}

// What the player sees of their economy.
export function economyView(acc, now = Date.now()) {
  refreshDailies(acc, now);
  return {
    points: acc.points ?? 0,
    cards: acc.cards ?? [],
    dupes: acc.dupes ?? {},
    boards: acc.boards ?? [],
    dailies: acc.dailies.list.map(({ id, kind, text, need, progress, done, factions, faction }) => ({ id, kind, text, need, progress, done, points: DAILY_POINTS, ...(factions ? { factions } : {}), ...(faction ? { faction } : {}) })),
    resetsIn: msUntilReset(now),
    cardsImported: !!acc.cardsImported,
    rules: { packCost: PACK_COST, legendaryPackCost: LEGENDARY_PACK_COST, packSize: PACK_SIZE, freePerFaction: FREE_PER_FACTION, recycle: RECYCLE, dailyPoints: DAILY_POINTS, legendaryChance: LEGENDARY_CHANCE, cardPrice: CARD_PRICE, boardPrice: BOARD_PRICE },
  };
}
