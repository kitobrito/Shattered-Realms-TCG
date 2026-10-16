// Where accounts and sign-in tokens live.
//
//   DATABASE_URL set  → Postgres (Render Postgres, Neon, Supabase...). Survives restarts and deploys.
//   otherwise         → a JSON file in DATA_DIR (default server/data). Fine on your own computer
//                       or on a server with a persistent disk; on a host without one (Render's
//                       free web services) the file is wiped on every restart.
//
// An account: { key (lowercase name), name, salt, hash, created, wins, losses,
//               rankedWins, rankedLosses, rating, ladder }.

import fs from 'node:fs';
import path from 'node:path';
import { ladderScore } from './ladder.js';

const rankedGames = (a) => (a.rankedWins ?? 0) + (a.rankedLosses ?? 0);

// ---- Postgres ------------------------------------------------------------------------

async function postgresStore(url) {
  const { default: pg } = await import('pg');
  // Databases across the internet (Neon, Supabase, Render's external address) want TLS; one on
  // the same machine or on Render's private network (a host name with no dots) doesn't.
  let host = '';
  try { host = new URL(url).hostname; } catch { /* odd URL: let pg parse it */ }
  const plain = /sslmode=disable/.test(url) || host === 'localhost' || host === '127.0.0.1' || (host && !host.includes('.'));
  const pool = new pg.Pool({ connectionString: url, ssl: plain ? false : { rejectUnauthorized: false }, max: 5 });
  await pool.query(`CREATE TABLE IF NOT EXISTS accounts (
    key text PRIMARY KEY, data jsonb NOT NULL, score integer NOT NULL DEFAULT 0, ranked integer NOT NULL DEFAULT 0)`);
  await pool.query('CREATE INDEX IF NOT EXISTS accounts_board ON accounts (ranked, score DESC)');
  await pool.query('CREATE TABLE IF NOT EXISTS tokens (token text PRIMARY KEY, key text NOT NULL, expires bigint NOT NULL)');
  await pool.query('CREATE INDEX IF NOT EXISTS tokens_key ON tokens (key)');
  await pool.query('DELETE FROM tokens WHERE expires < $1', [Date.now()]);
  const row = (a) => [a.key, JSON.stringify(a), ladderScore(a.ladder), rankedGames(a)];
  return {
    kind: 'postgres',
    async get(key) {
      const r = await pool.query('SELECT data FROM accounts WHERE key = $1', [key]);
      return r.rows[0]?.data ?? null;
    },
    async create(a) {
      const r = await pool.query('INSERT INTO accounts (key, data, score, ranked) VALUES ($1, $2, $3, $4) ON CONFLICT (key) DO NOTHING', row(a));
      return r.rowCount === 1;
    },
    async save(a) {
      await pool.query('UPDATE accounts SET data = $2, score = $3, ranked = $4 WHERE key = $1', row(a));
    },
    async remove(key) {
      await pool.query('DELETE FROM tokens WHERE key = $1', [key]);
      await pool.query('DELETE FROM accounts WHERE key = $1', [key]);
    },
    async top(limit) {
      const r = await pool.query('SELECT data FROM accounts WHERE ranked > 0 ORDER BY score DESC, key LIMIT $1', [limit]);
      return r.rows.map((x) => x.data);
    },
    async place(a) {
      if (!rankedGames(a)) return null;
      const r = await pool.query('SELECT count(*)::int AS n FROM accounts WHERE ranked > 0 AND (score > $1 OR (score = $1 AND key < $2))', [ladderScore(a.ladder), a.key]);
      return r.rows[0].n + 1;
    },
    async addToken(token, key, expires) {
      await pool.query('INSERT INTO tokens (token, key, expires) VALUES ($1, $2, $3)', [token, key, expires]);
    },
    async getToken(token) {
      const r = await pool.query('SELECT key, expires FROM tokens WHERE token = $1', [token]);
      return r.rows[0] ? { key: r.rows[0].key, expires: Number(r.rows[0].expires) } : null;
    },
    async removeToken(token) {
      await pool.query('DELETE FROM tokens WHERE token = $1', [token]);
    },
    close: () => { if (!pool.ended) return pool.end(); },
  };
}

// ---- JSON file -----------------------------------------------------------------------

function fileStore(dir) {
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'accounts.json');
  let data = { accounts: {}, tokens: {} };
  try { data = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { /* first run */ }
  let timer = null;
  const flush = () => {
    timer = null;
    const tmp = `${file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data));
    fs.renameSync(tmp, file);
  };
  const save = () => { if (!timer) timer = setTimeout(flush, 200); };
  const clone = (a) => (a ? JSON.parse(JSON.stringify(a)) : null);
  const board = () => Object.values(data.accounts).filter((a) => rankedGames(a) > 0)
    .sort((a, b) => ladderScore(b.ladder) - ladderScore(a.ladder) || (a.key < b.key ? -1 : 1));
  return {
    kind: 'file',
    file,
    async get(key) { return clone(data.accounts[key]); },
    async create(a) { if (data.accounts[a.key]) return false; data.accounts[a.key] = clone(a); save(); return true; },
    async save(a) { if (data.accounts[a.key]) { data.accounts[a.key] = clone(a); save(); } },
    async remove(key) {
      delete data.accounts[key];
      for (const [t, v] of Object.entries(data.tokens)) if (v.key === key) delete data.tokens[t];
      save();
    },
    async top(limit) { return board().slice(0, limit).map(clone); },
    async place(a) { if (!rankedGames(a)) return null; const i = board().findIndex((x) => x.key === a.key); return i < 0 ? null : i + 1; },
    async addToken(token, key, expires) { data.tokens[token] = { key, expires }; save(); },
    async getToken(token) { return data.tokens[token] ?? null; },
    async removeToken(token) { delete data.tokens[token]; save(); },
    close: () => { if (timer) { clearTimeout(timer); flush(); } },
  };
}

export async function openStore({ databaseUrl = process.env.DATABASE_URL, dataDir = process.env.DATA_DIR } = {}) {
  if (databaseUrl) return postgresStore(databaseUrl);
  return fileStore(dataDir || path.join(path.dirname(new URL(import.meta.url).pathname), 'data'));
}
