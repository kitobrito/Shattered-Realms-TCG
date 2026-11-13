// The new menu look (Home hub, Play, Collection and Store share it): a top bar with the logo and
// your points, the Home screen's sidebar, floating-island hub and News panel. main.js owns the state
// and the buttons (data-act); this file only draws.
import { getCard, hasCard } from '../engine/registry.js';
import { artOf, esc, icon } from './shared.js';

const COIN = '<img class="rx-coin" src="art/ui/shop/coin.webp" alt="" draggable="false">';
// Small gold line icons in the mockup's style (24×24, stroked).
const RX_ICONS = {
  home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 9.8V20h4.5v-5.5h4V20h4.5V9.8"/>',
  play: '<path d="M4 4l9.5 9.5M4 4v4M4 4h4"/><path d="M20 4l-9.5 9.5M20 4v4M20 4h-4"/><path d="M7.5 15.5 4 19l1 1 3.5-3.5M16.5 15.5 20 19l-1 1-3.5-3.5"/>',
  build: '<rect x="4" y="5" width="9" height="14" rx="1.5" transform="rotate(-8 8.5 12)"/><rect x="11" y="5" width="9" height="14" rx="1.5" transform="rotate(8 15.5 12)"/>',
  collection: '<path d="M3 5.5c3-1.3 6-1.3 9 .8 3-2.1 6-2.1 9-.8V19c-3-1.3-6-1.3-9 .8-3-2.1-6-2.1-9-.8z"/><path d="M12 6.3v13.5"/>',
  store: '<path d="M3 4h2.5l2.2 10.5h10.6L20.5 7H6.6"/><circle cx="9.5" cy="18.5" r="1.4"/><circle cx="16.5" cy="18.5" r="1.4"/>',
  realms: '<circle cx="12" cy="12" r="8.5"/><path d="M12 6.5a5.5 5.5 0 1 1-5.2 3.7"/><path d="M12 9.5a2.5 2.5 0 1 1-2.3 1.6"/>',
  story: '<path d="M6 3.5h10.5a2 2 0 0 1 2 2V17H8a2 2 0 0 0-2 2z"/><path d="M6 19a2 2 0 0 0 2 2h10.5v-4"/><path d="M9.5 7.5h6M9.5 10.5h6M9.5 13.5h4"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.6M12 18.6v2.6M2.8 12h2.6M18.6 12h2.6M5.5 5.5l1.9 1.9M16.6 16.6l1.9 1.9M5.5 18.5l1.9-1.9M16.6 7.4l1.9-1.9"/><circle cx="12" cy="12" r="6.6"/>',
  news: '<rect x="4" y="4" width="13" height="16" rx="1.5"/><path d="M17 8h3v10a2 2 0 0 1-2 2"/><path d="M7 8h7M7 11h7M7 14h7M7 17h4"/>',
  mail: '<rect x="3" y="5.5" width="18" height="13" rx="1.5"/><path d="m3.5 6.5 8.5 7 8.5-7"/>',
  user: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="10" r="3.2"/><path d="M6 18.3c1.4-2.3 3.5-3.4 6-3.4s4.6 1.1 6 3.4"/>',
  back: '<path d="M20 12H5M11 6l-6 6 6 6"/>',
  arrow: '<path d="M4 12h15M13 6l6 6-6 6"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  crown: '<path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 10H5z"/>',
  casual: '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19c.8-3 3-4.6 5.5-4.6s4.7 1.6 5.5 4.6"/><circle cx="17" cy="9" r="2.5"/><path d="M15.5 14.6c2.4-.2 4.3 1.2 5 4"/>',
  robot: '<rect x="5" y="8" width="14" height="10" rx="2.5"/><path d="M12 4.5V8M9 12.5h.01M15 12.5h.01M9.5 15.5h5M3 12v3M21 12v3"/><circle cx="12" cy="4" r="1"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  seat: '<rect x="3" y="5" width="18" height="11" rx="1.5"/><path d="M8 20h8M12 16v4"/>',
  deck: '<rect x="5" y="4" width="11" height="15" rx="1.5"/><path d="M8 20h10.5a1.5 1.5 0 0 0 1.5-1.5V7"/>',
  filter: '<path d="M4 6h16M7 12h10M10 18h4"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/>',
  minus: '<path d="M5 12h14"/>',
  gem: '<path d="M6 4h12l3 5-9 11L3 9z"/><path d="M3 9h18M9 4l3 16M15 4l-3 16"/>',
};
export const rxIcon = (name, cls = '') => `<svg class="rx-ico ${cls}" viewBox="0 0 24 24" aria-hidden="true">${RX_ICONS[name] ?? ''}</svg>`;

