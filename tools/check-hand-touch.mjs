// Finger-level checks of the battle hand on simulated phones (real touch events), plus the hero spells beside your Hero.
//   python3 -m http.server 8766   (in the repo), then:  node tools/check-hand-touch.mjs [portrait|landscape] [Realm]
// Taps only read; holds only read; sliding along the hand reads the card under the finger without flicker;
// only a drag onto the board plays (or says why it can't); the corner hand only rises when tapped.
import { chromium, devices } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const O = process.env.OUT ?? 'check-hand-shots/';
import { mkdirSync } from 'node:fs'; mkdirSync(O, { recursive: true });
const mode = process.argv[2] ?? 'portrait';
const faction = process.argv[3] ?? 'Monster Hunter';
const b = await chromium.launch();
const ctx = await b.newContext({ ...devices[mode === 'portrait' ? 'iPhone 13' : 'iPhone 13 landscape'] });
const p = await ctx.newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
const cdp = await ctx.newCDPSession(p);
let fails = 0; const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'} [${mode}] ${m}`); if (!c) fails++; };
const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
const wait = (ms) => p.waitForTimeout(ms);
async function tap(x, y) { await touch('touchStart', x, y); await wait(60); await touch('touchEnd'); await wait(450); }
async function slide(path, stepMs = 30) { for (const [x, y] of path) { await touch('touchMove', x, y); await wait(stepMs); } }
const line = (x0, y0, x1, y1, n) => Array.from({ length: n }, (_, i) => [x0 + (x1 - x0) * (i + 1) / n, y0 + (y1 - y0) * (i + 1) / n]);

await p.addInitScript(([f]) => { sessionStorage.setItem('shattered-offline', '1'); localStorage.setItem('shattered-journey', JSON.stringify({ games: 9, done: true, seen: [] })); localStorage.setItem('faction-ccg-settings', JSON.stringify({ tips: false, volume: 0, music: 0 })); localStorage.setItem('faction-ccg-format', 'single'); }, [faction]);
await p.goto(`http://localhost:${process.env.PORT ?? 8766}/index.html`); await p.waitForFunction(() => !document.getElementById('boot')); await wait(800);
await p.evaluate((f) => { const e = document.querySelector(`[data-faction="${f}"]`); if (e && !e.classList.contains('on')) e.click(); }, faction);
await p.evaluate(() => document.querySelector('[data-act="ai"]')?.click()); await wait(400);
await p.evaluate(() => document.querySelector('[data-act="setupStart"]')?.click());
await p.waitForFunction(() => window.__shattered().screen === 'game' && !document.querySelector('.game-loader'), null, { timeout: 30000 });
for (let i = 0; i < 160; i++) { const d = await p.evaluate(() => { const g = window.__shattered(); const s = g.game.state; const pd = s.pending; if (pd?.player === g.viewer && !g.animating) { if (pd.type === 'mulligan') g.act({ type: 'mulligan', player: g.viewer, replace: [] }); else if (pd.type === 'choice') g.act({ type: 'choose', player: g.viewer, index: 0 }); } return !pd && s.activePlayer === g.viewer && !g.animating; }); if (d) break; await wait(250); }
await wait(1200);
// A known hand: n cards, the first costs 1, the rest are expensive; 1 Mana available.
const setHand = (n) => p.evaluate(async (n) => { const core = await import('./src/engine/core.js'); const g = window.__shattered(); const s = g.game.state; const me = s.players[g.viewer];
  me.hand.length = 0; const f = me.factions[0]; const reg = await import('./src/engine/registry.js');
  const pool = reg.allCards().filter((c) => c.faction === f && c.type === 'minion' && !c.token && !c.extra);
  const cheap = pool.find((c) => c.cost === 1) ?? pool[0]; const dear = pool.filter((c) => c.cost >= 4);
  core.addToHand(s, g.viewer, cheap.id); for (let i = 1; i < n; i++) core.addToHand(s, g.viewer, dear[i % dear.length].id);
  me.mana.current = 1; me.mana.max = 1; g.render(); return me.hand.map((c) => c.uid); }, n);
const state = () => p.evaluate(() => ({
  docked: !!document.querySelector('.my-hand.docked'),
  inspect: [...document.querySelectorAll('.my-hand .inspect')].map((e) => Number(e.dataset.hand)),
  reading: [...document.querySelectorAll('.my-hand .reading')].map((e) => Number(e.dataset.hand)),
  preview: document.getElementById('preview')?.classList.contains('show') ? document.querySelector('#preview .bc-banner span')?.textContent : null,
  flash: [...document.querySelectorAll('.flash, #flash, .toast')].map((e) => e.textContent).join('|') + (document.body.innerText.includes('Not enough Mana') ? ' [Not enough Mana]' : ''),
  touchUi: document.body.classList.contains('touch-ui'),
  hand: window.__shattered().game.state.players[window.__shattered().viewer].hand.length,
}));
const centerOf = (uid) => p.evaluate((u) => { const r = document.querySelector(`[data-hand="${u}"]`).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height * 0.35, r: { l: r.left, t: r.top, w: r.width, h: r.height } }; }, uid);
const nameOf = (uid) => p.evaluate((u) => { const g = window.__shattered(); const c = g.game.state.players[g.viewer].hand.find((x) => x.uid === u); return c && window.__cardName?.(c.cardId); }, uid);

