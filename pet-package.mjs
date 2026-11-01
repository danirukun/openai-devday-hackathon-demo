import yauzl from 'yauzl';
import { imageSize } from 'image-size';
import path from 'node:path';

export const MAX_ZIP = 8 * 1024 * 1024;
const MAX_SPRITE = 5 * 1024 * 1024;
const MAX_MANIFEST = 64 * 1024;
export class PetPackageError extends Error {}
const invalid = message => new PetPackageError(message);

export async function parsePetPackage(buffer) {
  if (!Buffer.isBuffer(buffer) || !buffer.length || buffer.length > MAX_ZIP) throw invalid('Choose a ZIP file no larger than 8 MB.');
  const zip = await new Promise((resolve, reject) => yauzl.fromBuffer(buffer, {lazyEntries:true, strictFileNames:true, validateEntrySizes:true}, (err, file) => err ? reject(invalid('Could not open this ZIP file.')) : resolve(file)));
  const files = new Map(); let entries = 0, total = 0;
  try {
    await new Promise((resolve, reject) => {
      let finished = false;
      const fail = error => { if (!finished) { finished = true; reject(error instanceof PetPackageError ? error : invalid('This ZIP is invalid or unsupported.')); } };
      zip.on('error', fail);
      zip.on('end', () => { if (!finished) { finished=true; resolve(); } });
      zip.on('entry', entry => {
        entries++;
        const name=entry.fileName;
        const mode=(entry.externalFileAttributes >>> 16) & 0xf000;
        if (entries > 30 || mode===0xa000 || yauzl.validateFileName(name)) return fail(invalid('The ZIP contains unsafe paths, links, or too many files.'));
        if (/\/$/.test(name)) return zip.readEntry();
        if (files.has(name)) return fail(invalid('The ZIP contains duplicate files.'));
        if (entry.uncompressedSize > MAX_SPRITE || (total += entry.uncompressedSize) > MAX_SPRITE + MAX_MANIFEST) return fail(invalid('The uncompressed pet package is too large.'));
        if (!/\.(json|png|webp)$/i.test(name)) { files.set(name,null); return zip.readEntry(); }
        zip.openReadStream(entry,(error, stream)=>{
          if(error) return fail(error);
          const chunks=[]; let size=0;
          stream.on('data',chunk=>{size+=chunk.length;if(size>MAX_SPRITE){stream.destroy();fail(invalid('The pet image is too large.'));return;} chunks.push(chunk);});
          stream.on('error',fail);
          stream.on('end',()=>{files.set(name,Buffer.concat(chunks));zip.readEntry();});
        });
      });
      zip.readEntry();
    });
  } finally { zip.close(); }
  const manifests=[...files.keys()].filter(name=>path.posix.basename(name)==='pet.json' && !name.startsWith('__MACOSX/'));
  if(manifests.length!==1) throw invalid('The ZIP must contain exactly one pet.json.');
  const manifestBytes=files.get(manifests[0]);
  if(!manifestBytes || manifestBytes.length>MAX_MANIFEST) throw invalid('The pet.json file is missing or too large.');
  let manifest;try { manifest=JSON.parse(manifestBytes.toString('utf8')); } catch { throw invalid('The pet.json file is not valid JSON.'); }
  if(!manifest || typeof manifest!=='object' || Array.isArray(manifest)) throw invalid('The pet.json file is not valid.');
  const name=typeof manifest.displayName==='string'?manifest.displayName.trim():'';
  if(!name || name.length>60) throw invalid('pet.json needs a displayName of 1–60 characters.');
  const spritePath=manifest.spritesheetPath;
  if(typeof spritePath!=='string' || !spritePath || path.posix.isAbsolute(spritePath) || spritePath.includes('\\') || spritePath.split('/').some(p=>p==='..'||p==='.'||!p)) throw invalid('pet.json needs a safe relative spritesheetPath.');
  const imagePath=path.posix.join(path.posix.dirname(manifests[0]),spritePath);
  const image=files.get(imagePath);
  if(!image || image.length>MAX_SPRITE) throw invalid('The spritesheet named in pet.json is missing or too large.');
  let dimensions;try { dimensions=imageSize(image); } catch { throw invalid('The spritesheet must be a valid PNG or WebP image.'); }
  if(!['png','webp'].includes(dimensions.type) || dimensions.width!==1536 || ![1872,2288].includes(dimensions.height)) throw invalid('The spritesheet must be PNG or WebP, 1536×1872 or 1536×2288 pixels.');
  return {name,image,contentType:`image/${dimensions.type}`};
}
