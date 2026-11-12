// Tests for the card economy (server/economy.js), the trade board (server/trades.js) and the stand-in
// opponents (server/bots.js), through the real server.
//
//   node tools/test-server-economy.mjs

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { startServer } from '../server/server.js';
import { openStore } from '../server/store.js';
import {
  BOARD_PRICE, CARD_PRICE, DAILIES_PER_DAY, DAILY_POINTS, FREE_PER_FACTION, LEGENDARY_PACK_COST, PACK_COST, PACK_SIZE, RECYCLE, awardWinUnlocks, dayOf, expansionOf,
  makeDailies, openLegendaryPack, openPack, recordPublicWin, recordPublicGame, countsForDailies, DAILY_MIN_TURNS, economyView, recycle, refreshDailies,
} from '../server/economy.js';
import { BOT_NAMES } from '../server/bots.js';
import { actingPlayer, applyAction, getLegalActions } from '../src/engine/engine.js';
import { allCards, getCard as getCardServer, restoreCustomCards } from '../src/engine/registry.js';
import { FACTION_DECKS } from '../src/cards/index.js';

process.env.QUIET = '1';
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'srv-econ-'));
const store = await openStore({ dataDir: dir });
const srv = await startServer({ port: 0, store, bots: { waitMin: 0.3, waitMax: 0.5, think: 5, ladderEveryMs: 0 } });
const URL_ = `ws://localhost:${srv.port}/ws`;

let passed = 0, failures = 0;
async function test(name, fn) {
  try {
    const problem = await fn();
    if (problem) { failures++; console.log(`FAIL ${name}: ${problem}`); } else { passed++; console.log(`ok   ${name}`); }
  } catch (e) { failures++; console.log(`FAIL ${name}: threw ${e.stack.split('\n').slice(0, 3).join(' | ')}`); }
}
function client() {
  const ws = new WebSocket(URL_);
  const inbox = [], waiters = [];
  ws.onmessage = (e) => { const m = JSON.parse(e.data); const w = waiters.findIndex((x) => x.t === m.t); if (w >= 0) waiters.splice(w, 1)[0].resolve(m); else inbox.push(m); };
  const open = new Promise((r) => { ws.onopen = r; });
  return {
    async send(m) { await open; ws.send(JSON.stringify(m)); },
    next(t, ms = 5000) {
      const i = inbox.findIndex((x) => x.t === t);
      if (i >= 0) return Promise.resolve(inbox.splice(i, 1)[0]);
      return new Promise((resolve, reject) => { const w = { t, resolve }; waiters.push(w); setTimeout(() => { const k = waiters.indexOf(w); if (k >= 0) { waiters.splice(k, 1); reject(new Error(`no '${t}' within ${ms} ms (inbox: ${inbox.map((x) => x.t).join(',')})`)); } }, ms); });
    },
    inbox, drop: () => { inbox.length = 0; }, close: () => ws.close(),
  };
}
async function signUp(name) {
  const c = client();
  await c.send({ t: 'register', v: 2, name, password: 'password123' });
  const w = await c.next('welcome');
  c.you = w.you;
  return c;
}
const edit = async (key, fn) => { const a = await store.get(key); fn(a); await store.save(a); return a; };
const acc = (cards = [], points = 0) => ({ key: 'tester', name: 'Tester', cards, points, dupes: {} });

// ---- Economy rules (pure) ----------------------------------------------------------------
await test('Dailies: 5 a day, always one fusion mission, the same list all day, new ones the next day', () => {
  const a = makeDailies('someone', '2026-11-12'), b = makeDailies('someone', '2026-11-12'), c = makeDailies('someone', '2026-11-13');
  if (a.length !== DAILIES_PER_DAY) return `${a.length} missions`;
  if (!a.some((m) => m.kind === 'fusion' && m.factions.length === 2)) return 'no fusion mission';
  if (new Set(a.map((m) => m.kind)).size !== DAILIES_PER_DAY) return 'repeated kinds';
  if (a.some((m) => m.kind === 'single') && a.some((m) => m.kind === 'pair')) return 'both deck shapes on one day';
  if (JSON.stringify(a) !== JSON.stringify(b)) return 'not stable within the day';
  if (JSON.stringify(a.map((m) => m.text)) === JSON.stringify(c.map((m) => m.text))) return 'same missions the next day';
});

