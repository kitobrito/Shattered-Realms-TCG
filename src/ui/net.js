// Online play between two browsers, joined by a short room code.
// PeerJS (bundled in src/vendor, loaded on demand) introduces the two browsers through its
// free public broker; after that they talk directly (WebRTC data channel).
// The host builds the game and sends it once; from then on each side sends
// only the actions its player takes, and both engines apply them (the engine
// is deterministic from its seed, so both copies stay identical).

// PeerJS 1.5.4 ships with the game (src/vendor, from npm) rather than loading from a CDN at runtime.
const PEERJS_URL = new URL('../vendor/peerjs.min.js', import.meta.url).href;
const PREFIX = 'shattered-realms-v1-';
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O, 1/I/L
export const CODE_LENGTH = 5;

let peer = null;
let conn = null;
let handlers = {};

export const isConnected = () => !!conn?.open;

// { code(code), open(), data(msg), close(), error(message) }
export function on(h) { handlers = h; }

async function loadPeer() {
  if (window.Peer) return;
  await new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = PEERJS_URL;
    s.onload = resolve;
    s.onerror = () => reject(new Error('Could not load the online service. Check your internet connection.'));
    document.head.appendChild(s);
  });
}

const randomCode = () => Array.from({ length: CODE_LENGTH }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('');
export const cleanCode = (text) => String(text ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LENGTH);

function friendlyError(err) {
  const type = err?.type ?? '';
  if (type === 'peer-unavailable') return 'No game with that code. Check the code and that your friend is still hosting.';
  if (type === 'network' || type === 'server-error' || type === 'socket-error' || type === 'socket-closed') return 'Could not reach the online service. Check your internet connection.';
  if (type === 'browser-incompatible') return 'This browser does not support online play.';
  return err?.message ?? 'Connection failed.';
}

function attach(c) {
  conn = c;
  c.on('open', () => handlers.open?.());
  c.on('data', (msg) => handlers.data?.(msg));
  c.on('close', () => { if (conn === c) { conn = null; handlers.close?.(); } });
  c.on('error', (err) => handlers.error?.(friendlyError(err)));
}

// Host: claim a fresh code and wait for one guest.
export async function host(tries = 0) {
  leave();
  await loadPeer();
  const code = randomCode();
  peer = new window.Peer(PREFIX + code);
  peer.on('open', () => handlers.code?.(code));
  peer.on('connection', (c) => {
    if (conn) { c.on('open', () => { c.send({ t: 'reject', msg: 'That game is already full.' }); setTimeout(() => c.close(), 300); }); return; }
    attach(c);
  });
  peer.on('error', (err) => {
    if (err?.type === 'unavailable-id' && tries < 4) { host(tries + 1); return; } // code taken: pick another
    handlers.error?.(friendlyError(err));
  });
}

// Guest: connect to a host's code.
export async function join(code) {
  leave();
  await loadPeer();
  peer = new window.Peer();
  peer.on('open', () => attach(peer.connect(PREFIX + code, { reliable: true })));
  peer.on('error', (err) => handlers.error?.(friendlyError(err)));
}

export function send(msg) {
  if (conn?.open) conn.send(msg);
}

export function leave() {
  const p = peer;
  peer = null;
  conn = null;
  try { p?.destroy(); } catch { /* already gone */ }
}

// A short fingerprint of everything both copies of the game must agree on.
export function stateHash(s) {
  const pick = (c) => [c.uid, c.cardId, c.health, c.maxHealth, c.attack, c.armor ?? 0];
  const view = [
    s.turn, s.activePlayer, s.gameOver, s.winner, s.rng ?? s.seed, s.pending?.type, s.pending?.player,
    ...s.players.map((p) => [pick(p.hero), p.board.map(pick), p.hand.map((c) => c.cardId), p.deck.length, p.mana?.current, p.mana?.max]),
  ];
  const str = JSON.stringify(view);
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
}
