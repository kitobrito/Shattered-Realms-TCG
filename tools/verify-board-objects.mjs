// Plays each living board's moving objects (echo, crawlers, warp) over its painting for a while,
// kicking them all now and then, and records every pixel that ever changed. Writes per board:
//   <out>/<key>-changed.png   (white = changed at some point)   <out>/<key>-fNN.png (a few frames)
// tools/verify-board-objects.py then checks the changed pixels lie on the objects alone.
//   node tools/verify-board-objects.mjs <out-dir> [board-key ...]   (server on :8766 serving the repo)
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { BOARD_FX } from '../src/ui/board-fx-defs.js';

const out = process.argv[2];
mkdirSync(out, { recursive: true });
const keys = process.argv.length > 3 ? process.argv.slice(3) : Object.keys(BOARD_FX);
const b = await chromium.launch();
const png = (u) => Buffer.from(u.split(',')[1], 'base64');
for (const full of keys) {
  const [, key, orient] = /^(.*)-(land|portrait)$/.exec(full);
  if (!BOARD_FX[full].layers.some((l) => ['echo', 'crawlers', 'warp'].includes(l.type))) continue;
  const p = await b.newPage({ viewport: { width: 1100, height: 1100 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.clock.install();
  await p.goto(`http://localhost:8766/tools/board-objects-check.html?key=${key}&orient=${orient}`);
  // Image loads resolve on real time; step the fake clock until the page is set up.
  for (let k = 0; k < 200 && !(await p.evaluate(() => !!window.ready)); k++) { await p.clock.runFor(50); await p.waitForTimeout(50); }
  // 24 s at 15 fps: idle motion, plus a kick of everything every 4 s (taps, rattles, shakes).
  let f = 0;
  for (let i = 0; i < 360; i++) {
    if (i % 60 === 10) await p.evaluate(() => window.fx.kickAll());
    await p.clock.runFor(1000 / 15);
    await p.evaluate(() => window.sample());
    if (i % 60 === 14 && f < 4) writeFileSync(`${out}/${full}-f${f++}.png`, png(await p.evaluate(() => window.frame())));
  }
  writeFileSync(`${out}/${full}-changed.png`, png(await p.evaluate(() => window.unionPng())));
  console.log(full, errs.length ? `errors ${JSON.stringify(errs)}` : 'ok');
  await p.close();
}
await b.close();
