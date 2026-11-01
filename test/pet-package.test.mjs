import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parsePetPackage,PetPackageError} from '../pet-package.mjs';
const fixture = name => readFile(new URL(`./fixtures/${name}.zip`,import.meta.url));
test('accepts nested v1 and root v2 Codex pet packages',async()=>{for(const name of ['valid','v2']){const result=await parsePetPackage(await fixture(name));assert.equal(result.name,'Test Pet');assert.equal(result.contentType,'image/png');assert.ok(result.image.length>0)}});
test('rejects invalid dimensions, missing sprites, unsafe paths and oversized output',async()=>{for(const name of ['wrong-size','missing-image','unsafe','oversized'])await assert.rejects(()=>fixture(name).then(parsePetPackage),PetPackageError)});
test('rejects non-ZIP input',async()=>assert.rejects(()=>parsePetPackage(Buffer.from('not a zip')),PetPackageError));
