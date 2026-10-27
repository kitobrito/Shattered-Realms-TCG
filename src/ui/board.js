// The battle screen: a Hearthstone-style table. Pure rendering — input lives
// in drag.js, animation in fx.js, and the action loop in main.js.

import { CIRCLES } from '../engine/rules.js';
import { allKeywords, costOf, effectiveAttack, findCharacter, hasKeyword, heroSpellCost, mushroomsIn, radiationOf } from '../engine/core.js';
import { actingPlayer } from '../engine/engine.js';
import { evolveTurnsFor } from '../engine/effects.js';
import { getCard } from '../engine/registry.js';
import { BOARD_CUTS } from '../cards/board-cuts.js';
import { BOARD_ART, boardKey, CIRCLE_BOARDS, LANDSCAPE_BOARDS, LANDSCAPE_SIZE, PORTRAIT_BOARDS, PORTRAIT_SIZE } from '../cards/board-art.js';
import { hasBoardFx } from './circle-fx.js';
import { getSettings } from './settings.js';
import { isMuted, play as playSound } from './sound.js';
import { artOf, backStyle, fslug, cardHTML, esc, FACTION_ICONS, heroArtOf, playerHeroArt, playerPortraitHTML, youText, rankBadgeHTML, rankProgressHTML, icon } from './shared.js';

// ---- Pieces ------------------------------------------------------------------

// Keywords are drawn on the minion itself (shield, bubble, ice, ...) the way
// Hearthstone does it; only things with no visual get a small icon.
const ONE_TIME_TRIGGERS = new Set(['battlecry', 'summon', 'deathrattle', 'surface']);

// 'Twin Strike' -> 'twin-strike' (for CSS classes and data-kw).
const kwSlug = (k) => k.toLowerCase().replace(/\s+/g, '-');

export function keywordClasses(c) {
  return allKeywords(c).map((k) => `kw-${kwSlug(k)}`).join(' ');
}

// Aliens (Hive Brood): turns until a Chestburster Evolves.
const evolveLeft = (m, s) => Math.max(1, evolveTurnsFor(s, m.controller) - (m.evolveProgress ?? 0));

function cornerIcons(m, s) {
  return [
    m.cardId === 'chestburster' ? `<i class="evolve-mark" title="Chestburster: Evolves into a Xeno ${evolveLeft(m, s) <= 1 ? 'at the start of its next turn' : `in ${evolveLeft(m, s)} of its turns`}">⏳${evolveLeft(m, s)}</i>` : '',
    m.acidCoated ? '<i class="coat-mark" title="Acid-coated: its next Corrosion lowers its Attack by 1 more">💧</i>' : '',
    m.tempControl ? '<i title="Controlled temporarily">⛓</i>' : '',
    m.returnAtEndOfTurn ? '<i title="Returns to hand at end of turn">↩</i>' : '',
  ].join('');
}

// Bottom-centre badges, like Hearthstone's Exit / trigger / Lifesteal / Poisonous icons.
function badges(m) {
  if (hasKeyword(m, 'Silenced')) return '';
  // (An Infection's Rage Runner shows as the 🦠 mark, not as an Exit.)
  const triggers = [...(getCard(m.cardId).triggers ?? []), ...(m.grantedTriggers ?? []).filter((t) => !t.infection && !t.implant)];
  return [
    // Robots: installed Upgrades and the Weapon.
    m.upgrades ? `<i class="b-upgrade" title="${m.upgrades} Upgrade${m.upgrades === 1 ? '' : 's'} installed">⚙${m.upgrades}</i>` : '',
    m.weapon ? `<i class="b-weapon" title="Weapon: ${m.weapon.name}">🔫</i>` : '',
    m.relic ? `<i class="b-weapon b-relic" title="Relic: ${m.relic.name}">🗡️</i>` : '',
    triggers.some((t) => t.on === 'deathrattle') ? '<i class="b-deathrattle" title="Exit">💀</i>' : '',
    triggers.some((t) => t.on === 'surface') ? '<i class="b-surface" title="Surface: happens when it comes up from Burrow">⏫</i>' : '',
    triggers.some((t) => !ONE_TIME_TRIGGERS.has(t.on)) ? '<i class="b-trigger" title="Triggers when something happens">⚡</i>' : '',
    hasKeyword(m, 'Lifesteal') ? `<i class="b-lifesteal">${kwIcon('lifesteal', 'Lifesteal')}</i>` : '',
    hasKeyword(m, 'Poisonous') ? `<i class="b-poison">${kwIcon('poisonous', 'Poisonous')}</i>` : '',
    hasKeyword(m, 'Venomous') ? `<i class="b-venom">${kwIcon('venomous', 'Venomous')}</i>` : '',
    hasKeyword(m, 'Recoil') ? '<i class="b-recoil" title="Recoil">↯</i>' : '',
    hasKeyword(m, 'Thick Fur') ? '<i class="b-fur" title="Thick Fur: can\'t be Frozen">🧥</i>' : '',
    hasKeyword(m, 'Hardy') ? '<i class="b-hardy" title="Hardy: takes 1 less damage from each hit (never below 1)">🪨</i>' : '',
  ].join('');
}

