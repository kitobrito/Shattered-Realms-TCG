// The patch notes (src/ui/patch-notes.js) as plain data for other sites: comic-arena.net's
// Shattered Realms pages read GET /api/news and draw the posts themselves. Every card is resolved
// to what it says today (and, for a change, what it said before), with absolute art addresses.

import '../src/cards/index.js'; // registers every card
import { allCards, getCard as cardById } from '../src/engine/registry.js';
import { BOARD_ART } from '../src/cards/board-art.js';
import { artOf, heroArtOf } from '../src/ui/shared.js';
import { PATCH_CATS, PATCH_KINDS, PATCH_NOTES } from '../src/ui/patch-notes.js';
import { CURRENT_POLL, POLLS } from '../src/polls.js';
import { FACTION_INFO } from '../src/cards/faction-info.js';
import { DEFAULT_RULES, KEYWORD_TEXT } from '../src/engine/rules.js';
import { TIERS } from './ladder.js';

const getCard = (id) => { try { return cardById(id); } catch { return null; } };
const abs = (base, p) => (p ? (/^(https?:|data:)/.test(p) ? p : `${base}/${String(p).replace(/^\.?\/+/, '')}`) : null);

function cardView(base, c) {
  if (!c) return null;
  const v = { id: c.id, name: c.name, type: c.heroWeapon ? 'weapon' : c.type, faction: c.faction ?? null, cost: c.cost ?? null,
    text: c.text ?? '', legendary: !!c.legendary, art: abs(base, artOf(c)) };
  if (c.heroWeapon || c.weaponStats) { v.attack = c.attack ?? c.weaponStats?.attack ?? null; v.durability = c.durability ?? c.weaponStats?.durability ?? null; }
  else if (c.type === 'minion') { v.attack = c.attack ?? null; v.health = c.health ?? null; }
  if (c.keywords?.length) v.keywords = c.keywords;
  if (c.set) v.set = c.set;
  return v;
}

// The same groups the in-game page shows for a "cards" entry (see cardsOf in patch-notes.js).
function groupCards(g) {
  if (g.ids) return g.ids.map(getCard).filter(Boolean);
  const all = allCards().filter((c) => !c.custom && !c.fusion && !c.heroSpell && !(c.token && !c.legendary));
  if (g.legendaryOf) {
    const { sets = [], factions = [] } = g.legendaryOf;
    return all.filter((c) => c.legendary && !c.token && c.form !== 'beast' && (sets.includes(c.set) || (factions.includes(c.faction) && !c.set)));
  }
  if (g.set) return all.filter((c) => c.set === g.set && !c.token && c.form !== 'beast');
  return all.filter((c) => c.faction === g.faction && !c.set && !c.extra && !c.token)
    .sort((a, b) => (b.legendary ? 1 : 0) - (a.legendary ? 1 : 0) || a.cost - b.cost);
}

function blockView(base, b) {
  const out = { cat: b.cat, catLabel: PATCH_CATS[b.cat]?.label ?? '', h: b.h, why: b.why ?? null };
  if (b.cards) {
    out.groups = b.cards.map((g) => ({ title: g.title, blurb: g.blurb ?? null, cards: groupCards(g).map((c) => cardView(base, c)) }));
  } else if (b.compare) {
    out.compare = b.compare.map((x) => {
      const now = getCard(x.id);
      if (!now) return null;
      const was = { ...now, ...(x.before ?? {}), artFrom: now.artFrom ?? now.id, id: now.id };
      return { kind: x.kind ?? null, kindLabel: PATCH_KINDS[x.kind]?.label ?? null, note: x.note ?? null, why: x.why ?? null,
        before: cardView(base, was), now: cardView(base, now) };
    }).filter(Boolean);
  } else if (b.boards) {
    out.boards = b.boards.map((x) => ({ name: x.name, title: x.title ?? x.name, realm: x.realm ?? null, unlock: x.unlock ?? null, art: abs(base, x.src ?? BOARD_ART[x.name]) }));
  } else if (b.art) {
    // Preview art (coming soon): shown on the site like a board gallery.
    out.boards = b.art.map((x) => ({ name: x.title, title: x.title, realm: null, unlock: x.caption ?? null, art: abs(base, x.src) }));
  } else if (b.list) {
    out.list = b.list.map((it) => ({ kind: it.kind ?? null, kindLabel: PATCH_KINDS[it.kind]?.label ?? null, text: it.text, why: it.why ?? null,
      cards: (it.cards ?? []).map((id) => cardView(base, getCard(id))).filter(Boolean) }));
  }
  return out;
}

let cache = null;
export function newsFeed(base) {
  if (cache?.base === base) return cache.data;
  const poll = POLLS[CURRENT_POLL];
  const data = {
    game: 'Shattered Realms',
    factions: Object.entries(FACTION_INFO).map(([name, f]) => ({ name, summary: f.summary ?? null, strengths: f.strengths ?? [],
      weaknesses: f.weaknesses ?? [], hero: abs(base, heroArtOf(name)) })),
    cardCount: allCards().filter((c) => !c.custom && !c.fusion && !c.heroSpell && !c.token).length,
    keywords: KEYWORD_TEXT,
    rules: Object.fromEntries(['startingHealth', 'maxMana', 'manaPerTurn', 'startingHandFirst', 'startingHandSecond', 'maxHandSize', 'maxBoardSize',
      'pairDeckSize', 'minPerFaction', 'maxCopies', 'singleDeckSize', 'factionDeckSize', 'heroSpellUsesPerTurn'].map((k) => [k, DEFAULT_RULES[k]])),
    tiers: TIERS,
    cats: PATCH_CATS,
    kinds: PATCH_KINDS,
    posts: PATCH_NOTES.map((p) => ({ id: p.id, date: p.date, title: p.title, tag: p.tag ?? null, intro: p.intro ?? null,
      blocks: p.blocks.map((b) => blockView(base, b)), details: p.details ?? [] })),
    // The latest closed poll's result (the website shows it when no poll is open).
    pollResult: (() => {
      const done = Object.entries(POLLS).filter(([, q]) => q.closed && q.winner);
      if (!done.length) return null;
      const [id, q] = done[done.length - 1];
      const w = q.options.find((o) => o.id === q.winner);
      return w ? { id, question: q.question ?? null, winner: { id: w.id, name: w.name, blurb: w.blurb ?? null, art: abs(base, w.art) } } : null;
    })(),
    poll: poll ? { id: CURRENT_POLL, title: poll.title ?? null, question: poll.question ?? null, blurb: poll.blurb ?? null,
      options: poll.options.map((o) => ({ id: o.id, name: o.name, blurb: o.blurb ?? null, art: abs(base, o.art) })) } : null,
  };
  cache = { base, data };
  return data;
}
