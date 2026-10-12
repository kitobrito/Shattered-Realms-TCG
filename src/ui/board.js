// The battle screen: a Hearthstone-style table. Pure rendering — input lives
// in drag.js, animation in fx.js, and the action loop in main.js.

import { allKeywords, costOf, effectiveAttack, findCharacter, hasKeyword, mushroomsIn, radiationOf } from '../engine/core.js';
import { actingPlayer } from '../engine/engine.js';
import { getCard } from '../engine/registry.js';
import { BOARD_CUTS } from '../cards/board-cuts.js';
import { BOARD_ART, LANDSCAPE_BOARDS, LANDSCAPE_SIZE, PORTRAIT_BOARDS, PORTRAIT_SIZE } from '../cards/board-art.js';
import { isMuted } from './sound.js';
import { artOf, backStyle, cardHTML, esc, FACTION_ICONS, heroArtOf, youText, rankBadgeHTML, rankProgressHTML } from './shared.js';

// ---- Pieces ------------------------------------------------------------------

// Keywords are drawn on the minion itself (shield, bubble, ice, ...) the way
// Hearthstone does it; only things with no visual get a small icon.
const ONE_TIME_TRIGGERS = new Set(['battlecry', 'summon', 'deathrattle']);

// 'Twin Strike' -> 'twin-strike' (for CSS classes and data-kw).
const kwSlug = (k) => k.toLowerCase().replace(/\s+/g, '-');

export function keywordClasses(c) {
  return allKeywords(c).map((k) => `kw-${kwSlug(k)}`).join(' ');
}

function cornerIcons(m, s) {
  return [
    m.tempControl ? '<i title="Controlled temporarily">⛓</i>' : '',
    m.returnAtEndOfTurn ? '<i title="Returns to hand at end of turn">↩</i>' : '',
  ].join('');
}

// Bottom-centre badges, like Hearthstone's Exit / trigger / Lifesteal / Poisonous icons.
function badges(m) {
  if (hasKeyword(m, 'Silenced')) return '';
  const triggers = [...(getCard(m.cardId).triggers ?? []), ...(m.grantedTriggers ?? [])];
  return [
    // Robots: installed Upgrades and the Weapon.
    m.upgrades ? `<i class="b-upgrade" title="${m.upgrades} Upgrade${m.upgrades === 1 ? '' : 's'} installed">⚙${m.upgrades}</i>` : '',
    m.weapon ? `<i class="b-weapon" title="Weapon: ${m.weapon.name}">🔫</i>` : '',
    triggers.some((t) => t.on === 'deathrattle') ? '<i class="b-deathrattle" title="Exit">💀</i>' : '',
    triggers.some((t) => !ONE_TIME_TRIGGERS.has(t.on)) ? '<i class="b-trigger" title="Triggers when something happens">⚡</i>' : '',
    hasKeyword(m, 'Lifesteal') ? '<i class="b-lifesteal" title="Lifesteal">🩸</i>' : '',
    hasKeyword(m, 'Poisonous') ? '<i class="b-poison" title="Poisonous">☠</i>' : '',
    hasKeyword(m, 'Venomous') ? '<i class="b-venom" title="Venomous">🐍</i>' : '',
    hasKeyword(m, 'Recoil') ? '<i class="b-recoil" title="Recoil">↯</i>' : '',
  ].join('');
}

// Radiation: a ☢ badge with the Radiation value (and turns left if it's temporary).
const radHTML = (c) => {
  const r = radiationOf(c);
  if (!r) return '';
  const left = (c.radTemp ?? []).length ? Math.max(...c.radTemp.map((x) => x.left)) : 0;
  return `<span class="rad-badge" title="Radiation ${r}: every other character without Radiation has ${r} less Health while this lives${left && !c.radPerm ? ` (${left} turn${left === 1 ? '' : 's'} left)` : ''}">☢${r}</span>`;
};

// Burn (Dragons): a Burning character is wrapped in flames, with its Burn value on a badge.
const burnHTML = (c) => (c.burn > 0
  ? `<div class="m-flames" style="--heat:${Math.min(1, 0.45 + c.burn * 0.12).toFixed(2)}"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
     <div class="m-flames front"><i></i><i></i><i></i><i></i><i></i><i></i></div>
     <span class="burn-badge" title="Burn ${c.burn}: takes ${c.burn} damage at the end of its controller's turn, then Burn rises by 1 (${c.burnLeft ?? 2} turn${(c.burnLeft ?? 2) === 1 ? '' : 's'} left)">🔥${c.burn}</span>`
  : '');

const asleep = (m, s) => m.sick && !hasKeyword(m, 'Charge') && !hasKeyword(m, 'Rush') && m.controller === s.activePlayer;