// Points pill(s), the mail (daily missions) and profile buttons at the top right of every new screen.
export function walletHTML({ signedIn, points, unseenMissions = 0, online = true }) {
  if (!online) return `<div class="rx-wallet"><button class="rx-round" data-act="settings" title="Settings">${rxIcon('settings')}</button></div>`;
  return `<div class="rx-wallet">
    ${signedIn ? `<button class="rx-pill" data-act="shopTab:dailies" title="Points: earn them from daily missions, spend them in the Store">${COIN}<b>${Number(points ?? 0).toLocaleString('en-US')}</b><i class="rx-plus">${rxIcon('plus')}</i></button>`
      : `<button class="rx-pill guest" data-act="goSignIn" title="Sign in to earn points">${COIN}<b>Sign in</b><i class="rx-plus">${rxIcon('plus')}</i></button>`}
    <button class="rx-round ${unseenMissions ? 'has-new' : ''}" data-act="${signedIn ? 'dmOpen' : 'goSignIn'}" title="Daily missions">${rxIcon('mail')}${unseenMissions ? `<i class="rx-dot">${unseenMissions}</i>` : ''}</button>
    <button class="rx-round" data-act="settings" title="Settings and account">${rxIcon('user')}</button>
  </div>`;
}

// The header used by Play, Collection and Store: Back to home, the screen's title, the wallet.
export function screenHeadHTML(title, iconName, wallet) {
  return `<header class="rx-head">
    <button class="rx-backhome" data-act="home">${rxIcon('back')}<span>Back to home</span></button>
    <h1 class="rx-title">${rxIcon(iconName)}<span>${esc(title)}</span></h1>
    ${wallet}
  </header>`;
}

const NAV = [
  ['home', 'Home', 'home'], ['play', 'Play', 'menu'], ['build', 'Build', 'navBuild'], ['collection', 'Collection', 'gallery'],
  ['store', 'Store', 'shop'], ['realms', 'Realms', 'navRealms'], ['story', 'Origin Story', 'originStory'], ['settings', 'Settings', 'settings'],
];

// A picture for a patch note in the News panel: its first preview art, board, or card.
function noteThumb(note) {
  for (const b of note.blocks ?? []) {
    if (b.art?.[0]?.src) return b.art[0].src;
    const ids = [...(b.cards ?? []), ...(b.list ?? []).flatMap((x) => x.cards ?? [])];
    for (const x of ids) { const id = typeof x === 'string' ? x : x?.id; if (!id || !hasCard(id)) continue; const a = artOf(getCard(id)); if (a) return a; }
    if (b.boards?.[0]?.src) return b.boards[0].src;
  }
  return 'art/ui/menu-bg.jpg';
}

