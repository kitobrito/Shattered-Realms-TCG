// The Shattered Realms server: accounts, Quick / Ranked / Private matchmaking, and the referee
// for online games. It also serves the game itself, so the same address works in a browser.
//
//   node server/server.js            (PORT, DATABASE_URL, DATA_DIR from the environment)
//
// Talks to src/ui/server-link.js over a WebSocket at /ws, one JSON message at a time ({ t: ... }).
// Every move is checked and applied here with the same engine the game uses; the server's copy
// of each game is the one that counts (a player whose copy drifts gets it back with 'sync').

import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { promisify } from 'node:util';
import { WebSocketServer } from 'ws';
import { actingPlayer, applyAction, createGame, legalMatch } from '../src/engine/engine.js';
import { restoreCustomCards } from '../src/engine/registry.js';
import { checkDeck } from '../src/cards/deck-check.js';
import { stateHash } from '../src/ui/net.js';
import { applyResult, freshLadder, newRating, rankView, START_RATING } from './ladder.js';
import { openStore } from './store.js';

export const PROTOCOL = 2;
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const TOKEN_DAYS = 60;
const AWAY_SECONDS = 60;        // a disconnected player has this long to come back
const IDLE_SECONDS = 150;       // the game's own turn timer ends a turn at 75 s; this is the backstop
const MULLIGAN_SECONDS = 120;
const scrypt = promisify(crypto.scrypt);

const log = (...a) => { if (!process.env.QUIET) console.log(new Date().toISOString(), ...a); };

// ---- Accounts -------------------------------------------------------------------------

const NAME_RE = /^[A-Za-z0-9_]{3,16}$/;
const hashPassword = async (password, salt) => (await scrypt(password, salt, 64)).toString('hex');
async function passwordOk(acc, password) {
  if (typeof password !== 'string' || !acc) return false;
  const h = Buffer.from(await hashPassword(password, acc.salt), 'hex');
  const want = Buffer.from(acc.hash, 'hex');
  return h.length === want.length && crypto.timingSafeEqual(h, want);
}

// ---- Server ---------------------------------------------------------------------------

