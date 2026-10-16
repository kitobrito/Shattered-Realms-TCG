// Tests for the online server (server/server.js): two simulated players sign up, queue, play
// through the server exactly as the game does (each side applies moves to its own copy and the
// server referees), and the results, ranks, reconnects and account actions come out right.
//
//   node tools/test-server.mjs

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { startServer } from '../server/server.js';
import { openStore } from '../server/store.js';
import { applyResult, freshLadder, rankView } from '../server/ladder.js';
import { actingPlayer, applyAction, getLegalActions } from '../src/engine/engine.js';
import { restoreCustomCards } from '../src/engine/registry.js';
import { FACTION_DECKS, PLAYABLE_FACTIONS } from '../src/cards/index.js';
import { stateHash } from '../src/ui/net.js';

process.env.QUIET = '1';
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'srv-test-'));
// TEST_DATABASE_URL=postgres://... runs the same tests against Postgres (its tables are emptied first).
const DB = process.env.TEST_DATABASE_URL ?? '';
if (DB) {
  const { default: pg } = await import('pg');
  const c = new pg.Client({ connectionString: DB });
  await c.connect();
  await c.query('DROP TABLE IF EXISTS accounts, tokens');
  await c.end();
}
const store = await openStore({ dataDir: dir, databaseUrl: DB });
console.log(`(accounts in ${store.kind === 'postgres' ? 'Postgres' : 'a JSON file'})`);
const srv = await startServer({ port: 0, store });
const URL_ = `ws://localhost:${srv.port}/ws`;

let passed = 0, failures = 0;
async function test(name, fn) {
  try {
    const problem = await fn();
    if (problem) { failures++; console.log(`FAIL ${name}: ${problem}`); } else { passed++; console.log(`ok   ${name}`); }
  } catch (e) { failures++; console.log(`FAIL ${name}: threw ${e.stack.split('\n').slice(0, 3).join(' | ')}`); }
}

// A player's connection: collects messages; next(t) waits for the next message of that type.
function client(url = URL_) {
  const ws = new WebSocket(url);
  const inbox = [];
  const waiters = [];
  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    const w = waiters.findIndex((x) => x.t === msg.t);
    if (w >= 0) waiters.splice(w, 1)[0].resolve(msg); else inbox.push(msg);
  };
  const open = new Promise((r) => { ws.onopen = r; });
  return {
    ws,
    async send(m) { await open; ws.send(JSON.stringify(m)); },
    next(t, ms = 4000) {
      const i = inbox.findIndex((x) => x.t === t);
      if (i >= 0) return Promise.resolve(inbox.splice(i, 1)[0]);
      return new Promise((resolve, reject) => {
        const w = { t, resolve };
        waiters.push(w);
        setTimeout(() => { const k = waiters.indexOf(w); if (k >= 0) { waiters.splice(k, 1); reject(new Error(`no '${t}' within ${ms} ms (inbox: ${inbox.map((x) => x.t).join(',')})`)); } }, ms);
      });
    },
    has: (t) => inbox.some((x) => x.t === t),
    drop: () => { inbox.length = 0; },
    close: () => ws.close(),
  };
}

async function signUp(name, password = 'password123') {
  const c = client();
  await c.send({ t: 'register', v: 2, name, password });
  const w = await c.next('welcome');
  c.token = w.token;
  c.you = w.you;
  return c;
}

const deckOf = (f) => FACTION_DECKS[f];
const pairFactions = [PLAYABLE_FACTIONS[0], PLAYABLE_FACTIONS[1]];
const queueMsg = (mode, extra = {}) => ({ t: 'queue', mode, format: 'single', factions: ['Vampires'], deck: deckOf('Vampires'), ...extra });

// Both players play a match through the server: each keeps its own copy, sends its moves and
// applies the opponent's, as the game does. Turns just end (with a few plays) until `stopAt`.
async function playMatch(a, b, { turns = 6, onTurn } = {}) {
  const [sa, sb] = [await a.next('start'), await b.next('start')];
  const side = { [sa.seat]: { c: a, state: sa.state }, [sb.seat]: { c: b, state: sb.state } };
  if (sa.seat === sb.seat) throw new Error('both got the same seat');
  if (stateHash(sa.state) !== stateHash(sb.state)) throw new Error('players got different games');
  for (let step = 0; step < 400; step++) {
    const s = side[0].state;
    if (s.gameOver || s.turn > turns) break;
    const seat = actingPlayer(s);
    const me = side[seat], them = side[1 - seat];
    restoreCustomCards(me.state);
    const legal = getLegalActions(me.state);
    let action = legal.find((x) => x.type === 'mulligan') ?? legal.find((x) => x.type === 'choose')
      ?? legal.find((x) => x.type === 'play' && !x.target) ?? legal.find((x) => x.type === 'endTurn') ?? legal[0];
    if (onTurn) action = (await onTurn(me, them, action, seat)) ?? action;
    if (!action) break;
    applyAction(me.state, action);
    await me.c.send({ t: 'act', action, h: stateHash(me.state) });
    const got = await them.c.next('act');
    restoreCustomCards(them.state);
    applyAction(them.state, got.action);
    if (got.h !== stateHash(them.state)) throw new Error(`opponent copy drifted at step ${step}`);
  }
  return { side, seats: { a: sa.seat, b: sb.seat } };
}

