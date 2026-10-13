// Browser UI: menu, collection, deck builder, and the action loop for the
// battle screen. The UI only reads state and submits actions from
// getLegalActions(), so every rule lives in the engine.

import { applyAdvantage, chooseAction } from '../ai/smart.js';
import { buildDeck, buildSingleDeck, FACTION_DECKS, FACTION_LISTS, FACTION_POOLS, hasExtras, lineupOf, PLAYABLE_FACTIONS, standardCuts, standardDuplicates } from '../cards/index.js';
import { costOf, effectiveAttack, findCharacter, hasKeyword, manaFor } from '../engine/core.js';
import { ART } from '../cards/art-manifest.js';
import { boardArtFor } from '../cards/board-art.js';
import { applySettings, difficultySliderHTML, getSettings, openSettings, setSetting } from './settings.js';
import { clearTips, howToOpened, howToPlayHTML, markHowToOpened, tip } from './tutorial.js';
import { actingPlayer, applyAction, createGame, fusionFor, getLegalActions, legalMatch } from '../engine/engine.js';
import { checkDeck } from '../cards/deck-check.js';
import { allCards, getCard, restoreCustomCards } from '../engine/registry.js';
import { DEFAULT_RULES, FACTIONS, KEYWORD_TEXT, LAUNCH_FACTIONS } from '../engine/rules.js';
import { boardHTML, layoutHands, layoutPortraitBoard, paintedBoards, portraitLayout } from './board.js';
import { canPokeBoard, hideBoard, pokeBoard, showBoard } from './board-layer.js';
import * as drag from './drag.js';
import * as fx from './fx.js';
import { backArtOf, bigCardHTML, cardHTML, cardTerms, esc, FACTION_ICONS, fitAllText, heroArtOf, rankBadgeHTML, rankProgressHTML, youText } from './shared.js';
import { EMOTE_KINDS, EMOTE_LABELS, emoteLine } from '../cards/emotes.js';
import { FACTION_INFO, synergyFor } from '../cards/faction-info.js';
import * as sound from './sound.js';
import { music, refreshMusic } from './music.js';
import * as net from './net.js';
import * as srv from './server-link.js';
import { BUILD } from '../build.js';
import { awardUnlocks, isLocked, lockedCount, unlockPopupHTML } from './unlocks.js';

const SAVE_KEY = 'faction-ccg-save';
const SAVE_VERSION = 2;
const app = document.getElementById('app');

let screen = 'menu';
let game = null;           // { state, mode: 'ai' | 'hotseat' | 'online', factions, rivalFactions }
let viewer = 0;            // whose perspective is shown at the bottom
let handoff = false;       // hot-seat: hide hands while passing the device
let aiTimer = null;
let animating = false;     // input is locked while an action animates
let reactionTimer = null;  // Quick Play countdown: { key, deadline, interval }
let zoomId = null;         // card id expanded in the collection / deck builder
let draftCuts = null;      // deck builder: card ids currently cut
let mullMarked = [];       // mulligan: hand uids marked to swap
let galleryOrder = [];     // card ids in collection order (for arrow-key paging)
let history = [];          // play-history strip entries
const LOG_KEY = 'faction-ccg-log-open';
let endArmed = null;       // End Turn asked "Really end?" this turn (turn number)
let endArmTimer = null;
let concedeAsk = false;     // the Concede confirmation is open
const freshStats = () => ({ heroDamage: [0, 0], kills: [0, 0], cardsPlayed: [0, 0], healing: [0, 0], bestPlay: null });
let heroesShattered = false; // game over: the losing hero's portrait has exploded
let logOpen = (() => { try { return localStorage.getItem(LOG_KEY) === '1'; } catch { return false; } })();

// ---- Persistence ----------------------------------------------------------

function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify({ ...game, version: SAVE_VERSION })); flash('Game saved.'); } catch { flash('Could not save.'); }
}
function loadSaved() {
  try {
    // Saves from before the rename hold The Coin as 'the_coin'.
    const g = JSON.parse((localStorage.getItem(SAVE_KEY) ?? 'null').replaceAll('"the_coin"', '"mana_potion"'));
    return g?.version === SAVE_VERSION ? g : null; // older saves predate Hero Spells
  } catch { return null; }
}

// ---- Card swaps (factions with expansion cards) -------------------------------
// A faction with more than 30 cards (e.g. Radioactive, Vampires: 45) lets the
// player choose which 30 they bring. Saved per faction; otherwise the standard 30.

const LINEUP_KEY = 'faction-ccg-lineups';
function savedLineups() {
  let all;
  try { all = JSON.parse(localStorage.getItem(LINEUP_KEY) ?? '{}'); } catch { return {}; }
  // A lineup can only use unlocked cards.
  return Object.fromEntries(Object.entries(all).filter(([, ids]) => Array.isArray(ids) && !ids.some(isLocked)));
}
const customLineupFor = (f) => (lineupOf(f, savedLineups()) === FACTION_DECKS[f] ? null : savedLineups()[f]);
function storeLineup(f, ids) {
  const all = savedLineups();
  if (ids) all[f] = ids; else delete all[f];
  try { localStorage.setItem(LINEUP_KEY, JSON.stringify(all)); } catch { flash('Could not save your cards.'); }
}
let swapFaction = null;   // card swap screen: which faction
let draftLineup = null;   // card swap screen: the 30 chosen

// ---- Deck cuts --------------------------------------------------------------
// Each faction pair can have a saved custom cut; otherwise the standard cut is used.

const CUTS_KEY = 'faction-ccg-cuts';
const pairKey = (factions) => [...factions].sort().join('+');
function savedCuts() {
  try { return JSON.parse(localStorage.getItem(CUTS_KEY) ?? '{}'); } catch { return {}; }
}
function customCutsFor(factions) {
  return savedCuts()[pairKey(factions)] ?? null;
}
// A saved cut only counts if every cut card is still in the player's chosen cards.
function validCustomCuts(factions) {
  const c = customCutsFor(factions);
  if (!c) return null;
  const pool = new Set(factions.flatMap((f) => lineupOf(f, savedLineups())));
  return c.length === DEFAULT_RULES.cardsCut && c.every((id) => pool.has(id)) ? c : null;
}
function cutsFor(factions) {
  return validCustomCuts(factions) ?? standardCuts(factions, savedLineups());
}
function storeCuts(factions, cuts) {
  const all = savedCuts();
  if (cuts) all[pairKey(factions)] = cuts; else delete all[pairKey(factions)];
  try { localStorage.setItem(CUTS_KEY, JSON.stringify(all)); } catch { flash('Could not save your cut.'); }
}
const cutCount = (cuts, f) => cuts.filter((id) => FACTION_POOLS[f].includes(id)).length;

// ---- One-faction format: duplicates ------------------------------------------
// Each faction can have a saved set of 10 duplicates; otherwise the standard set.

const DUPES_KEY = 'faction-ccg-dupes';
function savedDupes() {
  try { return JSON.parse(localStorage.getItem(DUPES_KEY) ?? '{}'); } catch { return {}; }
}
const customDupesFor = (f) => {
  const d = savedDupes()[f];
  const lineup = lineupOf(f, savedLineups());
  return d && d.every((id) => lineup.includes(id)) ? d : null;
};
const dupesFor = (f) => customDupesFor(f) ?? standardDuplicates(f, savedLineups());
function storeDupes(f, ids) {
  const all = savedDupes();
  if (ids) all[f] = ids; else delete all[f];
  try { localStorage.setItem(DUPES_KEY, JSON.stringify(all)); } catch { flash('Could not save your duplicates.'); }
}

// 'pair' = two factions, cut 20. 'single' = one faction + 10 duplicates.
const FORMAT_KEY = 'faction-ccg-format';
let format = (() => { try { return localStorage.getItem(FORMAT_KEY) === 'single' ? 'single' : 'pair'; } catch { return 'pair'; } })();
let builderMode = 'cut';   // which deck builder is open: 'cut' or 'dupe'
let draftDupes = null;     // deck builder: card ids chosen as duplicates

// ---- Game flow ------------------------------------------------------------

const pickNeeded = () => (format === 'single' ? 1 : Math.min(DEFAULT_RULES.factionsPerDeck, PLAYABLE_FACTIONS.length));
let picked = PLAYABLE_FACTIONS.slice(0, pickNeeded());
// Each format remembers its own pick when you switch between them.
const otherPick = { pair: null, single: null };
function setFormat(next) {
  if (next === format) return;
  otherPick[format] = picked;
  format = next;
  picked = otherPick[format] ?? picked.slice(0, pickNeeded());
  try { localStorage.setItem(FORMAT_KEY, format); } catch { /* storage unavailable */ }
}
const deckFor = (factions, mine) => (format === 'single'
  ? buildSingleDeck(factions[0], mine ? dupesFor(factions[0]) : undefined, mine ? savedLineups() : {})
  : buildDeck(factions, mine ? cutsFor(factions) : undefined, mine ? savedLineups() : {}));

// The opponent gets a random pair of playable factions.
function randomPick() {
  const pool = [...PLAYABLE_FACTIONS];
  const out = [];
  while (out.length < pickNeeded()) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  return out;
}

function startGame(mode, factions = picked, rivalFactions = randomPick()) {
  if (factions.length !== pickNeeded()) return flash(`Pick ${pickNeeded()} factions.`);
  // The coin flip: the human takes seat 0 (goes first) or seat 1 (goes second, gets the Mana Potion).
  const human = Math.random() < 0.5 ? 0 : 1;
  const you = { name: mode === 'ai' ? 'You' : 'Player 1', factions, deck: deckFor(factions, true) };
  const rival = { name: mode === 'ai' ? 'Rival' : 'Player 2', factions: rivalFactions, deck: deckFor(rivalFactions, false) };
  const state = createGame({
    seed: (Math.random() * 2 ** 31) | 0,
    players: human === 0 ? [you, rival] : [rival, you],
  });
  const difficulty = mode === 'ai' ? getSettings().difficulty ?? 'medium' : null;
  // Hard and up: the AI gets a head start (extra Health, extra cards).
  if (difficulty) applyAdvantage(state, 1 - human, difficulty);
  game = { state, mode, factions, rivalFactions, human, format, difficulty, stats: freshStats() };
  // Phones in full-screen can lock to landscape; elsewhere this quietly does nothing.
  enterGame(true);
}

function enterGame(isNew = false) {
  game.stats ??= freshStats();
  endArmed = null;
  concedeAsk = false;
  restoreCustomCards(game.state); // Hybrids etc. from a saved game
  screen = 'game';
  history = [];
  drag.cancel();
  viewer = game.mode !== 'hotseat' ? humanSeat() : actingPlayer(game.state);
  handoff = false;
  heroesShattered = !!game.state.gameOver;
  turnTimer = { key: null };
  if (!isNew) { render(); scheduleAI(); return; }
  animating = true; // nothing moves until the intro is over
  render();
  showLoader().then(playIntro).finally(() => { animating = false; render(); scheduleAI(); });
}

// Old saves predate random seats: the human was always seat 0.
const humanSeat = () => game?.human ?? 0;

// ---- Intro: versus screen, then the coin flip ---------------------------------------

