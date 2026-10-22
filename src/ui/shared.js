// Rendering helpers shared by every screen: card markup, the big card,
// keyword glossary, art lookup and text fitting.

import { ART, FUSION_HERO_ART, HERO_ART } from '../cards/art-manifest.js';
import { validateCard } from '../cards/validate.js';
import { getCard } from '../engine/registry.js';
import { artSrc } from './art-packs.js';
import { FACTION_TAGS, KEYWORD_TEXT } from '../engine/rules.js';

export const FACTION_ICONS = { Vampires: '🧛', Dinosaurs: '🦖', Plants: '🌿', Aliens: '👽', Fungus: '🍄', Zombies: '🧟', Dragons: '🐉', Demons: '😈', Divine: '😇', Robots: '🤖', Radioactive: '☢️', Bees: '🐝', Ghosts: '👻', Ultraterrestrials: '🔺', Sharks: '🦈', Acidic: '🧪', Fusion: '🌀' };

// Small line icons for buttons (they take the button's text colour).
const ICON_PATHS = {
  log: '<path d="M7 3h11a2 2 0 0 1 2 2v13a3 3 0 0 1-3 3H7"/><path d="M7 3a3 3 0 0 0-3 3v1h3"/><path d="M7 3v15a3 3 0 0 0 3 3"/><path d="M10 8h7M10 12h7M10 16h4"/>',
  sound: '<path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>',
  muted: '<path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M17 9l5 6M22 9l-5 6"/>',
  save: '<path d="M5 3h12l4 4v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M7 3v6h9V3M7 21v-7h10v7"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/><circle cx="12" cy="12" r="7"/>',
  flag: '<path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  book: '<path d="M3 5a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v15a2 2 0 0 0-2-2H3z"/><path d="M21 5a2 2 0 0 0-2-2h-5a2 2 0 0 0-2 2v15a2 2 0 0 1 2-2h7z"/>',
  players: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20a6 6 0 0 1 12 0"/><circle cx="17" cy="9" r="2.6"/><path d="M15.5 14.2A5 5 0 0 1 21 19"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 21h8M9 17h6"/>',
  search: '<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5.5 5.5"/>',
  bulb: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1 2V16h5.2v-.2c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  flame: '<path d="M12 3c1 3.5 5 5.5 5 10.5a5 5 0 0 1-10 0c0-2.4 1.2-3.8 2.3-5 .3 1.6 1 2.6 2.2 3.1C11 9 11 6 12 3z"/>',
};
export const icon = (name) => `<svg class="ui-ico" viewBox="0 0 24 24" aria-hidden="true">${ICON_PATHS[name] ?? ''}</svg>`;

