// Checks for the living boards: every board's paintings, masks, sprite atlases and plates exist,
// every layer that needs a mask has one, and every realm has both layouts.
//   node tools/test-boards.mjs

import { existsSync } from 'node:fs';
import { BOARD_ART, CIRCLE_BOARDS, LANDSCAPE_BOARDS, PORTRAIT_BOARDS } from '../src/cards/board-art.js';
import { BOARD_MASKS } from '../src/cards/board-fx-masks.js';
import { BOARD_OBJECTS } from '../src/cards/board-objects.js';
import { BOARD_FX } from '../src/ui/board-fx-defs.js';

let failures = 0, passed = 0;
function test(name, fn) { try { const r = fn(); if (r) { failures++; console.log(`FAIL ${name}: ${r}`); } else { passed++; console.log(`ok   ${name}`); } } catch (e) { failures++; console.log(`FAIL ${name}: ${e.message}`); } }

test('every realm board has a painting and both layouts', () => {
  for (const [f, src] of Object.entries(BOARD_ART)) {
    if (!existsSync(src)) return `${f}: ${src}`;
    if (!LANDSCAPE_BOARDS[f] || !PORTRAIT_BOARDS[f]) return `${f}: missing layout`;
    if (!existsSync(PORTRAIT_BOARDS[f].src)) return `${f}: ${PORTRAIT_BOARDS[f].src}`;
  }
});
test('all nine circles have both paintings', () => {
  for (let n = 1; n <= 9; n++) for (const o of ['land', 'portrait']) if (!existsSync(CIRCLE_BOARDS[o][n]?.src ?? '')) return `circle ${n} ${o}`;
});
test('every realm board and circle is alive in both orientations', () => {
  const keys = [...Object.values(BOARD_ART).map((s) => s.split('/').pop().replace('.jpg', '')), ...Array.from({ length: 9 }, (_, i) => `circle${i + 1}`)];
  for (const k of keys) for (const o of ['land', 'portrait']) if (!BOARD_FX[`${k}-${o}`]) return `${k}-${o}`;
});
test('every mask, atlas and plate file exists', () => {
  for (const [k, e] of Object.entries(BOARD_MASKS)) for (const [n, v] of Object.entries(e)) {
    const f = typeof v === 'string' ? v : v.src;
    if (!existsSync(f)) return `${k} ${n}: ${f}`;
  }
});
test('every layer that names a mask has it', () => {
  for (const [k, def] of Object.entries(BOARD_FX)) {
    const masks = BOARD_MASKS[k] ?? {};
    for (const l of def.layers) for (const m of [l.mask, l.area?.mask, l.flashMask].filter(Boolean)) if (!masks[m]) return `${k}: ${l.id ?? l.type} needs '${m}'`;
  }
});
test('every tap names layers that exist', () => {
  for (const [k, def] of Object.entries(BOARD_FX)) {
    const ids = new Set(def.layers.map((l) => l.id).filter(Boolean));
    for (const p of def.pokes ?? []) for (const id of [...[].concat(p.kick ?? []), p.strike, p.loose, ...[].concat(p.burst ?? []).map((b) => b.layer)].filter((x) => x != null)) if (!ids.has(id)) return `${k}: poke uses '${id}'`;
  }
});
test('every moving object is cut out of its painting (only the object moves)', () => {
  // echo, crawlers and warp move painted pixels: each needs its cut-out and patch (tools/board-objects.py).
  for (const [k, def] of Object.entries(BOARD_FX)) {
    const items = BOARD_OBJECTS[k]?.items ?? {};
    def.layers.forEach((l, i) => {
      const ids = l.type === 'echo' ? [l.id] : l.type === 'crawlers' ? l.boxes.map((_, j) => `${l.id ?? `crawl${i}`}.${j}`) : l.type === 'warp' ? [l.id ?? `warp${i}`] : [];
      for (const id of ids) if (!items[id]) throw new Error(`${k}: ${id} has no cut-out`);
    });
    if (BOARD_OBJECTS[k] && !existsSync(BOARD_OBJECTS[k].src)) return `${k}: ${BOARD_OBJECTS[k].src}`;
  }
});

console.log(`\n${passed} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
