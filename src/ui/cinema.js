// The Play screen as an old cinema lobby: every realm is a B-movie poster on the lobby wall.
// Hovering a poster (or tapping it on a phone) brings up its lobby card: the film's title, the
// realm's Hero Spell, how it plays, and its strengths and weaknesses.
//
// posterHTML(faction, state) - one poster for the wall.  initLobby({ info }) - the lobby card.

import { FACTION_INFO } from '../cards/faction-info.js';
import { allCards } from '../engine/registry.js';
import { artSrc } from './art-packs.js';
import { esc, fslug } from './shared.js';

// Each realm's feature presentation.
export const MOVIE_TITLES = {
  Acidic: 'The Blob That Ate Main Street',
  Aliens: 'Invasion from Beyond the Stars',
  Bees: 'Terror of the Killer Hive',
  Demons: 'The Night Hell Opened',
  Dinosaurs: 'The Day Extinction Failed',
  Divine: 'They Came from Heaven',
  Dragons: 'Wings of Inferno',
  Eels: 'Terror at 10,000 Volts',
  'Fruit Ninjas': 'Attack of the Forbidden Fruit',
  Fungus: 'The Spore That Ate the World',
  Ghosts: 'The Dead Walk at Midnight',
  'Ice Age': 'She Came from the Frozen Past',
  'Monster Hunter': 'The Last Monster Hunter',
  Plants: 'The Garden That Devoured Manhattan',
  Radioactive: 'Atomic Abominations',
  Robots: 'Revolt of the Machines',
  Sharks: 'Jaws from the Abyss',
  Ultraterrestrials: 'Beyond the Fourth Dimension',
  Vampires: 'The Night of Eternal Blood',
  Void: 'The Thing Beyond Reality',
  Lycanthropes: 'Curse of the Savage Moon',
  Witches: 'The Coven of Midnight',
  Zombies: 'Dawn of the Rotting Dead',
};

export const posterPath = (f) => `art/posters/${fslug(f)}.jpg`;
const heroSpellOf = (f) => allCards().find((c) => c.heroSpell && !c.fusion && !c.token && c.faction === f) ?? null;

// One poster in its lobby frame. state: { on, slot (0/1 or -1), sealed, attrs }.
// preview: the poster picked out by a first click (or the arrow keys); hint: what a second click does.
export function posterHTML(f, { on = false, slot = -1, sealed = false, attrs = '', color = '#8a6cff', preview = false, hint = '' } = {}) {
  const title = MOVIE_TITLES[f] ?? f;
  return `<button class="rx-ftile cine-poster f-${fslug(f)} ${on ? 'on' : ''} ${sealed ? 'sealed' : ''} ${preview ? 'previewing' : ''}" ${attrs} style="--fc:${color}" aria-label="${esc(f)}: ${esc(title)}" aria-pressed="${on}">
    <span class="cine-frame"><span class="rx-ftile-ico cine-art"><img src="${artSrc(posterPath(f))}" alt="" draggable="false" loading="lazy"></span><i class="cine-glare"></i>${hint && !sealed ? `<i class="cine-hint">${esc(hint)}</i>` : ''}</span>
    <span class="rx-ftile-name cine-name">${esc(f)}</span>
    ${on ? `<i class="cine-ticket">${slot >= 0 ? `Faction ${slot + 1}` : 'Now playing'}</i>` : sealed ? '<i class="rx-lock">🔒</i>' : ''}
  </button>`;
}

