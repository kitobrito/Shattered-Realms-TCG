// Connection to the Shattered Realms server (accounts, matchmaking, ranked).
// Same shape as net.js (on / send / leave) so the game code can use either.

import { stateHash } from './net.js';

export { stateHash };
export const PROTOCOL = 2;

// Where the server lives (on Render; see server/README.md). Empty means the site the game was
// loaded from (when the server hosts the game itself).
export const SERVER_URL = 'wss://shattered-realms.onrender.com/ws';

const TOKEN_KEY = 'shattered-token';

function serverUrl() {
  if (SERVER_URL) return SERVER_URL;
  if (!/^https?:$/.test(location.protocol)) return null; // the Android app / a file: page
  return `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`;
}

let ws = null;
let handlers = {};
let wanted = false;      // stay connected (reconnect when the line drops)
let retry = 0;
let opened = false;      // reached the server at least once since connect() was asked for
let retryTimer = null;
let outbox = [];
export let user = null;  // the signed-in account: { name, rating, tier, wins, losses, rankedWins, rankedLosses, rank }

// "Remember me": the sign-in token is kept in localStorage (it survives closing the game). Without
// it, the token lives in sessionStorage and is gone when the tab or app is closed.
const REMEMBER_KEY = 'shattered-remember';
const NAME_KEY = 'shattered-last-name';
export const savedName = () => { try { return localStorage.getItem(NAME_KEY) || null; } catch { return null; } };
const store = (kind) => { try { return kind === 'local' ? localStorage : sessionStorage; } catch { return null; } };
export const remembering = () => { try { return localStorage.getItem(REMEMBER_KEY) !== '0'; } catch { return true; } };
export function setRemember(on) {
  try { localStorage.setItem(REMEMBER_KEY, on ? '1' : '0'); } catch { /* storage unavailable */ }
  const t = token();
  if (t) setToken(t); // move an existing sign-in to the matching storage
}
export const token = () => { try { return store('local')?.getItem(TOKEN_KEY) || store('session')?.getItem(TOKEN_KEY) || null; } catch { return null; } };
function setToken(t) {
  for (const kind of ['local', 'session']) {
    try {
      const st = store(kind);
      if (t && (kind === 'local') === remembering()) st?.setItem(TOKEN_KEY, t); else st?.removeItem(TOKEN_KEY);
    } catch { /* storage unavailable */ }
  }
}
export const hasSavedLogin = () => !!token();
export const isOpen = () => ws?.readyState === 1;

// { data(msg), status('connecting' | 'open' | 'down'), error(message) }
export function on(h) { handlers = h; }

export function connect() {
  wanted = true;
  if (ws && ws.readyState <= 1) return;
  const url = serverUrl();
  if (!url) { handlers.error?.("This copy of the game isn't linked to a server yet."); return; }
  handlers.status?.('connecting');
  let sock;
  try { sock = new WebSocket(url); } catch { handlers.error?.("Couldn't reach the game server."); return; }
  ws = sock;
  sock.onopen = () => {
    retry = 0;
    opened = true;
    handlers.status?.('open');
    if (token()) sock.send(JSON.stringify({ t: 'resume', v: PROTOCOL, token: token() }));
    for (const m of outbox) sock.send(JSON.stringify(m));
    outbox = [];
  };
  sock.onmessage = (e) => {
    let msg;
    try { msg = JSON.parse(e.data); } catch { return; }
    if (msg.t === 'welcome') { setToken(msg.token); user = msg.you; try { localStorage.setItem(NAME_KEY, msg.you?.name ?? ''); } catch { /* storage unavailable */ } }
    if (msg.t === 'authError' && msg.expired) setToken(null);
    if (msg.t === 'loggedOut' || msg.t === 'replaced' || msg.t === 'accountDeleted') { user = null; if (msg.t !== 'replaced') setToken(null); }
    if (msg.t === 'replaced') wanted = false;
    if ((msg.t === 'me' || msg.t === 'result') && msg.you) user = msg.you;
    handlers.data?.(msg);
  };
  sock.onclose = () => {
    if (ws !== sock) return;
    ws = null;
    handlers.status?.('down');
    if (!wanted) return;
    // Never reached the server at all: give up after about a minute instead of retrying forever
    // (a server on a free plan can take that long to wake up).
    if (!opened && retry >= 6) {
      wanted = false;
      retry = 0;
      handlers.error?.("Can't reach the game server right now. Try again later.");
      return;
    }
    // Try again: 1 s, 2 s, 4 s ... up to 15 s.
    clearTimeout(retryTimer);
    retryTimer = setTimeout(connect, Math.min(15000, 1000 * 2 ** retry++));
  };
  sock.onerror = () => {};
}

export function send(msg) {
  if (ws?.readyState === 1) ws.send(JSON.stringify(msg));
  else if (msg.t !== 'emote' && msg.t !== 'act') { outbox.push(msg); connect(); } // a stale move is never replayed: the server's copy wins on reconnect
}

export function register(name, password) { send({ t: 'register', v: PROTOCOL, name, password }); }
export function login(name, password) { send({ t: 'login', v: PROTOCOL, name, password }); }
export function logout() { send({ t: 'logout', token: token() }); setToken(null); user = null; }

// Leave the current game or queue but keep the account connection.
export function leave() { if (isOpen()) send({ t: 'cancel' }); outbox = outbox.filter((m) => m.t !== 'act'); }

export function disconnect() {
  wanted = false;
  opened = false;
  retry = 0;
  clearTimeout(retryTimer);
  const s = ws;
  ws = null;
  try { s?.close(); } catch { /* already closed */ }
}
