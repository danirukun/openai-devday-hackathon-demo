import {test} from 'node:test';
import assert from 'node:assert/strict';
import {controlIdentity,readControlHash,parsePetCommand} from '../pet-control.mjs';
const pet='00000000-0000-4000-8000-00000000000a',other='00000000-0000-4000-8000-00000000000b',request='00000000-0000-4000-8000-00000000000c';
test('control cookies survive new helpers and never use caller supplied identifiers',()=>{
 const a=controlIdentity({headers:{}},{secure:true}),b=controlIdentity({headers:{}});
 assert.notEqual(a.hash,b.hash);assert.match(a.cookie,/HttpOnly; SameSite=Strict; Max-Age=604800; Secure/);
 const req={headers:{cookie:a.cookie}};assert.equal(readControlHash(req),a.hash);assert.equal(controlIdentity(req).cookie,null);
 assert.equal(readControlHash({headers:{cookie:'neodots_control=made-up'}}),null);
 assert.ok(!a.cookie.includes(a.hash));
});
test('commands accept only the supported shapes and explicit choices',()=>{
 assert.deepEqual(parsePetCommand({petId:pet,requestId:request,action:'explore'}),{petId:pet,requestId:request,action:'explore',partnerId:null,outcome:null});
 assert.equal(parsePetCommand({petId:pet,requestId:request,action:'take_photo',partnerId:other}).partnerId,other);
 for(const payload of [{action:'move'},{action:'wave',partnerId:pet},{action:'wave'},{action:'explore',partnerId:other},{action:'visit_refreshments',outcome:'pizza'},{action:'use_printer',outcome:'pink_dot',petId:'bad'},null]){
  assert.throws(()=>parsePetCommand(payload&&{petId:pet,requestId:request,...payload}));
 }
});
