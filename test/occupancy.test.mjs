import {test} from 'node:test';
import assert from 'node:assert/strict';
import {runTurn} from '../turn.mjs';
const pets=['a','b','c'].map(id=>({id,name:id,personality:'friendly'}));
const time=100000;
const event=(action,pet,other,ago)=>({action,pet_id:pet,other_pet_id:other,created_at:new Date(time-ago).toISOString()});
function fixture(recent){let requests=0,payload;const db=async(path,method='GET')=>{
 if(path.startsWith('island_pets?'))return pets;
 if(path.startsWith('island_inventory?'))return [];
 if(path.startsWith('island_stations?'))return [{name:'printer',busy_until:null},{name:'photo_wall',busy_until:null}];
 if(path.startsWith('island_events?')&&path.includes('created_at=gte.'))return recent;
 if(path.startsWith('island_events?'))return [];
 if(method==='POST')return 'saved';throw Error('Unexpected query');
};return {db,get requests(){return requests},get payload(){return payload},requestDecision:async data=>{requests++;payload=data;return {answers:[{type:'choice',name:'action',choice:'explore',confidence:.8}]}}}}
test('a photo keeps both pets out of actor and partner selection for its duration',async()=>{
 const f=fixture([event('take_photo','a','b',10000)]);
 await runTurn({db:f.db,requestDecision:f.requestDecision,now:()=>time,chooseActor:()=>0,choosePartner:()=>0});
 assert.match(f.payload.input,/Pet: c\./);assert.match(f.payload.input,/No other pets are nearby/);
 assert.ok(!f.payload.questions[0].choices.some(c=>c.value==='take_photo'));
});
test('skip the API call when all pets are busy, and release pets after 20 seconds',async()=>{
 let f=fixture([event('take_photo','a','b',10000),event('use_printer','c',null,1000)]);
 assert.equal(await runTurn({db:f.db,requestDecision:f.requestDecision,now:()=>time,chooseActor:()=>0}),false);assert.equal(f.requests,0);
 f=fixture([event('take_photo','a','b',20000)]);
 await runTurn({db:f.db,requestDecision:f.requestDecision,now:()=>time,chooseActor:()=>0,choosePartner:()=>0});
 assert.match(f.payload.input,/Pet: a\./);assert.match(f.payload.input,/Nearby pet: b\./);
});
