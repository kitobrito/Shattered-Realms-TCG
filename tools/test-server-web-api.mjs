// The website API (comic-arena.net's Shattered Realms pages): news, leaderboard, register / login /
// me / logout over plain HTTP, and signing in on the site never throws a game connection out.
//   node tools/test-server-web-api.mjs   (needs npm install, like tools/test-server.mjs)
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import WebSocket from 'ws';
process.env.QUIET = '1';
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'webapi-'));
const { startServer, PROTOCOL } = await import('../server/server.js');
const { openStore } = await import('../server/store.js');
const srv = await startServer({ port: 0, store: await openStore({ dataDir: dir }) });
const port = srv.port ?? srv.address?.().port ?? srv.server?.address().port;
const base = `http://localhost:${port}/api`;
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const post = (route, b) => fetch(`${base}/${route}`, { method: 'POST', body: JSON.stringify(b), headers: { 'content-type': 'text/plain' } });

let res = await fetch(`${base}/news`); let news = await res.json();
ok(res.status === 200 && news.posts.length >= 4 && news.posts.at(-1).title.includes('Halloween'), `news has every post back to Halloween (${news.posts.length})`);
ok(res.headers.get('access-control-allow-origin') === '*', 'news readable from other sites');
const cmp = news.posts[0].blocks.find((b) => b.compare)?.compare[0];
ok(cmp && cmp.before && cmp.now && cmp.before.text !== cmp.now.text, 'a change carries before and now cards');
ok(/^http:\/\/localhost:\d+\/art\//.test(cmp.now.art), `card art is an absolute address (${cmp.now.art})`);
ok(news.factions.length >= 20 && news.poll?.options.length === 4, 'factions and the current poll are included');

res = await post('register', { name: 'Webby', password: 'short' }); ok(res.status === 400, 'short password refused');
res = await post('register', { name: 'Webby', password: 'longenough1' }); let r = await res.json();
ok(res.status === 200 && r.token && r.you.name === 'Webby', 'register over HTTP gives a token');
res = await post('register', { name: 'webby', password: 'longenough1' }); ok(res.status === 409, 'name taken (any case)');
res = await post('login', { name: 'Webby', password: 'wrongwrong' }); ok(res.status === 401, 'wrong password refused');

// A game connection signed in with the same account must survive a website sign-in.
const ws = new WebSocket(`ws://localhost:${port}/ws`);
const inbox = [];
ws.on('message', (d) => inbox.push(JSON.parse(d)));
await new Promise((ok2) => ws.on('open', ok2));
ws.send(JSON.stringify({ t: 'login', v: PROTOCOL, name: 'Webby', password: 'longenough1' }));
await new Promise((r2) => setTimeout(r2, 400));
ok(inbox.some((m) => m.t === 'welcome'), 'the game signs in');
res = await post('login', { name: 'webby', password: 'longenough1' }); r = await res.json();
ok(res.status === 200 && r.token && r.you.name === 'Webby', 'website login works (name in any case)');
await new Promise((r2) => setTimeout(r2, 300));
ok(!inbox.some((m) => m.t === 'replaced') && ws.readyState === 1, 'the game connection was not thrown out');
ws.send(JSON.stringify({ t: 'me' }));
await new Promise((r2) => setTimeout(r2, 300));
ok(inbox.some((m) => m.t === 'me'), 'the game connection still answers');
ws.close();

const tok = r.token;
r = await (await post('me', { token: tok })).json(); ok(r.you?.name === 'Webby' && 'label' in r.you, 'me returns the account and rank');
res = await post('me', { token: 'nope' }); ok(res.status === 401, 'bad token refused');
// The token works for the game too (the site hands it to the embedded game).
const ws2 = new WebSocket(`ws://localhost:${port}/ws`); const in2 = [];
ws2.on('message', (d) => in2.push(JSON.parse(d)));
await new Promise((ok2) => ws2.on('open', ok2));
ws2.send(JSON.stringify({ t: 'resume', v: PROTOCOL, token: tok }));
await new Promise((r2) => setTimeout(r2, 400));
ok(in2.some((m) => m.t === 'welcome' && m.you.name === 'Webby'), 'a website token resumes in the game');
ws2.close();
res = await post('logout', { token: tok }); ok(res.status === 200, 'logout');
res = await post('me', { token: tok }); ok(res.status === 401, 'token gone after logout');

r = await (await fetch(`${base}/leaderboard`)).json(); ok(Array.isArray(r.rows), 'leaderboard rows');
res = await fetch(`${base}/nope`); ok(res.status === 404, 'unknown route 404');
res = await fetch(`${base}/login`, { method: 'OPTIONS' }); ok(res.status === 204, 'preflight answered');
await srv.close?.();
console.log(fails ? `${fails} FAILED` : 'ALL PASS'); process.exit(fails ? 1 : 0);
