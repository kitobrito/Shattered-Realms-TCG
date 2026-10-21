// Browser UI: menu, collection, deck builder, and the action loop for the
// battle screen. The UI only reads state and submits actions from
// getLegalActions(), so every rule lives in the engine.

import { applyAdvantage, chooseAction } from '../ai/smart.js';
import { buildDeck, buildSingleDeck, FACTION_DECKS, FACTION_LISTS, FACTION_POOLS, hasExtras, lineupOf, PLAYABLE_FACTIONS, standardCuts } from '../cards/index.js';
import { costOf, effectiveAttack, findCharacter, hasKeyword, manaFor } from '../engine/core.js';
import { ART, HERO_ART } from '../cards/art-manifest.js';
import { artSrc, ensureArt } from './art-packs.js';
import { boardArtFor } from '../cards/board-art.js';
import { AI_SPEEDS, applySettings, closeSettings, difficultySliderHTML, getSettings, openSettings, setSetting } from './settings.js';
import { clearTips, HOWTO_PAGES, howToOpened, howToPlayHTML, markHowToOpened, tip } from './tutorial.js';
import { actingPlayer, applyAction, createGame, fusionFor, getLegalActions, legalMatch } from '../engine/engine.js';
import { checkDeck, deckProblem } from '../cards/deck-check.js';
import { premadeDecks } from '../cards/premade-decks.js';
import { allCards, getCard, restoreCustomCards } from '../engine/registry.js';
import { DEFAULT_RULES, FACTIONS, KEYWORD_TEXT, LAUNCH_FACTIONS } from '../engine/rules.js';
import { boardHTML, layoutHands, layoutPortraitBoard, paintedBoards, portraitLayout, crackTier } from './board.js';
import { canPokeBoard, hideBoard, pokeBoard, resetDescentBoard, showBoard } from './board-layer.js';
import { startCircleFx } from './circle-fx.js';
import * as drag from './drag.js';
import * as fx from './fx.js';
import { layoutPagers, pageOf, setPage, showCard, turnPage } from './pager.js';
import * as mfx from './menu-fx.js';
import { artOf, backArtOf, backsOf, bigCardHTML, icon, cardHTML, cardTerms, esc, FACTION_ICONS, fitAllText, fusionHeroPath, heroArtOf, livingPortraitHTML, playerHeroArt, playerHeroPath, playerPortraitHTML, rankBadgeHTML, rankProgressHTML, youText } from './shared.js';
import { EMOTE_KINDS, EMOTE_LABELS, emoteLine } from '../cards/emotes.js';
import { DECK_TYPES, EXPANSION_NAMES, FACTION_INFO, synergyFor } from '../cards/faction-info.js';
import * as sound from './sound.js';
import { music, refreshMusic } from './music.js';
import * as net from './net.js';
import * as srv from './server-link.js';
import { BUILD } from '../build.js';
import { awardUnlocks, isLocked, lockedCount, UNLOCKS_PER_WIN, unlockPopupHTML } from './unlocks.js';
import { availableFactions, chooseFirstRealms, FIRST_PICKS, firstTime, heroRevealed, journeyDone, needsFirstPick, pairUnlocked, progressLine, recordMatch, revealHero, STARTERS, starterDeck, starterMode, unlockEverything } from './journey.js';

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
let zoomArt = false;       // showing the zoomed card's full, uncropped art
let zoomBeast = false;     // Lycanthropes: the full-size view is showing the Beast Form side
let mullMarked = [];       // mulligan: hand uids marked to swap
let galleryOrder = [];     // card ids in collection order (for arrow-key paging)
let history = [];          // play-history strip entries
let undoStack = [];        // vs the AI: snapshots to take back your own moves this turn
let recap = null;          // what the opponent did on their last turn (shown as your turn starts)
let recapFrom = 0;         // history index where the opponent's turn began
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

// ---- Two-faction decks: choose your 40 ---------------------------------------------
// A saved deck is a list of 40 card ids (a card listed twice is played twice). Without
// one, the recommended deck is used: the standard 20 from each faction (or the player's
// older saved cut, so nobody loses a deck they built before).
const DECKS_KEY = 'faction-ccg-decks';
function savedDecks() {
  try { return JSON.parse(localStorage.getItem(DECKS_KEY) ?? '{}'); } catch { return {}; }
}
// One faction: its recommended 30. Two: the standard 20 from each.
const recommendedDeck = (factions) => (factions.length === 1 ? buildSingleDeck(factions[0], savedLineups()) : buildDeck(factions, cutsFor(factions), savedLineups()));
function customDeckFor(factions) {
  const d = savedDecks()[pairKey(factions)];
  if (!Array.isArray(d)) return null;
  const pool = new Set(factions.flatMap((f) => FACTION_POOLS[f]));
  return d.every((id) => pool.has(id) && !isLocked(id)) && !deckProblem(factions, d) ? d : null;
}
const pairDeckFor = (factions) => customDeckFor(factions) ?? recommendedDeck(factions);
function storeDeck(factions, deck) {
  const all = savedDecks();
  if (deck) all[pairKey(factions)] = deck; else delete all[pairKey(factions)];
  try { localStorage.setItem(DECKS_KEY, JSON.stringify(all)); } catch { flash('Could not save your deck.'); }
}
// Named decks: several saved decks per faction pair (or single faction). Loading one into the
// builder and pressing Save deck makes it the deck you play.
const SLOTS_KEY = 'faction-ccg-deckslots';
function allSlots() { try { return JSON.parse(localStorage.getItem(SLOTS_KEY) ?? '{}'); } catch { return {}; } }
const deckSlots = (factions) => (Array.isArray(allSlots()[pairKey(factions)]) ? allSlots()[pairKey(factions)] : []);
function storeSlots(factions, list) {
  const all = allSlots();
  all[pairKey(factions)] = list;
  try { localStorage.setItem(SLOTS_KEY, JSON.stringify(all)); } catch { flash('Could not save your decks.'); }
}
const sameDeck = (a, b) => a.length === b.length && [...a].sort().join() === [...b].sort().join();
// The decks you can pick for these factions: the premade decks (Classic, Expansion), then your saved ones.
const deckChoices = (factions) => [
  ...premadeDecks(factions).map((d) => ({ ...d, mine: false })),
  ...deckSlots(factions).map((d) => ({ name: d.name, deck: d.deck, blurb: 'One of your saved decks.', mine: true })),
];
const lockedIn = (deck) => [...new Set(deck.filter(isLocked))];
// The deck builder's complaint about a deck: locked cards first, then the deck rules.
function builderProblem(factions, deck) {
  const locked = lockedIn(deck);
  if (locked.length) return `${locked.length} locked card${locked.length === 1 ? '' : 's'} in your deck: click ${locked.length === 1 ? 'it' : 'one'} in the list to swap it for a card you own, or remove ${locked.length === 1 ? 'it' : 'them'}.`;
  return deckProblem(factions, deck);
}
let replaceFor = null; // deck builder: the locked card whose replacements are showing
let draftDeck = null; // deck builder: { cardId: copies }
const deckSizeFor = (factions) => (factions.length === 1 ? DEFAULT_RULES.singleDeckSize : DEFAULT_RULES.pairDeckSize);
const countsOf = (deck) => deck.reduce((m, id) => ({ ...m, [id]: (m[id] ?? 0) + 1 }), {});
const deckOf = (counts) => Object.entries(counts).flatMap(([id, n]) => Array(n).fill(id));

// 'pair' = two factions, choose 40. 'single' = one faction, choose 30.
const FORMAT_KEY = 'faction-ccg-format';
let format = (() => { try { return localStorage.getItem(FORMAT_KEY) === 'single' ? 'single' : 'pair'; } catch { return 'pair'; } })();
let builderMode = 'cut';   // which deck builder is open: 'cut' (build your deck) or 'swap' (lineup)

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
const deckFor = (factions, mine) => (starterMode() && factions.length === 1 ? starterDeck(factions[0])
  : mine ? pairDeckFor(factions) : format === 'single' ? buildSingleDeck(factions[0]) : buildDeck(factions));

// New players (journey.js): one faction and only the realms opened so far.
function applyJourney() {
  if (!pairUnlocked() && format !== 'single') { otherPick[format] = picked; format = 'single'; picked = picked.slice(0, 1); }
  const open = availableFactions();
  picked = picked.filter((f) => open.includes(f));
  if (!picked.length) picked = open.slice(0, pickNeeded());
}
let milestone = null; // what the last match opened up, shown on the menu
let firstPicks = [];   // a brand-new player's choice of first realms (before they're saved)

// The opponent gets a random pair of playable factions.
function randomPick() {
  const pool = [...availableFactions()];
  const out = [];
  while (out.length < pickNeeded()) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  return out;
}

function startGame(mode, factions = picked, rivalFactions = randomPick()) {
  if (needsFirstPick()) return render(); // choose your first realms first
  applyJourney();
  if (factions !== picked && factions.some((f) => !availableFactions().includes(f))) factions = picked;
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
  // A new match starts at the surface (a resumed one jumps straight to its circle).
  resetDescentBoard();
  pCircle?.ctl?.stop(); pCircle = null;
  endArmed = null;
  concedeAsk = false;
  restoreCustomCards(game.state); // Hybrids etc. from a saved game
  screen = 'game';
  history = [];
  undoStack = []; recap = null; recapFrom = 0;
  drag.cancel();
  viewer = game.mode !== 'hotseat' ? humanSeat() : actingPlayer(game.state);
  handoff = false;
  heroesShattered = !!game.state.gameOver;
  turnTimer = { key: null };
  if (!isNew) { render(); scheduleAI(); return; }
  animating = true; // nothing moves until the intro is over
  render();
  showLoader().then(fuseHeroes).then(playIntro).finally(() => { animating = false; render(); scheduleAI(); });
}

// Old saves predate random seats: the human was always seat 0.
const humanSeat = () => game?.human ?? 0;

// ---- Hero fusion: a two-faction deck's heroes collide and fuse into its pair's hero -------
// Plays as a match starts (before the versus screen and the mulligan) when your pair has a
// fused portrait: the two heroes fly in, charge up with arcing lightning and streams of
// sparks, smash together in a white-hot flash and shockwaves, and the fused hero rises out
// of the light. A tap skips it. Returns the finished scene (still on screen) for the versus
// screen to cover, so the board never flashes between the two.
// `behind`: the match loader, still up; it goes once this scene covers it (or is handed on).
async function fuseHeroes(behind = null) {
  const pl = game.state.players[humanSeat()];
  const fused = playerHeroArt(pl.factions);
  const [fa, fb] = pl.factions;
  if (pl.factions.length !== 2 || !fusionHeroPath(pl.factions) || !heroArtOf(fa) || !heroArtOf(fb)) return behind;
  const ca = fx.factionColor(fa), cb = fx.factionColor(fb);
  const first = revealHero(pl.factions); // the menu shows "?" until now
  const el = document.createElement('div');
  el.className = `hero-fuse ${first ? 'first' : ''}`;
  el.style.setProperty('--ca', ca);
  el.style.setProperty('--cb', cb);
  const hero = (f, cls) => `<div class="hf-hero ${cls}"><span class="hf-face"><img src="${heroArtOf(f)}" alt=""></span><b>${esc(f)}</b></div>`;
  el.innerHTML = `<div class="hf-veil"></div><div class="hf-rays"></div><div class="hf-core"></div>
    <svg class="hf-arcs" aria-hidden="true"><polyline class="a"/><polyline class="b"/><polyline class="c"/></svg>
    ${hero(fa, 'a')}${hero(fb, 'b')}
    <div class="hf-result"><i class="hf-ring"></i><i class="hf-ring two"></i><span class="hf-face">${livingPortraitHTML(fused)}</span></div>
    <div class="hf-title"><small>${esc(fa)} <i>✦</i> ${esc(fb)}</small><span>${first ? 'A new hero awakens' : 'Your hero awakens'}</span><em>Two realms. One hero.</em></div>
    <div class="hf-white"></div><p class="hf-skip">Tap to skip</p>`;
  fx.layer().appendChild(el);
  behind?.remove();
  const q = (sel) => el.querySelector(sel);
  const A = q('.hf-hero.a'), B = q('.hf-hero.b');
  let skipped = false, skip;
  const skipP = new Promise((r) => { skip = r; });
  el.addEventListener('pointerdown', () => { skipped = true; skip(); });
  const SKIP = {};
  const step = async (p) => { await Promise.race([p, skipP]); if (skipped) throw SKIP; };
  const timers = [];
  const every = (ms, fn) => { const t = setInterval(fn, ms); timers.push(t); return t; };
  const mid = (node) => { const r = node.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, r }; };
  // Jagged lightning between the two heroes, redrawn every frame or two.
  const arcs = [...el.querySelectorAll('.hf-arcs polyline')];
  const drawArcs = (on = true) => {
    const a = mid(A.querySelector('.hf-face')), b = mid(B.querySelector('.hf-face'));
    for (const [i, line] of arcs.entries()) {
      if (!on) { line.setAttribute('points', ''); continue; }
      const pts = [], n = 9, jag = Math.min(60, Math.abs(b.x - a.x) * 0.12);
      for (let k = 0; k <= n; k++) {
        const t = k / n, edge = k === 0 || k === n;
        pts.push(`${a.x + (b.x - a.x) * t + (edge ? 0 : (Math.random() - 0.5) * jag * 0.5)},${a.y + (b.y - a.y) * t + (edge ? 0 : (Math.random() - 0.5) * jag * (i + 1) * 0.7)}`);
      }
      line.setAttribute('points', pts.join(' '));
    }
  };
  // Sparks streaming off each hero into the core.
  const stream = (from, color) => {
    const a = mid(from.querySelector('.hf-face')), c = mid(q('.hf-core'));
    const sp = document.createElement('i');
    sp.className = 'hf-spark';
    sp.style.background = color;
    sp.style.boxShadow = `0 0 10px 3px ${color}`;
    const ang = Math.random() * Math.PI * 2, rad = a.r.width * 0.45;
    const sx = a.x + Math.cos(ang) * rad, sy = a.y + Math.sin(ang) * rad;
    Object.assign(sp.style, { left: `${sx}px`, top: `${sy}px` });
    el.appendChild(sp);
    const bend = (Math.random() - 0.5) * 160;
    fx.animate(sp, [
      { transform: 'translate(-50%, -50%) scale(1.3)', opacity: 0 },
      { transform: `translate(calc(-50% + ${(c.x - sx) * 0.5}px), calc(-50% + ${(c.y - sy) * 0.5 + bend}px)) scale(1)`, opacity: 1, offset: 0.45 },
      { transform: `translate(calc(-50% + ${c.x - sx}px), calc(-50% + ${c.y - sy}px)) scale(0.3)`, opacity: 0.2 },
    ], { duration: 520 + Math.random() * 260, easing: 'cubic-bezier(.5,0,.9,.6)' }).then(() => sp.remove());
  };
  const clamp = (n) => Math.max(1, Math.min(4, n));
  try {
    // 1. Darkness falls; the two heroes fly in from the edges.
    sound.play('whoosh');
    await step(Promise.all([
        fx.animate(A, [{ transform: 'translate(calc(-50% - 70vw), -50%) rotate(-20deg)', opacity: 0 }, { transform: 'translate(calc(-50% - var(--gap)), -50%)', opacity: 1 }], { duration: 750, easing: 'cubic-bezier(.15,.9,.3,1.1)' }),
      fx.animate(B, [{ transform: 'translate(calc(-50% + 70vw), -50%) rotate(20deg)', opacity: 0 }, { transform: 'translate(calc(-50% + var(--gap)), -50%)', opacity: 1 }], { duration: 750, easing: 'cubic-bezier(.15,.9,.3,1.1)' }),
    ]));
    fx.screenShake(el, 6);
    sound.play('minionLand');
    await step(fx.wait(250));
    // 2. They charge: lightning arcs between them, sparks pour into a swelling core, they creep together, shaking.
    el.classList.add('charging');
    sound.play('beam');
    every(55, () => drawArcs());
    every(45, () => { stream(A, ca); stream(B, cb); });
    const CHARGE = 1700;
    const shake = (side) => Array.from({ length: 13 }, (_, k) => {
      const t = k / 12, j = 2 + t * 9;
      const dx = `calc(-50% ${side} var(--gap) * ${1 - t * 0.45} + ${((k % 2) * 2 - 1) * j}px)`;
      return { transform: `translate(${dx}, calc(-50% + ${((k % 3) - 1) * j}px)) scale(${1 + t * 0.06})` };
    });
    fx.animate(q('.hf-core'), [{ transform: 'translate(-50%, -50%) scale(0.1)', opacity: 0 }, { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 }], { duration: CHARGE, easing: 'ease-in' });
    fx.animate(q('.hf-rays'), [{ opacity: 0, transform: 'translate(-50%, -50%) scale(0.6) rotate(0deg)' }, { opacity: 0.9, transform: 'translate(-50%, -50%) scale(1) rotate(60deg)' }], { duration: CHARGE, easing: 'ease-in' });
    setTimeout(() => !skipped && sound.play('rumble'), 500 * fx.speedFactor());
    await step(Promise.all([
      fx.animate(A, shake('-'), { duration: CHARGE, easing: 'linear' }),
      fx.animate(B, shake('+'), { duration: CHARGE, easing: 'linear' }),
    ]));
    // 3. Collision.
    sound.play('whoosh');
    for (const name of el.querySelectorAll('.hf-hero b')) fx.animate(name, [{ opacity: 1 }, { opacity: 0 }], { duration: 150 });
    await step(Promise.all([
      fx.animate(A, [{ transform: 'translate(calc(-50% - var(--gap) * 0.55), -50%) scale(1.06)', filter: 'brightness(1)' }, { transform: 'translate(-50%, -50%) scale(0.7)', filter: 'brightness(4) saturate(0)' }], { duration: 260, easing: 'cubic-bezier(.7,0,1,.6)' }),
      fx.animate(B, [{ transform: 'translate(calc(-50% + var(--gap) * 0.55), -50%) scale(1.06)', filter: 'brightness(1)' }, { transform: 'translate(-50%, -50%) scale(0.7)', filter: 'brightness(4) saturate(0)' }], { duration: 260, easing: 'cubic-bezier(.7,0,1,.6)' }),
    ]));
    timers.forEach(clearInterval);
    drawArcs(false);
    el.classList.remove('charging');
    el.classList.add('impact');
    A.style.opacity = B.style.opacity = '0';
    sound.play('bigHit');
    sound.play('versus');
    fx.animate(q('.hf-white'), [{ opacity: 1 }, { opacity: 0 }], { duration: 900, easing: 'ease-out' });
    fx.screenShake(el, 18);
    const core = q('.hf-core').getBoundingClientRect();
    const ring = new DOMRect(core.left - core.width, core.top - core.height, core.width * 3, core.height * 3);
    fx.shockwave(ring, ca);
    setTimeout(() => fx.shockwave(ring, cb), 140 * fx.speedFactor());
    setTimeout(() => fx.shockwave(ring, '#fff6d8'), 280 * fx.speedFactor());
    fx.particles(core, fa, clamp(8));
    fx.particles(core, fb, clamp(8));
    fx.animate(q('.hf-core'), [{ transform: 'translate(-50%, -50%) scale(1)', opacity: 1 }, { transform: 'translate(-50%, -50%) scale(2.6)', opacity: 0 }], { duration: 700, easing: 'ease-out' });
    // 4. The fused hero rises out of the light.
    await step(Promise.all([
      fx.animate(q('.hf-result'), [
        { transform: 'translate(-50%, -50%) scale(1.7)', opacity: 0, filter: 'brightness(5) blur(12px)' },
        { transform: 'translate(-50%, -50%) scale(0.94)', opacity: 1, filter: 'brightness(1.6) blur(0)', offset: 0.6 },
        { transform: 'translate(-50%, -50%) scale(1)', opacity: 1, filter: 'brightness(1) blur(0)' },
      ], { duration: 1000, easing: 'cubic-bezier(.2,.8,.3,1)' }),
      fx.animate(q('.hf-rays'), [{ opacity: 0.9, transform: 'translate(-50%, -50%) scale(1) rotate(60deg)' }, { opacity: 0.75, transform: 'translate(-50%, -50%) scale(1.5) rotate(110deg)' }], { duration: 1000, easing: 'ease-out' }),
    ]));
    el.classList.add('revealed');
    q('.hf-rays').animate([{ transform: 'translate(-50%, -50%) scale(1.5) rotate(110deg)', opacity: 0.75 }, { transform: 'translate(-50%, -50%) scale(1.5) rotate(470deg)', opacity: 0.75 }], { duration: 16000, iterations: Infinity });
    sound.play('spell');
    sound.play('chime');
    await step(fx.animate(q('.hf-title'), [{ opacity: 0, transform: 'translate(-50%, 16px) scale(0.9)', letterSpacing: '0.4em' }, { opacity: 1, transform: 'translate(-50%, 0) scale(1)' }], { duration: 600, easing: 'cubic-bezier(.2,.8,.3,1)' }));
    await step(fx.wait(1700));
  } catch (err) {
    el.remove();
    if (err !== SKIP) throw err;
    return null;
  } finally {
    timers.forEach(clearInterval);
  }
  return el;
}

