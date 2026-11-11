// Board hero-portrait audit: plays every board (landscape and portrait) and crops both hero
// portraits as the game draws them, so a portrait that doesn't sit in its board's painted frame
// shows up on one contact sheet.
//   python3 -m http.server 8790 &   then   node tools/board-hero-audit.mjs [landscape|portrait] [outDir]
import fs from 'node:fs';
import path from 'node:path';
const { chromium, devices } = await import(process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright/index.mjs');
const mode = process.argv[2] || 'landscape';
const out = process.argv[3] || 'board-audit';
fs.mkdirSync(out, { recursive: true });
const base = process.env.AUDIT_BASE || 'http://localhost:8790';
const b = await chromium.launch();
const ctx = await b.newContext(mode === 'portrait' ? { ...devices['iPhone 13'] } : { viewport: { width: 1366, height: 768 } });
const p = await ctx.newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.addInitScript(() => {
  sessionStorage.setItem('shattered-offline', '1');
  localStorage.setItem('shattered-admin', '1');
  localStorage.setItem('shattered-journey', JSON.stringify({ games: 9, done: true, seen: [] }));
  localStorage.setItem('faction-ccg-settings', JSON.stringify({ tips: false, volume: 0, music: 0, reducedMotion: true }));
  localStorage.setItem('faction-ccg-format', 'single');
});
await p.goto(`${base}/index.html`);
await p.waitForFunction(() => !document.getElementById('boot'));
await p.waitForTimeout(800);
await p.evaluate(() => document.querySelector('[data-act="ai"]')?.click()); await p.waitForTimeout(400);
await p.evaluate(() => document.querySelector('[data-act="setupStart"]')?.click());
await p.waitForFunction(() => window.__shattered?.().screen === 'game' && !document.querySelector('.game-loader'), null, { timeout: 30000 });
for (let i = 0; i < 120; i++) {
  const done = await p.evaluate(() => { const g = window.__shattered(); const pd = g.game.state.pending; if (pd?.player === g.viewer) { if (pd.type === 'mulligan') g.act({ type: 'mulligan', player: g.viewer, replace: [] }); else if (pd.type === 'choice') g.act({ type: 'choose', player: g.viewer, index: 0 }); } return !g.game.state.pending; });
  if (done) break; await p.waitForTimeout(250);
}
const boards = await p.evaluate(async () => {
  const m = await import('./src/cards/board-art.js');
  const parent = {}; for (const [f, list] of Object.entries(m.ALT_BOARDS)) for (const alt of list) parent[alt.id] = f;
  return Object.keys(m.LANDSCAPE_BOARDS).map((key) => ({ key, faction: parent[key] ?? key, alt: !!parent[key] }));
});
const results = [];
for (const bd of boards) {
  await p.evaluate(async (bd) => {
    const settings = JSON.parse(localStorage.getItem('faction-ccg-settings') || '{}');
    settings.basicBoard = bd.key === 'Basic';
    settings.boards = { ...(settings.boards || {}), [bd.faction]: bd.alt ? bd.key : undefined };
    localStorage.setItem('faction-ccg-settings', JSON.stringify(settings));
    const g = window.__shattered(); const s = g.game.state;
    if (bd.key !== 'Basic') s.players[g.viewer].factions[0] = bd.faction;
    g.render();
  }, bd);
  await p.addStyleTag({ content: '.my-hand, .opp-hand, .hand, .opp-cards, .tip, #preview { visibility: hidden !important; }' });
  await p.waitForTimeout(700);
  const boxes = await p.evaluate(() => [...document.querySelectorAll('.hero-zone .hero-portrait')].map((e) => {
    const r = e.getBoundingClientRect(); return { opp: !!e.closest('.opp'), x: r.x, y: r.y, w: r.width, h: r.height };
  }));
  const arenaBg = await p.evaluate(() => {
    const a = document.querySelector('.arena'); const hp = document.querySelector('.hero-zone.opp .hero-portrait');
    const kids = hp ? [...hp.children].map((k) => k.className + ':' + getComputedStyle(k).borderRadius).join(' ; ') : '';
    return a.className + ' || opp radius ' + (hp ? getComputedStyle(hp).borderRadius : '-') + ' || ' + kids;
  });
  for (const bx of boxes) {
    const pad = Math.max(bx.w, bx.h) * 0.45;
    const clip = { x: Math.max(0, bx.x - pad), y: Math.max(0, bx.y - pad), width: bx.w + 2 * pad, height: bx.h + 2 * pad };
    const file = `${mode}-${bd.key.replace(/[^a-z0-9]+/gi, '_')}-${bx.opp ? 'opp' : 'me'}.png`;
    await p.screenshot({ path: path.join(out, file), clip });
    results.push({ board: bd.key, side: bx.opp ? 'opp' : 'me', file, arenaBg });
  }
}
fs.writeFileSync(path.join(out, `${mode}.json`), JSON.stringify(results, null, 1));
console.log(mode, boards.length, 'boards,', results.length, 'portraits', errs.length ? `errors: ${errs.slice(0, 3).join(' | ')}` : '');
await b.close();