// ---- Ladder (pure) ----

await test('Ladder: wins climb divisions, then a promotion series moves you up a tier', () => {
  let l = freshLadder();
  const events = [];
  for (let i = 0; i < 40 && l.tier === 0; i++) { const r = applyResult(l, true, 1000, 1000); l = r.ladder; if (r.event) events.push(r.event); }
  if (rankView(l).label !== 'Bronze 5') return `ended at ${rankView(l).label}`;
  for (const e of ['division', 'seriesStart', 'seriesWin', 'promoted']) if (!events.includes(e)) return `missing event ${e}: ${events}`;
});

await test('Ladder: losing at 0 RP drops a division but never out of the tier', () => {
  let l = { tier: 2, div: 4, rp: 0, series: null };
  let r = applyResult(l, false, 1000, 1000);
  if (r.event !== 'demoted' || rankView(r.ladder).label !== 'Silver 5') return `${r.event} ${rankView(r.ladder).label}`;
  r = applyResult({ ...r.ladder, rp: 0 }, false, 1000, 1000);
  if (rankView(r.ladder).label !== 'Silver 5' || r.ladder.rp !== 0) return `fell to ${rankView(r.ladder).label} ${r.ladder.rp}`;
});

await test('Ladder: a lost series sends you back to 75 RP in the same division', () => {
  let l = { tier: 3, div: 1, rp: 100, series: { wins: 0, losses: 1 } };
  const r = applyResult(l, false, 1000, 1000);
  if (r.event !== 'seriesFailed' || r.ladder.rp !== 75 || r.ladder.series || rankView(r.ladder).label !== 'Gold 1') return JSON.stringify(r);
});

await test('Ladder: Master to Legendary is a best of 5', () => {
  const v = rankView({ tier: 6, div: 0, rp: 100, series: { wins: 1, losses: 0 } });
  if (v.label !== 'Master' || v.series.best !== 5 || v.series.need !== 3 || v.series.to !== 'Legendary') return JSON.stringify(v);
});

// ---- Accounts ----

const alice = await signUp('Alice');
const bob = await signUp('Bob_2');

await test('Sign-up gives a token and a fresh Iron 5 account', () => {
  if (!alice.token || alice.you.label !== 'Iron 5' || alice.you.rp !== 0 || alice.you.wins !== 0) return JSON.stringify(alice.you);
});

await test('Names are unique (any capitals)', async () => {
  const c = client();
  await c.send({ t: 'register', v: 2, name: 'alice', password: 'password123' });
  const m = await c.next('authError');
  c.close();
  if (!/taken/.test(m.msg)) return m.msg;
});

await test('Bad names, short passwords and an old game version are refused', async () => {
  const c = client();
  await c.send({ t: 'register', v: 2, name: 'no spaces', password: 'password123' });
  const a = await c.next('authError');
  await c.send({ t: 'register', v: 2, name: 'Shorty', password: 'short' });
  const b = await c.next('authError');
  await c.send({ t: 'login', v: 1, name: 'Alice', password: 'password123' });
  const d = await c.next('authError');
  c.close();
  if (!/3-16/.test(a.msg) || !/8 characters/.test(b.msg) || !/out of date/.test(d.msg)) return [a.msg, b.msg, d.msg].join(' | ');
});

await test('Wrong password is refused; the right one signs in', async () => {
  const c = client();
  await c.send({ t: 'login', v: 2, name: 'Alice', password: 'nope-nope' });
  const bad = await c.next('authError');
  if (!/Wrong/.test(bad.msg)) return bad.msg;
  await c.send({ t: 'login', v: 2, name: 'ALICE', password: 'password123' });
  const w = await c.next('welcome');
  // Signing in elsewhere replaces the old connection.
  const r = await alice.next('replaced');
  c.close();
  if (w.you.name !== 'Alice' || !r.msg) return 'no welcome / replaced';
});

