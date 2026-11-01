import { randomBytes, randomUUID, timingSafeEqual, createHash } from 'node:crypto';

const lifetime = 8 * 60 * 60 * 1000;
const windowMs = 10 * 60 * 1000;
export function createSessions(password, {secure=false, now=Date.now}={}) {
  const sessions = new Map(), attempts = new Map();
  const hash = value => createHash('sha256').update(value).digest();
  function cookie(token, age) { return `pet_island_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${secure?'; Secure':''}`; }
  function get(req) {
    const value=(req.headers.cookie||'').split(';').map(part=>part.trim()).find(part=>part.startsWith('pet_island_session='))?.slice('pet_island_session='.length);
    if(!value || !/^[a-f0-9]{64}$/.test(value)) return null;
    const session=sessions.get(value);
    if(!session || session.expires<=now()){sessions.delete(value);return null;}
    return {token:value,...session};
  }
  function authenticate(candidate, ip) {
    const time=now();
    for(const [key,entry] of attempts) if(entry.until<=time) attempts.delete(key);
    let entry=attempts.get(ip);
    if(entry && entry.count>=10) return 'limited';
    if(!entry){entry={count:0,until:time+windowMs};attempts.set(ip,entry);}
    entry.count++;
    if(typeof candidate!=='string' || !timingSafeEqual(hash(candidate),hash(password))) return false;
    attempts.delete(ip); return true;
  }
  function create() {
    const time=now();
    for(const [token,session] of sessions) if(session.expires<=time) sessions.delete(token);
    const token=randomBytes(32).toString('hex'), session={id:randomUUID(),expires:time+lifetime};
    sessions.set(token,session);return {session, cookie:cookie(token,lifetime/1000)};
  }
  return {get,authenticate,create,clear(req){const session=get(req);if(session)sessions.delete(session.token);return {session,cookie:cookie('',0)}}};
}
export function isSameOrigin(req) {
  if(req.headers['sec-fetch-site']==='cross-site') return false;
  const origin=req.headers.origin;
  if(!origin) return true;
  try { return new URL(origin).host===req.headers.host && ['http:','https:'].includes(new URL(origin).protocol); } catch { return false; }
}
