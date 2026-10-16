// The ranked ladder: Iron 5 up to Legendary.
//
//   Iron, Bronze, Silver, Gold, Platinum, Diamond: five divisions each (5 is the lowest, 1 the
//   highest), 100 RP per division. Reaching 100 RP moves you up a division; in division 1 it
//   starts a promotion series to the next tier instead (best of 3, or best of 5 into Master and
//   Legendary). Master has no divisions: 100 RP starts the series to Legendary. Legendary
//   has no ceiling; the leaderboard sorts it by RP.
//   Losing at 0 RP drops you a division (to 75 RP), but never out of the tier you reached.
//
// A player's ladder record: { tier: index into TIERS, div: 5..1 (0 for Master/Legendary),
// rp, series: null | { wins, losses } }, plus an Elo-style rating used only for matchmaking
// and to scale RP a little (beating a stronger player gives more).

export const TIERS = ['Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master', 'Legendary'];
const MASTER = TIERS.indexOf('Master');
const LEGENDARY = TIERS.indexOf('Legendary');
const PER_DIV = 100;

export const freshLadder = () => ({ tier: 0, div: 5, rp: 0, series: null });
export const START_RATING = 1000;

const hasDivisions = (tier) => tier < MASTER;
const labelOf = (tier, div) => (hasDivisions(tier) ? `${TIERS[tier]} ${div}` : TIERS[tier]);
const seriesSize = (toTier) => (toTier >= MASTER ? { best: 5, need: 3 } : { best: 3, need: 2 });

// What the game shows: { tier, label, rp, series: null | { best, need, wins, losses, to } }.
export function rankView(l = freshLadder()) {
  const view = { tier: TIERS[l.tier], label: labelOf(l.tier, l.div), rp: l.rp, series: null };
  if (l.series) {
    const to = l.tier + 1;
    view.series = { ...seriesSize(to), wins: l.series.wins, losses: l.series.losses, to: labelOf(to, 5) };
  }
  return view;
}

// A sort key for the leaderboard: higher is better.
export const ladderScore = (l) => l.tier * 10000 + (hasDivisions(l.tier) ? (5 - l.div) * PER_DIV : 0) + l.rp;

// RP for a ranked result: a win is worth more against a higher-rated opponent, and a loss
// costs less in the low tiers, so new players aren't stuck.
export function rpFor(won, rating, oppRating, tier) {
  const edge = Math.max(-8, Math.min(8, Math.round((oppRating - rating) / 25)));
  if (won) return 25 + edge;
  const base = tier <= 1 ? 12 : tier <= 3 ? 18 : 22;
  return -Math.max(5, base - edge);
}

// Elo update for matchmaking ratings.
export function newRating(rating, oppRating, won, k = 32) {
  const expected = 1 / (1 + 10 ** ((oppRating - rating) / 400));
  return Math.round(rating + k * ((won ? 1 : 0) - expected));
}

// Apply one ranked result. Returns { ladder, rpChange, event } where event is one of
// promoted, seriesFailed, seriesStart, seriesWin, seriesLoss, division, demoted, or null.
export function applyResult(ladder, won, rating, oppRating) {
  const l = { ...ladder, series: ladder.series ? { ...ladder.series } : null };

  // In a promotion series: games count as series wins/losses, RP stays put.
  if (l.series) {
    const { best, need } = seriesSize(l.tier + 1);
    if (won) l.series.wins++; else l.series.losses++;
    if (l.series.wins >= need) {
      l.tier++;
      l.div = hasDivisions(l.tier) ? 5 : 0;
      l.rp = 0;
      l.series = null;
      return { ladder: l, rpChange: null, event: 'promoted' };
    }
    if (l.series.losses > best - need) {
      l.series = null;
      l.rp = 75;
      return { ladder: l, rpChange: null, event: 'seriesFailed' };
    }
    return { ladder: l, rpChange: null, event: won ? 'seriesWin' : 'seriesLoss' };
  }

  const change = rpFor(won, rating, oppRating, l.tier);
  let event = null;
  if (change > 0) {
    l.rp += change;
    if (l.tier === LEGENDARY) return { ladder: l, rpChange: change, event };
    if (l.rp >= PER_DIV) {
      if (hasDivisions(l.tier) && l.div > 1) {
        l.div--;
        l.rp -= PER_DIV;
        event = 'division';
      } else {
        l.rp = PER_DIV;
        l.series = { wins: 0, losses: 0 };
        event = 'seriesStart';
      }
    }
  } else {
    if (l.rp + change < 0) {
      if (hasDivisions(l.tier) && l.div < 5) {
        l.div++;
        l.rp = 75;
        event = 'demoted';
      } else {
        // At the floor: only what was actually lost counts (nothing at 0 RP).
        const lost = -l.rp;
        l.rp = 0;
        return { ladder: l, rpChange: lost || null, event };
      }
    } else {
      l.rp += change;
    }
  }
  return { ladder: l, rpChange: change, event };
}
