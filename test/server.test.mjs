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
  child=spawn(process.execPath,['server.mjs'],{cwd:process.cwd(),env:{...process.env,PORT:String(port),SUPABASE_URL:`http://127.0.0.1:${dbPort}`,SUPABASE_SERVICE_ROLE_KEY:'test-server-key',ISLAND_PASSWORD:'test-password',OPENAI_API_KEY:''},stdio:['ignore','pipe','pipe']});
  child.stdout.on('data',()=>{ready=true});
});
after(()=>{child?.kill();database.close()});
async function get(path,options){for(let i=0;i<40&&!ready;i++)await new Promise(r=>setTimeout(r,50));assert.ok(ready,'server did not start');return fetch(`http://127.0.0.1:${port}${path}`,options)}
const login=(password,cookie)=>get('/api/login',{method:'POST',headers:{'content-type':'application/json',...(cookie?{cookie}:{})},body:JSON.stringify({password})});
test('serves the UI without exposing environment files',async()=>{assert.equal((await get('/')).status,200);assert.equal((await get('/.env')).status,404)});
test('requires a password and protects mutations from cross-site requests',async()=>{
  assert.equal((await get('/api/world')).status,401);
  assert.equal((await login('incorrect')).status,401);
  assert.equal((await get('/api/login',{method:'POST',headers:{'content-type':'application/json',origin:'https://evil.example'},body:JSON.stringify({password:'test-password'})})).status,403);
});
test('caps simultaneous sessions, shares a slot across tabs and frees it on logout',async()=>{
  const cookies=[];
  for(let i=0;i<50;i++){const r=await login('test-password');assert.equal(r.status,200);const cookie=r.headers.get('set-cookie');assert.match(cookie,/HttpOnly; SameSite=Strict/);cookies.push(cookie);}
  assert.equal((await login('test-password',cookies[0])).status,200);assert.equal(slots.size,50);
  assert.equal((await login('test-password')).status,429);
  assert.equal((await get('/api/session',{headers:{cookie:cookies[0]}})).status,200);
  assert.equal((await get('/api/logout',{method:'POST',headers:{cookie:cookies[0]}})).status,200);
  assert.equal((await (await get('/api/session',{headers:{cookie:cookies[0]}})).json()).signedIn,false);
  assert.equal((await login('test-password')).status,200);
});
