// The guided tutorial: a real match against a scripted opponent, taught one step at a time.
// Each step flies in a big bold title, points at what to use with giant arrows, and (for
// "do" steps) allows only the move it teaches. Info steps dim the table around their target
// and wait for "Next". After the scripted turns the player finishes the match on their own.
//
// main.js calls: startGuide(), guideOn(), guideAllows(action), guideActed(action),
// guideEnemyAction(state) and updateGuide({ state, me, app, busy }) after every render.

import { esc } from './shared.js';

const DONE_KEY = 'shattered-tutorial-done';
export const tutorialDone = () => { try { return localStorage.getItem(DONE_KEY) === '1'; } catch { return true; } };
export const markTutorialDone = () => { try { localStorage.setItem(DONE_KEY, '1'); } catch { /* storage unavailable */ } };

// The tutorial match: you play Vampires, the rival plays Robots.
export const TUTORIAL = {
  you: 'Vampires',
  rival: 'Robots',
  rivalHealth: 12,
  hand: ['vampire_thrall', 'bloodhound', 'blood_drain'],
  draws: ['vampire_gargoyle', 'vampire_bat', 'vampire_bloodlord'],
  rivalHand: ['bulwark_unit', 'scrapper_spider', 'heavy_gunner'],
  // What the rival plays on each of its turns (by turn number); then it plays freely.
  rivalPlays: { 1: [], 2: ['bulwark_unit'], 3: ['scrapper_spider'] },
};

// ---- Finding things on the table ----------------------------------------------------
const q = (app, sel) => app.querySelector(sel);
const mine = (c, id) => c.state.players[c.me].board.find((m) => m.cardId === id);
const theirs = (c, id) => c.state.players[1 - c.me].board.find((m) => m.cardId === id);
const handCard = (c, id) => c.state.players[c.me].hand.find((h) => h.cardId === id);
const el = {
  myHero: (c) => q(c.app, '.hero-zone.me .hero-portrait'),
  foeHero: (c) => q(c.app, '.hero-zone.opp .hero-portrait'),
  hand: (c) => q(c.app, '.my-hand'),
  mana: (c) => q(c.app, '.mana-bar.me'),
  board: (c) => q(c.app, '.board.me'),
  endTurn: (c) => q(c.app, '.end-turn'),
  card: (id) => (c) => { const h = handCard(c, id); return h ? q(c.app, `.my-hand [data-hand="${h.uid}"]`) : null; },
  myMinion: (id) => (c) => { const m = mine(c, id); return m ? q(c.app, `[data-char="${m.uid}"]`) : null; },
  foeMinion: (id) => (c) => { const m = theirs(c, id); return m ? q(c.app, `[data-char="${m.uid}"]`) : null; },
  heroSpell: (id) => (c) => q(c.app, `.hero-zone.me [data-hs="${id}"]`),
};
const myTurn = (n) => (c) => c.state.activePlayer === c.me && !c.state.pending && c.state.players[c.me].turnsTaken === n;
const played = (id) => (a, c) => a.type === 'play' && c.state.players[c.me].hand.find((h) => h.uid === a.card)?.cardId === id;
const attacks = (id, target) => (a, c) => a.type === 'attack' && mine(c, id)?.uid === a.attacker
  && (target === 'hero' ? a.defender === c.state.players[1 - c.me].hero.uid : theirs(c, target)?.uid === a.defender);
const endTurn = (a) => a.type === 'endTurn';

