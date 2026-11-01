import { dots, printerAction, printerAvailable, validateAnswers } from './printer.mjs';
const choices = [
  {value:'approach',description:'Walk over to greet another nearby pet.'},
  {value:'wave',description:'Wave a friendly hello from here.'},
  {value:'explore',description:'Explore the island independently.'}
];
// Scheduling and API credentials remain in the production server, never in this function.
export async function runTurn({db, requestDecision, now=Date.now, chooseActor=Math.random, onRequest=()=>{}}) {
  const residents=await db('island_pets?select=*&order=created_at.desc&limit=50');
  if(!residents.length) return false;
  const actor=residents[Math.floor(chooseActor()*residents.length)];
  const other=residents.find(p=>p.id!==actor.id);
  const [items,stations]=await Promise.all([db('island_inventory?select=pet_id,item_type,item_key&limit=600'),db('island_stations?select=name,busy_until&name=eq.printer')]);
  const baseChoices=other?choices:choices.filter(choice=>choice.value==='explore');
  const offered=printerAvailable(actor.id,items,stations[0]?.busy_until,now())?[...baseChoices,printerAction]:baseChoices;
  if(offered.length<2) return false;
  const questions=[{type:'choice',name:'action',instructions:'Choose what this pet should do next, considering its personality.',choices:offered}];
  if(offered.includes(printerAction)) questions.push({type:'choice',name:'dot',instructions:'Choose the dot figure that best suits this pet, based on its personality.',choices:dots});
  const input=`A pet named ${actor.name}, personality: ${actor.personality}, is on a miniature island${other ? ` near ${other.name}, personality: ${other.personality}` : ' alone'}. Choose its next friendly action.`;
  onRequest();
  const result=await requestDecision({model:'gpt-6-luna',input,questions});
  const {action:answer,dot}=validateAnswers(result.answers,offered);
  if(dot) await db('rpc/save_printer_action','POST',{p_pet_id:actor.id,p_other_name:other?.name||'',p_confidence:answer.confidence,p_context:input,p_outcome:dot});
  else await db('island_events','POST',{pet_id:actor.id,pet_name:actor.name,other_name:other?.name||'',action:answer.choice,confidence:answer.confidence,context:input});
  return true;
}