async function playIntro() {
  const s = game.state;
  const hs = humanSeat();
  const side = (pl, cls) => {
    const art = heroArtOf(pl.factions[0]);
    return `<div class="intro-side ${cls}">
      <div class="intro-portrait">${art ? `<img src="${art}" alt="">` : `<span>${FACTION_ICONS[pl.factions[0]] ?? '✦'}</span>`}</div>
      <b>${esc(pl.name)}</b><small>${pl.factions.map(esc).join(' · ')}</small></div>`;
  };
  const text = game.mode !== 'hotseat'
    ? (hs === 0 ? 'You go first!' : 'You go second, and pick a potion.')
    : `${esc(s.players[0].name)} goes first!`;
  const el = document.createElement('div');
  el.className = 'intro';
  el.innerHTML = `${side(s.players[hs], 'me')}<div class="intro-vs">VS</div>${side(s.players[1 - hs], 'opp')}
    <div class="intro-coin"><div class="coin"><span class="face front">1st</span><span class="face back">2nd</span></div><p class="coin-text">${text}</p></div>`;
  fx.layer().appendChild(el);
  const q = (sel) => el.querySelector(sel);
  try {
    await Promise.all([
      fx.animate(q('.intro-side.me'), [{ transform: 'translateX(-120%)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 650, easing: 'cubic-bezier(.2,.9,.3,1)' }),
      fx.animate(q('.intro-side.opp'), [{ transform: 'translateX(120%)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 650, easing: 'cubic-bezier(.2,.9,.3,1)' }),
    ]);
    sound.play('versus');
    fx.screenShake(el, 10);
    await fx.animate(q('.intro-vs'), [{ transform: 'translate(-50%, -50%) scale(3)', opacity: 0 }, { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 }], { duration: 300, easing: 'ease-in' });
    await fx.wait(900);
    q('.intro-coin').classList.add('show');
    sound.play('coin');
    // Seat 0 goes first. Against the AI the coin shows your result; in hot-seat it names the first player.
    const landsFirst = game.mode !== 'hotseat' ? hs === 0 : true;
    await fx.animate(q('.coin'), [
      { transform: 'translateY(0) rotateY(0deg)' },
      { transform: 'translateY(-60px) rotateY(900deg)', offset: 0.5 },
      { transform: `translateY(0) rotateY(${1800 + (landsFirst ? 0 : 180)}deg)` },
    ], { duration: 1500, easing: 'cubic-bezier(.3,.6,.4,1)' });
    sound.play('coinLand');
    q('.coin-text').classList.add('show');
    await fx.wait(1300);
    await fx.animate(el, [{ opacity: 1 }, { opacity: 0 }], { duration: 400 });
  } finally {
    el.remove();
  }
}

// Online, the opponent is "not local" just like the AI (no input, no timers here), but makes no AI moves.
const isAI = (p) => (game.mode === 'ai' || game.mode === 'online') && p !== humanSeat();

function canAct() {
  const s = game?.state;
  if (screen !== 'game' || !s || animating || s.gameOver || handoff) return false;
  if (isAI(actingPlayer(s))) return false;
  return !s.pending; // overlays (mulligan, choices, Quick Play) use their own buttons
}

// Moves you can drag/aim right now (none while a prompt is open).
const legalNow = () => (canAct() ? getLegalActions(game.state) : []);

// What the screen should offer: free moves, or the open prompt's options
// (Quick Play, Discover, mulligan) when it's a human's to answer.
function legalForView() {
  const s = game.state;
  if (animating || handoff || s.gameOver || isAI(actingPlayer(s))) return [];
  return getLegalActions(s);
}

// ---- Animated action loop -------------------------------------------------------

const charEl = (uid) => app.querySelector(`[data-char="${uid}"]`);

function snapshot(s) {
  const health = new Map();
  const attack = new Map();
  const ctrl = new Map();
  const factionOf = new Map();
  const nameOfUid = new Map();
  for (const pl of s.players) {
    health.set(pl.hero.uid, pl.hero.health + pl.hero.armor);
    for (const c of [pl.hero, ...pl.board]) { attack.set(c.uid, effectiveAttack(c)); ctrl.set(c.uid, c.controller ?? pl.index); }
    for (const m of pl.board) factionOf.set(m.uid, getCard(m.cardId).faction);
    for (const m of pl.board) nameOfUid.set(m.uid, getCard(m.cardId).name);
    for (const m of pl.board) health.set(m.uid, m.health);
  }
  const me = s.players[viewer];
  return {
    health, attack, ctrl, factionOf, nameOfUid,
    myHealth: s.players[viewer].hero.health,
    hand: new Set(me.hand.map((c) => c.uid)),
    oppHand: s.players[1 - viewer].hand.length,
    oppDeck: s.players[1 - viewer].deck.length,
    mana: { ...me.mana },
    fusionCharge: me.fusion?.charge ?? 0,
    active: s.activePlayer,
    turn: s.turn,
    logLen: s.log.length,
  };
}

// A line for the play-history strip.
function describe(action, s) {
  const pl = s.players[action.player];
  const mine = action.player === viewer;
  if (action.type === 'play' || action.type === 'quickPlay') {
    const inst = pl.hand.find((c) => c.uid === action.card);
    const card = getCard(inst.cardId);
    if (card.type === 'trap' && !mine) return { cardId: null, mine, icon: '?', text: `${pl.name} set a Trap.` };
    const t = action.target != null ? findCharacter(s, action.target) : null;
    return { cardId: card.id, mine, icon: action.type === 'quickPlay' ? '⚡' : '', text: `${pl.name} played ${card.name}${t ? ` on ${nameOfChar(s, t)}` : ''}.` };
  }
  if (action.type === 'heroSpell') {
    const card = getCard(action.card);
    return { cardId: card.id, mine, icon: '★', text: `${pl.name} cast ${card.name}.` };
  }
  if (action.type === 'attack') {
    const a = findCharacter(s, action.attacker);
    const d = findCharacter(s, action.defender);
    return { cardId: a.kind === 'minion' ? a.cardId : null, mine, icon: '⚔', text: `${nameOfChar(s, a)} attacked ${nameOfChar(s, d)}.` };
  }
  return null;
}

// Whose style the hits are drawn in: the attacker's or the played card's faction.
function sourceFaction(s, action, playedCard) {
  if (playedCard) return playedCard.faction === 'Neutral' ? s.players[action.player].factions[0] : playedCard.faction;
  if (action.type === 'attack') {
    const a = findCharacter(s, action.attacker);
    if (a?.kind === 'minion') return getCard(a.cardId).faction;
    if (a) return s.players[a.owner].factions[0];
  }
  return null;
}

const nameOfChar = (s, c) => (c.kind === 'hero' ? s.players[c.owner].name : getCard(c.cardId).name);

// A card the AI plays (or a Trap that goes off) is shown full size so you can read it.
// The opponent's cards are shown long enough to read (2.6 s at normal speed).
async function revealPlayed(cardId, { label = '', duration = 2600, cls = 'fx-reveal' } = {}) {
  const holder = document.createElement('div');
  holder.className = cls;
  holder.innerHTML = `${label ? `<div class="trap-label">${esc(label)}</div>` : ''}${bigCardHTML(getCard(cardId))}`;
  fx.layer().appendChild(holder);
  fitAllText(holder);
  await fx.animate(holder, [
    { opacity: 0, transform: 'translate(-50%, -80%) scale(0.5)' },
    { opacity: 1, transform: 'translate(-50%, -50%) scale(1)', offset: 0.15 },
    { opacity: 1, transform: 'translate(-50%, -50%) scale(1)', offset: 0.88 },
    { opacity: 0, transform: 'translate(-50%, -50%) scale(0.9)' },
  ], { duration, easing: 'ease-out' });
  holder.remove();
}

// Starting Hand: the swapped cards fly back to the deck, then the replacements fly in
// and land in their slots (worked out on a copy of the game: the engine is deterministic).
async function animateMulligan(s, action) {
  const preview = structuredClone(s);
  applyAction(preview, structuredClone(action));
  restoreCustomCards(s);
  const keptUids = new Set(s.players[action.player].hand.map((c) => c.uid));
  const fresh = preview.players[action.player].hand.filter((c) => !keptUids.has(c.uid));
  const slots = action.replace.map((uid) => app.querySelector(`.mull-slot[data-mull="${uid}"]`)).filter(Boolean);
  if (!slots.length) return;
  const deck = app.querySelector('.deck-pile.me');
  const deckRect = deck?.getBoundingClientRect();
  sound.play('click');
  await Promise.all(slots.map((slot, i) => {
    slot.classList.remove('marked');
    const r = slot.getBoundingClientRect();
    const dx = deckRect ? deckRect.left + deckRect.width / 2 - (r.left + r.width / 2) : 0;
    const dy = deckRect ? deckRect.top + deckRect.height / 2 - (r.top + r.height / 2) : window.innerHeight;
    return fx.animate(slot, [
      { transform: 'none', opacity: 1 },
      { transform: 'translateY(-14%) rotate(-4deg)', opacity: 1, offset: 0.25 },
      { transform: `translate(${dx}px, ${dy}px) rotate(18deg) scale(0.3)`, opacity: 0 },
    ], { duration: 520, delay: i * 90, easing: 'ease-in', fill: 'forwards' });
  }));
  slots.forEach((slot, i) => {
    const inst = fresh[i];
    if (!inst) return;
    slot.innerHTML = cardHTML(getCard(inst.cardId));
    fitAllText(slot);
  });
  await Promise.all(slots.map((slot, i) => {
    sound.play('draw');
    const r = slot.getBoundingClientRect();
    const dx = deckRect ? deckRect.left + deckRect.width / 2 - (r.left + r.width / 2) : 0;
    const dy = deckRect ? deckRect.top + deckRect.height / 2 - (r.top + r.height / 2) : window.innerHeight;
    return fx.animate(slot, [
      { transform: `translate(${dx}px, ${dy}px) rotate(-14deg) scale(0.3)`, opacity: 0 },
      { transform: 'translateY(-10%) rotate(2deg) scale(1.06)', opacity: 1, offset: 0.7 },
      { transform: 'none', opacity: 1 },
    ], { duration: 560, delay: 120 + i * 110, easing: 'ease-out', fill: 'forwards' });
  }));
  await new Promise((r) => setTimeout(r, 650 * fx.speedFactor()));
}

// Text that arrives from another player (room codes) or the server never carries
// HTML: strip the characters that could break out of the page's markup.
function cleanIncoming(value, depth = 0) {
  if (depth > 40) return null;
  if (typeof value === 'string') return value.replace(/[<>"`]/g, '');
  if (Array.isArray(value)) return value.map((v) => cleanIncoming(v, depth + 1));
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) if (k !== '__proto__' && k !== 'constructor' && k !== 'prototype') out[k] = cleanIncoming(v, depth + 1);
    return out;
  }
  return value;
}

async function act(action, meta = {}) {
  if (animating || !game) return;
  if (meta.remote) {
    // The other player's move must be legal on our copy of the game.
    const legal = legalMatch(game.state, action);
    if (!legal) {
      console.warn('Ignored an illegal move from the other player.', action);
      onDesync();
      return;
    }
    action = legal;
  }
  animating = true;
  // The opponent's moves leave the card you are reading where it is (no closing and reopening).
  if (!meta.remote && !isAI(action.player)) { drag.cancel(); hidePreview(); }
  const s = game.state;
  const before = snapshot(s);
  const rects = fx.snapshotRects(app);
  const oldMinions = new Map();
  for (const el of app.querySelectorAll('[data-char]')) {
    oldMinions.set(Number(el.dataset.char), { clone: el.cloneNode(true), rect: el.getBoundingClientRect(), kw: (el.dataset.kw ?? '').split(' ').filter(Boolean) });
  }
  const entry = describe(action, s);
  const playedCard = (action.type === 'play' || action.type === 'quickPlay')
    ? getCard(s.players[action.player].hand.find((c) => c.uid === action.card).cardId)
    : action.type === 'heroSpell' ? getCard(action.card) : null;

  before.srcFaction = sourceFaction(s, action, playedCard);
  before.castType = playedCard?.type;

  // ---- Before: the move itself.
  let lunged = null;
  try {
    if (action.type === 'attack') {
      sound.play('attack');
      lunged = await fx.lunge(charEl(action.attacker), charEl(action.defender));
    } else if (action.type === 'mulligan' && action.replace?.length && action.player === viewer) {
      await animateMulligan(s, action);
    } else if (playedCard && action.type === 'quickPlay') {
      // Quick Play: both players see the banner, then the card itself, then it lands.
      app.querySelector('.reaction')?.remove();
      sound.play('quickPlay');
      const who = action.player === viewer && game.mode !== 'hotseat' ? 'You' : s.players[action.player].name;
      await fx.banner(`⚡ QUICK PLAY! <small>${esc(who)}</small>`, 'quickplay');
      sound.play(playedCard.type === 'minion' ? 'cardPlay' : 'spell');
      await revealPlayed(playedCard.id, { label: `⚡ ${who === 'You' ? 'Your' : `${who}'s`} Quick Play`, duration: 2600, cls: 'fx-reveal qp-reveal' });
      const target = action.target != null ? charEl(action.target) : null;
      const from = charEl(s.players[action.player].hero.uid);
      if (target && from) await fx.bolt(from, target, fx.factionColor(before.srcFaction));
      else {
        const field = app.querySelector(action.player === viewer ? '.board.me' : '.board.opp') ?? app.querySelector('.midline');
        if (field) {
          const flash = document.createElement('div');
          flash.className = 'qp-land';
          const r = field.getBoundingClientRect();
          Object.assign(flash.style, { left: `${r.left + r.width / 2}px`, top: `${r.top + r.height / 2}px` });
          fx.layer().appendChild(flash);
          await fx.animate(flash, [{ opacity: 0.9, transform: 'translate(-50%, -50%) scale(0.2)' }, { opacity: 0, transform: 'translate(-50%, -50%) scale(2.4)' }], { duration: 420, easing: 'ease-out' });
          flash.remove();
        }
      }
    } else if (playedCard) {
      sound.play(playedCard.type === 'minion' ? 'cardPlay' : playedCard.type === 'trap' ? 'trapSet' : 'spell');
      const hidden = playedCard.type === 'trap' && action.player !== viewer;
      if (action.player !== viewer && !hidden) await revealPlayed(playedCard.id);
      else if (meta.from && !meta.dropped && document.body.contains(meta.from)) {
        const target = playedCard.type === 'minion' ? app.querySelector('.board.me') : app.querySelector('.midline');
        if (target) await fx.fly(meta.from, meta.from.getBoundingClientRect(), target.getBoundingClientRect(), { duration: 260, fade: true, scale: 0.6 });
      }
      // A targeted spell flies at its target as a bolt in its faction's colour.
      if (playedCard.type === 'spell' && action.target != null && charEl(action.target)) {
        const from = action.type === 'heroSpell' ? app.querySelector(`[data-hs="${action.card}"]`) : charEl(s.players[action.player].hero.uid);
        await fx.bolt(from, charEl(action.target), fx.factionColor(before.srcFaction));
      }
    } else if (action.type === 'endTurn') {
      sound.play('click');
    }
  } catch { /* animation failures never block the game */ }

  // ---- Apply.
  const actorBefore = actingPlayer(s);
  try {
    applyAction(s, action);
  } catch (err) {
    animating = false;
    render();
    flash('That move is no longer possible.');
    if (meta.remote) onDesync();
    console.error(err);
    return;
  }
  if (game.mode === 'online') {
    // Send each local move; check the opponent's moves land on an identical game.
    if (!meta.remote) link.send({ t: 'act', action, h: net.stateHash(s) });
    else if (meta.h && meta.h !== net.stateHash(s)) onDesync();
  }
  if (entry) history.push(entry);
  recordStats(s, before, action, entry);
  for (const line of s.log.slice(before.logLen)) {
    const m = /^Trap revealed: (.+)!$/.exec(line.msg);
    if (m) {
      const card = allCards().find((c) => c.name === m[1]);
      if (card) history.push({ cardId: card.id, mine: s.players[viewer].graveyard.some((g) => g.cardId === card.id), icon: '!', text: `Trap revealed: ${card.name}!` });
    }
  }
  if (history.length > 40) history = history.slice(-40);
  if (game.mode === 'hotseat' && actingPlayer(s) !== actorBefore && !s.gameOver) handoff = true;
  render();

  // ---- After: consequences.
  try {
    await afterEffects(s, before, rects, oldMinions, action, lunged);
  } catch (err) { console.error(err); }
  animating = false;
  render();
  scheduleAI();
}

// Match statistics for the end-of-game summary.
function recordStats(s, before, action, entry) {
  const st = (game.stats ??= freshStats());
  if (action.type === 'play' || action.type === 'quickPlay') st.cardsPlayed[action.player]++;
  let dealt = 0;
  for (const [uid, prev] of before.health) {
    const c = findCharacter(s, uid);
    const owner = before.ctrl.get(uid);
    if (owner == null) continue;
    const now = c ? (c.kind === 'hero' ? c.health + c.armor : c.health) : 0;
    if (c?.kind === 'hero' && now < prev) st.heroDamage[1 - owner] += prev - now;
    if (c && now > prev) st.healing[owner] += now - prev;
    if (!c) st.kills[1 - owner]++;
    if (action.player != null && owner !== action.player && now < prev) dealt += prev - now;
    if (action.player != null && owner !== action.player && !c) dealt += 1;
  }
  if (entry && dealt > (st.bestPlay?.score ?? 0)) st.bestPlay = { score: dealt, text: youText(entry.text) };
}

// Keywords that appeared or disappeared on minions that are still alive.
// Taunt: the shield swings up from behind the minion, flashes, and slams into place.
function tauntIn(el) {
  return fx.animate(el, [
    { transform: 'translateY(25%) scale(0.2) rotateX(70deg)', opacity: 0, filter: 'brightness(3)' },
    { transform: 'translateY(-6%) scale(1.25) rotateX(0deg)', opacity: 1, filter: 'brightness(2.2)', offset: 0.55 },
    { transform: 'translateY(2%) scale(0.94)', filter: 'brightness(1.3)', offset: 0.78 },
    { transform: 'none', opacity: 1, filter: 'none' },
  ], { duration: 750, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'none' });
}

function keywordChanges(oldMinions) {
  const jobs = [];
  let shield = false;
  for (const el of app.querySelectorAll('[data-char][data-kw]')) {
    const old = oldMinions.get(Number(el.dataset.char));
    // A Taunt minion that just arrived: its shield rises around it.
    if (!old) {
      if (el.dataset.kw.split(' ').includes('taunt')) { jobs.push(tauntIn(el.querySelector('.m-shield'))); shield = true; }
      continue;
    }
    const was = new Set(old.kw);
    const now = new Set(el.dataset.kw.split(' ').filter(Boolean));
    const rect = el.getBoundingClientRect();
    for (const k of was) {
      if (now.has(k)) continue;
      if (k === 'evade') { shield = true; jobs.push(fx.shatter(rect, 'speed')); }
      else if (k === 'frozen') jobs.push(fx.shatter(rect, 'ice', 10));
      else if (k === 'taunt') jobs.push(fx.shatter(rect, 'stone', 10));
    }
    for (const k of now) {
      if (was.has(k)) continue;
      const layer = { taunt: '.m-shield', evade: '.m-speed', 'twin-strike': '.m-wind', frozen: '.m-ice', stealth: '.m-smoke', elusive: '.m-camo' }[k];
      const target = layer ? el.querySelector(layer) : el.querySelector('.m-art');
      if (k === 'frozen') sound.play('freeze');
      if (k === 'taunt') { jobs.push(tauntIn(target)); shield = true; continue; }
      jobs.push(fx.animate(target, [
        { transform: 'scale(1.5)', opacity: 0, filter: 'brightness(2.5)' },
        { transform: 'scale(1)', opacity: 1, filter: 'none' },
      ], { duration: 420, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'none' }));
    }
  }
  if (shield) sound.play('shield');
  return Promise.all(jobs);
}

async function afterEffects(s, before, rects, oldMinions, action, lunged) {
  const jobs = [];
  const newLog = s.log.slice(before.logLen).map((l) => l.msg);

  // Extinction: the doomed minions stay on screen while a meteor comes down on them;
  // only after the impact do they crack and fade (the deaths below).
  const extLine = newLog.find((l) => /^☄ EXTINCTION!/.test(l));
  const strikes = newLog.map((l) => /^A meteor strikes (.+)!$/.exec(l)?.[1]).filter(Boolean);
  if (extLine || strikes.length) {
    const held = [];
    for (const [uid, old] of oldMinions) {
      if (charEl(uid) || !before.factionOf.has(uid)) continue;
      const g = old.clone.cloneNode(true);
      g.classList.add('fx-ghost');
      Object.assign(g.style, { position: 'fixed', left: `${old.rect.left}px`, top: `${old.rect.top}px`, width: `${old.rect.width}px`, height: `${old.rect.height}px`, margin: '0', zIndex: '850', pointerEvents: 'none' });
      fx.layer().appendChild(g);
      held.push(g);
    }
    try {
      sound.play('rumble');
      if (extLine && !/Meteor Shower/.test(extLine)) {
        // Which side: the player named in the line ("You" is the viewer).
        const side = s.players.findIndex((p) => extLine.includes(`${p.name}'s Mana`));
        const boardEl = app.querySelector(side === viewer ? '.board.me' : '.board.opp');
        const r = boardEl?.getBoundingClientRect();
        if (r) { const impact = await fx.meteor(r, { big: true }); jobs.push(...impact); }
      } else if (extLine) {
        const r = app.querySelector('.midline')?.getBoundingClientRect() ?? app.getBoundingClientRect();
        jobs.push(...(await fx.meteor({ left: r.left + r.width / 2 - 40, top: r.top - 40, width: 80, height: 80 }, { big: true })));
      }
      // Each strike lands on the minion it destroyed (matched by card name, each victim once).
      const struck = new Set();
      for (const name of strikes) {
        const hit = [...oldMinions].find(([uid]) => !struck.has(uid) && !charEl(uid) && before.nameOfUid.get(uid) === name);
        if (!hit) continue;
        struck.add(hit[0]);
        jobs.push(...(await fx.meteor(hit[1].rect, { big: false })));
      }
      sound.play('bigHit');
    } catch { /* animation only */ }
    for (const g of held) g.remove();
  }

  // A cast Hero Spell flips face-down.
  if (action.type === 'heroSpell') {
    const flip = app.querySelector(`[data-hs="${action.card}"] .hs-flip`);
    if (flip) jobs.push(fx.animate(flip, [{ transform: 'rotateY(0deg) scale(1.15)' }, { transform: 'rotateY(180deg) scale(1)' }], { duration: 520, easing: 'ease-in-out', fill: 'none' }));
  }

  // Attacker snaps back from its lunge.
  if (lunged) jobs.push(fx.returnFromLunge(charEl(action.attacker), lunged));

  // Minions that died crack and fade where they stood. A minion killed in combat
  // instead gets the killer's finishing blow and shatters away from it.
  let died = false;
  let killed = false;
  const killerOf = (uid) => {
    if (action.type !== 'attack') return null;
    if (uid === action.defender) return action.attacker;
    if (uid === action.attacker) return action.defender;
    return null;
  };
  for (const [uid, old] of oldMinions) {
    if (charEl(uid) || !before.factionOf.has(uid)) {
      if (!charEl(uid)) { died = true; jobs.push(fx.deathGhost(old.clone, old.rect)); }
      continue;
    }
    died = true;
    const killer = killerOf(uid);
    if (killer != null) {
      killed = true;
      const killerFaction = before.factionOf.get(killer) ?? s.players.find((p) => p.hero.uid === killer)?.factions[0];
      const fromRect = rects.get(`c${killer}`) ?? oldMinions.get(killer)?.rect ?? null;
      const power = before.attack.get(killer) ?? 3;
      jobs.push(fx.killFx(old.rect, killerFaction, power, fromRect));
      jobs.push(fx.shatterCard(old.clone, old.rect, fromRect, fx.shatterModeFor(killerFaction)));
      fx.screenShake(app.querySelector('.arena') ?? app, Math.min(16, 5 + power * 1.4));
      fx.deathFx(old.rect, before.factionOf.get(uid));
    } else {
      jobs.push(fx.deathGhost(old.clone, old.rect));
      fx.deathFx(old.rect, before.factionOf.get(uid));
    }
  }
  if (killed) sound.play('bigHit');
  if (died) setTimeout(() => sound.play('death'), killed ? 180 : 120);

  // New minions drop in; moved ones glide (FLIP). Expensive ones make an entrance.
  let summoned = false;
  let bigEntrance = false;
  const moving = new Set();
  for (const el of app.querySelectorAll('.minion[data-char]')) {
    const key = `c${el.dataset.char}`;
    if (!rects.has(key)) {
      summoned = true;
      const m = findCharacter(s, Number(el.dataset.char));
      const card = m && getCard(m.cardId);
      if (card && card.cost >= 7) { bigEntrance = true; jobs.push(fx.entrance(el, esc(card.name), card.faction)); }
      else { fx.burst(el.getBoundingClientRect(), 'summon'); jobs.push(fx.summonIn(el)); }
    }
    else if (Number(el.dataset.char) !== action.attacker) moving.add(key);
  }
  if (summoned) sound.play(bigEntrance ? 'bigHit' : 'minionLand');
  if (bigEntrance) jobs.push(fx.screenShake(app.querySelector('.arena') ?? app, 10));
  jobs.push(fx.flip(app, rects, moving));

  // Damage and healing numbers.
  let hurt = false;
  let healed = false;
  let biggest = 0;
  for (const pl of s.players) {
    for (const c of [pl.hero, ...pl.board]) {
      const prev = before.health.get(c.uid);
      if (prev == null) continue;
      const now = c.kind === 'hero' ? c.health + c.armor : c.health;
      const delta = now - prev;
      const el = charEl(c.uid);
      if (!delta || !el) continue;
      const r = el.getBoundingClientRect();
      fx.floater(r, delta > 0 ? `+${delta}` : `${delta}`, delta > 0 ? 'heal' : 'damage');
      if (delta < 0) {
        // Bigger hits shake harder and throw more debris.
        hurt = true;
        biggest = Math.max(biggest, -delta + (c.kind === 'hero' ? 1 : 0));
        jobs.push(fx.shake(el, 4 + -delta * 1.5));
        if (c.kind === 'hero') jobs.push(fx.heroHit(el.querySelector('.portrait-img') ?? el));
        // In a fight, each side is hit in the style of whoever struck it (the defender strikes back too).
        let striker = null;
        if (action.type === 'attack' && c.uid === action.defender) striker = action.attacker;
        if (action.type === 'attack' && c.uid === action.attacker) striker = action.defender;
        const hitFaction = striker == null ? before.srcFaction
          : before.factionOf.get(striker) ?? s.players.find((p) => p.hero.uid === striker)?.factions[0] ?? before.srcFaction;
        jobs.push(fx.particles(r, hitFaction, -delta));
        if (striker != null) jobs.push(fx.hitFx(r, hitFaction, -delta, rects.get(`c${striker}`) ?? null));
      } else { healed = true; fx.burst(r, 'heal'); jobs.push(fx.sparkles(r, 'heal')); }
    }
  }
  // Attack that went up: the gem flashes and gold sparkles rise.
  for (const pl of s.players) {
    for (const c of [pl.hero, ...pl.board]) {
      const prev = before.attack.get(c.uid);
      if (prev == null || effectiveAttack(c) <= prev) continue;
      const el = charEl(c.uid);
      if (!el) continue;
      jobs.push(fx.pulseGem(el.querySelector('.atk')));
      jobs.push(fx.sparkles(el.getBoundingClientRect(), 'buff', 7));
    }
  }
  // A spell that hit three or more characters sweeps a shockwave across the board.
  const hitCount = [...before.health].filter(([uid, prev]) => {
    const c = findCharacter(s, uid);
    return !c || (c.kind === 'hero' ? c.health + c.armor : c.health) < prev;
  }).length;
  const castCard = (action.type === 'play' || action.type === 'quickPlay' || action.type === 'heroSpell') && before.castType;
  if (castCard === 'spell' && hitCount >= 3) {
    const area = app.querySelector('.midline') ?? app.querySelector('.arena');
    const r = area.getBoundingClientRect();
    jobs.push(fx.shockwave({ left: r.left, top: r.top - r.width * 0.2, width: r.width, height: r.width * 0.4 }, fx.factionColor(before.srcFaction)));
  }
  if (hurt) sound.play(biggest >= 5 ? 'bigHit' : 'hit');
  if (biggest >= 5) jobs.push(fx.screenShake(app.querySelector('.arena') ?? app, Math.min(4 + biggest * 1.5, 20)));
  if (healed) setTimeout(() => sound.play('heal'), 150);
  jobs.push(keywordChanges(oldMinions));

  // Dropping to 10 Health or less: a heartbeat (the screen edges pulse red while low).
  if (before.myHealth > 10 && s.players[viewer].hero.health <= 10 && !s.gameOver) sound.play('heartbeat');

  // Your Fusion just became ready: make it impossible to miss.
  const fusionNow = s.players[viewer].fusion?.charge ?? 0;
  if (before.fusionCharge < 3 && fusionNow >= 3 && !s.gameOver) {
    sound.play('versus');
    flash(`Fusion ready: ${getCard(s.players[viewer].fusion.cardId).name}`);
    const btn = app.querySelector('.hero-zone.me .fusion-spell');
    if (btn) jobs.push(fx.animate(btn, [{ transform: 'scale(1)', filter: 'brightness(1)' }, { transform: 'scale(1.15)', filter: 'brightness(1.6)', offset: 0.4 }, { transform: 'scale(1)', filter: 'brightness(1)' }], { duration: 900, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'none' }));
  }

  // Cards drawn fly in from the deck pile.
  const pile = app.querySelector('.deck-pile.me');
  let drew = false;
  for (const el of app.querySelectorAll('.my-hand [data-hand]')) {
    if (before.hand.has(Number(el.dataset.hand)) || !pile) continue;
    drew = true;
    el.style.visibility = 'hidden';
    jobs.push(fx.drawFlip(el, pile.getBoundingClientRect(), el.getBoundingClientRect(), backArtOf(s.players[viewer].factions[0])).then(() => { el.style.visibility = ''; }));
  }
  if (drew) sound.play('draw');
  // The opponent's new cards: a glowing card back flies into their hand, and a label says so.
  const opp = s.players[1 - viewer];
  const gained = opp.hand.length - before.oppHand;
  if (gained > 0 && !s.gameOver) {
    const fromDeck = Math.max(0, before.oppDeck - opp.deck.length);
    const backs = [...app.querySelectorAll('.opp-hand .card.back')].slice(-gained);
    const oppPile = app.querySelector('.deck-pile.opp')?.getBoundingClientRect();
    const mid = { left: window.innerWidth / 2 - 40, top: window.innerHeight * 0.42, width: 80, height: 110 };
    backs.forEach((el, i) => {
      el.classList.add('new-card');
      const to = el.getBoundingClientRect();
      el.style.visibility = 'hidden';
      jobs.push(fx.oppDraw(el, i < fromDeck && oppPile ? oppPile : mid, to, i * 160).then(() => { el.style.visibility = ''; }));
    });
    sound.play('draw');
    const handBox = app.querySelector('.opp-hand')?.getBoundingClientRect();
    const drewN = Math.min(gained, fromDeck);
    const label = drewN === gained
      ? `${opp.name} drew ${gained === 1 ? 'a card' : `${gained} cards`}`
      : `${opp.name} got ${gained === 1 ? 'a card' : `${gained} cards`}`;
    if (handBox) fx.floatLabel(label, handBox.left + handBox.width / 2, handBox.bottom + 40, 'opp-draw');
  }
  // A card drawn into a full hand burns.
  const meName = s.players[viewer].name;
  for (const line of newLog) {
    const lead = `${meName}'s hand is full; `;
    const b = line.startsWith(lead) && line.endsWith(' is burned.') ? [line, line.slice(lead.length, -' is burned.'.length)] : null;
    const card = b && allCards().find((c) => c.name === b[1]);
    if (card) { sound.play('death'); jobs.push(fx.burnCard(bigCardHTML(card), pile?.getBoundingClientRect())); }
  }

  // New Mana Crystals pop in.
  const me = s.players[viewer];
  if (me.mana.max > before.mana.max) {
    sound.play('mana');
    for (const el of app.querySelectorAll('.mana-bar.me .crystal')) {
      const i = Number(el.dataset.crystal);
      if (i >= before.mana.max && i < me.mana.max) {
        jobs.push(fx.animate(el, [{ transform: 'rotate(45deg) scale(0)', filter: 'brightness(3)' }, { transform: 'rotate(45deg) scale(1.4)', offset: 0.6 }, { transform: 'rotate(45deg) scale(1)', filter: 'none' }], { duration: 500, delay: (i - before.mana.max) * 80 }));
      }
    }
  }

  // Spent Mana: those crystals flash out.
  if (s.turn === before.turn && me.mana.current < before.mana.current) {
    for (const el of app.querySelectorAll('.mana-bar.me .crystal')) {
      const i = Number(el.dataset.crystal);
      if (i >= me.mana.current && i < before.mana.current) {
        jobs.push(fx.animate(el, [{ filter: 'brightness(3)', transform: 'rotate(45deg) scale(1.5)' }, { filter: 'none', transform: 'rotate(45deg) scale(1)' }], { duration: 380, delay: (before.mana.current - 1 - i) * 50, fill: 'none' }));
      }
    }
  }
  // Your turn starts: the crystals refill one after another.
  if (s.activePlayer === viewer && (s.activePlayer !== before.active || s.turn !== before.turn)) {
    for (const el of app.querySelectorAll('.mana-bar.me .crystal.full, .mana-bar.me .crystal.bonus')) {
      const i = Number(el.dataset.crystal);
      jobs.push(fx.animate(el, [{ filter: 'brightness(0.3) saturate(0)' }, { filter: 'brightness(2.4)', offset: 0.5 }, { filter: 'none' }], { duration: 420, delay: i * 60, fill: 'none' }));
    }
  }

  // Mushrooms (Fungus): placed ones hop into the deck; bursting ones fly out and explode on the Hero.
  for (const line of newLog) {
    const placed = /^🍄 (\d+) Mushrooms? placed in (.+)'s deck\.$/.exec(line);
    const sprout = /^🍄 (\d+) Mushrooms? sprouts? on the card (.+) drew\.$/.exec(line);
    const burst = /^🍄 (\d+) Mushrooms? burst from (.+)'s card!$/.exec(line);
    const m = placed ?? sprout ?? burst;
    if (!m) continue;
    const pl = s.players.find((x) => x.name === m[2]);
    if (!pl) continue;
    const side = pl.index === viewer ? 'me' : 'opp';
    const pile = app.querySelector(`.deck-pile.${side}`);
    if (burst) {
      sound.play('mushroom');
      jobs.push(fx.mushroomBurst(pile, charEl(pl.hero.uid), Number(m[1])));
    } else {
      // From the Fungus player (the deck owner's opponent) into the deck, or onto the hand for a freshly drawn card.
      const caster = charEl(s.players[1 - pl.index].hero.uid)?.getBoundingClientRect();
      const target = sprout ? (app.querySelector(side === 'me' ? '.my-hand' : '.opp-hand') ?? pile) : pile;
      jobs.push(fx.mushroomsToDeck(caster, target, Number(m[1])));
    }
  }

  // Big moments.
  if (newLog.some((m) => m.includes('EXTINCTION'))) {
    sound.play('extinction');
    fx.flashScreen('#ff7a3a');
    jobs.push(fx.screenShake(app.querySelector('.arena') ?? app, 16));
    jobs.push(fx.banner('☄ EXTINCTION', 'extinction'));
  }
  // A Trap that goes off is shown full size (one after another if several fire).
  const traps = newLog.map((m) => /^Trap revealed: (.+)!$/.exec(m)?.[1]).filter(Boolean)
    .map((name) => allCards().find((c) => c.name === name)).filter(Boolean);
  if (traps.length) {
    sound.play('trapReveal');
    jobs.push((async () => {
      for (const card of traps) await revealPlayed(card.id, { label: 'Trap activated!', duration: 3000, cls: 'fx-trap-card' });
    })());
  }

  await Promise.all(jobs);

  if (s.gameOver) {
    if (!heroesShattered) {
      const losers = s.players.filter((pl) => s.winner == null || pl.index !== s.winner);
      sound.play('heroExplode');
      await Promise.all(losers.map((pl) => fx.heroExplode(charEl(pl.hero.uid))));
      heroesShattered = true;
    }
    sound.play(s.winner === viewer ? 'victory' : 'defeat');
    if (game.mode === 'ai' && s.winner === viewer) setTimeout(() => sayEmote(1 - viewer, 'wellPlayed'), 600);
  } else if (s.activePlayer !== before.active || s.turn !== before.turn) {
    const mine = s.activePlayer === viewer || game.mode === 'hotseat';
    sound.play(mine ? 'turnStart' : 'click');
    await fx.banner(mine && game.mode !== 'hotseat' ? 'Your turn' : `${esc(s.players[s.activePlayer].name)}'s turn`, mine ? 'yours' : 'theirs');
  }
}

// "Why can't I do that?": a shake, a buzz and a short reason.
function deny(el, kind, uid) {
  const s = game?.state;
  if (!s) return;
  const pl = s.players[viewer];
  let msg = "You can't do that right now";
  if (kind === 'turn') msg = "It's not your turn";
  if (kind === 'card') {
    const inst = pl.hand.find((c) => c.uid === uid);
    const card = inst && getCard(inst.cardId);
    if (!card) return;
    if (costOf(s, inst) > pl.mana.current) msg = 'Not enough Mana';
    else if (costOf(s, inst) > manaFor(pl, card)) msg = 'Primal Mana only pays for Dinosaur cards';
    else if (card.type === 'minion' && pl.board.length >= s.rules.maxBoardSize) msg = 'Your board is full';
    else if (card.type === 'trap' && pl.traps.length >= s.rules.maxTraps) msg = "You can't set more Traps";
    else if (card.requiresCorpses && (pl.corpses ?? 0) < card.requiresCorpses) msg = `Needs ${card.requiresCorpses} Corpse${card.requiresCorpses === 1 ? '' : 's'}`;
    else msg = 'No valid target';
  }
  if (kind === 'attack') {
    const m = findCharacter(s, uid);
    if (!m) return;
    if (hasKeyword(m, 'Frozen')) msg = 'This minion is Frozen';
    else if (effectiveAttack(m) <= 0) msg = 'This minion has no Attack';
    else if (m.cantAttackThisTurn) msg = "It can't attack this turn";
    else if (m.attacksThisTurn > 0) msg = 'This minion already attacked';
    else if (m.sick) msg = 'This minion just arrived';
    else msg = 'Nothing to attack';
  }
  sound.play('deny');
  fx.shake(el, 6);
  flash(msg);
}

// Loading screen: a tip while the board, portraits and card art load.
const TIPS = [
  'Drag a minion between two others to choose exactly where it lands.',
  'Cards with ⚡ can be played on your opponent\'s turn, right after they act.',
  'Hover any minion or card to see it full size.',
  'Right-click your hero to send an emote.',
  'Dinosaurs: every 7 turns, Extinction wipes your board, but Eggs hatch when they die.',
  'Fungus: a Mushroom deals 1 damage to its owner when their card is drawn.',
  'Zombies: every friendly Zombie that dies leaves a Corpse for later.',
  'Dragons: Burn grows every turn. Put it on the enemy Hero early and let it climb.',
  'Demons: Infernal Summoning costs more Health each time, and its Demons get bigger. Know when to stop.',
  'Divine: healing a character at full Health raises its maximum Health (Overheal).',
  'Robots: Upgrades stack on one machine. Build one great Robot, or a swarm of Drones.',
  'Bees: protect the Hive. When it falls, the Queen emerges, and if she dies your Hero takes 10 damage.',
  'Radioactive: an irradiated minion lowers the Health of everything else without Radiation, on both sides.',
  "Characters losing Health to Radiation can't be healed. Obliterated minions skip their Exit effects.",
  'Robots hold one Weapon at a time; equipping a new one replaces the old.',
  'Divine cards deal extra damage to Dark and Undead minions: Vampires, Zombies and Demons.',
  'Going second, you choose a Mana Potion or a Health Potion.',
  'Traps stay hidden until their condition happens. Watch the ? tokens.',
];
async function showLoader() {
  const s = game.state;
  const el = document.createElement('div');
  el.className = 'loader';
  el.innerHTML = `<div class="loader-box"><img class="loader-logo" src="art/ui/logo.png" alt="Shattered Realms"><div class="loader-sigil"></div>
    <p class="loader-tip">${esc(TIPS[Math.floor(Math.random() * TIPS.length)])}</p><div class="loader-bar"><i></i></div></div>`;
  fx.layer().appendChild(el);
  const urls = new Set();
  for (const pl of s.players) {
    const hero = heroArtOf(pl.factions[0]);
    if (hero) urls.add(hero);
    for (const c of [...pl.deck, ...pl.hand]) if (ART[c.cardId]) urls.add(ART[c.cardId]);
  }
  const board = boardArtFor(s.players[viewer].factions[0]);
  if (board) urls.add(board);
  const list = [...urls];
  let done = 0;
  const bar = el.querySelector('.loader-bar i');
  const load = (u) => new Promise((res) => { const i = new Image(); i.onload = i.onerror = () => { done++; bar.style.width = `${(100 * done) / list.length}%`; res(); }; i.src = u; });
  // At least a moment to read the tip; never more than 4 seconds.
  await Promise.all([Promise.race([Promise.all(list.map(load)), fx.wait(4000)]), fx.wait(1100)]);
  bar.style.width = '100%';
  await fx.animate(el, [{ opacity: 1 }, { opacity: 0 }], { duration: 300 });
  el.remove();
}

// Concede: the conceding player's hero explodes and the match ends.
async function concede(remoteLoser = null) {
  const s = game.state;
  if (s.gameOver) return;
  clearTimeout(aiTimer);
  drag.cancel();
  const loser = remoteLoser ?? (game.mode !== 'hotseat' ? viewer : actingPlayer(s));
  if (game.mode === 'online' && remoteLoser == null) link.send({ t: 'concede' });
  s.gameOver = true;
  s.winner = 1 - loser;
  s.pending = null;
  s.queue = [];
  s.log.push({ turn: s.turn, msg: `${s.players[loser].name} concedes.` });
  heroesShattered = false;
  animating = true;
  render();
  sound.play('heroExplode');
  try { await fx.heroExplode(charEl(s.players[loser].hero.uid)); } catch { /* animation only */ }
  heroesShattered = true;
  animating = false;
  sound.play(s.winner === viewer ? 'victory' : 'defeat');
  render();
}

function scheduleAI() {
  clearTimeout(aiTimer);
  const s = game?.state;
  if (game?.mode === 'online') return drainRemote();
  if (!s || s.gameOver || screen !== 'game' || animating || !isAI(actingPlayer(s))) return;
  aiTimer = setTimeout(() => act(chooseAction(s, game.difficulty ?? 'medium')), (s.pending?.type === 'reaction' ? 600 : 450) * fx.speedFactor());
}

// ---- Online play (room codes, see net.js) ----------------------------------------

const PROTOCOL = 1;
let lobby = null;          // { status: 'choose' | 'hosting' | 'joining' | 'error', code?, msg? }
let remoteQueue = [];      // opponent moves waiting for the current animation to finish

let link = net;            // the online connection in use: net (room codes) or srv (account server)
let acct = { tab: 'login', status: 'idle', msg: null }; // sign-in form state
let queueTicker = null;

function leaveOnline() {
  if (link === srv) {
    // Leaving a running server game gives up the match (the opponent isn't left waiting).
    if (game?.mode === 'online' && screen === 'game' && !game.state.gameOver) srv.send({ t: 'concede' });
    srv.leave();
  } else net.leave();
  link = net;
  remoteQueue = [];
  lobby = null;
  stopQueueTicker();
  // Off the online screens, drop the server connection (signing in resumes it next time).
  srv.disconnect();
}

function stopQueueTicker() { clearInterval(queueTicker); queueTicker = null; }

const MODE_NAMES = { quick: 'Quick match', ranked: 'Ranked match', private: 'Private match' };
const fmtWait = (ms) => { const t = Math.floor(ms / 1000); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };

function accountHTML() {
  const u = srv.user;
  if (u) {
    return `<div class="acct-card">
      <div class="acct-who"><b>${esc(u.name)}</b> ${rankBadgeHTML(u)} ${rankProgressHTML(u)}${u.place ? ` <span class="sub">#${u.place}</span>` : ''}</div>
      <div class="sub">Ranked ${u.rankedWins}–${u.rankedLosses} · All games ${u.wins}–${u.losses}</div>
      <div class="acct-links"><button data-act="leaderboard" class="ghost">🏆 Leaderboard</button><button data-act="signOut" class="ghost">Sign out</button><button data-act="deleteAccount" class="ghost danger-link">Delete account</button></div>
    </div>
    <div class="lobby-choices modes">
      <div class="lobby-box mode-card"><div class="mode-icon">⚡</div><h3>Quick Match</h3><p class="sub">Play anyone who's online. Your rank doesn't change.</p><button data-act="quickMatch">Find a game</button></div>
      <div class="lobby-box mode-card ranked"><div class="mode-icon">🏆</div><h3>Ranked</h3><p class="sub">Climb from Iron 5 to Legendary, with promotion series between tiers.</p><button data-act="rankedMatch">Play ranked</button></div>
      <div class="lobby-box mode-card"><div class="mode-icon">🤝</div><h3>Private Match</h3><p class="sub">Type your friend's name. You're matched when they type yours.</p>
        <input id="friend-input" class="text-input" maxlength="16" placeholder="Friend's name" autocomplete="off" spellcheck="false">
        <button data-act="privateMatch">Play friend</button></div>
    </div>`;
  }
  const down = acct.status === 'error' || acct.status === 'down';
  const busy = acct.status === 'connecting';
  const reg = acct.tab === 'register';
  return `<div class="acct-form">
      <div class="acct-tabs"><button data-act="acctLogin" class="${reg ? 'ghost' : 'on'}">Sign in</button><button data-act="acctRegister" class="${reg ? 'on' : 'ghost'}">Create account</button></div>
      <input id="acct-name" class="text-input" maxlength="16" placeholder="Name" autocomplete="username" spellcheck="false" autocapitalize="off">
      <input id="acct-pass" class="text-input" type="password" maxlength="128" placeholder="Password" autocomplete="${reg ? 'new-password' : 'current-password'}">
      ${reg ? '<p class="sub">Names are 3-16 letters, numbers or _. Passwords need 8+ characters.</p>' : ''}
      ${acct.msg ? `<p class="lobby-error">${esc(acct.msg)}</p>` : ''}
      ${down && !acct.msg ? '<p class="lobby-error">Can\'t reach the game server right now. You can still play a friend with a room code below.</p>' : ''}
      <button data-act="${reg ? 'signUp' : 'signIn'}" ${busy ? 'disabled' : ''}>${busy ? 'Connecting…' : reg ? 'Create account' : 'Sign in'}</button>
    </div>`;
}

function roomCodeHTML() {
  return `<details class="room-codes" ${srv.user ? '' : 'open'}><summary>Play a friend with a room code (no account needed)</summary>
    <div class="lobby-choices">
      <div class="lobby-box"><h3>Host a game</h3><p class="sub">Get a code to share with a friend.</p><button data-act="hostOnline">Host</button></div>
      <div class="lobby-box"><h3>Join a game</h3><p class="sub">Enter your friend's code.</p>
        <input id="room-input" class="room-input" maxlength="${net.CODE_LENGTH + 2}" placeholder="CODE" autocomplete="off" autocapitalize="characters" spellcheck="false">
        <button data-act="joinOnline">Join</button></div>
    </div></details>`;
}

function leaderboardHTML(rows) {
  if (!rows.length) return '<p class="sub">No ranked games yet. Be the first!</p>';
  const me = srv.user?.name;
  return `<table class="leaderboard"><tr><th>#</th><th>Player</th><th>Rank</th><th>Progress</th><th>W–L</th></tr>
    ${rows.map((r) => `<tr class="${r.name === me ? 'me' : ''}"><td>${r.place}</td><td>${esc(r.name)}</td><td>${rankBadgeHTML(r)}</td><td>${rankProgressHTML(r)}</td><td>${r.wins}–${r.losses}</td></tr>`).join('')}</table>`;
}

function renderLobby() {
  const st = lobby ?? { status: 'choose' };
  if (st.status !== 'queued') stopQueueTicker();
  const body = st.status === 'queued'
    ? `<div class="queue-box">
        <h3>${esc(MODE_NAMES[st.mode] ?? 'Match')}</h3>
        <p class="lobby-wait">${st.mode === 'private' ? `Waiting for <b>${esc(st.friend)}</b> to type your name (<b>${esc(srv.user?.name ?? '')}</b>)…` : 'Looking for an opponent…'}</p>
        <div class="queue-time">${fmtWait(Date.now() - st.since)}</div>
        <button data-act="cancelQueue" class="ghost">Cancel</button>
      </div>`
    : st.status === 'delete'
      ? `<div class="queue-box delete-box"><h3>Delete your account?</h3>
          <p class="sub">This permanently deletes <b>${esc(srv.user?.name ?? '')}</b>, your rank and your sign-ins. It can't be undone.</p>
          <input id="delete-pass" class="text-input" type="password" placeholder="Your password" autocomplete="current-password">
          <p><button data-act="deleteConfirm" class="danger">Delete forever</button> <button data-act="lobbyBack" class="ghost">Keep my account</button></p></div>`
    : st.status === 'leaderboard'
      ? `<h3>🏆 Leaderboard</h3>${leaderboardHTML(st.rows)}<p><button data-act="lobbyBack" class="ghost">← Back</button></p>`
    : st.status === 'hosting'
    ? (st.code
      ? `<p>Your room code:</p><div class="room-code">${esc(st.code)}</div><p class="sub">Send this code to your friend. The game starts when they join.</p><p class="lobby-wait">Waiting for your opponent…</p>`
      : '<p class="lobby-wait">Creating a room…</p>')
    : st.status === 'joining'
      ? `<p class="lobby-wait">Joining ${esc(st.code)}…</p>`
      : `${accountHTML()}${roomCodeHTML()}`;
  showMenuBackdrop(true);
  const heroes = picked.map((f) => {
    const art = heroArtOf(f);
    return `<span class="lobby-hero f-${f.toLowerCase()}" title="${esc(f)}">${art ? `<img src="${art}" alt="">` : `<b>${FACTION_ICONS[f] ?? '✦'}</b>`}</span>`;
  }).join('');
  app.innerHTML = `
    <div class="menu tavern title-screen lobby">
      <header class="ts-title">
        <div class="ts-runes"></div>
        <div class="tavern-sign"><h1>Play Online</h1></div>
        <p class="ts-tag">Test your realms against the world.</p>
      </header>
      <div class="lobby-deck">${heroes}<div><b>${esc(picked.join(' + '))}</b><span class="sub">${format === 'single' ? 'One faction' : 'Two factions'} · your opponent uses the same format</span></div></div>
      ${st.msg ? `<p class="lobby-error">${esc(st.msg)}</p>` : ''}
      <section class="ts-panel lobby-panel">${body}</section>
      <nav class="ts-actions"><div class="ts-row small"><button data-act="menu" class="ghost">← Main menu</button></div></nav>
    </div>`;
  app.querySelector('#room-input')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') joinOnline(); });
  app.querySelector('#friend-input')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') queueMatch('private'); });
  app.querySelector('#acct-pass')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') submitAccount(); });
  if (st.status === 'queued' && !queueTicker) {
    queueTicker = setInterval(() => {
      const el = app.querySelector('.queue-time');
      if (!el || lobby?.status !== 'queued') return stopQueueTicker();
      el.textContent = fmtWait(Date.now() - lobby.since);
    }, 1000);
  }
}

function lobbyError(msg) {
  net.leave();
  if (screen === 'game' && game?.mode === 'online') { flash(msg); return; }
  lobby = { status: 'error', msg };
  if (screen === 'online') render();
}

function netHandlers(role) {
  net.on({
    code: (code) => { lobby = { status: 'hosting', code }; if (screen === 'online') render(); },
    open: () => {
      if (role === 'guest') net.send({ t: 'hello', v: PROTOCOL, format, factions: picked, deck: deckFor(picked, true) });
    },
    data: (msg) => onNetMessage(role, msg),
    close: () => {
      if (screen === 'game' && game?.mode === 'online' && !game.state.gameOver) {
        // The opponent closed the tab or lost connection: the game ends in your favour.
        flash('Your opponent left the game.');
        remoteQueue = [];
        const s = game.state;
        s.gameOver = true; s.winner = viewer; s.pending = null; s.queue = [];
        s.log.push({ turn: s.turn, msg: 'Your opponent disconnected.' });
        animating = false;
        render();
      } else if (screen === 'online') lobbyError('The connection closed.');
    },
    error: (msg) => lobbyError(msg),
  });
}

async function hostOnline() {
  lobby = { status: 'hosting' };
  render();
  netHandlers('host');
  try { await net.host(); } catch (err) { lobbyError(err.message); }
}

async function joinOnline() {
  const code = net.cleanCode(app.querySelector('#room-input')?.value);
  if (code.length !== net.CODE_LENGTH) { flash(`Codes are ${net.CODE_LENGTH} characters.`); return; }
  lobby = { status: 'joining', code };
  render();
  netHandlers('guest');
  try { await net.join(code); } catch (err) { lobbyError(err.message); }
}

// Both copies of the game hold the same state; each side calls its own player "You".
function nameSeats(s, mySeat, theirName = game?.online?.opponent?.name ?? 'Opponent') {
  s.players[mySeat].name = 'You';
  s.players[1 - mySeat].name = theirName;
}

function beginOnline(state, mySeat, myFactions, theirFactions, online = null) {
  nameSeats(state, mySeat, online?.opponent?.name ?? 'Opponent');
  game = { state, mode: 'online', factions: myFactions, rivalFactions: theirFactions, human: mySeat, format, stats: freshStats(), online };
  remoteQueue = [];
  enterGame(true);
}

function onNetMessage(role, msg) {
  if (!msg || typeof msg !== 'object') return;
  switch (msg.t) {
    case 'hello': {
      if (role !== 'host' || (game?.mode === 'online' && screen === 'game')) return;
      if (msg.v !== PROTOCOL) { net.send({ t: 'reject', msg: 'You have a different version of the game. Refresh the page and try again.' }); return; }
      if (msg.format !== format) {
        net.send({ t: 'reject', msg: `The host is playing ${format === 'single' ? 'One faction' : 'Two factions'}. Switch to that format and join again.` });
        return;
      }
      const entry = checkDeck({ format: msg.format, factions: msg.factions, deck: msg.deck });
      if (entry.error) { net.send({ t: 'reject', msg: "The host couldn't load your deck. Reset it to the standard deck and try again." }); return; }
      // The host builds the game (including the coin flip) and sends it once.
      const hostSeat = Math.random() < 0.5 ? 0 : 1;
      const me = { name: 'Host', factions: picked, deck: deckFor(picked, true) };
      const them = { name: 'Guest', factions: entry.factions, deck: entry.deck };
      let state;
      try {
        state = createGame({ seed: (Math.random() * 2 ** 31) | 0, players: hostSeat === 0 ? [me, them] : [them, me] });
      } catch (err) {
        console.error(err);
        net.send({ t: 'reject', msg: "The host couldn't load your deck." });
        return;
      }
      net.send({ t: 'start', state: JSON.parse(JSON.stringify(state)), seat: 1 - hostSeat, factions: picked });
      beginOnline(state, hostSeat, picked, msg.factions);
      return;
    }
    case 'start':
      if (role !== 'guest') return;
      if (msg.seat !== 0 && msg.seat !== 1) return;
      beginOnline(cleanIncoming(msg.state), msg.seat, picked, cleanIncoming(msg.factions));
      return;
    case 'reject':
      lobbyError(msg.msg);
      return;
    case 'act':
      remoteQueue.push(msg);
      drainRemote();
      return;
    case 'emote':
      if (screen === 'game' && game) sayEmote(1 - viewer, msg.kind);
      return;
    case 'concede':
      if (screen === 'game' && game && !game.state.gameOver) concede(1 - viewer);
      return;
    case 'needSync':
      if (role === 'host' && game) net.send({ t: 'sync', state: JSON.parse(JSON.stringify(game.state)) });
      return;
    case 'sync':
      if (role !== 'guest' || !game) return;
      msg.state = cleanIncoming(msg.state);
      nameSeats(msg.state, humanSeat());
      game.state = msg.state;
      restoreCustomCards(game.state);
      remoteQueue = [];
      animating = false;
      render();
      return;
  }
}

// ---- Account server (accounts, matchmaking, ranked; see server-link.js) ----

function serverHandlers() {
  srv.on({
    status: (st) => {
      acct.status = st;
      if (st === 'open') acct.msg = null;
      if (st === 'down' && screen === 'game' && game?.mode === 'online' && link === srv && !game.state.gameOver) flash('Connection lost. Reconnecting…');
      if (st === 'down' && lobby?.status === 'queued') lobby = { status: 'choose', msg: 'Lost the connection to the server.' };
      if (screen === 'online') render();
    },
    error: (msg) => { acct.status = 'error'; acct.msg = msg; if (screen === 'online') render(); },
    data: onServerMessage,
  });
}

function connectServer() {
  serverHandlers();
  srv.connect();
}

function submitAccount() {
  const name = app.querySelector('#acct-name')?.value.trim() ?? '';
  const pass = app.querySelector('#acct-pass')?.value ?? '';
  if (!/^[A-Za-z0-9_]{3,16}$/.test(name)) { acct.msg = 'Names are 3-16 letters, numbers or _.'; return render(); }
  if (acct.tab === 'register' ? pass.length < 8 : !pass) { acct.msg = acct.tab === 'register' ? 'Passwords need at least 8 characters.' : 'Type your password.'; return render(); }
  acct.msg = null;
  connectServer();
  if (acct.tab === 'register') srv.register(name, pass); else srv.login(name, pass);
}

function queueMatch(mode) {
  if (!srv.user) return flash('Sign in first.');
  const friend = mode === 'private' ? app.querySelector('#friend-input')?.value.trim() : undefined;
  if (mode === 'private' && !friend) return flash("Type your friend's name.");
  link = srv;
  srv.send({ t: 'queue', mode, friend, format, factions: picked, deck: deckFor(picked, true) });
}

function applySync(state) {
  nameSeats(state, humanSeat());
  game.state = state;
  restoreCustomCards(game.state);
  remoteQueue = [];
  animating = false;
  drag.cancel();
  render();
}

function onServerMessage(msg) {
  if (!msg || typeof msg !== 'object') return;
  msg = cleanIncoming(msg);
  const inServerGame = screen === 'game' && game?.mode === 'online' && link === srv;
  switch (msg.t) {
    case 'accountDeleted':
      lobby = { status: 'choose' };
      flash('Your account was deleted.');
      if (screen === 'online') render();
      return;
    case 'welcome': case 'me': case 'loggedOut':
      acct.msg = null;
      if (screen === 'online') render();
      return;
    case 'authError':
      acct.msg = msg.msg;
      if (screen === 'online') render();
      return;
    case 'replaced':
      flash(msg.msg);
      if (screen === 'online') { lobby = { status: 'choose' }; render(); }
      return;
    case 'queued':
      lobby = { status: 'queued', mode: msg.mode, friend: msg.friend, since: Date.now() };
      if (screen === 'online') render();
      return;
    case 'cancelled':
      if (lobby?.status === 'queued') { lobby = { status: 'choose' }; if (screen === 'online') render(); }
      return;
    case 'reject':
      if (inServerGame) { flash(msg.msg); return; }
      lobby = { status: 'choose', msg: msg.msg };
      if (screen === 'online') render();
      return;
    case 'notice':
      flash(msg.msg);
      return;
    case 'leaderboard':
      if (screen !== 'online') return;
      lobby = { status: 'leaderboard', rows: msg.rows };
      return render();
    case 'start': {
      const online = { server: true, mode: msg.mode, opponent: msg.opponent, you: msg.you };
      if (msg.resume && inServerGame) { game.online = online; applySync(msg.state); flash('Reconnected.'); return; }
      link = srv;
      stopQueueTicker();
      lobby = null;
      if (msg.format === 'single' || msg.format === 'pair') format = msg.format;
      restoreCustomCards(msg.state);
      sound.play('quickPlay');
      beginOnline(msg.state, msg.seat, msg.factions, msg.theirFactions, online);
      flash(msg.resume ? 'Back in your game.' : `${MODE_NAMES[msg.mode] ?? 'Match'} vs ${msg.opponent.name} (${msg.opponent.label})`);
      return;
    }
    case 'act':
      if (!inServerGame) return;
      remoteQueue.push(msg);
      drainRemote();
      return;
    case 'sync':
      if (inServerGame) applySync(msg.state);
      return;
    case 'emote':
      if (inServerGame) sayEmote(1 - viewer, msg.kind);
      return;
    case 'concede':
      if (inServerGame && !game.state.gameOver) concede(1 - viewer);
      return;
    case 'oppAway':
      if (inServerGame) flash(`Your opponent disconnected. They have ${msg.seconds} seconds to come back.`);
      return;
    case 'oppBack':
      if (inServerGame) flash('Your opponent is back.');
      return;
    case 'result': {
      if (!inServerGame) return;
      game.result = msg;
      const s = game.state;
      if (!s.gameOver) {
        // Decided by the server (time-out or disconnect).
        remoteQueue = [];
        s.gameOver = true; s.winner = msg.winner; s.pending = null; s.queue = [];
        heroesShattered = true;
        animating = false;
        sound.play(s.winner === viewer ? 'victory' : 'defeat');
      }
      render();
      return;
    }
  }
}

// Apply the opponent's moves one at a time, each with its animation.
function drainRemote() {
  if (!game || game.mode !== 'online' || animating || screen !== 'game' || !remoteQueue.length) return;
  const msg = remoteQueue.shift();
  act(msg.action, { remote: true, h: msg.h });
}

// The two copies disagree (should never happen): the guest asks for the host's copy.
function onDesync() {
  console.warn('Online game out of sync; asking for the other copy.');
  link.send({ t: 'needSync' });
}

// ---- Screens --------------------------------------------------------------

// "Swap cards" buttons for picked factions that have expansion cards.
function swapButtonsHTML() {
  return picked.filter(hasExtras).map((f) => {
    const n = FACTION_POOLS[f].length - FACTION_LISTS[f].length;
    const open = n - lockedCount(f);
    const mine = customLineupFor(f);
    const swapped = mine ? mine.filter((id) => !FACTION_LISTS[f].includes(id)).length : 0;
    const note = swapped ? `${swapped} new in · ${open}/${n} unlocked` : open ? `${open}/${n} new unlocked` : `🔒 win matches to unlock ${n} new`;
    return `<button data-swap="${esc(f)}" class="ghost swap-btn"><img class="btn-icon" src="art/ui/icon-unlocks.png" alt=""> ${esc(f)} cards <small>${note}</small></button>`;
  }).join('');
}

function deckLineHTML() {
  if (picked.length !== pickNeeded()) return `<p class="deck-line sub">Pick ${pickNeeded() === 1 ? 'a faction' : `${pickNeeded()} factions`} to build your deck.</p>`;
  if (format === 'single') {
    const f = picked[0];
    const custom = customDupesFor(f);
    return `
    <div class="deck-line">
      <div><b>Your deck: ${buildSingleDeck(f, dupesFor(f), savedLineups()).length} cards</b> <span class="sub">${esc(f)} · 30 + 10 duplicates (${custom ? 'yours' : 'standard'})</span></div>
      <button data-act="editDupes">${custom ? 'Edit my duplicates' : 'Choose duplicates'}</button>
      ${custom ? '<button data-act="resetDupes" class="ghost">Use standard duplicates</button>' : ''}
      ${swapButtonsHTML()}
    </div>`;
  }
  const custom = validCustomCuts(picked);
  const cuts = custom ?? standardCuts(picked, savedLineups());
  const split = picked.map((f) => `${cutCount(cuts, f)} ${f}`).join(' · ');
  const size = buildDeck(picked, cuts, savedLineups()).length;
  return `
    <div class="deck-line">
      <div><b>Your deck: ${size} cards</b> <span class="sub">${esc(picked.join(' + '))} · ${custom ? 'your cut' : 'standard cut'} (${esc(split)})</span></div>
      <button data-act="editCuts">${custom ? 'Edit my cut' : 'Customize cuts'}</button>
      ${custom ? '<button data-act="resetCuts" class="ghost">Use standard cut</button>' : ''}
      ${swapButtonsHTML()}
    </div>`;
}

// ---- Main menu: a living title screen ------------------------------------------
// The faction battlefields drift and cross-fade behind the menu (#menu-bg lives
// outside #app so the slideshow survives re-renders), with embers and light rays.
let menuBg = null;
function showMenuBackdrop(on) {
  if (!menuBg) {
    menuBg = document.createElement('div');
    menuBg.id = 'menu-bg';
    // The shattered realms drifting in the void (slow pan and zoom).
    menuBg.innerHTML = '<div class="mbg-islands" style="background-image:url(\'art/ui/menu-bg.jpg\')"></div>'
      + '<div class="mbg-shade"></div><div class="mbg-rays"></div>'
      + Array.from({ length: 28 }, () => `<i class="mbg-ember" style="left:${Math.random() * 100}%;--d:${(6 + Math.random() * 8).toFixed(1)}s;--delay:${(-Math.random() * 14).toFixed(1)}s;--x:${(Math.random() * 120 - 60).toFixed(0)}px;--s:${(0.6 + Math.random() * 1.2).toFixed(2)}"></i>`).join('');
    document.body.prepend(menuBg);
  }
  menuBg.classList.toggle('show', on);
}

// How well the picked pair's mechanics work together, 1-5 stars.
function synergyHTML(factions) {
  const s = synergyFor(factions);
  if (!s) return '';
  const [stars, why] = s;
  const label = ['', 'Clashing', 'Weak', 'Solid', 'Strong', 'Perfect'][stars];
  return `<div class="ts-synergy s${stars}" title="Synergy: ${stars} of 5">
    <span class="ts-syn-label">Synergy</span>
    <span class="ts-stars">${'★'.repeat(stars)}<i>${'★'.repeat(5 - stars)}</i></span>
    <b>${label}</b>
    <p>${esc(why)}</p>
  </div>`;
}

// A short guide per picked faction: what it does and what it's good at.
function factionGuideHTML(factions) {
  return `<div class="ts-guides">${factions.map((f) => {
    const info = FACTION_INFO[f];
    if (!info) return '';
    return `<article class="ts-guide f-${f.toLowerCase()}">
      <header>${FACTION_ICONS[f] ?? '✦'} <b>${esc(f)}</b> <span class="ts-style">${esc(info.style)}</span></header>
      <p class="ts-summary">${esc(info.summary)}</p>
      <div class="ts-good">Good at:</div>
      <ul>${info.strengths.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
      ${info.weaknesses?.length ? `<div class="ts-good ts-bad">Not so good at:</div>
      <ul class="ts-weak">${info.weaknesses.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>` : ''}
      <p class="ts-mech">${esc(info.mechanic)}</p>
    </article>`;
  }).join('')}</div>`;
}

function renderMenu() {
  const saved = loadSaved();
  showMenuBackdrop(true);
  const roster = [...FACTIONS].sort((a, b) => PLAYABLE_FACTIONS.includes(b) - PLAYABLE_FACTIONS.includes(a));
  const playable = roster.filter((f) => PLAYABLE_FACTIONS.includes(f));
  const soon = roster.filter((f) => !PLAYABLE_FACTIONS.includes(f));
  const ready = picked.length === pickNeeded();
  const fusion = format !== 'single' && ready ? fusionFor(picked) : null;
  galleryOrder = fusion ? [fusion.id] : []; // the full-size view holds just this card
  const heroCard = (f) => {
    const art = heroArtOf(f);
    return `<div class="vs-hero f-${f.toLowerCase()}">${art ? `<img src="${art}" alt="">` : `<b>${FACTION_ICONS[f] ?? '✦'}</b>`}<span>${esc(f)}</span></div>`;
  };
  app.innerHTML = `
    <div class="menu tavern title-screen">
      <header class="ts-title">
        <div class="ts-runes"></div>
        <h1 class="ts-logo"><img src="art/ui/logo.png" alt="Shattered Realms" draggable="false"></h1>
        <p class="ts-tag">Twelve realms broke apart. Two of them are yours.</p>
        <img class="ui-divider" src="art/ui/divider.png" alt="" draggable="false">
      </header>

      <nav class="ts-actions">
        <button data-act="ai" class="ts-play play-art" aria-label="Play vs AI"><img class="pa-img" src="art/ui/play-button.png" alt="" draggable="false"><i class="pa-glow"></i><i class="pa-shine"></i><span class="pa-sparks">${'<b></b>'.repeat(8)}</span><small>vs AI</small></button>
        ${difficultySliderHTML()}
        <div class="ts-row">
          ${BUILD.online ? '<button data-act="online">⚔️ Play online</button>' : ''}
          <button data-act="hotseat">👥 Hot-seat</button>
          ${saved ? '<button data-act="continue">↻ Continue</button>' : ''}
        </div>
        <div class="ts-row small">
          <button data-act="howto" class="ghost ${howToOpened() ? '' : 'new-player'}">📘 How to play${howToOpened() ? '' : ' <small>New? Start here</small>'}</button>
          <button data-act="gallery" class="ghost"><img class="btn-icon" src="art/ui/icon-new-cards.png" alt=""> Card collection</button>
          <button data-act="settings" class="ghost">⚙ Settings</button>
        </div>
      </nav>

      <section class="ts-panel">
        <div class="ts-panel-head">
          <h3>Choose your ${pickNeeded() === 1 ? 'realm' : 'realms'} <span class="pick-count">${picked.length}/${pickNeeded()}</span></h3>
          <div class="format-toggle">
            <button data-act="formatPair" class="${format === 'pair' ? 'on' : 'ghost'}">Two factions</button>
            <button data-act="formatSingle" class="${format === 'single' ? 'on' : 'ghost'}">One faction</button>
          </div>
        </div>
        <div class="factions">
          ${playable.map((f) => {
            const art = heroArtOf(f);
            const on = picked.includes(f);
            return `<span class="faction medallion f-${f.toLowerCase()} ${on ? 'picked' : 'ready'}" data-faction="${esc(f)}" title="${esc(f)}">
              <span class="medal-ring"></span>
              <span class="medal-face">${art ? `<img src="${art}" alt="" draggable="false">` : `<b>${FACTION_ICONS[f] ?? '✦'}</b>`}</span>
              <span class="medal-name">${esc(f)}</span>${on ? '<span class="medal-check">✓</span>' : ''}</span>`;
          }).join('')}
        </div>
        ${ready ? `<div class="ts-matchup">
          ${picked.map(heroCard).join('<span class="vs-plus">+</span>')}
          ${fusion ? `<div class="vs-fusion">🌀 Fusion: <b>${esc(fusion.name)}</b></div>
          <div class="vs-fusion-card" title="Click to see it full size">${cardHTML(fusion, { zoom: true })}</div>` : ''}
        </div>` : ''}
        ${ready && format !== 'single' ? synergyHTML(picked) : ''}
        ${ready ? factionGuideHTML(picked) : ''}
        ${deckLineHTML()}
        <p class="sub">${format === 'single' ? 'The rival plays a random faction with its standard duplicates.' : 'The rival plays a random pair with the standard cut.'}</p>
        ${soon.length ? `<p class="ts-soon">Coming soon: ${soon.map(esc).join(' · ')}</p>` : ''}
      </section>
    </div>
    ${zoomId && fusion ? zoomHTML(getCard(zoomId)) : ''}`;
}

function renderDupeBuilder() {
  const f = picked[0];
  const need = DEFAULT_RULES.singleFactionDuplicates;
  const n = draftDupes.length;
  const lineup = lineupOf(f, savedLineups());
  const cards = galleryCards(f).filter((c) => lineup.includes(c.id));
  galleryOrder = cards.map((c) => c.id);
  const heroSpells = galleryCards(f).filter((c) => c.heroSpell);
  const scrollY = window.scrollY;
  app.innerHTML = `
    <div class="gallery builder">
      <div class="builder-bar">
        <div>
          <h2>Choose your duplicates</h2>
          <div class="sub">${esc(f)} · click ${need} cards to play two copies of each (max ${DEFAULT_RULES.maxCopies} per card) · Hero Spell always included:
            ${heroSpells.map((c) => esc(c.name)).join(', ')}</div>
        </div>
        <div class="builder-count ${n === need ? 'done' : ''}">Duplicates <b>${n}</b> / ${need}<span class="sub">Deck ${cards.length + n} cards</span></div>
        <div class="builder-buttons">
          <button data-act="dupeStandard" class="ghost">Standard duplicates</button>
          <button data-act="dupeClear" class="ghost">Clear</button>
          <button data-act="menu" class="ghost">Cancel</button>
          <button data-act="dupeSave" ${n === need ? '' : 'disabled'}>Save deck</button>
        </div>
      </div>
      <h3>${FACTION_ICONS[f] ?? ''} ${esc(f)} <span class="pick-count">30 cards · ${n} doubled</span></h3>
      <div class="gallery-grid builder-grid">${cards.map((c) => cardHTML(c, { cuttable: true, isDupe: draftDupes.includes(c.id) })).join('')}</div>
    </div>
    ${zoomId ? zoomHTML(getCard(zoomId)) : ''}`;
  window.scrollTo(0, scrollY);
}

// Choose which 30 of a faction's cards you bring (expansion factions).
function renderSwapBuilder() {
  const f = swapFaction;
  const need = FACTION_DECKS[f].length;
  const n = draftLineup.length;
  const cards = galleryCards(f).filter((c) => FACTION_POOLS[f].includes(c.id));
  galleryOrder = cards.map((c) => c.id);
  const extras = FACTION_POOLS[f].length - FACTION_LISTS[f].length;
  const scrollY = window.scrollY;
  const grid = (list) => `<div class="gallery-grid builder-grid">${list.map((c) => (isLocked(c.id)
    ? cardHTML(c, { cuttable: true, isCut: true, cutLabel: '🔒 LOCKED' }).replace('class="card ', 'class="card locked ')
    : cardHTML(c, { cuttable: true, isCut: !draftLineup.includes(c.id), cutLabel: 'OUT' }))).join('')}</div>`;
  app.innerHTML = `
    <div class="gallery builder swap-builder">
      <div class="builder-bar">
        <div>
          <h2>Choose your ${esc(f)} cards</h2>
          <div class="sub">${esc(f)} has ${FACTION_POOLS[f].length} cards (${extras} new, ${extras - lockedCount(f)} unlocked). Your deck uses ${need}: tap a card to take it out or put it in. Win matches vs the AI to unlock more (${'2'} per win).</div>
        </div>
        <div class="builder-count ${n === need ? 'done' : ''}">In <b>${n}</b> / ${need}<span class="sub">${n > need ? `take out ${n - need}` : n < need ? `add ${need - n}` : 'ready'}</span></div>
        <div class="builder-buttons">
          <button data-act="swapStandard" class="ghost">Standard ${need}</button>
          <button data-act="menu" class="ghost">Cancel</button>
          <button data-act="swapSave" ${n === need ? '' : 'disabled'}>Save cards</button>
        </div>
      </div>
      <h3><img class="h-icon" src="art/ui/icon-dino-egg.png" alt=""> New cards <span class="pick-count">${cards.filter((c) => c.extra && draftLineup.includes(c.id)).length} of ${extras} in</span></h3>
      ${grid(cards.filter((c) => c.extra))}
      <h3>${FACTION_ICONS[f] ?? ''} Original cards <span class="pick-count">${cards.filter((c) => !c.extra && draftLineup.includes(c.id)).length} of ${FACTION_LISTS[f].length} in</span></h3>
      ${grid(cards.filter((c) => !c.extra))}
    </div>
    ${zoomId ? zoomHTML(getCard(zoomId)) : ''}`;
  window.scrollTo(0, scrollY);
}

function renderBuilder() {
  if (builderMode === 'dupe') return renderDupeBuilder();
  if (builderMode === 'swap') return renderSwapBuilder();
  const need = DEFAULT_RULES.cardsCut;
  const n = draftCuts.length;
  const inDeck = (f) => { const l = lineupOf(f, savedLineups()); return galleryCards(f).filter((c) => l.includes(c.id)); };
  galleryOrder = picked.flatMap((f) => inDeck(f).map((c) => c.id));
  const heroSpells = picked.flatMap((f) => galleryCards(f).filter((c) => c.heroSpell));
  const section = (f) => {
    const cards = inDeck(f);
    const cut = cutCount(draftCuts, f);
    return `<h3>${FACTION_ICONS[f] ?? ''} ${esc(f)} <span class="pick-count">${cards.length - cut} in deck · ${cut} cut</span></h3>
      <div class="gallery-grid builder-grid">${cards.map((c) => cardHTML(c, { cuttable: true, isCut: draftCuts.includes(c.id) })).join('')}</div>`;
  };
  const scrollY = window.scrollY;
  app.innerHTML = `
    <div class="gallery builder">
      <div class="builder-bar">
        <div>
          <h2>Build your deck</h2>
          <div class="sub">${esc(picked.join(' + '))} · click cards to cut them · Hero Spells always included:
            ${heroSpells.map((c) => esc(c.name)).join(', ')}</div>
        </div>
        <div class="builder-count ${n === need ? 'done' : ''}">Cut <b>${n}</b> / ${need}<span class="sub">Deck ${picked.reduce((t, f) => t + lineupOf(f, savedLineups()).length, 0) - n} cards</span></div>
        <div class="builder-buttons">
          <button data-act="cutStandard" class="ghost">Standard cut</button>
          <button data-act="cutClear" class="ghost">Clear cuts</button>
          <button data-act="menu" class="ghost">Cancel</button>
          <button data-act="cutSave" ${n === need ? '' : 'disabled'}>Save deck</button>
        </div>
      </div>
      ${picked.map(section).join('')}
    </div>
    ${zoomId ? zoomHTML(getCard(zoomId)) : ''}`;
  window.scrollTo(0, scrollY);
}

const FACTION_ORDER = () => Object.keys(FACTION_LISTS);
function galleryCards(f) {
  // Fusions: grouped by their first faction, in roster order.
  if (f === 'Fusion') {
    const order = FACTION_ORDER();
    const rank = (c) => (c.fusion ? order.indexOf(c.fusion[0]) * 100 + order.indexOf(c.fusion[1]) : 9999);
    return allCards().filter((c) => c.faction === 'Fusion' && !c.custom).sort((a, b) => rank(a) - rank(b));
  }
  return allCards().filter((c) => c.faction === f && !c.custom).sort((a, b) =>
    (b.heroSpell ? 1 : 0) - (a.heroSpell ? 1 : 0) || (a.token ? 1 : 0) - (b.token ? 1 : 0) || a.cost - b.cost);
}

// The collection is a book: one faction per page, tabs down the side.
let bookPage = null;
let bookTurned = false; // play the page-turn only when the page changes

function renderGallery() {
  const factions = [...Object.keys(FACTION_LISTS), 'Fusion'];
  bookPage = factions.includes(bookPage) ? bookPage : factions[0];
  galleryOrder = galleryCards(bookPage).map((c) => c.id);
  const f = bookPage;
  const art = heroArtOf(f);
  const scrollY = window.scrollY;
  app.innerHTML = `
    <div class="book">
      <div class="book-head"><h2>Card collection</h2><button data-act="menu" class="ghost">Back</button></div>
      <div class="book-body">
        <nav class="book-tabs">${factions.map((x) => `<button class="book-tab f-${x.toLowerCase()} ${x === f ? 'on' : ''}" data-book="${esc(x)}" title="${esc(x)}">
          <span>${FACTION_ICONS[x] ?? '✦'}</span><b>${esc(x)}</b></button>`).join('')}</nav>
        <section class="book-page f-${f.toLowerCase()} ${bookTurned ? 'turn' : ''}">
          <header class="page-title">${art ? `<img src="${art}" alt="">` : ''}<div><h3>${esc(f)}</h3>
            <span class="sub">${f === 'Fusion'
    ? `${galleryCards(f).filter((c) => c.fusion).length} Fusion Hero Spells · one per faction pair · charges as you use your Hero Spells (3 uses) · click a card to see it full size`
    : `${hasExtras(f) ? `${FACTION_POOLS[f].length} cards (${FACTION_POOLS[f].length - FACTION_LISTS[f].length} new) · a deck uses ${FACTION_DECKS[f].length}` : `${FACTION_DECKS[f].length}/${FACTION_LISTS[f].length} cards`} · Hero Spell first, tokens last · click a card to see it full size`}</span></div></header>
          <div class="gallery-grid">${galleryCards(f).map((c) => (isLocked(c.id)
            ? cardHTML(c, { zoom: true, isCut: true, cutLabel: '🔒 LOCKED' }).replace('class="card ', 'class="card locked ')
            : cardHTML(c, { zoom: true }))).join('')}</div>
        </section>
      </div>
    </div>
    ${zoomId ? zoomHTML(getCard(zoomId)) : ''}`;
  bookTurned = false;
  window.scrollTo(0, scrollY);
}

// The collection / builder zoom: the big card plus its keyword glossary.
function zoomHTML(card) {
  const i = galleryOrder.indexOf(card.id);
  return `
    <div class="zoom-overlay" data-act="closeZoom">
      <div class="zoom-wrap" data-stop>
        <button class="zoom-arrow" data-act="zoomPrev" ${i <= 0 ? 'disabled' : ''} title="Previous (←)">‹</button>
        ${bigCardHTML(card)}
        <aside class="zoom-side">
          <button class="zoom-close ghost" data-act="closeZoom" title="Close (Esc)">✕</button>
          <div class="zoom-faction">${FACTION_ICONS[card.faction] ?? ''} ${esc(card.faction)} <span class="sub">${i + 1} / ${galleryOrder.length}</span></div>
          ${cardTerms(card).map((t) => `<div class="zoom-term"><b>${esc(t)}</b> ${esc(KEYWORD_TEXT[t])}</div>`).join('')}
        </aside>
        <button class="zoom-arrow" data-act="zoomNext" ${i >= galleryOrder.length - 1 ? 'disabled' : ''} title="Next (→)">›</button>
      </div>
    </div>`;
}

// A Trap that was just set drops in with a glow, so it's clear where it went.
let trapCounts = null;
function markFreshTraps() {
  const s = game.state;
  const counts = s.players.map((p) => p.traps.length);
  if (trapCounts) {
    for (const [side, p] of [['me', viewer], ['opp', 1 - viewer]]) {
      const added = counts[p] - trapCounts[p];
      if (added <= 0) continue;
      const tokens = [...app.querySelectorAll(`.hero-zone.${side} .trap-token`)].slice(-added);
      for (const t of tokens) t.classList.add('fresh');
    }
  }
  trapCounts = counts;
}

// First-game tips (tutorial.js): each one appears once, the first time it applies.
function coachTips() {
  const s = game?.state;
  if (!s || s.gameOver || handoff || animating || s.pending?.type === 'mulligan' || game.mode === 'hotseat' && handoff) return;
  const me = viewer;
  const mp = s.players[me];
  const op = s.players[1 - me];
  tip('welcome');
  const myTurn = s.activePlayer === me && !s.pending;
  const legal = myTurn ? getLegalActions(s) : [];
  if (myTurn) tip('mana');
  if (legal.some((a) => a.type === 'attack' && a.attacker !== mp.hero.uid)) tip('attack');
  if ([...mp.board, ...op.board].some((m) => hasKeyword(m, 'Taunt'))) tip('taunt');
  if (op.traps.length) tip('enemyTrap');
  if (mp.traps.length) tip('myTrap');
  if (legal.some((a) => a.type === 'heroSpell')) tip('heroSpell');
  if (s.pending?.type === 'reaction' && s.pending.player === me) tip('quickPlay');
  if (myTurn && mp.hand.length && !legal.some((a) => a.type === 'play' || a.type === 'heroSpell')) tip('nothingFits');
  if (myTurn && s.turn > 2 && legal.length === 1) tip('endTurn');
}
window.addEventListener('tips-off', () => { setSetting({ tips: false }); flash('Tips turned off. You can turn them back on in Settings.'); });

function pokeProp(el) {
  el.classList.remove('poked');
  void el.offsetWidth;
  el.classList.add('poked');
  setTimeout(() => el.classList.remove('poked'), 650);
  const r = el.getBoundingClientRect();
  fx.particles(r, app.querySelector('.arena')?.dataset.faction, 3);
  if (el.dataset.glyph) fx.popGlyph(r, el.dataset.glyph);
  sound.play(el.dataset.sound || 'click');
}

function renderGame() {
  const s = game.state;
  // A win (vs the AI or online) unlocks expansion cards, once per match.
  if (s.gameOver && heroesShattered && !game.unlockChecked) {
    game.unlockChecked = true;
    if (s.winner === viewer && (game.mode === 'ai' || game.mode === 'online')) game.unlocked = awardUnlocks();
  }
  app.innerHTML = boardHTML({
    s, me: viewer, legal: legalForView(), mode: game.mode, handoff, isAI, history, logOpen, mullMarked, shattered: heroesShattered, rope: ropeState(),
    endArmed: endArmed === s.turn, concedeAsk, stats: game.stats, online: game.online, result: game.result,
    thinking: !s.gameOver && isAI(actingPlayer(s)) && s.pending?.type !== 'mulligan' ? s.players[actingPlayer(s)].name : null,
  });
  if (app.querySelector('.arena.has-board')) showBoard(s.players[viewer].factions[0]); else hideBoard();
  layoutPortraitBoard(app);
  layoutHands(app);
  if (game.unlocked?.length && !game.unlockSeen) {
    app.insertAdjacentHTML('beforeend', unlockPopupHTML(game.unlocked));
    fitAllText(app.querySelector('.unlock-overlay'));
  }
  markFreshTraps();
  coachTips();
  const logEl = app.querySelector('.log');
  if (logEl) logEl.scrollTop = logEl.scrollHeight;
  drag.refresh();
}

// ---- Turn timer: 75 seconds a turn; the rope burns for the last 15 (Hearthstone's numbers) ----

const TURN_SECONDS = 75;
const ROPE_SECONDS = 15;
let turnTimer = { key: null };
let turnTicker = null;

// A human's turn is timed once it is really theirs (after the mulligan and the hand-off screen).
function timedTurn() {
  const s = game?.state;
  if (screen !== 'game' || !s || s.gameOver || handoff || s.pending?.type === 'mulligan') return null;
  if (isAI(s.activePlayer)) return null;
  return `${s.turn}`;
}

function syncTurnTimer() {
  const key = timedTurn();
  if (key && turnTimer.key !== key) turnTimer = { key, deadline: Date.now() + TURN_SECONDS * 1000, roped: false };
  if (key && !turnTicker) turnTicker = setInterval(tickTurnTimer, 100);
  if (!key && turnTicker) { clearInterval(turnTicker); turnTicker = null; }
}

// null = no rope yet; 0..1 = how much of the rope has burnt.
function ropeState() {
  const key = timedTurn();
  if (!key || turnTimer.key !== key) return null;
  const left = (turnTimer.deadline - Date.now()) / 1000;
  return left > ROPE_SECONDS ? null : Math.min(1, Math.max(0, 1 - left / ROPE_SECONDS));
}

function tickTurnTimer() {
  const burn = ropeState();
  const rope = app.querySelector('.rope');
  if (rope) {
    rope.classList.toggle('burning', burn != null);
    if (burn != null) rope.style.setProperty('--burn', burn.toFixed(4));
  }
  app.querySelector('.end-turn.has-moves, .end-turn.done')?.classList.toggle('roping', burn != null);
  if (burn != null && !turnTimer.roped) { turnTimer.roped = true; sound.play('ropeStart'); }
  if (burn === 1) forceEndTurn();
}

// Time's up: answer an open choice at random, then end the turn.
function forceEndTurn() {
  const s = game.state;
  if (animating || s.gameOver) return;
  drag.cancel();
  const legal = getLegalActions(s);
  if (s.pending?.type === 'choice' && !isAI(s.pending.player)) {
    const choices = legal.filter((a) => a.type === 'choose');
    if (choices.length) act(choices[Math.floor(Math.random() * choices.length)]);
    return;
  }
  const end = legal.find((a) => a.type === 'endTurn');
  if (end) act(end);
}

function render() {
  document.body.classList.toggle('in-game', screen === 'game');
  if (screen !== 'game') hideBoard();
  if (screen !== 'menu' && screen !== 'online' && screen !== 'howto') showMenuBackdrop(false);
  if (screen !== 'game') clearTips();
  if (screen === 'menu') renderMenu();
  else if (screen === 'gallery') renderGallery();
  else if (screen === 'builder') renderBuilder();
  else if (screen === 'online') renderLobby();
  else if (screen === 'howto') { app.innerHTML = howToPlayHTML(KEYWORD_TEXT); showMenuBackdrop(true); }
  else renderGame();
  music(screen === 'game' ? 'battle' : 'menu');
  fitAllText(app);
  syncReactionTimer();
  syncTurnTimer();
}

// A human Quick Play window auto-passes after quickPlaySeconds.
function syncReactionTimer() {
  const s = game?.state;
  const open = screen === 'game' && s?.pending?.type === 'reaction' && !isAI(s.pending.player) && !handoff;
  const key = open ? `${s.turn}|${s.log.length}|${s.pending.window}|${s.pending.player}` : null;
  if (reactionTimer && reactionTimer.key !== key) { clearInterval(reactionTimer.interval); reactionTimer = null; }
  if (!open || reactionTimer) { paintCountdown(); return; }
  sound.play('quickPlay');
  const deadline = Date.now() + s.rules.quickPlaySeconds * 1000;
  reactionTimer = {
    key, deadline,
    interval: setInterval(() => {
      if (Date.now() >= deadline) {
        clearInterval(reactionTimer.interval);
        reactionTimer = null;
        act({ type: 'pass', player: s.pending.player });
      } else paintCountdown();
    }, 200),
  };
  paintCountdown();
}

function paintCountdown() {
  const el = app.querySelector('.countdown');
  if (!el || !reactionTimer) return;
  const left = Math.max(0, reactionTimer.deadline - Date.now());
  el.textContent = `${Math.ceil(left / 1000)}s`;
  el.style.setProperty('--left', `${left / (game.state.rules.quickPlaySeconds * 10)}%`);
}

let flashTimer;
function flash(msg) {
  let el = document.querySelector('.flash');
  if (!el) { el = document.createElement('div'); el.className = 'flash'; document.body.appendChild(el); }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => el.classList.remove('show'), 1600);
}

// ---- Hover preview (big card beside whatever you point at) ---------------------------

let previewTimer = null;
function previewEl() {
  let el = document.getElementById('preview');
  if (!el) { el = document.createElement('div'); el.id = 'preview'; document.body.appendChild(el); }
  return el;
}
function hidePreview() {
  clearTimeout(previewTimer);
  previewEl().classList.remove('show');
}
function showPreview(target) {
  const id = target.dataset.preview;
  const card = getCard(id);
  const s = game.state;
  let live = {};
  const uid = target.dataset.char ? Number(target.dataset.char) : null;
  const m = uid != null ? findCharacter(s, uid) : null;
  if (m?.kind === 'minion') {
    const kws = [...new Set([...m.keywords, ...(m.tempKeywords ?? []), ...(m.lingerKeywords ?? []).map((x) => x.k)])];
    const atk = m.attack + m.tempAttack + (m.lingerAttack ?? []).reduce((t, x) => t + x.amount, 0);
    live = { attack: Math.max(0, atk), health: m.health, maxHealth: m.maxHealth, extra: kws.length ? `<br><i class="live-kw">Now: ${esc(kws.join(', '))}</i>` : '' };
  }
  const note = target.dataset.history ? `<div class="preview-note">${esc(target.dataset.history)}</div>` : '';
  const el = previewEl();
  el.innerHTML = bigCardHTML(card, live) + note;
  const r = target.getBoundingClientRect();
  const right = r.left + r.width / 2 < window.innerWidth / 2;
  el.style.left = right ? `${Math.min(r.right + 16, window.innerWidth - 20)}px` : '';
  el.style.right = right ? '' : `${Math.max(window.innerWidth - r.left + 16, 20)}px`;
  el.classList.toggle('from-right', !right);
  // Not enough room beside the card (phones, portrait): centre the big card on screen instead.
  const w = el.offsetWidth;
  const fits = right ? r.right + 16 + w <= window.innerWidth - 8 : r.left - 16 - w >= 8;
  const centre = !fits || portraitLayout() || window.innerWidth < 900;
  el.classList.toggle('centered', centre);
  if (centre) { el.style.left = `${Math.max(8, (window.innerWidth - w) / 2)}px`; el.style.right = ''; }
  el.classList.add('show');
  fitAllText(el);
}

document.addEventListener('pointerover', (e) => {
  if (screen !== 'game' || e.pointerType === 'touch') return;
  const t = e.target.closest('[data-preview]');
  if (!t || t.closest('.overlay, .reaction') || drag.busy() || animating) return;
  clearTimeout(previewTimer);
  previewTimer = setTimeout(() => { if (t.isConnected && !drag.busy()) showPreview(t); }, 280);
});
document.addEventListener('pointerout', (e) => {
  if (e.target.closest?.('[data-preview]')) hidePreview();
});
document.addEventListener('pointerdown', hidePreview);

// Touch: hold a minion, hero, Hero Spell or history icon for its preview
// (hand cards use tap-to-inspect in drag.js). Moving the finger cancels.
const LONG_PRESS_MS = 420;
let longPress = null;
document.addEventListener('pointerdown', (e) => {
  if (screen !== 'game' || e.pointerType !== 'touch') return;
  const t = e.target.closest('[data-preview]');
  // Overlay cards (mulligan, Discover) can be held to read them too.
  if (!t || t.closest('[data-hand], .reaction, button')) return;
  clearTimeout(longPress?.timer);
  longPress = { x: e.clientX, y: e.clientY, shown: false, timer: setTimeout(() => {
    if (!t.isConnected) return;
    drag.cancel(); // a held attacker shows its card instead of aiming
    showPreview(t);
    if (longPress) longPress.shown = true;
  }, LONG_PRESS_MS) };
});
document.addEventListener('pointermove', (e) => {
  if (longPress && Math.hypot(e.clientX - longPress.x, e.clientY - longPress.y) > 10) { clearTimeout(longPress.timer); longPress = null; }
});
// Lifting the finger closes a long-press preview (as in Hearthstone), and that
// release doesn't count as a tap (it would swap a mulligan card or pick a choice).
let swallowClick = false;
document.addEventListener('click', (e) => {
  if (!swallowClick) return;
  swallowClick = false;
  e.stopPropagation();
  e.preventDefault();
}, true);
document.addEventListener('pointerup', () => {
  if (longPress?.shown) { hidePreview(); swallowClick = true; setTimeout(() => { swallowClick = false; }, 400); }
  clearTimeout(longPress?.timer);
  longPress = null;
});

// Hand: hovering a card pushes its neighbours apart (mouse only; touch uses inspect).
document.addEventListener('pointerover', (e) => {
  if (screen !== 'game' || e.pointerType === 'touch') return;
  const card = e.target.closest?.('.my-hand .card');
  // Portrait cards don't grow on hover, so nothing needs to make room (and shifting them made cards overlap).
  if (!card || drag.busy() || card.closest('.arena.portrait')) return;
  const cards = [...card.parentElement.children];
  const at = cards.indexOf(card);
  const w = card.offsetWidth;
  cards.forEach((c, i) => {
    const d = i - at;
    c.style.setProperty('--push', d === 0 ? '0px' : `${Math.sign(d) * w * Math.max(0.12, 0.42 - Math.abs(d) * 0.1)}px`);
  });
});
document.addEventListener('pointerout', (e) => {
  const hand = e.target.closest?.('.my-hand');
  if (!hand || hand.contains(e.relatedTarget)) return;
  for (const c of hand.children) c.style.setProperty('--push', '0px');
});

// ---- Emotes: click your hero (or right-click it) for a wheel of lines ----

let emoteOpen = false;
let lastEmote = 0;
function closeEmotes() {
  document.getElementById('emote-wheel')?.remove();
  emoteOpen = false;
}
function openEmotes(heroEl) {
  closeEmotes();
  const r = heroEl.getBoundingClientRect();
  const wheel = document.createElement('div');
  wheel.id = 'emote-wheel';
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const radius = Math.max(r.width * 0.95, 90);
  wheel.innerHTML = EMOTE_KINDS.map((k, i) => {
    // Fan the six buttons in an arc above the portrait.
    const a = Math.PI * (1.05 + (i / (EMOTE_KINDS.length - 1)) * 0.9);
    return `<button class="emote-btn" data-emote="${k}" style="left:${cx + Math.cos(a) * radius}px;top:${cy + Math.sin(a) * radius * 0.85}px">${EMOTE_LABELS[k]}</button>`;
  }).join('');
  document.body.appendChild(wheel);
  emoteOpen = true;
}
// A speech bubble beside a hero; it fades on its own.
function sayEmote(player, kind) {
  const s = game?.state;
  if (!s) return;
  const heroEl = charEl(s.players[player].hero.uid);
  if (!heroEl) return;
  const r = heroEl.getBoundingClientRect();
  const top = r.top + r.height / 2 < window.innerHeight / 2;
  const b = document.createElement('div');
  b.className = `emote-bubble ${top ? 'from-top' : 'from-bottom'}`;
  b.textContent = emoteLine(s.players[player].factions[0], kind);
  Object.assign(b.style, { left: `${r.right + 10}px`, top: `${top ? r.bottom - r.height * 0.3 : r.top + r.height * 0.2}px` });
  fx.layer().appendChild(b);
  sound.play('emote');
  fx.animate(b, [
    { opacity: 0, transform: 'translateY(-50%) scale(0.6)' },
    { opacity: 1, transform: 'translateY(-50%) scale(1.05)', offset: 0.08 },
    { opacity: 1, transform: 'translateY(-50%) scale(1)', offset: 0.85 },
    { opacity: 0, transform: 'translateY(-50%) scale(1)' },
  ], { duration: 2800 }).then(() => b.remove());
}
function playerEmote(kind) {
  closeEmotes();
  const s = game?.state;
  if (!s || Date.now() - lastEmote < 1200) return; // no spamming
  lastEmote = Date.now();
  const me = game.mode !== 'hotseat' ? viewer : actingPlayer(s);
  sayEmote(me, kind);
  if (game.mode === 'online') link.send({ t: 'emote', kind });
  // The AI answers greetings and compliments now and then.
  if (game.mode === 'ai' && !s.gameOver && (kind === 'greetings' || kind === 'wellPlayed' || kind === 'wow')) {
    if (Math.random() < 0.7) setTimeout(() => sayEmote(1 - me, kind === 'wow' ? 'thanks' : kind === 'wellPlayed' ? 'thanks' : 'greetings'), 1300);
  }
}
document.addEventListener('click', (e) => {
  const btn = e.target.closest?.('[data-emote]');
  if (btn) { e.stopPropagation(); return playerEmote(btn.dataset.emote); }
  if (emoteOpen && !e.target.closest?.('#emote-wheel')) closeEmotes();
  if (screen !== 'game' || !game || drag.busy() || drag.recentlyAimed() || animating) return;
  const hero = e.target.closest?.('.hero-zone.me .hero-portrait');
  // Clicking your hero opens the wheel, unless it is about to attack.
  if (hero && !hero.classList.contains('can-attack')) openEmotes(hero);
}, true);
document.addEventListener('contextmenu', (e) => {
  const hero = screen === 'game' && e.target.closest?.('.hero-zone.me .hero-portrait');
  if (!hero) return;
  e.preventDefault();
  openEmotes(hero);
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeEmotes(); });

// Board scenery reacts to clicks on empty table space (living boards, board-anim.js).
// Only bare board counts: cards, heroes and buttons keep their normal behaviour.
const onBareBoard = (e) => screen === 'game' && e.target.classList?.contains('arena') && !drag.busy();
document.addEventListener('pointerdown', (e) => { if (e.button === 0 && onBareBoard(e)) pokeBoard(e.clientX, e.clientY); });
let pokeHoverAt = 0;
document.addEventListener('pointermove', (e) => {
  if (e.pointerType === 'touch' || e.timeStamp - pokeHoverAt < 60) return;
  pokeHoverAt = e.timeStamp;
  const arena = app.querySelector('.arena.has-board');
  if (!arena) return;
  arena.style.cursor = onBareBoard(e) && canPokeBoard(e.clientX, e.clientY) ? 'pointer' : '';
});


// ---- Input ----------------------------------------------------------------
// Hand cards, Hero Spells and attacks are dragged/aimed in drag.js; this
// handles buttons and overlay choices.

drag.init({
  root: () => app,
  legal: legalNow,
  canAct,
  act,
  inspect: (el) => (el ? showPreview(el) : hidePreview()),
  deny,
  notMyTurn: () => screen === 'game' && !!game && !animating && !handoff && !game.state.gameOver && !game.state.pending && game.state.activePlayer !== viewer,
});

app.addEventListener('click', (e) => {
  // Clicks inside the zoomed card panel don't close it (only its own buttons act).
  const btn = e.target.closest('[data-act]');
  if (btn && !(btn.classList.contains('zoom-overlay') && e.target.closest('[data-stop]'))) return onButton(btn.dataset.act);
  const zoom = e.target.closest('[data-zoom]');
  if (zoom && (screen === 'gallery' || screen === 'builder' || screen === 'menu')) { zoomId = zoom.dataset.zoom; return render(); }
  const swapBtn = e.target.closest('[data-swap]');
  if (swapBtn && screen === 'menu') {
    builderMode = 'swap'; swapFaction = swapBtn.dataset.swap; draftLineup = [...lineupOf(swapFaction, savedLineups())];
    zoomId = null; screen = 'builder'; window.scrollTo(0, 0); return render();
  }
  const cutCard = e.target.closest('[data-cut]');
  if (cutCard && screen === 'builder' && builderMode === 'swap') {
    const id = cutCard.dataset.cut;
    if (isLocked(id)) return flash('Locked. Win matches to unlock new cards (2 per win).');
    draftLineup = draftLineup.includes(id) ? draftLineup.filter((x) => x !== id) : [...draftLineup, id];
    return render();
  }
  if (cutCard && screen === 'builder' && builderMode === 'dupe') {
    const id = cutCard.dataset.cut;
    const need = DEFAULT_RULES.singleFactionDuplicates;
    if (draftDupes.includes(id)) draftDupes = draftDupes.filter((x) => x !== id);
    else if (draftDupes.length >= need) return flash(`You've chosen ${need}. Remove one first.`);
    else draftDupes = [...draftDupes, id];
    return render();
  }
  if (cutCard && screen === 'builder') {
    const id = cutCard.dataset.cut;
    if (draftCuts.includes(id)) draftCuts = draftCuts.filter((x) => x !== id);
    else if (draftCuts.length >= DEFAULT_RULES.cardsCut) return flash(`You've cut ${DEFAULT_RULES.cardsCut}. Put one back first.`);
    else draftCuts = [...draftCuts, id];
    return render();
  }
  const tab = e.target.closest('[data-book]');
  if (tab && screen === 'gallery') {
    if (tab.dataset.book !== bookPage) { bookPage = tab.dataset.book; bookTurned = true; sound.play('draw'); window.scrollTo(0, 0); }
    return render();
  }
  const chip = e.target.closest('[data-faction]');
  if (chip && screen === 'menu') {
    const f = chip.dataset.faction;
    picked = picked.includes(f) ? picked.filter((x) => x !== f) : [...picked, f].slice(-pickNeeded());
    return render();
  }
  // Tapping a corner prop on the board: it hops, flashes and makes its sound.
  const prop = screen === 'game' && e.target.closest('.board-prop');
  if (prop) return pokeProp(prop);
  if (screen !== 'game' || animating) return;
  const s = game.state;
  const legal = getLegalActions(s).filter((a) => !isAI(a.player));

  const myTrap = e.target.closest('.trap-token.mine');
  if (myTrap) return showPreview(myTrap);
  if (e.target.closest('[data-trap-info]')) return flash("A hidden enemy Trap. It goes off by itself when its condition happens, and then you'll see what it was.");
  const qp = e.target.closest('[data-qp]');
  if (qp) return act(legal.filter((a) => a.type === 'quickPlay')[Number(qp.dataset.qp)]);

  const mullCard = e.target.closest('[data-mull]');
  if (mullCard) {
    const uid = Number(mullCard.dataset.mull);
    mullMarked = mullMarked.includes(uid) ? mullMarked.filter((x) => x !== uid) : [...mullMarked, uid];
    return render();
  }

  const choice = e.target.closest('[data-choice]');
  if (choice) return act(legal.find((a) => a.type === 'choose' && a.index === Number(choice.dataset.choice)));
});

function onButton(name) {
  const s = game?.state;
  switch (name) {
    case 'ai': sound.play('click'); return startGame('ai');
    case 'hotseat': sound.play('click'); return startGame('hotseat');
    case 'continue': game = loadSaved(); return game ? enterGame() : render();
    case 'gallery': screen = 'gallery'; zoomId = null; window.scrollTo(0, 0); return render();
    case 'howto': sound.play('click'); markHowToOpened(); screen = 'howto'; window.scrollTo(0, 0); return render();
    case 'closeZoom': zoomId = null; return render();
    case 'unlockOk': if (game) game.unlockSeen = true; sound.play('click'); return render();
    case 'editCuts': builderMode = 'cut'; draftCuts = [...cutsFor(picked)]; zoomId = null; screen = 'builder'; window.scrollTo(0, 0); return render();
    case 'editDupes': builderMode = 'dupe'; draftDupes = [...dupesFor(picked[0])]; zoomId = null; screen = 'builder'; window.scrollTo(0, 0); return render();
    case 'resetDupes': storeDupes(picked[0], null); flash('Using the standard duplicates.'); return render();
    case 'dupeStandard': draftDupes = [...standardDuplicates(picked[0], savedLineups())]; return render();
    case 'dupeClear': draftDupes = []; return render();
    case 'dupeSave': {
      const std = standardDuplicates(picked[0], savedLineups());
      const same = draftDupes.length === std.length && draftDupes.every((id) => std.includes(id));
      storeDupes(picked[0], same ? null : draftDupes);
      flash(same ? 'Saved: standard duplicates.' : 'Deck saved.');
      screen = 'menu';
      return render();
    }
    case 'formatPair': setFormat('pair'); return render();
    case 'formatSingle': setFormat('single'); return render();
    case 'resetCuts': storeCuts(picked, null); flash('Using the standard cut.'); return render();
    case 'cutStandard': draftCuts = standardCuts(picked, savedLineups()); return render();
    case 'swapStandard': draftLineup = [...FACTION_DECKS[swapFaction]]; return render();
    case 'swapSave': {
      const std = FACTION_DECKS[swapFaction];
      const same = draftLineup.length === std.length && draftLineup.every((id) => std.includes(id));
      storeLineup(swapFaction, same ? null : draftLineup);
      flash(same ? `Saved: standard ${swapFaction} cards.` : `Saved your ${swapFaction} cards.`);
      screen = 'menu';
      return render();
    }
    case 'cutClear': draftCuts = []; return render();
    case 'cutSave': {
      const std = standardCuts(picked, savedLineups());
      const same = draftCuts.length === std.length && draftCuts.every((id) => std.includes(id));
      storeCuts(picked, same ? null : draftCuts);
      flash(same ? 'Saved: standard cut.' : 'Deck saved.');
      screen = 'menu';
      return render();
    }
    case 'zoomPrev': zoomId = galleryOrder[Math.max(0, galleryOrder.indexOf(zoomId) - 1)]; return render();
    case 'zoomNext': zoomId = galleryOrder[Math.min(galleryOrder.length - 1, galleryOrder.indexOf(zoomId) + 1)]; return render();
    case 'menu': clearTimeout(aiTimer); drag.cancel(); hidePreview(); if (game?.mode === 'online' || screen === 'online') leaveOnline(); screen = 'menu'; return render();
    case 'online':
      if (!BUILD.online) return;
      sound.play('click');
      if (picked.length !== pickNeeded()) return flash(`Pick ${pickNeeded()} factions.`);
      lobby = { status: 'choose' }; screen = 'online'; window.scrollTo(0, 0);
      connectServer();
      return render();
    case 'acctLogin': acct.tab = 'login'; acct.msg = null; return render();
    case 'acctRegister': acct.tab = 'register'; acct.msg = null; return render();
    case 'signIn': case 'signUp': return submitAccount();
    case 'signOut': srv.logout(); lobby = { status: 'choose' }; return render();
    case 'quickMatch': return queueMatch('quick');
    case 'rankedMatch': return queueMatch('ranked');
    case 'privateMatch': return queueMatch('private');
    case 'cancelQueue': srv.send({ t: 'cancel' }); lobby = { status: 'choose' }; return render();
    case 'leaderboard': connectServer(); return srv.send({ t: 'leaderboard' });
    case 'lobbyBack': lobby = { status: 'choose' }; srv.send({ t: 'me' }); return render();
    case 'deleteAccount': lobby = { status: 'delete' }; return render();
    case 'deleteConfirm': {
      const pass = app.querySelector('#delete-pass')?.value ?? '';
      if (!pass) return flash('Type your password to confirm.');
      return srv.send({ t: 'deleteAccount', password: pass });
    }
    case 'hostOnline': return hostOnline();
    case 'joinOnline': return joinOnline();
    case 'save': return game?.mode === 'online' ? flash("Online games can't be saved.") : save();
    case 'mute': sound.toggleMute(); refreshMusic(); return render();
    case 'settings': return openSettings();
    case 'toggleLog':
      logOpen = !logOpen;
      try { localStorage.setItem(LOG_KEY, logOpen ? '1' : '0'); } catch { /* storage unavailable */ }
      return render();
    case 'rematch':
      if (game.mode === 'online' && game.online?.server) { leaveOnline(); lobby = { status: 'choose' }; screen = 'online'; srv.send({ t: 'me' }); return render(); }
      if (game.mode === 'online') { flash('Host a new online game from the menu.'); leaveOnline(); screen = 'menu'; return render(); }
      return startGame(game.mode, game.factions, game.rivalFactions);
    case 'endTurn': {
      if (!canAct()) return;
      // With plays left, the first click asks "Really end?" (for 3 seconds).
      const moves = getLegalActions(s).some((a) => a.type !== 'endTurn');
      if (moves && endArmed !== s.turn) {
        endArmed = s.turn;
        clearTimeout(endArmTimer);
        endArmTimer = setTimeout(() => { endArmed = null; if (screen === 'game') render(); }, 3000);
        sound.play('click');
        return render();
      }
      endArmed = null;
      return act({ type: 'endTurn', player: s.activePlayer });
    }
    case 'concede': if (!s?.gameOver) { concedeAsk = true; render(); } return;
    case 'concedeNo': concedeAsk = false; return render();
    case 'concedeYes': concedeAsk = false; return concede();
    case 'pass': return act({ type: 'pass', player: s.pending.player });
    case 'mullConfirm': {
      const replace = [...mullMarked].sort((a, b) => a - b);
      mullMarked = [];
      return act({ type: 'mulligan', player: s.pending.player, replace });
    }
    case 'reveal': handoff = false; viewer = actingPlayer(s); return render();
  }
}

document.addEventListener('keydown', (e) => {
  if ((screen === 'gallery' || screen === 'builder' || screen === 'menu') && zoomId) {
    if (e.key === 'Escape') onButton('closeZoom');
    if (e.key === 'ArrowLeft') onButton('zoomPrev');
    if (e.key === 'ArrowRight') onButton('zoomNext');
  }
});

const layoutKey = () => `${paintedBoards()}|${portraitLayout()}`;
let wideBoard = layoutKey();
window.addEventListener('resize', () => {
  if (screen !== 'game') return;
  // Switching between the painted 16:9 board, the drawn table and the portrait layout needs a fresh render.
  if (layoutKey() !== wideBoard) { wideBoard = layoutKey(); if (!animating) return render(); }
  layoutPortraitBoard(app);
  layoutHands(app);
  fitAllText(app);
});

applySettings();
render();

// iPhone: inside a match, a finger drag must never scroll or bounce the page
// (or the itch.io page around it), and must never start the system's
// drag-an-image-out-of-the-app gesture. Outside a match, pages scroll normally.
document.addEventListener('touchmove', (e) => { if (screen === 'game') e.preventDefault(); }, { passive: false });
document.addEventListener('dragstart', (e) => e.preventDefault());
// Older browsers without overflow: clip: if anything scrolls the arena, put it straight back
// (a scrolled arena lifts every piece off the painted board).
document.addEventListener('scroll', (e) => {
  const el = e.target;
  if (el instanceof Element && (el.classList.contains('arena') || el.id === 'board-layer') && (el.scrollTop || el.scrollLeft)) {
    el.scrollTop = 0;
    el.scrollLeft = 0;
  }
}, true);

// Debugging aid (browser console): the live game and UI flags.
window.__shattered = () => ({ game, animating, remoteQueue, viewer, screen, act, chooseAction, actingPlayer, render, hash: net.stateHash });
