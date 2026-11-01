from pathlib import Path
from PIL import Image, ImageDraw
from concurrent.futures import ThreadPoolExecutor
import subprocess, hashlib, json, io
root=Path(__file__).resolve().parents[2]
out=Path(__file__).resolve().parent
files=sorted((root/'reference-images').glob('IMG_*'))
def work(p):
    dst=out/'thumbs'/(p.stem+'.jpg')
    if not dst.exists():
        raw=subprocess.run(['ffmpeg','-nostdin','-v','error','-i',str(p),'-frames:v','1','-c:v','png','-f','image2pipe','-'],check=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE).stdout
        im=Image.open(io.BytesIO(raw)).convert('RGB'); im.thumbnail((480,360)); im.save(dst,quality=90)
    return {'image':p.name,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'thumbnail':str(dst.relative_to(out))}
with ThreadPoolExecutor(max_workers=4) as pool: records=list(pool.map(work,files))
for start in range(0,len(records),16):
    rows=records[start:start+16]; sheet=Image.new('RGB',(4*480,4*390),'#f2f2f2'); d=ImageDraw.Draw(sheet)
    for i,row in enumerate(rows):
        im=Image.open(out/row['thumbnail']); im.thumbnail((480,360)); x=(i%4)*480; y=(i//4)*390
        sheet.paste(im,(x,y+22)); d.text((x+5,y+3),row['image'],fill='black')
    sheet.save(out/'sheets'/('sheet-%02d.jpg'%(start//16+1)),quality=88)
(out/'sources.json').write_text(json.dumps(records,indent=2)+'\n')
print('Contact sheets:',len(records),'images in',(len(records)+15)//16,'sheets')
