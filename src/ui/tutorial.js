// Help for new players: the "How to Play" page and first-game tips.
// Tips appear once each (remembered in this browser), one at a time, the first
// time something comes up in a match. They can be switched off in Settings.

import { esc, icon } from './shared.js';
import { getSettings } from './settings.js';

const SEEN_KEY = 'shattered-tips-seen';
const OPENED_KEY = 'shattered-howto-opened';

// ---- How to Play ---------------------------------------------------------------------

const SECTIONS = [
  ['🎯', 'The goal', `Each Hero starts with <b>30 Health</b>. Bring the enemy Hero (at the top) down to <b>0</b> to win.
    You play from the bottom of the screen.`],
  ['💎', 'Mana', `Cards cost <b>Mana</b>: the number in the blue gem on each card.
    You start with 1 Mana Crystal and get <b>one more every turn</b>, up to 10. Your Mana refills at the start of each of your turns.`],
  ['🖐️', 'Your starting hand', `Before the first turn you see your starting cards and can <b>swap any of them once</b>: tap a card to mark it, then press <b>Replace</b>.
    Swap <b>expensive cards</b> (5+ Mana) and keep cheap ones, so you have something to play on your first turns.
    Every starting hand includes at least one cheap minion (2 Mana or less) to put on the board early. Going second, you get an extra card and a potion.`],
  ['🃏', 'Playing cards', `<b>Drag a card</b> from your hand onto the battlefield to play it. Tap or click a card first to read it.
    <ul>
      <li><b>Minions</b> stay on the battlefield and fight. Yellow number = <b>Attack</b>, red number = <b>Health</b>.</li>
      <li><b>Spells</b> do something once, then they're gone.</li>
      <li><b>Traps</b> are set face-down beside your Hero and go off by themselves later (see below).</li>
    </ul>`],
  ['⚔️', 'Attacking', `A minion can attack on your turn <b>after</b> the turn it was played (unless it has <b>Charge</b> or <b>Rush</b>).
    <b>Drag your minion onto an enemy minion or the enemy Hero.</b> Both sides deal their Attack as damage to each other.
    A minion at 0 Health dies.`],
  ['🛡️', 'Taunt: the blocker', `A minion with <b>Taunt</b> has a shield. It <b>blocks</b>: the enemy must attack it before
    they can attack your other minions or your Hero. Use Taunt to protect yourself, and kill enemy Taunt minions first.`],
  ['❓', 'Traps', `A Trap is played face-down and shows as a purple <b>?</b> token beside its Hero. Your opponent can't see which one it is.
    It springs <b>automatically</b> when its condition happens (for example "when an enemy minion attacks"), and is revealed.
    Tap your own trap tokens to see which Traps you set.`],
  ['⚡', 'Quick Play', `Cards with ⚡ can be played <b>during your opponent's turn</b>, right after they do something.
    When you can, a <b>Quick Play?</b> box appears for a few seconds: pick the card, or press <b>Pass</b>.`],
  ['🔮', 'Hero Spells and Fusions', `The round buttons beside your Hero are your <b>Hero Spells</b>. They're always there, and each can be used <b>once per turn</b> if you have the Mana.
    Using Hero Spells charges your <b>Fusion</b>, a powerful spell unique to your two factions. It glows when it's ready.`],
  ['🏳️', 'Factions', `You pick <b>two factions</b>, and your deck is made from both. Each faction has its own mechanic
    (Burn, Extinction, Corpses, Radiation...). The main menu has a guide for each one, and a star rating for how well a pair works together.`],
  ['⏳', 'Ending your turn', `Press <b>End Turn</b> when you're done. It turns <b>green</b> when you have nothing left to do.
    Each turn has a time limit; a burning rope appears when time is almost up.`],
];

const KEY_WORDS = ['Taunt', 'Charge', 'Rush', 'Lifesteal', 'Evade', 'Stealth', 'Poisonous', 'Reborn', 'Arrival', 'Exit', 'Discover', 'Frozen', 'Elusive', 'Twin Strike'];

