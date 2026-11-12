// The public trade board. A player puts up one or more of their cards and says what they'd take for
// them: up to MAX_OPTIONS options, each a bundle of cards and/or points ("this card, OR that card, OR
// these two cards together, OR that card plus 300 points"). Points can sweeten a trade but never be the
// whole price: every bundle needs at least one card (cards are bought for points in the Shop instead).
// Anyone who has one of those bundles can trade on the spot.
// Anyone can also make an offer with a different bundle; the lister accepts it, declines it, or counters
// by asking for a different bundle, and the other player then accepts or declines.
//
// The cards put up are held (escrow) while the listing is up, so they can't be spent twice; they come
// back when the listing is cancelled or expires. Offered cards and points are checked again at the moment
// of a swap. Giving a card takes a duplicate first; only when there is none does a trader part with
// their copy.
//
// A bundle: { cards: [ids], points: n }.
// A listing: { id, owner, ownerName, give: [ids], wants: [bundle], created, expires,
//              offers: [{ id, bidder, bidderName, bundle, by: 'bidder' | 'owner', created }] }

import crypto from 'node:crypto';
import { getCard } from '../src/engine/registry.js';
import { isExpansionCard } from './economy.js';

export const MAX_LISTINGS = 5;
export const MAX_GIVE = 4;
export const MAX_OPTIONS = 6;
export const MAX_BUNDLE_CARDS = 4;
export const MAX_POINTS = 100000;
export const MAX_OFFERS = 30;
export const LISTING_DAYS = 7;

const nameOf = (id) => getCard(id)?.name ?? id;
const copiesOf = (acc, id) => (acc.dupes?.[id] ?? 0) + ((acc.cards ?? []).includes(id) ? 1 : 0);
export const hasCard = (acc, id) => copiesOf(acc, id) > 0;

// Clean up a bundle from a client: real expansion cards (repeats allowed), whole points.
export function cleanBundle(b) {
  const cards = (Array.isArray(b?.cards) ? b.cards : []).filter((id) => typeof id === 'string' && isExpansionCard(id)).slice(0, MAX_BUNDLE_CARDS);
  const points = Math.max(0, Math.min(MAX_POINTS, Math.floor(Number(b?.points) || 0)));
  return { cards, points };
}
const emptyBundle = (b) => !b.cards.length && !b.points;
// Points alone can't buy a traded card; they only go with at least one card.
const POINTS_ONLY = 'Points can only go along with a card: add at least one card.';
const pointsOnly = (b) => !b.cards.length && b.points > 0;
export const bundleText = (b) => [...b.cards.map(nameOf), ...(b.points ? [`${b.points} points`] : [])].join(' + ');

// Does this account have everything in the bundle (enough copies of each card, and the points)?
export function lacks(acc, b) {
  const need = {};
  for (const id of b.cards) need[id] = (need[id] ?? 0) + 1;
  for (const [id, n] of Object.entries(need)) if (copiesOf(acc, id) < n) return `${acc.name ?? 'They'} ${n > 1 ? `need ${n} copies of` : "don't have"} ${nameOf(id)}`;
  if ((acc.points ?? 0) < b.points) return `${acc.name ?? 'They'} only have ${acc.points ?? 0} points`;
  return null;
}

// Take one copy from an account: a duplicate if there is one, otherwise the card itself.
export function takeCard(acc, id) {
  if ((acc.dupes?.[id] ?? 0) > 0) { acc.dupes[id] -= 1; if (!acc.dupes[id]) delete acc.dupes[id]; return true; }
  const i = (acc.cards ?? []).indexOf(id);
  if (i < 0) return false;
  acc.cards.splice(i, 1);
  return true;
}
// Give one copy: the card itself if they don't own it, otherwise a duplicate.
export function giveCard(acc, id) {
  acc.cards ??= [];
  if (acc.cards.includes(id)) { acc.dupes ??= {}; acc.dupes[id] = (acc.dupes[id] ?? 0) + 1; }
  else acc.cards.push(id);
}
const takeBundle = (acc, b) => { for (const id of b.cards) takeCard(acc, id); acc.points = (acc.points ?? 0) - b.points; };
const giveBundle = (acc, b) => { for (const id of b.cards) giveCard(acc, id); acc.points = (acc.points ?? 0) + b.points; };