export async function startServer({ port = Number(process.env.PORT) || 8080, store: givenStore, awaySeconds = AWAY_SECONDS,
  idleSeconds = IDLE_SECONDS, mulliganSeconds = MULLIGAN_SECONDS } = {}) {
  const store = givenStore ?? await openStore();
  if (store.kind === 'file') {
    log(`Accounts are saved in ${store.file}.`);
    if (process.env.RENDER) log('WARNING: no DATABASE_URL set. On Render this file is wiped on every restart or deploy; add a Postgres database (see server/README.md).');
  } else log('Accounts are saved in Postgres.');

  const conns = new Map();   // account key → the signed-in connection
  const queue = [];          // waiting players: { key, conn, mode, friendKey, friend, format, factions, deck, rating, since }
  const games = new Map();   // account key → game
  const loginTries = new Map(); // ip → [times]

  // What a player sees about themselves.
  async function youOf(acc) {
    return {
      name: acc.name, ...rankView(acc.ladder), rating: acc.rating,
      wins: acc.wins, losses: acc.losses, rankedWins: acc.rankedWins, rankedLosses: acc.rankedLosses,
      place: await store.place(acc),
    };
  }
  const send = (conn, msg) => { if (conn?.ws.readyState === 1) conn.ws.send(JSON.stringify(msg)); };
  const sendTo = (key, msg) => send(conns.get(key), msg);

  // ---- Signing in.

  async function attach(conn, acc) {
    const old = conns.get(acc.key);
    if (old && old !== conn) {
      leaveQueue(acc.key);
      old.key = null;
      send(old, { t: 'replaced', msg: 'You signed in somewhere else.' });
      try { old.ws.close(); } catch { /* gone */ }
    }
    conn.key = acc.key;
    conns.set(acc.key, conn);
  }

  async function welcome(conn, acc, token) {
    await attach(conn, acc);
    send(conn, { t: 'welcome', token, you: await youOf(acc) });
    const game = games.get(acc.key);
    if (game && !game.over) rejoin(game, acc.key);
  }

  async function newToken(key) {
    const token = crypto.randomBytes(32).toString('hex');
    await store.addToken(token, key, Date.now() + TOKEN_DAYS * 86400e3);
    return token;
  }

  function tooManyTries(ip) {
    const now = Date.now();
    const recent = (loginTries.get(ip) ?? []).filter((t) => now - t < 5 * 60e3);
    recent.push(now);
    loginTries.set(ip, recent);
    return recent.length > 12;
  }

  const outdated = (msg) => msg.v !== PROTOCOL;
  const OUTDATED = 'Your copy of the game is out of date. Refresh the page (or update the app) and try again.';

  async function onRegister(conn, msg) {
    if (outdated(msg)) return send(conn, { t: 'authError', msg: OUTDATED });
    const name = String(msg.name ?? '').trim();
    const password = String(msg.password ?? '');
    if (!NAME_RE.test(name)) return send(conn, { t: 'authError', msg: 'Names are 3-16 letters, numbers or _.' });
    if (password.length < 8 || password.length > 128) return send(conn, { t: 'authError', msg: 'Passwords need at least 8 characters.' });
    if (tooManyTries(conn.ip)) return send(conn, { t: 'authError', msg: 'Too many tries. Wait a few minutes and try again.' });
    const salt = crypto.randomBytes(16).toString('hex');
    const acc = {
      key: name.toLowerCase(), name, salt, hash: await hashPassword(password, salt), created: Date.now(),
      wins: 0, losses: 0, rankedWins: 0, rankedLosses: 0, rating: START_RATING, ladder: freshLadder(),
    };
    if (!(await store.create(acc))) return send(conn, { t: 'authError', msg: 'That name is taken. Try another.' });
    log(`new account ${name}`);
    await welcome(conn, acc, await newToken(acc.key));
  }

  async function onLogin(conn, msg) {
    if (outdated(msg)) return send(conn, { t: 'authError', msg: OUTDATED });
    if (tooManyTries(conn.ip)) return send(conn, { t: 'authError', msg: 'Too many tries. Wait a few minutes and try again.' });
    const acc = await store.get(String(msg.name ?? '').trim().toLowerCase());
    if (!(await passwordOk(acc, msg.password))) return send(conn, { t: 'authError', msg: 'Wrong name or password.' });
    await welcome(conn, acc, await newToken(acc.key));
  }

  async function onResume(conn, msg) {
    if (outdated(msg)) return send(conn, { t: 'authError', msg: OUTDATED });
    const tok = typeof msg.token === 'string' ? await store.getToken(msg.token) : null;
    const acc = tok && tok.expires > Date.now() ? await store.get(tok.key) : null;
    if (!acc) {
      if (tok) await store.removeToken(msg.token);
      return send(conn, { t: 'authError', msg: 'Please sign in again.', expired: true });
    }
    await welcome(conn, acc, msg.token);
  }

  async function signOut(conn) {
    if (!conn.key) return;
    leaveQueue(conn.key);
    const game = games.get(conn.key);
    if (game && !game.over) await finish(game, 1 - game.seats.indexOf(conn.key), 'concede');
    conns.delete(conn.key);
    conn.key = null;
  }

  // ---- Matchmaking.

  function leaveQueue(key) {
    const i = queue.findIndex((q) => q.key === key);
    if (i >= 0) queue.splice(i, 1);
    return i >= 0;
  }

  async function onQueue(conn, msg) {
    const acc = await store.get(conn.key);
    if (!acc) return;
    const game = games.get(acc.key);
    if (game && !game.over) return rejoin(game, acc.key);
    const mode = ['quick', 'ranked', 'private'].includes(msg.mode) ? msg.mode : null;
    if (!mode) return send(conn, { t: 'reject', msg: 'Pick a match type.' });
    const entry = checkDeck({ format: msg.format, factions: msg.factions, deck: msg.deck });
    if (entry.error) return send(conn, { t: 'reject', msg: entry.error });
    let friend = null;
    if (mode === 'private') {
      friend = String(msg.friend ?? '').trim();
      if (!NAME_RE.test(friend)) return send(conn, { t: 'reject', msg: "Type your friend's name." });
      if (friend.toLowerCase() === acc.key) return send(conn, { t: 'reject', msg: "That's your own name. Type your friend's." });
      if (!(await store.get(friend.toLowerCase()))) return send(conn, { t: 'reject', msg: `There's no player called ${friend}.` });
    }
    leaveQueue(acc.key);
    queue.push({ key: acc.key, conn, mode, friend, friendKey: friend?.toLowerCase() ?? null, ...entry, rating: acc.rating, since: Date.now() });
    send(conn, { t: 'queued', mode, friend });
    await matchmake();
  }

  // Ranked pairs players of a similar rating; the allowed gap widens the longer they wait.
  const ratingReach = (q, now) => 100 + 25 * Math.floor((now - q.since) / 1000);
  function findPair() {
    const now = Date.now();
    for (let i = 0; i < queue.length; i++) {
      for (let j = i + 1; j < queue.length; j++) {
        const a = queue[i], b = queue[j];
        if (a.mode !== b.mode || a.format !== b.format) continue;
        if (a.mode === 'private' && !(a.friendKey === b.key && b.friendKey === a.key)) continue;
        if (a.mode === 'ranked' && Math.abs(a.rating - b.rating) > Math.max(ratingReach(a, now), ratingReach(b, now))) continue;
        return [a, b];
      }
    }
    return null;
  }

  let matching = false;
  async function matchmake() {
    if (matching) return;
    matching = true;
    try {
      for (let pair = findPair(); pair; pair = findPair()) {
        for (const q of pair) leaveQueue(q.key);
        await startGame(pair[0], pair[1]);
      }
    } finally { matching = false; }
  }

  // ---- Games.

  async function startGame(a, b) {
    const accs = [await store.get(a.key), await store.get(b.key)];
    if (accs.some((x) => !x)) return;
    const flip = Math.random() < 0.5;
    const seats = flip ? [a, b] : [b, a];
    const seatAccs = flip ? accs : [accs[1], accs[0]];
    const state = createGame({
      seed: crypto.randomInt(2 ** 31),
      players: seats.map((q, i) => ({ name: seatAccs[i].name, factions: q.factions, deck: q.deck })),
    });
    const game = {
      id: crypto.randomBytes(6).toString('hex'), mode: a.mode, format: a.format, state,
      seats: seats.map((q) => q.key), names: seatAccs.map((x) => x.name), factions: seats.map((q) => q.factions),
      labels: seatAccs.map((x) => rankView(x.ladder).label),
      over: false, away: [null, null], lastMove: Date.now(), turnKey: null,
    };
    for (const k of game.seats) games.set(k, game);
    log(`game ${game.id} ${game.mode} ${game.names.join(' vs ')}`);
    for (let seat = 0; seat < 2; seat++) send(conns.get(game.seats[seat]), await startMsg(game, seat, false));
  }

  async function startMsg(game, seat, resume) {
    const acc = await store.get(game.seats[seat]);
    return {
      t: 'start', resume, mode: game.mode, format: game.format, state: game.state, seat,
      factions: game.factions[seat], theirFactions: game.factions[1 - seat],
      opponent: { name: game.names[1 - seat], label: game.labels[1 - seat] }, you: acc ? await youOf(acc) : null,
    };
  }

  async function rejoin(game, key) {
    const seat = game.seats.indexOf(key);
    if (game.away[seat]) { clearTimeout(game.away[seat]); game.away[seat] = null; sendTo(game.seats[1 - seat], { t: 'oppBack' }); }
    send(conns.get(key), await startMsg(game, seat, true));
  }

  async function onAct(conn, msg) {
    const game = games.get(conn.key);
    if (!game || game.over) return;
    const seat = game.seats.indexOf(conn.key);
    const s = game.state;
    restoreCustomCards(s);
    const action = actingPlayer(s) === seat ? legalMatch(s, msg.action) : null;
    if (!action) return send(conn, { t: 'sync', state: s }); // their copy has drifted: send ours
    const before = structuredClone(s);
    try {
      applyAction(s, action);
    } catch (err) {
      game.state = before;
      log(`game ${game.id}: engine error on ${JSON.stringify(action)}: ${err.message}`);
      return send(conn, { t: 'sync', state: game.state });
    }
    game.lastMove = Date.now();
    const h = stateHash(s);
    sendTo(game.seats[1 - seat], { t: 'act', action, h });
    if (msg.h && msg.h !== h) send(conn, { t: 'sync', state: s });
    if (s.gameOver) await finish(game, s.winner, 'normal');
  }

  // The game is over: record it and tell both players.
  async function finish(game, winner, reason) {
    if (game.over) return;
    game.over = true;
    for (const t of game.away) clearTimeout(t);
    const accs = await Promise.all(game.seats.map((k) => store.get(k)));
    const ladder = [null, null];
    if (winner === 0 || winner === 1) {
      const ratings = accs.map((x) => x?.rating ?? START_RATING);
      for (let seat = 0; seat < 2; seat++) {
        const acc = accs[seat];
        if (!acc) continue;
        const won = seat === winner;
        if (won) acc.wins++; else acc.losses++;
        if (game.mode === 'ranked') {
          const r = applyResult(acc.ladder ?? freshLadder(), won, ratings[seat], ratings[1 - seat]);
          acc.ladder = r.ladder;
          ladder[seat] = { rpChange: r.rpChange, event: r.event };
          if (won) acc.rankedWins++; else acc.rankedLosses++;
          acc.rating = newRating(ratings[seat], ratings[1 - seat], won);
        }
        await store.save(acc);
      }
    }
    log(`game ${game.id} over: ${winner == null ? 'draw' : game.names[winner]} (${reason})`);
    for (let seat = 0; seat < 2; seat++) {
      const acc = accs[seat];
      sendTo(game.seats[seat], { t: 'result', winner, mode: game.mode, reason, you: acc ? await youOf(acc) : null, ladder: ladder[seat] });
      if (games.get(game.seats[seat]) === game) games.delete(game.seats[seat]);
    }
  }

  async function onConcede(conn) {
    const game = games.get(conn.key);
    if (!game || game.over) return;
    const seat = game.seats.indexOf(conn.key);
    sendTo(game.seats[1 - seat], { t: 'concede' });
    await finish(game, 1 - seat, 'concede');
  }

  function onGone(conn) {
    const key = conn.key;
    if (!key || conns.get(key) !== conn) return;
    conns.delete(key);
    leaveQueue(key);
    const game = games.get(key);
    if (!game || game.over) return;
    const seat = game.seats.indexOf(key);
    sendTo(game.seats[1 - seat], { t: 'oppAway', seconds: awaySeconds });
    clearTimeout(game.away[seat]);
    game.away[seat] = setTimeout(() => {
      game.away[seat] = null;
      // Both gone: nobody to award it to, so it just ends.
      if (!conns.has(game.seats[1 - seat])) { game.over = true; for (const k of game.seats) if (games.get(k) === game) games.delete(k); return; }
      finish(game, 1 - seat, 'disconnect').catch((e) => log('finish failed', e));
    }, awaySeconds * 1000);
  }

  // A player who stops playing (but stays connected) loses after a while.
  const idleCheck = setInterval(() => {
    const now = Date.now();
    for (const game of new Set(games.values())) {
      if (game.over) continue;
      const s = game.state;
      const key = `${s.turn}:${actingPlayer(s)}:${s.pending?.type ?? ''}`;
      if (key !== game.turnKey) { game.turnKey = key; game.lastMove = Math.max(game.lastMove, now - 1000); }
      const limit = (s.pending?.type === 'mulligan' ? mulliganSeconds : idleSeconds) * 1000;
      const seat = actingPlayer(s);
      if (now - game.lastMove > limit && !game.away[seat]) finish(game, 1 - seat, 'timeout').catch((e) => log('finish failed', e));
    }
    matchmake().catch((e) => log('matchmake failed', e));
  }, Math.min(2000, idleSeconds * 250));

  // ---- Messages.

  async function onMessage(conn, msg) {
    switch (msg.t) {
      case 'register': return onRegister(conn, msg);
      case 'login': return onLogin(conn, msg);
      case 'resume': return onResume(conn, msg);
      case 'logout':
        if (typeof msg.token === 'string') await store.removeToken(msg.token);
        await signOut(conn);
        return send(conn, { t: 'loggedOut' });
    }
    if (!conn.key) return send(conn, { t: 'authError', msg: 'Sign in first.' });
    switch (msg.t) {
      case 'me': { const acc = await store.get(conn.key); if (acc) send(conn, { t: 'me', you: await youOf(acc) }); return; }
      case 'leaderboard': {
        const rows = await store.top(50);
        return send(conn, { t: 'leaderboard', rows: rows.map((a, i) => ({ place: i + 1, name: a.name, ...rankView(a.ladder), wins: a.rankedWins, losses: a.rankedLosses })) });
      }
      case 'queue': return onQueue(conn, msg);
      case 'cancel': if (leaveQueue(conn.key)) send(conn, { t: 'cancelled' }); return;
      case 'act': return onAct(conn, msg);
      case 'needSync': { const g = games.get(conn.key); if (g && !g.over) send(conn, { t: 'sync', state: g.state }); return; }
      case 'emote': {
        const g = games.get(conn.key);
        if (!g || g.over || typeof msg.kind !== 'string' || msg.kind.length > 24) return;
        if (Date.now() - (conn.lastEmote ?? 0) < 1500) return;
        conn.lastEmote = Date.now();
        return sendTo(g.seats[1 - g.seats.indexOf(conn.key)], { t: 'emote', kind: msg.kind });
      }
      case 'concede': return onConcede(conn);
      case 'deleteAccount': {
        const acc = await store.get(conn.key);
        if (!(await passwordOk(acc, msg.password))) return send(conn, { t: 'reject', msg: 'Wrong password.' });
        const key = conn.key;
        await signOut(conn);
        await store.remove(key);
        log(`deleted account ${acc.name}`);
        return send(conn, { t: 'accountDeleted' });
      }
    }
  }

  // ---- HTTP: the game's files, a health check, and the WebSocket.

  const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
    '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
    '.gif': 'image/gif', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.ico': 'image/x-icon' };
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    if (url.pathname === '/health') { res.writeHead(200, { 'content-type': 'text/plain', 'access-control-allow-origin': '*' }); return res.end('ok'); }
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
    let rel = decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html';
    if (!(rel === 'index.html' || rel.startsWith('src/') || rel.startsWith('art/'))) { res.writeHead(404); return res.end('Not found'); }
    const file = path.resolve(ROOT, rel);
    if (!file.startsWith(ROOT + path.sep)) { res.writeHead(404); return res.end(); }
    fs.stat(file, (err, st) => {
      if (err || !st.isFile()) { res.writeHead(404); return res.end('Not found'); }
      res.writeHead(200, { 'content-type': TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream', 'content-length': st.size,
        'cache-control': rel.startsWith('art/') ? 'public, max-age=86400' : 'no-cache' });
      if (req.method === 'HEAD') return res.end();
      fs.createReadStream(file).pipe(res);
    });
  });

  const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 1024 * 1024 });
  wss.on('connection', (ws, req) => {
    const conn = { ws, key: null, ip: String(req.headers['x-forwarded-for'] ?? req.socket.remoteAddress ?? '').split(',')[0].trim(), alive: true, bucket: [] };
    ws.on('pong', () => { conn.alive = true; });
    let chain = Promise.resolve(); // one message at a time per player, in order
    ws.on('message', (data) => {
      const now = Date.now();
      conn.bucket = conn.bucket.filter((t) => now - t < 10e3);
      conn.bucket.push(now);
      if (conn.bucket.length > 120) { try { ws.close(1008, 'Too many messages'); } catch { /* gone */ } return; }
      let msg;
      try { msg = JSON.parse(data); } catch { return; }
      if (!msg || typeof msg !== 'object' || typeof msg.t !== 'string') return;
      chain = chain.then(() => onMessage(conn, msg)).catch((err) => log('message failed', msg.t, err));
    });
    ws.on('close', () => { chain.then(() => onGone(conn)); });
    ws.on('error', () => {});
  });
  // Drop connections that stopped answering (and keep idle ones open through proxies).
  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      const conn = [...conns.values()].find((c) => c.ws === ws);
      if (conn && !conn.alive) { ws.terminate(); continue; }
      if (conn) conn.alive = false;
      try { ws.ping(); } catch { /* gone */ }
    }
  }, 30e3);

  await new Promise((resolve) => server.listen(port, resolve));
  log(`Shattered Realms server on port ${server.address().port}`);
  return {
    port: server.address().port,
    async close() {
      clearInterval(idleCheck); clearInterval(heartbeat);
      for (const ws of wss.clients) ws.terminate();
      await new Promise((r) => wss.close(r));
      await new Promise((r) => server.close(r));
      await store.close?.();
    },
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  startServer().catch((err) => { console.error(err); process.exit(1); });
}
