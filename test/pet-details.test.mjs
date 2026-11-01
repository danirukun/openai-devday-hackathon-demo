import {test} from 'node:test';
import assert from 'node:assert/strict';
import {formatInventory} from '../public/pet-details.mjs';
test('pet details describe each item without assuming a non-null item key',()=>{
 const items=[{pet_id:'a',item_type:'dot',item_key:'pink_dot'},{pet_id:'a',item_type:'photo',item_key:null},{pet_id:'a',item_type:'portrait',item_key:null},{pet_id:'a',item_type:'food',item_key:null},{pet_id:'a',item_type:'codex_cola',item_key:null},{pet_id:'b',item_type:'food',item_key:null}];
 assert.equal(formatInventory(items,'a'),'pink dot, photo, portrait ready to plot, food, Codex Cola');
 assert.equal(formatInventory(items,'missing'),'');
});