// ---- Intro: versus screen, then the coin flip ---------------------------------------

async function playIntro(behind = null) {
  const s = game.state;
  const hs = humanSeat();
  const side = (pl, cls) => {
    const art = playerHeroArt(pl.factions);
    return `<div class="intro-side ${cls}">
      <div class="intro-portrait">${art ? playerPortraitHTML(pl.factions) : `<span>${FACTION_ICONS[pl.factions[0]] ?? '✦'}</span>`}</div>
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
    // Coming from the hero fusion: fade in over it, then clear it away.
    if (behind) fx.animate(el, [{ opacity: 0 }, { opacity: 1 }], { duration: 350 }).then(() => behind.remove());
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
    behind?.remove();
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
// It's your move but the last one is still animating: you may already pick up your next card.
function canPlan() {
  const s = game?.state;
  if (screen !== 'game' || !s || s.gameOver || handoff || !animating) return false;
  if (isAI(actingPlayer(s)) || (game.mode !== 'hotseat' && actingPlayer(s) !== viewer)) return false;
  return !s.pending;
}

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

// Marked Prey: a constant thin stream of blood mist from each Prey to every Shark hunting it
// (to the hunter's Hero if it has no Sharks out). Re-measured a few times a second, so it
// follows minions as they move and vanishes as soon as either end is gone.
function updatePreyStreams() {
  const s = game?.state;
  if (screen !== 'game' || !s || s.gameOver || document.hidden) return fx.preyStreams([]);
  const links = [];
  for (const pl of s.players) for (const m of pl.board) {
    if (!m.prey || m.health <= 0) continue;
    const from = charEl(m.uid)?.getBoundingClientRect();
    if (!from?.width) continue;
    const hunter = s.players[1 - m.controller];
    if (!hunter.factions?.includes('Sharks')) continue;
    const sharks = hunter.board.filter((x) => x.health > 0 && (x.tribes ?? []).includes('Shark'));
    const targets = sharks.length ? sharks.map((x) => x.uid) : [hunter.hero.uid];
    for (const t of targets) {
      const to = charEl(t)?.getBoundingClientRect();
      if (to?.width) links.push({ key: `${m.uid}>${t}`, from, to });
    }
  }
  fx.preyStreams(links);
}
setInterval(updatePreyStreams, 150);

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
  // The numbers shown on the gems (a Hero's Health gem shows Health; Armor sits beside it).
  const shown = new Map();
  for (const pl of s.players) for (const c of [pl.hero, ...pl.board]) shown.set(c.uid, { atk: effectiveAttack(c), hp: c.health, armor: c.armor ?? 0 });
  // Sharks / Acidic: Marked Prey, Corrosion and Acid-coated, to animate what changed.
  const prey = new Set(), corrosion = new Map(), coated = new Set();
  for (const pl of s.players) for (const m of pl.board) {
    if (m.prey) prey.add(m.uid);
    if (m.acidCoated) coated.add(m.uid);
    corrosion.set(m.uid, m.corrosion ?? 0);
  }
  const me = s.players[viewer];
  return {
    health, attack, ctrl, factionOf, nameOfUid, prey, corrosion, coated, shown,
    myHealth: s.players[viewer].hero.health,
    hand: new Set(me.hand.map((c) => c.uid)),
    oppHand: s.players[1 - viewer].hand.length,
    oppDeck: s.players[1 - viewer].deck.length,
    myDeck: me.deck.length,
    mana: { ...me.mana },
    fusionCharge: me.fusion?.charge ?? 0,
    active: s.activePlayer,
    turn: s.turn,
    logLen: s.log.length,
    beyond: new Set((s.beyond ?? []).map((e) => e.minion.uid)),
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
  if (action.type === 'transform') {
    const m = findCharacter(s, action.minion);
    const into = getCard(getCard(m.cardId).beastForm ?? getCard(m.cardId).humanForm);
    return { cardId: into.id, mine, icon: '🌕', text: `${pl.name}'s ${into.name} transformed into its ${into.form === 'beast' ? 'Beast' : 'Humanoid'} Form.` };
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
  if (action.type === 'transform') return 'Lycanthropes';
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
// The Fusion cinematic: both realms' crests fly in from the sides, collide in a burst, and the
// Fusion card rises from the light under its name. The first one you ever cast lingers.
async function fusionCinematic(card, player) {
  const first = player === viewer && firstTime('fusion-cast');
  const [a, b] = card.fusion;
  const who = player === viewer && game.mode !== 'hotseat' ? 'Your' : `${esc(game.state.players[player].name)}'s`;
  const el = document.createElement('div');
  el.className = `fx-fusion ${first ? 'first' : ''}`;
  const crest = (f, side) => `<i class="ff-crest ${side}" style="${backArtOf(f) ? `background-image:url('${backArtOf(f)}')` : ''}"><b>${esc(f)}</b></i>`;
  el.innerHTML = `<div class="ff-veil"></div>${crest(a, 'left')}${crest(b, 'right')}<div class="ff-burst"></div>
    <div class="ff-title"><small>${who} Fusion</small>${esc(card.name)}${first ? '<em>Two realms. One power.</em>' : ''}</div>
    <div class="ff-card">${bigCardHTML(card)}</div>`;
  fx.layer().appendChild(el);
  fitAllText(el);
  sound.play('versus');
  const L = el.querySelector('.ff-crest.left'), R = el.querySelector('.ff-crest.right');
  const rush = { duration: first ? 900 : 600, easing: 'cubic-bezier(.5,0,.8,.6)' };
  await Promise.all([
    fx.animate(el.querySelector('.ff-veil'), [{ opacity: 0 }, { opacity: 1 }], { duration: 300 }),
    fx.animate(L, [{ transform: 'translate(-60vw, -50%) rotate(-30deg)', opacity: 0 }, { transform: 'translate(-50%, -50%) rotate(0)', opacity: 1 }], rush),
    fx.animate(R, [{ transform: 'translate(60vw, -50%) rotate(30deg)', opacity: 0 }, { transform: 'translate(-50%, -50%) rotate(0)', opacity: 1 }], rush),
  ]);
  sound.play('bigHit');
  L.style.opacity = R.style.opacity = '0';
  fx.animate(el.querySelector('.ff-burst'), [{ opacity: 1, transform: 'translate(-50%, -50%) scale(0.2)' }, { opacity: 0, transform: 'translate(-50%, -50%) scale(3.2)' }], { duration: 700, easing: 'ease-out' });
  await Promise.all([
    fx.animate(el.querySelector('.ff-card'), [{ opacity: 0, transform: 'translate(-50%, -40%) scale(0.4) rotateY(90deg)' }, { opacity: 1, transform: 'translate(-50%, -50%) scale(1) rotateY(0)' }], { duration: 600, easing: 'cubic-bezier(.2,.8,.3,1.2)' }),
    fx.animate(el.querySelector('.ff-title'), [{ opacity: 0, transform: 'translate(-50%, 20px)' }, { opacity: 1, transform: 'translate(-50%, 0)' }], { duration: 500, easing: 'ease-out' }),
  ]);
  sound.play('spell');
  await fx.wait(first ? 2600 : 1200);
  await fx.animate(el, [{ opacity: 1 }, { opacity: 0 }], { duration: 350 });
  el.remove();
}

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
  // AI turn speed: the computer's moves (and its reactions) can play out faster than yours.
  fx.setBoost(game.mode === 'ai' && isAI(action.player) ? (AI_SPEEDS[getSettings().aiSpeed] ?? 1) : 1);
  if (!isAI(action.player)) recap = null; // the recap closes once you start playing
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
      const striker = findCharacter(s, action.attacker);
      lunged = await fx.lunge(charEl(action.attacker), charEl(action.defender), {
        power: striker ? effectiveAttack(striker) : 2, color: fx.factionColor(before.srcFaction), table: app.querySelector('.arena'),
        style: striker?.kind === 'minion' ? before.srcFaction : null,
      });
    } else if (action.type === 'transform') {
      // Lycanthropes: the minion shudders in a flash of moonlight as it changes shape.
      sound.play('growl');
      const el = charEl(action.minion);
      if (el) { el.classList.add('shifting'); await new Promise((r) => setTimeout(r, 520)); }
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
    } else if (playedCard?.fusion) {
      // A Fusion: the two realms' crests rush together and the Fusion is born (longer the first time).
      await fusionCinematic(playedCard, action.player);
    } else if (playedCard) {
      sound.play(playedCard.type === 'minion' ? 'cardPlay' : playedCard.type === 'trap' ? 'trapSet' : 'spell');
      const hidden = playedCard.type === 'trap' && action.player !== viewer;
      // Spells from the hand get a flourish: the card spins to the middle, bursts, and the magic flies on.
      const flourish = playedCard.type === 'spell' && action.type === 'play';
      const spellTarget = action.target != null ? charEl(action.target) : null;
      if (action.player !== viewer && !hidden) {
        await revealPlayed(playedCard.id);
        if (flourish) await fx.castFlourish(null, null, before.srcFaction, spellTarget);
      } else if (flourish) {
        const from = meta.from && document.body.contains(meta.from) ? meta.from.getBoundingClientRect() : null;
        if (meta.from) meta.from.style.visibility = 'hidden';
        await fx.castFlourish(bigCardHTML(playedCard), from, before.srcFaction, spellTarget);
      } else if (meta.from && !meta.dropped && document.body.contains(meta.from)) {
        const target = playedCard.type === 'minion' ? app.querySelector('.board.me') : app.querySelector('.midline');
        if (target) await fx.fly(meta.from, meta.from.getBoundingClientRect(), target.getBoundingClientRect(), { duration: 260, fade: true, scale: 0.6 });
      }
      // A targeted spell (a Hero Spell here: hand spells already flew) flies at its target as a bolt in its faction's colour.
      if (!flourish && playedCard.type === 'spell' && action.target != null && charEl(action.target)) {
        const from = action.type === 'heroSpell' ? app.querySelector(`[data-hs="${action.card}"]`) : charEl(s.players[action.player].hero.uid);
        await fx.bolt(from, charEl(action.target), fx.factionColor(before.srcFaction));
      }
    } else if (action.type === 'endTurn') {
      sound.play('click');
    }
  } catch { /* animation failures never block the game */ }

  // ---- Apply.
  const actorBefore = actingPlayer(s);
  // Undo (vs the AI only): remember the game as it was before this move of yours.
  const snap = game.mode === 'ai' && !meta.remote && !isAI(action.player) && s.activePlayer === action.player && !s.pending
    && action.type !== 'endTurn' ? { state: structuredClone(s), history: history.length, stats: structuredClone(game.stats ?? null) } : null;
  const deckBefore = s.players[action.player]?.deck.length;
  const turnBefore = s.activePlayer;
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
  // A move that drew a card (new information) or ended the turn can't be taken back.
  if (snap && s.players[action.player].deck.length === deckBefore && !s.gameOver) undoStack = [...undoStack, snap].slice(-10);
  else undoStack = [];
  // Turn recap: when the opponent's turn ends and yours begins, sum up what they did.
  if (turnBefore !== s.activePlayer && game.mode !== 'hotseat') {
    if (s.activePlayer === viewer) {
      const theirs = history.slice(recapFrom).filter((h) => !h.mine);
      recap = theirs.length ? { lines: theirs.map((h) => youText(h.text)).slice(-8), more: Math.max(0, theirs.length - 8), at: Date.now() } : null;
      if (recap) { const mine = recap; setTimeout(() => { if (recap === mine) { recap = null; if (screen === 'game' && !animating) render(); } }, 8000); }
    } else { recapFrom = history.length - (entry ? 1 : 0); recap = null; }
  }
  for (const line of s.log.slice(before.logLen)) {
    const m = /^Trap revealed: (.+)!$/.exec(line.msg);
    if (m) {
      const card = allCards().find((c) => c.name === m[1]);
      if (card) history.push({ cardId: card.id, mine: s.players[viewer].graveyard.some((g) => g.cardId === card.id), icon: '!', text: `Trap revealed: ${card.name}!` });
    }
  }
  if (history.length > 40) { recapFrom = Math.max(0, recapFrom - (history.length - 40)); history = history.slice(-40); }
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
  const nowBeyond = new Set((s.beyond ?? []).map((e) => e.minion.uid));
  for (const [uid, old] of oldMinions) {
    // Displaced: it slips through a portal Beyond Reality rather than dying.
    if (!charEl(uid) && nowBeyond.has(uid)) { jobs.push(fx.portalOut(old.clone, old.rect, before.factionOf.get(uid))); sound.play('spell'); continue; }
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
      // The fallen minion goes its own faction's way where it has one; otherwise it shatters away from the blow.
      jobs.push(fx.themedDeath(old.clone, old.rect, before.factionOf.get(uid)) ?? fx.shatterCard(old.clone, old.rect, fromRect, fx.shatterModeFor(killerFaction)));
      fx.screenShake(app.querySelector('.arena') ?? app, Math.min(16, 5 + power * 1.4));
      fx.deathFx(old.rect, before.factionOf.get(uid));
    } else {
      jobs.push(fx.themedDeath(old.clone, old.rect, before.factionOf.get(uid)) ?? fx.deathGhost(old.clone, old.rect));
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
      if (before.beyond.has(m?.uid)) { jobs.push(fx.portalIn(el, card?.faction)); continue; }
      if (card && card.cost >= 7) { bigEntrance = true; jobs.push(fx.entrance(el, esc(card.name), card.faction)); }
      else jobs.push(fx.arrival(el, card?.faction, app.querySelector('.arena')));
    }
    else if (Number(el.dataset.char) !== action.attacker) moving.add(key);
  }
  if (summoned) sound.play(bigEntrance ? 'bigHit' : 'minionLand');
  if (bigEntrance) jobs.push(fx.screenShake(app.querySelector('.arena') ?? app, 10));
  jobs.push(fx.flip(app, rects, moving));

  // Damage and healing numbers.
  const burnHits = new Set(newLog.map((l) => /^🔥 Burn deals \d+ to (.+)\.$/.exec(l)?.[1]).filter(Boolean));
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
      // End-of-turn Burn: the flames flare up on whatever they scorch.
      if (delta < 0 && burnHits.has(c.kind === 'hero' ? pl.name : getCard(c.cardId).name)) jobs.push(fx.burnTick(r, -delta));
      if (delta < 0) {
        // Bigger hits shake harder and throw more debris.
        hurt = true;
        biggest = Math.max(biggest, -delta + (c.kind === 'hero' ? 1 : 0));
        if (c.kind === 'hero') {
          jobs.push(fx.shake(el, 4 + -delta * 1.5));
          jobs.push(fx.heroHit(el.querySelector('.portrait-img') ?? el));
          jobs.push(fx.heroWince(el, -delta));
        }
        // In a fight, each side is hit in the style of whoever struck it (the defender strikes back too).
        let striker = null;
        if (action.type === 'attack' && c.uid === action.defender) striker = action.attacker;
        if (action.type === 'attack' && c.uid === action.attacker) striker = action.defender;
        const hitFaction = striker == null ? before.srcFaction
          : before.factionOf.get(striker) ?? s.players.find((p) => p.hero.uid === striker)?.factions[0] ?? before.srcFaction;
        if (c.kind === 'minion') jobs.push(fx.flinch(el, striker != null ? rects.get(`c${striker}`) ?? null : null, -delta));
        jobs.push(fx.particles(r, hitFaction, -delta));
        if (striker != null) jobs.push(fx.hitFx(r, hitFaction, -delta, rects.get(`c${striker}`) ?? null));
      } else {
        healed = true; fx.burst(r, 'heal'); jobs.push(fx.sparkles(r, 'heal'));
        if (c.kind === 'hero') jobs.push(fx.heroPerk(el));
      }
    }
  }
  // Stats that changed: the gem pops, glows green or red and counts to its new value.
  // Attack that went up also throws a few gold sparkles.
  for (const pl of s.players) {
    for (const c of [pl.hero, ...pl.board]) {
      const prev = before.shown.get(c.uid);
      const el = charEl(c.uid);
      if (!prev || !el) continue;
      const atk = effectiveAttack(c);
      const hitDelay = action.type === 'attack' ? 60 : 120;
      if (atk !== prev.atk) jobs.push(fx.statChange(el.querySelector('.atk'), prev.atk, atk, { delay: hitDelay }));
      if (c.health !== prev.hp) jobs.push(fx.statChange(el.querySelector('.hp'), prev.hp, c.health, { delay: hitDelay }));
      if ((c.armor ?? 0) !== prev.armor && c.armor) jobs.push(fx.statChange(el.querySelector('.armor'), prev.armor, c.armor, { delay: hitDelay }));
      if (atk > prev.atk) jobs.push(fx.sparkles(el.getBoundingClientRect(), 'buff', 7));
      // A minion that took enough damage to crack further: the new cracks spread out from the impact.
      if (c.kind === 'minion' && c.health < prev.hp && crackTier(c) && crackTier(c) !== crackTier({ health: prev.hp, maxHealth: c.maxHealth })) {
        jobs.push(fx.crackSpread(el.querySelector('.m-cracks'), hitDelay));
      }
    }
  }
  // Corrosion: acid pours over the minion and its Attack gem melts; Acid-coated: a glob lands on it.
  let corroded = false;
  for (const pl of s.players) for (const m of pl.board) {
    const el = charEl(m.uid);
    if (!el || !before.corrosion.has(m.uid)) continue;
    const added = (m.corrosion ?? 0) - before.corrosion.get(m.uid);
    if (added > 0) { corroded = true; jobs.push(fx.corrodeFx(el, added)); }
    else if (m.acidCoated && !before.coated.has(m.uid)) jobs.push(fx.acidCoatFx(el));
  }
  if (corroded) sound.play('squelch');
  // Marked Prey: blood streams from a newly marked minion to every Shark hunting it (or their Hero);
  // a Shark biting Prey drinks a stronger stream.
  for (const pl of s.players) for (const m of pl.board) {
    if (!m.prey || before.prey.has(m.uid)) continue;
    const el = charEl(m.uid);
    const hunter = s.players[1 - m.controller];
    const sharks = hunter.board.filter((x) => (getCard(x.cardId).tribes ?? []).includes('Shark')).map((x) => charEl(x.uid)).filter(Boolean);
    const to = sharks.length ? sharks : [charEl(hunter.hero.uid)].filter(Boolean);
    to.slice(0, 4).forEach((t, i) => jobs.push(fx.bloodTrail(el?.getBoundingClientRect(), t.getBoundingClientRect(), { delay: i * 120 })));
  }
  const biter = action.type === 'attack' ? findCharacter(s, action.attacker) : null;
  if (biter?.kind === 'minion' && before.prey.has(action.defender) && (biter.tribes ?? []).includes('Shark')) {
    const from = charEl(action.defender)?.getBoundingClientRect() ?? oldMinions.get(action.defender)?.rect;
    jobs.push(fx.bloodTrail(from, charEl(action.attacker)?.getBoundingClientRect(), { strong: true, delay: 150 }));
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

  // Cards drawn from the deck are swiped off the top, shown big for a moment, then put in
  // the hand (fx.drawShow). Cards made by effects (or a big batch) just fly in from the pile.
  const pile = app.querySelector('.deck-pile.me');
  const back = backsOf(s.players[viewer].factions);
  const fresh = pile ? [...app.querySelectorAll('.my-hand [data-hand]')].filter((el) => !before.hand.has(Number(el.dataset.hand))) : [];
  const fromDeck = Math.min(fresh.length, Math.max(0, before.myDeck - s.players[viewer].deck.length));
  const showBig = fromDeck > 0 && fromDeck <= 3 && s.pending?.type !== 'mulligan';
  const shown = showBig ? fresh.slice(0, fromDeck) : [];
  for (const el of fresh) el.style.visibility = 'hidden';
  for (const el of fresh.filter((e) => !shown.includes(e))) {
    jobs.push(fx.drawFlip(el, pile.getBoundingClientRect(), el.getBoundingClientRect(), back).then(() => { el.style.visibility = ''; }));
  }
  if (shown.length) {
    const hand = s.players[viewer].hand;
    const items = shown.map((el) => ({ el, html: bigCardHTML(getCard(hand.find((c) => c.uid === Number(el.dataset.hand)).cardId)) }));
    const top = pile.querySelector('.pile span:last-child') ?? pile;
    jobs.push(fx.drawShow(items, top.getBoundingClientRect(), back).then(() => { for (const el of shown) el.style.visibility = ''; }));
  }
  if (fresh.length) sound.play('draw');
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
    const ownTurn = mine && game.mode !== 'hotseat';
    await fx.turnBanner(ownTurn ? 'Your Turn' : `${esc(s.players[s.activePlayer].name)}'s Turn`, mine,
      ownTurn ? `${s.players[viewer].mana.max} Mana` : '');
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
  'Quick Play spells can be played on your opponent\'s turn, right after they act.',
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
  "Bees: you don't have to break the Hive to beat the Bees. Their Hero falls at 0 Health like anyone else's.",
  'Bees: Burrow the Queen hides her in a Hidden Nest that can\'t be attacked. Damage that hits every minion is the usual way to dig her out.',
  'Lycanthropes: tap one of your Lycanthropes and press the moon to Transform it (1 Mana, once per turn each). Damage carries over, but a Transform never kills.',
  'Acidic: Corrosion lowers Attack for good. A minion at 0 Attack can\'t attack until something raises it.',
  'Sharks: enemy minions at 3 Health or less become Marked Prey. Heal them above 3 to shake the hunters off.',
  'Ultraterrestrials: a Displaced minion is gone until the turn named, so it dodges attacks, spells and board wipes, and its abilities stop.',
  "Ghosts: Haunt steals minions that died this game from either Graveyard. Kill the enemy's best minion and it may be back on their side.",
  'Radioactive: an irradiated minion lowers the Health of everything else without Radiation, on both sides.',
  "Characters losing Health to Radiation can't be healed. Obliterated minions skip their Exit effects.",
  'Robots hold one Weapon at a time; equipping a new one replaces the old.',
  'Divine cards deal extra damage to Dark and Undead minions: Vampires, Zombies and Demons.',
  'Going second, you choose a Mana Potion or a Health Potion.',
  'Traps stay hidden until their condition happens. Watch the ? tokens.',
];
// Tips about the factions in this match come first; the rest are general.
function tipsFor(factions) {
  const mine = TIPS.filter((t) => factions.some((f) => t.startsWith(`${f}:`) || t.includes(` ${f} `)));
  const general = TIPS.filter((t) => !/^[A-Z][a-z]+:/.test(t));
  const shuffle = (a) => a.map((t) => [Math.random(), t]).sort((x, y) => x[0] - y[0]).map((x) => x[1]);
  return [...shuffle(mine), ...shuffle(general)];
}

