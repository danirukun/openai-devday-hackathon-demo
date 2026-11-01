import {test} from 'node:test';
import assert from 'node:assert/strict';
import {runTurn} from '../turn.mjs';
const actor={id:'pet-a',name:'Mochi',personality:'Likes making things'};
const friend={id:'pet-b',name:'Pip',personality:'Curious'};
const answer=(name,choice)=>({name,type:'choice',choice,confidence:.8});
function fixture({items=[],busyUntil=null}={}) {
  const calls=[];
  const db=async(path,method='GET',data)=>{
    calls.push({path,method,data});
    if(path.startsWith('island_pets?'))return [actor,friend];
    if(path.startsWith('island_inventory?'))return items;
    if(path.startsWith('island_stations?'))return [{name:'printer',busy_until:busyUntil}];
    if(path==='rpc/save_printer_action'||path==='island_events')return 'saved';
    throw Error('Unexpected fake database request');
  };
  return {db,calls};
}
const writes=calls=>calls.filter(c=>c.method==='POST');
test('one simulated decision offers printer and saves the matching dot once',async()=>{
  const {db,calls}=fixture();let requests=0;
  const done=await runTurn({db,now:()=>1000,chooseActor:()=>0,onRequest:()=>requests++,requestDecision:async request=>{
    assert.equal(request.questions.length,2);
    assert.ok(request.questions[0].choices.some(c=>c.value==='use_printer'));
    assert.deepEqual(request.questions[1].choices.map(c=>c.value),['pink_dot','blue_dot','yellow_dot']);
    return {answers:[answer('action','use_printer'),answer('dot','pink_dot')]};
  }});
  assert.equal(done,true);assert.equal(requests,1);assert.equal(writes(calls).length,1);
  assert.equal(writes(calls)[0].path,'rpc/save_printer_action');
  assert.equal(writes(calls)[0].data.p_pet_id,actor.id);assert.equal(writes(calls)[0].data.p_outcome,'pink_dot');assert.equal(writes(calls)[0].data.p_confidence,.8);
});
test('busy or full printers are not offered',async()=>{
  for(const input of [{busyUntil:new Date(2000).toISOString()},{items:Array.from({length:3},()=>({pet_id:actor.id,item_type:'dot'}))},{items:Array.from({length:12},()=>({pet_id:actor.id,item_type:'other'}))}]){
    const {db,calls}=fixture(input);
    await runTurn({db,now:()=>1000,chooseActor:()=>0,requestDecision:async request=>{
      assert.equal(request.questions.length,1);assert.ok(!request.questions[0].choices.some(c=>c.value==='use_printer'));
      return {answers:[answer('action','wave'),answer('dot','invalid')]};
    }});
    assert.equal(writes(calls)[0].path,'island_events');assert.equal(writes(calls)[0].data.action,'wave');
  }
});
test('invalid, refused and unoffered answers never write',async()=>{
  for(const answers of [[],[{name:'action',type:'refusal'}],[answer('action','invalid')],[answer('action','use_printer'),answer('dot','invalid')]]){
    const {db,calls}=fixture();await assert.rejects(runTurn({db,chooseActor:()=>0,requestDecision:async()=>({answers})}));assert.equal(writes(calls).length,0);
  }
  const {db,calls}=fixture({busyUntil:new Date(2000).toISOString()});
  await assert.rejects(runTurn({db,now:()=>1000,chooseActor:()=>0,requestDecision:async()=>({answers:[answer('action','use_printer'),answer('dot','pink_dot')]})}));assert.equal(writes(calls).length,0);
});
test('model and database errors propagate instead of reporting success',async()=>{
  let f=fixture();await assert.rejects(runTurn({db:f.db,chooseActor:()=>0,requestDecision:async()=>{throw Error('timeout')}}));assert.equal(writes(f.calls).length,0);
  f=fixture();const db=async(...args)=>{if(args[0]==='rpc/save_printer_action')throw Error('database unavailable');return f.db(...args)};
  await assert.rejects(runTurn({db,chooseActor:()=>0,requestDecision:async()=>({answers:[answer('action','use_printer'),answer('dot','pink_dot')]})}),/database unavailable/);
});
