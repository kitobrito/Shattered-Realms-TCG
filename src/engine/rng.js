// Seeded RNG stored inside game state, so games are reproducible and the
// state stays serializable (needed for save/load, replays, and multiplayer).

export function random(state) {
  state.rng = (state.rng + 0x6d2b79f5) | 0;
  let t = state.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function randomInt(state, n) {
  return Math.floor(random(state) * n);
}

export function pickRandom(state, list) {
  return list.length ? list[randomInt(state, list.length)] : undefined;
}

export function shuffle(state, list) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = randomInt(state, i + 1);
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}