// ---- The script ---------------------------------------------------------------------
// title / text: what the player reads. at: one thing to point at. from + to: an arrow (drag
// this onto that). next: an info step ("Next" to go on). allow: the one move this step teaches.
const STEPS = [
  { wait: myTurn(1), title: 'Welcome to Shattered Realms!', text: 'This tutorial plays a real match with you, one step at a time. Just follow the big arrows.', next: true },
  { wait: myTurn(1), title: 'This is you', text: 'Your Hero, at the bottom. The red number is your Health: 30. If it reaches 0, you lose.', at: el.myHero, next: true },
  { wait: myTurn(1), title: 'This is your enemy', text: "Bring the enemy Hero's Health down to 0 and you win. (Today they start on 12.)", at: el.foeHero, next: true },
  { wait: myTurn(1), title: 'Your hand', text: 'These are your cards. Tap or hover over any card to read what it does.', at: el.hand, next: true },
  { wait: myTurn(1), title: 'This is Mana', text: 'Playing a card costs Mana: the number in the blue gem on its corner. You have 1 Mana now and get 1 more every turn, up to 10.', at: el.mana, next: true },
  { wait: myTurn(1), title: 'Play a minion', text: 'Drag Vampire Thrall onto the battlefield. It costs 1 Mana: exactly what you have.', from: el.card('vampire_thrall'), to: el.board, allow: played('vampire_thrall') },
  { wait: myTurn(1), title: 'Minions need a turn to wake up', text: 'Your Thrall will fight for you from now on, but a minion can\'t attack on the turn it is played (see the Zzz).', at: el.myMinion('vampire_thrall'), next: true },
  { wait: myTurn(1), title: 'End your turn', text: "You're out of Mana, so you're done for now. Press END TURN.", at: el.endTurn, allow: endTurn },

  { wait: myTurn(2), title: 'Turn 2: your turn again!', text: 'Your Mana went up to 2 and you drew a card. The enemy has no minions, so nothing protects their Hero.', next: true },
  { wait: myTurn(2), title: 'Attack!', text: 'Your Thrall is awake (it glows green). Drag it onto the enemy Hero.', from: el.myMinion('vampire_thrall'), to: el.foeHero, allow: attacks('vampire_thrall', 'hero') },
  { wait: myTurn(2), title: 'Direct hit!', text: 'A minion deals damage equal to its Attack: the yellow number. Thrall also has Lifesteal, so the damage it deals heals your Hero.', at: el.foeHero, next: true },
  { wait: myTurn(2), title: 'Play another minion', text: 'Drag Bloodhound (2 Mana) onto the battlefield.', from: el.card('bloodhound'), to: el.board, allow: played('bloodhound') },
  { wait: myTurn(2), title: 'End your turn', text: 'Press END TURN and watch what the enemy does.', at: el.endTurn, allow: endTurn },

  { wait: myTurn(3), title: 'The enemy built a wall', text: 'On their turn they played Bulwark Unit. See its shield? That is TAUNT: you must defeat a Taunt minion before you can attack anything else.', at: el.foeMinion('bulwark_unit'), next: true },
  { wait: myTurn(3), title: 'Break the wall', text: 'Drag Bloodhound onto Bulwark Unit. Both minions deal their Attack to each other.', from: el.myMinion('bloodhound'), to: el.foeMinion('bulwark_unit'), allow: attacks('bloodhound', 'bulwark_unit') },
  { wait: myTurn(3), title: 'Finish it with a spell', text: "Spells do something once, then they're gone. Drag Blood Drain onto Bulwark Unit: 2 damage finishes it off.",
    from: el.card('blood_drain'), to: el.foeMinion('bulwark_unit'), allow: (a, c) => played('blood_drain')(a, c) && a.target === theirs(c, 'bulwark_unit')?.uid },
  { wait: myTurn(3), title: 'Your Hero Spell', text: 'The round button by your Hero is a Hero Spell. It never runs out: use it once every turn. Click Blood Frenzy, then click your Vampire Thrall to give it +2 Attack.',
    from: el.heroSpell('blood_frenzy'), to: el.myMinion('vampire_thrall'), allow: (a, c) => a.type === 'heroSpell' && a.card === 'blood_frenzy' && a.target === mine(c, 'vampire_thrall')?.uid },
  { wait: myTurn(3), title: 'The path is clear', text: 'No Taunt is in the way now. Drag your Thrall onto the enemy Hero!', from: el.myMinion('vampire_thrall'), to: el.foeHero, allow: attacks('vampire_thrall', 'hero') },
  { wait: myTurn(3), title: 'End your turn', text: 'All your Mana is spent. Press END TURN.', at: el.endTurn, allow: endTurn },

  { wait: myTurn(4), title: "You've got it!", text: 'The enemy played Scrapper Spider. You have 4 Mana now: play your best cards, attack, and finish off the enemy Hero. Anything that glows green can be played or can attack. Good luck!', next: true, last: true },
];

