// Runs real battle input in either app. Set MOTION_TEST_URL to a served checkout.
import assert from 'node:assert/strict';
import fs from 'node:fs';
const anime=fs.existsSync(new URL('../src/anime/main.js',import.meta.url));
const base=process.env.MOTION_TEST_URL??`http://127.0.0.1:${anime?4174:4186}`;
const {chromium,webkit}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const safari=process.env.MENU_BROWSER==='webkit';
const browser=await(safari?webkit:chromium).launch(safari?{headless:true}:{headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
const out=new URL('../dist/card-motion-checks/',import.meta.url);fs.mkdirSync(out,{recursive:true});
const touches=new WeakMap();
const center=r=>({x:r.x+r.width/2,y:r.y+r.height/2});
async function fixture(p){
 await p.goto(base+(anime?'/#battle':'/'));
 const ids=await p.evaluate(async anime=>{
  const cards=await import('/src/cards/index.js'),{createGame}=await import('/src/engine/engine.js'),{summonMinion,addToHand}=await import('/src/engine/core.js');
  let cfg,id;
  if(anime){const {ANIME_PRESETS}=await import('/src/cards/anime-presets.js');const deck=ANIME_PRESETS['Tokyo Ghoul']['CCG Quinque Hunter'];cfg={factions:['Tokyo Ghoul'],deck,hero:'investigator'};id='tg_agent';}
  else{cfg={factions:['Vampires'],deck:cards.buildSingleDeck('Vampires')};id='nightwatch_recruit';}
  const s=createGame({players:[cfg,cfg],seed:35,rules:{mulligan:false,secondPlayerPotions:false,coinCardId:null,openingHandHelp:false}});
  for(const pl of s.players){pl.hand=[];pl.board=[];pl.mana={...pl.mana,current:10,max:10,base:10};}s.activePlayer=0;
  const a=summonMinion(s,0,id,{silent:true}),b=summonMinion(s,0,id,{silent:true}),enemy=summonMinion(s,1,id,{silent:true});
  for(const m of [a,b,enemy]){m.sick=false;m.attack=2;m.health=m.maxHealth=20;m.keywords=[];}
  const hand=addToHand(s,0,id);
  if(anime)localStorage.setItem('anime-clash-v1-match',JSON.stringify(s));
  else localStorage.setItem('faction-ccg-save',JSON.stringify({state:s,mode:'hotseat',factions:cfg.factions,rivalFactions:cfg.factions,human:0,format:'single',version:2}));
  return{a:a.uid,b:b.uid,enemy:enemy.uid,hand:hand.uid};
 },anime);
 await p.reload();
 if(!anime){await p.locator('.rx-isle-play').click();await p.locator('[data-act="continue"]').click();}
 await p.waitForSelector('.arena [data-char]');await p.waitForTimeout(700);
 return ids;
}
async function state(p){return p.evaluate(anime=>anime?JSON.parse(localStorage.getItem('anime-clash-v1-match')):window.__shattered().game.state,anime);}
async function settled(p){await p.waitForFunction(anime=>anime?!document.querySelector('.motion-ghost-host'):!window.__shattered().animating,anime);await p.waitForTimeout(250);}
async function down(p,point,touch){if(touch&&!safari){const cdp=await p.context().newCDPSession(p);touches.set(p,cdp);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});return;}if(touch)await p.evaluate(pt=>document.elementFromPoint(pt.x,pt.y).dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:7,pointerType:'touch',button:0,buttons:1,clientX:pt.x,clientY:pt.y})),point);else{await p.mouse.move(point.x,point.y);await p.mouse.down();}}
async function move(p,point,touch){if(touch&&!safari){await touches.get(p).send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[point]});return;}if(touch)await p.evaluate(pt=>document.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,pointerId:7,pointerType:'touch',buttons:1,clientX:pt.x,clientY:pt.y})),point);else await p.mouse.move(point.x,point.y,{steps:6});}
async function up(p,point,touch){if(touch&&!safari){const cdp=touches.get(p);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();touches.delete(p);return;}if(touch)await p.evaluate(pt=>document.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:7,pointerType:'touch',button:0,clientX:pt.x,clientY:pt.y})),point);else await p.mouse.up();}
try{
 for(const mobile of [false,true].filter(m=>!process.env.UI_MODE||(m?'mobile':'desktop')===process.env.UI_MODE)){
  const c=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile,reducedMotion:process.env.REDUCED_MOTION?'reduce':'no-preference'});
  await c.addInitScript(()=>{
   localStorage.setItem('shattered-journey',JSON.stringify({done:true,games:10,seen:[]}));sessionStorage.setItem('shattered-offline','1');sessionStorage.setItem('shattered-vote-prompted','1');localStorage.setItem('shattered-tutorial-done','1');localStorage.setItem('shattered-howto-opened','1');
   window.motionPoints=[];document.addEventListener("pointermove",e=>{window.motionPoints.push({x:e.clientX,y:e.clientY,time:performance.now()});if(window.motionPoints.length>3)window.motionPoints.shift();});window.motionCalls=[];const original=Element.prototype.animate;Element.prototype.animate=function(frames,opts){if(this.classList.contains('motion-character')||this.classList.contains('motion-play-card')||this.matches('.board .minion'))window.motionCalls.push({classes:this.className,frames,opts});return original.call(this,frames,opts);};
  });
  const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));let ids=await fixture(p);
  let from=center(await p.locator(`[data-char="${ids.a}"]`).boundingBox()),to=center(await p.locator(`[data-char="${ids.enemy}"]`).boundingBox());
  // Drag the actual piece, highlight the legal enemy, and never draw the attack arrow.
  await down(p,from,mobile);await move(p,to,mobile);assert.equal(await p.locator('.motion-character').count(),1);assert.equal(await p.locator('#arrow-layer.show').count(),0);assert.equal(await p.locator(`[data-char="${ids.enemy}"].attack-drop-target`).count(),1);
  await p.screenshot({path:new URL(`${anime?'anime':'shattered'}-${mobile?'phone':'desktop'}-drag.png`,out).pathname});
  await up(p,to,mobile);await p.waitForFunction(({anime,id})=>{const s=anime?JSON.parse(localStorage.getItem('anime-clash-v1-match')):window.__shattered().game.state;return s.players[0].board.find(m=>m.uid===id)?.attacksThisTurn===1;},{anime,id:ids.a});await settled(p);
  assert.equal((await state(p)).players[1].board[0].health,18);assert.equal(await p.locator('.motion-ghost-host,.attack-drag-src,.attack-drop-target').count(),0);if(!process.env.REDUCED_MOTION)assert.ok((await p.evaluate(()=>window.motionCalls)).some(x=>x.classes.includes('motion-character')));
  // Empty-space release cancels. Pointer cancellation also restores the source immediately.
  from=center(await p.locator(`[data-char="${ids.b}"]`).boundingBox());const empty={x:8,y:130};await down(p,from,mobile);await move(p,empty,mobile);await up(p,empty,mobile);assert.equal((await state(p)).players[0].board.find(m=>m.uid===ids.b).attacksThisTurn,0);assert.equal(await p.locator('.motion-ghost-host,.attack-drag-src').count(),0);
  await down(p,from,mobile);await move(p,to,mobile);await p.evaluate(()=>document.dispatchEvent(new PointerEvent('pointercancel',{bubbles:true,pointerId:7})));if(mobile&&!safari)await up(p,to,true);else if(!mobile)await p.mouse.up();assert.equal(await p.locator('.motion-ghost-host,.attack-drag-src,.attack-drop-target').count(),0);
  // Batch a genuinely fast crossing and release: automation's stepped mouse moves can exceed 100 ms.
  await p.evaluate(({from,id,mobile})=>{
   const el=document.elementFromPoint(from.x,from.y),opts={bubbles:true,pointerId:7,pointerType:mobile?'touch':'mouse',button:0,buttons:1};
   el.dispatchEvent(new PointerEvent('pointerdown',{...opts,clientX:from.x,clientY:from.y}));
   const r=document.querySelector(`[data-char="${id}"]`).getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;
   document.dispatchEvent(new PointerEvent('pointermove',{...opts,clientX:x,clientY:y}));
   const edge=r.right+(mobile?12:7);document.dispatchEvent(new PointerEvent('pointermove',{...opts,clientX:edge,clientY:y}));
   document.dispatchEvent(new PointerEvent('pointerup',{...opts,buttons:0,clientX:edge,clientY:y}));
  },{from,id:ids.enemy,mobile});
  await p.waitForFunction(({anime,id})=>{const s=anime?JSON.parse(localStorage.getItem('anime-clash-v1-match')):window.__shattered().game.state;return s.players[0].board.find(m=>m.uid===id)?.attacksThisTurn===1;},{anime,id:ids.b});await settled(p);
  // The played minion lands in the insertion gap between the original two pieces.
  const card=p.locator(`[data-hand="${ids.hand}"]`);if(safari){await p.evaluate(async anime=>{const board=await import(anime?'/src/realms/board.js':'/src/ui/board.js');board.setHandOpen(true,document.body,{force:true});},anime);await p.waitForTimeout(450);}else{await card.click();await p.waitForTimeout(450);}const r=await card.boundingBox(),board=await p.locator('.board.me').boundingBox();from=center(r);to=center(board);if(mobile)to.y+=(r.height+14)/2;
  await p.evaluate(()=>window.motionCalls=[]);await down(p,from,mobile);await move(p,to,mobile);await up(p,to,mobile);
  await p.waitForFunction(anime=>{const s=anime?JSON.parse(localStorage.getItem('anime-clash-v1-match')):window.__shattered().game.state;return s.players[0].board.length===3;},anime);await settled(p);
  const boardState=(await state(p)).players[0].board;assert.equal(boardState[0].uid,ids.a);assert.equal(boardState[2].uid,ids.b);assert.equal(await p.locator('.motion-ghost-host,.attack-drag-src').count(),0);assert.equal(await p.locator('.board.me .minion[style*="visibility: hidden"]').count(),0);
  const motions=await p.evaluate(()=>window.motionCalls);assert.ok(motions.some(x=>x.classes.includes('minion')&&(process.env.REDUCED_MOTION?x.frames.length===2&&x.frames.every(f=>!f.transform):x.opts.duration===190)));if(!process.env.REDUCED_MOTION)assert.ok(motions.some(x=>x.classes.includes('motion-play-card')&&!x.classes.includes('dragging')));
  await p.screenshot({path:new URL(`${anime?'anime':'shattered'}-${mobile?'phone':'desktop'}-landed.png`,out).pathname});if(anime&&!mobile){const turn=(await state(p)).turn;await p.locator('[data-act="endTurn"]').click();await p.waitForFunction(turn=>{const s=JSON.parse(localStorage.getItem('anime-clash-v1-match'));return s.activePlayer===0&&!s.pending&&s.turn>turn;},turn);}assert.deepEqual(errors,[]);await c.close();console.log(`${anime?'Anime Clash':'Shattered Realms'} ${mobile?'phone':'desktop'}: direct drag, fast release, legal highlight, no attack arrow, cancel cleanup and animated slot placement passed${process.env.REDUCED_MOTION?' (reduced motion)':''}`);
 }
}catch(e){for(const c of browser.contexts())for(const p of c.pages())await p.screenshot({path:new URL('failure.png',out).pathname}).catch(()=>{});throw e;}finally{await browser.close();}
