// Self-play training for the AI's evaluation weights (Hard and up).
//
// An evolution strategy: each generation makes a few mutated copies of the
// current champion's weights, plays each one against the champion over the
// same random deals (seats swapped, so neither side gets the better deal), and
// keeps a challenger only if it wins clearly, confirmed on fresh deals.
// Uses every CPU core. The winning weights are written to src/ai/weights.js.
//
//   node tools/train-ai.mjs [generations=30] [challengers=8] [deals=24]

import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { availableParallelism } from 'node:os';
import { fileURLToPath } from 'node:url';
import { writeFileSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url);
const FAST = { beam: 3, depth: 5, maxNodes: 220 }; // quicker search while training

// ---- Worker: play one game -------------------------------------------------
if (!isMainThread) {
  const cards = await import(new URL('src/cards/index.js', ROOT));
  const eng = await import(new URL('src/engine/engine.js', ROOT));
  const ai = await import(new URL('src/ai/smart.js', ROOT));
  parentPort.on('message', ({ id, seed, wA, wB, swap }) => {
    let rs = seed * 104729 + 7;
    const rnd = () => (rs = (rs * 1103515245 + 12345) % 2147483648) / 2147483648;
    const pair = () => { const p = [...cards.PLAYABLE_FACTIONS]; return [p.splice(Math.floor(rnd() * p.length), 1)[0], p.splice(Math.floor(rnd() * p.length), 1)[0]]; };
    const f0 = pair();
    const f1 = pair();
    const s = eng.createGame({ seed, players: [{ name: 'P0', factions: f0, deck: cards.buildDeck(f0) }, { name: 'P1', factions: f1, deck: cards.buildDeck(f1) }] });
    const aSeat = swap ? 1 : 0;
    let steps = 0;
    while (!s.gameOver && steps++ < 2500 && s.turn < 100) {
      const me = eng.actingPlayer(s);
      eng.applyAction(s, ai.chooseAction(s, { ...FAST, weights: me === aSeat ? wA : wB }));
    }
    const result = !s.gameOver || s.winner == null ? 0.5 : s.winner === aSeat ? 1 : 0;
    parentPort.postMessage({ id, result });
  });
} else {
  // ---- Main: the training loop ----------------------------------------------
  const [GENS = 30, KIDS = 8, DEALS = 24] = process.argv.slice(2).map(Number);
  const { BASE_WEIGHTS } = await import(new URL('src/ai/smart.js', ROOT));
  const { LEARNED_WEIGHTS } = await import(new URL('src/ai/weights.js', ROOT));
  // Thresholds and "on/off" style weights mutate on an absolute scale.
  const ABS = { lowHp: 2, myThreat: 0.15, doomed: 0.15 };

  const pool = Array.from({ length: availableParallelism() }, () => new Worker(fileURLToPath(import.meta.url)));
  let nextId = 0;
  const waiting = new Map();
  for (const w of pool) w.on('message', ({ id, result }) => { waiting.get(id)(result); waiting.delete(id); });
  let rr = 0;
  const play = (job) => new Promise((resolve) => { const id = nextId++; waiting.set(id, resolve); pool[rr++ % pool.length].postMessage({ ...job, id }); });

  // Score of A vs B over `deals` random deals, each played from both seats.
  async function match(wA, wB, seedBase) {
    const jobs = [];
    for (let d = 0; d < DEALS; d++) for (const swap of [false, true]) jobs.push(play({ seed: seedBase + d, wA, wB, swap }));
    const results = await Promise.all(jobs);
    return results.reduce((a, b) => a + b, 0) / results.length;
  }

  let seed = 1;
  const gauss = () => Math.sqrt(-2 * Math.log(Math.random() || 1e-9)) * Math.cos(2 * Math.PI * Math.random());
  function mutate(w, sigma) {
    const out = { ...w };
    for (const k of Object.keys(out)) {
      if (Math.random() > 0.4) continue; // change a few weights at a time
      out[k] = k in ABS ? Math.max(0, out[k] + gauss() * ABS[k] * sigma * 4) : out[k] * Math.exp(gauss() * sigma);
      out[k] = Math.round(out[k] * 1000) / 1000;
    }
    return out;
  }

  let champ = { ...BASE_WEIGHTS, ...LEARNED_WEIGHTS };
  let sigma = 0.35;
  const t0 = Date.now();
  for (let g = 1; g <= GENS; g++) {
    const kids = Array.from({ length: KIDS }, () => mutate(champ, sigma));
    const base = (seed += 1000);
    const scores = [];
    for (const k of kids) scores.push(await match(k, champ, base));
    const bestI = scores.indexOf(Math.max(...scores));
    let note = `best challenger ${(scores[bestI] * 100).toFixed(0)}%`;
    if (scores[bestI] >= 0.56) {
      const confirm = await match(kids[bestI], champ, (seed += 1000));
      note += `, confirm ${(confirm * 100).toFixed(0)}%`;
      if ((scores[bestI] + confirm) / 2 >= 0.54 && confirm >= 0.5) { champ = kids[bestI]; note += ' -> NEW CHAMPION'; sigma = Math.min(0.5, sigma * 1.1); }
      else sigma *= 0.9;
    } else sigma *= 0.9;
    sigma = Math.max(0.08, sigma);
    console.log(`gen ${g}/${GENS} (${Math.round((Date.now() - t0) / 1000)}s): ${note}`);
    writeFileSync(new URL('src/ai/weights.js', ROOT), `// Evaluation weights learned by self-play (tools/train-ai.mjs): ${g} generations
// of mutated weights playing the reigning champion; only clear winners were kept.
export const LEARNED_WEIGHTS = ${JSON.stringify(champ, null, 2).replace(/"(\w+)":/g, '$1:')};
`);
  }
  // Final check: learned weights vs the hand-set ones on fresh deals.
  const vsBase = await match(champ, BASE_WEIGHTS, 900000);
  console.log(`learned vs hand-set weights: ${(vsBase * 100).toFixed(1)}% over ${DEALS * 2} games`);
  for (const w of pool) w.terminate();
}
