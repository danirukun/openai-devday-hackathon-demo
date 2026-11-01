// Roaming is presentation-only: the server's recorded Decisions remain authoritative.
const STEP_MS=12000, MOVE_FRACTION=.66;
function hash(text){let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function waypoint(id,step,home,radius){const x=hash(`${id}:${step}:x`)/4294967295*2-1,z=hash(`${id}:${step}:z`)/4294967295*2-1;return {x:home.x+x*radius,z:home.z+z*radius}}
function smooth(t){const v=Math.max(0,Math.min(1,t));return v*v*(3-2*v)}
export function roamPosition(id,home,timeMs,radius=.55){const clock=timeMs+hash(id)%STEP_MS,step=Math.floor(clock/STEP_MS),phase=(clock-step*STEP_MS)/STEP_MS;const from=waypoint(id,step,home,radius),to=waypoint(id,step+1,home,radius),t=smooth(phase/MOVE_FRACTION);return {x:from.x+(to.x-from.x)*t,z:from.z+(to.z-from.z)*t}}
export function actionWeight(eventTime,timeMs){const elapsed=timeMs-eventTime;if(!Number.isFinite(elapsed)||elapsed<0||elapsed>=20000)return 0;return Math.min(smooth(elapsed/3000),smooth((20000-elapsed)/3000))}
export function blendPosition(from,to,weight){return {x:from.x+(to.x-from.x)*weight,z:from.z+(to.z-from.z)*weight}}

export function waveWeight(event,timeMs){return event?.action==='wave'?actionWeight(Date.parse(event.created_at),timeMs):0}
export function bubbleWeight(event,timeMs){return event?.action==='send_message'&&event.message?actionWeight(Date.parse(event.created_at),timeMs):0}
// Placeholder floor spots where a pet stands at each station until the venue supplies anchors.
export const stationSpots={printer:{x:-1.8,z:1.45},photo_wall:{x:-2.3,z:-1.5},plotter:{x:1.2,z:-1.9},refreshments:{x:2.6,z:1.2}};
export const venueStationSpots={printer:{x:-.1,z:-1.45},photo_wall:{x:-.8,z:-1.4},plotter:{x:1.2,z:-1.9},refreshments:{x:0,z:1.95}};
// Keep venue homes within the two narrow floor areas. Each pet gets a stable slot.
export function venueHome(index){
  const initial=[{x:0,z:-2.7},{x:0,z:1.45},{x:0,z:-.45}];
  if(index<initial.length)return initial[index];
  const n=index-initial.length, column=n%3, row=Math.floor(n/3);
  return {x:(column-1)*.48,z:-3.45+row*.48};
}
export const actionStations={use_printer:'printer',take_photo:'photo_wall',use_plotter:'plotter',visit_refreshments:'refreshments'};
export function photoPartnerSpot(spots=stationSpots){const spot=spots.photo_wall;return {x:spot.x+.55,z:spot.z-.55}}
// Photo-wall timeline from the event's own timestamp, so every browser (and a refresh) shows the same moment.
// Pets arrive over the first 3s, the flash fires at about 3.4s, the printed photo pops up, holds, then fades.
const PHOTO_FLASH_AT=3400, PHOTO_FLASH_HALF=350, PHOTO_SHOWN_AT=3600, PHOTO_POP_MS=700, PHOTO_FADE_AT=14000, PHOTO_END=16000;
export function photoShot(event,timeMs){
  const none={flash:0,photo:0,pop:0};
  if(event?.action!=='take_photo')return none;
  const t=timeMs-Date.parse(event.created_at);
  if(!Number.isFinite(t)||t<0||t>=PHOTO_END)return none;
  const flash=Math.max(0,1-Math.abs(t-PHOTO_FLASH_AT)/PHOTO_FLASH_HALF);
  if(t<PHOTO_SHOWN_AT)return {flash,photo:0,pop:0};
  return {flash,photo:t<PHOTO_FADE_AT?1:(PHOTO_END-t)/(PHOTO_END-PHOTO_FADE_AT),pop:smooth((t-PHOTO_SHOWN_AT)/PHOTO_POP_MS)};
}