// Radiation: a ☢ badge with the Radiation value (and turns left if it's temporary).
// A character weakened by an enemy's Radiation: a green haze plus a "-N" tag by its Health.
const radHitHTML = (c) => (c.radReduction > 0
  ? `<span class="rad-hit-badge" title="Irradiated: ${c.radReduction} less Health from enemy Radiation">☢−${c.radReduction}</span><i class="rad-haze"></i>` : '');
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
     <span class="burn-badge" title="Burn ${c.burn}: takes ${c.burn} damage at the end of its enemy's turn, then Burn rises by 1 (${c.burnLeft ?? 2} turn${(c.burnLeft ?? 2) === 1 ? '' : 's'} left)">🔥${c.burn}</span>`
  : '');

const asleep = (m, s) => m.sick && !hasKeyword(m, 'Charge') && !hasKeyword(m, 'Rush') && m.controller === s.activePlayer;

// ---- Status strip --------------------------------------------------------------
// Every status a minion is under gets one colour-coded chip, in a fixed order, in a strip above
// it: the same place, colour and icon every time, so states can't be mixed up at a glance.
// At most 3 show; the rest fold into "+N" (hover/tap the minion to read them all). A chip that
// is new since the last redraw pops in, so you see the moment a status lands.
// STATUS_ICONS: painted icon art (art/icons/<slug>.png) once it exists; emoji until then.
export const STATUS_ICONS = Object.fromEntries(['frozen', 'burning', 'infected', 'implanted', 'irradiated', 'radhit', 'corroded', 'prey', 'silenced', 'blind', 'burned', 'rage', 'stealth', 'burrowed'].map((k) => [k, `art/icons/${k}.png`]));
const kwIcon = (k, title) => `<img class="kw-ico" src="art/icons/${k}.png" alt="" title="${title}">`;
const STATUS_DEFS = [
  { k: 'frozen', label: 'Frozen', ico: '❄', test: (m) => hasKeyword(m, 'Frozen'), tip: "Frozen: can't attack until it thaws" },
  { k: 'burning', label: 'Burn', ico: '🔥', test: (m) => m.burn > 0, n: (m) => m.burn, tip: (m) => `Burning: takes ${m.burn} damage at the end of its enemy's turn` },
  { k: 'holyflame', label: 'Holy', ico: '✨', test: (m) => m.holyFlame > 0, n: (m) => m.holyFlame, tip: (m) => `Holy Flame ${m.holyFlame}: takes ${m.holyFlame} damage at the end of its enemy's turn (double if Dark), can't be healed, and is Reduced to Ash if it dies` },
  { k: 'acidhide', label: 'Acid Hide', ico: '🧪', test: (m) => hasKeyword(m, 'Acid Hide'), tip: 'Acid Hide: a minion that fights it is Corroded by 1; a Hero that does loses its Weapon (or 2 Armor)' },
  { k: 'regen', label: 'Regen', ico: '💚', test: (m) => (m.regen ?? getCard(m.cardId).regenerate ?? 0) > 0, n: (m) => m.regen ?? getCard(m.cardId).regenerate, tip: (m) => `Regenerate ${m.regen ?? getCard(m.cardId).regenerate}: heals that much at the start of its turn` },
  { k: 'infected', label: 'Infected', ico: '🦠', test: (m) => m.infected != null, tip: 'Infected: when it dies, a 2/1 Rage Runner is summoned for the Infecting side' },
  { k: 'implanted', label: 'Implant', ico: '🥚', test: (m) => m.implanted != null, tip: 'Implanted: when it dies, a Chestburster bursts out for the other side' },
  { k: 'irradiated', label: 'Rad', ico: '☢', test: (m) => radiationOf(m) > 0, n: (m) => radiationOf(m), tip: (m) => `Radiation ${radiationOf(m)}: other characters without Radiation have ${radiationOf(m)} less Health` },
  { k: 'radhit', label: 'Irradiated', ico: '☢', test: (m) => m.radReduction > 0, n: (m) => `−${m.radReduction}`, tip: (m) => `Irradiated: ${m.radReduction} less Health from enemy Radiation, and can't be healed` },
  { k: 'corroded', label: 'Corroded', ico: '🧪', test: (m) => m.corrosion > 0, n: (m) => `−${m.corrosion}`, tip: (m) => `Corrosion: Attack lowered by ${m.corrosion}` },
  { k: 'prey', label: 'Prey', ico: '🎯', test: (m) => !!m.prey, tip: 'Marked Prey: Sharks hunt it, even through Stealth and Elusive' },
  { k: 'silenced', label: 'Silenced', ico: '🔇', test: (m) => hasKeyword(m, 'Silenced'), tip: 'Silenced: its card text and keywords are gone' },
  { k: 'blind', label: 'Blind', ico: '🙈', test: (m) => hasKeyword(m, 'Blind'), tip: 'Blind: its attacks hit a random character' },
  { k: 'burned', label: 'Scorched', ico: '♨', test: (m) => hasKeyword(m, 'Burned'), tip: 'Burned: loses 1 Health at the end of its turn' },
  { k: 'rage', label: 'Rage', ico: '💢', test: (m) => hasKeyword(m, 'Rage'), tip: 'Rage: gains +1 Attack whenever it takes damage and survives' },
  { k: 'stealth', label: 'Stealth', ico: '👁', test: (m) => hasKeyword(m, 'Stealth'), tip: "Stealth: can't be attacked or targeted until it attacks" },
  { k: 'burrowed', label: 'Burrowed', ico: '⛰', test: (m) => !!m.burrowed, tip: 'Burrowed: underground until its next turn, then it Surfaces' },
];
const seenStatus = new Map(); // uid -> Set of status keys shown last time
let statusGame = null;
function statusStripHTML(m, s) {
  if (statusGame !== s) { statusGame = s; seenStatus.clear(); }
  const on = STATUS_DEFS.filter((d) => d.test(m));
  const before = seenStatus.get(m.uid) ?? new Set();
  seenStatus.set(m.uid, new Set(on.map((d) => d.k)));
  if (!on.length) return '';
  const shown = on.slice(0, 3), more = on.slice(3);
  const chip = (d) => {
    const tip = typeof d.tip === 'function' ? d.tip(m) : d.tip;
    const ico = STATUS_ICONS[d.k] ? `<img src="${STATUS_ICONS[d.k]}" alt="">` : `<span class="st-emo">${d.ico}</span>`;
    const n = d.n ? `<b>${d.n(m)}</b>` : '';
    return `<i class="st st-${d.k}${before.has(d.k) ? '' : ' new'}" title="${esc(tip)}">${ico}${n}<em>${d.label}</em></i>`;
  };
  return `<div class="status-strip">${shown.map(chip).join('')}${more.length ? `<i class="st st-more" title="${esc(more.map((d) => (typeof d.tip === 'function' ? d.tip(m) : d.tip)).join('\n'))}">+${more.length}</i>` : ''}</div>`;
}