// --- 1. Landscape: the hand rests in the corner. A tap only raises it.
let uids = await setHand(5); await wait(600);
if (mode === 'landscape') {
  let st = await state();
  ok(st.docked, 'hand starts in the corner');
  const c = await centerOf(uids[2]); await tap(c.x, c.y); await wait(500);
  st = await state();
  ok(!st.docked, 'a tap on the corner hand raises it');
  ok(!st.inspect.length && !st.reading.length && !st.preview, `no card is picked or shown by that tap (inspect ${st.inspect} reading ${st.reading} preview ${st.preview})`);
  ok(st.touchUi, 'touch mode is on (hover lift switched off)');
  // The card now under the finger must not be lifted by a sticky hover: all cards share the same vertical offset pattern.
  const lifted = await p.evaluate(([x, y]) => { const el = document.elementFromPoint(x, y)?.closest('[data-hand]'); if (!el) return null; return getComputedStyle(el).transform; }, [c.x, c.y]);
  const others = await p.evaluate(() => [...document.querySelectorAll('.my-hand [data-hand]')].map((e) => getComputedStyle(e).transform));
  await p.screenshot({ path: `${O}${mode}-after-corner-tap.png` });
  ok(!lifted || !/matrix\(1\.[1-9]/.test(lifted), `the card under the finger isn't enlarged (${lifted})`);
}

// --- 2. Tap a card: lifted + shown, no "Not enough Mana", nothing played. Tap again: put back.
uids = await setHand(5); await wait(600);
if (mode === 'landscape' && (await state()).docked) { const c0 = await centerOf(uids[0]); await tap(c0.x, c0.y); await wait(500); }
{ const c = await centerOf(uids[3]); await tap(c.x, c.y); await wait(300);
  let st = await state();
  ok(st.inspect.includes(uids[3]) && !!st.preview, `tap lifts and shows the card (inspect ${st.inspect}, preview ${st.preview})`);
  ok(!st.flash.includes('Not enough Mana'), `a tap on an unaffordable card doesn't say "Not enough Mana" (${st.flash})`);
  ok(st.hand === 5, 'a tap never plays a card');
  await tap(c.x, c.y); await wait(300); st = await state();
  ok(!st.inspect.length && !st.preview, `tapping it again puts it back (inspect ${st.inspect}, preview ${st.preview})`);
  // Tap the affordable 1-cost card twice: still not played.
  const c0 = await centerOf(uids[0]); await tap(c0.x, c0.y); await tap(c0.x, c0.y); st = await state();
  ok(st.hand === 5, 'tapping an affordable card twice does not play it'); }

// --- 3. Hold: shows the card while held; release closes it.
{ const c = await centerOf(uids[1]); await touch('touchStart', c.x, c.y); await wait(550);
  let st = await state(); ok(st.reading.includes(uids[1]) && !!st.preview, `holding shows the card (reading ${st.reading}, preview ${st.preview})`);
  await touch('touchEnd'); await wait(350); st = await state();
  ok(!st.reading.length && !st.inspect.length && !st.preview, `releasing a hold closes it and selects nothing (reading ${st.reading} inspect ${st.inspect} preview ${st.preview})`); }

// --- 4. Hold and slide from card to card: the card under the finger is shown.
{ const a = await centerOf(uids[0]), z = await centerOf(uids[4]);
  await touch('touchStart', a.x, a.y); await wait(500);
  const seen = [];
  for (const [x, y] of line(a.x, a.y, z.x, z.y, 24)) { await touch('touchMove', x, y); await wait(40); const st = await state(); const last = st.reading[0]; if (last != null && seen[seen.length - 1] !== last) seen.push(last); }
  await p.screenshot({ path: `${O}${mode}-sliding.png` });
  await touch('touchEnd'); await wait(300);
  ok(seen[0] === uids[0] && seen[seen.length - 1] === uids[4] && seen.length >= 4, `sliding along the hand reads each card in turn (${seen.map((u) => uids.indexOf(u)).join('→')})`);
  ok(new Set(seen).size === seen.length, 'no card is shown twice (no flicker back and forth)'); }

// --- 5. Slide straight away (no hold first) also reads along the hand.
{ const a = await centerOf(uids[4]), z = await centerOf(uids[1]);
  await touch('touchStart', a.x, a.y); await wait(60);
  await slide(line(a.x, a.y, z.x, z.y, 14), 35);
  const st = await state(); await touch('touchEnd'); await wait(300);
  ok(st.reading.includes(uids[1]) && !!st.preview, `a quick sideways slide reads the card under the finger (reading ${st.reading.map((u) => uids.indexOf(u))})`); }

// --- 6. Portrait, a full hand (two rows): slowly moving between a back-row and a front-row card must not flicker.
if (mode === 'portrait') {
  uids = await setHand(9); await wait(700);
  const twoRows = await p.evaluate(() => !!document.querySelector('.my-hand.two-rows'));
  ok(twoRows, 'nine cards make two rows');
  const back = await centerOf(uids[1]), front = await centerOf(uids[6]);
  const bt = (await p.evaluate((u) => { const r = document.querySelector(`[data-hand="${u}"]`).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height * 0.12 }; }, uids[1]));
  await touch('touchStart', bt.x, bt.y); await wait(500);
  const seq = [];
  // Wiggle up and down across the overlap between the rows, the way an unsure thumb does.
  const path = [...line(bt.x, bt.y, front.x, front.y, 10), ...line(front.x, front.y, bt.x, bt.y + 6, 10), ...line(bt.x, bt.y + 6, front.x, front.y, 10)];
  for (const [x, y] of path) { await touch('touchMove', x, y); await wait(30); const st = await state(); if (st.reading[0] != null && seq[seq.length - 1] !== st.reading[0]) seq.push(st.reading[0]); }
  await p.screenshot({ path: `${O}${mode}-two-rows.png` });
  await touch('touchEnd'); await wait(300);
  ok(seq.length <= 4, `moving across the two rows switches cleanly, no rapid flicker (${seq.map((u) => uids.indexOf(u)).join('→')})`);
  // A thumb resting right on the seam between the rows, jittering a few px: the shown card must hold still.
  const seam = await p.evaluate((u) => { const r = document.querySelector(`[data-hand="${u}"]`).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top }; }, uids[6]);
  await touch('touchStart', seam.x, seam.y - 12); await wait(500);
  const jit = [];
  for (let i = 0; i < 24; i++) { await touch('touchMove', seam.x + (i % 3) - 1, seam.y + ((i % 2) ? 3 : -3)); await wait(25); const st = await state(); if (st.reading[0] != null && jit[jit.length - 1] !== st.reading[0]) jit.push(st.reading[0]); }
  await touch('touchEnd'); await wait(300);
  ok(jit.length <= 1, `a thumb jittering on the seam keeps showing one card (${jit.map((u) => uids.indexOf(u)).join('→')})`);
}