await test('A day that started with 4 missions gets the 5th added, keeping progress', () => {
  const a = acc();
  const t0 = Date.parse('2026-11-12T10:00:00Z');
  refreshDailies(a, t0);
  const full = a.dailies.list.map((m) => m.kind);
  a.dailies.list = a.dailies.list.slice(0, 4);
  a.dailies.list[0].progress = 2;
  refreshDailies(a, t0);
  if (a.dailies.list.length !== 5) return `${a.dailies.list.length} missions`;
  if (a.dailies.list[0].progress !== 2) return 'progress lost';
  if (JSON.stringify(a.dailies.list.map((m) => m.kind)) !== JSON.stringify(full)) return 'different missions';
});

await test('Dailies count games played, win or lose; quitting in the first turns does not count', () => {
  if (!makeDailies('someone', '2026-11-12').every((m) => m.text.startsWith('Play '))) return 'missions still say Win';
  if (!countsForDailies('normal', 2)) return 'a game that ended normally must count';
  if (countsForDailies('concede', 2) || countsForDailies('disconnect', DAILY_MIN_TURNS - 1)) return 'an early quit counted';
  if (!countsForDailies('concede', DAILY_MIN_TURNS) || !countsForDailies('timeout', 9)) return 'a long game that ended by a quit must count';
  const a = acc();
  const t0 = Date.parse('2026-11-12T10:00:00Z');
  refreshDailies(a, t0);
  const any = a.dailies.list.find((m) => m.kind === 'any');
  if (!any) return 'no any-game mission today';
  recordPublicGame(a, { mode: 'quick', factions: ['Bees'] }, t0); // a loss is recorded just the same
  if (any.progress !== 1) return `progress ${any.progress}`;
});

await test('Missions handed out with the old "Win" wording show the new wording', () => {
  const a = acc();
  refreshDailies(a, Date.parse('2026-11-12T10:00:00Z'));
  a.dailies.list.forEach((m) => { m.text = m.text.replace(/^Play /, 'Win '); });
  const view = economyView(a, Date.parse('2026-11-12T11:00:00Z'));
  if (!view.dailies.every((m) => m.text.startsWith('Play '))) return JSON.stringify(view.dailies.map((m) => m.text));
});

await test('Dailies pay 80 points only when completed, only for public wins; an unfinished one is gone the next day', () => {
  const a = acc();
  const t0 = Date.parse('2026-11-12T10:00:00Z');
  refreshDailies(a, t0);
  const fusion = a.dailies.list.find((m) => m.kind === 'fusion');
  const win = { mode: 'quick', factions: fusion.factions };
  if (recordPublicWin(a, { ...win, mode: 'private' }, t0).length || a.points) return 'a private game counted';
  recordPublicWin(a, win, t0); recordPublicWin(a, win, t0);
  if (a.points !== 0 && !a.dailies.list.some((m) => m.done)) return `paid before completing (${a.points})`;
  const pointsBefore = a.points;
  const done = recordPublicWin(a, win, t0);
  if (!done.some((d) => d.id === fusion.id) || a.points < pointsBefore + DAILY_POINTS) return `fusion mission not paid (${a.points})`;
  const progressed = a.dailies.list.find((m) => !m.done && m.progress > 0);
  refreshDailies(a, t0 + 86400000);
  if (a.dailies.day !== dayOf(t0 + 86400000) || a.dailies.list.some((m) => m.progress)) return 'yesterday carried over';
  if (!progressed && a.dailies.list.length !== DAILIES_PER_DAY) return 'bad refresh';
});

await test('Wins unlock cards only until 10 of a realm are owned; the rest must come from packs', () => {
  const a = acc();
  for (let i = 0; i < 10; i++) awardWinUnlocks(a, ['Sharks']);
  const owned = expansionOf('Sharks').filter((c) => a.cards.includes(c.id)).length;
  if (owned !== FREE_PER_FACTION) return `owns ${owned} Sharks cards from wins`;
  if (awardWinUnlocks(a, ['Sharks']).length) return 'a 9th card from a win';
});