export function homeHTML({ wallet, notes, unseen, online }) {
  const [lead, ...rest] = notes;
  const islands = [
    ['build', 'Build', 'Create &amp; edit decks', 'navBuild'],
    ['collection', 'Collection', 'Your cards', 'gallery'],
    ['factions', 'Factions', 'Choose your alliance', 'menu'],
    ['realms', 'Realms', online ? 'Events &amp; rewards' : 'News &amp; events', 'navRealms'],
  ];
  return `<div class="rx rx-home">
    <header class="rx-top">
      <h1 class="rx-logo"><img src="art/ui/logo.png" alt="Shattered Realms" draggable="false"><i class="rx-logo-gem"></i></h1>
      ${wallet}
    </header>
    <nav class="rx-side" aria-label="Main menu">${NAV.map(([ico, label, act], i) => `<button class="rx-nav ${i === 0 ? 'on' : ''}" data-act="${act}">${rxIcon(ico)}<span>${label}</span></button>`).join('')}</nav>
    <section class="rx-hub" aria-label="The Shattered Realms">
      <div class="rx-hub-art"><img src="art/ui/home-hub.webp" alt="" draggable="false"></div>
      ${islands.map(([k, t, s, act]) => `<button class="rx-isle rx-isle-${k}" data-act="${act}"><span class="rx-plaque"><b>${t}</b><small>${s}</small></span></button>`).join('')}
      <button class="rx-isle rx-isle-play" data-act="menu"><span class="rx-plaque"><b>Play</b><small>Enter the realms</small></span></button>
    </section>
    <aside class="rx-news">
      <header><h2>${rxIcon('news')}<span>News</span></h2><button class="rx-viewall" data-act="patchNotes">View all ${rxIcon('arrow')}</button></header>
      ${lead ? `<button class="rx-lead" data-act="patchPost:0" style="--thumb:url('${new URL(noteThumb(lead), document.baseURI).href}')">
        <span class="rx-lead-art"></span>
        <span class="rx-lead-text"><em class="rx-badge ${unseen ? 'new' : ''}">${unseen ? 'New' : esc(lead.tag ?? 'Latest')}</em><b>${esc(lead.title)}</b><small>${esc((lead.intro ?? '').split(/(?<=[.!?])\s/)[0])}</small></span>
      </button>` : ''}
      <ul class="rx-news-list">${rest.slice(0, 3).map((n, i) => `<li><button data-act="patchPost:${i + 1}">
        <img src="${noteThumb(n)}" alt="" draggable="false"><span><b>${esc(n.title)}</b><small>${esc(n.tag ?? n.date ?? '')}</small></span>${rxIcon('chevron')}</button></li>`).join('')}</ul>
    </aside>
    <nav class="rx-tabbar">${[['home', 'Home', 'home'], ['collection', 'Cards', 'gallery'], ['play', 'Play', 'menu'], ['store', 'Store', 'shop'], ['settings', 'Settings', 'settings']]
      .map(([ico, label, act]) => `<button data-act="${act}" class="${ico === 'play' ? 'rx-tab-play' : ''} ${ico === 'home' ? 'on' : ''}">${rxIcon(ico)}<span>${label}</span></button>`).join('')}</nav>
  </div>`;
}

// The legend behind the game, from the Home sidebar.
export function originStoryHTML() {
  return `<div class="overlay rx-story-wrap"><div class="guide-backdrop" data-act="closeOrigin"></div>
    <article class="rx-story">
      <button class="ghost guide-close" data-act="closeOrigin" aria-label="Close">✕</button>
      <h2>${rxIcon('story')}<span>Origin Story</span></h2>
      <p class="rx-story-lead">Once there was one world, and it held every realm at once.</p>
      <p>Dragons nested above the cities of the Divine. Sharks hunted the drowned streets below. Vampires, Witches and Lycanthropes kept an uneasy peace in the long night, and in the deepest dark the Void waited, patient and hungry.</p>
      <p>Nobody agrees on what broke it. The Robots blame a calculation. The Divine blame the Demons. The Ghosts only laugh. But one night the sky cracked, and the world fell apart into floating islands, each one a realm adrift in an endless violet storm.</p>
      <p>The pieces still pull at each other. When two realms drift close, their power bleeds together, and champions are born who carry both at once: the Fusion heroes.</p>
      <p>Twenty realms broke apart. More keep surfacing from the storm. Choose two of them, fuse their power, and fight for what is left of the world.</p>
      <button class="rx-gold" data-act="menu">${rxIcon('play')}<span>Enter the realms</span></button>
    </article></div>`;
}
