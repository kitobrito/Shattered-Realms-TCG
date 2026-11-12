// Daily missions on the main menu: the glowing Daily Missions button, the panel listing the day's
// missions (each with a Play button), and the set-up step that picks the realms and deck a mission
// asks for before queueing the right kind of match. Also the player box (name, rank, points).
// main.js keeps the state (`missions`) and handles the buttons (data-act="dm…").
//
// missions: { open, step: 'list' | 'setup', mission, deck: index into the deck options } | null

import { esc, icon, rankBadgeHTML } from './shared.js';
import { factionColor } from './fx.js';

// A mission's text with its key words picked out: the numbers, the realms (in their own colour), and
// what kind of game or deck it asks for. The highlights glow and pulse (style.css .dm-hl).
const MISSION_WORDS = ['Quick Match', 'Ranked', 'fusion', 'two-realm deck', 'single-realm deck', 'public games', 'in your deck'];
export function missionTextHTML(m) {
  const realms = [...(Array.isArray(m.factions) ? m.factions : []), ...(m.faction ? [m.faction] : [])];
  const tokens = [
    ...realms.map((f) => ({ word: f, html: `<span class="dm-hl dm-realm" style="--fc:${factionColor(f)}">${esc(f)}</span>` })),
    ...MISSION_WORDS.map((w) => ({ word: w, html: `<span class="dm-hl dm-kind">${esc(w)}</span>` })),
  ].sort((a, b) => b.word.length - a.word.length);
  const text = String(m.text || '');
  let out = '', i = 0;
  while (i < text.length) {
    const t = tokens.find((x) => text.startsWith(x.word, i));
    if (t) { out += t.html; i += t.word.length; continue; }
    const num = /^\d+/.exec(text.slice(i));
    if (num && (i === 0 || /\W/.test(text[i - 1]))) { out += `<span class="dm-hl dm-num">${num[0]}</span>`; i += num[0].length; continue; }
    out += esc(text[i]); i += 1;
  }
  return out;
}

// What a mission needs: the format (one realm or two), which realms, and Quick Match or Ranked.
// `current` = { format, picked }, `open` = realms the player can play, `pairOk` = two-realm decks unlocked.
export function missionPlan(m, current, open, pairOk) {
  const realmOpen = (f) => open.includes(f);
  const firstOpen = (except = []) => open.find((f) => !except.includes(f));
  const mode = m.kind === 'ranked' ? 'ranked' : 'quick';
  let format = current.format;
  let factions = current.picked.slice();
  let note = '';
  if (m.kind === 'fusion' && Array.isArray(m.factions) && m.factions.length === 2) {
    format = 'pair';
    factions = m.factions.slice();
    note = `Plays the ${m.factions[0]} + ${m.factions[1]} fusion.`;
  } else if (m.kind === 'faction' && m.faction) {
    format = 'single';
    factions = [m.faction];
    note = `Plays a ${m.faction} deck.`;
  } else if (m.kind === 'single') {
    format = 'single';
    factions = [realmOpen(current.picked[0]) ? current.picked[0] : firstOpen()];
    note = 'Plays a one-realm deck. Change your realm on the menu first if you like.';
  } else if (m.kind === 'pair') {
    format = 'pair';
    if (current.format !== 'pair' || current.picked.length !== 2) {
      const a = realmOpen(current.picked[0]) ? current.picked[0] : firstOpen();
      factions = [a, firstOpen([a])];
    }
    note = 'Plays a two-realm deck. Change your realms on the menu first if you like.';
  } else {
    note = mode === 'ranked' ? 'Plays a Ranked match with the realms you have picked.' : 'Plays a Quick Match with the realms you have picked.';
  }
  factions = factions.filter(Boolean);
  const need = format === 'single' ? 1 : 2;
  const locked = factions.filter((f) => !realmOpen(f));
  const problem = (format === 'pair' && !pairOk) ? 'Two-realm decks unlock as you play: finish your first steps on the menu first.'
    : locked.length ? `${locked.join(' and ')} ${locked.length === 1 ? "isn't" : "aren't"} open to you yet.`
      : factions.length !== need ? `Pick ${need === 1 ? 'a realm' : 'two realms'} on the menu first.` : null;
  return { format, factions, mode, note, problem };
}

// The player box: name, rank and points (a guest gets a sign-in prompt).
export function playerBoxHTML(user, points) {
  if (!user) {
    return `<button class="m2-player guest" data-act="online" title="Sign in to earn points and track your rank">
      <span class="m2-player-ico">${icon('players')}</span><span><b>Guest</b><small>Sign in to earn points</small></span></button>`;
  }
  return `<div class="m2-player" title="Your account">
    <span class="m2-player-ico">${icon('players')}</span>
    <span class="m2-player-main"><b>${esc(user.name)}</b>${user.tier ? rankBadgeHTML(user) : ''}</span>
    <span class="m2-player-pts"><img src="art/ui/shop/coin.webp" alt="" draggable="false"><b>${points ?? 0}</b><small>points</small></span>
  </div>`;
}

