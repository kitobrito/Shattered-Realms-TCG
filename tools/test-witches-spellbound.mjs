// Rules tests for the Witches' Spellbound expansion: the Spellbook, Scribes, Wandweaving, Inscribe,
// Rune Slots, the Masteries and the Beast-Tamer companions.
//   node tools/test-witches-spellbound.mjs

import { existsSync } from 'node:fs';
import { buildDeck, FACTION_POOLS, FACTION_LISTS, LEGENDARY } from '../src/cards/index.js';
import { ART } from '../src/cards/art-manifest.js';
import { addToHand, effectiveAttack, hasKeyword, summonMinion } from '../src/engine/core.js';
import { applyAction, createGame, getLegalActions } from '../src/engine/engine.js';
import { getCard } from '../src/engine/registry.js';
import { EFFECT_OPS } from '../src/engine/effects.js';

let s, failures = 0, passed = 0;
function fresh() {
  const fa = ['Witches', 'Vampires'], fb = ['Dragons', 'Robots'];
  s = createGame({ seed: 5, rules: { mulligan: false, secondPlayerPotions: false, openingHandHelp: false }, players: [{ name: 'A', factions: fa, deck: buildDeck(fa) }, { name: 'B', factions: fb, deck: buildDeck(fb) }] });
  for (const p of s.players) { p.hand = []; p.mana.max = 10; p.mana.current = 10; p.mana.primal = 0; p.mana.base = 10; }
}
const pl = (p) => s.players[p];
const hero = (p) => pl(p).hero;
const put = (p, id) => { const m = summonMinion(s, p, id); m.sick = false; return m; };
const give = (p, id) => addToHand(s, p, id);
const blank = (p, atk, hp, kws = []) => { const m = put(p, 'vampire_gargoyle'); m.keywords = [...kws]; m.attack = atk; m.health = hp; m.maxHealth = hp; return m; };
const pages = (p = 0) => pl(p).spellbook?.pages ?? 0;
// Choices: pick by label (or the first option).
function settle(pick = null) {
  for (let i = 0; i < 60 && s.pending; i++) {
    if (s.pending.type === 'reaction') applyAction(s, { type: 'pass', player: s.pending.player });
    else if (s.pending.type === 'choice') {
      const idx = pick ? Math.max(0, s.pending.options.findIndex((o) => pick(o))) : 0;
      applyAction(s, { type: 'choose', player: s.pending.player, index: idx });
    } else break;
  }
}
const play = (p, inst, target, pick) => { applyAction(s, { type: 'play', player: p, card: inst.uid, ...(target != null ? { target } : {}) }); settle(pick); };
const endTurn = (p, pick) => { applyAction(s, { type: 'endTurn', player: p }); settle(pick); for (const x of s.players) x.mana.current = 10; };
const attack = (p, a, d, pick) => { applyAction(s, { type: 'attack', player: p, attacker: a, defender: d }); settle(pick); };
const runeIds = () => (hero(0).weapon?.runes ?? []).map((r) => r.id ?? r.cardId);
function test(name, fn) {
  fresh();
  try { const r = fn(); if (r) { failures++; console.log(`FAIL ${name}: ${r}`); } else { passed++; console.log(`ok   ${name}`); } }
  catch (e) { failures++; console.log(`FAIL ${name}: ${e.stack.split('\n').slice(0, 3).join(' | ')}`); }
}
const byLabel = (txt) => (o) => o.label.startsWith(txt);
// Wandweave with a chosen enchantment (the choice offers 3 at random, so force the pool).
function weave(kind) { EFFECT_OPS.addEnchant(s, { kind }, { controller: 0, self: hero(0).uid }); }

