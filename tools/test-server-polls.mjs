// Community polls on the server (src/polls.js): totals, voting, changing a vote, refusals, CORS, a restart.
//   node tools/test-server-polls.mjs   (needs npm install, like tools/test-server.mjs)
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
process.env.QUIET = '1';
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'poll-'));
const { startServer } = await import('../server/server.js');
const { openStore } = await import('../server/store.js');
const srv = await startServer({ port: 0, store: await openStore({ dataDir: dir }), bots: { enabled: false } });
const port = srv.port ?? srv.address?.().port ?? srv.server?.address().port;
const base = `http://localhost:${port}/poll/next-faction`;
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const post = (b) => fetch(base, { method: 'POST', body: JSON.stringify(b), headers: { 'content-type': 'text/plain' } });
let r = await (await fetch(base)).json(); ok(r.total === 0 && r.counts['space-cowboys'] === 0, `empty poll ${JSON.stringify(r)}`);
r = await (await post({ choice: 'space-cowboys', voter: 'device-aaaaaaaa' })).json(); ok(r.counts['space-cowboys'] === 1 && r.mine === 'space-cowboys', 'a device votes');
r = await (await post({ choice: 'spirit-clowns', voter: 'device-aaaaaaaa' })).json(); ok(r.total === 1 && r.counts['spirit-clowns'] === 1 && r.counts['space-cowboys'] === 0, 'voting again changes the vote, not adds one');
r = await (await post({ choice: 'fruit-ninjas', voter: 'device-bbbbbbbb' })).json(); ok(r.total === 2, 'a second device adds a vote');
r = await (await post({ choice: 'locusts-and-leftovers', voter: 'device-dddddddd' })).json(); ok(r.counts['locusts-and-leftovers'] === 1 && r.total === 3, 'the fourth choice, Locusts and Leftovers, takes votes');
let res = await post({ choice: 'pirates', voter: 'device-cccccccc' }); ok(res.status === 400, 'an option that isn\'t on the poll is refused');
res = await post({ choice: 'fruit-ninjas' }); ok(res.status === 400, 'no voter is refused');
res = await fetch(base.replace('next-faction', 'nope')); ok(res.status === 404, 'unknown poll 404');
ok(res.headers.get('access-control-allow-origin') === '*' || (await fetch(base)).headers.get('access-control-allow-origin') === '*', 'other sites (itch.io) may read it');
res = await fetch(base, { method: 'OPTIONS' }); ok(res.status === 204, 'preflight answered');
// the votes survive a restart (file store)
await srv.close?.();
const srv2 = await startServer({ port: 0, store: await openStore({ dataDir: dir }), bots: { enabled: false } });
const port2 = srv2.port ?? srv2.server?.address().port;
await new Promise((r) => setTimeout(r, 300));
r = await (await fetch(`http://localhost:${port2}/poll/next-faction`)).json(); ok(r.total === 3, `votes kept after a restart (${r.total})`);
await srv2.close?.();
console.log(fails ? `${fails} FAILED` : 'ALL PASS'); process.exit(fails ? 1 : 0);