// ---- Shard minions -------------------------------------------------------------
// Board minions are six-sided crystal shards in a bronze rim, edged in their faction's
// colour (the old ovals return with Settings > Classic card frames). Taunt raises a glowing
// magic shield in front of the minion; it flares up the moment a minion gains Taunt.
const WARD_UP_MS = 1000;
const WARD_PATH = 'M50,4 C64,10 80,12 94,12 C94,52 82,86 50,106 C18,86 6,52 6,12 C20,12 36,10 50,4 Z';
const wardSince = new Map(); // minion uid -> when its Taunt shield first appeared
let wardGame = null;          // the match those uids belong to

// The shield's shared gradients live once in the page; every shield refers to them.
if (typeof document !== 'undefined' && !document.getElementById('ward-defs')) {
  document.body?.insertAdjacentHTML('beforeend', `<svg id="ward-defs" width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
    <pattern id="ward-hex" width="10" height="8.66" patternUnits="userSpaceOnUse"><path d="M2.5,0 L7.5,0 L10,4.33 L7.5,8.66 L2.5,8.66 L0,4.33 Z" fill="none" stroke="#fff6cf" stroke-width=".5" opacity=".3"/></pattern>
    <linearGradient id="ward-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6cf" stop-opacity=".2"/><stop offset=".55" stop-color="#ffd76a" stop-opacity=".04"/><stop offset="1" stop-color="#ff9a2a" stop-opacity=".2"/></linearGradient>
    <linearGradient id="ward-shine" x1="0" y1="0" x2="1" y2="0"><stop offset=".35" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".35"/><stop offset=".65" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <filter id="ward-blur" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3"/></filter>
    <clipPath id="ward-clip"><path d="${WARD_PATH}"/></clipPath></defs></svg>`);
}

function wardHTML(m) {
  if (!wardSince.has(m.uid)) {
    wardSince.set(m.uid, Date.now());
    if (!document.body.classList.contains('classic-cards')) playSound('shield');
  }
  const age = Date.now() - wardSince.get(m.uid);
  const up = age < WARD_UP_MS ? ` up" style="--wd:-${age}ms` : '';
  return `<div class="sm-ward${up}"><svg viewBox="0 0 100 110" preserveAspectRatio="none" aria-hidden="true">
    <path d="${WARD_PATH}" fill="url(#ward-fill)"/>
    <g clip-path="url(#ward-clip)"><rect width="100" height="110" fill="url(#ward-hex)"/><rect class="shine" width="100" height="110" fill="url(#ward-shine)"/></g>
    <path class="edge" d="${WARD_PATH}" fill="none" stroke="#ffb83a" stroke-width="7" filter="url(#ward-blur)"/>
    <path d="${WARD_PATH}" fill="none" stroke="#fff3c0" stroke-width="3.2"/>
    <path d="M50,11 C61,16 74,18 86,18 C86,52 76,79 50,96 C24,79 14,52 14,18 C26,18 39,16 50,11 Z" fill="none" stroke="#ffd76a" stroke-width="1.4" opacity=".9"/>
    <path d="M50,40 L55,50 L50,66 L45,50 Z" fill="#fff6cf" opacity=".45"/>
  </svg><i></i><i></i><i></i><b class="burst"></b></div>`;
}

// How cracked a damaged minion looks: t1 / t2 / t3 as it loses up to a third, two thirds, or more of its Health.
export function crackTier(m) {
  const lost = m.maxHealth > 0 ? (m.maxHealth - m.health) / m.maxHealth : 0;
  return lost <= 0 ? '' : lost < 0.34 ? 't1' : lost < 0.67 ? 't2' : 't3';
}

