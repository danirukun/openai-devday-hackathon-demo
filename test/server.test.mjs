import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { once } from 'node:events';
const port=39176, dbPort=39177, slots=new Set();
const database=createServer(async(req,res)=>{
  let text='';for await(const chunk of req)text+=chunk;
  res.setHeader('content-type','application/json');
  if(req.url==='/rest/v1/rpc/claim_island_slot'){
    const id=JSON.parse(text).p_user_id;
    if(!slots.has(id)&&slots.size>=50)return res.end('false');
    slots.add(id);return res.end('true');
  }
  if(req.method==='DELETE'&&req.url.startsWith('/rest/v1/island_presence?user_id=eq.')){slots.delete(req.url.split('eq.')[1]);return res.end('[]');}
  res.statusCode=404;res.end('{}');
});
let child,ready=false;
before(async()=>{
  database.listen(dbPort,'127.0.0.1');await once(database,'listening');
  child=spawn(process.execPath,['server.mjs'],{cwd:process.cwd(),env:{...process.env,PORT:String(port),SUPABASE_URL:`http://127.0.0.1:${dbPort}`,SUPABASE_SERVICE_ROLE_KEY:'test-server-key',OPENAI_API_KEY:''},stdio:['ignore','pipe','pipe']});
  child.stdout.on('data',()=>{ready=true});
});
after(()=>{child?.kill();database.close()});
async function get(path,options){for(let i=0;i<40&&!ready;i++)await new Promise(r=>setTimeout(r,50));assert.ok(ready,'server did not start');return fetch(`http://127.0.0.1:${port}${path}`,options)}
const login=(cookie)=>get('/api/login',{method:'POST',headers:cookie?{cookie}:{}});
test('serves the UI without exposing environment files',async()=>{assert.equal((await get('/')).status,200);assert.equal((await get('/roaming.mjs')).status,200);assert.equal((await get('/pet-details.mjs')).status,200);assert.equal((await get('/.env')).status,404)});
test('requires a session and protects mutations from cross-site requests',async()=>{
  assert.equal((await get('/api/world')).status,401);
  assert.equal((await get('/api/login',{method:'POST',headers:{'content-type':'application/json',origin:'https://evil.example'},body:JSON.stringify({password:'test-password'})})).status,403);
});
test('caps simultaneous sessions, shares a slot across tabs and frees it on logout',async()=>{
  const cookies=[];
  for(let i=0;i<50;i++){const r=await login();assert.equal(r.status,200);const cookie=r.headers.get('set-cookie');assert.match(cookie,/HttpOnly; SameSite=Strict/);cookies.push(cookie);}
  assert.equal((await login(cookies[0])).status,200);assert.equal(slots.size,50);
  assert.equal((await login()).status,429);
  assert.equal((await get('/api/session',{headers:{cookie:cookies[0]}})).status,200);
  assert.equal((await get('/api/logout',{method:'POST',headers:{cookie:cookies[0]}})).status,200);
  assert.equal((await (await get('/api/session',{headers:{cookie:cookies[0]}})).json()).signedIn,false);
  assert.equal((await login()).status,200);
});

 test('venue downloads compressed without changing the model and respects gzip opt-out',async()=>{
  const plain=await get('/venue.glb',{headers:{'accept-encoding':'identity'}});
  const expected=Buffer.from(await plain.arrayBuffer());
  assert.equal(plain.status,200);
  assert.equal(plain.headers.get('content-encoding'),null);
  const compressed=await get('/venue.glb',{headers:{'accept-encoding':'gzip'}});
  assert.equal(compressed.headers.get('content-encoding'),'gzip');
  assert.equal(compressed.headers.get('vary'),'Accept-Encoding');
  assert.ok(Number(compressed.headers.get('content-length'))<expected.length/2);
  assert.deepEqual(Buffer.from(await compressed.arrayBuffer()),expected);
  const optedOut=await get('/venue.glb',{headers:{'accept-encoding':'gzip;q=0'}});
  assert.equal(optedOut.headers.get('content-encoding'),null);
  assert.equal(optedOut.headers.get('cache-control'),'no-cache');
});
