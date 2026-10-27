// Unlocks: a win unlocks cards from the factions the player won with.   node tools/test-unlocks.mjs
const store = new Map();
globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
await import('../src/cards/index.js');
const { allCards, getCard } = await import('../src/engine/registry.js');
const { awardUnlocks, isLocked } = await import('../src/ui/unlocks.js');

let failures = 0, passed = 0;
function test(name, fn) {
  store.clear();
  try { const p = fn(); if (p) { failures++; console.log(`FAIL ${name}: ${p}`); } else { passed++; console.log(`ok   ${name}`); } }
  catch (e) { failures++; console.log(`FAIL ${name}: threw ${e.stack.split('\n').slice(0, 3).join(' | ')}`); }
}
const extrasOf = (f) => allCards().filter((c) => c.extra && !c.token && !c.custom && c.faction === f);
const unlockAll = (ids) => store.set('shattered-unlocks', JSON.stringify(ids));

test('One faction: both cards come from it', () => {
  for (let i = 0; i < 20; i++) {
    store.clear();
    const won = awardUnlocks(2, ['Vampires']);
    if (won.length !== 2 || won.some((id) => getCard(id).faction !== 'Vampires')) return won.map((id) => getCard(id).faction).join(',');
  }
});
test('Two factions: one card from each', () => {
  for (let i = 0; i < 20; i++) {
    store.clear();
    const won = awardUnlocks(2, ['Sharks', 'Bees']);
    const fs = won.map((id) => getCard(id).faction).sort().join(',');
    if (fs !== 'Bees,Sharks') return fs;
  }
});
test('Unlocked cards stay unlocked and are never awarded twice', () => {
  const seen = new Set();
  const n = extrasOf('Ghosts').length;
  for (let i = 0; i < n; i++) for (const id of awardUnlocks(1, ['Ghosts'])) { if (seen.has(id)) return `repeat ${id}`; seen.add(id); }
  if (seen.size !== n) return `${seen.size}/${n}`;
  if ([...seen].some((id) => isLocked(id))) return 'still locked';
});
test('Legendaries come last within a faction', () => {
  const cards = extrasOf('Zombies');
  const order = [];
  for (let i = 0; i < cards.length; i++) order.push(...awardUnlocks(1, ['Zombies']));
  const firstLegend = order.findIndex((id) => getCard(id).legendary);
  const lastNormal = order.map((id) => !getCard(id).legendary).lastIndexOf(true);
  if (firstLegend >= 0 && firstLegend < lastNormal) return `legendary at ${firstLegend}, normal at ${lastNormal}`;
});
test('A faction with nothing left: its share goes to the other faction', () => {
  unlockAll(extrasOf('Robots').map((c) => c.id));
  const won = awardUnlocks(2, ['Robots', 'Dragons']);
  if (won.length !== 2 || won.some((id) => getCard(id).faction !== 'Dragons')) return won.map((id) => getCard(id).faction).join(',');
});
test('Both factions finished: the win still unlocks cards from elsewhere', () => {
  unlockAll([...extrasOf('Robots'), ...extrasOf('Dragons')].map((c) => c.id));
  const won = awardUnlocks(2, ['Robots', 'Dragons']);
  if (won.length !== 2 || won.some((id) => ['Robots', 'Dragons'].includes(getCard(id).faction))) return won.join(',');
});

console.log(`\n${passed} passed, ${failures} failed`);
if (failures) process.exit(1);