export const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Per-card nudges for where the wide picture window crops the square art (CSS object-position Y;
// the default is 12%, i.e. crop mostly from the bottom). Higher shows more of the lower part.
const ART_FOCUS_Y = { bubble_slime: '58%' };
const artFocus = (card) => (ART_FOCUS_Y[card.id] ? ` style="object-position: 50% ${ART_FOCUS_Y[card.id]}"` : '');
// Image for a card; Hybrids and other created cards use their source card's art.
export const artOf = (card) => { const path = ART[card.id] ?? (card.artFrom ? ART[card.artFrom] : undefined); return path && artSrc(path); };

// Hero portrait for a faction (designer-provided art), if there is one yet.
export const heroArtOf = (faction) => HERO_ART?.[faction] && artSrc(HERO_ART[faction]);
// Art path of the fused hero for a two-faction deck (either order), if there is one.
export const fusionHeroPath = (factions) => {
  if (factions?.length !== 2) return undefined;
  const [a, b] = factions.map((f) => f.toLowerCase());
  return FUSION_HERO_ART[`${a}-${b}`] ?? FUSION_HERO_ART[`${b}-${a}`];
};
// The portrait path a player shows: their pair's fused hero, else their first faction's hero.
export const playerHeroPath = (factions) => fusionHeroPath(factions) ?? HERO_ART?.[factions[0]];
export const playerHeroArt = (factions) => { const p = playerHeroPath(factions); return p && artSrc(p); };
// A fused hero comes alive: the scene drifts slowly, the figure (a soft cut-out of the middle)
// breathes in front of it, and a glint of light sweeps across now and then. Fills its box.
export const livingPortraitHTML = (src) => `<span class="living"><img class="lv-scene" src="${src}" alt="" draggable="false">`
  + `<img class="lv-figure" src="${src}" alt="" draggable="false" aria-hidden="true"><i class="lv-glint"></i></span>`;
// A player's portrait as an <img>, or alive when it is their pair's fused hero.
export const playerPortraitHTML = (factions) => {
  const src = playerHeroArt(factions);
  if (!src) return '';
  return fusionHeroPath(factions) ? livingPortraitHTML(src) : `<img src="${src}" alt="">`;
};

// Card back for a faction (a player's back matches their first faction).
const BACKS = ['Aliens', 'Demons', 'Dinosaurs', 'Divine', 'Dragons', 'Fungus', 'Plants', 'Radioactive', 'Robots', 'Vampires', 'Zombies', 'Bees', 'Ghosts', 'Ultraterrestrials', 'Sharks', 'Acidic', 'Lycanthropes', 'Void'];
export const backArtOf = (faction) => (BACKS.includes(faction) ? artSrc(`art/backs/${faction.toLowerCase()}.jpg`) : undefined);
// A two-faction deck's backs are half and half: the first faction's back, with the second's
// over its right half past a slanted gold seam (CSS: --back and --back2).
export const backsOf = (factions) => {
  const [a, b] = (Array.isArray(factions) ? factions : [factions]).map(backArtOf);
  return a ? (b && b !== a ? [a, b] : [a]) : [];
};
export const backVars = (factions) => backsOf(factions).map((u, i) => `--back${i ? 2 : ''}:url('${new URL(u, document.baseURI).href}')`).join(';');
export const backStyle = (factions) => (backsOf(factions).length ? `style="${backVars(factions)}"` : '');

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
      ${(zoom || cuttable) && (card.beastForm ?? card.rebornAs) ? `<div class="beast-behind" aria-hidden="true">${bigCardHTML(getCard(card.beastForm ?? card.rebornAs), { small: true })}</div>` : ''}
      ${bigCardHTML(card, { cost, costClass, small: true })}
      ${incomplete.length ? '<span class="pending-tag">pending</span>' : ''}
      ${cuttable ? `<button class="card-zoom ghost" data-zoom="${card.id}" title="See full size">${icon('search')}</button>` : ''}
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
    <div class="big-card framed t-${card.type} f-${faction} ${incomplete.length ? 'is-pending' : ''} ${card.legendary ? 'legend' : ''}">
      <div class="bc-art">${artOf(card) ? `<img src="${artOf(card)}" alt="${esc(card.name)}" ${small ? 'loading="lazy"' : ''} draggable="false">` : `<span>${card.art ?? '✦'}</span>`}</div>
      <img class="bc-frame" src="art/frames/${card.type === 'minion' ? 'minion' : card.type === 'trap' ? 'trap' : 'spell'}.png" alt="" draggable="false">
      <i class="bc-sock sock-cost"></i>${card.type === 'minion' ? '<i class="bc-sock sock-atk"></i><i class="bc-sock sock-hp"></i>' : ''}
      <span class="bc-gem bc-cost ${costClass}">${cost ?? card.cost}</span>
      ${ribbonSVG(card.name, card.type)}
      <div class="bc-text"><span>${richText(card.text) || '<i>No card text.</i>'}${extra}</span></div>
      ${label ? `<div class="bc-type">${esc(label)}</div>` : ''}
      ${card.type === 'minion' ? `<span class="bc-gem bc-atk ${statClass(attack, card.attack)}">${attack ?? card.attack ?? '?'}</span><span class="bc-gem bc-hp ${hpClass} ${String(health ?? card.health ?? '').length > 1 ? 'two-digit' : ''}">${health ?? card.health ?? '?'}</span>` : ''}
      ${card.form === 'beast' ? '<span class="bc-token">Beast Form</span>' : card.formLabel ? `<span class="bc-token">${esc(card.formLabel)}</span>` : card.token ? '<span class="bc-token">Token</span>' : ''}
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
// Colours: grey stone for minions, blue for spells, lighter blue for Quick Plays, red for traps.
const LEGEND_FRAMES = new Set(['Acidic', 'Aliens', 'Bees', 'Demons', 'Dinosaurs', 'Divine', 'Fungus', 'Ghosts', 'Lycanthropes',
  'Plants', 'Radioactive', 'Robots', 'Sharks', 'Ultraterrestrials', 'Vampires', 'Void', 'Zombies']);
function shardCardHTML(card, { attack, health, cost, costClass, extra, small, hpClass, label, faction, incomplete }) {
  const type = card.type === 'minion' ? 'minion' : card.type === 'trap' ? 'trap' : 'spell';
  const frame = type === 'spell' && card.quickPlay ? 'quickplay' : type;
  const hp = health ?? card.health ?? '?';
  // Legendary cards (7+ Mana) wear their own gold frame (art/frames/legendary-<type>.png).
  const legend = !!card.legendary;
  // Each faction's legendary minions have their own painted frame (Dragons and fusions use the gold one).
  const own = legend && type === 'minion' && !card.fusion && LEGEND_FRAMES.has(card.faction);
  const frameSrc = own ? `art/frames/legendary-minion-${card.faction.toLowerCase()}.webp`
    : legend ? `art/frames/legendary-${type}.png` : `art/frames/painted-${frame}.png`;
  return `
    <div class="big-card shard t-${card.type} ${frame === 'quickplay' ? 'qp' : ''} f-${faction} ${card.fusion ? 'f-fusion' : ''} ${incomplete.length ? 'is-pending' : ''} ${legend ? 'legend' : ''}"${own ? ` style="--foil-frame: url('${frameSrc}')"` : ''}>
      <div class="bc-art">${artOf(card) ? `<img src="${artOf(card)}" alt="${esc(card.name)}"${artFocus(card)} ${small ? 'loading="lazy"' : ''} draggable="false">` : `<span>${card.art ?? '✦'}</span>`}</div>
      <div class="bc-text"><span>${richText(card.text) || '<i>No card text.</i>'}${extra}</span></div>
      <img class="bc-frame" src="${frameSrc}" alt="" draggable="false">
      ${legend ? '' : `<i class="sh-accent" style="-webkit-mask-image:url('art/frames/painted-${type}-glow.png');mask-image:url('art/frames/painted-${type}-glow.png')"></i>`}
      ${sigilHTML(card)}
      <span class="bc-gem bc-cost ${costClass}">${cost ?? card.cost}</span>
      <div class="bc-banner"><span>${esc(card.name)}</span></div>
      ${label ? (type === 'minion'
    ? `<div class="bc-type lines-${label.split(' · ').length}">${label.split(' · ').map((w) => `<span>${esc(w)}</span>`).join('')}</div>`
    : `<div class="bc-type"><span>${esc(label)}</span></div>`) : ''}
      ${card.type === 'minion' ? `<span class="bc-gem bc-atk ${statClass(attack, card.attack)}">${attack ?? card.attack ?? '?'}</span><span class="bc-gem bc-hp ${hpClass} ${String(hp).length > 1 ? 'two-digit' : ''}">${hp}</span>` : ''}
      ${card.form === 'beast' ? '<span class="bc-token">Beast Form</span>' : card.formLabel ? `<span class="bc-token">${esc(card.formLabel)}</span>` : card.token ? '<span class="bc-token">Token</span>' : ''}
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

// Fitting one box at a time makes the browser re-measure the page after every step, and the
// board redraws often, so fitAllText works in batches: clear every size, measure everything
// once, then shrink only the boxes that overflow. The size a given text needs in a given box
// is remembered, so the same card in the same spot is fitted without measuring again.
const fitCache = new Map();
const overflows = (f) => (f.wide ? f.box.scrollWidth > f.box.clientWidth + 1 : f.box.scrollHeight > f.box.clientHeight + 1);
export function fitAllText(root) {
  const items = [];
  for (const el of root.querySelectorAll('.card .text')) items.push({ el, box: el, min: 0.4 });
  for (const el of root.querySelectorAll('.bc-text span')) items.push({ el, box: el.parentElement, min: 0.4 });
  for (const el of root.querySelectorAll('.bc-banner span')) items.push({ el, box: el, min: 0.5, wide: true });
  for (const el of root.querySelectorAll('.shard .bc-type span')) items.push({ el, box: el, min: 0.4, wide: true });
  if (!items.length) return;
  for (const f of items) {
    f.el.style.fontSize = '';
    // Undo a previous two-line split (the card may have re-rendered at another size).
    if (f.el.querySelector?.('br') && f.el.closest('.bc-banner')) { f.el.textContent = f.el.textContent.replace(',', ', '); f.el.style.whiteSpace = ''; f.el.style.lineHeight = ''; }
  }
  const todo = [];
  for (const f of items) {
    if (!overflows(f)) continue;
    f.start = parseFloat(getComputedStyle(f.el).fontSize);
    f.key = `${f.wide ? 'w' : 'h'}|${f.start}|${f.box.clientWidth}x${f.box.clientHeight}|${f.el.innerHTML}`;
    todo.push(f);
  }
  const fresh = [];
  for (const f of todo) {
    const size = fitCache.get(f.key);
    if (size) f.el.style.fontSize = `${size}px`; else fresh.push(f);
  }
  for (const f of fresh) {
    let size = f.start;
    while (overflows(f) && size > f.start * f.min) {
      size -= 0.5;
      f.el.style.fontSize = `${size}px`;
    }
    // A long title name ("Malgrath, the Bloodmoon Behemoth") that still doesn't fit on one line
    // breaks after its comma onto two lines, at a size that fits the banner's height.
    if (overflows(f) && f.wide && f.el.closest('.bc-banner') && !f.el.querySelector('br') && f.el.textContent.includes(', ')) {
      const [a, ...rest] = f.el.textContent.split(', ');
      f.el.innerHTML = `${esc(a)},<br>${esc(rest.join(', '))}`;
      f.el.style.whiteSpace = 'nowrap';
      f.el.style.lineHeight = '0.95';
      size = f.start * 0.62;
      f.el.style.fontSize = `${size}px`;
      while ((overflows(f) || f.el.scrollHeight > f.box.parentElement.clientHeight * 1.05) && size > f.start * 0.4) {
        size -= 0.5;
        f.el.style.fontSize = `${size}px`;
      }
      continue; // not cached: the two-line layout is rebuilt each time
    }
    if (fitCache.size > 3000) fitCache.clear();
    fitCache.set(f.key, size);
  }
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