await test('Packs: 160 points for 7 cards of the realm, leaning to new cards; duplicates possible; 1% legendaries', () => {
  const a = acc([], PACK_COST * 2);
  const r = openPack(a, 'Void');
  if (r.error || r.cards.length !== PACK_SIZE || a.points !== PACK_COST) return JSON.stringify(r);
  if (!r.cards.every((c) => expansionOf('Void').some((x) => x.id === c.id))) return 'a card from another realm';
  if (openPack({ ...acc([], PACK_COST - 1) }, 'Void').error == null) return 'opened without enough points';
  // Over many packs: about 1% legendary, and duplicates do appear once most cards are owned.
  let legendary = 0, total = 0, dupes = 0;
  for (let i = 0; i < 400; i++) {
    const b = acc(expansionOf('Aliens').slice(0, 20).map((c) => c.id), PACK_COST);
    const p = openPack(b, 'Aliens');
    for (const c of p.cards) { total++; if (expansionOf('Aliens').find((x) => x.id === c.id).legendary) legendary++; if (c.duplicate) dupes++; }
  }
  const rate = legendary / total;
  if (rate > 0.025) return `legendary rate ${(rate * 100).toFixed(2)}%`;
  if (!dupes) return 'never a duplicate';
});

await test('Legendary Pack: 640 points, 7 cards from any realm, always at least one legendary you don\'t own yet', () => {
  if (!openLegendaryPack(acc([], LEGENDARY_PACK_COST - 1)).error) return 'opened without enough points';
  const realms = new Set();
  for (let i = 0; i < 60; i++) {
    const a = acc([], LEGENDARY_PACK_COST);
    const r = openLegendaryPack(a);
    if (r.error || r.cards.length !== PACK_SIZE || a.points !== 0) return JSON.stringify(r).slice(0, 120);
    const legs = r.cards.filter((c) => expansionOf(c.faction).find((x) => x.id === c.id)?.legendary);
    if (!legs.length) return 'no legendary';
    if (legs[0].duplicate && !r.cards.some((c) => !c.duplicate)) return 'the guaranteed legendary was a duplicate';
    r.cards.forEach((c) => realms.add(c.faction));
  }
  if (realms.size < 10) return `only ${realms.size} realms seen: not random across realms`;
});

await test('Duplicates recycle: 20 points each, 400 for a legendary; recycle all', () => {
  const a = acc(['x'], 0);
  const leg = expansionOf('Demons').find((c) => c.legendary).id, norm = expansionOf('Demons').find((c) => !c.legendary).id;
  a.dupes = { [leg]: 1, [norm]: 2 };
  const one = recycle(a, { id: norm, count: 1 });
  if (one.points !== RECYCLE.normal || a.dupes[norm] !== 1) return JSON.stringify(one);
  const all = recycle(a, { all: true });
  if (all.points !== RECYCLE.normal + RECYCLE.legendary || Object.keys(a.dupes).length) return JSON.stringify(all);
  if (!recycle(a, { all: true }).error) return 'recycled nothing';
});

// ---- Through the server ------------------------------------------------------------------
const alice = await signUp('Alicia'), bob = await signUp('Bobby');

await test('A new account starts with 1000 points; an older account gets them once on sign-in', async () => {
  if (alice.you.economy.points !== 1000) return `started with ${alice.you.economy.points}`;
  const old = await signUp('Oldtimer');
  await edit('oldtimer', (a) => { delete a.startPoints; a.points = 40; });
  const c = client();
  await c.send({ t: 'login', v: 2, name: 'Oldtimer', password: 'password123' });
  const w1 = (await c.next('welcome')).you.economy.points;
  c.close();
  const d = client();
  await d.send({ t: 'login', v: 2, name: 'Oldtimer', password: 'password123' });
  const w2 = (await d.next('welcome')).you.economy.points;
  d.close(); old.close();
  if (w1 !== 1040 || w2 !== 1040) return `got ${w1} then ${w2}`;
});

await test('The account carries the economy: points, cards, 4 dailies, the reset time', async () => {
  const e = alice.you.economy;
  if (!e || e.points !== 1000 || !Array.isArray(e.cards) || e.dailies.length !== DAILIES_PER_DAY || !(e.resetsIn > 0)) return JSON.stringify(e).slice(0, 200);
});