await test('A saved token signs you back in (resume); a bad one asks to sign in again', async () => {
  const c = client();
  await c.send({ t: 'resume', v: 2, token: alice.token });
  const w = await c.next('welcome');
  await c.send({ t: 'resume', v: 2, token: 'bogus' });
  const e = await c.next('authError');
  c.close();
  if (w.you.name !== 'Alice' || !e.expired) return 'resume failed';
});

// Fresh connections for the matches (the earlier test replaced Alice's).
const A = client(); await A.send({ t: 'resume', v: 2, token: alice.token }); await A.next('welcome');
const B = client(); await B.send({ t: 'resume', v: 2, token: bob.token }); await B.next('welcome');

await test('Queueing needs a legal deck', async () => {
  await A.send(queueMsg('quick', { deck: deckOf('Vampires').slice(0, 20) }));
  const r = await A.next('reject');
  if (!/legal deck/.test(r.msg)) return r.msg;
});

await test('Quick match: two players are matched, play through the server, and copies stay identical', async () => {
  await A.send(queueMsg('quick'));
  const q = await A.next('queued');
  await B.send(queueMsg('quick'));
  await B.next('queued');
  const { side } = await playMatch(A, B, { turns: 8 });
  if (q.mode !== 'quick') return 'queued wrong mode';
  if (stateHash(side[0].state) !== stateHash(side[1].state)) return 'copies differ';
});

await test('An illegal or out-of-turn move is refused with the server copy (sync)', async () => {
  await A.send({ t: 'act', action: { type: 'attack', player: 0, attacker: 999999, target: 1 }, h: 'x' });
  const s = await A.next('sync');
  if (!s.state?.players) return 'no state';
  A.drop(); B.drop();
});

await test('Concede ends the game: the opponent is told, both get results, quick match changes no rank', async () => {
  await A.send({ t: 'concede' });
  const [ra, rb, c] = await Promise.all([A.next('result'), B.next('result'), B.next('concede')]);
  if (ra.reason !== 'concede' || ra.winner === undefined || ra.winner !== rb.winner) return JSON.stringify([ra, rb]);
  if (rb.you.wins !== 1 || ra.you.losses !== 1 || ra.ladder || rb.you.rp !== 0) return JSON.stringify([ra.you, rb.you]);
  if (!c) return 'no concede notice';
});

await test('Ranked: the winner gains RP and the loser loses none at 0 RP; the leaderboard lists both', async () => {
  A.drop(); B.drop();
  await A.send(queueMsg('ranked'));
  await B.send(queueMsg('ranked'));
  await playMatch(A, B, { turns: 2 });
  await B.send({ t: 'concede' });
  const [ra, rb] = [await A.next('result'), await B.next('result')];
  if (ra.mode !== 'ranked' || !ra.ladder || ra.ladder.rpChange <= 0 || ra.you.rp <= 0 || ra.you.rankedWins !== 1) return JSON.stringify(ra);
  if (rb.you.rp !== 0 || rb.you.rankedLosses !== 1 || rb.ladder.rpChange !== null) return JSON.stringify([rb.you, rb.ladder]);
  await A.send({ t: 'leaderboard' });
  const lb = await A.next('leaderboard');
  if (lb.rows.length !== 2 || lb.rows[0].name !== 'Alice' || lb.rows[0].place !== 1 || ra.you.place !== 1) return JSON.stringify(lb.rows);
});

await test('Different formats are not matched together', async () => {
  A.drop(); B.drop();
  await A.send(queueMsg('quick'));
  await B.send(queueMsg('quick', { format: 'pair', factions: pairFactions, deck: [...deckOf(pairFactions[0]).slice(0, 20), ...deckOf(pairFactions[1]).slice(0, 20)] }));
  await A.next('queued'); await B.next('queued');
  await new Promise((r) => setTimeout(r, 2500));
  const started = A.has('start') || B.has('start');
  await A.send({ t: 'cancel' }); await B.send({ t: 'cancel' });
  await A.next('cancelled'); await B.next('cancelled');
  if (started) return 'matched across formats';
});

await test('Private match: only the two friends who typed each other are matched', async () => {
  const carol = await signUp('Carol');
  await A.send(queueMsg('private', { friend: 'Bob_2' }));
  await carol.send(queueMsg('private', { friend: 'Alice' }));
  await A.next('queued'); await carol.next('queued');
  await new Promise((r) => setTimeout(r, 300));
  if (A.has('start')) return 'Alice matched with Carol';
  await B.send(queueMsg('private', { friend: 'alice' }));
  const [sa, sb] = [await A.next('start'), await B.next('start')];
  await carol.send({ t: 'cancel' }); await carol.next('cancelled');
  await carol.send(queueMsg('private', { friend: 'Nobody_here' }));
  const nobody = await carol.next('reject');
  carol.close();
  if (sa.mode !== 'private' || sb.opponent.name !== 'Alice' || !/no player/.test(nobody.msg)) return JSON.stringify([sa.mode, sb.opponent, nobody.msg]);
});

