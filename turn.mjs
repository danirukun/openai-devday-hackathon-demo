import {withNeeds} from './needs.mjs';
import { offeredActions, decisionQuestions, validateDecision, describeHistory, describeInventory, checkMessage, stationFor, pairedActions } from './actions.mjs';

// Scheduling and API credentials remain in the production server, never in this function.
// `generateMessage` and `moderateMessage` are optional; without them (or `messageModel`), messages are not offered.
export async function runTurn({db, requestDecision, generateMessage, moderateMessage, messageModel, now=Date.now, chooseActor=Math.random, choosePartner=Math.random, onRequest=()=>{}}) {
  const time=now(), cutoff=new Date(time-20000).toISOString();
  const [residents,recent]=await Promise.all([
    db('island_pets?select=*&order=created_at.desc&limit=50'),
    db(`island_events?select=pet_id,other_pet_id,action,created_at&created_at=gte.${encodeURIComponent(cutoff)}&order=created_at.desc&limit=1000`)
  ]);
  const busy=new Set();
  for(const event of recent){
    const age=time-Date.parse(event.created_at);
    if(!stationFor[event.action]||!Number.isFinite(age)||age<0||age>=20000) continue;
    busy.add(event.pet_id);
    if(event.action==='take_photo'&&event.other_pet_id) busy.add(event.other_pet_id);
  }
  const available=await withNeeds(db,residents.filter(pet=>!busy.has(pet.id)&&!(Date.parse(pet.busy_until)>time)));
  if(!available.length) return false;
  const actor=available[Math.floor(chooseActor()*available.length)];
  const others=available.filter(p=>p.id!==actor.id);
  const partner=others.length?others[Math.floor(choosePartner()*others.length)]:null;
  const [items,stations,history]=await Promise.all([
    db('island_inventory?select=pet_id,item_type,item_key&limit=600'),
    db('island_stations?select=name,busy_until'),
    db(`island_events?select=pet_id,pet_name,other_name,other_pet_id,action,outcome,created_at&or=(pet_id.eq.${actor.id},other_pet_id.eq.${actor.id})&order=created_at.desc&limit=6`)
  ]);
  const messagesEnabled=Boolean(generateMessage&&moderateMessage&&messageModel);
  const offered=offeredActions({actor,partner,items,stations,history,now:time,messagesEnabled});
  if(offered.length<2) return false;
  const input=[
    `Pet: ${actor.name}. Personality: ${actor.personality}.`,
    partner?`Nearby pet: ${partner.name}. Personality: ${partner.personality}.`:'No other pets are nearby.',
    `Needs (10–100): ${JSON.stringify(actor.needs)}. Mood: ${actor.mood}.`,
    partner?`Partner needs: ${JSON.stringify(partner.needs)}. Mood: ${partner.mood}.`:'',
    `Recent activity, newest first: ${describeHistory(history,actor)}`,
    `${actor.name} is carrying: ${describeInventory(items,actor.id)}.`,
    `Choose what ${actor.name} does next at the hackathon venue. Consider its personality and recent activity, and prefer variety over repeating the same thing.`
  ].join('\n');
  onRequest();
  const result=await requestDecision({model:'gpt-6-luna',input,questions:decisionQuestions(offered)});
  const {action:answer,outcome}=validateDecision(result.answers,offered);
  const choice=answer.choice;
  let message=null;
  if(choice==='send_message') {
    message=checkMessage(await generateMessage({sender:actor,recipient:partner,tone:outcome}));
    if(await moderateMessage(message)) throw Error('The message failed moderation.');
  }
  try{await db('rpc/save_pet_turn','POST',{p_action:choice,p_pet_id:actor.id,p_other_pet_id:pairedActions.has(choice)?partner.id:null,p_confidence:answer.confidence,p_context:input,p_outcome:outcome,p_message:message,p_message_model:message?messageModel:null});}catch(error){if(error.code==='55P03')return false;throw error;}
  return true;
}