// The loading screen: your two realms' emblems, a tip (it changes if loading runs long),
// a line saying what is being prepared, and a bronze bar whose glowing edge leads the way.
async function showLoader() {
  const s = game.state;
  const el = document.createElement('div');
  el.className = 'loader';
  const mineF = s.players[viewer].factions;
  const tips = tipsFor([...new Set(s.players.flatMap((pl) => pl.factions))]);
  const crest = (f) => (backArtOf(f) ? `<i class="crest" style="background-image:url('${backArtOf(f)}')"></i>` : '<i class="crest crest-fusion"></i>');
  el.innerHTML = `<div class="loader-box">
      <img class="loader-logo" src="art/ui/logo.png" alt="Shattered Realms">
      <div class="loader-realms">${mineF.map((f) => `<span>${crest(f)}<b>${esc(f)}</b></span>`).join('<i class="loader-plus">+</i>')}</div>
      <div class="loader-sigil"><i></i><i></i></div>
      <div class="loader-tipbox"><span class="loader-tiphead">Tip</span><p class="loader-tip">${esc(tips[0] ?? '')}</p></div>
      <div class="loader-status">Shuffling the decks…</div>
      <div class="loader-bar"><i></i></div></div>`;
  fx.layer().appendChild(el);
  const urls = new Set();
  for (const pl of s.players) {
    const hero = playerHeroPath(pl.factions);
    if (hero) urls.add(hero);
    for (const c of [...pl.deck, ...pl.hand]) if (ART[c.cardId]) urls.add(ART[c.cardId]);
  }
  const board = boardArtFor(s.players[viewer].factions[0]);
  if (board) urls.add(board);
  // Packed art (shipped builds) arrives a pack at a time; then each picture is decoded.
  const packs = ensureArt(urls);
  const list = [...urls];
  let done = 0;
  const bar = el.querySelector('.loader-bar i');
  const status = el.querySelector('.loader-status');
  const STEPS = [[0, 'Shuffling the decks…'], [0.35, 'Summoning the Heroes…'], [0.7, 'Painting the battlefield…'], [1, 'Ready!']];
  const progress = (k) => {
    bar.style.width = `${Math.round(k * 100)}%`;
    status.textContent = STEPS.filter(([at]) => k >= at).pop()[1];
  };
  const load = (u) => packs.then(() => new Promise((res) => { const i = new Image(); i.onload = i.onerror = () => { done++; progress(done / list.length); res(); }; i.src = artSrc(u); }));
  // A new tip every few seconds if loading takes a while.
  const tipEl = el.querySelector('.loader-tip');
  let t = 0;
  const rotate = setInterval(() => {
    if (tips.length < 2) return;
    t = (t + 1) % tips.length;
    fx.animate(tipEl, [{ opacity: 1 }, { opacity: 0 }], { duration: 200 }).then(() => { tipEl.textContent = tips[t]; fx.animate(tipEl, [{ opacity: 0 }, { opacity: 1 }], { duration: 250 }); });
  }, 3200);
  // At least a moment to read the tip; never more than 4 seconds.
  await Promise.all([Promise.race([Promise.all(list.map(load)), fx.wait(4000)]), fx.wait(1400)]);
  clearInterval(rotate);
  progress(1);
  await fx.wait(220);
  // Left up for the next scene (hero fusion or versus screen) to cover, so the board never flashes.
  return el;
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
  const aiBoost = game.mode === 'ai' ? (AI_SPEEDS[getSettings().aiSpeed] ?? 1) : 1;
  aiTimer = setTimeout(() => act(chooseAction(s, game.difficulty ?? 'medium')), (s.pending?.type === 'reaction' ? 600 : 450) * (fx.speedFactor() / fx.boostFactor()) * aiBoost);
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

// ---- Play a bot while you wait (Quick Match / Ranked queue) ----
// You stay in the queue while playing the AI. A banner keeps the search time; when a real
// opponent is found, the bot game ends and you go straight into the match. The bot game's
// "Main menu" goes back to the queue instead, and "Stop searching" leaves the queue but lets
// you finish the bot game.
let pendingStart = null;   // a match found mid-animation, started once the move has played out
let waitBanner = null;
const waitingInQueue = () => !!game?.waiting && lobby?.status === 'queued';

function startBotWhileWaiting() {
  if (lobby?.status !== 'queued' || lobby.mode === 'private') return;
  startGame('ai', picked);
  if (game?.mode === 'ai') game.waiting = { mode: lobby.mode };
  render();
}

function stopSearching() {
  srv.send({ t: 'cancel' });
  lobby = { status: 'choose' };
  if (game) game.waiting = null;
  flash('Stopped searching. Finish your game against the bot.');
  render();
}

function syncWaitBanner() {
  if (!(screen === 'game' && waitingInQueue())) {
    if (waitBanner) { clearInterval(waitBanner.timer); waitBanner.remove(); waitBanner = null; }
    return;
  }
  if (waitBanner) return;
  waitBanner = document.createElement('div');
  waitBanner.className = 'wait-banner';
  waitBanner.innerHTML = `<span class="wb-spin"></span><span>Searching for a real opponent · ${esc(MODE_NAMES[lobby.mode] ?? 'Match')} <b class="wb-time"></b></span>`
    + '<button class="ghost" data-stop>Stop searching</button>';
  waitBanner.querySelector('[data-stop]').addEventListener('click', stopSearching);
  document.body.appendChild(waitBanner);
  const tick = () => { const t = waitBanner?.querySelector('.wb-time'); if (t && lobby?.since) t.textContent = fmtWait(Date.now() - lobby.since); };
  tick();
  waitBanner.timer = setInterval(tick, 1000);
}

const MODE_NAMES = { quick: 'Quick match', ranked: 'Ranked match', private: 'Private match' };
const fmtWait = (ms) => { const t = Math.floor(ms / 1000); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };

function accountHTML() {
  const u = srv.user;
  if (u) {
    return `<div class="acct-card">
      <div class="acct-who"><b>${esc(u.name)}</b> ${rankBadgeHTML(u)} ${rankProgressHTML(u)}${u.place ? ` <span class="sub">#${u.place}</span>` : ''}</div>
      <div class="sub">Ranked ${u.rankedWins}–${u.rankedLosses} · All games ${u.wins}–${u.losses}</div>
      <div class="acct-links"><button data-act="leaderboard" class="ghost">${icon('trophy')} Leaderboard</button><button data-act="signOut" class="ghost">Sign out</button><button data-act="deleteAccount" class="ghost danger-link">Delete account</button></div>
    </div>
    <div class="lobby-choices modes">
      <div class="lobby-box mode-card"><div class="mode-icon">⚡</div><h3>Quick Match</h3><p class="sub">Play anyone who's online. Your rank doesn't change.</p><button data-act="quickMatch">Find a game</button></div>
      <div class="lobby-box mode-card ranked"><div class="mode-icon">🏆</div><h3>Ranked</h3><p class="sub">Climb from Iron 5 to Legendary, with promotion series between tiers.</p><button data-act="rankedMatch">Play ranked</button></div>
      <div class="lobby-box mode-card"><div class="mode-icon">🤝</div><h3>Private Match</h3><p class="sub">Type your friend's name. You're matched when they type yours.</p>
        <input id="friend-input" class="text-input" maxlength="16" placeholder="Friend's name" autocomplete="off" spellcheck="false">
        <button data-act="privateMatch">Play friend</button></div>
    </div>`;
  }
  // A remembered sign-in is being restored: say so instead of flashing the sign-in form.
  if (srv.hasSavedLogin() && acct.status !== 'error' && !acct.msg) {
    return `<div class="acct-form"><p class="lobby-wait">Signing you in${srv.savedName() ? ` as <b>${esc(srv.savedName())}</b>` : ''}…</p></div>`;
  }
  return acctFormHTML();
}

// The sign-in / create-account form (the Play Online screen and the first-launch screen).
function acctFormHTML() {
  const down = acct.status === 'error' || acct.status === 'down';
  const busy = acct.status === 'connecting';
  const reg = acct.tab === 'register';
  return `<div class="acct-form">
      <div class="acct-tabs"><button data-act="acctLogin" class="${reg ? 'ghost' : 'on'}">Sign in</button><button data-act="acctRegister" class="${reg ? 'on' : 'ghost'}">Create account</button></div>
      <form id="acct-form-el" style="display:contents">
      <input id="acct-name" name="username" class="text-input" maxlength="16" placeholder="Name" autocomplete="username" spellcheck="false" autocapitalize="off" value="${esc(srv.savedName() ?? '')}">
      <input id="acct-pass" name="password" class="text-input" type="password" maxlength="128" placeholder="Password" autocomplete="${reg ? 'new-password' : 'current-password'}">
      ${reg ? '<p class="sub">Names are 3-16 letters, numbers or _. Passwords need 8+ characters.</p>' : ''}
      ${acct.msg ? `<p class="lobby-error">${esc(acct.msg)}</p>` : ''}
      ${acct.slow && !acct.msg && acct.status !== 'error' ? '<p class="sub">Waking up the server. The first connection can take up to a minute.</p>' : ''}
      ${down && !acct.msg && !acct.slow ? `<p class="lobby-error">Can't reach the game server right now.${screen === 'online' ? ' You can still play a friend with a room code below.' : ''}</p>` : ''}
      <label class="acct-remember"><input type="checkbox" id="acct-remember" ${srv.remembering() ? 'checked' : ''}> Remember me</label>
      <button type="submit" data-act="${reg ? 'signUp' : 'signIn'}" ${busy ? 'disabled' : ''}>${busy ? 'Connecting…' : reg ? 'Create account' : 'Sign in'}</button>
      </form>
    </div>`;
}

// ---- First launch: an account before anything else ----
// When the game opens without a saved sign-in, players sign in or make an account first.
// "Remember me" keeps them signed in next time. If the server can't be reached, they can play
// offline for now and are asked again the next time they open the game.
const OFFLINE_KEY = 'shattered-offline';
const HAD_ACCOUNT_KEY = 'shattered-had-account';
const needsSignIn = () => {
  if (!BUILD.online || srv.hasSavedLogin()) return false;
  try { return sessionStorage.getItem(OFFLINE_KEY) !== '1'; } catch { return true; }
};

function renderSignIn() {
  showMenuBackdrop(true);
  const offline = acct.slow || acct.status === 'error' || acct.status === 'down';
  const reg = acct.tab === 'register';
  app.innerHTML = `
    <button class="ghost signin-mute" data-act="mute" aria-label="${sound.isMuted() ? 'Unmute' : 'Mute'}" title="${sound.isMuted() ? 'Sound off: tap to unmute' : 'Sound on: tap to mute'}">${sound.isMuted() ? '🔇' : '🔊'}</button>
    <div class="menu tavern title-screen signin">
      <header class="ts-title">
        <div class="ts-runes"></div>
        <h1 class="ts-logo"><span class="ts-logo-wrap"><img src="art/ui/logo.png" alt="Shattered Realms" draggable="false"><i class="ts-logo-sheen"></i></span></h1>
        <p class="ts-tag">${reg ? 'Create your account to begin.' : 'Welcome back. Sign in to play.'}</p>
      </header>
      <section class="ts-panel signin-panel">
        ${acctFormHTML()}
        <p class="sub signin-why">Your account keeps your rank and lets you play online against anyone.</p>
        ${offline ? '<button data-act="playOffline" class="ghost">Play offline for now</button>' : ''}
      </section>
    </div>`;
  app.querySelector('#acct-pass')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') submitAccount(); });
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

// Before you queue or host, the online screen lets you change the format, your realms and your
// deck (the same choices as the main menu). While you're queued or hosting it just shows them.
const lobbyEditable = () => !['queued', 'hosting', 'joining'].includes(lobby?.status);
const pickedReady = () => picked.length === pickNeeded();
let builderFrom = null;  // 'online' when the deck builder was opened from the online screen

function lobbySetupHTML(heroes, editable) {
  const summary = `<div class="lobby-deck">${heroes}<div><b>${picked.length ? esc(picked.join(' + ')) : 'Pick your realms'}</b><span class="sub">${format === 'single' ? 'One faction' : 'Two factions'} · your opponent uses the same format</span></div></div>`;
  if (!editable) return summary;
  const open = availableFactions();
  const realms = PLAYABLE_FACTIONS.filter((f) => open.includes(f)).map((f) => {
    const art = heroArtOf(f);
    return `<span class="ls-realm f-${f.toLowerCase()} ${picked.includes(f) ? 'on' : ''}" data-faction="${esc(f)}" role="button" tabindex="0" title="${esc(f)}">
      <span class="ls-face">${art ? `<img src="${art}" alt="" draggable="false">` : `<b>${FACTION_ICONS[f] ?? '✦'}</b>`}</span><small>${esc(f).replace('Ultraterrestrials', 'Ultra&shy;terrestrials')}</small></span>`;
  }).join('');
  const need = pickNeeded();
  return `<section class="lobby-setup">
      <div class="ls-head">${summary}
        ${pairUnlocked() ? `<div class="format-toggle">
          <button data-act="formatPair" class="${format === 'pair' ? 'on' : 'ghost'}">Two factions</button>
          <button data-act="formatSingle" class="${format === 'single' ? 'on' : 'ghost'}">One faction</button>
        </div>` : ''}
      </div>
      <div class="ls-realms">${realms}</div>
      ${pickedReady() ? deckLineHTML() : `<p class="deck-line sub">Pick ${need === 1 ? 'a faction' : `${need} factions`} to play online.</p>`}
    </section>`;
}

function renderLobby() {
  const st = lobby ?? { status: 'choose' };
  if (st.status !== 'queued') stopQueueTicker();
  const body = st.status === 'queued'
    ? `<div class="queue-box">
        <h3>${esc(MODE_NAMES[st.mode] ?? 'Match')}</h3>
        <p class="lobby-wait">${st.mode === 'private' ? `Waiting for <b>${esc(st.friend)}</b> to type your name (<b>${esc(srv.user?.name ?? '')}</b>)…` : 'Looking for an opponent…'}</p>
        <div class="queue-time">${fmtWait(Date.now() - st.since)}</div>
        ${st.mode !== 'private' ? '<button data-act="botWhileWaiting">🤖 Play a bot while you wait</button>' : ''}
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
    <div class="menu tavern title-screen lobby lobby-fit">
      <div class="lobby-left">
        <header class="ts-title">
          <div class="ts-runes"></div>
          <div class="tavern-sign"><h1>Play Online</h1></div>
          <p class="ts-tag">Test your realms against the world.</p>
        </header>
        ${lobbySetupHTML(heroes, lobbyEditable())}
        <nav class="ts-actions"><div class="ts-row small"><button data-act="menu" class="ghost">← Main menu</button></div></nav>
      </div>
      <div class="lobby-right">
        ${st.msg ? `<p class="lobby-error">${esc(st.msg)}</p>` : ''}
        <section class="ts-panel lobby-panel">${body}</section>
      </div>
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
  if (!pickedReady()) return flash(`Pick ${pickNeeded()} factions first.`);
  lobby = { status: 'hosting' };
  render();
  netHandlers('host');
  try { await net.host(); } catch (err) { lobbyError(err.message); }
}

async function joinOnline() {
  const code = net.cleanCode(app.querySelector('#room-input')?.value);
  if (code.length !== net.CODE_LENGTH) { flash(`Codes are ${net.CODE_LENGTH} characters.`); return; }
  if (!pickedReady()) { flash(`Pick ${pickNeeded()} factions first.`); return; }
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
      // Still connecting after a few seconds: the server is probably waking up.
      clearTimeout(acct.slowTimer);
      acct.slow = false;
      if (st === 'connecting' || st === 'down') acct.slowTimer = setTimeout(() => { if (acct.status !== 'open') { acct.slow = true; if (onAcctScreen()) render(); } }, 4000);
      if (st === 'down' && screen === 'game' && game?.mode === 'online' && link === srv && !game.state.gameOver) flash('Connection lost. Reconnecting…');
      if (st === 'down' && lobby?.status === 'queued') lobby = { status: 'choose', msg: 'Lost the connection to the server.' };
      if (onAcctScreen()) render();
    },
    error: (msg) => { acct.status = 'error'; acct.msg = msg; if (onAcctScreen()) render(); },
    data: onServerMessage,
  });
}