// A small book: chapters down the side, one chapter open at a time (fits the screen, no scrolling).
export const HOWTO_PAGES = SECTIONS.length + 1;
export function howToPlayHTML(keywordText, page = 0) {
  const chapters = [...SECTIONS.map(([icon, title]) => [icon, title]), ['📜', 'Common keywords']];
  const p = Math.max(0, Math.min(chapters.length - 1, page));
  const body = p < SECTIONS.length
    ? `<h3><span>${SECTIONS[p][0]}</span> ${SECTIONS[p][1]}</h3><div class="howto-text">${SECTIONS[p][2]}</div>`
    : `<h3><span>📜</span> Common keywords</h3>
        <dl>${KEY_WORDS.filter((k) => keywordText[k]).map((k) => `<dt>${esc(k)}</dt><dd>${esc(keywordText[k])}</dd>`).join('')}</dl>
        <p class="sub">Any card's keywords are explained when you tap or hover over it.</p>`;
  return `
    <div class="menu tavern howto howto-book">
      <div class="howto-top"><h1>How to Play</h1><p class="sub howto-lead">Everything you need for your first match, in a few minutes.</p></div>
      <div class="howto-body">
        <nav class="howto-chapters" style="--n:${chapters.length}">${chapters.map(([ic, t], i) => `<button class="howto-ch ${i === p ? 'on' : ''}" data-howto="${i}"><span>${ic}</span>${t}</button>`).join('')}</nav>
        <section class="howto-card howto-page ${p === SECTIONS.length ? 'howto-keywords' : ''}">${body}</section>
      </div>
      <div class="menu-buttons howto-foot">
        <button data-act="howtoPrev" class="ghost" ${p === 0 ? 'disabled' : ''}>‹ Back</button>
        <span class="sub">${p + 1} / ${chapters.length}</span>
        ${p < chapters.length - 1 ? '<button data-act="howtoNext">Next ›</button>' : '<button data-act="ai">Play a match vs AI</button>'}
        <button data-act="tutorial" class="ghost">🎓 Play the tutorial</button>
        <button data-act="menu" class="ghost">Main menu</button>
      </div>
    </div>`;
}

export const howToOpened = () => { try { return localStorage.getItem(OPENED_KEY) === '1'; } catch { return true; } };
export const markHowToOpened = () => { try { localStorage.setItem(OPENED_KEY, '1'); } catch { /* storage unavailable */ } };

// ---- Tips ---------------------------------------------------------------------------------

export const TIPS = {
  welcome: ['Welcome!', 'Bring the enemy Hero (top) from 30 Health to 0. You play from the bottom. Tap a card to read it, and drag it onto the battlefield to play it.'],
  mana: ['Mana', 'Each card costs Mana (blue gem). You get one more Mana Crystal every turn, up to 10.'],
  attack: ['Ready to attack', 'Your glowing minion can attack. Drag it onto an enemy minion or the enemy Hero.'],
  taunt: ['Taunt = blocker', 'A minion with a Taunt shield blocks: enemies must attack it before your other minions or your Hero.'],
  enemyTrap: ['Enemy Trap', 'Your opponent set a hidden Trap: the purple ? beside their Hero. It goes off by itself when its condition happens.'],
  myTrap: ['Your Trap', "Your Trap is set face-down beside your Hero (the purple ?). It goes off by itself. Tap it to see which one it is."],
  heroSpell: ['Hero Spell', 'The round button beside your Hero is a Hero Spell: always there, usable once per turn. Using it charges your Fusion.'],
  quickPlay: ['Quick Play', 'You can answer right now, during your opponent\'s turn! Pick the card, or press Pass.'],
  nothingFits: ['Nothing fits yet', "None of your cards costs little enough to play yet. That's normal early on: press End Turn. You get one more Mana every turn, so bigger cards open up soon."],
  endTurn: ['Out of moves', 'Nothing left to do this turn. Press End Turn (it glows green).'],
};

const seen = () => { try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]')); } catch { return new Set(); } };
const markSeen = (id) => { try { const s = seen(); s.add(id); localStorage.setItem(SEEN_KEY, JSON.stringify([...s])); } catch { /* storage unavailable */ } };
export const resetTips = () => { try { localStorage.removeItem(SEEN_KEY); } catch { /* storage unavailable */ } };

let current = null;
const queue = [];

export const tipsOn = () => getSettings().tips !== false;

// Show a tip once ever. Returns true if it was shown or queued.
export function tip(id) {
  if (!tipsOn() || !TIPS[id] || seen().has(id) || current?.id === id || queue.includes(id)) return false;
  if (current) { queue.push(id); return true; }
  showTip(id);
  return true;
}

function showTip(id) {
  const [title, text] = TIPS[id];
  const el = document.createElement('div');
  el.className = 'coach-tip';
  el.innerHTML = `<b>${icon('bulb')} ${esc(title)}</b><p>${esc(text)}</p><div class="coach-btns"><button class="coach-ok">Got it</button><button class="coach-off ghost">Turn off tips</button></div>`;
  document.body.appendChild(el);
  current = { id, el };
  const close = (off) => {
    markSeen(id);
    el.remove();
    current = null;
    if (off) { queue.length = 0; window.dispatchEvent(new CustomEvent('tips-off')); return; }
    // Hold the slot during the short pause before the next tip, so a re-render
    // in between can't show the same tip a second time.
    const next = queue.shift();
    if (!next) return;
    current = { id: next, el: null };
    setTimeout(() => {
      if (current?.id !== next || current.el) return;
      current = null;
      if (!seen().has(next) && tipsOn()) showTip(next);
    }, 250);
  };
  el.querySelector('.coach-ok').addEventListener('click', () => close(false));
  el.querySelector('.coach-off').addEventListener('click', () => close(true));
}

export function clearTips() {
  queue.length = 0;
  current?.el?.remove();
  current = null;
}
