// Roaming is presentation-only: the server's recorded Decisions remain authoritative.
const STEP_MS=12000, MOVE_FRACTION=.66;
function hash(text){let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function waypoint(id,step,home,radius){const x=hash(`${id}:${step}:x`)/4294967295*2-1,z=hash(`${id}:${step}:z`)/4294967295*2-1;return {x:home.x+x*radius,z:home.z+z*radius}}
function smooth(t){const v=Math.max(0,Math.min(1,t));return v*v*(3-2*v)}
export function roamPosition(id,home,timeMs,radius=.55){const clock=timeMs+hash(id)%STEP_MS,step=Math.floor(clock/STEP_MS),phase=(clock-step*STEP_MS)/STEP_MS;const from=waypoint(id,step,home,radius),to=waypoint(id,step+1,home,radius),t=smooth(phase/MOVE_FRACTION);return {x:from.x+(to.x-from.x)*t,z:from.z+(to.z-from.z)*t}}
export function actionWeight(eventTime,timeMs){const elapsed=timeMs-eventTime;if(!Number.isFinite(elapsed)||elapsed<0||elapsed>=20000)return 0;return Math.min(smooth(elapsed/3000),smooth((20000-elapsed)/3000))}
export function blendPosition(from,to,weight){return {x:from.x+(to.x-from.x)*weight,z:from.z+(to.z-from.z)*weight}}

export function waveWeight(event,timeMs){return event?.action==='wave'?actionWeight(Date.parse(event.created_at),timeMs):0}