export function newListing(acc, give, wants, openListings, now = Date.now()) {
  const g = cleanBundle({ cards: Array.isArray(give) ? give : [give] }).cards;
  if (!g.length) return { error: 'Pick a card to trade.' };
  if (g.length > MAX_GIVE) return { error: `Put up at most ${MAX_GIVE} cards at once.` };
  const missing = lacks({ ...acc, name: 'You' }, { cards: g, points: 0 });
  if (missing) return { error: `${missing.replace('You need', 'You need').replace("You don't have", "You don't have")}.` };
  const options = (Array.isArray(wants) ? wants : []).map(cleanBundle).filter((b) => !emptyBundle(b));
  if (options.some(pointsOnly)) return { error: POINTS_ONLY };
  const seen = new Set();
  const unique = options.filter((b) => { const k = `${[...b.cards].sort().join(',')}|${b.points}`; if (seen.has(k)) return false; seen.add(k); return true; });
  if (!unique.length) return { error: 'Say what you would take: at least one card.' };
  if (unique.length > MAX_OPTIONS) return { error: `Give at most ${MAX_OPTIONS} options.` };
  if (openListings >= MAX_LISTINGS) return { error: `You can have ${MAX_LISTINGS} trades up at once. Cancel one first.` };
  for (const id of g) takeCard(acc, id);
  return { listing: { id: crypto.randomBytes(6).toString('hex'), owner: acc.key, ownerName: acc.name, give: g, wants: unique, created: now, expires: now + LISTING_DAYS * 86400000, offers: [] } };
}

// The trade happens: the bidder pays `bundle`, and gets the listed cards. Checks the bidder can pay.
export function swap(listing, owner, bidder, bundle) {
  const missing = lacks(bidder, bundle);
  if (missing) return { error: `${missing}.` };
  takeBundle(bidder, bundle);
  for (const id of listing.give) giveCard(bidder, id);
  giveBundle(owner, bundle);
  return { ok: true };
}

export function addOffer(listing, bidder, bundle, now = Date.now()) {
  if (bidder.key === listing.owner) return { error: "That's your own trade." };
  const b = cleanBundle(bundle);
  if (emptyBundle(b)) return { error: 'Offer at least one card.' };
  if (pointsOnly(b)) return { error: POINTS_ONLY };
  const missing = lacks({ ...bidder, name: 'You' }, b);
  if (missing) return { error: `${missing}.` };
  listing.offers = listing.offers.filter((o) => o.bidder !== bidder.key); // one offer per player: a new one replaces it
  if (listing.offers.length >= MAX_OFFERS) return { error: 'This trade has too many offers already.' };
  const offer = { id: crypto.randomBytes(5).toString('hex'), bidder: bidder.key, bidderName: bidder.name, bundle: b, by: 'bidder', created: now };
  listing.offers.push(offer);
  return { offer };
}

// The lister asks the bidder for a different bundle instead.
export function counter(listing, offerId, bundle, bidder) {
  const offer = listing.offers.find((o) => o.id === offerId);
  if (!offer) return { error: 'That offer is gone.' };
  const b = cleanBundle(bundle);
  if (emptyBundle(b)) return { error: 'Ask for at least one card.' };
  if (pointsOnly(b)) return { error: POINTS_ONLY };
  if (bidder) { const missing = lacks(bidder, b); if (missing) return { error: `${missing}.` }; }
  offer.bundle = b;
  offer.by = 'owner';
  return { offer };
}

export const removeOffer = (listing, offerId) => { listing.offers = listing.offers.filter((o) => o.id !== offerId); };

// What a player sees of a listing: everyone sees the cards and options; offers are private to the two
// players in them. canTake: which of the options this viewer can pay right now.
export function listingView(listing, viewer, viewerAcc = null) {
  const mine = listing.owner === viewer;
  return {
    id: listing.id, owner: listing.ownerName, mine, give: listing.give, wants: listing.wants, created: listing.created, expires: listing.expires,
    offerCount: listing.offers.length,
    offers: listing.offers.filter((o) => mine || o.bidder === viewer).map((o) => ({ id: o.id, bidder: o.bidderName, bundle: o.bundle, by: o.by, yours: o.bidder === viewer })),
    canTake: mine || !viewerAcc ? [] : listing.wants.map((b, i) => (lacks(viewerAcc, b) ? null : i)).filter((i) => i != null),
  };
}
