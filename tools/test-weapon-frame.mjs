import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import '../src/cards/index.js';
import {allCards} from '../src/engine/registry.js';
import {weaponStatsForCard} from '../src/cards/weapon-template.js';
import {bigCardHTML,cardHTML,WEAPON_FRAME_SRC} from '../src/ui/shared.js';
test('all equipment spells, Wands, relics and Legendary weapons use the shared frame and stat sockets',()=>{
 const weapons=allCards().filter(c=>weaponStatsForCard(c));assert.ok(weapons.length>=50);
 for(const c of weapons){const stats=weaponStatsForCard(c),html=bigCardHTML(c);assert.ok(html.includes(WEAPON_FRAME_SRC),c.name);assert.ok(html.includes('universal-weapon'));assert.ok(html.includes(`aria-label="${stats.attack} Attack"`));assert.ok(html.includes(`aria-label="${stats.durability} Durability"`));assert.ok(!html.includes('bc-weapon-stats'));assert.ok(cardHTML(c,{uid:7,playable:true}).includes('data-hand="7"'));}
 assert.ok(fs.existsSync(new URL('../'+WEAPON_FRAME_SRC,import.meta.url)));
});
test('classic appearance cannot bypass the weapon frame; normal minions and spells retain their frames',()=>{
 const weapon=allCards().find(c=>weaponStatsForCard(c));
 try{globalThis.document={body:{classList:{contains:()=>true}}};assert.ok(bigCardHTML(weapon).includes(WEAPON_FRAME_SRC));const plain=allCards().find(c=>c.type==='minion'&&!weaponStatsForCard(c));assert.ok(!bigCardHTML(plain).includes(WEAPON_FRAME_SRC));}finally{delete globalThis.document;}
 const spell=allCards().find(c=>c.type==='spell'&&!weaponStatsForCard(c)&&!c.legendary&&!c.quickPlay);assert.ok(!bigCardHTML(spell).includes(WEAPON_FRAME_SRC));
 const discounted=bigCardHTML(weapon,{cost:0,costClass:'cheaper',extra:'<b>Live bonus</b>'});assert.ok(discounted.includes('cheaper'));assert.ok(discounted.includes('Live bonus'));
});
