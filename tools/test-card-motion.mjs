import test from 'node:test';
import assert from 'node:assert/strict';
import {attackTargetAt,segmentIntersects} from '../src/ui/card-motion.js';
const rect=(left,top,width=50,height=60)=>({left,top,width,height,right:left+width,bottom:top+height});
const boxes={1:rect(100,100),2:rect(160,100),3:rect(220,100),4:rect(0,0,0,0)};
const root={querySelector:selector=>{const uid=Number(selector.match(/"(\d+)"/)[1]);return boxes[uid]?{getBoundingClientRect:()=>boxes[uid]}:null;}};
const options=[{defender:1},{defender:2},{defender:2},{defender:4},{defender:999}];
const hit=(x,y,previous=null,touch=false,time=50)=>attackTargetAt(root,options,{x,y,time},previous,{touch})?.uid;
test('direct targeting uses only legal defenders and chooses the closest visible hitbox',()=>{
 assert.equal(hit(125,130),1);assert.equal(hit(175,130),2);assert.equal(hit(245,130),undefined);assert.equal(hit(0,0),undefined);
 assert.equal(hit(156,130,null,true),2);assert.equal(hit(154,130),undefined);assert.equal(hit(93,130,null,true),1);assert.equal(hit(93,130),undefined);
});
test('fast accurate crossings tolerate a tiny overshoot, never a distant directional fling',()=>{
 assert.equal(hit(158,130,{x:90,y:130,time:30}),2); // release directly on the next legal target
 assert.equal(attackTargetAt(root,[{defender:1}],{x:158,y:130,time:50},{x:90,y:130,time:30})?.uid,1);
 assert.equal(attackTargetAt(root,[{defender:1}],{x:167,y:130,time:50},{x:90,y:130,time:30},{touch:true})?.uid,1);
 assert.equal(hit(235,130,{x:90,y:130,time:30}),undefined);assert.equal(hit(158,170,{x:90,y:130,time:30}),undefined);
 assert.equal(attackTargetAt(root,[{defender:1}],{x:158,y:130,time:200},{x:90,y:130,time:30}),null);
 assert.equal(attackTargetAt(root,[{defender:1}],{x:158,y:130,time:20},{x:90,y:130,time:30}),null);
});
test('segment crossing handles diagonal, parallel, zero-length and boundary gestures',()=>{
 const r=rect(100,100);assert.ok(segmentIntersects({x:80,y:80},{x:160,y:180},r));assert.ok(segmentIntersects({x:100,y:100},{x:100,y:100},r));assert.ok(!segmentIntersects({x:80,y:80},{x:80,y:180},r));assert.ok(!segmentIntersects({x:0,y:0},{x:0,y:0},r));
});
