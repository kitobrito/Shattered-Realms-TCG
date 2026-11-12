// The Shop (main menu): daily missions, card packs, single cards and boards, duplicates and the trade board.
// Everything lives on the account on the server (server/economy.js, server/trades.js); this file only
// draws it. main.js keeps the `shop` state and handles the buttons (data-act="shop…").
//
// shop: { tab: 'dailies' | 'packs' | 'cards' | 'dupes' | 'trades', cardRealm, you, trades: [listing], opened: { cards, title } | null,
//         draft: { mode: 'post' | 'offer' | 'counter', id?, offer?, give: [ids], options: [bundle], bundle: bundle,
//                  realm, target: 'give' | number | 'bundle', collection?: [ids] } | null, busy, msg }

import { allCards, getCard } from '../engine/registry.js';
import { PLAYABLE_FACTIONS } from '../cards/index.js';
import { ALT_BOARDS, BOARD_ART } from '../cards/board-art.js';
import { boardProgress } from './unlocks.js';
import { missionCardHTML } from './missions.js';
import { artOf, cardHTML, esc, icon } from './shared.js';

const extras = () => allCards().filter((c) => c.extra && !c.token && !c.custom && !c.alwaysUnlocked);
const ofRealm = (f) => extras().filter((c) => c.faction === f);
const nameOf = (id) => getCard(id)?.name ?? id;
// Shop art (art/ui/shop): a pack wrapper per realm plus the Legendary Pack, the points coin and the opening burst.
const packArt = (f) => `art/ui/shop/pack-${String(f).toLowerCase().replace(/\s+/g, '-')}.webp`;
const COIN = '<img class="sh-coin" src="art/ui/shop/coin.webp" alt="" draggable="false">';
const price = (n) => `${COIN}<span>${n}</span>`;

const chip = (id, extra = '') => {
  const c = getCard(id);
  const art = c && artOf(c);
  return `<span class="sh-chip ${c?.legendary ? 'legendary' : ''}" data-preview="${esc(id)}" ${extra}>${art ? `<img src="${art}" alt="" draggable="false">` : `<b>${esc(c?.art ?? '?')}</b>`}<span>${esc(nameOf(id))}</span></span>`;
};
const bundleHTML = (b) => [...(b.cards ?? []).map((id) => chip(id)), ...(b.points ? [`<span class="sh-pts">${COIN}${b.points}</span>`] : [])].join('<i class="sh-plus">+</i>') || '<em>nothing</em>';
const hhmm = (ms) => { const m = Math.max(0, Math.round(ms / 60000)); return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`; };

export function shopHTML(shop, signedIn) {
  const e = shop.you?.economy;
  const tabs = [['dailies', 'Dailies'], ['packs', 'Packs'], ['cards', 'Buy cards'], ['dupes', 'Duplicates'], ['trades', 'Trade board']];
  const head = `<header class="sh-head">
      <button class="ghost sh-back" data-act="shopClose">${icon('chevron')}<span>Menu</span></button>
      <h1>Shop</h1>
      <div class="sh-points" title="Points: earned by completing daily missions">${e ? `${COIN}<b>${e.points}</b><span>points</span>` : ''}</div>
    </header>
    <nav class="sh-tabs">${tabs.map(([k, l]) => `<button data-act="shopTab:${k}" class="${shop.tab === k ? 'on' : 'ghost'}">${l}${k === 'dupes' && e && Object.keys(e.dupes).length ? ` <i class="sh-count">${Object.values(e.dupes).reduce((a, b) => a + b, 0)}</i>` : ''}</button>`).join('')}</nav>`;
  if (!signedIn) {
    return `<div class="menu shop"><div class="sh-wrap">${head.replace(/<nav class="sh-tabs">[\s\S]*<\/nav>/, '')}
      <section class="sh-panel sh-empty"><h2>Sign in to use the Shop</h2>
      <p>Daily missions earn points, points buy card packs, and the trade board swaps cards with other players. They all belong to your account, so sign in first.</p>
      <button class="gold" data-act="online">Sign in</button></section></div></div>`;
  }
  if (!e) return `<div class="menu shop"><div class="sh-wrap">${head}<section class="sh-panel sh-empty"><p>Loading your account…</p></section></div></div>`;
  const body = shop.tab === 'packs' ? packsHTML(shop, e) : shop.tab === 'cards' ? cardsHTML(shop, e) : shop.tab === 'dupes' ? dupesHTML(e) : shop.tab === 'trades' ? tradesHTML(shop, e) : dailiesHTML(e);
  return `<div class="menu shop"><div class="sh-wrap">${head}${shop.msg ? `<p class="sh-msg">${esc(shop.msg)}</p>` : ''}${body}</div>
    ${shop.opened ? openedHTML(shop.opened) : ''}${shop.draft ? draftHTML(shop, e) : ''}</div>`;
}

function dailiesHTML(e) {
  return `<section class="sh-panel"><div class="sh-row"><h2>Daily missions</h2><span class="sh-sub">New missions in ${hhmm(e.resetsIn)}</span></div>
    <p class="sh-sub">Win Quick Match or Ranked games to complete them. Each pays <b>${e.rules.dailyPoints} points</b>. Missions you don't finish today are replaced tomorrow.</p>
    <ul class="dm-list sh-dailies-big">${e.dailies.map((m, i) => `<li class="dm-mission ${m.done ? 'done' : ''}" style="--i:${i}">
      ${missionCardHTML(m)}${m.done ? '<em class="dm-done">✔ Done</em>' : ''}</li>`).join('')}</ul>
    <p class="sh-sub">Winning still unlocks cards too, until you own ${e.rules.freePerFaction} of a realm's expansion cards. The rest of a realm come from its packs.</p></section>`;
}