// shift: this minion can be Transformed right now (Lycanthropes) — it gets a moon button.
export function minionHTML(m, s, cls = '', shift = false) {
  const card = getCard(m.cardId);
  const atk = effectiveAttack(m);
  // A minion remade into another form (Blood Shade) wears that form's art.
  const art = artOf(m.look ? getCard(m.look) ?? card : card);
  const kws = allKeywords(m).map(kwSlug);
  const taunt = kws.includes('taunt');
  if (wardGame !== s) { wardGame = s; wardSince.clear(); }
  if (!taunt) wardSince.delete(m.uid);
  const faction = fslug(card.faction ?? 'neutral');
  // Void: a Hollow minion glows while its owner's hand is empty (its bonus is on).
  const hollow = [].concat(card.aura ?? []).some((a) => a.if?.handEmpty) && !m.textLost
    ? (s.players[m.controller].hand.length === 0 ? 'hollow on' : 'hollow') : '';
  return `
    <div class="minion shardm f-${faction} ${keywordClasses(m)} ${cls} ${hollow} ${art ? 'has-art' : ''} ${asleep(m, s) ? 'asleep' : ''} ${m.burn > 0 ? 'burning' : ''} ${m.prey ? 'prey' : ''} ${m.corrosion > 0 ? 'corroded' : ''} ${m.corrosion > 0 && atk === 0 ? 'zeroed' : ''} ${radiationOf(m) ? 'irradiated' : ''} ${m.radReduction > 0 ? 'rad-hit' : ''} ${m.burrowed ? 'burrowed' : ''} ${m.infected != null ? 'infected' : ''} ${m.implanted != null ? 'implanted' : ''}" data-char="${m.uid}" data-preview="${card.id}" data-kw="${kws.join(' ')}" style="--idle:-${((m.uid * 0.73) % 5).toFixed(2)}s">
      <div class="m-shield"></div>
      <div class="m-wind"></div>
      <i class="sm-frame"><i class="sm-rim"></i><i class="sm-glow"></i><i class="sm-crack"></i></i>
      <div class="m-art" ${art ? `style="background-image: url('${art}')"` : ''}>${art ? '' : `<span class="art">${card.art ?? '✦'}</span>`}<i class="m-cracks ${crackTier(m)}"></i></div>
      <i class="sm-shine"></i>
      <div class="m-ring"></div>
      ${burnHTML(m)}
      ${radHTML(m)}${radHitHTML(m)}
      ${m.infected != null ? '<i class="ov-infect"><b></b><b></b><b></b><b></b></i>' : ''}
      ${m.implanted != null ? '<i class="ov-implant"><b></b></i>' : ''}
      ${hasKeyword(m, 'Rage') && !hasKeyword(m, 'Silenced') ? '<i class="ov-rage"></i>' : ''}
      ${statusStripHTML(m, s)}
      <div class="m-fx"><span class="m-ice"></span><span class="m-drip"></span><span class="m-embers"></span><span class="m-blind"></span><span class="m-silence"></span><span class="m-camo"></span><span class="m-smoke"></span><span class="m-ghost"></span><span class="m-ghost two"></span><span class="m-sand"></span></div>
      <div class="m-speed"></div><div class="m-sparkle"></div>
      <div class="m-zzz"><b>z</b><b>z</b><b>Z</b></div>
      <div class="icons">${cornerIcons(m, s)}</div>
      <div class="badges">${badges(m)}</div>
      ${card.cost != null ? `<span class="m-cost" title="Mana cost">${card.cost}</span>` : ''}
      ${card.form ? `<i class="m-form ${card.form}" title="${card.form === 'beast' ? 'Beast Form' : 'Humanoid Form'}">${card.form === 'beast' ? '🐾' : '👤'}</i>` : ''}
      ${shift ? `<button class="m-shift ${card.form}" data-shift="${m.uid}" title="Transform into ${card.form === 'beast' ? 'Humanoid' : 'Beast'} Form">🌕</button>` : ''}
      ${taunt ? wardHTML(m) : ''}
      <i class="sm-socket l"></i><i class="sm-socket r"></i>
      <span class="atk ${atk > m.attack ? 'up' : atk < m.attack ? 'down' : ''}">${atk}</span>
      <span class="hp ${m.health < m.maxHealth ? 'down' : m.maxHealth > (card.health ?? 0) ? 'up' : ''}">${m.health}</span>
    </div>`;
}