// --- 7. Drag an unaffordable card onto the board: now it says why; drag an affordable one: it's played.
uids = await setHand(4); await wait(600);

const boardY = await p.evaluate(() => { const r = document.querySelector('.board.me').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
{ const c = await centerOf(uids[2]);
  await touch('touchStart', c.x, c.y); await wait(50); await slide(line(c.x, c.y, boardY.x, boardY.y, 12), 25); await touch('touchEnd'); await wait(500);
  const st = await state(); ok(st.flash.includes('Not enough Mana') && st.hand === 4, `dragging an unaffordable card to the board says "Not enough Mana" (${st.flash})`); }
await wait(1500);
{ const c = await centerOf(uids[0]);
  await touch('touchStart', c.x, c.y); await wait(50); await slide(line(c.x, c.y, boardY.x, boardY.y, 12), 25); await touch('touchEnd'); await wait(1500);
  const st = await state(); ok(st.hand === 3, `dragging an affordable card onto the board plays it (hand ${st.hand})`); }

// --- 8. Hero Spells: holding one shows it and doesn't cast it (passive ones too).
// (Landscape: put a raised hand away first, by tapping an empty spot of the board.)
if (mode === 'landscape' && !(await state()).docked) { const e = await p.evaluate(() => { const r = document.querySelector('.board.opp')?.getBoundingClientRect() ?? { left: 300, top: 120, width: 10, height: 10 }; return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }); await tap(e.x, e.y); await wait(500); }
{   const hs = await p.evaluate(() => [...document.querySelectorAll('.hero-zone.me .hero-powers [data-preview]')].map((e) => { const r = e.getBoundingClientRect(); return { id: e.dataset.preview, x: r.left + r.width / 2, y: r.top + r.height / 2, aria: e.getAttribute('aria-disabled'), dis: e.disabled }; }));
  ok(hs.length > 0, `found something to hold beside your Hero (${hs.map((h) => h.id).join(', ')})`);
  for (const h of hs) {
    await p.evaluate(() => { const g = window.__shattered(); g.game.state.players[g.viewer].mana.current = 10; g.render(); }); await wait(300);
    const before = await p.evaluate(() => JSON.stringify(window.__shattered().game.state.players[window.__shattered().viewer].heroSpells));
    await touch('touchStart', h.x, h.y); await wait(650);
    const st = await state();
    await p.screenshot({ path: `${O}${mode}-hold-${h.id}.png` });
    await touch('touchEnd'); await wait(600);
    const after = await p.evaluate(() => JSON.stringify(window.__shattered().game.state.players[window.__shattered().viewer].heroSpells));
    ok(!!st.preview, `holding the Hero Spell "${h.id}" (${h.aria ? 'not usable now' : 'usable'}) shows it (${st.preview})`);
    ok(before === after, `holding "${h.id}" doesn't cast it`);
  } }

console.log('errors', JSON.stringify(errs.slice(0, 4)));
console.log(fails ? `${fails} FAILED` : 'ALL PASS');
await b.close();