function packsHTML(shop, e) {
  const owned = new Set(e.cards);
  const r = e.rules;
  const realm = (f) => {
    const all = ofRealm(f), have = all.filter((c) => owned.has(c.id)).length;
    return `<div class="sh-pack ${have === all.length ? 'complete' : ''}">
      <img class="sh-pack-art" src="${packArt(f)}" alt="" draggable="false"><b>${esc(f)}</b><small>${have} / ${all.length} owned</small>
      <button data-act="shopBuy:${esc(f)}" class="${e.points >= r.packCost ? 'gold' : 'ghost'}" ${e.points >= r.packCost && !shop.busy ? '' : 'disabled'}>${price(r.packCost)}</button></div>`;
  };
  return `<section class="sh-panel sh-legendary">
      <img class="sh-legend-art" src="${packArt('legendary')}" alt="" draggable="false">
      <div><h2>Legendary Pack</h2><p>${r.packSize} cards from <b>any realm</b>, completely random, with at least one <b>guaranteed legendary</b> (one you don't own yet, while there are any).</p></div>
      <button data-act="shopBuy:legendary" class="${e.points >= r.legendaryPackCost ? 'gold' : 'ghost'}" ${e.points >= r.legendaryPackCost && !shop.busy ? '' : 'disabled'}>${price(r.legendaryPackCost)}</button>
    </section>
    <section class="sh-panel"><div class="sh-row"><h2>Realm packs</h2><span class="sh-sub">${r.packSize} cards · ${Math.round(r.legendaryChance * 100)}% legendary chance per card</span></div>
    <p class="sh-sub">Cards from the realm you pick, mostly ones you don't have yet. A card you already own is a duplicate: recycle it for points or trade it.</p>
    <div class="sh-packs">${PLAYABLE_FACTIONS.map(realm).join('')}</div></section>`;
}

