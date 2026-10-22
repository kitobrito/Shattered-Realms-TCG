// Collection search. A query is words separated by spaces, and a card must match every word:
//   a word        found in the card's name, text, realm, tribes, type or tags
//                 ("taunt", "vampire", "trap", "legendary", "token", "expansion", "hero spell", "fusion")
//   3             costs exactly 3 Mana       7+ / 2-   costs 7 or more / 2 or less
//   3/4           has 3 Attack and 4 Health
// Matching ignores case and accents (so "nidhoggr" finds Nidhöggr).

const fold = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Everything a plain word can match, as one lowercase string.
function haystack(card, extra = []) {
  const kind = card.fusion ? 'fusion hero spell' : card.heroSpell ? 'hero spell'
    : card.type === 'minion' ? 'minion' : card.type === 'trap' ? 'trap' : card.quickPlay ? 'quick play spell' : 'spell';
  return fold([
    card.name, card.text, card.faction, ...(card.tribes ?? []), ...(card.keywords ?? []), ...(card.fusion ?? []), kind,
    card.legendary ? 'legendary' : '', card.token ? 'token' : '', card.extra ? 'expansion new' : '',
    card.form === 'beast' ? 'beast form' : card.form === 'human' ? 'humanoid form' : '',
    ...extra,
  ].join(' \u0001 '));
}

export const queryWords = (q) => fold(q).split(/\s+/).filter(Boolean);

// extra: more words the card should answer to (the collection adds 'locked' for locked cards).
export function cardMatchesQuery(card, query, extra = []) {
  const words = queryWords(query);
  if (!words.length) return true;
  const hay = haystack(card, extra);
  return words.every((w) => {
    let m;
    if ((m = w.match(/^(\d+)\/(\d+)$/))) return card.attack === Number(m[1]) && card.health === Number(m[2]);
    if ((m = w.match(/^(\d+)\+$/))) return card.cost != null && card.cost >= Number(m[1]);
    if ((m = w.match(/^(\d+)-$/))) return card.cost != null && card.cost <= Number(m[1]);
    if (/^\d+$/.test(w)) return card.cost === Number(w);
    return hay.includes(w);
  });
}