export function minionHTML(m, s, cls = '') {
  const card = getCard(m.cardId);
  const atk = effectiveAttack(m);
  const art = artOf(card);
  const kws = allKeywords(m).map(kwSlug);
  return `
    <div class="minion ${keywordClasses(m)} ${cls} ${art ? 'has-art' : ''} ${asleep(m, s) ? 'asleep' : ''} ${m.burn > 0 ? 'burning' : ''} ${radiationOf(m) ? 'irradiated' : ''} ${m.radReduction > 0 ? 'rad-hit' : ''}" data-char="${m.uid}" data-preview="${card.id}" data-kw="${kws.join(' ')}">
      <div class="m-shield"></div>
      <div class="m-wind"></div>
      <div class="m-art" ${art ? `style="background-image: url('${art}')"` : ''}>${art ? '' : `<span class="art">${card.art ?? '✦'}</span>`}</div>
      ${burnHTML(m)}
      ${radHTML(m)}
      <div class="m-fx"><span class="m-ice"></span><span class="m-drip"></span><span class="m-embers"></span><span class="m-blind"></span><span class="m-silence"></span><span class="m-camo"></span><span class="m-smoke"></span><span class="m-ghost"></span><span class="m-ghost two"></span></div>
      <div class="m-speed"></div><div class="m-sparkle"></div>
      <div class="m-zzz"><b>z</b><b>z</b><b>Z</b></div>
      <div class="icons">${cornerIcons(m, s)}</div>
      <div class="badges">${badges(m)}</div>
      ${card.cost != null ? `<span class="m-cost" title="Mana cost">${card.cost}</span>` : ''}
      <span class="atk ${atk > m.attack ? 'up' : atk < m.attack ? 'down' : ''}">${atk}</span>
      <span class="hp ${m.health < m.maxHealth ? 'down' : m.maxHealth > (card.health ?? 0) ? 'up' : ''}">${m.health}</span>
    </div>`;
}

function portraitHTML(pl) {
  const art = heroArtOf(pl.factions[0]);
  return art
    ? `<img class="portrait-img" src="${art}" alt="" draggable="false">`
    : `<div class="portrait-placeholder f-${pl.factions[0].toLowerCase()}"><span>${FACTION_ICONS[pl.factions[0]] ?? '✦'}</span></div>`;
}

// Fusion Hero Spell: charges with each Hero Spell use; at full charge it blazes so it can't be missed.
function fusionHTML(pl, legal, mine) {
  if (!pl.fusion) return '';
  const card = getCard(pl.fusion.cardId);
  const ready = pl.fusion.charge >= 3;
  const usable = mine && legal.some((a) => a.type === 'heroSpell' && a.card === card.id);
  const art = artOf(card);
  const pips = [0, 1, 2].map((i) => `<i class="${i < pl.fusion.charge ? 'on' : ''}"></i>`).join('');
  return `<button class="hero-spell fusion-spell ${ready ? 'ready' : ''} ${usable ? 'usable' : ''}" data-hs="${card.id}" data-preview="${card.id}" ${usable ? '' : 'disabled'}
      title="Fusion: ${esc(card.name)} (${pl.fusion.charge}/3 charge)">
      <span class="fusion-ring"></span>
      <span class="hs-face front fusion-face">${art ? `<img src="${art}" alt="" draggable="false">` : `<span>${card.art}</span>`}</span>
      <b class="hs-cost">${card.cost}</b>
      <span class="fusion-pips">${pips}</span>
      ${ready ? '<span class="fusion-ready">FUSION READY</span>' : ''}</button>`;
}

function heroSpellsHTML(pl, legal, mine) {
  return fusionHTML(pl, legal, mine) + pl.heroSpells.map((hs) => {
    const card = getCard(hs.cardId);
    const usable = mine && legal.some((a) => a.type === 'heroSpell' && a.card === hs.cardId);
    const art = artOf(card);
    return `<button class="hero-spell ${usable ? 'usable' : ''} ${hs.uses ? 'used' : ''} ${hs.cooldown > 0 ? 'cooling' : ''}" data-hs="${hs.cardId}" data-preview="${card.id}" ${usable ? '' : 'disabled'}>
      ${hs.cooldown > 0 ? `<span class="cooldown-badge" title="Ready in ${hs.cooldown} turn${hs.cooldown === 1 ? '' : 's'}">⏳${hs.cooldown}</span>` : ''}
      <span class="hs-flip"><span class="hs-face front">${art ? `<img src="${art}" alt="" draggable="false">` : `<span>${card.art}</span>`}</span><span class="hs-face back"></span></span>
      <b class="hs-cost">${card.cost}</b>
      ${hs.cardId === 'infernal_summoning' ? tierHTML(pl) : ''}</button>`;
  }).join('');
}

// Demons: the Summoning Tier on Infernal Summoning (next Health cost = next Demon's cost).
function tierHTML(pl) {
  const t = Math.min(10, pl.summonTier ?? 1);
  return `<span class="tier-badge" title="Summoning Tier ${t}: costs ${t} Health and summons a ${t}-Mana Demon">🩸${t}</span>`;
}

// Zombies: Corpses left behind (shown once a player has any, or plays Zombies).
function corpseHTML(pl) {
  const n = pl.corpses ?? 0;
  if (!n && !pl.factions.includes('Zombies')) return '';
  return `<div class="corpse-badge ${n ? '' : 'empty'}" title="${n} Corpse${n === 1 ? '' : 's'}: left when a friendly Zombie dies; Zombie cards consume them"><span>🪦</span><b>${n}</b></div>`;
}

function extinctionHTML(pl, s) {
  const ext = pl.extinction;
  if (!ext) return '';
  const left = Math.max(0, ext.nextAt - ext.turns);
  const mode = ext.mode === 'bothBoards' ? 'Both boards!' : ext.mode === 'meteorShower' ? 'Meteor Shower' : '';
  const tip = `Extinction ${left ? `in ${left} turn${left === 1 ? '' : 's'}` : 'at the end of this turn'}${mode ? ` · ${mode}` : ''}${ext.shower ? ` · ${ext.shower} meteors left · no Primal Mana` : ''}`;
  return `<div class="extinction-badge ${left <= 1 && s.activePlayer === pl.index ? 'soon' : ''}" title="${esc(tip)}" data-preview="extinction_cycle">
    <span>☄</span><b>${left}</b></div>`;
}