// ---- State ---------------------------------------------------------------------------
let step = -1;          // index into STEPS while the tutorial is guiding, -1 when not
let shown = null;       // the step whose title already flew in
let onChange = null;    // main.js re-render
let layer = null;

export function startGuide(rerender) { step = 0; shown = null; onChange = rerender; }
export function stopGuide() { step = -1; shown = null; clearLayer(); }
export const guideOn = () => step >= 0 && step < STEPS.length;

// Only the move the current step teaches (and passing on a Quick Play) is allowed.
export function guideAllows(action, ctx) {
  if (!guideOn()) return true;
  if (action.type === 'pass' || action.type === 'choose') return true;
  const s = STEPS[step];
  return !!s.allow && s.allow(action, ctx);
}
export function guideActed(action, ctx) {
  if (guideOn() && STEPS[step].allow?.(action, ctx)) { step += 1; shown = null; }
}

// The rival's scripted turns: play the listed cards, then end the turn.
export function guideEnemyAction(state, rival) {
  const pl = state.players[rival];
  const plan = TUTORIAL.rivalPlays[pl.turnsTaken];
  if (!plan) return null; // free play: the normal AI takes over
  if (state.pending?.type === 'reaction') return { type: 'pass', player: rival };
  for (const id of plan) {
    const inst = pl.hand.find((h) => h.cardId === id);
    if (inst && pl.mana.current >= 1) return { type: 'play', player: rival, card: inst.uid };
  }
  return { type: 'endTurn', player: rival };
}

function next() {
  const last = STEPS[step]?.last;
  step += 1; shown = null;
  if (last) { step = STEPS.length; clearLayer(); }
  onChange?.();
}

// ---- Drawing ---------------------------------------------------------------------------
function clearLayer() { layer?.remove(); layer = null; }

const centerOf = (r) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });

