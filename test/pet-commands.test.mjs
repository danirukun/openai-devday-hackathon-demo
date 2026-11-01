import {test} from 'node:test';
import assert from 'node:assert/strict';
import {petCommandOptions} from '../public/pet-commands.mjs';
const now=1700000000000;
const a={id:'a',canControl:true},b={id:'b'};
const world={pets:[a,b],inventory:[],stations:['printer','refreshments','photo_wall'].map(name=>({name,busy_until:null}))};
test('personal controls appear only for this browser and respect actor and partner reservations',()=>{
 assert.deepEqual(petCommandOptions(world,b,now),[]);
 assert.equal(petCommandOptions(world,a,now).filter(c=>!c.reason).length,5);
 const busy={...world,pets:[a,{...b,busy_until:new Date(now+1000).toISOString()}]};
 assert.match(petCommandOptions(busy,a,now).find(c=>c.action==='wave').reason,/available/i);
 assert.ok(petCommandOptions(world,{...a,busy_until:new Date(now+1000).toISOString()},now).every(c=>c.reason));
});
test('full inventory and busy stations explain disabled commands while exploration remains available',()=>{
 const full={...world,inventory:Array.from({length:12},()=>({pet_id:'a',item_type:'food'}))};
 const commands=petCommandOptions(full,a,now);
 assert.equal(commands.find(c=>c.action==='explore').reason,'');
 assert.match(commands.find(c=>c.action==='take_photo').reason,/inventory/i);
 const busy={...world,stations:world.stations.map(s=>({...s,busy_until:new Date(now+1000).toISOString()}))};
 assert.match(petCommandOptions(busy,a,now).find(c=>c.action==='use_printer').reason,/busy/i);
});

test('ambiguous failures and throttled retries keep the same command ID until confirmed success',async()=>{
 const {createCommandSender}=await import('../public/pet-commands.mjs');
 const sent=[];let count=0;
 const sender=createCommandSender(async payload=>{
  sent.push(payload);
  const status=[503,429,200,200][count++];
  return {ok:status===200,json:async()=>status===200?{eventId:'saved'}:{error:'Retry later'}};
 });
 const payload={petId:'a',action:'explore'};
 await assert.rejects(sender(payload));await assert.rejects(sender(payload));
 await sender(payload);await sender(payload);
 assert.equal(sent[0].requestId,sent[1].requestId);assert.equal(sent[1].requestId,sent[2].requestId);
 assert.notEqual(sent[2].requestId,sent[3].requestId);
});