// Bees: The Living Hive (passive Hero Spell). Shows whether the Hive stands, the Queen is out, or both are gone.
function hiveHTML(pl) {
  if (!pl.factions.includes('Bees')) return '';
  const hive = pl.board.find((m) => m.cardId === 'the_hive');
  const queen = pl.board.find((m) => m.cardId === 'the_queen');
  const state = hive?.swarmingUntil != null ? ['⚔', 'The Hive is swarming: enemy attackers get stung'] : hive ? ['🐝', 'The Hive stands'] : queen ? ['👑', 'The Queen is out: if she dies, your Hero takes 10 damage'] : ['✖', 'The Hive and the Queen are gone'];
  const art = artOf(getCard('hive_mind'));
  return `<div class="hive-badge ${queen ? 'queen' : ''} ${!hive && !queen ? 'gone' : ''}" title="The Living Hive · ${state[1]}" data-preview="hive_mind">
    ${art ? `<img src="${art}" alt="" draggable="false">` : '<span>🐝</span>'}<b>${state[0]}</b></div>`;
}

// Cracks spread across a hero's portrait as Health drops (half, quarter, a tenth).
const CRACKS = [
  'M6 30 L20 35 L27 31 L38 43 M94 62 L81 59 L75 67 L63 65',
  'M50 1 L46 14 L54 22 L48 35 M18 90 L29 79 L27 70 L40 61',
  'M97 25 L85 30 L79 25 L66 38 L57 35 M70 97 L66 84 L73 76 L61 69 M3 62 L16 59 L21 67 L33 64',
];
function crackStage(h) {
  const f = h.health / h.maxHealth;
  return f <= 0.1 ? 3 : f <= 0.25 ? 2 : f <= 0.5 ? 1 : 0;
}
function cracksSVG(stage) {
  if (!stage) return '';
  const d = CRACKS.slice(0, stage).join(' ');
  return `<svg class="cracks" viewBox="0 0 100 100" preserveAspectRatio="none"><path class="crack-light" d="${d}"/><path class="crack-dark" d="${d}"/></svg>`;
}

function heroZoneHTML(pl, s, legal, mine, cls, shattered) {
  const h = pl.hero;
  const destroyed = shattered && s.gameOver && (s.winner == null || s.winner !== pl.index);
  const atk = effectiveAttack(h);
  const traps = pl.traps.map((t) => (mine
    ? `<span class="trap-token mine" data-preview="${t.cardId}" title="Your Trap (tap or hover to see it). It goes off by itself.">?</span>`
    : '<span class="trap-token" data-trap-info title="Hidden enemy Trap: it goes off by itself when its condition happens.">?</span>')).join('');
  return `
    <div class="hero-zone ${mine ? 'me' : 'opp'}">
      <div class="traps">${traps}</div>
      <div class="hero-portrait ${keywordClasses(h)} ${cls} ${destroyed ? 'destroyed' : ''} ${h.burn > 0 ? 'burning' : ''} ${radiationOf(h) ? 'irradiated' : ''} ${h.radReduction > 0 ? 'rad-hit' : ''}" data-char="${h.uid}" data-kw="${allKeywords(h).map(kwSlug).join(' ')}">
        ${portraitHTML(pl)}
        ${burnHTML(h)}
        ${radHTML(h)}
        ${cracksSVG(crackStage(h))}
        <span class="m-ice"></span>
        <div class="hero-name">${esc(pl.name)}</div>
        ${atk > 0 ? `<span class="atk">${atk}</span>` : ''}
        <span class="hp ${h.health < h.maxHealth ? 'down' : ''}">${h.health}</span>
        ${h.armor ? `<span class="armor">${h.armor}</span>` : ''}
      </div>
      <div class="hero-powers">${heroSpellsHTML(pl, legal, mine)}${extinctionHTML(pl, s)}${hiveHTML(pl)}${corpseHTML(pl)}</div>
    </div>`;
}

// 10 crystal slots: full (usable), spent, temporary bonus, locked (not yet gained).
function manaHTML(pl, mine) {
  const { current, max } = pl.mana;
  // Dinosaurs: normal crystals first, then gold Primal ones (Dinosaur cards only).
  const primalMax = pl.mana.base != null ? Math.max(0, max - pl.mana.base) : 0;
  const base = max - primalMax;
  const primal = Math.min(pl.mana.primal ?? 0, primalMax);
  const normal = current - primal;
  // Lit regular crystals: blue first, then the temporary ones (Mana Potion etc.) in gold.
  const lit = Math.max(0, normal);
  const gold = Math.min(pl.mana.temp ?? 0, lit);
  const blue = lit - gold;
  const litCls = (k) => (k < blue ? 'full' : 'bonus');
  const slots = Math.max(10, current);
  let crystals = '';
  for (let i = 0; i < slots; i++) {
    let cls;
    if (i < base) cls = i < Math.min(lit, base) ? litCls(i) : 'spent';
    else if (i < max) cls = i - base < primal ? 'primal full' : 'primal spent';
    else cls = base + (i - max) < lit ? litCls(base + (i - max)) : 'locked';
    crystals += `<span class="crystal ${cls}" data-crystal="${i}"></span>`;
  }
  const next = pl.mana.bonusNextTurn ? ` <small>+${pl.mana.bonusNextTurn} next</small>` : '';
  const primalNote = primalMax ? ` <small class="primal-note" title="Primal Mana: only for Dinosaur cards">🦴${primal} Primal</small>` : '';
  return `<div class="mana-bar ${mine ? 'me' : 'opp'}"><b class="mana-text">${current}/${max}${next}${primalNote}</b><div class="crystals">${crystals}</div></div>`;
}