// Two-faction decks show their pair's fused hero; a pair without one shows both heroes,
// split down a slanted seam (first faction on the left, second on the right), so you can
// tell at a glance which pair, and so which Fusion, each player has.
function portraitHTML(pl) {
  const art = playerHeroArt(pl.factions);
  const second = pl.factions[1] && art === heroArtOf(pl.factions[0]) ? heroArtOf(pl.factions[1]) : null;
  if (!art) return `<div class="portrait-placeholder f-${fslug(pl.factions[0])}"><span>${FACTION_ICONS[pl.factions[0]] ?? '✦'}</span></div>`;
  // A still picture: hero portraits don't move.
  const layers = (src, cls = '') => `<img class="portrait-img ${cls}" src="${src}" alt="" draggable="false">`;
  if (pl.factions.length === 2 && !second) return layers(art, 'fused');
  if (!second || second === art) return layers(art);
  return layers(art, 'split-a') + layers(second, 'split-b') + '<i class="portrait-seam"></i>';
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

function heroSpellsHTML(pl, legal, mine, s = null) {
  return pl.heroSpells.map((hs) => {
    const card = getCard(hs.cardId);
    const usable = mine && legal.some((a) => a.type === 'heroSpell' && a.card === hs.cardId);
    const art = artOf(card);
    return `<button class="hero-spell ${usable ? 'usable' : ''} ${hs.uses ? 'used' : ''} ${hs.cooldown > 0 ? 'cooling' : ''}" data-hs="${hs.cardId}" data-preview="${card.id}" ${usable ? '' : 'disabled'}>
      ${hs.cooldown > 0 ? `<span class="cooldown-badge" title="Ready in ${hs.cooldown} turn${hs.cooldown === 1 ? '' : 's'}">⏳${hs.cooldown}</span>` : ''}
      <span class="hs-flip"><span class="hs-face front">${art ? `<img src="${art}" alt="" draggable="false">` : `<span>${card.art}</span>`}</span><span class="hs-face back"></span></span>
      <b class="hs-cost ${s && !card.costsAllMana && heroSpellCost(s, card) > card.cost ? 'pricier' : ''}">${s ? heroSpellCost(s, card, pl) : card.cost}</b>
      ${hs.cardId === 'infernal_summoning' ? tierHTML(pl) : ''}</button>`;
  }).join('');
}

// Demons: the Summoning Tier on Infernal Summoning (next Health cost = next Demon's cost).
function tierHTML(pl) {
  const t = Math.min(10, pl.summonTier ?? 1);
  return `<span class="tier-badge" title="Summoning Tier ${t}: costs ${t} Health and summons a ${t}-Mana Demon">🩸${t}</span>`;
}

// Ultraterrestrials: minions this player will get back from Beyond Reality (Displaced).
function beyondHTML(pl, s) {
  const mine = (s.beyond ?? []).filter((x) => x.controller === pl.index);
  if (!mine.length) return '';
  const when = (x) => (x.waiting ? 'waiting for room' : `back at the start of ${s.players[x.returnAt].name}'s ${x.skips ? `turn after next (+${x.skips})` : 'next turn'}`);
  const tip = mine.map((x) => `${getCard(x.minion.cardId).name}: ${when(x)}`).join(' · ');
  const art = artOf(getCard(mine[0].minion.cardId));
  return `<div class="beyond-badge" title="Beyond Reality · ${esc(tip)}" data-preview="${mine[0].minion.cardId}">
    ${art ? `<img src="${art}" alt="" draggable="false">` : '<span>🌀</span>'}<b>${mine.length}</b></div>`;
}

// Zombies: Corpses left behind (shown once a player has any, or plays Zombies).
function corpseHTML(pl) {
  const n = pl.corpses ?? 0;
  if (!n && !pl.factions.includes('Zombies') && !pl.factions.includes('Fungus')) return '';
  return `<div class="corpse-badge ${n ? '' : 'empty'}" title="${n} Corpse${n === 1 ? '' : 's'}: left when a friendly Zombie or Fungus minion dies; some cards spend them"><span>🪦</span><b>${n}</b></div>`;
}

// Robots (Arsenal Protocol): the Hero's Weapon, with its Attack and Durability left. Tap to see the card.
// It sits in the slot left of the portrait; the Fusion sits with the Hero Spells.
function weaponHTML(pl) {
  const w = pl.hero.weapon;
  if (!w) return '';
  const art = artOf(getCard(w.cardId));
  return `<div class="weapon-badge" data-preview="${w.cardId}" title="${esc(w.name)}: ${w.attack} Attack, ${w.durability} Durability left (each attack uses 1)">
    ${art ? `<i style="background-image:url('${art}')"></i>` : '<span>⚔️</span>'}<b class="w-atk">${w.attack}</b><b class="w-dur">${w.durability}</b></div>`;
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

// Ice Age: countdown to The Great Freeze (passive Hero Spell).
function freezeHTML(pl, s) {
  const gf = pl.greatFreeze;
  if (!gf) return '';
  const left = Math.max(0, gf.every - gf.turns);
  const tip = `The Great Freeze ${left ? `in ${left} turn${left === 1 ? '' : 's'}` : 'at the end of this turn'}: everything without Thick Fur is Frozen`;
  return `<div class="freeze-badge ${left <= 1 && s.activePlayer === pl.index ? 'soon' : ''}" title="${esc(tip)}" data-preview="the_great_freeze">
    <span>❄</span><b>${left}</b></div>`;
}

// Bees: The Living Hive (passive Hero Spell). Shows whether the Hive stands, the Queen is out, or both are gone.
function hiveHTML(pl) {
  if (!pl.factions.includes('Bees')) return '';
  const hive = pl.board.find((m) => m.cardId === 'the_hive');
  const queen = pl.board.find((m) => m.cardId === 'the_queen');
  const under = !!pl.queenUnderground;
  const state = under ? ['🕳️', 'The Queen is Underground in the Hidden Nest: she is safe until the Nest dies']
    : hive ? ['🐝', 'The Hive stands'] : queen ? ['👑', 'The Queen is out: if she dies, your Hero takes 10 damage'] : ['✖', 'The Hive and the Queen are gone'];
  const art = artOf(getCard('hive_mind'));
  return `<div class="hive-badge ${queen ? 'queen' : ''} ${under ? 'under' : ''} ${!hive && !queen && !under ? 'gone' : ''}" title="The Living Hive · ${state[1]}" data-preview="hive_mind">
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
      ${pl.hero.weapon ? `<div class="hero-fusion">${weaponHTML(pl)}</div>` : ''}
      <div class="hero-portrait ${keywordClasses(h)} ${cls} ${destroyed ? 'destroyed' : ''} ${!s.gameOver && h.health <= 10 ? 'weary' : ''} ${h.burn > 0 ? 'burning' : ''} ${radiationOf(h) ? 'irradiated' : ''} ${h.radReduction > 0 ? 'rad-hit' : ''}" data-char="${h.uid}" data-kw="${allKeywords(h).map(kwSlug).join(' ')}">
        ${portraitHTML(pl)}
        ${burnHTML(h)}
        ${h.holyFlame > 0 ? `<span class="hero-holy" title="Holy Flame ${h.holyFlame}: takes ${h.holyFlame} damage at the end of the enemy's turn and can't be healed">✨${h.holyFlame}</span>` : ''}
        ${radHTML(h)}${radHitHTML(h)}
        ${cracksSVG(crackStage(h))}
        <span class="m-ice"></span>
        <div class="hero-name">${esc(pl.name)}</div>
        ${atk > 0 ? `<span class="atk">${atk}</span>` : ''}
        <span class="hp ${h.health < h.maxHealth ? 'down' : ''}">${h.health}</span>
        ${h.armor ? `<span class="armor">${h.armor}</span>` : ''}
      </div>
      <div class="hero-powers">${heroSpellsHTML(pl, legal, mine, s)}${extinctionHTML(pl, s)}${freezeHTML(pl, s)}${hiveHTML(pl)}${corpseHTML(pl)}${pl.fusion ? fusionHTML(pl, legal, mine) : ''}${beyondHTML(pl, s)}</div>
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

// The pile is as thick as the deck: a card back for every 3 cards (at most 12), down to the last one.
function pileLayers(n) {
  const k = n > 0 ? Math.min(12, Math.ceil(n / 3)) : 0;
  return Array.from({ length: k }, (_, i) => `<span style="--i:${i}"></span>`).join('');
}

// The Mushroom count is public; which cards carry them is not.
function deckHTML(pl, mine) {
  const shrooms = mushroomsIn(pl.deck);
  const tip = `${pl.deck.length} cards left${shrooms ? ` · ${shrooms} Mushroom${shrooms === 1 ? '' : 's'} hidden in this deck` : ''}`;
  return `<div class="deck-pile ${mine ? 'me' : 'opp'}" title="${tip}" ${backStyle(pl.factions)}>
    <div class="pile ${pl.deck.length ? '' : 'empty'}">${pileLayers(pl.deck.length)}${shrooms ? `<i class="shroom-count">🍄${shrooms}</i>` : ''}</div><b>${pl.deck.length}</b></div>`;
}

// The enemy's nameplate (top-left): avatar, name and deck size, then Health and Mana pills.
function oppPlateHTML(pl) {
  const art = playerHeroArt(pl.factions);
  const h = pl.hero;
  return `<div class="opp-plate">
    <span class="op-avatar">${art ? `<img src="${art}" alt="" draggable="false">` : `<b>${FACTION_ICONS[pl.factions[0]] ?? '✦'}</b>`}</span>
    <div class="op-body">
      <div class="op-name"><b>${esc(pl.name)}</b><span class="op-deck" title="${pl.deck.length} cards left in the enemy deck">${icon('cards')}${pl.deck.length}</span></div>
      <div class="op-pills"><span class="op-hp" title="Enemy Health">${icon('heart')}${h.health}${h.armor ? `<small>+${h.armor}</small>` : ''}</span>
        <span class="op-mana" title="Enemy Mana">${icon('mana')}${pl.mana.current}/${pl.mana.max}</span></div>
    </div></div>`;
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

// The results: a title that stamps in (gold rays behind a Victory, falling ash behind a
// Defeat), your Hero's medallion, the match in numbers (they count up, row by row), your best
// play, what the match earned you, and the way back. \`ctx.fresh\`: the first time it is shown
// (later re-renders show it without replaying the entrance).
function gameOverHTML(s, me, stats, ctx = {}) {
  const outcome = s.winner == null ? 'draw' : s.winner === me ? 'win' : 'loss';
  const result = { win: 'Victory', loss: 'Defeat', draw: 'Draw' }[outcome];
  const mp = s.players[me];
  const op = s.players[1 - me];
  const st = stats ?? {};
  const rounds = Math.ceil(s.turn / 2);
  let i = 0;
  const row = (label, a, b) => {
    const x = a ?? 0, y = b ?? 0;
    return `<div class="go-row" style="--i:${i++}"><span class="go-n ${x > y ? 'lead' : ''}" data-count="${x}">${x}</span><span class="go-label">${label}</span><span class="go-n ${y > x ? 'lead' : ''}" data-count="${y}">${y}</span></div>`;
  };
  const best = st.bestPlay ? `<div class="go-best" style="--i:${i + 1}"><span>Best play</span><b>${esc(st.bestPlay.text)}</b></div>` : '';
  const art = playerHeroArt(mp.factions);
  const won = ctx.unlocked?.length ?? 0;
  const rewards = outcome === 'win' && won
    ? `<div class="go-reward" style="--i:${i + 2}"><img src="art/ui/icon-unlocks.png" alt=""><span><b>${won} new card${won === 1 ? '' : 's'} unlocked</b><small>Add them with Build my deck on the menu.</small></span></div>`
    : outcome !== 'win' && (ctx.mode === 'ai' || ctx.mode === 'online')
      ? `<div class="go-reward muted" style="--i:${i + 2}"><img src="art/ui/icon-unlocks.png" alt=""><span><b>Win a match to unlock new cards</b><small>Every victory unlocks 2.</small></span></div>` : '';
  const ash = outcome === 'loss' ? `<div class="go-ash">${Array.from({ length: 18 }, (_, k) => `<i style="--x:${(k * 53) % 100}%;--d:${(k * 0.37) % 4}s;--t:${5 + (k % 5)}s;--s:${3 + (k % 4)}px"></i>`).join('')}</div>` : '';
  return `<div class="overlay game-over ${outcome} ${ctx.fresh ? 'fresh' : ''}">
    ${outcome === 'win' ? '<div class="go-rays"></div>' : ''}${ash}
    <div class="panel summary">
      ${art ? `<div class="go-medal">${playerPortraitHTML(mp.factions)}</div>` : ''}
      <h2 class="go-title"><span>${result}</span></h2>
      <p class="go-sub">${s.winner == null ? 'Nobody wins' : esc(youText(`${s.players[s.winner].name} wins`))} · ${rounds} round${rounds === 1 ? '' : 's'}</p>
      <div class="go-stats">
        <div class="go-row go-head"><span>${esc(mp.name)}</span><span></span><span>${esc(op.name)}</span></div>
        ${row('Damage to Heroes', st.heroDamage?.[me], st.heroDamage?.[1 - me])}
        ${row('Minions destroyed', st.kills?.[me], st.kills?.[1 - me])}
        ${row('Cards played', st.cardsPlayed?.[me], st.cardsPlayed?.[1 - me])}
        ${row('Healing', st.healing?.[me], st.healing?.[1 - me])}
        ${row('Health left', Math.max(0, mp.hero.health), Math.max(0, op.hero.health))}
      </div>
      ${best}
      ${rewards}
      ${onlineResultHTML(ctx)}
      <div class="go-actions" style="--i:${i + 3}"><button data-act="rematch">${ctx.waiting ? 'Another bot game' : ctx.online?.server ? 'Play again' : 'Rematch'}</button><button data-act="menu" class="ghost">${ctx.waiting ? 'Back to the queue' : 'Main menu'}</button></div>
    </div></div>`;
}

// ---- The whole table ---------------------------------------------------------------

// Painted boards are a 16:9 stage; on tall, narrow screens (phones held upright)
// it would be a thin strip, so those keep the drawn table instead.
// The board a player's matches are played on: their first realm's, or the Basic board (Settings).
export const boardFaction = (faction) => (getSettings().basicBoard ? 'Basic' : faction);
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

// The Descent gauge (Demons' Circles of Hell): Dante's nine circles down the side of the
// battlefield, the current one lit and what waits below. The battle sinks one circle each round.
// Tap it for the full explanation (descentPanelHTML).
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];
function descentHTML(d) {
  const next = CIRCLES[d.depth];
  const fill = d.depth / CIRCLES.length;
  return `<div class="descent-gauge ${d.depth ? 'sunk' : ''}" data-act="descentInfo" role="button" title="The Descent: tap to learn how it works">
    <div class="dg-head">${icon('flame')}<span>Descent</span><i class="dg-q">?</i></div>
    <div class="dg-body">
      <div class="dg-rings">${CIRCLES.map((x) => `<i class="${x.n <= d.depth ? 'past' : ''} ${x.n === d.depth ? 'now' : ''}">${ROMAN[x.n - 1]}</i>`).join('')}</div>
      <div class="dg-fill"><b style="height:${(fill * 100).toFixed(0)}%"></b></div>
    </div>
    <div class="dg-count">${next ? `${d.depth}<small>/${CIRCLES.length}</small>` : 'Bottom'}</div>
  </div>`;
}

export const descentCalloutHTML = () => `<div class="descent-callout" data-act="descentInfo"><b>${icon('flame')} The Descent</b>
  <p>A Demon is in this battle. Each round it sinks one circle deeper into Hell, from Limbo down to Treachery, and each circle changes the rules for <b>both players</b>.</p><u>Tap to learn more</u></div>`;

// The Descent explained: what it is, how fast it sinks, and all nine circles.
function descentPanelHTML(s) {
  const d = s.descent;
  const c = CIRCLES[d.depth - 1];
  return `<div class="overlay descent-info" data-act="closeDescent"><div class="panel descent-panel" data-act="descentPanel">
    <h2>${icon('flame')} The Descent</h2>
    <p class="dp-lead">A Demon is in this battle, so it sinks through Dante's nine <b>Circles of Hell</b>, one circle each round. Each circle changes the rules for <b>both players</b>.</p>
    <p class="dp-need">Round 1 is Limbo and round 9 is Treachery, the frozen bottom of Hell. Baphomet drags the battle one circle further.
      ${CIRCLES[d.depth] ? `Next round: <b>${esc(CIRCLES[d.depth].name)}</b>.` : 'You are at the bottom of Hell.'}</p>
    <ol class="dp-circles">${CIRCLES.map((x) => `<li class="${x.n < d.depth ? 'past' : ''} ${x.n === d.depth ? 'now' : ''}"><i>${ROMAN[x.n - 1]}</i><b>${esc(x.name)}</b><span>${esc(x.text)}</span>${x.n === d.depth ? '<em>You are here</em>' : ''}</li>`).join('')}</ol>
    <p class="sub">${c ? `Only the current circle's rule is active: ${esc(c.name)}.` : 'The battle is still at the gates. Only the current circle\'s rule is ever active.'} Baphomet, Lilith and Satan grow stronger the deeper you go.</p>
    <button data-act="closeDescent">Got it</button>
  </div></div>`;
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
  const shiftable = new Set(legal.filter((a) => a.type === 'transform').map((a) => a.minion));
  const faction = fslug(mp.factions[0]);
  // The board shown: your first realm's, or the plain one if you picked it in Settings.
  const bf = boardFaction(mp.factions[0]);
  // The painting itself is drawn by board-layer.js (behind the arena), so it survives re-renders.
  // Demons' Descent: once the battle has sunk, BOTH players fight on the current circle's board.
  const depth = s.descent?.depth ?? 0;
  const circle = depth > 0 ? depth : null;
  const board = paintedBoards() && (circle ? CIRCLE_BOARDS.land[circle].src : BOARD_ART[bf]);
  // Portrait: the faction's portrait board (its own painting, lined up by layoutPortraitBoard);
  // without one, the landscape board fills the screen behind the table, darkened.
  const portrait = !board && portraitLayout();
  const pb = portrait ? (circle ? CIRCLE_BOARDS.portrait[circle] : PORTRAIT_BOARDS[bf]) : null;
  // Boards with cut-out props show the clean plate (the props are drawn over it).
  const art = portrait && (circle ? pb.src : BOARD_CUTS.portrait?.[bf]?.plate ?? pb?.src ?? BOARD_ART[bf]);
  const artUrl = art ? new URL(art, document.baseURI).href : '';
  const artStyle = art ? `style="--art: url('${artUrl}')"` : '';
  const pbCls = pb ? `p-board opp-${pb.opp[4]} me-${pb.me[4]}` : '';
  // Landscape boards with their own layout: frame and battlefield positions as CSS
  // variables (container units of the 16:9 arena), plus the animated corner props.
  const lb = board ? (circle ? CIRCLE_BOARDS.land[circle] : LANDSCAPE_BOARDS[bf]) : null;
  const lbStyle = lb ? landscapeVars(lb) : '';
  // Living realm boards (board-fx-defs.js) and boards whose painting has no hero frames.
  const fxKey = circle ? null : boardKey(bf);
  const pfx = circle || (pb && hasBoardFx(fxKey, 'portrait') ? fxKey : null);
  const frame = (pb ?? lb)?.frame;

  return `
    <div class="arena f-${faction} ${board ? 'has-board' : ''} ${lb ? 'v-board' : ''} ${portrait ? 'portrait' : ''} ${pbCls} ${lowHp ? 'low-hp' : ''} ${circle ? `in-circle circle-${circle}` : ''} ${frame ? `drawn-frame frame-${frame}` : ''}" ${art ? artStyle : lb ? `style="${lbStyle}"` : ''} ${pb ? `data-pboard="${circle ? `circle${circle}` : bf}"` : ''} data-faction="${esc(mp.factions[0])}" ${circle ? `data-circle="${circle}"` : ''}>
      ${pb ? `<div class="pboard-img" style="background-image: url('${artUrl}')"></div>` : ''}
      ${pb && pfx ? `<div class="pboard-fx" data-fx="${pfx}"></div>` : ''}
      ${pb?.props ? propsHTML(pb.props, PORTRAIT_SIZE, artUrl, BOARD_CUTS.portrait?.[bf]?.cuts) : ''}
      ${lb?.props ? propsHTML(lb.props, LANDSCAPE_SIZE, new URL(lb.src, document.baseURI).href, BOARD_CUTS.land?.[bf]?.cuts) : ''}
      ${s.descent ? descentHTML(s.descent) : ''}
      ${s.descent && ctx.descentIntro ? descentCalloutHTML() : ''}
      ${lethal ? '<div class="lethal-tag">Lethal!</div>' : ''}
      ${historyHTML(ctx.history)}
      <div class="table-oval"></div>
      <div class="opp-hand" ${backStyle(op.factions)}>${op.hand.map(() => '<div class="card back"><span>✦</span></div>').join('')}</div>
      ${heroZoneHTML(op, s, [], false, `${charCls(op.hero.uid)} ${lethal ? 'lethal' : ''}`, ctx.shattered)}
      <div class="board opp" data-board="opp">${op.board.map((m) => minionHTML(m, s, charCls(m.uid))).join('')}</div>
      <div class="midline"></div>
      <div class="rope ${ctx.rope != null ? 'burning' : ''}" style="--burn: ${(ctx.rope ?? 0).toFixed(4)}"><div class="rope-fuse"></div><div class="rope-spark"></div></div>
      ${ctx.thinking ? `<div class="thinking">${esc(ctx.thinking)} is thinking<span class="dots"><b>.</b><b>.</b><b>.</b></span></div>` : ''}
      <div class="board me" data-board="me">${mp.board.map((m) => minionHTML(m, s, charCls(m.uid), shiftable.has(m.uid))).join('')}</div>
      ${heroZoneHTML(mp, s, legal, true, charCls(mp.hero.uid), ctx.shattered)}
      <div class="my-hand">${handoff ? '' : mp.hand.map((inst) => cardHTML(getCard(inst.cardId), {
        uid: inst.uid, playable: playable.has(inst.uid), cost: costOf(s, inst),
        respond: respondable.has(inst.uid), dim: myTurn && !playable.has(inst.uid),
        // Void (Singularity): a card Pulled from the enemy deck, with its Collapse keyword.
        tag: inst.bonusKeywords?.length ? `🕳️ +${inst.bonusKeywords.join(', ')}` : inst.pulled ? '🕳️ Pulled' : '',
      })).join('')}</div>
      ${manaHTML(op, false)}
      ${manaHTML(mp, true)}
      <div class="rail">
        ${deckHTML(op, false)}
        ${ctx.canUndo ? '<button class="undo-btn ghost" data-act="undo" title="Take back your last move">↶ Undo</button>' : ''}
        ${endTurnHTML(s, me, legal, ctx.endArmed)}
        ${deckHTML(mp, true)}
      </div>
      ${ctx.recap ? `<div class="turn-recap ${ctx.recap.fresh ? 'fresh' : ''}" data-act="closeRecap" title="Tap to close"><b>Opponent's turn</b>${ctx.recap.lines.map((l) => `<span>${esc(l)}</span>`).join('')}${ctx.recap.more ? `<span class="sub">…and ${ctx.recap.more} more (see the log)</span>` : ''}</div>` : ''}
      ${oppPlateHTML(op)}
      <div class="corner-buttons">
        <button class="ghost" data-act="toggleLog" title="Game log">${icon('log')}<span>Log</span></button>
        <button class="ghost" data-act="mute" title="Sound">${icon(isMuted() ? 'muted' : 'sound')}<span>Sound</span></button>
        <button class="ghost" data-act="save" title="Save">${icon('save')}<span>Save</span></button>
        <button class="ghost" data-act="settings" title="Settings">${icon('gear')}<span>Settings</span></button>
        ${s.gameOver ? '' : `<button class="ghost" data-act="concede" title="Concede">${icon('flag')}<span>Surrender</span></button>`}
        <button class="ghost" data-act="menu" title="Menu">${icon('menu')}<span>Menu</span></button>
      </div>
      ${ctx.descentOpen && s.descent ? descentPanelHTML(s) : ''}
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
  const key = arena.dataset.pboard;
  const pb = key.startsWith('circle') ? CIRCLE_BOARDS.portrait[key.slice(6)] : PORTRAIT_BOARDS[key];
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