const onAcctScreen = () => screen === 'online' || screen === 'signin';

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
  srv.setRemember(app.querySelector('#acct-remember')?.checked ?? true);
  connectServer();
  if (acct.tab === 'register') srv.register(name, pass); else srv.login(name, pass);
}

function queueMatch(mode) {
  if (!srv.user) return flash('Sign in first.');
  if (!pickedReady()) return flash(`Pick ${pickNeeded()} factions first.`);
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
      if (msg.t === 'welcome') { try { localStorage.setItem(HAD_ACCOUNT_KEY, '1'); } catch { /* storage unavailable */ } }
      if (msg.t === 'welcome' && screen === 'signin') {
        // Signed in from the first-launch screen: on to the game (Play Online reconnects later).
        srv.disconnect();
        screen = 'menu';
        render();
        flash(`Welcome, ${msg.you?.name ?? 'traveller'}!`);
        return;
      }
      if (onAcctScreen()) render();
      return;
    case 'authError':
      acct.msg = msg.msg;
      if (onAcctScreen()) render();
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
      // A real opponent while you play a bot: finish the move on screen first, then switch.
      if (game?.waiting && screen === 'game') {
        if (animating) { pendingStart = msg; return; }
        clearTimeout(aiTimer); drag.cancel(); hidePreview();
        game.waiting = null;
        flash(`Real opponent found: ${msg.opponent?.name ?? 'a player'}!`);
      }
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

// Portrait boards are part of the arena (re-drawn each render), so the circle's living
// effects re-attach to the new host after every render, reusing the running animation.
let pCircle = null; // { n, ctl, host }
function portraitCircleFx(root, depth) {
  const host = root.querySelector('.pboard-fx');
  if (!host || !depth) { pCircle?.ctl?.stop(); pCircle = null; return; }
  if (pCircle && pCircle.n === depth) {
    if (pCircle.ctl && pCircle.ctl.canvas.parentNode !== host) host.append(pCircle.ctl.canvas);
    return;
  }
  pCircle?.ctl?.stop();
  const mine = { n: depth, ctl: null };
  pCircle = mine;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  startCircleFx(host, depth, 'portrait').then((ctl) => {
    if (pCircle !== mine) { ctl?.stop(); return; }
    mine.ctl = ctl;
    const now = app.querySelector('.pboard-fx');
    if (ctl && now && ctl.canvas.parentNode !== now) now.append(ctl.canvas);
  }).catch(() => {});
}

// ---- Screens --------------------------------------------------------------

// The deck picker under the deck line: premade decks and your saved ones. One that needs
// locked cards shows a lock; picking it opens it in the deck builder to swap those out.
function deckChoicesHTML() {
  const current = pairDeckFor(picked);
  return `<div class="deck-choices"><span class="ds-label">Decks:</span>${deckChoices(picked).map((d, i) => {
    const locked = lockedIn(d.deck);
    const on = !locked.length && sameDeck(d.deck, current);
    const tip = locked.length ? `${d.blurb} Needs ${locked.length} locked card${locked.length === 1 ? '' : 's'}: opens in the deck builder so you can swap ${locked.length === 1 ? 'it' : 'them'} out.` : d.blurb;
    return `<button class="ghost dc-chip ${on ? 'on' : ''} ${locked.length ? 'locked' : ''} ${d.mine ? 'mine' : ''}" data-pickdeck="${i}" title="${esc(tip)}">${esc(d.name)}${locked.length ? ` <span class="dc-lock">🔒${locked.length}</span>` : ''}</button>`;
  }).join('')}</div>`;
}
// The name of the deck you'll play, if it matches a premade or saved deck.
const currentDeckName = () => deckChoices(picked).find((d) => sameDeck(d.deck, pairDeckFor(picked)))?.name ?? null;
function deckLineHTML() {
  if (picked.length !== pickNeeded()) return `<p class="deck-line sub">Pick ${pickNeeded() === 1 ? 'a faction' : `${pickNeeded()} factions`} to build your deck.</p>`;
  if (format === 'single') {
    const f = picked[0];
    const custom = customDeckFor(picked);
    const deck = pairDeckFor(picked);
    const doubles = Object.values(countsOf(deck)).filter((n) => n > 1).length;
    return `
    <div class="deck-line">
      <div><b>Your deck: ${esc(currentDeckName() ?? `${deck.length} cards`)}</b> <span class="sub">${esc(f)} · ${deck.length} cards${doubles ? ` · ${doubles} doubled` : ''}</span></div>
      <button data-act="editCuts">${custom ? 'Edit my deck' : 'Build my deck'}</button>
      ${deckChoicesHTML()}
    </div>`;
  }
  const custom = customDeckFor(picked);
  const deck = pairDeckFor(picked);
  const split = picked.map((f) => `${deck.filter((id) => getCard(id).faction === f).length} ${f}`).join(' · ');
  const doubles = Object.values(countsOf(deck)).filter((n) => n > 1).length;
  return `
    <div class="deck-line">
      <div><b>Your deck: ${esc(currentDeckName() ?? `${deck.length} cards`)}</b> <span class="sub">${esc(picked.join(' + '))} · ${deck.length} cards (${esc(split)}${doubles ? ` · ${doubles} doubled` : ''})</span></div>
      <button data-act="editCuts">${custom ? 'Edit my deck' : 'Build my deck'}</button>
      ${deckChoicesHTML()}
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
      + '<div class="mbg-mist m1"></div><div class="mbg-mist m2"></div>'
      + '<div class="mbg-shade"></div><div class="mbg-rays"></div>'
      + Array.from({ length: 28 }, () => `<i class="mbg-ember" style="left:${Math.random() * 100}%;--d:${(6 + Math.random() * 8).toFixed(1)}s;--delay:${(-Math.random() * 14).toFixed(1)}s;--x:${(Math.random() * 120 - 60).toFixed(0)}px;--s:${(0.6 + Math.random() * 1.2).toFixed(2)}"></i>`).join('');
    document.body.prepend(menuBg);
    // Depth: the backdrop drifts a little against the mouse (the mist more than the islands).
    document.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse' || !menuBg.classList.contains('show')) return;
      menuBg.style.setProperty('--px', ((e.clientX / window.innerWidth) - 0.5).toFixed(3));
      menuBg.style.setProperty('--py', ((e.clientY / window.innerHeight) - 0.5).toFixed(3));
    });
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
      <header>${crestHTML(f)} <b>${esc(f)}</b> <span class="ts-style">${esc(info.style)}</span></header>
      <p class="ts-summary">${esc(info.summary)}</p>
      <div class="ts-good">Good at:</div>
      <ul>${info.strengths.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
      ${info.weaknesses?.length ? `<div class="ts-good ts-bad">Not so good at:</div>
      <ul class="ts-weak">${info.weaknesses.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>` : ''}
      <p class="ts-mech">${esc(info.mechanic)}</p>
    </article>`;
  }).join('')}</div>`;
}

// The playable factions grouped by deck type; any not listed land in an "Other" group.
function deckGroups(playable) {
  const groups = DECK_TYPES.map((g) => ({ ...g, factions: g.factions.filter((f) => playable.includes(f)) })).filter((g) => g.factions.length);
  const rest = playable.filter((f) => !DECK_TYPES.some((g) => g.factions.includes(f)));
  if (rest.length) groups.push({ name: 'Other', blurb: 'Their own way to win.', factions: rest });
  return groups;
}

let playLaunching = false; // the Play button's burst is playing
let howtoPage = 0; // the How to Play chapter that's open
let guideOpen = false; // the main menu's realm guide (what the picked factions do)
function renderMenu() {
  applyJourney();
  const saved = loadSaved();
  showMenuBackdrop(true);
  const roster = [...FACTIONS].sort((a, b) => PLAYABLE_FACTIONS.includes(b) - PLAYABLE_FACTIONS.includes(a));
  const playable = roster.filter((f) => PLAYABLE_FACTIONS.includes(f));
  const open = availableFactions();
  const progress = progressLine();
  const ready = picked.length === pickNeeded();
  const fusion = format !== 'single' && ready ? fusionFor(picked) : null;
  galleryOrder = fusion ? [fusion.id] : []; // the full-size view holds just this card
  // The pair's fused hero; a mystery until you've played a match with this pair.
  const fusedHeroHTML = (pair) => {
    if (pair.length !== 2 || !fusionHeroPath(pair)) return '';
    if (!heroRevealed(pair)) {
      return `<span class="vs-plus">=</span><div class="vs-hero fused mystery" title="Play a match with this pair to meet your hero"><i class="vs-mystery">?</i><span>Your hero</span><small>Play to reveal</small></div>`;
    }
    return `<span class="vs-plus">=</span><div class="vs-hero fused">${livingPortraitHTML(artSrc(fusionHeroPath(pair)))}<span>Your hero</span></div>`;
  };
  const heroCard = (f) => {
    const art = heroArtOf(f);
    return `<div class="vs-hero f-${f.toLowerCase()}">${art ? `<img src="${art}" alt="">` : `<b>${FACTION_ICONS[f] ?? '✦'}</b>`}<span>${esc(f)}</span></div>`;
  };
  app.innerHTML = `
    <div class="menu tavern title-screen ts-fit">
      <div class="ts-left">
        <header class="ts-title">
          <div class="ts-runes"></div>
          <h1 class="ts-logo"><span class="ts-logo-wrap"><img src="art/ui/logo.png" alt="Shattered Realms" draggable="false"><i class="ts-logo-sheen"></i></span></h1>
          <p class="ts-tag">Seventeen realms broke apart. Two of them are yours.</p>
        </header>

        <nav class="ts-actions">
          <button data-act="ai" class="ts-play play-art" aria-label="Play vs AI"><img class="pa-img" src="art/ui/play-button.png" alt="" draggable="false"><i class="pa-glow"></i><i class="pa-shine"></i><span class="pa-sparks">${'<b></b>'.repeat(8)}</span><small>vs AI</small></button>
          ${difficultySliderHTML()}
          <div class="ts-row">
            ${BUILD.online ? '<button data-act="online">⚔️ Play online</button>' : ''}
            <button data-act="hotseat">${icon('players')} Hot-seat</button>
            ${saved ? '<button data-act="continue">↻ Continue</button>' : ''}
          </div>
          <div class="ts-row small">
            <button data-act="howto" class="ghost ${howToOpened() ? '' : 'new-player'}">${icon('book')} How to play${howToOpened() ? '' : ' <small>New? Start here</small>'}</button>
            <button data-act="gallery" class="ghost"><img class="btn-icon" src="art/ui/icon-new-cards.png" alt=""> Collection</button>
            <button data-act="settings" class="ghost">${icon('gear')} Settings</button>
          </div>
        </nav>
      </div>

      <section class="ts-panel">
        <div class="ts-panel-head">
          <h3>Choose your ${pickNeeded() === 1 ? 'realm' : 'realms'} <span class="pick-count">${picked.length}/${pickNeeded()}</span></h3>
          ${pairUnlocked() ? `<div class="format-toggle">
            <button data-act="formatPair" class="${format === 'pair' ? 'on' : 'ghost'}">Two factions</button>
            <button data-act="formatSingle" class="${format === 'single' ? 'on' : 'ghost'}">One faction</button>
          </div>` : ''}
        </div>
        ${progress ? `<div class="journey-line"><span>${esc(progress)}</span><button data-act="journeySkip" class="ghost">Played card games before? Unlock everything</button></div>` : ''}
        <div class="faction-groups">
          ${deckGroups(playable).map((g) => `<div class="fg">
            <div class="fg-head"><b>${esc(g.name)}</b><span>${esc(g.blurb)}</span></div>
            <div class="factions">${g.factions.map((f) => {
            const art = heroArtOf(f);
            const on = picked.includes(f);
            if (!open.includes(f)) {
              return `<span class="faction medallion sealed f-${f.toLowerCase()}" data-sealed="${esc(f)}" title="${esc(f)} · opens as you play">
              <span class="medal-ring"></span><span class="medal-face">${art ? `<img src="${art}" alt="" draggable="false">` : ''}<i class="medal-lock">🔒</i></span>
              <span class="medal-name ${f.length >= 11 ? 'long' : ''}">${esc(f).replace('Ultraterrestrials', 'Ultra&shy;terrestrials')}</span></span>`;
            }
            return `<span class="faction medallion f-${f.toLowerCase()} ${on ? 'picked' : 'ready'}" data-faction="${esc(f)}" title="${esc(f)}${FACTION_INFO[f] ? ` · ${esc(FACTION_INFO[f].style)}` : ''}">
              <span class="medal-ring"></span>
              <span class="medal-face">${art ? `<img src="${art}" alt="" draggable="false">` : `<b>${FACTION_ICONS[f] ?? '✦'}</b>`}</span>
              <span class="medal-name ${f.length >= 11 ? 'long' : ''}">${esc(f).replace('Ultraterrestrials', 'Ultra&shy;terrestrials')}</span>${on ? '<span class="medal-check">✓</span>' : ''}</span>`;
          }).join('')}</div></div>`).join('')}
        </div>
        <div class="ts-bottom">
          ${ready ? `<div class="ts-matchup">
            ${picked.map(heroCard).join('<span class="vs-plus">+</span>')}${fusedHeroHTML(picked)}
          </div>` : ''}
          <div class="ts-bottom-info">
            ${fusion ? `<button class="ghost ts-fusion-btn" data-zoom="${fusion.id}" title="See the Fusion card">🌀 Fusion: <b>${esc(fusion.name)}</b></button>` : ''}
            ${ready && format !== 'single' ? synergyHTML(picked) : ''}
            ${starterMode() ? '<p class="deck-line sub">You play a <b>starter deck</b>: simple cards to learn with. Your rival does too.</p>' : deckLineHTML()}
            ${ready ? `<button data-act="guide" class="ghost ts-guide-btn">${icon('book')} Realm guide</button>` : ''}
          </div>
        </div>
      </section>
    </div>
    ${guideOpen && ready ? `<div class="overlay guide-overlay"><div class="guide-backdrop" data-act="closeGuide"></div><div class="guide-panel">
      <button class="ghost guide-close" data-act="closeGuide">✕</button>${factionGuideHTML(picked)}
      <p class="sub">${starterMode() ? 'The rival plays one of the open realms.' : format === 'single' ? 'The rival plays a random faction with its recommended 30.' : 'The rival plays a random pair with the standard cut.'}</p></div></div>` : ''}
    ${zoomId && fusion ? zoomHTML(getCard(zoomId)) : ''}
    ${milestone ? milestoneHTML(milestone) : ''}
    ${needsFirstPick() ? firstPickHTML() : ''}`;
}

// A brand-new player's first screen: choose three of the six easiest realms to start with.
function firstPickHTML() {
  const card = (f) => {
    const art = heroArtOf(f);
    const on = firstPicks.includes(f);
    const info = FACTION_INFO[f] ?? {};
    return `<div class="fp-realm f-${f.toLowerCase()} ${on ? 'on' : ''}" data-first="${esc(f)}" role="button" tabindex="0" aria-pressed="${on}">
      <span class="fp-art">${art ? `<img src="${art}" alt="" draggable="false">` : ''}${on ? '<i class="fp-check">✓</i>' : ''}</span>
      <b>${esc(f)}</b><small>${esc(info.style ?? '')}</small><span class="fp-sum">${esc(info.summary ?? '')}</span></div>`;
  };
  const n = firstPicks.length;
  return `<div class="overlay first-pick-overlay"><div class="first-pick">
    <h2>Choose your first realms</h2>
    <p class="sub">Pick <b>${FIRST_PICKS}</b> to start with. These are the easiest to learn; the other realms open as you play.</p>
    <div class="fp-grid">${STARTERS.map(card).join('')}</div>
    <div class="fp-foot"><button data-act="firstBegin" ${n === FIRST_PICKS ? '' : 'disabled'}>${n === FIRST_PICKS ? 'Begin my journey' : `Choose ${FIRST_PICKS - n} more`}</button>
      <button data-act="journeySkip" class="ghost">Played card games before? Unlock everything</button></div>
  </div></div>`;
}

// What the last match opened up on the new-player path (journey.js).
function milestoneHTML(m) {
  const realm = (f) => { const art = heroArtOf(f); return `<div class="ms-realm f-${f.toLowerCase()}">${art ? `<img src="${art}" alt="">` : ''}<b>${esc(f)}</b><small>${esc(FACTION_INFO[f]?.style ?? '')}</small></div>`; };
  let body = '';
  if (m.kind === 'reactive') {
    body = `<h2>Traps &amp; Quick Plays</h2><img class="ui-divider" src="art/ui/divider.png" alt="">
      <p>Your decks now hold two kinds of surprise:</p>
      <ul class="ms-points"><li><b>Traps</b> are set face-down and spring by themselves when the enemy does something.</li>
      <li><b>Quick Plays ⚡</b> can be played on your opponent's turn. When one fits, a <b>Quick Play?</b> prompt appears.</li></ul>
      <p class="sub">No rush: against the AI there's no timer.</p>`;
  } else if (m.kind === 'fusion') {
    const ex = fusionFor(['Vampires', 'Aliens']);
    body = `<div class="ms-fusion-burst"></div><h2 class="ms-fusion-title">Fusion unlocked</h2><img class="ui-divider" src="art/ui/divider.png" alt="">
      <p>Now you can join <b>two realms</b> in one deck. Every pair of realms has its own <b>Fusion</b>: a unique Hero Spell that only that pair can cast.</p>
      <div class="ms-fusion-demo">${realm('Vampires')}<span class="ms-plus">+</span>${realm('Aliens')}<span class="ms-plus">=</span>${ex ? `<div class="ms-card">${cardHTML(ex)}</div>` : ''}</div>
      <p class="sub">It charges as you use your Hero Spells. Fire it to turn the battle. Find the pair whose Fusion you love.</p>`;
  } else {
    body = `<h2>New realms open</h2><img class="ui-divider" src="art/ui/divider.png" alt="">
      <div class="ms-realms">${m.realms.map(realm).join('')}</div>
      <p class="sub">${m.all ? 'Every realm is open. The Shattered Realms are yours.' : 'Two more open after every match.'}</p>`;
  }
  return `<div class="overlay milestone-overlay"><div class="milestone-panel ms-${m.kind}">${body}
    <button data-act="milestoneOk">${m.kind === 'fusion' ? 'Choose two realms' : 'Continue'}</button></div></div>`;
}