// Single cards and boards for points: the expansion cards of one realm you don't own yet, and the
// realm's alternate boards.
function cardsHTML(shop, e) {
  const owned = new Set(e.cards);
  const r = e.rules;
  const realm = PLAYABLE_FACTIONS.includes(shop.cardRealm) ? shop.cardRealm : PLAYABLE_FACTIONS.find((f) => ofRealm(f).some((c) => !owned.has(c.id))) ?? PLAYABLE_FACTIONS[0];
  const left = ofRealm(realm).filter((c) => !owned.has(c.id)).sort((a, b) => (a.legendary ? 1 : 0) - (b.legendary ? 1 : 0) || a.cost - b.cost);
  const price = (c) => (c.legendary ? r.cardPrice.legendary : r.cardPrice.normal);
  const buy = (act, cost, label = price(cost)) => `<button data-act="${act}" class="${e.points >= cost ? 'gold' : 'ghost'}" ${e.points >= cost && !shop.busy ? '' : 'disabled'}>${label}</button>`;
  const boards = (ALT_BOARDS[realm] ?? []).map((b) => {
    const p = boardProgress(b, realm);
    const have = (e.boards ?? []).includes(b.id) || (p.total > 0 && p.have === p.total);
    return `<div class="sh-board ${have ? 'owned' : ''}">
      <span class="sh-board-thumb" style="background-image:url('${new URL(BOARD_ART[b.id], document.baseURI).href}')"></span>
      <div><b>${esc(b.id)}</b><small>${esc(b.blurb)}</small>${have ? '' : `<small class="sh-sub">Or collect all ${p.total} of its cards (${p.have}/${p.total}) to unlock it free.</small>`}</div>
      ${have ? '<em class="sh-owned">Owned</em>' : buy(`shopBuyBoard:${esc(b.id)}`, r.boardPrice)}</div>`;
  }).join('');
  return `<section class="sh-panel"><div class="sh-row"><h2>Buy cards</h2>
      <label class="sh-realm">Realm <select data-act-change="shopCardRealm">${PLAYABLE_FACTIONS.map((f) => `<option ${f === realm ? 'selected' : ''}>${esc(f)}</option>`).join('')}</select></label></div>
    <p class="sh-sub">Pick out exactly the card you want: <b>${r.cardPrice.normal} points</b> each, <b>${r.cardPrice.legendary}</b> for a legendary. Boards are <b>${r.boardPrice} points</b>.</p></section>
    ${boards ? `<section class="sh-panel"><h2>${esc(realm)} boards</h2><div class="sh-boards">${boards}</div></section>` : ''}
    <section class="sh-panel"><div class="sh-row"><h2>${esc(realm)} cards you don't have</h2><span class="sh-sub">${left.length} left</span></div>
    ${left.length ? `<div class="sh-buy-grid">${left.map((c) => `<div class="sh-buy ${c.legendary ? 'legendary' : ''}">${cardHTML(c)}${buy(`shopBuyCard:${esc(c.id)}`, price(c))}</div>`).join('')}</div>`
      : `<p class="sh-sub">You own every ${esc(realm)} expansion card.</p>`}</section>`;
}

function dupesHTML(e) {
  const ids = Object.keys(e.dupes).sort((a, b) => nameOf(a).localeCompare(nameOf(b)));
  if (!ids.length) return `<section class="sh-panel sh-empty"><h2>No duplicates</h2><p>Cards you already own that come out of packs land here. Recycle them for points, or offer them on the trade board.</p></section>`;
  const value = (id) => (getCard(id)?.legendary ? e.rules.recycle.legendary : e.rules.recycle.normal);
  const total = ids.reduce((n, id) => n + value(id) * e.dupes[id], 0);
  return `<section class="sh-panel"><div class="sh-row"><h2>Duplicates</h2><button class="gold" data-act="shopRecycleAll">Recycle all for ${price(total)}</button></div>
    <p class="sh-sub">${e.rules.recycle.normal} points each, ${e.rules.recycle.legendary} for a legendary. Or trade them on the trade board.</p>
    <ul class="sh-dupes">${ids.map((id) => `<li>${chip(id)}<span class="sh-x">×${e.dupes[id]}</span><button class="ghost" data-act="shopRecycle:${esc(id)}">Recycle 1 (+${price(value(id))})</button></li>`).join('')}</ul></section>`;
}

