// Every two-realm deck has a guide, and every card a guide names is in that pair's standard deck.
//   node tools/test-pair-guides.mjs [--partial]
import { buildDeck, FACTION_DECKS, FACTION_LISTS } from '../src/cards/index.js';
import { PAIR_GUIDES } from '../src/cards/pair-guides.js';
import { FACTIONS } from '../src/engine/rules.js';
import { getCard } from '../src/engine/registry.js';
import { fusionFor } from '../src/engine/engine.js';

const partial = process.argv.includes('--partial');
const realms = FACTIONS.filter((f) => FACTION_DECKS[f] && FACTION_LISTS[f]);
let failures = 0, checked = 0;
const fail = (msg) => { failures++; console.log(`FAIL ${msg}`); };
for (const a of realms) for (const b of realms) {
  if (a >= b) continue;
  const key = `${a}+${b}`;
  const g = PAIR_GUIDES[key];
  if (!g) { if (!partial) fail(`${key}: no guide`); continue; }
  checked++;
  const deck = new Set(buildDeck([a, b]));
  // In depth: a real plan, and every tip long enough to explain why.
  const min = { plan: 140, fusion: 60, watch: 60 };
  for (const f of Object.keys(min)) if (!(g[f]?.length >= min[f])) fail(`${key}: ${f} too short (${g[f]?.length ?? 0})`);
  if (g.combos?.length !== 2) fail(`${key}: wants 2 combos`);
  for (const [x, y, why] of g.combos ?? []) {
    for (const id of [x, y]) {
      if (!getCard(id)) fail(`${key}: unknown card ${id}`);
      else if (!deck.has(id)) fail(`${key}: ${id} is not in the pair's deck`);
    }
    if (!(why?.length >= 60)) fail(`${key}: combo ${x}+${y} reason too short`);
    if (x && y && getCard(x)?.faction === getCard(y)?.faction && getCard(x)) fail(`${key}: combo ${x}+${y} is one realm only`);
  }
  if (!fusionFor([a, b])) fail(`${key}: no Fusion Hero Spell`);
}
for (const key of Object.keys(PAIR_GUIDES)) { const [a, b] = key.split('+'); if (!(realms.includes(a) && realms.includes(b) && a < b)) fail(`stray guide key ${key}`); }
console.log(`\n${checked} guides checked, ${failures} problems`);
process.exit(failures ? 1 : 0);
