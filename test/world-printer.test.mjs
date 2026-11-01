import {test, before, after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {runTurn} from '../turn.mjs';
// This entire world is fake and exists only in the test process.
const world={pets:[{id:'pet-a',name:'Mochi',personality:'Inventive'},{id:'pet-b',name:'Pip',personality:'Curious'}],events:[{id:'old',pet_id:'pet-b',pet_name:'Pip',other_name:'Mochi',action:'wave'}],inventory:[],stations:[{name:'printer',busy_until:null}]};
const db=async(path,method='GET',data)=>{
 if(path.startsWith('island_pets?'))return world.pets;
 if(path.startsWith('island_events?'))return world.events;
 if(path.startsWith('island_inventory?'))return world.inventory;
 if(path.startsWith('island_stations?'))return world.stations;
 if(path==='rpc/save_printer_action'&&method==='POST'){
  const event={id:'print-1',pet_id:data.p_pet_id,pet_name:'Mochi',other_name:data.p_other_name,action:'use_printer',outcome:data.p_outcome,confidence:data.p_confidence,context:data.p_context};
  world.events.unshift(event);world.inventory.push({pet_id:data.p_pet_id,event_id:event.id,item_type:'dot',item_key:data.p_outcome});world.stations[0].busy_until='2099-01-01T00:00:00Z';return event.id;
 }
 if(path==='rpc/claim_island_slot')return true;
 throw Error('Unexpected fake database call');
};
const fakeDb=createServer(async(req,res)=>{
 let text='';for await(const chunk of req)text+=chunk;
 try{const result=await db(req.url.slice('/rest/v1/'.length),req.method,text?JSON.parse(text):undefined);res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify(result));}
 catch{res.writeHead(500,{'content-type':'application/json'});res.end('{}')}
});
let child,ready=false;
before(async()=>{
 fakeDb.listen(39287,'127.0.0.1');await once(fakeDb,'listening');
 child=spawn(process.execPath,['server.mjs'],{cwd:process.cwd(),env:{...process.env,PORT:'39286',SUPABASE_URL:'http://127.0.0.1:39287',SUPABASE_SERVICE_ROLE_KEY:'test-server-key',ISLAND_PASSWORD:'test-password',OPENAI_API_KEY:''},stdio:['ignore','pipe','pipe']});child.stdout.on('data',()=>{ready=true});
});
after(()=>{child?.kill();fakeDb.close()});
async function request(path,options){for(let i=0;i<40&&!ready;i++)await new Promise(r=>setTimeout(r,50));assert.ok(ready);return fetch('http://127.0.0.1:39286'+path,options)}
async function login(){const r=await request('/api/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({password:'test-password'})});assert.equal(r.status,200);return r.headers.get('set-cookie')}
test('two independent clients read the same simulated print after refresh',async()=>{
 const a=await login(),b=await login();assert.notEqual(a,b);
 await runTurn({db,chooseActor:()=>0,requestDecision:async()=>({answers:[{type:'choice',name:'action',choice:'use_printer',confidence:.8},{type:'choice',name:'dot',choice:'pink_dot'}]})});
 for(const cookie of [a,b,a,b]){
  const r=await request('/api/world',{headers:{cookie}});assert.equal(r.status,200);const result=await r.json();
  assert.equal(result.events[0].action,'use_printer');assert.equal(result.events[0].outcome,'pink_dot');assert.equal(result.inventory[0].item_key,'pink_dot');assert.equal(result.inventory[0].pet_id,'pet-a');assert.equal(result.stations[0].busy_until,'2099-01-01T00:00:00Z');assert.equal(result.events[1].action,'wave');
 }
});
