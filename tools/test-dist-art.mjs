// Every image the game refers to must reach the itch / phone build (tools/build-dist.py).
// That build packs each art folder's own images into bundles, but skips anything in a
// sub-folder of a packed folder (only the folders in NOT_PACKED are copied whole). A path like
// art/monster-hunter/frames/x.png works in the browser yet is missing on phones.
//   node tools/test-dist-art.mjs
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const build = readFileSync('tools/build-dist.py', 'utf8');
const setOf = (name) => new Set([...(build.match(new RegExp(`${name}\\s*=\\s*\\{([^}]*)\\}`))?.[1] ?? '').matchAll(/'([^']+)'/g)].map((m) => m[1]));
const NOT_PACKED = setOf('NOT_PACKED');
const SKIP = setOf('SKIP_ART');
if (!NOT_PACKED.size) { console.log('FAIL could not read NOT_PACKED from build-dist.py'); process.exit(1); }

const files = [];
const walk = (d) => { for (const n of readdirSync(d)) { const p = join(d, n); if (statSync(p).isDirectory()) walk(p); else if (p.endsWith('.js')) files.push(p); } };
walk('src');
const bad = [];
let seen = 0;
for (const f of files) {
  for (const m of readFileSync(f, 'utf8').matchAll(/['"`](art\/[^'"`?$]+\.(?:png|jpg|jpeg|webp))/g)) {
    const path = m[1];
    const [, folder, ...rest] = path.split('/');
    if (NOT_PACKED.has(folder) || SKIP.has(folder)) continue;
    seen++;
    if (rest.length > 1) bad.push(`${path} (${f}): in a sub-folder of art/${folder}, which the build skips`);
    else if (!existsSync(path)) bad.push(`${path} (${f}): file missing`);
  }
}
for (const b of bad) console.log(`FAIL ${b}`);
console.log(`\n${seen} packed art paths checked, ${bad.length} problems`);
process.exit(bad.length ? 1 : 0);
