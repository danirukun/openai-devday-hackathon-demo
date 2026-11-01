import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {readUploadForm} from '../upload-form.mjs';
import {PetPackageError} from '../pet-package.mjs';
function request(form){const req=new Request('http://localhost/',{method:'POST',body:form});const stream=Readable.fromWeb(req.body);stream.headers=Object.fromEntries(req.headers);return stream}
test('accepts one ZIP file and one personality field',async()=>{const f=new FormData();f.set('petZip',new Blob(['PK test']), 'pet.zip');f.set('personality','Friendly explorer');const result=await readUploadForm(request(f));assert.equal(result.zip.toString(),'PK test');assert.equal(result.personality,'Friendly explorer')});
test('rejects duplicate file parts',async()=>{const f=new FormData();f.append('petZip',new Blob(['a']),'a.zip');f.append('petZip',new Blob(['b']),'b.zip');f.append('personality','Friendly');await assert.rejects(()=>readUploadForm(request(f)),PetPackageError)});