// The Mushroom count is public; which cards carry them is not.
function deckHTML(pl, mine) {
  const shrooms = mushroomsIn(pl.deck);
  const tip = `${pl.deck.length} cards left${shrooms ? ` · ${shrooms} Mushroom${shrooms === 1 ? '' : 's'} hidden in this deck` : ''}`;
  return `<div class="deck-pile ${mine ? 'me' : 'opp'}" title="${tip}" ${backStyle(pl.factions[0])}>
    <div class="pile">${'<span></span>'.repeat(Math.min(4, Math.ceil(pl.deck.length / 8)))}${shrooms ? `<i class="shroom-count">🍄${shrooms}</i>` : ''}</div><b>${pl.deck.length}</b></div>`;
}

function endTurnHTML(s, me, legal, armed) {
  if (s.gameOver) return '<button class="end-turn enemy" disabled>Game over</button>';
  const mine = s.activePlayer === me;
  if (!mine || !legal.some((a) => a.type === 'endTurn')) {
    return `<button class="end-turn enemy" disabled>${s.pending?.type === 'mulligan' ? 'Mulligan' : mine ? 'Wait…' : 'Enemy turn'}</button>`;
  }
  const moves = legal.some((a) => a.type !== 'endTurn');
  if (armed) return '<button class="end-turn confirm" data-act="endTurn">Really end?</button>';
  return `<button class="end-turn ${moves ? 'has-moves' : 'done'}" data-act="endTurn">End turn</button>`;
}

// ---- Play history --------------------------------------------------------------

function historyHTML(history) {
  return `<div class="history">${history.slice(-12).map((h) => {
    const card = h.cardId ? getCard(h.cardId) : null;
    const art = card ? artOf(card) : null;
    return `<div class="history-item ${h.mine ? 'mine' : 'theirs'}" ${card ? `data-preview="${card.id}"` : ''} data-history="${esc(h.text)}">
      ${art ? `<img src="${art}" alt="" draggable="false">` : `<span>${card?.art ?? '🂠'}</span>`}
      ${h.icon ? `<i>${h.icon}</i>` : ''}</div>`;
  }).join('')}</div>`;
}

// ---- Overlays --------------------------------------------------------------------

// Starting-hand cards this expensive get a "Swap?" hint.
const PRICEY_COST = 5;

function mulliganHTML(s, p, marked) {
  const pl = s.players[p];
  const n = marked.length;
  return `<div class="overlay mull-overlay"><div class="mulligan-hs">
    <div class="mull-banner"><span>Starting Hand</span><small>Keep or Replace Cards</small></div>
    <p class="mull-who">${esc(pl.name)} · ${p === 0 ? 'You go first' : 'You go second, then pick a potion'}</p>
    <p class="mull-hint">Tap a card to swap it. Tip: swap <b>expensive cards</b> so you have something to play on your first turns.</p>
    <div class="mull-row">${pl.hand.map((inst) => {
      const pricey = getCard(inst.cardId).cost >= PRICEY_COST && !marked.includes(inst.uid);
      return `<div class="mull-slot ${marked.includes(inst.uid) ? 'marked' : ''}" data-mull="${inst.uid}">${cardHTML(getCard(inst.cardId))}${pricey ? '<span class="mull-pricey">Swap?</span>' : ''}<span class="mull-x">✕</span></div>`;
    }).join('')}</div>
    <button data-act="mullConfirm" class="mull-confirm">${n ? `Replace ${n}` : 'Confirm'}</button>
  </div></div>`;
}

function reactionHTML(s, legal) {
  const qps = legal.filter((a) => a.type === 'quickPlay');
  const charName = (id) => {
    const c = findCharacter(s, id);
    if (!c) return '';
    return c.kind === 'hero' ? `${s.players[c.owner].name}` : getCard(c.cardId).name;
  };
  const label = (a) => {
    const card = getCard(s.players[a.player].hand.find((c) => c.uid === a.card).cardId);
    const t = a.target != null ? ` → ${charName(a.target)}` : '';
    const t2 = a.target2 != null ? ` & ${charName(a.target2)}` : '';
    return `${card.name}${t}${t2}`;
  };
  const ev = s.pending.ctx?.event;
  const what = {
    cardPlayed: 'a card was played', attackDeclared: 'an attack was declared', minionDied: 'a minion died',
    endOfTurn: 'the turn is ending', wouldTakeDamage: 'damage incoming',
  }[s.pending.window];
  const detail = s.pending.window === 'wouldTakeDamage' ? `: ${ev.amount} to ${charName(ev.target)}`
    : ev?.source != null && findCharacter(s, ev.source) ? `: ${charName(ev.source)}` : '';
  return `<div class="reaction"><span class="countdown"></span><b>Quick Play?</b> <span class="sub">${esc((what ?? s.pending.window) + detail)}</span>
    ${qps.map((a, i) => {
      const card = getCard(s.players[a.player].hand.find((c) => c.uid === a.card).cardId);
      // The card's text right on the button, so the decision is quick.
      return `<button data-qp="${i}" class="qp-option"><b><span class="qp-cost">${card.cost}</span> ${esc(label(a))}</b><small>${esc(card.text)}</small></button>`;
    }).join('')}
    <button data-act="pass" class="ghost">Pass</button></div>`;
}