// Choose which 30 of a faction's cards you bring (expansion factions).
let swapTab = 'new'; // the swap builder shows its new cards or its original ones
function renderSwapBuilder() {
  const f = swapFaction;
  const need = FACTION_DECKS[f].length;
  const n = draftLineup.length;
  const cards = galleryCards(f).filter((c) => FACTION_POOLS[f].includes(c.id));
  galleryOrder = cards.map((c) => c.id);
  const extras = FACTION_POOLS[f].length - FACTION_LISTS[f].length;
  const scrollY = app.scrollTop;
  const grid = (list) => list.map((c) => (isLocked(c.id)
    ? cardHTML(c, { cuttable: true, isCut: true, cutLabel: '🔒 LOCKED' }).replace('class="card ', 'class="card locked ')
    : cardHTML(c, { cuttable: true, isCut: !draftLineup.includes(c.id), cutLabel: 'OUT' }))).join('');
  app.innerHTML = `
    <div class="gallery builder swap-builder">
      <div class="builder-bar">
        <div>
          <h2>Choose your ${esc(f)} cards</h2>
          <div class="sub builder-help">${esc(f)} has ${FACTION_POOLS[f].length} cards (${extras} new, ${extras - lockedCount(f)} unlocked). Your deck uses ${need}: tap a card to take it out or put it in. Win matches vs the AI to unlock more (${'2'} per win).</div>
        </div>
        <div class="builder-count ${n === need ? 'done' : ''}">In <b>${n}</b> / ${need}<span class="sub">${n > need ? `take out ${n - need}` : n < need ? `add ${need - n}` : 'ready'}</span></div>
        <div class="builder-buttons">
          <button data-act="swapStandard" class="ghost">Standard ${need}</button>
          <button data-act="menu" class="ghost">Cancel</button>
          <button data-act="swapSave" ${n === need ? '' : 'disabled'}>Save cards</button>
        </div>
      </div>
      <nav class="builder-tabs">
        <button class="builder-tab ghost ${swapTab === 'new' ? 'on' : ''}" data-btab="new"><img class="h-icon" src="art/ui/icon-dino-egg.png" alt=""> New cards <span class="pick-count">${cards.filter((c) => c.extra && draftLineup.includes(c.id)).length} of ${extras} in</span></button>
        <button class="builder-tab ghost ${swapTab === 'old' ? 'on' : ''}" data-btab="old">${crestHTML(f)} Original cards <span class="pick-count">${cards.filter((c) => !c.extra && draftLineup.includes(c.id)).length} of ${FACTION_LISTS[f].length} in</span></button>
      </nav>
      ${pagerHTML(`swap:${f}:${swapTab}`, grid(cards.filter((c) => (swapTab === 'new') === !!c.extra)), { cls: 'builder-grid' })}
    </div>
    ${zoomId ? zoomHTML(getCard(zoomId)) : ''}`;
  app.scrollTop = scrollY;
}

function renderBuilder() {
  if (builderMode === 'swap') return renderSwapBuilder();
  const single = picked.length === 1;
  const need = deckSizeFor(picked);
  const deck = deckOf(draftDeck);
  const n = deck.length;
  const problem = builderProblem(picked, deck);
  const pool = (f) => galleryCards(f).filter((c) => FACTION_POOLS[f].includes(c.id));
  galleryOrder = picked.flatMap((f) => pool(f).map((c) => c.id));
  const heroSpells = picked.flatMap((f) => galleryCards(f).filter((c) => c.heroSpell));
  const inFaction = (f) => deck.filter((id) => getCard(id).faction === f).length;
  const tile = (c) => {
    if (isLocked(c.id)) return cardHTML(c, { cuttable: true, isCut: true, cutLabel: '🔒 LOCKED' }).replace('class="card ', 'class="card locked ');
    const k = draftDeck[c.id] ?? 0;
    // In the deck: a ×1 / ×2 badge; both copies in: dimmed (like Hearthstone).
    return cardHTML(c, { cuttable: true }).replace('class="card ', `class="card draggable ${c.extra ? 'expansion ' : ''}${k >= DEFAULT_RULES.maxCopies ? 'maxed' : ''} `)
      .replace(/<\/div>\s*$/, `${k ? `<span class="in-deck">×${k}</span>` : ''}</div>`);
  };
  // The deck list (right side; a tray along the bottom on phones): one row per card, by cost.
  const rows = Object.entries(draftDeck).filter(([, k]) => k > 0).map(([id, k]) => ({ c: getCard(id), k }))
    .sort((a, b) => a.c.cost - b.c.cost || a.c.name.localeCompare(b.c.name));
  const deckPanel = `<aside class="deck-panel" data-deckdrop>
      <header><b>Your deck</b><span class="${!problem ? 'done' : ''}">${n} / ${need}</span></header>
      ${manaCurveHTML(deck)}
      <div class="deck-rows">${rows.length ? rows.map(({ c, k }) => `<div class="deck-row f-${c.faction.toLowerCase()} ${isLocked(c.id) ? 'locked' : ''}" data-deckrow="${c.id}" title="${isLocked(c.id) ? 'Locked: click to swap it for a card you own' : 'Drag out or click to remove one'}">
        <span class="dr-cost">${c.cost}</span><span class="dr-name">${isLocked(c.id) ? '🔒 ' : ''}${esc(c.name)}</span>${artOf(c) ? `<i class="dr-art" style="background-image:url('${artOf(c)}')"></i>` : ''}<span class="dr-n">${k > 1 ? `×${k}` : ''}</span></div>`).join('')
        : '<p class="deck-empty">Drag cards here to build your deck.</p>'}</div>
    </aside>`;
  // One faction's cards at a time (tabs), a page at a time.
  if (!picked.includes(builderTab)) builderTab = picked[0];
  const tabBtn = (f) => `<button class="builder-tab ghost ${f === builderTab ? 'on' : ''}" data-btab="${esc(f)}">${crestHTML(f)} ${esc(f)}
      <span class="pick-count ${!single && inFaction(f) < DEFAULT_RULES.minPerFaction ? 'short' : ''}">${single ? `${inFaction(f)} in deck` : `${inFaction(f)} in deck · at least ${DEFAULT_RULES.minPerFaction}`}</span></button>`;
  const section = () => `<nav class="builder-tabs">${picked.map(tabBtn).join('')}</nav>
      ${pagerHTML(`bld:${builderTab}`, pool(builderTab).map(tile).join(''), { cls: 'builder-grid' })}`;
  const scrollY = app.scrollTop;
  app.innerHTML = `
    <div class="gallery builder">
      <div class="builder-bar">
        <div>
          <h2>Build your deck</h2>
          <div class="sub builder-help">${esc(picked.join(' + '))} · drag cards into your deck (hold, then drag on a phone) · drag one out or click it in the list to remove it · click a card to see it full size ·
            ${need} cards${single ? '' : `, at least ${DEFAULT_RULES.minPerFaction} from each faction`}, up to ${DEFAULT_RULES.maxCopies} of a card · Hero Spell${heroSpells.length === 1 ? '' : 's'} always included:
            ${heroSpells.map((c) => esc(c.name)).join(', ')}</div>
        </div>
        <div class="builder-count ${!problem ? 'done' : ''}">Deck <b>${n}</b> / ${need}${single ? '' : `<span class="sub">${esc(picked.map((f) => `${inFaction(f)} ${f}`).join(' · '))}</span>`}</div>
        <div class="builder-buttons">
          <button data-act="cutStandard" class="ghost">Recommended deck</button>
          <button data-act="cutClear" class="ghost">Clear</button>
          <button data-act="menu" class="ghost">Cancel</button>
          <button data-act="cutSave" ${problem ? `disabled title="${esc(problem)}"` : ''}>Save deck</button>
        </div>
      </div>
      ${problem && n ? `<p class="builder-hint">${esc(problem)}</p>` : ''}
      <div class="deck-slots">
        <span class="ds-label">Premade:</span>
        ${premadeDecks(picked).map((d, i) => { const lk = lockedIn(d.deck).length; return `<span class="ds-chip ${sameDeck(d.deck, deck) ? 'on' : ''}"><button class="ghost" data-premade="${i}" title="${esc(d.blurb)}${lk ? ` ${lk} of its cards are locked.` : ''}">${esc(d.name)}${lk ? ` 🔒${lk}` : ''}</button></span>`; }).join('')}
        <span class="ds-label">My decks:</span>
        ${deckSlots(picked).map((d, i) => `<span class="ds-chip ${sameDeck(d.deck, deckOf(draftDeck)) ? 'on' : ''}"><button class="ghost" data-slot="${i}" title="Load this deck">${esc(d.name)}</button><button class="ghost ds-del" data-slotdel="${i}" title="Delete this deck">✕</button></span>`).join('') || '<span class="sub">none yet</span>'}
        <input class="ds-name" maxlength="24" placeholder="New deck name">
        <button class="ghost" data-act="slotSave" ${problem ? 'disabled' : ''}>Save as new deck</button>
      </div>
      <div class="builder-layout">
        <div class="builder-cards">${section()}</div>
        ${deckPanel}
      </div>
    </div>
    ${replaceFor && draftDeck[replaceFor] ? replacePopHTML(replaceFor) : ''}
    ${zoomId ? zoomHTML(getCard(zoomId)) : ''}`;
  app.scrollTop = scrollY;
  // The deck list sticks just under the builder bar, whatever height the bar wraps to.
  const bar = app.querySelector('.builder-bar');
  if (bar) app.querySelector('.builder')?.style.setProperty('--bar-h', `${bar.offsetHeight}px`);
  if (builderFlash) {
    const row = app.querySelector(`[data-deckrow="${builderFlash}"]`);
    row?.classList.add('just-added'); row?.scrollIntoView({ block: 'nearest' });
    if (deckFly?.id === builderFlash) mfx.flyToDeck(deckFly.rect, row, artOf(getCard(deckFly.id)));
    deckFly = null;
    builderFlash = null;
  }
}