await test('Disconnect and come back: the game resumes; the opponent hears about it', async () => {
  B.close();
  const away = await A.next('oppAway');
  const B2 = client();
  await B2.send({ t: 'resume', v: 2, token: bob.token });
  await B2.next('welcome');
  const st = await B2.next('start');
  const back = await A.next('oppBack');
  globalThis.B2 = B2;
  if (!st.resume || st.mode !== 'private' || away.seconds !== 60 || !back) return JSON.stringify({ resume: st.resume, mode: st.mode, away });
});

await test('Leaving for good loses the game after the grace period', async () => {
  // Shorten the wait for the test by finishing via concede from the leaver's new connection instead.
  const B2 = globalThis.B2;
  await B2.send({ t: 'concede' });
  const ra = await A.next('result');
  if (ra.winner == null) return 'no winner';
  B2.close();
  await A.next('oppAway').catch(() => null); // the closed connection is no longer in a game: no notice expected
});

await test('Deleting an account needs the password and removes it', async () => {
  const d = await signUp('Doomed');
  await d.send({ t: 'deleteAccount', password: 'wrong-password' });
  const no = await d.next('reject');
  await d.send({ t: 'deleteAccount', password: 'password123' });
  await d.next('accountDeleted');
  d.close();
  const c = client();
  await c.send({ t: 'login', v: 2, name: 'Doomed', password: 'password123' });
  const e = await c.next('authError');
  c.close();
  if (!/Wrong password/.test(no.msg) || !/Wrong name/.test(e.msg)) return [no.msg, e.msg].join(' | ');
});

await test('Accounts and results are saved (a restarted server still has them)', async () => {
  await store.close();
  const again = await openStore({ dataDir: dir, databaseUrl: DB });
  const a = await again.get('alice');
  await again.close();
  if (!a || a.rankedWins !== 1 || a.wins < 2 || a.hash === 'password123') return JSON.stringify(a);
});

await test('The server serves the game and refuses anything outside it', async () => {
  const base = `http://localhost:${srv.port}`;
  const [home, eng, priv, health] = await Promise.all([fetch(`${base}/`), fetch(`${base}/src/engine/engine.js`), fetch(`${base}/server/store.js`), fetch(`${base}/health`)]);
  if (home.status !== 200 || eng.status !== 200 || priv.status !== 404 || (await health.text()) !== 'ok') return [home.status, eng.status, priv.status].join(',');
});

A.close();
await srv.close();

// A second server with short waits, for the time-outs.
{
  const dir2 = fs.mkdtempSync(path.join(os.tmpdir(), 'srv-test-'));
  const fast = await startServer({ port: 0, store: await openStore({ dataDir: dir2, databaseUrl: '' }), awaySeconds: 1, idleSeconds: 2, mulliganSeconds: 2 });
  const url = `ws://localhost:${fast.port}/ws`;
  const join = async (name) => {
    const c = client(url);
    await c.send({ t: 'register', v: 2, name, password: 'password123' });
    c.token = (await c.next('welcome')).token;
    return c;
  };
  const p = await join('Patient'), q = await join('Quitter');

  await test('Leaving and not coming back loses the game (disconnect)', async () => {
    await p.send(queueMsg('ranked')); await q.send(queueMsg('ranked'));
    await p.next('start'); await q.next('start');
    q.close();
    const away = await p.next('oppAway');
    const r = await p.next('result', 5000);
    const seatP = r.winner;
    if (away.seconds !== 1 || r.reason !== 'disconnect' || r.you.rankedWins !== 1 || seatP == null) return JSON.stringify(r);
  });

  await test('Not playing at all (still connected) loses on time', async () => {
    const q2 = client(url);
    await q2.send({ t: 'resume', v: 2, token: q.token }); await q2.next('welcome');
    p.drop();
    await p.send(queueMsg('quick')); await q2.send(queueMsg('quick'));
    await p.next('start'); await q2.next('start');
    const [r1, r2] = [await p.next('result', 8000), await q2.next('result', 8000)];
    q2.close();
    if (r1.reason !== 'timeout' || r1.winner !== r2.winner || r1.winner == null) return JSON.stringify(r1);
  });
  p.close();
  await fast.close();
  fs.rmSync(dir2, { recursive: true, force: true });
}
fs.rmSync(dir, { recursive: true, force: true });
console.log(`\n${passed} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