function choiceHTML(choice) {
  return `<div class="overlay"><div class="panel"><h2>${esc(choice.prompt)}</h2>
    <div class="choice-row">${choice.options.map((o, i) => (o.cardId
      ? cardHTML(getCard(o.cardId), { choice: i, playable: true })
      : `<button data-choice="${i}">${esc(o.label)}</button>`)).join('')}</div></div></div>`;
}

// ---- Game over: result + match summary ------------------------------------------------

// Online account games: the rating change (ranked) under the result.
function onlineResultHTML(ctx) {
  const r = ctx.result;
  if (!ctx.online?.server) return '';
  if (!r) return '<p class="online-result sub">Saving the result…</p>';
  const why = r.reason === 'disconnect' ? ' (opponent left)' : r.reason === 'concede' ? ' (concede)' : '';
  if (r.mode !== 'ranked') return `<p class="online-result">${r.mode === 'private' ? 'Private' : 'Quick'} match${why}</p>`;
  const l = r.ladder;
  const you = r.you;
  if (!l) return `<p class="online-result">Ranked${why}</p>`;
  const rp = l.rpChange == null ? '' : `<b class="${l.rpChange >= 0 ? 'up' : 'down'}">${l.rpChange >= 0 ? '+' : ''}${l.rpChange} RP</b> · `;
  const line = {
    promoted: `<b class="up big">Promoted to ${esc(you.label)}!</b>`,
    seriesFailed: `<b class="down">Promotion series lost.</b> You stay at ${esc(you.label)}.`,
    seriesStart: `<b class="up">Promotion series!</b> Best of ${you.series?.best}: win ${you.series?.need} to reach ${esc(you.series?.to ?? '')}.`,
    seriesWin: `Series win.`,
    seriesLoss: `Series loss.`,
    division: `<b class="up">Up to ${esc(you.label)}!</b>`,
    demoted: `<b class="down">Down to ${esc(you.label)}.</b>`,
  }[l.event] ?? '';
  return `<p class="online-result">Ranked${why}: ${rp}${line} ${rankBadgeHTML(you)} ${rankProgressHTML(you)}</p>`;
}

function gameOverHTML(s, me, stats, ctx = {}) {
  const result = s.winner == null ? 'Draw!' : s.winner === me ? 'Victory!' : 'Defeat';
  const mp = s.players[me];
  const op = s.players[1 - me];
  const st = stats ?? {};
  const row = (label, a, b) => `<tr><th>${label}</th><td>${a ?? 0}</td><td>${b ?? 0}</td></tr>`;
  const best = st.bestPlay ? `<p class="best-play">Best play: <b>${esc(st.bestPlay.text)}</b></p>` : '';
  const art = heroArtOf(mp.factions[0]);
  return `<div class="overlay game-over ${s.winner === me ? 'win' : s.winner == null ? 'draw' : 'loss'}"><div class="panel summary">
    ${art ? `<img class="summary-hero" src="${art}" alt="">` : ''}
    <h2>${result}</h2>
    <p class="sub">${s.winner == null ? '' : esc(youText(`${s.players[s.winner].name} wins`))} · ${Math.ceil(s.turn / 2)} round${Math.ceil(s.turn / 2) === 1 ? '' : 's'} (${s.turn} turn${s.turn === 1 ? '' : 's'})</p>
    <table class="summary-table"><tr><th></th><td>${esc(mp.name)}</td><td>${esc(op.name)}</td></tr>
      ${row('Damage to heroes', st.heroDamage?.[me], st.heroDamage?.[1 - me])}
      ${row('Minions destroyed', st.kills?.[me], st.kills?.[1 - me])}
      ${row('Cards played', st.cardsPlayed?.[me], st.cardsPlayed?.[1 - me])}
      ${row('Healing', st.healing?.[me], st.healing?.[1 - me])}
      ${row('Hero Health left', Math.max(0, mp.hero.health), Math.max(0, op.hero.health))}</table>
    ${best}
    ${onlineResultHTML(ctx)}
    <button data-act="rematch">${ctx.online?.server ? 'Play again' : 'Rematch'}</button> <button data-act="menu" class="ghost">Menu</button></div></div>`;
}

// ---- The whole table ---------------------------------------------------------------

// Painted boards are a 16:9 stage; on tall, narrow screens (phones held upright)
// it would be a thin strip, so those keep the drawn table instead.
export const paintedBoards = () => window.matchMedia?.('(min-aspect-ratio: 6/5)').matches ?? true;
// An upright phone or tablet gets the portrait battle layout (style.css "PORTRAIT").
export const portraitLayout = () => window.matchMedia?.('(max-aspect-ratio: 5/6)').matches ?? false;

// ctx: { s, me, legal, mode, handoff, isAI, history, logOpen, mullMarked, attackers, playable }
// ---- Board layout and corner props (board-art.js LANDSCAPE_BOARDS / PORTRAIT_BOARDS) ----