// Swapping out a locked card: the closest cards you own (same faction, nearest cost, same type
// first) that still have room for another copy.
function replaceOptions(id) {
  const c = getCard(id);
  return [...new Set(picked.flatMap((f) => FACTION_POOLS[f]))].map(getCard)
    .filter((x) => x.id !== id && x.faction === c.faction && !isLocked(x.id) && (draftDeck[x.id] ?? 0) < DEFAULT_RULES.maxCopies)
    .sort((a, b) => Math.abs(a.cost - c.cost) - Math.abs(b.cost - c.cost) || (a.type === c.type ? 0 : 1) - (b.type === c.type ? 0 : 1) || a.cost - b.cost)
    .slice(0, 4);
}
function replacePopHTML(id) {
  const c = getCard(id);
  const k = draftDeck[id] ?? 0;
  const opts = replaceOptions(id);
  return `<div class="replace-pop" data-act="replaceCancel"><div class="rp-box" data-stop>
      <h3>🔒 ${esc(c.name)} is locked</h3>
      <p class="sub">Pick a card you own to take its place${k > 1 ? ` (one copy at a time, ${k} in your deck)` : ''}:</p>
      <div class="rp-cards">${opts.map((o) => `<div class="rp-opt" data-replace="${o.id}">${cardHTML(o)}</div>`).join('') || '<p class="sub">No cards left to swap in.</p>'}</div>
      <div class="rp-buttons"><button class="ghost" data-act="replaceRemove">Just remove it</button><button class="ghost" data-act="replaceCancel">Cancel</button></div>
    </div></div>`;
}

// The deck's mana curve: how many cards at each cost (7+ together), as small bars.
function manaCurveHTML(deck) {
  const counts = Array(8).fill(0);
  for (const id of deck) counts[Math.min(7, getCard(id).cost)] += 1;
  const top = Math.max(1, ...counts);
  return `<div class="mana-curve" title="Mana curve: cards at each cost">${counts.map((k, i) => `<span class="mc-bar"><i style="height:${Math.round((k / top) * 100)}%"></i><b>${k || ''}</b><small>${i === 7 ? '7+' : i}</small></span>`).join('')}</div>`;
}

// ---- Deck builder: drag cards into the deck (Hearthstone style) ----------------------
let builderTab = null; // the faction whose cards the builder shows
let builderFlash = null; // the deck row to flash after the next render
function deckTotal() { return Object.values(draftDeck).reduce((t, x) => t + x, 0); }
let deckFly = null; // { id, rect }: a card just dropped into the deck flies into its row
function addToDraft(id, fromRect = null) {
  if (isLocked(id)) return flash('Locked. Win matches to unlock new cards (2 per win).');
  const k = draftDeck[id] ?? 0;
  if (k >= DEFAULT_RULES.maxCopies) return flash(`Up to ${DEFAULT_RULES.maxCopies} copies of a card.`);
  if (deckTotal() >= deckSizeFor(picked)) return flash(`Your deck has ${deckSizeFor(picked)} cards. Take one out first.`);
  draftDeck = { ...draftDeck, [id]: k + 1 };
  builderFlash = id;
  deckFly = fromRect ? { id, rect: fromRect } : null;
  sound.play('cardPlay');
  render();
}
function removeFromDraft(id) {
  const k = draftDeck[id] ?? 0;
  if (!k) return;
  draftDeck = { ...draftDeck, [id]: k - 1 };
  if (!draftDeck[id]) delete draftDeck[id];
  sound.play('click');
  render();
}
const inBuilder = () => screen === 'builder' && builderMode === 'cut';
// Mouse: press and move. Touch: hold still for a moment, then drag (so the page still scrolls).
let bDrag = null;
document.addEventListener('pointerdown', (e) => {
  if (!inBuilder() || e.button > 0 || e.target.closest('.card-zoom')) return;
  const card = e.target.closest('.builder-grid [data-cut]');
  const row = e.target.closest('[data-deckrow]');
  if (!card && !row) return;
  bDrag = { id: card ? card.dataset.cut : row.dataset.deckrow, from: card ? 'collection' : 'deck', src: card ?? row,
    x: e.clientX, y: e.clientY, touch: e.pointerType !== 'mouse', armed: e.pointerType === 'mouse', ghost: null, moved: false };
  if (bDrag.touch) bDrag.timer = setTimeout(() => { if (bDrag) { bDrag.armed = true; bDrag.src.classList.add('lift'); navigator.vibrate?.(15); } }, 220);
});
function startGhost(e) {
  const r = bDrag.src.getBoundingClientRect();
  const g = bDrag.src.cloneNode(true);
  g.classList.add('builder-ghost'); g.classList.remove('lift');
  Object.assign(g.style, { width: `${r.width}px`, height: `${r.height}px`, left: `${e.clientX}px`, top: `${e.clientY}px` });
  document.body.appendChild(g);
  bDrag.ghost = g;
  document.body.classList.add('builder-dragging');
}
const overDeck = (e) => !!document.elementsFromPoint(e.clientX, e.clientY).some((el) => el.matches?.('[data-deckdrop]'));
document.addEventListener('pointermove', (e) => {
  if (!bDrag) return;
  const dist = Math.hypot(e.clientX - bDrag.x, e.clientY - bDrag.y);
  if (!bDrag.armed) { if (dist > 10) { clearTimeout(bDrag.timer); bDrag = null; } return; } // a touch that scrolls
  if (!bDrag.ghost && dist > 6) startGhost(e);
  if (!bDrag.ghost) return;
  bDrag.moved = true;
  Object.assign(bDrag.ghost.style, { left: `${e.clientX}px`, top: `${e.clientY}px` });
  const panel = app.querySelector('.deck-panel');
  const over = overDeck(e);
  panel?.classList.toggle('drop-in', bDrag.from === 'collection' && over);
  panel?.classList.toggle('drop-out', bDrag.from === 'deck' && !over);
});
// While a touch drag is on, the page must not scroll under the finger.
document.addEventListener('touchmove', (e) => { if (bDrag?.armed) e.preventDefault(); }, { passive: false });
function endDrag(e, cancelled = false) {
  if (!bDrag) return;
  const d = bDrag; bDrag = null;
  clearTimeout(d.timer);
  d.src.classList.remove('lift');
  document.body.classList.remove('builder-dragging');
  app.querySelector('.deck-panel')?.classList.remove('drop-in', 'drop-out');
  d.ghostRect = d.ghost?.getBoundingClientRect();
  d.ghost?.remove();
  if (cancelled) return;
  if (d.ghost) {
    builderSuppressClick = true; // the drag isn't also a click (a click, if any, follows straight away)
    setTimeout(() => { builderSuppressClick = false; }, 0);
    if (d.from === 'collection' && overDeck(e)) addToDraft(d.id, d.ghostRect);
    else if (d.from === 'deck' && !overDeck(e)) removeFromDraft(d.id);
  }
}
let builderSuppressClick = false;
document.addEventListener('pointerup', (e) => endDrag(e));
document.addEventListener('pointercancel', (e) => endDrag(e, true));

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