await test('Buying a pack puts it in Your packs unopened; opening it gives 7 cards, one pack at a time', async () => {
  await edit('alicia', (a) => { a.points = 1000; a.packs = []; });
  await alice.send({ t: 'buyPack', faction: 'Robots' });
  let m = await alice.next('packBought');
  if (m.you.economy.points !== 840 || m.you.economy.packs.Robots !== 1) return JSON.stringify(m.you.economy.packs);
  await alice.send({ t: 'buyPack', faction: 'Robots' });
  await alice.next('packBought');
  await alice.send({ t: 'buyPack', faction: 'legendary' });
  m = await alice.next('packBought');
  const packs = m.you.economy.packs;
  if (packs.Robots !== 2 || packs.legendary !== 1 || m.you.economy.points !== 40) return JSON.stringify({ packs, pts: m.you.economy.points });
  const cardsBefore = ((await store.get('alicia')).cards ?? []).length;
  await alice.send({ t: 'openPack', kind: 'Robots' });
  const p = await alice.next('pack');
  if (p.cards.length !== 7 || p.you.economy.packs.Robots !== 1 || p.you.economy.points !== 40) return JSON.stringify({ n: p.cards.length, packs: p.you.economy.packs, pts: p.you.economy.points });
  if (((await store.get('alicia')).cards ?? []).length <= cardsBefore) return 'no cards added';
  await alice.send({ t: 'openPack', kind: 'legendary' });
  const l = await alice.next('pack');
  if (!l.cards.some((c) => getCardServer(c.id)?.legendary) || l.you.economy.packs.legendary) return 'legendary pack wrong';
  await alice.send({ t: 'openPack', kind: 'Bees' });
  if (!/don't have a Bees pack/.test((await alice.next('reject')).msg)) return 'opened a pack the player does not have';
  await edit('bobby', (a) => { a.points = 20; });
  await bob.send({ t: 'buyPack', faction: 'Robots' });
  const no = await bob.next('reject');
  if (!/costs 160/.test(no.msg)) return no.msg;
});

await test('Importing browser unlocks works once, and only for real expansion cards', async () => {
  const ids = expansionOf('Bees').slice(0, 3).map((c) => c.id);
  await bob.send({ t: 'importCards', ids: [...ids, 'not_a_card'] });
  const m = await bob.next('me');
  if (m.imported !== 3 || !ids.every((id) => m.you.economy.cards.includes(id))) return JSON.stringify(m.imported);
  await bob.send({ t: 'importCards', ids: expansionOf('Ghosts').map((c) => c.id) });
  const again = await bob.next('me');
  if (again.imported !== 0) return 'imported twice';
});

// Trades: Alicia lists a card for "B, OR C + D, OR A + 300 points".
const [L, A, B, C, D] = expansionOf('Dragons').map((c) => c.id);
await test('Trade board: list a card with several options (a card, two cards together, or a card plus points); it is held', async () => {
  await edit('alicia', (a) => { a.cards = [L]; a.dupes = {}; a.points = 0; });
  await edit('bobby', (a) => { a.cards = [A, B, C, D]; a.dupes = {}; a.points = 500; });
  await alice.send({ t: 'postTrade', give: [L], wants: [{ cards: [B] }, { cards: [C, D] }, { cards: [A], points: 300 }] });
  await alice.next('tradePosted');
  const list = await alice.next('trades');
  const mine = list.listings.find((t) => t.mine);
  if (!mine || mine.wants.length !== 3) return JSON.stringify(list.listings);
  if ((await store.get('alicia')).cards.includes(L)) return 'the listed card was not held';
  await bob.send({ t: 'trades' });
  const seen = (await bob.next('trades')).listings.find((t) => t.id === mine.id);
  if (JSON.stringify(seen.canTake) !== '[0,1,2]') return `Bobby can take ${JSON.stringify(seen.canTake)}`;
  alice.id = mine.id;
});

await test('Taking a trade with the "two cards together" option swaps exactly those cards', async () => {
  await bob.send({ t: 'takeTrade', id: alice.id, option: 1 });
  const got = await bob.next('traded');
  await alice.next('traded');
  const a = await store.get('alicia'), b = await store.get('bobby');
  if (!a.cards.includes(C) || !a.cards.includes(D) || a.cards.includes(L)) return `Alicia ${a.cards}`;
  if (!b.cards.includes(L) || b.cards.includes(C) || b.cards.includes(D)) return `Bobby ${b.cards}`;
  if (got.got.cards[0] !== L) return JSON.stringify(got);
});

await test('Offers and counter-offers: an unlisted offer, a counter for a card plus points, accepted by the bidder', async () => {
  await edit('alicia', (a) => { a.cards = [A, C]; a.dupes = {}; a.points = 0; });
  await edit('bobby', (a) => { a.cards = [B, D]; a.dupes = {}; a.points = 250; });
  await alice.send({ t: 'postTrade', give: [A], wants: [{ cards: [C, B] }] });
  const id = (await alice.next('tradePosted')).id;
  await bob.send({ t: 'offerTrade', id, cards: [D] }); // not what she asked for
  await bob.next('tradeOffered');
  await alice.next('tradeUpdate');
  await alice.send({ t: 'trades' });
  const offer = (await alice.next('trades')).listings.find((t) => t.id === id).offers[0];
  if (!offer || offer.bundle.cards[0] !== D) return JSON.stringify(offer);
  await alice.send({ t: 'counterTrade', id, offer: offer.id, cards: [D], points: 200 }); // "D and 200 points"
  await bob.next('tradeUpdate');
  await alice.send({ t: 'acceptOffer', id, offer: offer.id });
  const wait = await alice.next('reject');
  if (!/Waiting for the other player/.test(wait.msg)) return `the lister accepted their own counter: ${wait.msg}`;
  await bob.send({ t: 'acceptOffer', id, offer: offer.id });
  await bob.next('traded');
  const a = await store.get('alicia'), b = await store.get('bobby');
  if (!a.cards.includes(D) || a.points !== 200 || !b.cards.includes(A) || b.points !== 50) return JSON.stringify({ a: [a.cards, a.points], b: [b.cards, b.points] });
});

await test('A trade can\'t be paid with points or cards the player no longer has; cancelling returns the card', async () => {
  await edit('alicia', (a) => { a.cards = [B]; a.dupes = {}; a.points = 0; });
  await edit('bobby', (a) => { a.cards = []; a.dupes = {}; a.points = 10; });
  await alice.send({ t: 'postTrade', give: [B], wants: [{ points: 100 }] });
  const pointsOnly = await alice.next('reject');
  if (!/only go along with a card/.test(pointsOnly.msg)) return `a points-only option was allowed: ${pointsOnly.msg}`;
  await alice.send({ t: 'postTrade', give: [B], wants: [{ cards: [A], points: 100 }] });
  const id = (await alice.next('tradePosted')).id;
  await bob.send({ t: 'offerTrade', id, points: 5 });
  if (!/only go along with a card/.test((await bob.next('reject')).msg)) return 'a points-only offer was allowed';
  await bob.send({ t: 'takeTrade', id, option: 0 });
  const no = await bob.next('reject');
  if (!/don't have/.test(no.msg)) return no.msg;
  await alice.send({ t: 'cancelTrade', id });
  await alice.next('tradeCancelled');
  if (!(await store.get('alicia')).cards.includes(B)) return 'card not returned';
});

await test('The public trade board is readable from the website API', async () => {
  await edit('alicia', (a) => { a.cards = [C]; });
  await alice.send({ t: 'postTrade', give: [C], wants: [{ cards: [D] }] });
  await alice.next('tradePosted');
  const r = await (await fetch(`http://localhost:${srv.port}/api/trades`)).json();
  if (!r.listings.some((t) => t.owner === 'Alicia' && t.give[0] === C)) return JSON.stringify(r).slice(0, 200);
  if (JSON.stringify(r).includes('offers')) return 'offers leaked';
});

await test('Buying single cards: 100 points, 1600 for a legendary; not one you own', async () => {
  const all = expansionOf('Vampires'), normal = all.find((c) => !c.legendary), legend = allCards().find((c) => c.extra && c.legendary && !c.token && !c.custom && !c.alwaysUnlocked);
  await edit('alicia', (a) => { a.cards = []; a.dupes = {}; a.points = 1700; });
  await alice.send({ t: 'buyCard', id: normal.id });
  const m = await alice.next('bought');
  if (m.price !== CARD_PRICE.normal || m.you.economy.points !== 1600 || !m.you.economy.cards.includes(normal.id)) return JSON.stringify(m).slice(0, 200);
  await alice.send({ t: 'buyCard', id: normal.id });
  if (!/already own/.test((await alice.next('reject')).msg)) return 'bought a card twice';
  await alice.send({ t: 'buyCard', id: legend.id });
  const l = await alice.next('bought');
  if (l.price !== 1600 || l.you.economy.points !== 0) return JSON.stringify(l).slice(0, 200);
  await alice.send({ t: 'buyCard', id: normal.id === all[1].id ? all[2].id : all[1].id });
  if (!/costs 100 points/.test((await alice.next('reject')).msg)) return 'bought without points';
});

await test('Buying a board: 1600 points; not when its set is already collected', async () => {
  await edit('alicia', (a) => { a.cards = []; a.boards = []; a.points = 2000; });
  await alice.send({ t: 'buyBoard', board: 'The Frozen Hoard' });
  const m = await alice.next('bought');
  if (m.price !== BOARD_PRICE || m.you.economy.points !== 400 || !m.you.economy.boards.includes('The Frozen Hoard')) return JSON.stringify(m).slice(0, 200);
  await edit('alicia', (a) => { a.points = 2000; a.cards = expansionOf('Vampires').filter((c) => !c.set).map((c) => c.id); });
  await alice.send({ t: 'buyBoard', board: 'The Blood Bar' });
  if (!/already have/.test((await alice.next('reject')).msg)) return 'sold a board the set already unlocked';
  await alice.send({ t: 'buyBoard', board: 'Not A Board' });
  if (!/isn't for sale/.test((await alice.next('reject')).msg)) return 'sold a made-up board';
});

// ---- Stand-in opponents -----------------------------------------------------------------
await test('Stand-ins exist as ladder accounts with records', async () => {
  const lb = await (await fetch(`http://localhost:${srv.port}/api/leaderboard`)).json();
  const names = new Set(BOT_NAMES);
  if (lb.rows.filter((r) => names.has(r.name)).length < 10) return `${lb.rows.length} on the ladder`;
});

await test('A player waiting in Quick Match is matched with a stand-in who plays its turns', async () => {
  const c = await signUp('Waiter');
  await c.send({ t: 'queue', mode: 'quick', format: 'single', factions: ['Vampires'], deck: FACTION_DECKS.Vampires });
  await c.next('queued');
  const start = await c.next('start', 6000);
  if (!BOT_NAMES.includes(start.opponent.name)) return `matched with ${start.opponent.name}`;
  // Play along: answer prompts and end turns; the stand-in must make moves of its own.
  let s = start.state, seat = start.seat, theirMoves = 0;
  const deadline = Date.now() + 20000;
  c.drop();
  while (!s.gameOver && Date.now() < deadline && theirMoves < 6) {
    restoreCustomCards(s);
    if (actingPlayer(s) === seat) {
      const legal = getLegalActions(s);
      const a = legal.find((x) => x.type === 'mulligan') ?? legal.find((x) => x.type === 'pass') ?? legal.find((x) => x.type === 'choose') ?? legal.find((x) => x.type === 'endTurn') ?? legal[0];
      applyAction(s, a);
      await c.send({ t: 'act', action: a });
    } else {
      const m = await Promise.race([c.next('act', 8000), c.next('sync', 8000)]).catch(() => null);
      if (!m) break;
      if (m.t === 'sync') s = m.state; else { applyAction(s, m.action); theirMoves++; }
    }
  }
  await c.send({ t: 'concede' });
  const res = await c.next('result', 6000);
  c.close();
  if (theirMoves < 3) return `the stand-in made ${theirMoves} moves`;
  if (res.reason !== 'concede') return JSON.stringify(res).slice(0, 120);
});

await test('Private games never get a stand-in', async () => {
  const c = await signUp('Lonely');
  await c.send({ t: 'queue', mode: 'private', friend: 'Alicia', format: 'single', factions: ['Vampires'], deck: FACTION_DECKS.Vampires });
  await c.next('queued');
  await new Promise((r) => setTimeout(r, 2500));
  const started = c.inbox.some((m) => m.t === 'start');
  await c.send({ t: 'cancel' });
  c.close();
  if (started) return 'a stand-in joined a private game';
});

alice.close(); bob.close();
await srv.close();
fs.rmSync(dir, { recursive: true, force: true });
console.log(`\n${passed} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