test('Spellbound: 15 unlockable Witch cards with art, two legendaries; companions, masteries and tokens have art', () => {
  const extra = FACTION_POOLS.Witches.filter((id) => !FACTION_LISTS.Witches.includes(id));
  if (extra.length !== 15) return `${extra.length} expansion cards`;
  for (const id of [...extra, 'wandweaving', 'mastery_dark_arts', 'mastery_living_grimoire', 'mastery_beast_tamer', 'frisk_baby', 'frisk_juvenile', 'frisk_young', 'frisk_adult', 'spindex_the_giant_spider', 'toby_the_black_panther', 'witch_rabbit', 'baby_spider'])
    if (!ART[id] || !existsSync(ART[id])) return `no art for ${id}`;
  if (!LEGENDARY.has('the_thousand_spell_wand') || !LEGENDARY.has('the_headmistresss_grimoire')) return 'legendaries';
});
test('A Scribe writes 1 page at the end of your turn; a Silenced one stops', () => {
  const sc = put(0, 'ink_stained_scribe');
  endTurn(0);
  if (pages() !== 1) return `pages ${pages()}`;
  endTurn(1); sc.keywords.push('Silenced');
  endTurn(0);
  if (pages() !== 1) return `silenced scribe wrote: ${pages()}`;
});
test('Chronicler writes 2 pages while the Hero holds a Wand', () => {
  put(0, 'chronicler_of_the_coven');
  applyAction(s, { type: 'heroSpell', player: 0, card: 'wandcraft' }); settle();
  endTurn(0);
  if (pages() !== 2) return `pages ${pages()}`;
});
test('Finishing the book: Wandcraft becomes Wandweaving and a Mastery is chosen', () => {
  pl(0).spellbook = { pages: 8 };
  play(0, give(0, 'wandweavers_primer'), null, byLabel('Dark Arts'));
  if (!pl(0).spellbook.done || pl(0).spellbook.mastery !== 'darkArts') return JSON.stringify(pl(0).spellbook);
  if (!pl(0).heroSpells.some((h) => h.cardId === 'wandweaving') || pl(0).heroSpells.some((h) => h.cardId === 'wandcraft')) return pl(0).heroSpells.map((h) => h.cardId).join(',');
});
test('Wandweaving gives a Wand and lets you choose an enchantment; it writes a page', () => {
  play(0, give(0, 'spellwright_apprentice'));
  if (!hero(0).weapon?.wand) return 'no wand';
  if (runeIds().length !== 1) return `runes ${runeIds()}`;
  if (pages() !== 1) return `pages ${pages()}`;
});
test('Rune Slots: the Apprentice Wand holds 1, a new rune pushes out the oldest; Rune Carver adds a slot', () => {
  applyAction(s, { type: 'heroSpell', player: 0, card: 'wandcraft' }); settle();
  weave('frostbite'); weave('hexfire');
  if (runeIds().join() !== 'hexfire') return runeIds().join();
  play(0, give(0, 'rune_carver'));
  weave('arcaneEcho');
  if (runeIds().join() !== 'hexfire,arcaneEcho') return runeIds().join();
});
test('Rabbitcurse is permanent: every minion the Wand hits becomes a 1/1 Rabbit', () => {
  play(0, give(0, 'wand_of_echoes')); weave('rabbitcurse');
  const a = blank(1, 5, 9), b = blank(1, 5, 9);
  attack(0, hero(0).uid, a.uid);
  if (a.cardId !== 'witch_rabbit' && pl(1).board.includes(a)) return `first: ${a.cardId}`;
  if (!runeIds().includes('rabbitcurse')) return 'curse used up after one hit';
  hero(0).attacksThisTurn = 0; hero(0).weapon.durability = 5;
  attack(0, hero(0).uid, b.uid);
  if (b.cardId !== 'witch_rabbit' && pl(1).board.includes(b)) return `second: ${b.cardId}`;
});
test('Wand of Echoes comes with Arcane Echo: 2 damage to a random enemy after the attack', () => {
  play(0, give(0, 'wand_of_echoes'));
  const hp = hero(1).health;
  attack(0, hero(0).uid, hero(1).uid);
  if (hero(1).health !== hp - 4) return `${hp} -> ${hero(1).health} (2 wand + 2 echo)`;
});
test('Inscribe: pay the spell, it goes on the Wand, and every Wand attack casts it free at the target', () => {
  play(0, give(0, 'wand_of_echoes'));
  const hex = give(0, 'hex_of_withering');
  const mana = pl(0).mana.current;
  play(0, give(0, 'inscribing_quill'), null, (o) => o.cardId === 'hex_of_withering');
  if (pl(0).hand.some((c) => c.uid === hex.uid)) return 'still in hand';
  if (pl(0).mana.current !== mana - 1 - 2) return `mana ${mana} -> ${pl(0).mana.current}`;
  const e = blank(1, 1, 20);
  attack(0, hero(0).uid, e.uid);
  // 2 (wand) + 3 (inscribed Hex) at least, plus maybe the Echo.
  if (e.health > 15) return `hp ${e.health}`;
  if (pages() !== 1) return `pages ${pages()}`;
});
test('Library Owl draws a spell when you Inscribe', () => {
  put(0, 'library_owl');
  play(0, give(0, 'wand_of_echoes'));
  give(0, 'hex_of_withering');
  pl(0).deck.unshift({ uid: s.nextUid++, cardId: 'silencing_charm', owner: 0 });
  const n = pl(0).hand.length;
  play(0, give(0, 'inscribing_quill'), null, (o) => o.cardId === 'hex_of_withering');
  if (!pl(0).hand.some((c) => c.cardId === 'silencing_charm')) return 'no spell drawn';
});
test('At 5 pages, enchantments carry over when the Wand breaks', () => {
  pl(0).spellbook = { pages: 5 };
  applyAction(s, { type: 'heroSpell', player: 0, card: 'wandcraft' }); settle();
  weave('frostbite');
  hero(0).weapon.durability = 1;
  attack(0, hero(0).uid, hero(1).uid);
  if (hero(0).weapon) return 'wand did not break';
  play(0, give(0, 'wand_of_hushing'));
  if (!runeIds().includes('frostbite')) return `runes ${runeIds()}`;
});
test('Ward of Binding: the Wand keeps 1 Durability instead of breaking', () => {
  play(0, give(0, 'ward_of_binding'));
  applyAction(s, { type: 'heroSpell', player: 0, card: 'wandcraft' }); settle();
  hero(0).weapon.durability = 1;
  attack(0, hero(0).uid, hero(1).uid);
  if (!hero(0).weapon || hero(0).weapon.durability !== 1) return JSON.stringify(hero(0).weapon);
  if (pl(0).traps.length) return 'trap not used';
});
test('Dark Arts: Wands deal +3 damage and have Lifesteal', () => {
  pl(0).spellbook = { pages: 9 };
  play(0, give(0, 'wandweavers_primer'), null, byLabel('Dark Arts'));
  applyAction(s, { type: 'heroSpell', player: 0, card: 'wandweaving' }); settle();
  hero(0).health = 20;
  const hp = hero(1).health;
  attack(0, hero(0).uid, hero(1).uid);
  const dealt = hp - hero(1).health;
  if (dealt < 4) return `dealt ${dealt}`;
  if (hero(0).health !== 20 + dealt) return `healed to ${hero(0).health}`;
});
test('Living Grimoire: Inscribing is free and inscribed spells survive the Wand breaking', () => {
  pl(0).spellbook = { pages: 9 };
  play(0, give(0, 'wandweavers_primer'), null, byLabel('Living Grimoire'));
  play(0, give(0, 'wand_of_echoes'));
  give(0, 'hex_of_withering');
  const mana = pl(0).mana.current;
  play(0, give(0, 'inscribing_quill'), null, (o) => o.cardId === 'hex_of_withering');
  if (pl(0).mana.current !== mana - 1) return `paid for the inscription (${mana} -> ${pl(0).mana.current})`;
  hero(0).weapon.durability = 1;
  attack(0, hero(0).uid, hero(1).uid);
  play(0, give(0, 'wand_of_hushing'));
  if (!(hero(0).weapon.runes ?? []).some((r) => r.cardId === 'hex_of_withering')) return 'inscription lost';
});
test('Beast-Tamer summons the chosen companion', () => {
  pl(0).spellbook = { pages: 9 };
  play(0, give(0, 'wandweavers_primer'), null, (o) => o.label === 'Beast-Tamer' || o.cardId === 'toby_the_black_panther');
  if (!pl(0).board.some((m) => m.cardId === 'toby_the_black_panther')) return pl(0).board.map((m) => m.cardId).join(',');
});
test('Frisk grows 3/3 -> 6/6 -> 9/9 -> 12/12, keeps his damage, and Freezes what he attacks', () => {
  const f = put(0, 'frisk_baby');
  f.health = 2;
  endTurn(0); endTurn(1);
  if (f.cardId !== 'frisk_juvenile' || f.attack !== 6 || f.health !== 5) return `${f.cardId} ${f.attack}/${f.health}`;
  endTurn(0); endTurn(1); endTurn(0); endTurn(1);
  if (f.cardId !== 'frisk_adult' || f.maxHealth !== 12) return `${f.cardId} ${f.maxHealth}`;
  endTurn(0); endTurn(1);
  if (f.cardId !== 'frisk_adult') return 'grew past adult';
  const e = blank(1, 1, 30); f.sick = false; f.attacksThisTurn = 0;
  attack(0, f.uid, e.uid);
  if (!hasKeyword(e, 'Frozen')) return 'not frozen';
});
test('Spindex: a kill heals a third of the victim\'s Health and hatches a Baby Spider', () => {
  const sp = put(0, 'spindex_the_giant_spider'); sp.health = 3;
  const e = blank(1, 1, 9);
  attack(0, sp.uid, e.uid);
  if (pl(1).board.includes(e)) return 'victim lived';
  if (sp.health !== 3 - 1 + 3) return `hp ${sp.health}`;
  if (!pl(0).board.some((m) => m.cardId === 'baby_spider')) return 'no baby spider';
});
test('Toby Silences a minion; an already-Silenced one is destroyed and he takes no damage', () => {
  const t = put(0, 'toby_the_black_panther');
  const a = blank(1, 4, 20, ['Taunt']);
  attack(0, t.uid, a.uid);
  if (!hasKeyword(a, 'Silenced')) return 'not silenced';
  const hp = t.health; t.attacksThisTurn = 0;
  attack(0, t.uid, a.uid);
  if (pl(1).board.includes(a)) return 'silenced target survived';
  if (t.health !== hp) return `took ${hp - t.health}`;
});
test('Spellbook Sentinel: +1 Attack per 2 pages', () => {
  const m = put(0, 'spellbook_sentinel');
  pl(0).spellbook = { pages: 6 };
  endTurn(0);
  if (effectiveAttack(m) !== 6) return `attack ${effectiveAttack(m)}`;
});
test('The Thousand-Spell Wand: free Inscribing, each inscribed spell cast twice', () => {
  play(0, give(0, 'the_thousand_spell_wand'));
  give(0, 'hex_of_withering');
  const mana = pl(0).mana.current;
  play(0, give(0, 'inscribing_quill'), null, (o) => o.cardId === 'hex_of_withering');
  if (pl(0).mana.current !== mana - 1) return 'inscribing was not free';
  const e = blank(1, 1, 30);
  attack(0, hero(0).uid, e.uid);
  if (e.health !== 30 - 3 - 3 - 3) return `hp ${e.health}`;
});
test('The Headmistress\'s Grimoire writes 4 pages and Wandweaves twice', () => {
  play(0, give(0, 'the_headmistresss_grimoire'));
  if (pages() !== 6) return `pages ${pages()}`;
  if (!hero(0).weapon?.wand || runeIds().length < 1) return `runes ${runeIds()}`;
});
test('AI games with the Spellbound lineup finish without errors', () => {
  for (let seed = 1; seed <= 4; seed++) {
    const lineup = [...FACTION_POOLS.Witches.filter((id) => !FACTION_LISTS.Witches.includes(id)), ...FACTION_LISTS.Witches.slice(0, 15)];
    const g = createGame({ seed, rules: { mulligan: false }, players: [{ name: 'A', factions: ['Witches'], deck: [...lineup, ...lineup.slice(0, 10)] }, { name: 'B', factions: ['Dragons'], deck: buildDeck(['Dragons', 'Robots']).slice(0, 40) }] });
    let n = 0;
    while (!g.gameOver && n++ < 4000) {
      const acts = getLegalActions(g);
      if (!acts.length) break;
      applyAction(g, acts.find((a) => a.type === 'choose') ?? acts.find((a) => a.type === 'attack') ?? acts.find((a) => a.type === 'play' || a.type === 'heroSpell') ?? acts.find((a) => a.type === 'endTurn') ?? acts[0]);
    }
    if (!g.gameOver) return `seed ${seed} did not finish`;
  }
});

console.log(`\n${passed} passed, ${failures} failed`);
if (failures) process.exit(1);