// A landscape board's own hero frames and battlefield, as container units of the arena.
function landscapeVars(lb) {
  const [W, H] = LANDSCAPE_SIZE;
  const X = (v) => `${((v / W) * 100).toFixed(2)}cqw`;
  const Y = (v) => `${((v / H) * 100).toFixed(2)}cqh`;
  const box = (k, b) => `--${k}-x:${X(b[0])};--${k}-y:${Y(b[1])};--${k}-w:${X(b[2] - b[0])};--${k}-h:${Y(b[3] - b[1])}`;
  return `${box('oh', lb.opp)};${box('mh', lb.me)};--f-top:${Y(lb.field[1])};--f-bot:${Y(lb.field[3])}`;
}

// The four corner props come alive: an effect over the painted prop, or the prop itself
// gently moving (a copy of that patch of the painting). Their animations are given a
// phase from the clock, so a re-render (every action) continues them seamlessly.
const PROP_PERIOD = { glow: 2600, flicker: 1100, steam: 2400, smoke: 3200, drip: 2200, blink: 1600, sparkle: 2400, spores: 3000,
  ripple: 2600, fireflies: 4200, sway: 3400, bob: 2600, wobble: 3000, spin: 6000, peck: 3600, crawl: 7000 };
const CROP_FX = new Set(['sway', 'bob', 'wobble', 'spin', 'peck', 'crawl']);
const PROP_PARTS = { steam: 3, smoke: 3, sparkle: 3, spores: 4, fireflies: 3, drip: 1, ripple: 2 };
function propsHTML(props, [W, H], src, cuts = null) {
  const now = performance.now();
  return `<div class="board-props">${props.map((p, i) => {
    const [x0, y0, x1, y1] = p.at;
    const w = x1 - x0;
    const h = y1 - y0;
    const pos = `left:${(x0 / W) * 100}%;top:${(y0 / H) * 100}%;width:${(w / W) * 100}%;height:${(h / H) * 100}%`;
    const period = PROP_PERIOD[p.fx] ?? 3000;
    const vars = `--d:${-(now % period).toFixed(0)}ms;--c:${p.color}`;
    let inner;
    const cut = CROP_FX.has(p.fx) && cuts?.[i];
    if (cut) {
      // The prop's own cut-out (tools/board-props.py), placed exactly over where it was painted.
      const [c0, c1, c2, c3] = cut.box;
      const cs = `left:${((c0 - x0) / w) * 100}%;top:${((c1 - y0) / h) * 100}%;width:${((c2 - c0) / w) * 100}%;height:${((c3 - c1) / h) * 100}%`;
      inner = `<img class="prop-crop prop-cut" src="${new URL(cut.src, document.baseURI).href}" alt="" draggable="false" style="${cs}">`;
    } else if (CROP_FX.has(p.fx)) {
      const bs = `${(W / w) * 100}% ${(H / h) * 100}%`;
      const bp = `${w >= W ? 0 : (x0 / (W - w)) * 100}% ${h >= H ? 0 : (y0 / (H - h)) * 100}%`;
      inner = `<i class="prop-crop" style="background-image:url('${src}');background-size:${bs};background-position:${bp}"></i>`;
    } else {
      inner = '<i class="prop-glow"></i>' + Array.from({ length: PROP_PARTS[p.fx] ?? 0 }, (_, k) => `<b style="--k:${k}"></b>`).join('');
    }
    return `<div class="board-prop fx-${p.fx}" data-prop="${i}" data-sound="${p.sound ?? ''}" data-glyph="${p.glyph ?? ''}" style="${pos};${vars}">${inner}</div>`;
  }).join('')}</div>`;
}

