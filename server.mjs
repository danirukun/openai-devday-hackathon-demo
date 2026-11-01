import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { parsePetPackage, PetPackageError } from './pet-package.mjs';
import { readUploadForm } from './upload-form.mjs';
import { runTurn } from './turn.mjs';
import { createSessions, isSameOrigin } from './session.mjs';

const root = fileURLToPath(new URL('./public/', import.meta.url));
const port = Number(process.env.PORT || 3000);
const base = process.env.SUPABASE_URL?.replace(/\/$/, '');
const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
const sharedPassword = process.env.ISLAND_PASSWORD;
const sessions = createSessions(sharedPassword || '', {secure:process.env.COOKIE_SECURE === 'true'});
let catalogue = null, loadedAt = 0, busy = false, lastTurn = 0, lastViewer = 0, turnCount = 0, decisionError = null;
const joins = new Map();
const send = (res, status, data, headers={}) => { res.writeHead(status, {'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff',...headers}); res.end(JSON.stringify(data)); };
async function db(table, method='GET', data) {
  if (!base || !secret) throw Error('Supabase is not configured on the server.');
  const response = await fetch(`${base}/rest/v1/${table}`, {method, headers:{apikey:secret, Authorization:`Bearer ${secret}`,'content-type':'application/json',Prefer:'return=representation'}, body:data === undefined ? undefined : JSON.stringify(data),signal:AbortSignal.timeout(12000)});
  if (!response.ok) throw Error('Shared world is unavailable.');
  return response.json();
}
async function admit(req) {
  if (!sharedPassword) return {status:503, error:'The shared password is not configured.'};
  const session=sessions.get(req);
  if(!session) return {status:401, error:'Enter the shared password to join.'};
  const admitted=await db('rpc/claim_island_slot','POST',{p_user_id:session.id});
  if (admitted!==true) return {status:429, error:'The island is full (50 people). Please try again shortly.'};
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
    const completed=await runTurn({db,onRequest:()=>{turnCount++},requestDecision:async payload=>{
      const response=await fetch('https://api.openai.com/v1/decisions',{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'content-type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(15000)});
      if(!response.ok) throw Error(`Decisions request failed (${response.status}).`);
      return response.json();
    }});
    if(!completed) return;
    decisionError=null;
  } catch (error) { decisionError='A decision could not be completed. The island will try again later.'; console.error('Decision turn:',error.message); }
  finally {busy=false;}
}
const server=createServer(async(req,res)=>{
  try {
    const url=new URL(req.url,'http://localhost');
    if(req.method!=='GET' && !isSameOrigin(req)) return send(res,403,{error:'Invalid request origin.'});
    if(req.method==='GET' && url.pathname==='/api/session') return send(res,200,{signedIn:Boolean(sessions.get(req))});
    if(req.method==='POST' && url.pathname==='/api/login') {
      if(!sharedPassword) return send(res,503,{error:'The shared password is not configured.'});
      if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||'')) return send(res,415,{error:'Invalid request.'});
      const data=await body(req), ip=req.socket.remoteAddress || 'unknown';
      const match=sessions.authenticate(data.password,ip);
      if(match==='limited') return send(res,429,{error:'Too many attempts. Please try again later.'});
      if(!match) return send(res,401,{error:'That password is not correct.'});
      const existing=sessions.get(req);
      if(existing) {const access=await admit(req);return access.status===200?send(res,200,{signedIn:true}):send(res,access.status,{error:access.error});}
      const created=sessions.create();
      try {
        const admitted=await db('rpc/claim_island_slot','POST',{p_user_id:created.session.id});
        if(!admitted) {sessions.clear({headers:{cookie:created.cookie}});return send(res,429,{error:'The island is full (50 people). Please try again shortly.'});}
      } catch(error) {sessions.clear({headers:{cookie:created.cookie}});throw error;}
      return send(res,200,{signedIn:true},{'set-cookie':created.cookie});
    }
    if(req.method==='POST' && url.pathname==='/api/logout') {
      const cleared=sessions.clear(req);
      if(cleared.session) await db(`island_presence?user_id=eq.${cleared.session.id}`,'DELETE').catch(()=>{});
      return send(res,200,{signedIn:false},{'set-cookie':cleared.cookie});
    }
    if(req.method==='GET' && url.pathname==='/api/catalogue') return send(res,200,{pets:await pets()});
    if(req.method==='GET' && url.pathname==='/api/sprite') {
      const slug=url.searchParams.get('slug') || '';
      if (/^upload-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(slug)) {
        const images=await db(`island_uploaded_sprites?select=content_type,data&id=eq.${slug.slice(7)}&limit=1`);
        if(!images.length) return send(res,404,{error:'Pet not found.'});
        const {content_type,data}=images[0];
        if(typeof data!=='string'||!data.startsWith('\\x')||!['image/png','image/webp'].includes(content_type)) throw Error('Uploaded sprite unavailable.');
        const bytes=Buffer.from(data.slice(2),'hex');
        res.writeHead(200,{'content-type':content_type,'cache-control':'public, max-age=3600','x-content-type-options':'nosniff'});return res.end(bytes);
      }
      const selected=(await pets()).find(p=>p.slug===slug);
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
      const [residents,events,inventory,stations]=await Promise.all([db('island_pets?select=*&order=created_at.desc&limit=50'),db('island_events?select=*&order=created_at.desc&limit=20'),db('island_inventory?select=pet_id,item_type,item_key,created_at&order=created_at.desc&limit=600'),db('island_stations?select=name,busy_until&name=eq.printer')]);
      return send(res,200,{pets:residents,events,inventory,stations,decisionsConfigured:Boolean(process.env.OPENAI_API_KEY),decisionError,turnLimitReached:turnCount>=30});
    }
    if(req.method==='POST' && url.pathname==='/api/join-upload') {
      const access=await admit(req); if(access.status!==200) return send(res,access.status,{error:access.error});
      const ip=req.socket.remoteAddress || 'unknown'; const now=Date.now();
      if(now-(joins.get(ip)||0)<15000) return send(res,429,{error:'Please wait a moment before adding another pet.'});
      joins.set(ip,now);
      const {zip,personality}=await readUploadForm(req);
      const pet=await parsePetPackage(zip);
      const existing=await db('island_pets?select=id&limit=50');
      if(existing.length>=50) return send(res,429,{error:'The island is full for this demo.'});
      const id=randomUUID();
      await db('island_uploaded_sprites?select=id','POST',{id,content_type:pet.contentType,data:'\\x'+pet.image.toString('hex')});
      try {
        const created=await db('island_pets','POST',{slug:`upload-${id}`,name:pet.name,sprite:`island-upload://${id}`,credit:'Uploaded by a visitor',personality});
        void turn(); return send(res,201,{pet:created[0]});
      } catch(error) {
        await db(`island_uploaded_sprites?id=eq.${id}`,'DELETE').catch(()=>{});
        throw error;
      }
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
    const files={'/':['index.html','text/html; charset=utf-8'],'/app.js':['app.js','text/javascript; charset=utf-8'],'/style.css':['style.css','text/css; charset=utf-8'],'/teacup-kiosk.png':['teacup-kiosk.png','image/png'],'/venue.glb':['venue.glb','model/gltf-binary']};
    const file=files[url.pathname]; if(!file) return send(res,404,{error:'Not found.'});
    let contents;try{contents=await readFile(path.join(root,file[0]))}catch(error){if(error.code==='ENOENT')return send(res,404,{error:'Not found.'});throw error}res.writeHead(200,{'content-type':file[1],'x-content-type-options':'nosniff'});res.end(contents);
  } catch(e) { if(e instanceof PetPackageError) return send(res,400,{error:e.message}); console.error(e.message); send(res,503,{error:e.message==='Invalid request.'?e.message:'The island could not connect to a required service. Please try again.'}); }
});
server.listen(port,()=>console.log(`Pet Island listening on http://localhost:${port}`));
setInterval(()=>void turn(),30000).unref();