function tradesHTML(shop, e) {
  const list = shop.trades ?? [];
  const mine = list.filter((t) => t.mine), theirs = list.filter((t) => !t.mine);
  const listing = (t) => `<article class="sh-trade ${t.mine ? 'mine' : ''}">
      <div class="sh-trade-top"><span class="sh-who">${t.mine ? 'Your trade' : esc(t.owner)}</span><span class="sh-sub">ends in ${hhmm(t.expires - Date.now())}</span></div>
      <div class="sh-give"><span class="sh-label">Giving</span>${t.give.map((id) => chip(id)).join('')}</div>
      <div class="sh-wants"><span class="sh-label">For any one of</span>${t.wants.map((b, i) => `<div class="sh-opt">${bundleHTML(b)}${!t.mine ? `<button class="${t.canTake.includes(i) ? 'gold' : 'ghost'}" data-act="tradeTake:${t.id}:${i}" ${t.canTake.includes(i) ? '' : 'disabled title="You don\'t have this"'}>Trade</button>` : ''}</div>`).join('')}</div>
      ${t.offers.length ? `<div class="sh-offers"><span class="sh-label">${t.mine ? 'Offers' : 'Your offer'}</span>${t.offers.map((o) => `<div class="sh-offer">
        <span>${t.mine ? `<b>${esc(o.bidder)}</b> ${o.by === 'owner' ? 'was asked for' : 'offers'}` : o.by === 'owner' ? `<b>${esc(t.owner)}</b> asks you for` : 'You offered'}</span>${bundleHTML(o.bundle)}
        ${(t.mine && o.by === 'bidder') || (!t.mine && o.by === 'owner') ? `<button class="gold" data-act="tradeAccept:${t.id}:${o.id}">Accept</button>` : `<span class="sh-sub">waiting…</span>`}
        ${t.mine ? `<button class="ghost" data-act="tradeCounter:${t.id}:${o.id}">Counter</button>` : ''}
        <button class="ghost" data-act="tradeDecline:${t.id}:${o.id}">${t.mine ? 'Decline' : 'Withdraw'}</button></div>`).join('')}</div>` : ''}
      <div class="sh-trade-foot">${t.mine ? `<span class="sh-sub">${t.offerCount} offer${t.offerCount === 1 ? '' : 's'}</span><button class="ghost" data-act="tradeCancel:${t.id}">Take down</button>`
        : `<button class="ghost" data-act="tradeOffer:${t.id}">Make a different offer</button>`}</div>
    </article>`;
  return `<section class="sh-panel"><div class="sh-row"><h2>Trade board</h2><button class="gold" data-act="tradeNew">Post a trade</button></div>
    <p class="sh-sub">Put up cards and say what you'd take: any of several cards, or cards together, with points on top if you like (points can't be the whole price: single cards are bought in Buy cards). Anyone can also make you a different offer, and you can counter. Cards you put up are held until the trade ends.</p></section>
    ${mine.length ? `<section class="sh-panel"><h2>Your trades</h2>${mine.map(listing).join('')}</section>` : ''}
    <section class="sh-panel"><h2>Open trades</h2>${theirs.length ? theirs.map(listing).join('') : '<p class="sh-sub">No trades up right now. Post the first one.</p>'}</section>`;
}

// A pack opened: the wrapper shakes and bursts open in a flash, then the cards are dealt out.
function openedHTML(o) {
  return `<div class="overlay unlock-overlay sh-opened ${o.seen ? 'seen' : ''}">
    ${o.pack && !o.seen ? `<div class="sh-rip" aria-hidden="true"><img class="sh-burst" src="art/ui/shop/burst.webp" alt=""><img class="sh-rip-pack" src="${packArt(o.pack)}" alt=""></div>` : ''}
    <div class="unlock-panel">
    <div class="unlock-burst"></div>
    <h2>${esc(o.title)}</h2>
    <div class="unlock-row">${o.cards.map((c, k) => `<div class="unlock-card ${c.duplicate ? 'dupe' : 'new'}" style="--k:${k}">${cardHTML(getCard(c.id))}<span class="unlock-faction">${c.duplicate ? 'Duplicate' : 'New!'} · ${esc(getCard(c.id).faction)}</span></div>`).join('')}</div>
    <p class="sub">${o.cards.filter((c) => !c.duplicate).length} new card${o.cards.filter((c) => !c.duplicate).length === 1 ? '' : 's'}. Duplicates went to the Duplicates tab.</p>
    <button data-act="shopOpenedOk">Awesome!</button></div></div>`;
}