export function updateGuide(ctx) {
  if (!guideOn() || !ctx.state || ctx.state.gameOver) { clearLayer(); return; }
  const s = STEPS[step];
  if (ctx.busy || (s.wait && !s.wait(ctx))) { if (layer) layer.style.visibility = 'hidden'; return; }
  if (!layer) {
    layer = document.createElement('div');
    layer.id = 'guide-layer';
    document.body.appendChild(layer);
  }
  layer.style.visibility = '';
  const W = innerWidth, H = innerHeight;
  const one = s.at?.(ctx);
  const from = s.from?.(ctx);
  const to = s.to?.(ctx);
  const rects = [one, from, to].filter(Boolean).map((e) => e.getBoundingClientRect());
  const fresh = shown !== step;
  shown = step;

  // Everything the words must not cover: the targets and the arrow between them.
  const avoid = rects.map((r) => ({ l: r.left - 24, t: r.top - 24, r: r.right + 24, b: r.bottom + 24 }));

  let svg = '';
  // An info step dims everything but its target.
  const hole = s.next && one ? one.getBoundingClientRect() : null;
  const spot = hole ? `<div class="guide-spot" style="left:${hole.left - 10}px;top:${hole.top - 10}px;width:${hole.width + 20}px;height:${hole.height + 20}px"></div>`
    : s.next ? '<div class="guide-dim"></div>' : '';
  const rings = rects.map((r) => `<div class="guide-ring" style="left:${r.left - 8}px;top:${r.top - 8}px;width:${r.width + 16}px;height:${r.height + 16}px"></div>`).join('');
  if (from && to) {
    // A big curved arrow: drag this onto that.
    const a = centerOf(from.getBoundingClientRect()), b = centerOf(to.getBoundingClientRect());
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const bend = Math.min(160, len * 0.35);
    const cx = (a.x + b.x) / 2 + (-dy / len) * bend, cy = (a.y + b.y) / 2 + (dx / len) * bend;
    // Stop short of the target's centre so the head sits on its edge.
    const tr = to.getBoundingClientRect();
    const stop = Math.min(tr.width, tr.height) * 0.32;
    const ex = b.x - (b.x - cx) / Math.hypot(b.x - cx, b.y - cy) * stop, ey = b.y - (b.y - cy) / Math.hypot(b.x - cx, b.y - cy) * stop;
    const d = `M${a.x.toFixed(0)},${a.y.toFixed(0)} Q${cx.toFixed(0)},${cy.toFixed(0)} ${ex.toFixed(0)},${ey.toFixed(0)}`;
    for (let t = 0; t <= 1; t += 0.1) {
      const x = (1 - t) ** 2 * a.x + 2 * (1 - t) * t * cx + t * t * ex, y = (1 - t) ** 2 * a.y + 2 * (1 - t) * t * cy + t * t * ey;
      avoid.push({ l: x - 26, t: y - 26, r: x + 26, b: y + 26 });
    }
    svg = `<svg class="guide-svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
      <defs><marker id="guide-head" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="3.2" markerHeight="3.2" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 Z" fill="#ffd25a" stroke="#3a1a00" stroke-width="1"/></marker></defs>
      <path class="guide-arrow-shadow" d="${d}"/>
      <path class="guide-arrow" d="${d}" marker-end="url(#guide-head)"/>
      <path class="guide-arrow-dash" d="${d}"/>
    </svg>`;
  }
  // One target: a giant bouncing arrow pointing at it (from above, or below near the top).
  let pointer = '';
  if (one && !from) {
    const r = one.getBoundingClientRect();
    const below = r.top < 140;
    const x = r.left + r.width / 2;
    const y = below ? r.bottom + 14 : r.top - 14;
    avoid.push({ l: x - 40, t: below ? y : y - 90, r: x + 40, b: below ? y + 90 : y });
    pointer = `<div class="guide-pointer ${below ? 'up' : ''}" style="left:${x}px;top:${y}px"><svg viewBox="0 0 60 80" width="60" height="80"><path d="M18,0 H42 V44 H60 L30,80 L0,44 H18 Z" fill="#ffd25a" stroke="#3a1a00" stroke-width="4" stroke-linejoin="round"/></svg></div>`;
  }
  const panel = `<div class="guide-panel ${fresh ? 'fly' : ''}">
      <div class="guide-step">Step ${step + 1} of ${STEPS.length}</div>
      <h2>${esc(s.title)}</h2><p>${esc(s.text)}</p>
      ${s.next ? `<button class="guide-next">${s.last ? "Let's go!" : 'Next ›'}</button>` : '<div class="guide-do">Your move: follow the arrow</div>'}
    </div>`;
  layer.className = s.next ? 'info' : 'do';
  layer.innerHTML = `${s.next ? '<div class="guide-catch"></div>' : ''}${spot}${rings}${svg}${pointer}${panel}`;
  layer.querySelector('.guide-next')?.addEventListener('click', next);
  placePanel(layer.querySelector('.guide-panel'), avoid, W, H);
}

// Put the words where they cover the least of what matters: a full-width band first
// (nearest the upper-middle of the screen), else a narrower column down one side.
function placePanel(pn, avoid, W, H) {
  const cover = (l, t, w, h) => avoid.reduce((sum, a) => sum + Math.max(0, Math.min(l + w, a.r) - Math.max(l, a.l)) * Math.max(0, Math.min(t + h, a.b) - Math.max(t, a.t)), 0);
  const scan = (w, h, xs) => {
    let best = null;
    for (const cx of xs) {
      for (let t = 8; t <= H - h - 8; t += 8) {
        const score = cover(cx - w / 2, t, w, h) * 10 + Math.abs(t + h / 2 - H * 0.38);
        if (!best || score < best.score) best = { score, cx, t };
      }
    }
    return best;
  };
  pn.style.width = '';
  let w = pn.offsetWidth, h = pn.offsetHeight;
  let best = scan(w, h, [W / 2]);
  if (best.score >= 10 * 400 && W >= 800) {
    // A side column: narrower, so it fits beside the battlefield.
    pn.style.width = `${Math.min(380, W * 0.3)}px`;
    w = pn.offsetWidth; h = pn.offsetHeight;
    const side = scan(w, h, [w / 2 + 12, W - w / 2 - 12]);
    if (side.score < best.score) best = side; else { pn.style.width = ''; }
  }
  pn.style.left = `${best.cx}px`;
  pn.style.top = `${best.t}px`;
}

// The step the player is on, for "follow the arrow" nudges.
export const guideHint = () => (guideOn() ? STEPS[step].title : '');
