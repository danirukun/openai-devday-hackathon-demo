import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {readControlHash} from '../pet-control.mjs';
const port=39186,dbPort=39187,id='00000000-0000-4000-8000-00000000000a';
let ownerHash,ready=false,child,commands=[];
const pet={id,name:'Owned Fixture',personality:'Friendly test fixture',slug:'fixture'};
const database=createServer(async(req,res)=>{
 let raw='';for await(const chunk of req)raw+=chunk;
 const data=raw?JSON.parse(raw):null;res.setHeader('content-type','application/json');
 const url=req.url;
 if(url==='/rest/v1/rpc/claim_island_slot')return res.end('true');
 if(url.startsWith('/rest/v1/island_pets?'))return res.end(JSON.stringify([pet]));
 if(url.startsWith('/rest/v1/island_pet_owners?'))return res.end(JSON.stringify(url.endsWith(ownerHash)?[{pet_id:id}]:[]));
 if(url==='/rest/v1/rpc/project_pet_needs')return res.end(JSON.stringify([{pet_id:id,fullness:70,energy:70,fun:70,social:70,mood:'happy',as_of:new Date().toISOString()}]));
 if(url.startsWith('/rest/v1/island_events?')||url.startsWith('/rest/v1/island_inventory?')||url.startsWith('/rest/v1/island_stations?'))return res.end('[]');
 if(url==='/rest/v1/rpc/save_owner_action'){
  if(data.p_owner_hash!==ownerHash){res.statusCode=403;return res.end(JSON.stringify({code:'42501'}));}
  commands.push(data);return res.end(JSON.stringify('00000000-0000-4000-8000-00000000000c'));
 }
 res.statusCode=404;res.end('{}');
});
before(async()=>{database.listen(dbPort,'127.0.0.1');await once(database,'listening');child=spawn(process.execPath,['server.mjs'],{cwd:process.cwd(),env:{...process.env,PORT:String(port),SUPABASE_URL:`http://127.0.0.1:${dbPort}`,SUPABASE_SERVICE_ROLE_KEY:'fake',OPENAI_API_KEY:''},stdio:['ignore','pipe','pipe']});child.stdout.on('data',()=>ready=true);});
after(()=>{child?.kill();database.close();});
async function request(path,options){for(let i=0;i<40&&!ready;i++)await new Promise(r=>setTimeout(r,50));assert.ok(ready);return fetch(`http://127.0.0.1:${port}${path}`,options);}
async function enter(){const response=await request('/api/login',{method:'POST'});return response.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');}
test('two browsers see the same pet but only its owner can direct it; hashes stay private',async()=>{
 const owner=await enter(),visitor=await enter();ownerHash=readControlHash({headers:{cookie:owner}});
 assert.ok(ownerHash);
 for(const [cookie,expected] of [[owner,true],[visitor,false]]){
  const response=await request('/api/world',{headers:{cookie}});assert.equal(response.status,200);
  const raw=await response.text();assert.ok(!raw.includes(ownerHash));assert.equal(JSON.parse(raw).pets[0].canControl,expected);
 }
 const payload={petId:id,requestId:'00000000-0000-4000-8000-00000000000b',action:'explore'};
 const command=cookie=>request('/api/pet-command',{method:'POST',headers:{cookie,'content-type':'application/json'},body:JSON.stringify(payload)});
 assert.equal((await command(visitor)).status,403);
 assert.equal((await command(owner)).status,200);
 assert.equal(commands.length,1);assert.equal(commands[0].p_owner_hash,ownerHash);
 assert.equal((await command(owner)).status,429);
 assert.equal((await request('/api/pet-command',{method:'POST',headers:{cookie:owner,origin:'https://outside.invalid'},body:JSON.stringify(payload)})).status,403);
});
