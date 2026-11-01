import {randomBytes,createHash} from 'node:crypto';
const cookieName='neodots_control';
function tokenFrom(req){const token=(req.headers.cookie||'').split(';').map(p=>p.trim()).find(p=>p.startsWith(`${cookieName}=`))?.slice(cookieName.length+1);return /^[a-f0-9]{64}$/.test(token||'')?token:null;}
const digest=token=>createHash('sha256').update(token).digest('hex');
export function readControlHash(req){const token=tokenFrom(req);return token?digest(token):null;}
export function controlIdentity(req,{secure=false}={}){
 const existing=tokenFrom(req);if(existing)return {hash:digest(existing),cookie:null};
 const token=randomBytes(32).toString('hex');
 return {hash:digest(token),cookie:`${cookieName}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800${secure?'; Secure':''}`};
}
const uuid=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const paired=new Set(['wave','take_photo']);
const choices={visit_refreshments:['food','codex_cola'],use_printer:['pink_dot','blue_dot','yellow_dot']};
export function parsePetCommand(data){
 if(!data||typeof data!=='object'||Array.isArray(data)||!uuid(data.petId)||!uuid(data.requestId)||!['wave','explore','visit_refreshments','take_photo','use_printer'].includes(data.action))throw Error('Choose a valid pet action.');
 const {petId,requestId,action}=data,partnerId=data.partnerId??null,outcome=data.outcome??null;
 if(paired.has(action)?!uuid(partnerId)||partnerId.toLowerCase()===petId.toLowerCase():partnerId!==null)throw Error('Choose another pet for this action.');
 if(choices[action]?!choices[action].includes(outcome):outcome!==null)throw Error('Choose a valid item.');
 return {petId,requestId,action,partnerId,outcome};
}
export function commandFailure(error){
 if(error.code==='42501')return {status:403,error:'You can only control pets added from this browser.'};
 if(error.code==='22023')return {status:400,error:'Choose a valid pet action.'};
 if(error.code==='55P03')return {status:409,error:'That pet is finishing an action. Try again shortly.'};
 if(error.code==='P0001')return {status:409,error:'The station or pet is unavailable, or its inventory is full. Choose another action.'};
 return null;
}
