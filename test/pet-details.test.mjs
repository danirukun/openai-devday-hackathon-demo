import {test} from 'node:test';
import assert from 'node:assert/strict';
import {formatInventory,groupInventory} from '../public/pet-details.mjs';
test('pet details describe each item without assuming a non-null item key',()=>{
 const items=[{pet_id:'a',item_type:'dot',item_key:'pink_dot'},{pet_id:'a',item_type:'photo',item_key:null},{pet_id:'a',item_type:'portrait',item_key:null},{pet_id:'a',item_type:'food',item_key:null},{pet_id:'a',item_type:'codex_cola',item_key:null},{pet_id:'b',item_type:'food',item_key:null}];
 assert.equal(formatInventory(items,'a'),'pink dot, photo, portrait ready to plot, food, Codex Cola');
 assert.equal(formatInventory(items,'missing'),'');
});

test('inventory slots count each pet’s items and keep dot colours distinct',()=>{
 const items=[{pet_id:'a',item_type:'dot',item_key:'blue_dot'},{pet_id:'a',item_type:'dot',item_key:'pink_dot'},{pet_id:'a',item_type:'dot',item_key:'blue_dot'},{pet_id:'a',item_type:'photo',item_key:null},{pet_id:'b',item_type:'photo',item_key:null},{pet_id:'a',item_type:'other',item_key:null}];
 assert.deepEqual(groupInventory(items,'a'),[{key:'blue_dot',label:'Blue dot',count:2},{key:'pink_dot',label:'Pink dot',count:1},{key:'photo',label:'Photo',count:1},{key:'other',label:'Item',count:1}]);
 assert.deepEqual(groupInventory(items,'missing'),[]);
});
