// Tests for the collection search (src/cards/card-search.js).
//   node tools/test-card-search.mjs

import '../src/cards/index.js';
import { allCards, getCard } from '../src/engine/registry.js';
import { cardMatchesQuery } from '../src/cards/card-search.js';

let failures = 0, passed = 0;
const names = (q) => allCards().filter((c) => !c.custom && cardMatchesQuery(c, q)).map((c) => c.id);
function test(name, fn) {
  try { const r = fn(); if (r) { failures++; console.log(`FAIL ${name}: ${r}`); } else { passed++; console.log(`ok   ${name}`); } }
  catch (e) { failures++; console.log(`FAIL ${name}: ${e.message}`); }
}

test('an empty query matches everything', () => (cardMatchesQuery(getCard('voidling'), '   ') ? null : 'no match'));
test('names match, ignoring case and accents', () => (names('NIDHOGGR').includes('nidhoggr_the_stormfrost_wyrm') ? null : 'Nidhöggr not found'));
test('"legendary" finds only legendaries, and all of them', () => {
  const hits = names('legendary');
  if (hits.some((id) => !getCard(id).legendary)) return 'a non-legendary matched';
  if (!hits.includes('gargantua_the_living_singularity')) return 'Gargantua missing';
});
test('every word must match: "legendary dragon" is Dragons legendaries only', () => {
  const hits = names('legendary dragon');
  if (!hits.length || hits.some((id) => !getCard(id).legendary)) return JSON.stringify(hits);
  if (!hits.includes('the_fourfold_hydra')) return 'Hydra missing';
});
test('keywords in card text match ("hollow")', () => (names('hollow').includes('voidling') ? null : 'Voidling missing'));
test('a number is an exact Mana cost; 7+ and 2- are ranges', () => {
  if (names('3').some((id) => getCard(id).cost !== 3)) return 'exact cost';
  if (names('7+').some((id) => getCard(id).cost < 7)) return '7+';
  if (names('2-').some((id) => getCard(id).cost > 2)) return '2-';
});
test('stats like 3/3 match Attack and Health', () => (names('3/3').every((id) => getCard(id).attack === 3 && getCard(id).health === 3) && names('3/3').length ? null : 'bad stats match'));
test('types and tags: trap, token, hero spell, expansion', () => {
  if (names('trap void').some((id) => getCard(id).type !== 'trap')) return 'trap';
  if (!names('token').includes('void_spawn')) return 'token';
  if (!names('hero spell void').includes('feed_the_void')) return 'hero spell';
  if (names('expansion void').some((id) => !getCard(id).extra)) return 'expansion';
});
test('realm and tribe names match ("lycan")', () => (names('lycan').length > 10 ? null : 'too few Lycans'));
test('extra words (locked) can be matched', () => (cardMatchesQuery(getCard('voidling'), 'locked', ['locked']) && !cardMatchesQuery(getCard('voidling'), 'locked') ? null : 'locked tag'));

console.log(`\n${passed} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