// The glowing button on the menu.
export function missionsButtonHTML(dailies) {
  const list = Array.isArray(dailies) ? dailies : [];
  const done = list.filter((m) => m.done).length;
  const left = list.length - done;
  return `<button class="m2-dailies ${list.length && !left ? 'all-done' : ''}" data-act="dmOpen" title="Daily missions: win public games to earn points">
    <span class="m2-dailies-ico">✦</span>
    <span class="m2-dailies-text"><b>Daily missions</b><small>${list.length ? (left ? `${done}/${list.length} done · ${list.reduce((n, m) => n + (m.done ? 0 : m.points), 0)} pts to earn` : 'All done! New ones tomorrow') : 'Earn points every day'}</small></span>
    ${left ? `<i class="m2-dailies-badge">${left}</i>` : ''}
  </button>`;
}

// The centred body of a mission card: the big highlighted text, the progress bar, progress and reward.
export function missionCardHTML(m) {
  return `<p class="dm-mtext">${missionTextHTML(m)}</p>
    <div class="dm-bar"><i style="width:${Math.min(100, (m.progress / m.need) * 100)}%"></i></div>
    <div class="dm-meta"><span>${m.progress} / ${m.need}</span><span class="dm-reward">+<img src="art/ui/shop/coin.webp" alt="" draggable="false">${m.points}</span></div>`;
}

const hhmm = (ms) => { const m = Math.max(0, Math.round(ms / 60000)); return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`; };

// The panel: the day's missions with a Play button each, or the set-up step for one of them.
// ctx: { signedIn, economy, plan (for the set-up step), deckOptions: [{ label, blurb, problem }] }
export function missionsPanelHTML(state, ctx) {
  const close = '<button class="ghost dm-close" data-act="dmClose" aria-label="Close">✕</button>';
  let body;
  if (!ctx.signedIn) {
    body = `<h2>Daily missions</h2><p class="dm-sub">Sign in to get 5 daily missions. Each one you complete pays points for card packs.</p>
      <div class="dm-foot"><button class="gold" data-act="online">Sign in</button></div>`;
  } else if (!ctx.economy) {
    body = '<h2>Daily missions</h2><p class="dm-sub">Loading your missions…</p>';
  } else if (state.step === 'setup' && state.mission) {
    const m = state.mission, plan = ctx.plan;
    body = `<button class="ghost dm-back" data-act="dmBack">${icon('back')}<span>Missions</span></button>
      <h2>${esc(m.text)}</h2>
      <p class="dm-sub">${esc(plan.note)} You'll be queued for <b>${plan.mode === 'ranked' ? 'Ranked' : 'Quick Match'}</b> with <b>${plan.factions.map(esc).join(' + ') || 'no realm'}</b>.</p>
      ${plan.problem ? `<p class="dm-warn">${esc(plan.problem)}</p>` : `
      <h3>Which deck?</h3>
      <div class="dm-decks">${ctx.deckOptions.map((d, i) => `<button class="dm-deck ${state.deck === i ? 'on' : ''}" data-act="dmDeck:${i}" ${d.problem ? 'disabled' : ''}>
        <b>${esc(d.label)}</b><small>${esc(d.problem || d.blurb)}</small></button>`).join('')}</div>`}
      <div class="dm-foot">
        <button class="ghost" data-act="dmEdit" ${plan.problem ? 'disabled' : ''}>Edit deck first</button>
        <button class="gold" data-act="dmStart" ${plan.problem ? 'disabled' : ''}>${icon('swords')}<span>Play ${plan.mode === 'ranked' ? 'Ranked' : 'Quick Match'}</span></button>
      </div>`;
  } else {
    const e = ctx.economy;
    body = `<div class="dm-row"><h2>Daily missions</h2><span class="dm-sub">New missions in ${hhmm(e.resetsIn)}</span></div>
      <p class="dm-sub">Play Quick Match or Ranked games to complete them, win or lose. Each pays <b>${e.rules.dailyPoints} points</b>.</p>
      <ul class="dm-list">${e.dailies.map((m, i) => `<li class="dm-mission ${m.done ? 'done' : ''}" style="--i:${i}">
        ${missionCardHTML(m)}
        ${m.done ? '<em class="dm-done">✔ Done</em>' : `<button class="gold dm-play" data-act="dmPlay:${i}">${icon('play')}<span>Play</span></button>`}
      </li>`).join('')}</ul>`;
  }
  return `<div class="overlay dm-overlay"><div class="guide-backdrop" data-act="dmClose"></div><div class="dm-panel">${close}${body}</div></div>`;
}