export function boardHTML(ctx) {
  const { s, me, legal, handoff, isAI } = ctx;
  const opp = 1 - me;
  const mp = s.players[me];
  const op = s.players[opp];
  const actor = actingPlayer(s);
  const showPending = !isAI(actor) && !handoff;
  const reaction = s.pending?.type === 'reaction' && showPending ? s.pending : null;
  const choice = s.pending?.type === 'choice' && showPending ? s.pending : null;
  const mull = s.pending?.type === 'mulligan' && showPending ? s.pending : null;
  const playable = new Set(legal.filter((a) => a.type === 'play').map((a) => a.card));
  const respondable = new Set(legal.filter((a) => a.type === 'quickPlay').map((a) => a.card));
  const myTurn = s.activePlayer === me && !s.pending && legal.some((a) => a.type === 'endTurn');
  // Lethal: the attacks you can still make at the enemy hero add up to its Health.
  let reach = 0;
  for (const uid of new Set(legal.filter((a) => a.type === 'attack' && a.defender === op.hero.uid).map((a) => a.attacker))) {
    const c = findCharacter(s, uid);
    reach += effectiveAttack(c) * Math.max(1, (hasKeyword(c, 'Twin Strike') ? 2 : 1) - c.attacksThisTurn);
  }
  const lethal = myTurn && reach > 0 && reach >= op.hero.health + op.hero.armor;
  const lowHp = !s.gameOver && mp.hero.health <= 10;
  const attackers = new Set(legal.filter((a) => a.type === 'attack').map((a) => a.attacker));
  const charCls = (uid) => (attackers.has(uid) ? 'can-attack' : '');
  const faction = mp.factions[0].toLowerCase();
  // The painting itself is drawn by board-layer.js (behind the arena), so it survives re-renders.
  const board = paintedBoards() && BOARD_ART[mp.factions[0]];
  // Portrait: the faction's portrait board (its own painting, lined up by layoutPortraitBoard);
  // without one, the landscape board fills the screen behind the table, darkened.
  const portrait = !board && portraitLayout();
  const pb = portrait ? PORTRAIT_BOARDS[mp.factions[0]] : null;
  // Boards with cut-out props show the clean plate (the props are drawn over it).
  const art = portrait && (BOARD_CUTS.portrait?.[mp.factions[0]]?.plate ?? pb?.src ?? BOARD_ART[mp.factions[0]]);
  const artUrl = art ? new URL(art, document.baseURI).href : '';
  const artStyle = art ? `style="--art: url('${artUrl}')"` : '';
  const pbCls = pb ? `p-board opp-${pb.opp[4]} me-${pb.me[4]}` : '';
  // Landscape boards with their own layout: frame and battlefield positions as CSS
  // variables (container units of the 16:9 arena), plus the animated corner props.
  const lb = board ? LANDSCAPE_BOARDS[mp.factions[0]] : null;
  const lbStyle = lb ? landscapeVars(lb) : '';

  return `
    <div class="arena f-${faction} ${board ? 'has-board' : ''} ${lb ? 'v-board' : ''} ${portrait ? 'portrait' : ''} ${pbCls} ${lowHp ? 'low-hp' : ''}" ${art ? artStyle : lb ? `style="${lbStyle}"` : ''} ${pb ? `data-pboard="${mp.factions[0]}"` : ''} data-faction="${esc(mp.factions[0])}">
      ${pb ? `<div class="pboard-img" style="background-image: url('${artUrl}')"></div>` : ''}
      ${pb?.props ? propsHTML(pb.props, PORTRAIT_SIZE, artUrl, BOARD_CUTS.portrait?.[mp.factions[0]]?.cuts) : ''}
      ${lb?.props ? propsHTML(lb.props, LANDSCAPE_SIZE, new URL(lb.src, document.baseURI).href, BOARD_CUTS.land?.[mp.factions[0]]?.cuts) : ''}
      ${lethal ? '<div class="lethal-tag">Lethal!</div>' : ''}
      ${historyHTML(ctx.history)}
      <div class="table-oval"></div>
      <div class="opp-hand" ${backStyle(op.factions[0])}>${op.hand.map(() => '<div class="card back"><span>✦</span></div>').join('')}</div>
      ${heroZoneHTML(op, s, [], false, `${charCls(op.hero.uid)} ${lethal ? 'lethal' : ''}`, ctx.shattered)}
      <div class="board opp" data-board="opp">${op.board.map((m) => minionHTML(m, s, charCls(m.uid))).join('')}</div>
      <div class="midline"></div>
      <div class="rope ${ctx.rope != null ? 'burning' : ''}" style="--burn: ${(ctx.rope ?? 0).toFixed(4)}"><div class="rope-fuse"></div><div class="rope-spark"></div></div>
      ${ctx.thinking ? `<div class="thinking">${esc(ctx.thinking)} is thinking<span class="dots"><b>.</b><b>.</b><b>.</b></span></div>` : ''}
      <div class="board me" data-board="me">${mp.board.map((m) => minionHTML(m, s, charCls(m.uid))).join('')}</div>
      ${heroZoneHTML(mp, s, legal, true, charCls(mp.hero.uid), ctx.shattered)}
      <div class="my-hand">${handoff ? '' : mp.hand.map((inst) => cardHTML(getCard(inst.cardId), {
        uid: inst.uid, playable: playable.has(inst.uid), cost: costOf(s, inst),
        respond: respondable.has(inst.uid), dim: myTurn && !playable.has(inst.uid),
      })).join('')}</div>
      ${manaHTML(op, false)}
      ${manaHTML(mp, true)}
      <div class="rail">
        ${deckHTML(op, false)}
        ${endTurnHTML(s, me, legal, ctx.endArmed)}
        ${deckHTML(mp, true)}
      </div>
      <div class="corner-buttons">
        <button class="ghost" data-act="toggleLog" title="Game log">📜</button>
        <button class="ghost" data-act="mute" title="Sound">${isMuted() ? '🔇' : '🔊'}</button>
        <button class="ghost" data-act="save" title="Save">💾</button>
        <button class="ghost" data-act="settings" title="Settings">⚙</button>
        ${s.gameOver ? '' : '<button class="ghost" data-act="concede" title="Concede">🏳</button>'}
        <button class="ghost" data-act="menu" title="Menu">☰</button>
      </div>
      ${ctx.concedeAsk ? `<div class="overlay"><div class="panel concede-panel"><h2>Concede this game?</h2>
        <p class="sub">${esc(s.players[actor].name)} loses the match.</p>
        <button data-act="concedeYes" class="danger">Concede</button> <button data-act="concedeNo" class="ghost">Keep playing</button></div></div>` : ''}
      <aside class="log-drawer ${ctx.logOpen ? 'open' : ''}">
        <button class="log-tab" data-act="toggleLog" title="${ctx.logOpen ? 'Collapse' : 'Open'} the game log">${ctx.logOpen ? '◀ Log' : 'Log ▶'}</button>
        <div class="log-head"><h3>Game log</h3><button class="ghost" data-act="toggleLog" title="Collapse">◀</button></div>
        <div class="log">${s.log.slice(-120).map((l) => `<div class="${l.msg.startsWith('— Turn') ? 'turn' : ''}">${esc(youText(l.msg))}</div>`).join('')}</div></aside>
      ${reaction ? reactionHTML(s, legal) : ''}
      ${choice ? choiceHTML(choice) : ''}
      ${mull ? mulliganHTML(s, mull.player, ctx.mullMarked) : ''}
      ${handoff ? `<div class="overlay"><div class="panel"><h2>Pass to ${esc(s.players[actor].name)}</h2>
        <button data-act="reveal">I'm ${esc(s.players[actor].name)}, show my hand</button></div></div>` : ''}
      ${s.gameOver && ctx.shattered ? gameOverHTML(s, me, ctx.stats, ctx) : ''}
    </div>`;
}

// Fan the hands along an arc. Cards are absolutely positioned from the centre.
// Portrait boards: scale the painting to the screen and publish where its hero frames
// and battlefield landed (CSS variables in px), so style.css can put the heroes,
// minion rows, End Turn and decks on them. Both frames always stay on screen and
// your frame stays clear of your hand; on short screens the painting shrinks a little
// (the blurred copy behind fills the sides).
export function layoutPortraitBoard(root) {
  const arena = root.querySelector('.arena.p-board');
  if (!arena) return;
  const pb = PORTRAIT_BOARDS[arena.dataset.pboard];
  if (!pb) return;
  const [iw, ih] = PORTRAIT_SIZE;
  const W = arena.clientWidth;
  const H = arena.clientHeight;
  const cardW = Math.min(0.24 * W, 0.155 * H, 150);
  const handH = cardW + 30;             // the visible part of your hand plus your Mana bar
  const top = 6;                        // keep the enemy frame this far from the top edge
  const m = 8;                          // breathing room around each frame (image px)
  const span = pb.me[3] - pb.opp[1] + 2 * m;
  let s = W / iw;
  if (span * s + handH + top > H) s = (H - handH - top) / span;
  const dw = iw * s;
  const dh = ih * s;
  const ox = (W - dw) / 2;
  const lo = top - (pb.opp[1] - m) * s;               // enemy frame stays on screen
  const hi = H - handH - (pb.me[3] + m) * s;          // your frame stays above your hand
  const oy = Math.min(Math.max(H - dh, lo), Math.max(hi, lo));
  const set = (k, v) => arena.style.setProperty(k, `${v.toFixed(1)}px`);
  set('--pb-x', ox); set('--pb-y', oy); set('--pb-w', dw); set('--pb-h', dh);
  for (const [key, f] of [['--oh', pb.opp], ['--mh', pb.me]]) {
    set(`${key}-x`, ox + f[0] * s); set(`${key}-y`, oy + f[1] * s);
    set(`${key}-w`, (f[2] - f[0]) * s); set(`${key}-h`, (f[3] - f[1]) * s);
  }
  set('--f-top', oy + pb.field[0] * s);
  set('--f-bot', oy + pb.field[1] * s);
  set('--hero', ((pb.opp[2] - pb.opp[0]) + (pb.me[2] - pb.me[0])) / 2 * s);
}

export function layoutHands(root) {
  for (const hand of root.querySelectorAll('.my-hand, .opp-hand')) {
    const cards = [...hand.children];
    const n = cards.length;
    if (!n) continue;
    // Place the cards without animating: measuring below forces a layout, and the
    // hover transition would otherwise sweep every card out from the centre.
    hand.classList.add('settling');
    // Portrait: your hand spans the full width, almost flat. With 6+ cards it splits
    // into two rows (back row raised, front row below) of up to 5, so every card
    // shows most of its width. Tap a card to read it full size.
    const upright = !!hand.closest('.arena.portrait') && hand.classList.contains('my-hand');
    if (upright) {
      const two = n > 5;
      hand.style.removeProperty('--hand-cw');
      if (two) hand.style.setProperty('--hand-cw', `${Math.min(cards[0].offsetWidth, 80)}px`);
      hand.classList.toggle('two-rows', two);
      const cw = cards[0].offsetWidth;
      const ch = cards[0].offsetHeight;
      const split = Math.ceil(n / 2);
      const rows = two ? [cards.slice(0, split), cards.slice(split)] : [cards];
      rows.forEach((row, r) => {
        const m = row.length;
        const step = m > 1 ? Math.min(cw * 0.92, (hand.clientWidth - cw - 6) / (m - 1)) : 0;
        row.forEach((c, i) => {
          const o = i - (m - 1) / 2;
          c.style.setProperty('--x', `${o * step}px`);
          c.style.setProperty('--y', `${(two && r === 0 ? -ch * 0.5 : 0) + o * o * 0.6}px`);
          c.style.setProperty('--rot', `${o * Math.min(1.5, 9 / m)}deg`);
          c.style.setProperty('--push', '0px');
          c.style.zIndex = String((two && r === 1 ? 40 : 10) + i);
        });
      });
      void hand.offsetWidth;
      hand.classList.remove('settling');
      continue;
    }
    const cw = cards[0].offsetWidth;
    const room = upright ? hand.clientWidth - cw - 6 : hand.clientWidth * 0.92 - cw;
    const step = n > 1 ? Math.min(cw * (hand.classList.contains('opp-hand') ? 0.55 : 0.78), room / (n - 1)) : 0;
    const spread = upright ? Math.min(1.5, 9 / n) : Math.min(4.5, 28 / n);
    const curve = upright ? 0.6 : 2.2;
    cards.forEach((c, i) => {
      const o = i - (n - 1) / 2;
      c.style.setProperty('--x', `${o * step}px`);
      c.style.setProperty('--y', `${o * o * curve}px`);
      c.style.setProperty('--rot', `${o * spread}deg`);
      c.style.setProperty('--push', '0px');
      c.style.zIndex = String(10 + i);
    });
    void hand.offsetWidth;
    hand.classList.remove('settling');
  }
}
