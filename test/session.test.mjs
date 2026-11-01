import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createSessions,isSameOrigin} from '../session.mjs';
test('session cookies are random, HTTP-only, expire and can be cleared',()=>{
  let clock=0; const store=createSessions('test-password',{secure:true,now:()=>clock});
  assert.equal(store.authenticate('wrong','one'),false);
  assert.equal(store.authenticate('test-password','one'),true);
  const a=store.create(), b=store.create();assert.notEqual(a.cookie,b.cookie);
  assert.match(a.cookie,/HttpOnly; SameSite=Strict; Max-Age=28800; Secure/);
  const req={headers:{cookie:a.cookie}};assert.equal(store.get(req).id,a.session.id);
  assert.equal(store.clear(req).session.id,a.session.id);assert.equal(store.get(req),null);
  const req2={headers:{cookie:b.cookie}};clock=8*60*60*1000;assert.equal(store.get(req2),null);
});
test('login attempts are limited and cross-site mutations rejected',()=>{
  const s=createSessions('correct');for(let i=0;i<10;i++)assert.equal(s.authenticate('wrong','one'),false);
  assert.equal(s.authenticate('correct','one'),'limited');assert.equal(s.authenticate('correct','two'),true);
  assert.equal(isSameOrigin({headers:{host:'example.com',origin:'https://evil.test'}}),false);
  assert.equal(isSameOrigin({headers:{host:'example.com',origin:'https://example.com'}}),true);
  assert.equal(isSameOrigin({headers:{host:'example.com','sec-fetch-site':'cross-site'}}),false);
});
