// Tactile placement and direct combat, shared by Shattered Realms and Anime Clash.
// Pointer hit testing only considers targets supplied by the engine.
import {animate,ghost,layer,screenShake,wait} from './fx.js';
const center=r=>({x:r.left+r.width/2,y:r.top+r.height/2});
const rectCopy=r=>({left:r.left,top:r.top,width:r.width,height:r.height,right:r.right??r.left+r.width,bottom:r.bottom??r.top+r.height});
const reduced=()=>document.body.classList.contains('reduced-motion')||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
function styles(){
 if(document.getElementById('card-motion-styles'))return;
 const el=document.createElement('style');el.id='card-motion-styles';el.textContent=`
 .attack-drag-src{opacity:.18!important}.attack-drop-target{filter:brightness(1.18) drop-shadow(0 0 8px #ffb75a)!important}
 .motion-character{will-change:transform;filter:drop-shadow(0 15px 9px #000a);pointer-events:none!important}
 .motion-ghost-host{pointer-events:none!important}.motion-ghost-host *{pointer-events:none!important}
 .motion-impact{position:fixed;pointer-events:none;border:2px solid var(--impact-color,#e6bd76);border-radius:50%;box-shadow:0 0 12px var(--impact-color,#e6bd76);z-index:1001;transform-origin:center}
 .motion-shadow{position:fixed;pointer-events:none;background:radial-gradient(ellipse,#0009,transparent 70%);border-radius:50%;z-index:899}
 `;document.head.append(el);
}
function visualCopy(el,rect){
 styles();const host=document.createElement('div');host.className='arena fx-ghost-host motion-ghost-host';host.style.setProperty('--minion-w',`${rect.width}px`);host.style.setProperty('--hero',`${rect.width}px`);
 layer().append(host);const copy=ghost(el,rect);copy.classList.remove('attack-drag-src','drag-src','targetable','aim-over','attack-drop-target','dragging','lifted','aiming-card','inspect','reading');copy.style.setProperty('--card-h',`${rect.height}px`);copy.style.setProperty('--card-w',`${rect.width}px`);host.append(copy);return{host,copy};
}
export function capturePlacement(el){
 if(!el?.getBoundingClientRect)return null;const rect=rectCopy(el.getBoundingClientRect());if(!rect.width||!rect.height)return null;
 return{rect,clone:el.cloneNode(true)};
}
// A small edge allowance compensates for finger occlusion. A fast crossing is accepted only
// when the release stays close to the target: flinging in a direction never auto-aims.
export function attackTargetAt(root,options,point,previous=null,{touch=false}={}){
 const slop=touch?8:3,near=touch?18:10,candidates=[];
 for(const uid of new Set(options.map(a=>a.defender))){
  const el=root.querySelector(`[data-char="${uid}"]`);if(!el)continue;const r=el.getBoundingClientRect();if(!r.width||!r.height)continue;
  const inside=point.x>=r.left-slop&&point.x<=r.right+slop&&point.y>=r.top-slop&&point.y<=r.bottom+slop;
  const distance=Math.hypot(Math.max(r.left-point.x,0,point.x-r.right),Math.max(r.top-point.y,0,point.y-r.bottom));
  const recent=previous&&point.time-previous.time>=0&&point.time-previous.time<100;
  if(!inside&&!(recent&&distance<=near&&segmentIntersects(previous,point,r)))continue;
  const c=center(r);candidates.push({uid,el,distance:Math.hypot(point.x-c.x,point.y-c.y)});
 }
 return candidates.sort((a,b)=>a.distance-b.distance)[0]??null;
}
export function segmentIntersects(a,b,r){
 let lo=0,hi=1;const dx=b.x-a.x,dy=b.y-a.y;
 for(const[p,q]of[[-dx,a.x-r.left],[dx,r.right-a.x],[-dy,a.y-r.top],[dy,r.bottom-a.y]]){
  if(Math.abs(p)<1e-8){if(q<0)return false;continue;}const t=q/p;if(p<0)lo=Math.max(lo,t);else hi=Math.min(hi,t);if(lo>hi)return false;
 }return true;
}
export function beginAttackDrag(el,start){
 const rect=rectCopy(el.getBoundingClientRect()),v=visualCopy(el,rect);v.copy.classList.add('motion-character');el.classList.add('attack-drag-src');
 return{...v,source:el,rect,start,lastX:start.x};
}
export function moveAttackDrag(d,point,locked=false){
 if(!d)return;const dx=point.x-d.start.x,dy=point.y-d.start.y,tilt=reduced()?0:Math.max(-7,Math.min(7,(point.x-d.lastX)*.2));d.lastX=point.x;
 d.copy.style.transform=`translate(${dx}px,${dy}px) scale(${locked?1.03:1.1}) rotate(${tilt}deg)`;
}
export function endAttackDrag(d){if(!d)return;d.source?.classList.remove('attack-drag-src');d.host.remove();}
function impact(rect,{color='#e6bd76',table=null,weight=2}={}){
 styles();const c=center(rect),ring=document.createElement('div');ring.className='motion-impact';ring.style.setProperty('--impact-color',color);
 Object.assign(ring.style,{left:`${c.x-rect.width*.56}px`,top:`${c.y+rect.height*.28}px`,width:`${rect.width*1.12}px`,height:`${rect.height*.28}px`});layer().append(ring);
 animate(ring,reduced()?[{opacity:.5},{opacity:0}]:[{transform:'scale(.6)',opacity:.8},{transform:'scale(1.55)',opacity:0}],{duration:220,easing:'ease-out'}).finally(()=>ring.remove());
 if(table&&!reduced())screenShake(table,Math.min(3,1+weight*.18));
}
// The hand card travels to the actual minion slot, then the board piece settles with a thud.
export async function landPiece(el,placement=null,options={}){
 if(!el)return;styles();const destination=rectCopy(el.getBoundingClientRect());if(!destination.width)return;
 let copy=null,shadow=null;const visibility=el.style.visibility;
 try{
  if(placement&&!reduced()){
   copy=visualCopy(placement.clone,placement.rect);copy.copy.classList.add('motion-play-card');el.style.visibility='hidden';const a=center(placement.rect),b=center(destination);
   await animate(copy.copy,[{transform:'scale(1)',opacity:.95,filter:'drop-shadow(0 18px 10px #0009)'},{transform:`translate(${b.x-a.x}px,${b.y-a.y-8}px) scale(${destination.width/placement.rect.width},${destination.height/placement.rect.height})`,opacity:.2}],{duration:120,easing:'cubic-bezier(.2,.75,.4,1)'});
   copy.host.remove();copy=null;
  }
  if(!el.isConnected)return;el.style.visibility=visibility;options.onImpact?.();impact(destination,options);
  // Keep the shadow on its own layer: animating a filter on a framed minion can
  // crash WebKit's mobile compositor when the board also moves.
  if(!reduced()){
   shadow=document.createElement('div');shadow.className='motion-shadow';
   Object.assign(shadow.style,{left:`${destination.left-destination.width*.1}px`,top:`${destination.bottom-2}px`,width:`${destination.width*1.2}px`,height:`${destination.height*.16}px`});layer().append(shadow);
   animate(shadow,[{transform:'scale(.7)',opacity:.2},{transform:'scale(1)',opacity:.55,offset:.32},{transform:'scale(.9)',opacity:0}],{duration:190,fill:'none'});
  }
  await animate(el,reduced()?[{opacity:.7},{opacity:1}]:[
   {transform:'translateY(-10px) scale(1.12)'},
   {transform:'translateY(2px) scale(1.05,.94)',offset:.32},
   {transform:'translateY(-1px) scale(.99,1.02)',offset:.68},{transform:'none'}
  ],{duration:190,easing:'cubic-bezier(.2,.75,.3,1)',fill:'none'});
 }finally{copy?.host.remove();shadow?.remove();el.style.visibility=visibility;}
}
// Spells, traps and equipment get a short, physical put-down before their normal effects.
export async function settleCard(placement,options={}){
 if(!placement)return;const v=visualCopy(placement.clone,placement.rect);
 try{await animate(v.copy,reduced()?[{opacity:.7},{opacity:0}]:[
  {transform:'translateY(-8px) scale(1.03)',opacity:1,filter:'drop-shadow(0 15px 10px #0008)'},
  {transform:'translateY(2px) scale(1.01,.97)',opacity:1,offset:.42,filter:'drop-shadow(0 2px 2px #0008)'},
  {transform:'none',opacity:0,filter:'none'}
 ],{duration:210,easing:'ease-out'});options.onImpact?.();}finally{v.host.remove();}
}
// Start from where the player released the character, without replaying a long wind-up.
export async function directStrike(source,target,fromRect=null,options={}){
 if(!source||!target)return;const home=rectCopy(source.getBoundingClientRect()),hit=rectCopy(target.getBoundingClientRect()),start=fromRect??home,v=visualCopy(source,start),visibility=source.style.visibility;
 source.style.visibility='hidden';v.copy.classList.add('motion-character');const a=center(start),b=center(hit),h=center(home);
 try{
  if(!reduced())await animate(v.copy,[{transform:'none'},{transform:`translate(${b.x-a.x}px,${b.y-a.y}px) scale(.98)`}],{duration:fromRect?65:115,easing:'cubic-bezier(.2,.8,.4,1)'});
  impact(hit,options);animate(target,reduced()?[{opacity:.85},{opacity:1}]:[{transform:'scale(.96)'},{transform:'none'}],{duration:140,fill:'none'});
  await wait(35);
  if(!reduced())await animate(v.copy,[{transform:`translate(${b.x-a.x}px,${b.y-a.y}px) scale(.98)`},{transform:`translate(${h.x-a.x}px,${h.y-a.y}px) scale(${home.width/start.width},${home.height/start.height})`}],{duration:145,easing:'cubic-bezier(.15,.75,.3,1)'});
 }finally{source.style.visibility=visibility;v.host.remove();}
}
