import assert from 'node:assert/strict';
import fs from 'node:fs';
const {chromium,webkit}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const mode=fs.existsSync(new URL('../src/anime/frame-assets.js',import.meta.url))?'anime':'shattered';
const base=process.env.WEAPON_TEST_URL??(mode==='anime'?'http://127.0.0.1:4174':'http://127.0.0.1:4185');
const out=new URL('../dist/weapon-frame-checks/',import.meta.url);fs.mkdirSync(out,{recursive:true});
const browser=await (process.env.MENU_BROWSER==='webkit'?webkit:chromium).launch(process.env.MENU_BROWSER==='webkit'?{headless:true}:{headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
try{
 for(const mobile of [false,true]){
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},hasTouch:mobile,isMobile:mobile});const p=await context.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
  if(mode==='anime'){
   await p.goto(base+'/#collection');await p.locator('[data-faction="Tokyo Ghoul"]').click();await p.locator('[data-filter="weapon"]').click();assert.equal(await p.locator('.card-grid .card').count(),6);
   for(const id of ['tg_narukami','tg_ixa','tg_jason','tg_doujima','tg_fueguchi','tg_yukimura']){
    await p.locator(`[data-zoom="${id}"]`).click();await p.waitForTimeout(200);const frame=p.locator('.framed-inspect .realm-frame');assert.match(await frame.getAttribute('src'),/weapon-universal.webp$/);
    const layout=await p.locator('.framed-inspect .realm-card').evaluate(e=>{const box=e.getBoundingClientRect(),rel=s=>{const r=e.querySelector(s).getBoundingClientRect();return{x:(r.x+r.width/2-box.x)/box.width,y:(r.y+r.height/2-box.y)/box.height};};const text=e.querySelector('.rules-parchment p'),name=e.querySelector('h3 .card-name-text');return{cost:rel('.mana-orb'),attack:rel('.card-atk'),durability:rel('.card-hp'),rulesFit:text.scrollHeight<=text.parentElement.clientHeight+2,nameFit:name.scrollWidth<=name.parentElement.clientWidth+2};});
    assert.ok(Math.abs(layout.cost.x-.148)<.01&&Math.abs(layout.cost.y-.1005)<.01);assert.ok(layout.attack.y>.88&&layout.durability.y>.88);assert.ok(layout.rulesFit);assert.ok(layout.nameFit);
    if(['tg_jason','tg_ixa'].includes(id))await p.screenshot({path:new URL(`${id}-${mobile?'mobile':'desktop'}.png`,out).pathname});await p.locator('.modal-close').click();
   }
  }else{
   // Render the real shared card component without the account/matchmaking UI.
   await p.goto(base+'/Readme.md');await p.setContent(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><base href="${base}/"><link rel="stylesheet" href="src/ui/style.css"></head><body><main id="fixture"></main></body></html>`);
   await p.evaluate(async()=>{
    await import('/src/cards/index.js');const {allCards}=await import('/src/engine/registry.js'),{weaponStatsForCard}=await import('/src/cards/weapon-template.js'),{cardHTML,bigCardHTML}=await import('/src/ui/shared.js');const weapons=allCards().filter(weaponStatsForCard);
    window.frameCards=weapons;window.renderWeapon=bigCardHTML;
    document.querySelector('#fixture').innerHTML=`<section id="large">${bigCardHTML(weapons.find(c=>c.id==='kusanagi_no_kajitsu_the_divine_harvest'))}</section><section id="grid">${weapons.map(c=>cardHTML(c,{uid:7,playable:true})).join('')}</section>`;
    const style=document.createElement('style');style.textContent='html,body{overflow:auto!important;height:auto!important;background:#152018!important}#fixture{padding:20px}#large{display:flex;justify-content:center;padding-bottom:30px}#grid{display:grid;grid-template-columns:repeat(4,230px);gap:20px;justify-content:center}#grid>.card{width:230px!important;position:relative!important}@media(max-width:640px){#grid{grid-template-columns:repeat(2,155px);gap:12px}#grid>.card{width:155px!important}}';document.head.append(style);document.querySelectorAll('img').forEach(e=>e.removeAttribute('loading'));
   });
   await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(250);
   await p.evaluate(async()=>{const {fitAllText}=await import('/src/ui/shared.js');fitAllText(document.querySelector('#fixture'));});
   assert.ok(await p.locator('#grid .universal-weapon').count()>=50);
   const checks=await p.locator('.universal-weapon').evaluateAll(cards=>cards.map(e=>{const b=e.getBoundingClientRect(),cost=e.querySelector('.bc-cost').getBoundingClientRect(),a=e.querySelector('.bc-atk').getBoundingClientRect(),d=e.querySelector('.bc-dur').getBoundingClientRect(),text=e.querySelector('.bc-text'),name=e.querySelector('.bc-banner span');return{costX:(cost.x+cost.width/2-b.x)/b.width,costY:(cost.y+cost.height/2-b.y)/b.height,rulesLeft:(text.getBoundingClientRect().x-b.x)/b.width,bannerTop:(name.parentElement.getBoundingClientRect().y-b.y)/b.height,frame:e.querySelector('.bc-frame').getAttribute('src'),attackY:(a.y+a.height/2-b.y)/b.height,duraY:(d.y+d.height/2-b.y)/b.height,rulesFit:text.scrollHeight<=text.clientHeight+2,nameFit:name.scrollWidth<=name.clientWidth+2,pointer:getComputedStyle(e.querySelector('.bc-frame')).pointerEvents};}));
   for(const c of checks){assert.ok(Math.abs(c.costX-.148)<.01&&Math.abs(c.costY-.1005)<.01);assert.ok(c.rulesLeft>.175);assert.ok(Math.abs(c.bannerTop-.542)<.005);assert.match(c.frame,/weapon-universal.webp$/);assert.ok(c.attackY>.88&&c.duraY>.88);assert.ok(c.rulesFit);assert.ok(c.nameFit);assert.equal(c.pointer,'none');}
   for(const classic of [false,true]){await p.evaluate(classic=>{document.body.classList.toggle('classic-cards',classic);document.body.classList.add('colorblind');document.querySelector('#large').innerHTML=window.renderWeapon(window.frameCards.find(c=>c.id==='ray_gun'),{cost:1,costClass:'cheaper'});},classic);await p.evaluate(async()=>{const {fitAllText}=await import('/src/ui/shared.js');fitAllText(document.querySelector('#large'));});assert.match(await p.locator('#large .bc-frame').getAttribute('src'),/weapon-universal/);assert.equal(await p.locator('#large .bc-cost').evaluate(e=>getComputedStyle(e).backgroundImage),'none');}
   await p.screenshot({path:new URL(`shattered-${mobile?'mobile':'desktop'}.png`,out).pathname});
  }
  assert.deepEqual(errors,[]);console.log(`${mode} ${mobile?'mobile':'desktop'}: weapon frame, sockets, name/rules fit and interactions verified`);await context.close();
 }
}finally{await browser.close();}