// The lobby card: what a realm's film is about.
export function lobbyCardHTML(f) {
  const info = FACTION_INFO[f] ?? {};
  const hero = heroSpellOf(f);
  const list = (xs) => (xs?.length ? `<ul>${xs.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '');
  return `<div class="cine-card-poster"><img src="${artSrc(posterPath(f))}" alt="" draggable="false"></div>
    <div class="cine-card-body">
      <small class="cine-card-kicker">Now showing · ${esc(f)}</small>
      <h3 class="cine-card-title">${esc(MOVIE_TITLES[f] ?? f)}</h3>
      ${info.style ? `<p class="cine-card-style">${esc(info.style)}</p>` : ''}
      ${info.summary ? `<p class="cine-card-summary">${esc(info.summary)}</p>` : ''}
      ${hero ? `<div class="cine-card-hero"><b>Hero Spell · ${esc(hero.name)}${hero.passive ? '' : ` (${hero.cost} Mana)`}</b><span>${esc(hero.text ?? '')}</span></div>` : ''}
      <div class="cine-card-cols"><div><h4>Strengths</h4>${list(info.strengths)}</div><div><h4>Weaknesses</h4>${list(info.weaknesses)}</div></div>
    </div>`;
}

// The floating lobby card. It lives outside the app (renders replace the app's contents) and
// shows beside the poster wall while a mouse rests on a poster.
let card = null, showing = null, hideTimer = 0, dragging = false;
function place(el) {
  const panel = el.closest('.rx-fpanel')?.getBoundingClientRect() ?? el.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  const w = Math.min(460, window.innerWidth - 24);
  card.style.width = `${w}px`;
  // Beside the wall when there's room, otherwise over it.
  const left = panel.right + 14 + w < window.innerWidth ? panel.right + 14 : Math.max(12, window.innerWidth - w - 12);
  card.style.left = `${left}px`;
  const h = card.offsetHeight;
  card.style.top = `${Math.max(12, Math.min(window.innerHeight - h - 12, r.top + r.height / 2 - h / 2))}px`;
}
function show(el) {
  const f = el.dataset.faction ?? el.dataset.sealed;
  if (!f || dragging) return;
  clearTimeout(hideTimer);
  if (showing !== f) {
    card.innerHTML = lobbyCardHTML(f);
    card.style.setProperty('--fc', getComputedStyle(el).getPropertyValue('--fc'));
    showing = f;
    card.classList.remove('in'); void card.offsetWidth;
  }
  place(el);
  card.classList.add('in');
}
export function hideLobbyCard() {
  clearTimeout(hideTimer);
  card?.classList.remove('in');
  showing = null;
}

export function initLobby({ active }) {
  if (card) return;
  card = document.createElement('aside');
  card.className = 'cine-card';
  card.setAttribute('role', 'tooltip');
  document.body.append(card);
  const fine = () => matchMedia('(hover: hover) and (pointer: fine)').matches;
  document.addEventListener('pointerover', (e) => {
    if (e.pointerType !== 'mouse' || !fine() || !active()) return;
    const el = e.target.closest?.('.cine-poster');
    if (el) show(el);
  });
  document.addEventListener('pointerout', (e) => {
    if (e.pointerType !== 'mouse') return;
    const el = e.target.closest?.('.cine-poster');
    if (el && !el.contains(e.relatedTarget)) hideTimer = setTimeout(hideLobbyCard, 60);
  });
  // Keyboard: the focused poster shows its card too.
  document.addEventListener('focusin', (e) => { const el = e.target.closest?.('.cine-poster'); if (el && active() && el.matches(':focus-visible')) show(el); });
  document.addEventListener('focusout', (e) => { if (e.target.closest?.('.cine-poster')) hideLobbyCard(); });
  document.addEventListener('pointerdown', (e) => { if (!e.target.closest?.('.cine-poster')) hideLobbyCard(); }, true);
  // Picking a poster up to drag it into a slot: the card would sit over the slots.
  document.addEventListener('factiondragstart', () => { dragging = true; hideLobbyCard(); });
  document.addEventListener('pointerup', () => { dragging = false; }, true);
}

// ---- The reel: what plays as a match begins -------------------------------------------------
// A scratchy film-leader countdown (3, 2, 1), then your film's opening credits (its poster, or
// both posters as a double feature), then the curtains close. The returned element is left
// on screen with the curtains closed, above everything; openCurtains() parts them over the
// next scene (hero fusion or versus) and removes the reel. A tap skips straight to the end.
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export async function playReel({ factions, sound, calm = false, behind = null }) {
  const el = document.createElement('div');
  el.className = `cine-reel ${calm ? 'calm' : ''}`;
  const titles = factions.map((f) => MOVIE_TITLES[f] ?? f);
  el.innerHTML = `
    <div class="reel-leader"><div class="reel-dial"><i class="reel-sweep"></i><b class="reel-num">3</b></div><i class="reel-scratch"></i><i class="reel-grain"></i></div>
    <div class="reel-credits">
      <small class="reel-kicker">${factions.length > 1 ? 'Tonight’s double feature' : 'Now showing'}</small>
      <div class="reel-posters">${factions.map((f) => `<span class="reel-poster"><img src="${artSrc(posterPath(f))}" alt="" draggable="false"></span>`).join('<i class="reel-amp">&amp;</i>')}</div>
      <h2 class="reel-title">${titles.map(esc).join('<i> &amp; </i>')}</h2>
    </div>
    <i class="reel-curtain l"></i><i class="reel-curtain r"></i><i class="reel-valance"></i>`;
  document.getElementById('fx-layer')?.appendChild(el) ?? document.body.appendChild(el);
  let skipped = false;
  const skip = () => { skipped = true; el.classList.add('skip'); };
  el.addEventListener('pointerdown', skip);
  const step = async (ms) => { if (!skipped) await Promise.race([wait(ms), new Promise((r) => el.addEventListener('pointerdown', r, { once: true }))]); };
  try {
    // The loader underneath can go now the reel covers it.
    behind?.remove();
    if (!calm) {
      el.classList.add('leader-on');
      for (const n of [3, 2, 1]) {
        if (skipped) break;
        el.querySelector('.reel-num').textContent = String(n);
        const sw = el.querySelector('.reel-sweep');
        sw.style.animation = 'none'; void sw.offsetWidth; sw.style.animation = '';
        sound?.('click');
        await step(560);
      }
      el.classList.remove('leader-on');
    }
    if (!skipped) {
      el.classList.add('credits-on');
      sound?.('drum');
      await step(calm ? 900 : 1700);
    }
    el.classList.add('curtains-shut');
    sound?.('whoosh');
    await wait(skipped ? 260 : 520);
  } finally {
    el.removeEventListener('pointerdown', skip);
  }
  return el;
}
export function openCurtains(el, sound) {
  if (!el) return Promise.resolve();
  el.classList.remove('credits-on');
  el.classList.add('curtains-open');
  sound?.('whoosh');
  return wait(el.classList.contains('calm') ? 450 : 950).then(() => el.remove());
}
