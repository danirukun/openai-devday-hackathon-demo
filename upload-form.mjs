import Busboy from 'busboy';
import { MAX_ZIP, PetPackageError } from './pet-package.mjs';

export function readUploadForm(req) {
  return new Promise((resolve,reject)=>{
    let parser;
    try { parser=Busboy({headers:req.headers,limits:{fileSize:MAX_ZIP,files:2,fields:2,parts:3,fieldSize:512}}); }
    catch { reject(new PetPackageError('Choose a ZIP file to upload.')); return; }
    let zip=null, personality='', error=null, fileCount=0, fieldCount=0;
    const fail = message => { error ||= new PetPackageError(message); };
    parser.on('file',(name,stream)=>{
      if(++fileCount>1 || name!=='petZip') fail('Choose one pet ZIP file.');
      const chunks=[];let length=0;
      stream.on('limit',()=>fail('Choose a ZIP file no larger than 8 MB.'));
      stream.on('data',chunk=>{length+=chunk.length;if(length<=MAX_ZIP)chunks.push(chunk);});
      stream.on('end',()=>{zip=Buffer.concat(chunks);});
      stream.on('error',()=>fail('Could not read the ZIP file.'));
    });
    parser.on('field',(name,value,info)=>{if(++fieldCount>1||name!=='personality'||info.valueTruncated)fail('Personality must be 3–120 characters.');else personality=value.trim();});
    parser.on('filesLimit',()=>fail('Choose one pet ZIP file.'));
    parser.on('fieldsLimit',()=>fail('The upload form has too many fields.'));
    parser.on('partsLimit',()=>fail('The upload form has too many fields.'));
    parser.on('error',()=>reject(new PetPackageError('Could not read the upload form.')));
    req.on('aborted',()=>reject(new PetPackageError('The upload was interrupted.')));
    parser.on('close',()=>{if(error)return reject(error);if(!zip?.length)return reject(new PetPackageError('Choose a pet ZIP file.'));if(personality.length<3||personality.length>120)return reject(new PetPackageError('Personality must be 3–120 characters.'));resolve({zip,personality});});
    req.pipe(parser);
  });
}