// The collection's set filter: every card, the original set, or the faction's expansion.
let bookSet = 'all';
const setCards = (f) => {
  const cards = galleryCards(f);
  if (!EXPANSION_NAMES[f] || bookSet === 'all') return cards;
  return cards.filter((c) => !c.token && !c.heroSpell && (bookSet === 'exp') === !!c.extra);
};
function renderGallery() {
  const factions = [...Object.keys(FACTION_LISTS), 'Fusion'];
  bookPage = factions.includes(bookPage) ? bookPage : factions[0];
  galleryOrder = setCards(bookPage).map((c) => c.id);
  const f = bookPage;
  const art = heroArtOf(f);
  const scrollY = app.scrollTop;
  app.innerHTML = `
    <div class="book">
      <div class="book-head"><h2>Card collection</h2><button data-act="menu" class="ghost">Back</button></div>
      <div class="book-body">
        <nav class="book-tabs">${factions.map((x) => `<button class="book-tab f-${x.toLowerCase()} ${x === f ? 'on' : ''}" data-book="${esc(x)}" title="${esc(x)}">
          ${crestHTML(x)}<b>${esc(x).replace('Ultraterrestrials', 'Ultra&shy;terrestrials')}</b></button>`).join('')}</nav>
        <section class="book-page f-${f.toLowerCase()} ${bookTurned ? 'turn' : ''}">
          <header class="page-title">${art ? `<img src="${art}" alt="">` : ''}<div><h3>${esc(f)}</h3>
            <span class="sub">${f === 'Fusion'
    ? `${galleryCards(f).filter((c) => c.fusion).length} Fusion Hero Spells · one per faction pair · charges as you use your Hero Spells (3 uses) · click a card to see it full size`
    : `${hasExtras(f) ? `${FACTION_POOLS[f].length} cards (${FACTION_POOLS[f].length - FACTION_LISTS[f].length} new) · a deck uses ${FACTION_DECKS[f].length}` : `${FACTION_DECKS[f].length}/${FACTION_LISTS[f].length} cards`} · Hero Spell first, tokens last · click a card to see it full size`}</span></div></header>
          ${EXPANSION_NAMES[f] ? `<nav class="set-filter">${[['all', 'All cards'], ['core', 'Original set'], ['exp', EXPANSION_NAMES[f]]].map(([k, label]) =>
            `<button class="ghost ${bookSet === k ? 'on' : ''}" data-bookset="${k}">${k === 'exp' ? '✦ ' : ''}${esc(label)}</button>`).join('')}</nav>` : ''}
          ${pagerHTML(`gal:${f}:${bookSet}`, setCards(f).map((c) => (isLocked(c.id)
            ? cardHTML(c, { zoom: true, isCut: true, cutLabel: '🔒 LOCKED' }).replace('class="card ', 'class="card locked ')
            : cardHTML(c, { zoom: true }).replace('class="card ', `class="card ${c.extra ? 'expansion ' : ''}`))).join(''), { chain: true })}
        </section>
      </div>
    </div>
    ${zoomId ? zoomHTML(getCard(zoomId)) : ''}`;
  bookTurned = false;
  app.scrollTop = scrollY;
}

// One screenful of cards with page arrows (pager.js lays it out after render).
const pagerHTML = (key, cards, { chain = false, cls = '' } = {}) => `<div class="pager ${cls}" data-pager="${esc(key)}"${chain ? ' data-chain="1"' : ''}>
  <button class="pg-arrow prev" data-page="-1" aria-label="Previous page">‹</button>
  <div class="pager-grid gallery-grid ${cls}">${cards}</div>
  <button class="pg-arrow next" data-page="1" aria-label="Next page">›</button>
  <span class="pg-count"></span></div>`;

// A faction's crest: the emblem from the middle of its card back (Fusion gets a split of colours).
const crestHTML = (f) => (backArtOf(f) ? `<i class="crest" style="background-image:url('${backArtOf(f)}')"></i>` : '<i class="crest crest-fusion"></i>');

// "3-Mana Minion", "Hero Spell", "Fusion Hero Spell" … for the zoom panel.
const kindOf = (card) => card.fusion ? 'Fusion Hero Spell' : card.heroSpell ? 'Hero Spell'
  : `${card.cost}-Mana ${card.token ? 'Token ' : ''}${card.type === 'minion' ? 'Minion' : card.type === 'trap' ? 'Trap' : card.quickPlay ? 'Quick Play Spell' : 'Spell'}`;

// Opening / paging animations for the zoom: set just before render(), played right after it.
let zoomAnim = null;
const calmMotion = () => document.body.classList.contains('reduced-motion') || matchMedia('(prefers-reduced-motion: reduce)').matches;
function playZoomAnim(a) {
  const card = app.querySelector('.zoom-overlay .big-card');
  if (!card || calmMotion()) return;
  const ease = 'cubic-bezier(.2,.8,.2,1)';
  if (a.from) {
    // Grow out of the card that was clicked, while the backdrop fades in.
    const to = card.getBoundingClientRect();
    const dx = a.from.left + a.from.width / 2 - (to.left + to.width / 2), dy = a.from.top + a.from.height / 2 - (to.top + to.height / 2);
    card.animate([{ transform: `translate(${dx}px, ${dy}px) scale(${a.from.width / to.width})`, opacity: 0.7 }, { transform: 'none', opacity: 1 }], { duration: 340, easing: ease });
    app.querySelector('.zoom-overlay').animate([{ backgroundColor: 'rgba(0,0,0,0)', backdropFilter: 'blur(0px)' }, { backgroundColor: 'rgba(8,5,7,0.88)', backdropFilter: 'blur(7px)' }], { duration: 300, easing: 'ease-out' });
  } else if (a.dir) {
    card.animate([{ transform: `translateX(${a.dir * 70}px) rotate(${a.dir * 2}deg)`, opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 260, easing: ease });
  } else if (a.flip) {
    // Lycanthropes: the card turns over to its other form.
    card.animate([{ transform: 'perspective(900px) rotateY(90deg)', filter: 'brightness(1.8)' }, { transform: 'none', filter: 'none' }], { duration: 320, easing: ease });
  }
  app.querySelector('.zoom-side')?.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 260, delay: a.from ? 140 : 60, easing: ease, fill: 'backwards' });
  card.classList.add('foil-sweep');
}
const zoomFrom = (el) => { const r = (el.closest('.card') ?? el).getBoundingClientRect(); return r.width ? { from: r } : {}; };

// The collection / builder zoom: the big card plus its keyword glossary. On phones the side
// arrows give way to a nav bar above the card (and swiping), and the whole view scrolls.
function zoomHTML(base) {
  const i = galleryOrder.indexOf(base.id);
  // Lycanthropes: the arrow flips between the Humanoid and Beast Form cards.
  // (Sobek: the same arrow shows the Fossil it is Reborn as.)
  const twin = base.beastForm || base.rebornAs ? getCard(base.beastForm ?? base.rebornAs) : null;
  const twinName = base.rebornAs ? (zoomBeast ? 'Sobek' : 'Fossil') : zoomBeast ? 'Humanoid Form' : 'Beast Form';
  const card = twin && zoomBeast ? twin : base;
  const first = i <= 0, last = i >= galleryOrder.length - 1;
  const art = artOf(card);
  return `
    <div class="zoom-overlay" data-act="closeZoom">
      <div class="zoom-wrap" data-stop>
        <div class="zoom-mnav">
          <button class="ghost" data-act="zoomPrev" ${first ? 'disabled' : ''}>‹ Prev</button>
          <span class="sub">${i + 1} / ${galleryOrder.length}</span>
          <button class="ghost" data-act="zoomNext" ${last ? 'disabled' : ''}>Next ›</button>
          <button class="ghost" data-act="closeZoom" title="Close">✕</button>
        </div>
        <button class="zoom-arrow" data-act="zoomPrev" ${first ? 'disabled' : ''} title="Previous (←)">‹</button>
        ${bigCardHTML(card).replace(/<\/div>\s*$/, `<i class="zoom-foil"></i>${twin ? `<button class="zoom-flip-arrow" data-act="zoomFlip" title="Show ${twinName}">⟲</button>` : ''}</div>`)}
        <aside class="zoom-side">
          <header class="zoom-head">
            <span class="zoom-faction">${crestHTML(card.faction)}<span>${esc(card.faction)}</span></span>
            <span class="zoom-count">${i + 1} / ${galleryOrder.length}</span>
            <button class="zoom-close ghost" data-act="closeZoom" title="Close (Esc)">✕</button>
          </header>
          <div class="zoom-kind">${card.form === 'beast' ? `Beast Form · ${card.cost}-Mana Minion` : esc(kindOf(card))}</div>
          ${twin ? `<button class="zoom-flip ghost" data-act="zoomFlip">⟲ Show ${twinName}</button>` : ''}
          ${isLocked(card.id) ? '<div class="zoom-locked">🔒 Locked · every win unlocks 2 new cards</div>' : ''}
          ${art ? '<button class="zoom-artbtn ghost" data-act="zoomArt">View full art</button>' : ''}
          ${cardTerms(card).length ? `<div class="zoom-sub">Keywords</div>${cardTerms(card).map((t) => `<div class="zoom-term"><b>${esc(t)}</b><span>${esc(KEYWORD_TEXT[t])}</span></div>`).join('')}` : ''}
        </aside>
        <button class="zoom-arrow" data-act="zoomNext" ${last ? 'disabled' : ''} title="Next (→)">›</button>
      </div>
      ${zoomArt && art ? `<div class="art-view" data-act="closeArt" title="Tap to go back">
        <img src="${art}" alt="${esc(card.name)}" draggable="false">
        <div class="art-view-cap">${esc(card.name)} <span class="sub">· tap to go back${galleryOrder.length > 1 ? ' · swipe for the next card' : ''}</span></div>
      </div>` : ''}
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

// Each [data-count] number climbs from 0 to its value, a row at a time.
function countUp(root) {
  if (calmMotion()) return;
  for (const el of root.querySelectorAll('[data-count]')) {
    const to = Number(el.dataset.count);
    if (!to) continue;
    const row = Number(el.closest('[style*="--i"]')?.style.getPropertyValue('--i') || 0);
    const start = performance.now() + 700 + row * 140;
    const dur = Math.min(900, 300 + to * 25);
    el.textContent = '0';
    const tick = (now) => {
      if (!el.isConnected) return;
      const k = Math.min(1, Math.max(0, (now - start) / dur));
      el.textContent = String(Math.round(to * (1 - (1 - k) ** 3)));
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}

function renderGame() {
  const s = game.state;
  // A win (vs the AI or online) unlocks expansion cards, once per match.
  if (s.gameOver && heroesShattered && !game.unlockChecked) {
    game.unlockChecked = true;
    if (game.mode !== 'online') milestone = recordMatch() ?? milestone;
    if (s.winner === viewer && (game.mode === 'ai' || game.mode === 'online')) game.unlocked = awardUnlocks();
  }
  app.innerHTML = boardHTML({
    s, me: viewer, legal: legalForView(), mode: game.mode, handoff, isAI, history, logOpen, mullMarked, shattered: heroesShattered, rope: ropeState(),
    endArmed: endArmed === s.turn, concedeAsk, stats: game.stats, online: game.online, result: game.result, waiting: waitingInQueue(),
    unlocked: game.unlocked, fresh: s.gameOver && heroesShattered && !game.summaryShown,
    canUndo: undoStack.length > 0 && !animating && s.activePlayer === viewer && !s.pending, recap: recap && s.activePlayer === viewer && !s.gameOver ? { ...recap, fresh: Date.now() - recap.at < 600 } : null,
    thinking: !s.gameOver && isAI(actingPlayer(s)) && s.pending?.type !== 'mulligan' ? s.players[actingPlayer(s)].name : null,
  });
  if (app.querySelector('.arena.has-board')) showBoard(s.players[viewer].factions[0], s.descent?.depth ?? 0); else hideBoard();
  layoutPortraitBoard(app);
  portraitCircleFx(app, s.descent?.depth ?? 0);
  layoutHands(app);
  // The results panel's numbers count up the first time it appears.
  const summary = app.querySelector('.game-over.fresh');
  if (summary) { game.summaryShown = true; countUp(summary); }
  if (game.unlocked?.length && !game.unlockSeen) {
    // Fresh results first: the pop-up waits until the panel has played in.
    app.insertAdjacentHTML('beforeend', unlockPopupHTML(game.unlocked).replace('class="overlay unlock-overlay"', `class="overlay unlock-overlay ${summary ? 'after-results' : ''}"`));
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
  // Against the AI the turn is untimed unless you turn the timer on in Settings.
  if (game.mode === 'ai' && !getSettings().turnTimerVsAI) return null;
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

// Moving between screens: a dark veil lifts off the new screen as it settles into place
// (the collection turns in like a page; a match rises out of the dark).
let shownScreen = null;
function screenChange(from, to) {
  if (calmMotion() || !from) return;
  const veil = document.createElement('div');
  veil.className = 'screen-veil';
  document.body.appendChild(veil);
  fx.animate(veil, [{ opacity: 1 }, { opacity: 0 }], { duration: to === 'game' ? 520 : 380, easing: 'ease-out' }).then(() => veil.remove());
  const frames = to === 'gallery' || to === 'builder'
    ? [{ opacity: 0, transform: 'perspective(1600px) rotateY(-10deg) translateX(-30px)', transformOrigin: '0 50%' }, { opacity: 1, transform: 'none', transformOrigin: '0 50%' }]
    : to === 'game' ? [{ opacity: 0.4, transform: 'scale(1.03)' }, { opacity: 1, transform: 'none' }]
      : [{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }];
  const root = app.firstElementChild;
  if (root && !root.classList.contains('arena')) fx.animate(root, frames, { duration: 420, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'none' });
}

// Text typed into a form survives a redraw of the same screen (say, when the server connects
// while the player is typing their name).
const KEPT_INPUTS = ['acct-name', 'acct-pass', 'friend-input', 'room-input', 'delete-pass'];
function keepInputs() {
  const focus = document.activeElement?.id;
  const vals = KEPT_INPUTS.map((id) => [id, app.querySelector(`#${id}`)?.value]).filter(([, v]) => v);
  return () => {
    for (const [id, v] of vals) { const el = app.querySelector(`#${id}`); if (el && !el.value) el.value = v; }
    if (focus && KEPT_INPUTS.includes(focus)) app.querySelector(`#${focus}`)?.focus();
  };
}

// One-off animations to play right after the next render (menu-fx.js).
const afterRender = [];
function render() {
  // A new screen opens at its top (menus scroll inside #app).
  if (screen !== shownScreen) app.scrollTop = 0;
  const tabsBefore = screen === shownScreen ? mfx.tabRects(app) : null;
  const restoreInputs = screen === shownScreen ? keepInputs() : null;
  document.body.classList.toggle('in-game', screen === 'game');
  if (screen !== 'game') hideBoard();
  if (screen !== 'menu' && screen !== 'online' && screen !== 'howto' && screen !== 'signin') showMenuBackdrop(false);
  if (screen !== 'game') clearTips();
  if (screen === 'menu') renderMenu();
  else if (screen === 'gallery') renderGallery();
  else if (screen === 'builder') renderBuilder();
  else if (screen === 'online') renderLobby();
  else if (screen === 'signin') renderSignIn();
  else if (screen === 'howto') { app.innerHTML = howToPlayHTML(KEYWORD_TEXT, howtoPage); showMenuBackdrop(true); }
  else renderGame();
  restoreInputs?.();
  music(screen === 'game' ? 'battle' : 'menu');
  const fitting = FIT_SCREENS.has(screen) && landscape();
  app.classList.toggle('fit-screen', fitting);
  // Upright phones keep the scrolling layouts.
  if (!fitting) app.firstElementChild?.classList.remove('ts-fit', 'howto-book', 'lobby-fit');
  fitLandscape = landscape();
  layoutFit();
  fitAllText(app);
  syncReactionTimer();
  syncTurnTimer();
  syncWaitBanner();
  if (pendingStart && !animating) { const m = pendingStart; pendingStart = null; queueMicrotask(() => onServerMessage(m)); }
  if (screen !== shownScreen) { screenChange(shownScreen, screen); shownScreen = screen; }
  if (zoomAnim) { const a = zoomAnim; zoomAnim = null; if (zoomId) playZoomAnim(a); }
  mfx.slideTabs(app, tabsBefore);
  if (screen === 'builder') mfx.animateCurve(app);
  for (const f of afterRender.splice(0)) f();
}

// A human Quick Play window auto-passes after quickPlaySeconds.
let reactionPrompted = null;
function syncReactionTimer() {
  const s = game?.state;
  const open = screen === 'game' && s?.pending?.type === 'reaction' && !isAI(s.pending.player) && !handoff;
  const key = open ? `${s.turn}|${s.log.length}|${s.pending.window}|${s.pending.player}` : null;
  if (reactionTimer && reactionTimer.key !== key) { clearInterval(reactionTimer.interval); reactionTimer = null; }
  if (!open || reactionTimer) { paintCountdown(); return; }
  // Untimed vs the AI (Settings → Turn timer vs AI): no countdown, no auto-pass.
  if (game.mode === 'ai' && !getSettings().turnTimerVsAI) {
    if (reactionPrompted !== key) { reactionPrompted = key; sound.play('quickPlay'); }
    const cd = app.querySelector('.countdown');
    if (cd) cd.style.display = 'none';
    return;
  }
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
let previewFor = null; // the card the hover preview is showing (or about to show)
function previewEl() {
  let el = document.getElementById('preview');
  if (!el) { el = document.createElement('div'); el.id = 'preview'; document.body.appendChild(el); }
  return el;
}
function hidePreview() {
  clearTimeout(previewTimer);
  previewFor = null;
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
  // Lycanthropes: the other form is shown beside it.
  const twinId = card.beastForm ?? card.humanForm;
  const twin = twinId ? getCard(twinId) : null;
  el.innerHTML = bigCardHTML(card, live) + (twin ? `<div class="preview-twin"><span>${twin.form === 'beast' ? 'Beast Form' : 'Humanoid Form'}</span>${bigCardHTML(twin)}</div>` : '') + note;
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

// Moving between the parts of one card (art, text, frame) is still hovering that card:
// only entering a different card (or leaving it) changes or closes the preview.
document.addEventListener('pointerover', (e) => {
  if (screen !== 'game' || e.pointerType === 'touch') return;
  const t = e.target.closest('[data-preview]');
  if (!t || t.closest('.overlay, .reaction') || drag.busy() || animating) return;
  if (t === previewFor) return;
  previewFor = t;
  clearTimeout(previewTimer);
  previewTimer = setTimeout(() => { if (t.isConnected && !drag.busy() && previewFor === t) showPreview(t); }, 280);
});
document.addEventListener('pointerout', (e) => {
  const t = e.target.closest?.('[data-preview]');
  if (!t || (e.relatedTarget && t.contains(e.relatedTarget))) return;
  if (previewFor === t) previewFor = null;
  // Mouse: a hand card you clicked (lifted) settles back into the hand once you move off it.
  if (e.pointerType !== 'touch' && t.matches('.my-hand [data-hand].inspect') && !drag.busy()) drag.putBack();
  hidePreview();
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
  // Hero Spells are buttons too: holding one shows the spell (releasing doesn't cast it).
  if (!t || t.closest('[data-hand], .reaction') || t.closest('button:not(.hero-spell)')) return;
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
// The hovered hand card tilts toward the pointer.
document.addEventListener('pointermove', (e) => {
  if (screen !== 'game' || e.pointerType !== 'mouse' || drag.busy()) return;
  const card = e.target.closest?.('.my-hand .card');
  if (!card) return;
  const r = card.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
  card.style.setProperty('--tilt-x', `${(x * 16).toFixed(1)}deg`);
  card.style.setProperty('--tilt-y', `${(-y * 12).toFixed(1)}deg`);
  card.style.setProperty('--glare-x', `${((x + 0.5) * 100).toFixed(0)}%`);
  card.style.setProperty('--glare-y', `${((y + 0.5) * 100).toFixed(0)}%`);
});
document.addEventListener('pointerout', (e) => {
  const card = e.target.closest?.('.my-hand .card');
  if (card && !card.contains(e.relatedTarget)) { card.style.removeProperty('--tilt-x'); card.style.removeProperty('--tilt-y'); }
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
  canPlan,
  act,
  inspect: (el) => (el ? showPreview(el) : hidePreview()),
  deny,
  notMyTurn: () => screen === 'game' && !!game && !animating && !handoff && !game.state.gameOver && !game.state.pending && game.state.activePlayer !== viewer,
});

// Every button makes the same soft click (the game's own buttons, End Turn and the like, have theirs).
document.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (b && !b.disabled && !b.matches('.end-turn, .hero-spell, .play-art, .emote-btn, .qp-option')) sound.play('click');
}, true);

app.addEventListener('click', (e) => {
  // Clicks inside the zoomed card panel don't close it (only its own buttons act).
  if (suppressZoomClick && e.target.closest('.zoom-overlay')) return; // the tap that ended a swipe
  const pgBtn = e.target.closest('[data-page]');
  if (pgBtn) return pageTurn(pgBtn.closest('.pager'), Number(pgBtn.dataset.page));
  const btn = e.target.closest('[data-act]');
  if (btn && !((btn.classList.contains('zoom-overlay') || btn.classList.contains('replace-pop')) && e.target.closest('[data-stop]'))) return onButton(btn.dataset.act);
  // Swapping a locked card in the deck builder for one you own (one copy at a time).
  const rep = e.target.closest('[data-replace]');
  if (rep && screen === 'builder' && replaceFor) {
    const id = rep.dataset.replace;
    draftDeck = { ...draftDeck, [replaceFor]: (draftDeck[replaceFor] ?? 0) - 1, [id]: (draftDeck[id] ?? 0) + 1 };
    if (!draftDeck[replaceFor]) { delete draftDeck[replaceFor]; replaceFor = null; }
    builderFlash = id;
    sound.play('cardPlay');
    return render();
  }
  // Premade decks in the deck builder: load one, locked cards and all (they're marked).
  const preBtn = e.target.closest('[data-premade]');
  if (preBtn && screen === 'builder') {
    const d = premadeDecks(picked)[Number(preBtn.dataset.premade)];
    if (d) {
      draftDeck = countsOf(d.deck);
      const lk = lockedIn(d.deck).length;
      flash(lk ? `Loaded "${d.name}". ${lk} of its cards are locked: click a 🔒 card in your deck to swap it.` : `Loaded "${d.name}". Press Save deck to play it.`);
      return render();
    }
  }
  // The deck picker on the menu: play a premade or saved deck (one with locked cards opens in the builder).
  const pickBtn = e.target.closest('[data-pickdeck]');
  if (pickBtn && (screen === 'menu' || screen === 'online')) {
    const d = deckChoices(picked)[Number(pickBtn.dataset.pickdeck)];
    if (!d) return;
    if (lockedIn(d.deck).length) {
      builderFrom = screen === 'online' ? 'online' : null; builderMode = 'cut'; draftDeck = countsOf(d.deck); zoomId = null; screen = 'builder'; app.scrollTop = 0;
      flash(`"${d.name}" needs ${lockedIn(d.deck).length} locked card${lockedIn(d.deck).length === 1 ? '' : 's'}: click a 🔒 card in your deck to swap it, then Save deck.`);
      return render();
    }
    storeDeck(picked, sameDeck(d.deck, recommendedDeck(picked)) ? null : d.deck);
    flash(`Playing "${d.name}".`);
    return render();
  }
  // Named decks in the deck builder: load one, or delete it.
  const slotBtn = e.target.closest('[data-slot]');
  if (slotBtn && screen === 'builder') {
    const d = deckSlots(picked)[Number(slotBtn.dataset.slot)];
    if (d) { draftDeck = countsOf(d.deck); flash(`Loaded "${d.name}". Press Save deck to play it.`); return render(); }
  }
  const slotDel = e.target.closest('[data-slotdel]');
  if (slotDel && screen === 'builder') {
    const list = deckSlots(picked);
    const [gone] = list.splice(Number(slotDel.dataset.slotdel), 1);
    storeSlots(picked, list);
    if (gone) flash(`Deleted "${gone.name}".`);
    return render();
  }
  const zoom = e.target.closest('[data-zoom]');
  const lockedCard = (screen === 'gallery' || screen === 'builder') && e.target.closest('.card.locked');
  if (lockedCard) {
    mfx.rattle(lockedCard);
    const f = getCard(lockedCard.dataset.zoom ?? lockedCard.dataset.cut ?? lockedCard.querySelector('[data-zoom]')?.dataset.zoom)?.faction;
    const left = lockedCount(f);
    // Locked cards can still be opened full size to read (handy on phones, where they're small).
    const id = lockedCard.dataset.zoom ?? lockedCard.dataset.cut ?? lockedCard.querySelector('[data-zoom]')?.dataset.zoom;
    if (id && getCard(id)) { zoomId = id; zoomAnim = zoomFrom(lockedCard); return render(); }
    return flash(`Locked. Every win unlocks 2 new cards${left ? ` · ${left} ${esc(f ?? '')} card${left === 1 ? '' : 's'} still locked (about ${Math.ceil(left / UNLOCKS_PER_WIN)} win${Math.ceil(left / UNLOCKS_PER_WIN) === 1 ? '' : 's'})` : ''}.`);
  }
  if (zoom && (screen === 'gallery' || screen === 'builder' || screen === 'menu')) { zoomId = zoom.dataset.zoom; zoomAnim = zoomFrom(zoom); return render(); }
  const swapBtn = e.target.closest('[data-swap]');
  if (swapBtn && screen === 'menu') {
    builderMode = 'swap'; swapFaction = swapBtn.dataset.swap; draftLineup = [...lineupOf(swapFaction, savedLineups())];
    zoomId = null; screen = 'builder'; app.scrollTop = 0; return render();
  }
  const cutCard = e.target.closest('[data-cut]');
  if (cutCard && screen === 'builder' && builderMode === 'swap') {
    const id = cutCard.dataset.cut;
    if (isLocked(id)) return flash('Locked. Win matches to unlock new cards (2 per win).');
    draftLineup = draftLineup.includes(id) ? draftLineup.filter((x) => x !== id) : [...draftLineup, id];
    return render();
  }

  if (screen === 'builder' && builderMode === 'cut' && builderSuppressClick) { builderSuppressClick = false; return; }
  const deckRow = e.target.closest('[data-deckrow]');
  if (deckRow && inBuilder() && isLocked(deckRow.dataset.deckrow)) { replaceFor = deckRow.dataset.deckrow; return render(); }
  if (deckRow && inBuilder()) return removeFromDraft(deckRow.dataset.deckrow);
  if (cutCard && inBuilder()) { zoomId = cutCard.dataset.cut; zoomAnim = zoomFrom(cutCard); return render(); }
  if (cutCard && screen === 'builder') {
    // Two-faction deck: each click adds a copy (up to 2); one more takes the card out.
    const id = cutCard.dataset.cut;
    if (isLocked(id)) return flash('Locked. Win matches to unlock new cards (2 per win).');
    const k = draftDeck[id] ?? 0;
    const total = Object.values(draftDeck).reduce((t, x) => t + x, 0);
    if (k < DEFAULT_RULES.maxCopies && total >= DEFAULT_RULES.pairDeckSize) {
      if (k === 0) return flash(`Your deck has ${DEFAULT_RULES.pairDeckSize} cards. Take one out first.`);
      draftDeck = { ...draftDeck }; delete draftDeck[id]; return render();
    }
    draftDeck = { ...draftDeck, [id]: k + 1 };
    if (draftDeck[id] > DEFAULT_RULES.maxCopies) delete draftDeck[id];
    return render();
  }
  const ch = e.target.closest('[data-howto]');
  if (ch && screen === 'howto') { howtoPage = Number(ch.dataset.howto); sound.play('draw'); return render(); }
  const setBtn = e.target.closest('[data-bookset]');
  if (setBtn && screen === 'gallery') { bookSet = setBtn.dataset.bookset; sound.play('draw'); afterRender.push(() => mfx.dealIn(app.querySelector('.pager'))); return render(); }
  const btab = e.target.closest('[data-btab]');
  if (btab && screen === 'builder') {
    if (builderMode === 'swap') swapTab = btab.dataset.btab; else builderTab = btab.dataset.btab;
    sound.play('draw');
    afterRender.push(() => mfx.dealIn(app.querySelector('.pager')));
    return render();
  }
  const tab = e.target.closest('[data-book]');
  if (tab && screen === 'gallery') {
    if (tab.dataset.book !== bookPage) { bookPage = tab.dataset.book; bookTurned = true; sound.play('draw'); app.scrollTop = 0; afterRender.push(() => mfx.dealIn(app.querySelector('.pager'))); }
    return render();
  }
  const first = e.target.closest('[data-first]');
  if (first && screen === 'menu') {
    const f = first.dataset.first;
    firstPicks = firstPicks.includes(f) ? firstPicks.filter((x) => x !== f) : firstPicks.length < FIRST_PICKS ? [...firstPicks, f] : firstPicks;
    sound.play('click');
    return render();
  }
  if (e.target.closest('[data-sealed]') && screen === 'menu') return flash('This realm opens as you play: two more after every match.');
  const chip = e.target.closest('[data-faction]');
  if (chip && (screen === 'menu' || (screen === 'online' && lobbyEditable()))) {
    const f = chip.dataset.faction;
    const adding = !picked.includes(f);
    picked = adding ? [...picked, f].slice(-pickNeeded()) : picked.filter((x) => x !== f);
    if (adding) afterRender.push(() => mfx.realmPicked(app, f));
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
    case 'ai': {
      sound.play('click');
      if (screen !== 'menu' || needsFirstPick() || picked.length !== pickNeeded()) return startGame('ai');
      if (playLaunching) return;
      playLaunching = true;
      const wait = mfx.playBurst(app.querySelector('.ts-play'));
      setTimeout(() => { playLaunching = false; if (screen === 'menu') startGame('ai'); }, wait);
      return;
    }
    case 'hotseat': sound.play('click'); return startGame('hotseat');
    case 'continue': game = loadSaved(); return game ? enterGame() : render();
    case 'guide': guideOpen = true; return render();
    case 'closeGuide': guideOpen = false; return render();
    case 'gallery': screen = 'gallery'; zoomId = null; app.scrollTop = 0; return render();
    case 'howtoPrev': howtoPage = Math.max(0, howtoPage - 1); sound.play('draw'); return render();
    case 'howtoNext': howtoPage = Math.min(HOWTO_PAGES - 1, howtoPage + 1); sound.play('draw'); return render();
    case 'howto': sound.play('click'); markHowToOpened(); screen = 'howto'; howtoPage = 0; app.scrollTop = 0; return render();
    case 'undo': {
      if (animating || !undoStack.length || !game) return;
      const u = undoStack.pop();
      game.state = u.state; game.stats = u.stats; history.length = Math.min(history.length, u.history);
      drag.cancel(); hidePreview(); sound.play('click');
      return render();
    }
    case 'closeRecap': recap = null; return render();
    case 'closeZoom': zoomId = null; zoomArt = false; zoomBeast = false; return render();
    case 'zoomFlip': zoomBeast = !zoomBeast; zoomAnim = { flip: true }; return render();
    case 'zoomArt': zoomArt = true; return render();
    case 'closeArt': zoomArt = false; return render();
    case 'firstBegin':
      if (firstPicks.length !== FIRST_PICKS) return;
      chooseFirstRealms(firstPicks); picked = [firstPicks[0]]; firstPicks = []; sound.play('versus'); return startGame('ai');
    case 'milestoneOk': { const m = milestone; milestone = null; sound.play('click'); if (m?.kind === 'fusion') setFormat('pair'); return render(); }
    case 'journeySkip': unlockEverything(); sound.play('click'); flash('Everything is unlocked: all realms, two-faction decks, traps and Quick Plays.'); return render();
    case 'unlockOk': if (game) game.unlockSeen = true; sound.play('click'); return render();
    case 'editCuts': replaceFor = null; builderFrom = screen === 'online' ? 'online' : null; builderMode = 'cut'; draftDeck = countsOf(pairDeckFor(picked)); zoomId = null; screen = 'builder'; app.scrollTop = 0; return render();
    case 'formatPair': setFormat('pair'); return render();
    case 'formatSingle': setFormat('single'); return render();
    case 'resetCuts': storeDeck(picked, null); storeCuts(picked, null); flash('Using the recommended deck.'); return render();
    case 'cutStandard': draftDeck = countsOf(recommendedDeck(picked)); return render();
    case 'swapStandard': draftLineup = [...FACTION_DECKS[swapFaction]]; return render();
    case 'swapSave': {
      const std = FACTION_DECKS[swapFaction];
      const same = draftLineup.length === std.length && draftLineup.every((id) => std.includes(id));
      storeLineup(swapFaction, same ? null : draftLineup);
      flash(same ? `Saved: standard ${swapFaction} cards.` : `Saved your ${swapFaction} cards.`);
      screen = 'menu';
      return render();
    }
    case 'cutClear': draftDeck = {}; return render();
    case 'replaceCancel': replaceFor = null; return render();
    case 'replaceRemove': if (replaceFor) { const id = replaceFor; replaceFor = null; removeFromDraft(id); } return;
    case 'slotSave': {
      const deck = deckOf(draftDeck);
      if (builderProblem(picked, deck)) return flash(builderProblem(picked, deck));
      const list = deckSlots(picked);
      if (list.length >= 12) return flash('You can keep up to 12 decks for this pair. Delete one first.');
      const name = (app.querySelector('.ds-name')?.value ?? '').trim().slice(0, 24) || `Deck ${list.length + 1}`;
      storeSlots(picked, [...list, { name, deck }]);
      storeDeck(picked, deck);
      flash(`Saved "${name}". It's now the deck you play.`);
      return render();
    }
    case 'cutSave': {
      const deck = deckOf(draftDeck);
      if (builderProblem(picked, deck)) return flash(builderProblem(picked, deck));
      const rec = countsOf(recommendedDeck(picked));
      const same = Object.keys(rec).length === Object.keys(draftDeck).length && Object.entries(rec).every(([id, k]) => draftDeck[id] === k);
      storeDeck(picked, same ? null : deck);
      if (same) storeCuts(picked, null);
      flash(same ? 'Saved: recommended deck.' : 'Deck saved.');
      screen = builderFrom === 'online' ? 'online' : 'menu';
      builderFrom = null;
      return render();
    }
    case 'zoomPrev': case 'zoomNext': {
      const next = galleryOrder[Math.max(0, Math.min(galleryOrder.length - 1, galleryOrder.indexOf(zoomId) + (name === 'zoomNext' ? 1 : -1)))];
      if (next === zoomId) return;
      zoomId = next; zoomBeast = false; zoomAnim = { dir: name === 'zoomNext' ? 1 : -1 }; return render();
    }
    case 'menu':
      clearTimeout(aiTimer); drag.cancel(); hidePreview();
      // From a bot game played while queued: back to the queue (still searching).
      if (screen === 'game' && waitingInQueue()) { screen = 'online'; return render(); }
      // The deck builder opened from the online screen goes back there.
      if (screen === 'builder' && builderFrom === 'online') { builderFrom = null; screen = 'online'; return render(); }
      if (game?.mode === 'online' || screen === 'online') leaveOnline();
      screen = 'menu';
      return render();
    case 'botWhileWaiting': return startBotWhileWaiting();
    case 'online':
      if (!BUILD.online) return;
      sound.play('click');
      if (picked.length !== pickNeeded()) return flash(`Pick ${pickNeeded()} factions.`);
      lobby = { status: 'choose' }; screen = 'online'; app.scrollTop = 0;
      connectServer();
      return render();
    case 'acctLogin': acct.tab = 'login'; acct.msg = null; return render();
    case 'acctRegister': acct.tab = 'register'; acct.msg = null; return render();
    case 'signIn': case 'signUp': return submitAccount();
    case 'signOut':
      srv.logout(); lobby = { status: 'choose' };
      if (BUILD.online) { acct.tab = 'login'; acct.msg = null; screen = 'signin'; }
      return render();
    case 'playOffline':
      try { sessionStorage.setItem(OFFLINE_KEY, '1'); } catch { /* storage unavailable */ }
      srv.disconnect(); acct.msg = null; screen = 'menu';
      return render();
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
      if (waitingInQueue()) return startBotWhileWaiting();
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
    if (e.key === 'Escape') onButton(zoomArt ? 'closeArt' : 'closeZoom');
    if (e.key === 'ArrowLeft') onButton('zoomPrev');
    if (e.key === 'ArrowRight') onButton('zoomNext');
  }
});

// The zoomed card's foil follows the mouse: a glint band plus a soft glare where the light hits.
document.addEventListener('pointermove', (e) => {
  if (!zoomId || e.pointerType !== 'mouse') return;
  const card = app.querySelector('.zoom-overlay .big-card');
  if (!card) return;
  const r = card.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
  const near = x > -0.3 && x < 1.3 && y > -0.2 && y < 1.2;
  card.style.setProperty('--fx', `${(100 - x * 100).toFixed(1)}%`);
  card.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
  card.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
  card.classList.toggle('foil-lit', near);
});

// Swipe left / right on the zoomed card (or its full art) to page through the collection.
let zoomSwipe = null;
document.addEventListener('touchstart', (e) => {
  zoomSwipe = zoomId && e.touches.length === 1 && e.target.closest('.zoom-overlay') ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
}, { passive: true });
document.addEventListener('touchend', (e) => {
  if (!zoomSwipe || !zoomId) return;
  const t = e.changedTouches[0];
  const dx = t.clientX - zoomSwipe.x, dy = t.clientY - zoomSwipe.y;
  zoomSwipe = null;
  if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
  suppressZoomClick = true; setTimeout(() => { suppressZoomClick = false; }, 400);
  onButton(dx < 0 ? 'zoomNext' : 'zoomPrev');
}, { passive: true });
let suppressZoomClick = false;

// Menus, collection and deck builder fit the window with no scrolling (like Hearthstone):
// card grids turn pages and the deck list squeezes its rows to fit.
const FIT_SCREENS = new Set(['gallery', 'builder', 'menu', 'howto', 'online']);
const landscape = () => innerWidth > innerHeight;
let fitLandscape = null;
function layoutFit() {
  if (!FIT_SCREENS.has(screen) || !landscape()) {
    for (const c of app.querySelectorAll('.pager-grid > *')) { c.style.display = ''; c.style.zoom = ''; }
    for (const g of app.querySelectorAll('.pager-grid')) g.removeAttribute('style');
    return;
  }
  layoutPagers(app);
  // After paging through the zoomed cards, the page shows the card you stopped on.
  if (zoomId) {
    for (const pg of app.querySelectorAll('.pager')) {
      const i = [...pg.querySelector('.pager-grid').children].findIndex((c) => c.matches(`[data-zoom="${zoomId}"], [data-cut="${zoomId}"]`) || c.querySelector(`[data-zoom="${zoomId}"], [data-cut="${zoomId}"]`));
      if (i >= 0 && pg.querySelector('.pager-grid').children[i].style.display === 'none') showCard(pg, i);
    }
  }
  fitDeckRows();
}
function fitDeckRows() {
  const box = app.querySelector('.deck-rows');
  if (!box) return;
  const rows = box.querySelectorAll('.deck-row');
  box.classList.remove('two-col');
  box.style.removeProperty('--row-h');
  if (!rows.length) return;
  const avail = box.clientHeight - 8;
  const gap = 3;
  let h = (avail - gap * (rows.length - 1)) / rows.length;
  if (h < 13) {
    const half = Math.ceil(rows.length / 2);
    box.classList.add('two-col'); box.style.setProperty('--rows', String(half));
    h = (avail - gap * (half - 1)) / half;
  }
  box.style.setProperty('--row-h', `${Math.max(10, Math.min(34, Math.floor(h)))}px`);
}
window.addEventListener('resize', () => {
  if (!FIT_SCREENS.has(screen)) return;
  if (landscape() !== fitLandscape) return render(); // turned the phone: switch layouts
  layoutFit();
});
// Turning pages: the arrows, the arrow keys and swiping across the cards.
function pageTurn(pg, dir) {
  const off = turnPage(pg, dir);
  if (!off) { sound.play('draw'); mfx.dealIn(pg, dir); return; }
  // The collection runs on into the previous / next faction.
  if (screen === 'gallery') {
    const factions = [...Object.keys(FACTION_LISTS), 'Fusion'];
    const i = factions.indexOf(bookPage) + (off === 'next' ? 1 : -1);
    if (i < 0 || i >= factions.length) return;
    bookPage = factions[i];
    setPage(`gal:${bookPage}:${bookSet}`, off === 'next' ? 0 : 999);
    bookTurned = true; sound.play('draw');
    afterRender.push(() => mfx.dealIn(app.querySelector('.pager'), off === 'next' ? 1 : -1));
    render();
  }
}
document.addEventListener('keydown', (e) => {
  if (!app.classList.contains('fit-screen') || zoomId || e.target.closest?.('input, textarea')) return;
  const pg = app.querySelector('.pager');
  if (pg && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) pageTurn(pg, e.key === 'ArrowLeft' ? -1 : 1);
});
let pageSwipe = null;
document.addEventListener('touchstart', (e) => {
  const pg = !zoomId && app.classList.contains('fit-screen') && e.touches.length === 1 ? e.target.closest('.pager') : null;
  pageSwipe = pg ? { pg, x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
}, { passive: true });
document.addEventListener('touchend', (e) => {
  if (!pageSwipe || bDrag?.ghost) { pageSwipe = null; return; }
  const t = e.changedTouches[0];
  const dx = t.clientX - pageSwipe.x, dy = t.clientY - pageSwipe.y;
  const { pg } = pageSwipe; pageSwipe = null;
  if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) pageTurn(pg, dx < 0 ? 1 : -1);
}, { passive: true });

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

// Short, wide screens (a phone held sideways): scale the menus so each fits like a game screen.
function fitMenus() {
  const w = innerWidth, h = innerHeight;
  const zoom = w > h && h < 640 ? Math.max(0.45, Math.min(1, h / 700)) : 1;
  document.documentElement.style.setProperty('--ui-zoom', String(Math.round(zoom * 100) / 100));
  // Small notes shrink with the menus; scale them back up so they stay readable.
  document.documentElement.style.setProperty('--note-boost', String(Math.round(Math.min(1.7, Math.max(1, 0.85 / zoom)) * 100) / 100));
}
fitMenus();
window.addEventListener('resize', fitMenus);

applySettings();
if (needsSignIn()) {
  screen = 'signin';
  try { acct.tab = localStorage.getItem(HAD_ACCOUNT_KEY) ? 'login' : 'register'; } catch { acct.tab = 'register'; }
  connectServer(); // wakes the server while the player types
}
render();
boot();

// The boot screen (in index.html) stays up while the fonts, menu art, hero portraits and card
// backs load, with a progress bar, then fades into the menu. Never less than a moment, never stuck.
async function boot() {
  const el = document.getElementById('boot');
  if (!el) return;
  const bar = el.querySelector('.boot-bar i');
  const status = el.querySelector('.boot-status');
  const STEPS = ['Opening the realms…', 'Gathering the heroes…', 'Shuffling the decks…', 'Lighting the candles…'];
  const img = (src) => new Promise((res) => { const i = new Image(); i.onload = i.onerror = res; i.src = src; });
  const jobs = [
    document.fonts?.ready ?? Promise.resolve(),
    ...['art/ui/logo.png', 'art/ui/menu-bg.jpg', 'art/ui/play-button.png', 'art/ui/divider.png',
      'art/frames/painted-minion.png', 'art/frames/painted-spell.png', 'art/frames/painted-quickplay.png', 'art/frames/painted-trap.png',
      'art/frames/legendary-minion.png', 'art/frames/legendary-spell.png', 'art/frames/legendary-trap.png'].map(img),
    ensureArt([...Object.values(HERO_ART), ...FACTIONS.map((f) => `art/backs/${f.toLowerCase()}.jpg`)]),
  ];
  let done = 0;
  const step = () => {
    done++;
    const k = done / jobs.length;
    bar.style.width = `${Math.max(4, Math.round(k * 100))}%`;
    status.textContent = STEPS[Math.min(STEPS.length - 1, Math.floor(k * STEPS.length))];
  };
  const all = Promise.all(jobs.map((j) => Promise.resolve(j).catch(() => {}).then(step)));
  await Promise.all([Promise.race([all, fx.wait(10000)]), fx.wait(1100)]);
  bar.style.width = '100%';
  status.textContent = 'Ready';
  await fx.wait(250);
  el.classList.add('done');
  setTimeout(() => el.remove(), 700);
}
document.addEventListener('cardstyle', () => { if (!animating) render(); });
document.addEventListener('journey', () => { if (screen === 'menu') render(); });

// iPhone: inside a match, a finger drag must never scroll or bounce the page
// (or the itch.io page around it), and must never start the system's
// drag-an-image-out-of-the-app gesture. Outside a match, pages scroll normally.
document.addEventListener('touchmove', (e) => { if (screen === 'game') e.preventDefault(); }, { passive: false });
document.addEventListener('dragstart', (e) => e.preventDefault());
// A game, not a web page: no long-press / right-click menus (except where you type).
document.addEventListener('contextmenu', (e) => { if (!e.target.closest?.('input, textarea')) e.preventDefault(); });

// Android app: the Back button steps back through the game (close what's open, then go to the
// menu) instead of quitting; on the main menu it sends the app to the background.
function onBack() {
  if (drag.busy()) { drag.cancel(); return; }
  if (document.getElementById('settings')) { closeSettings(); return; }
  if (zoomArt) return onButton('closeArt');
  if (zoomId) return onButton('closeZoom');
  if (screen === 'game') { if (!game?.state?.gameOver) return openSettings(); return onButton('menu'); }
  if (screen !== 'menu' && screen !== 'signin') return onButton('menu');
  window.Capacitor?.Plugins?.App?.minimizeApp?.();
}
const nativeApp = window.Capacitor?.Plugins?.App;
if (window.Capacitor?.isNativePlatform?.() && nativeApp?.addListener) {
  document.body.classList.add('native-app');
  nativeApp.addListener('backButton', onBack);
}
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

// The sign-in form is a real <form> so browsers offer to save the password; it never navigates.
document.addEventListener('submit', (e) => { if (e.target?.id === 'acct-form-el') e.preventDefault(); }, true);
