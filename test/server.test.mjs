import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
const port=39176;
const child=spawn(process.execPath,['server.mjs'],{cwd:process.cwd(),env:{...process.env,PORT:String(port),SUPABASE_URL:'',SUPABASE_SERVICE_ROLE_KEY:'',SUPABASE_PUBLISHABLE_KEY:'',OPENAI_API_KEY:''},stdio:['ignore','pipe','pipe']});
let ready=false;child.stdout.on('data',()=>{ready=true});
after(()=>child.kill());
async function get(path,options){for(let i=0;i<40&&!ready;i++)await new Promise(r=>setTimeout(r,50));assert.ok(ready,'server did not start');return fetch(`http://127.0.0.1:${port}${path}`,options)}
test('serves the UI without exposing environment files',async()=>{assert.equal((await get('/')).status,200);assert.equal((await get('/.env')).status,404)});
test('does not allow joining without configured email authentication',async()=>{const r=await get('/api/join',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({slug:'anything',personality:'x'})});assert.equal(r.status,503);assert.match((await r.json()).error,/sign-in is not configured/i)});
test('reports an unavailable shared world rather than returning mock data',async()=>{const r=await get('/api/world');assert.equal(r.status,503);assert.match((await r.json()).error,/sign-in is not configured/i)});
