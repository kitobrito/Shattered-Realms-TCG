// Card art audit: finds cards whose art doesn't fill their frame's picture window.
//   python3 -m http.server 8790 &   (from the repo root)
//   node tools/card-art-audit.mjs [--out dir]
// Renders tools/card-art-audit.html?mode=gap (art = solid magenta, card behind it = lime), takes one
// screenshot, and writes cells.json (each card's box and frame) for tools/card-art-audit.py to score.
import fs from 'node:fs';
import path from 'node:path';
const { chromium } = await import(process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright/index.mjs');
const outDir = process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1] : 'audit-out';
const base = process.env.AUDIT_BASE || 'http://localhost:8790';
fs.mkdirSync(outDir, { recursive: true });
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 2000, height: 1000 } });
p.on('pageerror', (e) => console.log('page error', e.message));
const BATCH = 50;
await p.goto(`${base}/tools/card-art-audit.html?count=0`);
await p.waitForFunction(() => window.__total);
const total = await p.evaluate(() => window.__total);
await p.setViewportSize({ width: 10 * 254 + 28, height: Math.ceil(BATCH / 10) * 352 + 28 });
const cells = [];
for (let from = 0; from < total; from += BATCH) {
  for (const mode of ['gap', 'art']) {
    await p.goto(`${base}/tools/card-art-audit.html?mode=${mode}&from=${from}&count=${BATCH}`);
    await p.waitForFunction(() => window.__ready);
    await p.evaluate(() => window.__ready);
    await p.waitForTimeout(300);
    const file = `${mode}-${String(from).padStart(5, '0')}.png`;
    if (mode === 'gap') {
      cells.push(...await p.evaluate((file) => [...document.querySelectorAll('.cell')].map((c) => {
        const r = c.getBoundingClientRect();
        return { id: c.dataset.id, x: r.x, y: r.y, w: r.width, h: r.height, shot: file,
          frame: (c.querySelector('.bc-frame')?.getAttribute('src') || '').split('?')[0] };
      }), file));
    }
    await p.screenshot({ path: path.join(outDir, file) });
  }
}
fs.writeFileSync(path.join(outDir, 'cells.json'), JSON.stringify(cells));
console.log(cells.length, 'cards in', Math.ceil(total / BATCH), 'batches');
await b.close();
