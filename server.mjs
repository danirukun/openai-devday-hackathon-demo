import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('./public/', import.meta.url));
const port = Number(process.env.PORT || 3000);
const base = process.env.SUPABASE_URL?.replace(/\/$/, '');
const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
const publicKey = process.env.SUPABASE_PUBLISHABLE_KEY;
let catalogue = null, loadedAt = 0, busy = false, lastTurn = 0, lastViewer = 0, turnCount = 0, decisionError = null;
const joins = new Map();
const choices = [
  { value:'approach', description:'Walk over to greet another nearby pet.' },
  { value:'wave', description:'Wave a friendly hello from here.' },
  { value:'explore', description:'Explore the island independently.' }
];
const send = (res, status, data) => { res.writeHead(status, {'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}); res.end(JSON.stringify(data)); };
async function db(table, method='GET', data) {
  if (!base || !secret) throw Error('Supabase is not configured on the server.');
  const response = await fetch(`${base}/rest/v1/${table}`, {method, headers:{apikey:secret, Authorization:`Bearer ${secret}`,'content-type':'application/json',Prefer:'return=representation'}, body:data === undefined ? undefined : JSON.stringify(data),signal:AbortSignal.timeout(12000)});
  if (!response.ok) throw Error('Shared world is unavailable.');
  return response.json();
}
async function admit(req) {
  if (!base || !secret || !publicKey) return { status:503, error:'Email sign-in is not configured.' };
  const token=(req.headers.authorization||'').match(/^Bearer ([^ ]+)$/)?.[1];
  if (!token) return { status:401, error:'Sign in to enter the island.' };
  const response=await fetch(`${base}/auth/v1/user`,{headers:{apikey:publicKey,Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(12000)});
  if (!response.ok) return { status:401, error:'Your sign-in expired. Please sign in again.' };
  const user=await response.json();
  if (typeof user.id !== 'string' || !user.email_confirmed_at) return { status:401, error:'Please verify your email to enter.' };
  const admitted=await db('rpc/claim_island_slot','POST',{p_user_id:user.id});
  if (admitted!==true) return { status:429, error:'The island is full (50 people). Please try again shortly.' };
  return {status:200};
}
async function pets() {
  if (catalogue && Date.now()-loadedAt < 300000) return catalogue;
  const response = await fetch('https://petdex.dev/api/manifest',{signal:AbortSignal.timeout(12000)});
  if (!response.ok) throw Error('Petdex is unavailable right now.');
  const data = await response.json();
  if (!Array.isArray(data.pets)) throw Error('Petdex returned an unsupported catalogue.');
  catalogue = data.pets.filter(p => typeof p.slug === 'string' && typeof p.spritesheetUrl === 'string' && /^https:\/\/assets\.petdex\.dev\//.test(p.spritesheetUrl)).slice(0,300).map(p=>({slug:p.slug,name:p.displayName || p.slug,credit:p.submittedBy || 'Petdex contributor',sprite:p.spritesheetUrl}));
  loadedAt = Date.now(); return catalogue;
}
async function body(req) {
  let text=''; for await (const chunk of req) { text += chunk; if (text.length > 2048) throw Error('Request is too large.'); }
  try { return JSON.parse(text); } catch { throw Error('Invalid request.'); }
}
async function turn() {
  if (busy || Date.now()-lastTurn < 30000 || Date.now()-lastViewer > 120000 || turnCount >= 30 || !process.env.OPENAI_API_KEY) return;
  busy=true; lastTurn=Date.now();
  try {
    const residents=await db('island_pets?select=*&order=created_at.desc&limit=50');
    if (residents.length < 2) return;
    turnCount++;
    const actor=residents[Math.floor(Math.random()*residents.length)];
    const other=residents.find(p=>p.id!==actor.id);
    const input=`A pet named ${actor.name}, personality: ${actor.personality}, is on a miniature island near ${other.name}, personality: ${other.personality}. Choose its next friendly action.`;
    const response=await fetch('https://api.openai.com/v1/decisions',{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'content-type':'application/json'},body:JSON.stringify({model:'gpt-6-luna',input,questions:[{type:'choice',name:'action',instructions:'Choose what this pet should do next, considering its personality.',choices}]}),signal:AbortSignal.timeout(15000)});
    if (!response.ok) throw Error(`Decisions request failed (${response.status}).`);
    const result=await response.json(); const answer=result.answers?.[0];
    if (answer?.type!=='choice' || !choices.some(c=>c.value===answer.choice)) throw Error('Decisions did not return an action.');
    decisionError=null;
    await db('island_events','POST',{pet_id:actor.id,pet_name:actor.name,other_name:other.name,action:answer.choice,confidence:answer.confidence,context:input});
  } catch (error) { decisionError='A decision could not be completed. The island will try again later.'; console.error('Decision turn:',error.message); }
  finally {busy=false;}
}
const server=createServer(async(req,res)=>{
  try {
    const url=new URL(req.url,'http://localhost');
    if(req.method==='GET' && url.pathname==='/api/config') return send(res,200,{url:base||null,publishableKey:publicKey||null});
    if(req.method==='GET' && url.pathname==='/api/catalogue') return send(res,200,{pets:await pets()});
    if(req.method==='GET' && url.pathname==='/api/sprite') {
      const selected=(await pets()).find(p=>p.slug===url.searchParams.get('slug'));
      if(!selected) return send(res,404,{error:'Pet not found.'});
      const image=await fetch(selected.sprite,{signal:AbortSignal.timeout(12000),redirect:'error'});
      const size=Number(image.headers.get('content-length')||0), type=image.headers.get('content-type')||'';
      if(!image.ok || size>5000000 || !/^image\/(webp|png)/.test(type)) throw Error('Pet image unavailable.');
      const bytes=Buffer.from(await image.arrayBuffer()); if(bytes.length>5000000) throw Error('Pet image too large.');
      res.writeHead(200,{'content-type':type,'cache-control':'public, max-age=3600','x-content-type-options':'nosniff'});return res.end(bytes);
    }
    if(req.method==='GET' && url.pathname==='/api/world') {
      const access=await admit(req); if(access.status!==200) return send(res,access.status,{error:access.error});
      lastViewer=Date.now();
      const [residents,events]=await Promise.all([db('island_pets?select=*&order=created_at.desc&limit=50'),db('island_events?select=*&order=created_at.desc&limit=20')]);
      return send(res,200,{pets:residents,events,decisionsConfigured:Boolean(process.env.OPENAI_API_KEY),decisionError,turnLimitReached:turnCount>=30});
    }
    if(req.method==='POST' && url.pathname==='/api/join') {
      const access=await admit(req); if(access.status!==200) return send(res,access.status,{error:access.error});
      const ip=req.socket.remoteAddress || 'unknown'; const now=Date.now();
      if (now-(joins.get(ip)||0)<15000) return send(res,429,{error:'Please wait a moment before adding another pet.'});
      joins.set(ip,now);
      const data=await body(req); const personality=String(data.personality||'').trim();
      if(personality.length<3||personality.length>120) return send(res,400,{error:'Personality must be 3–120 characters.'});
      const selected=(await pets()).find(p=>p.slug===data.slug); if(!selected) return send(res,400,{error:'Choose a pet from the available catalogue.'});
      const existing=await db('island_pets?select=id&limit=50'); if(existing.length>=50) return send(res,429,{error:'The island is full for this demo.'});
      const created=await db('island_pets','POST',{slug:selected.slug,name:selected.name.slice(0,60),sprite:selected.sprite,credit:String(selected.credit).slice(0,80),personality});
      void turn(); return send(res,201,{pet:created[0]});
    }
    if(req.method!=='GET') return send(res,404,{error:'Not found.'});
    const files={'/':['index.html','text/html; charset=utf-8'],'/app.js':['app.js','text/javascript; charset=utf-8'],'/style.css':['style.css','text/css; charset=utf-8'],'/teacup-kiosk.png':['teacup-kiosk.png','image/png']};
    const file=files[url.pathname]; if(!file) return send(res,404,{error:'Not found.'});
    const contents=await readFile(path.join(root,file[0]));res.writeHead(200,{'content-type':file[1],'x-content-type-options':'nosniff'});res.end(contents);
  } catch(e) { console.error(e.message); send(res,503,{error:e.message==='Invalid request.'?e.message:'The island could not connect to a required service. Please try again.'}); }
});
server.listen(port,()=>console.log(`Pet Island listening on http://localhost:${port}`));
setInterval(()=>void turn(),30000).unref();