// The trade composer: what you give and what you'd take (post), or a bundle (offer / counter).
function draftHTML(shop, e) {
  const d = shop.draft;
  const mineIds = [...new Set([...e.cards, ...Object.keys(e.dupes)])];
  // Cards you can pick: posting "give" or offering: your own cards; options and counters: any card.
  const pool = d.target === 'give' || (d.mode === 'offer') ? mineIds : d.mode === 'counter' ? (d.collection ?? []) : extras().map((c) => c.id);
  const realms = PLAYABLE_FACTIONS.filter((f) => pool.some((id) => getCard(id)?.faction === f));
  const realm = realms.includes(d.realm) ? d.realm : realms[0];
  const cards = pool.filter((id) => getCard(id)?.faction === realm).sort((a, b) => nameOf(a).localeCompare(nameOf(b)));
  const picker = `<div class="sh-picker">
      <label>Realm <select data-act-change="draftRealm">${realms.map((f) => `<option ${f === realm ? 'selected' : ''}>${esc(f)}</option>`).join('')}</select></label>
      <div class="sh-pick-list">${cards.map((id) => `<button class="ghost" data-act="draftAdd:${esc(id)}">${chip(id)}${e.dupes[id] ? `<i class="sh-x">×${e.dupes[id] + (e.cards.includes(id) ? 1 : 0)}</i>` : ''}</button>`).join('') || '<p class="sh-sub">No cards here.</p>'}</div>
    </div>`;
  const slot = (b, key, label) => `<div class="sh-slot ${d.target === key ? 'on' : ''}" data-act="draftTarget:${key}">
      <span class="sh-label">${label}</span><div>${(b.cards ?? []).map((id, i) => `<span class="sh-rm" data-act="draftRemove:${key}:${i}">${chip(id)}<i>✕</i></span>`).join('') || '<em>tap cards below to add</em>'}</div>
      ${key !== 'give' ? `<label class="sh-ptsin" title="Points only go along with at least one card">+ points <input type="number" min="0" step="10" value="${b.points || 0}" data-act-change="draftPoints:${key}"></label>` : ''}
      ${typeof key === 'number' && d.options.length > 1 ? `<button class="ghost sh-x-opt" data-act="draftDropOption:${key}">Remove option</button>` : ''}</div>`;
  let body;
  if (d.mode === 'post') {
    const last = d.give.some((id) => !(e.dupes[id] > 0)) ? '<p class="sh-warn">You have only one copy of a card you are putting up: if it trades, you lose it.</p>' : '';
    body = `<h2>Post a trade</h2>${slot({ cards: d.give }, 'give', 'You give')}${last}
      <h3>You'd take any one of:</h3>${d.options.map((b, i) => slot(b, i, `Option ${i + 1}`)).join('')}
      ${d.options.length < 6 ? '<button class="ghost" data-act="draftAddOption">+ Add another option</button>' : ''}`;
  } else {
    body = `<h2>${d.mode === 'offer' ? 'Make an offer' : 'Counter-offer'}</h2>
      <p class="sh-sub">${d.mode === 'offer' ? 'Offer any of your cards for this trade, with points on top if you like.' : 'Ask for different cards from their collection, with points on top if you like.'}</p>
      ${slot(d.bundle, 'bundle', d.mode === 'offer' ? 'You offer' : 'You ask for')}`;
  }
  return `<div class="overlay sh-draft"><div class="sh-draft-panel">${body}${picker}
    <div class="sh-draft-foot"><button class="ghost" data-act="draftCancel">Cancel</button><button class="gold" data-act="draftSend">${d.mode === 'post' ? 'Post trade' : 'Send'}</button></div></div></div>`;
}
