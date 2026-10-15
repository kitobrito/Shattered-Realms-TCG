// Rendering helpers shared by every screen: card markup, the big card,
// keyword glossary, art lookup and text fitting.

import { ART, HERO_ART } from '../cards/art-manifest.js';
import { validateCard } from '../cards/validate.js';
import { FACTION_TAGS, KEYWORD_TEXT } from '../engine/rules.js';

export const FACTION_ICONS = { Vampires: '🧛', Dinosaurs: '🦖', Plants: '🌿', Aliens: '👽', Fungus: '🍄', Zombies: '🧟', Dragons: '🐉', Demons: '😈', Divine: '😇', Robots: '🤖', Radioactive: '☢️', Bees: '🐝', Ghosts: '👻', Ultraterrestrials: '🔺', Sharks: '🦈', Acidic: '🧪', Fusion: '🌀' };

export const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Per-card nudges for where the wide picture window crops the square art (CSS object-position Y;
// the default is 12%, i.e. crop mostly from the bottom). Higher shows more of the lower part.
const ART_FOCUS_Y = { bubble_slime: '58%' };
const artFocus = (card) => (ART_FOCUS_Y[card.id] ? ` style="object-position: 50% ${ART_FOCUS_Y[card.id]}"` : '');
// Image for a card; Hybrids and other created cards use their source card's art.
export const artOf = (card) => ART[card.id] ?? (card.artFrom ? ART[card.artFrom] : undefined);

// Hero portrait for a faction (designer-provided art), if there is one yet.
export const heroArtOf = (faction) => HERO_ART?.[faction];

// Card back for a faction (a player's back matches their first faction).
const BACKS = ['Aliens', 'Demons', 'Dinosaurs', 'Divine', 'Dragons', 'Fungus', 'Plants', 'Radioactive', 'Robots', 'Vampires', 'Zombies', 'Bees', 'Ghosts', 'Ultraterrestrials', 'Sharks', 'Acidic'];
export const backArtOf = (faction) => (BACKS.includes(faction) ? `art/backs/${faction.toLowerCase()}.jpg` : undefined);
export const backStyle = (faction) => (backArtOf(faction) ? `style="--back:url('${new URL(backArtOf(faction), document.baseURI).href}')"` : '');

// A normal-size card (hand, collection, builder, choices). It is the same
// Hearthstone-style card as the big preview (bigCardHTML), drawn small: the
// .card wrapper keeps the hand/collection behaviour, the frame scales with it.
export function cardHTML(card, { uid, playable, selected, back, choice, zoom, cost, cuttable, isCut, cutLabel = 'CUT', isDupe, respond, dim } = {}) {
  if (back) return '<div class="card back"><span>✦</span></div>';
  const { incomplete } = validateCard(card);
  const data = uid != null ? `data-hand="${uid}"` : choice != null ? `data-choice="${choice}"`
    : cuttable ? `data-cut="${card.id}"` : zoom ? `data-zoom="${card.id}"` : '';
  const costClass = cost != null && cost < card.cost ? 'cheaper' : cost > card.cost ? 'pricier' : '';
  return `
    <div class="card t-${card.type} ${isCut ? 'cut' : ''} ${isDupe ? 'dupe' : ''} ${artOf(card) ? 'has-art' : ''} ${card.quickPlay ? 'quick' : ''} ${playable ? 'playable' : ''} ${respond ? 'respond' : ''} ${dim ? 'dim' : ''} ${selected ? 'selected' : ''} ${incomplete.length ? 'incomplete' : ''}"
         data-preview="${card.id}" ${data}>
      ${bigCardHTML(card, { cost, costClass, small: true })}
      ${incomplete.length ? '<span class="pending-tag">pending</span>' : ''}
      ${cuttable ? `<button class="card-zoom ghost" data-zoom="${card.id}" title="See full size">🔍</button>` : ''}
      ${isCut ? `<span class="cut-tag">${cutLabel}</span>` : ''}
      ${isDupe ? '<span class="dupe-tag">×2</span>' : ''}
    </div>`;
}

// Every glossary term that applies to a card: its keywords, its type, and
// any term named in its text.
export function cardTerms(card) {
  const terms = new Set(card.keywords ?? []);
  if (card.quickPlay) terms.add('Quick Play');
  if (card.type === 'trap') terms.add('Trap');
  if (card.heroSpell) terms.add('Hero Spell');
  for (const term of Object.keys(KEYWORD_TEXT)) {
    // Trigger abilities are written as labels ("Summon: …"); the bare word
    // "Summon a Seedling" is just a verb.
    const label = ['Arrival', 'Summon', 'Exit'].includes(term);
    if (new RegExp(label ? `\\b${term}:` : `\\b${term}s?\\b`, 'i').test(card.text)) terms.add(term);
  }
  return [...terms].filter((t) => KEYWORD_TEXT[t]);
}

// Card text with known keywords in bold.
export function richText(text) {
  let html = esc(text);
  for (const term of Object.keys(KEYWORD_TEXT).sort((a, b) => b.length - a.length)) {
    html = html.replace(new RegExp(`\\b(${term})\\b`, 'g'), '<b>$1</b>');
  }
  return html;
}

// The full card drawn large: frame, art window, name banner, text box, gems.
// `live` overrides (current Attack/Health/cost) are used by in-game previews.
// The name ribbon arcs over minions (flatter on spells); drawn in SVG so the
// name follows the curve. Long names get a smaller font.
let ribbonId = 0;
function ribbonSVG(name, type) {
  const id = `rb${ribbonId++}`;
  const bend = type === 'minion' ? 0 : 18;
  const size = Math.min(22, 360 / Math.max(10, name.length));
  return `<svg class="bc-ribbon" viewBox="0 0 300 70" preserveAspectRatio="none" aria-hidden="true">
    <path class="rb-back" d="M2,${38 + bend * 0.4} L18,${30 + bend * 0.5} L18,${62 + bend * 0.2} Z M298,${38 + bend * 0.4} L282,${30 + bend * 0.5} L282,${62 + bend * 0.2} Z"/>
    <path class="rb-band" d="M14,${30 + bend * 0.6} Q150,${-2 + bend} 286,${30 + bend * 0.6} L286,${62 + bend * 0.2} Q150,${30 + bend} 14,${62 + bend * 0.2} Z"/>
    <path class="rb-shine" d="M18,${33 + bend * 0.6} Q150,${2 + bend} 282,${33 + bend * 0.6}"/>
    <path id="${id}" d="M28,45 C80,36 140,19 190,17 S258,21 288,28" fill="none"/>
    <text class="rb-text" font-size="${size.toFixed(1)}" text-anchor="middle" dominant-baseline="central"><textPath href="#${id}" startOffset="50%">${esc(name)}</textPath></text>
  </svg>`;
}

// A live stat that differs from the printed card: green up, red down.
const statClass = (now, printed) => (now == null || printed == null ? '' : now > printed ? 'up' : now < printed ? 'down' : '');

export function bigCardHTML(card, { attack, health, maxHealth, cost, costClass = '', extra = '', small = false } = {}) {
  // Like Hearthstone: damaged Health is red even on a buffed minion; otherwise compare with the printed stat.
  const hpClass = maxHealth != null && health < maxHealth ? 'down' : statClass(health, card.health);
  const { incomplete } = validateCard(card);
  const label = card.fusion ? `Fusion · ${card.fusion.join(' + ')}` : card.heroSpell ? 'Hero Spell' : card.quickPlay ? 'Spell ⚡'
    // Minions show their tribe and any Dark / Undead tags (Divine cards punish those).
    : card.type === 'minion' ? [...(card.tribes ?? []), ...(card.tags ?? FACTION_TAGS[card.faction] ?? [])].join(' · ') : card.type === 'trap' ? 'Trap' : 'Spell';
  const faction = card.faction.toLowerCase().replace(/\s+/g, '-');
  if (!classicCards()) return shardCardHTML(card, { attack, health, cost, costClass, extra, small, hpClass, label, faction, incomplete });
  return `
    <div class="big-card framed t-${card.type} f-${faction} ${incomplete.length ? 'is-pending' : ''} ${card.cost >= 7 && !card.token ? 'legend' : ''}">
      <div class="bc-art">${artOf(card) ? `<img src="${artOf(card)}" alt="${esc(card.name)}" ${small ? 'loading="lazy"' : ''} draggable="false">` : `<span>${card.art ?? '✦'}</span>`}</div>
      <img class="bc-frame" src="art/frames/${card.type === 'minion' ? 'minion' : card.type === 'trap' ? 'trap' : 'spell'}.png" alt="" draggable="false">
      <i class="bc-sock sock-cost"></i>${card.type === 'minion' ? '<i class="bc-sock sock-atk"></i><i class="bc-sock sock-hp"></i>' : ''}
      <span class="bc-gem bc-cost ${costClass}">${cost ?? card.cost}</span>
      ${ribbonSVG(card.name, card.type)}
      <div class="bc-text"><span>${richText(card.text) || '<i>No card text.</i>'}${extra}</span></div>
      ${label ? `<div class="bc-type">${esc(label)}</div>` : ''}
      ${card.type === 'minion' ? `<span class="bc-gem bc-atk ${statClass(attack, card.attack)}">${attack ?? card.attack ?? '?'}</span><span class="bc-gem bc-hp ${hpClass} ${String(health ?? card.health ?? '').length > 1 ? 'two-digit' : ''}">${health ?? card.health ?? '?'}</span>` : ''}
      ${card.token ? '<span class="bc-token">Token</span>' : ''}
    </div>`;
}

// Players can switch back to the older painted frames in Settings.
const classicCards = () => typeof document !== 'undefined' && document.body?.classList.contains('classic-cards');

// The faction sigil in the top-right socket: the centre of the faction's card back
// (Fusions show both of their factions' halves).
function sigilHTML(card) {
  const halves = card.fusion ?? [card.faction];
  const parts = halves.map((f) => backArtOf(f) ? `<i style="background-image:url('${backArtOf(f)}')"></i>` : `<i class="sg-none">${FACTION_ICONS[f] ?? '✦'}</i>`);
  return `<span class="sh-sigil ${halves.length > 1 ? 'split' : ''}" title="${esc(halves.join(' + '))}">${parts.join('')}</span>`;
}

// The "Shard" card: a chamfered slab of dark stone with bronze trim and shatter-cracks in the
// faction's colour. Cost hangs from the top-left in a crystal pennant; minions carry Attack and
// Health in two crystal shards either side of the name plate; the type sits in a tab at the bottom.
// Frames: art/frames/painted-<type>.png (painted; the openings are transparent) and
// painted-<type>-glow.png, a soft inner glow around the picture window filled with the faction colour.
function shardCardHTML(card, { attack, health, cost, costClass, extra, small, hpClass, label, faction, incomplete }) {
  const type = card.type === 'minion' ? 'minion' : card.type === 'trap' ? 'trap' : 'spell';
  const hp = health ?? card.health ?? '?';
  return `
    <div class="big-card shard t-${card.type} f-${faction} ${card.fusion ? 'f-fusion' : ''} ${incomplete.length ? 'is-pending' : ''} ${card.cost >= 7 && !card.token ? 'legend' : ''}">
      <div class="bc-art">${artOf(card) ? `<img src="${artOf(card)}" alt="${esc(card.name)}"${artFocus(card)} ${small ? 'loading="lazy"' : ''} draggable="false">` : `<span>${card.art ?? '✦'}</span>`}</div>
      <div class="bc-text"><span>${richText(card.text) || '<i>No card text.</i>'}${extra}</span></div>
      <img class="bc-frame" src="art/frames/painted-${type}.png" alt="" draggable="false">
      <i class="sh-accent" style="-webkit-mask-image:url('art/frames/painted-${type}-glow.png');mask-image:url('art/frames/painted-${type}-glow.png')"></i>
      ${sigilHTML(card)}
      <span class="bc-gem bc-cost ${costClass}">${cost ?? card.cost}</span>
      <div class="bc-banner"><span>${esc(card.name)}</span></div>
      ${label ? (type === 'minion'
    ? `<div class="bc-type lines-${label.split(' · ').length}">${label.split(' · ').map((w) => `<span>${esc(w)}</span>`).join('')}</div>`
    : `<div class="bc-type"><span>${esc(label)}</span></div>`) : ''}
      ${card.type === 'minion' ? `<span class="bc-gem bc-atk ${statClass(attack, card.attack)}">${attack ?? card.attack ?? '?'}</span><span class="bc-gem bc-hp ${hpClass} ${String(hp).length > 1 ? 'two-digit' : ''}">${hp}</span>` : ''}
      ${card.token ? '<span class="bc-token">Token</span>' : ''}
    </div>`;
}

// Card descriptions start large and shrink (down to 60%) only when the text
// doesn't fit its box.
export function fitText(el, box = el) {
  el.style.fontSize = '';
  const start = parseFloat(getComputedStyle(el).fontSize);
  let size = start;
  while (box.scrollHeight > box.clientHeight + 1 && size > start * 0.4) {
    size -= 0.5;
    el.style.fontSize = `${size}px`;
  }
}

// One-line labels (the big card's name banner) shrink until they fit their width.
export function fitWidth(el, min = 0.5) {
  el.style.fontSize = '';
  const start = parseFloat(getComputedStyle(el).fontSize);
  let size = start;
  while (el.scrollWidth > el.clientWidth + 1 && size > start * min) {
    size -= 0.5;
    el.style.fontSize = `${size}px`;
  }
}

export function fitAllText(root) {
  for (const el of root.querySelectorAll('.card .text')) fitText(el);
  for (const big of root.querySelectorAll('.bc-text span')) fitText(big, big.parentElement);
  for (const banner of root.querySelectorAll('.bc-banner span')) fitWidth(banner);
  for (const tag of root.querySelectorAll('.shard .bc-type span')) fitWidth(tag, 0.4);
}

// The engine writes the log in the third person with player names ("You wins!",
// "You's hand"). For the human player, who is named "You", rewrite those lines
// in the second person.
const SECOND_PERSON = { is: 'are', has: 'have', was: 'were' };
export function youText(msg) {
  return msg
    .replace(/\bYou's\b/g, 'your')
    .replace(/(^|[.!:—–-]\s*)your\b/g, (m, pre) => `${pre}Your`)
    .replace(/\bYou (\w+)\b/g, (m, verb) => {
      if (SECOND_PERSON[verb]) return `You ${SECOND_PERSON[verb]}`;
      if (/(ss|sh|ch|x|zz|o)es$/.test(verb)) return `You ${verb.slice(0, -2)}`;
      if (/[^aeiou]ies$/.test(verb)) return `You ${verb.slice(0, -3)}y`;
      if (/[^su]s$/.test(verb)) return `You ${verb.slice(0, -1)}`;
      return m;
    })
    .replace(/^(You \w+.*?)\btheir\b/, '$1your')
    .replace(/\b(to|at|attacks|hits|targets|of|from) You\b/g, '$1 you');
}

// ---- Ranked ladder display (rank views come from server/ladder.js rankView) ----

export const rankBadgeHTML = (v) => `<span class="rank-badge rank-${String(v.tier).toLowerCase()}">${esc(v.label ?? v.tier)}</span>`;

// Promotion series pips: ✓ won, ✕ lost, ○ still to play.
export function seriesHTML(series) {
  if (!series) return '';
  const pips = [];
  for (let i = 0; i < series.best; i++) {
    pips.push(i < series.wins ? '<i class="won">✓</i>' : i < series.wins + series.losses ? '<i class="lost">✕</i>' : '<i>○</i>');
  }
  return `<span class="series" title="Best of ${series.best}: win ${series.need} to reach ${esc(series.to)}">Promotion to ${esc(series.to)} ${pips.join('')}</span>`;
}

// "45 RP" or the promotion series.
export const rankProgressHTML = (v) => (v.series ? seriesHTML(v.series) : `<span class="rp">${v.rp} RP</span>`);
