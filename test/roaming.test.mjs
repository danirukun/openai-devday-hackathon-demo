import {test} from 'node:test';
import assert from 'node:assert/strict';
import {roamPosition,actionWeight,blendPosition,waveWeight,bubbleWeight} from '../public/roaming.mjs';
const home={x:1,z:2},near=(a,b)=>Math.abs(a-b)<1e-7;
test('roaming is stable for the same pet and clock, bounded, and changes with time',()=>{
 const now=1730000000000,a=roamPosition('pet-a',home,now),b=roamPosition('pet-a',home,now);
 assert.deepEqual(a,b);
 let moved=false;
 for(let dt=0;dt<60000;dt+=500){const p=roamPosition('pet-a',home,now+dt);assert.ok(Math.abs(p.x-home.x)<=.55);assert.ok(Math.abs(p.z-home.z)<=.55);if(!near(p.x,a.x)||!near(p.z,a.z))moved=true}
 assert.ok(moved,'the pet should change position over time');
 assert.notDeepEqual(roamPosition('pet-a',home,now),roamPosition('pet-b',home,now));
});
test('recorded actions start and finish smoothly and do not remain active forever',()=>{
 assert.equal(actionWeight(1000,999),0);assert.equal(actionWeight(1000,1000),0);assert.equal(actionWeight(1000,4000),1);assert.equal(actionWeight(1000,21000),0);assert.equal(actionWeight(NaN,5000),0);
 assert.deepEqual(blendPosition({x:0,z:2},{x:2,z:4},.5),{x:1,z:3});
});
test('roaming crosses waypoints without a position jump',()=>{
 const time=1730000000000;for(let ms=0;ms<50000;ms+=31){const a=roamPosition('pet-a',home,time+ms),b=roamPosition('pet-a',home,time+ms+1);assert.ok(Math.hypot(a.x-b.x,a.z-b.z)<.005)}
});

test('the wave indicator follows only the active wave event',()=>{
 const event={action:'wave',created_at:new Date(1000).toISOString()};
 assert.equal(waveWeight(event,4000),1);
 assert.equal(waveWeight(event,21000),0);
 assert.equal(waveWeight({...event,action:'explore'},4000),0);
 assert.equal(waveWeight(null,4000),0);
 assert.equal(waveWeight({...event,created_at:'invalid'},4000),0);
});
test('a speech bubble shows only for a sent message and fades with the action window',()=>{
 const created_at='2024-10-27T03:33:20.000Z',t=Date.parse(created_at);
 assert.equal(bubbleWeight({action:'send_message',message:'Hello!',created_at},t+10000),1);
 assert.equal(bubbleWeight({action:'send_message',message:'Hello!',created_at},t+20000),0);
 assert.equal(bubbleWeight({action:'send_message',message:null,created_at},t+10000),0);
 assert.equal(bubbleWeight({action:'wave',message:'Hello!',created_at},t+10000),0);
 assert.equal(bubbleWeight(undefined,t),0);
});
