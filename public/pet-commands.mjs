const choices={
 visit_refreshments:[['food','Snack'],['codex_cola','Cola']],
 use_printer:[['pink_dot','Pink dot'],['blue_dot','Blue dot'],['yellow_dot','Yellow dot']]
};
const labels={wave:'Wave',explore:'Explore',visit_refreshments:'Food',take_photo:'Photo',use_printer:'Printer'};
const stationFor={visit_refreshments:'refreshments',take_photo:'photo_wall',use_printer:'printer'};
export function petCommandOptions(world,pet,now=Date.now()){
 if(!pet.canControl)return [];
 const items=world.inventory||[],count=id=>items.filter(i=>i.pet_id===id).length;
 const partners=(world.pets||[]).filter(p=>p.id!==pet.id&&!(Date.parse(p.busy_until)>now));
 return Object.entries(labels).map(([action,label])=>{
  const paired=action==='wave'||action==='take_photo';
  const available=partners.filter(p=>action!=='take_photo'||count(p.id)<12);
  let reason='';
  if(Date.parse(pet.busy_until)>now)reason='Finishing an action';
  else if(paired&&!available.length)reason='No available partner';
  else if(stationFor[action]&&count(pet.id)>=12)reason='Inventory full';
  else if(action==='use_printer'&&items.filter(i=>i.pet_id===pet.id&&i.item_type==='dot').length>=3)reason='Already carrying three dots';
  else if(stationFor[action]){
   const station=(world.stations||[]).find(s=>s.name===stationFor[action]);
   if(!station)reason='Station unavailable';else if(Date.parse(station.busy_until)>now)reason='Station busy';
  }
  return {action,label,reason,partners:paired?available:[],choices:choices[action]||[]};
 });
}

// A lost response may conceal a committed action. Retry the same payload with its original ID.
export function createCommandSender(send){
 const attempts=new Map();
 return async payload=>{
  const key=JSON.stringify(payload);
  let requestId=attempts.get(key);if(!requestId){requestId=crypto.randomUUID();attempts.set(key,requestId);}
  const response=await send({...payload,requestId}),result=await response.json();
  if(!response.ok)throw Error(result.error||'Could not start that action.');
  attempts.delete(key);return result;
 };
}

export function createPetControls({getWorld,now,send,refresh,repaint}){
 let pending=false;
 const submitCommand=createCommandSender(send),messages=new Map();
 const dialog=document.createElement('dialog');dialog.className='command-dialog';
 dialog.setAttribute('aria-labelledby','command-title');document.body.append(dialog);
 function message(text,role='status'){const p=document.createElement('p');p.className='command-note';p.setAttribute('role',role);p.textContent=text;return p;}
 async function execute(pet,action,selection={},errorBox){
  if(pending)return;
  const payload={petId:pet.id,action,...selection};
  pending=true;messages.delete(pet.id);repaint();
  const submit=dialog.querySelector('[type=submit]');if(submit)submit.disabled=true;
  try{
   await submitCommand(payload);
   messages.set(pet.id,'On its way. It will choose its own actions again afterward.');
   // Immediately reserve the visual controls while the refreshed shared state arrives.
   const actor=getWorld().pets.find(p=>p.id===pet.id);if(actor)actor.busy_until=new Date(now()+20000).toISOString();
   dialog.close();await refresh();
  }catch(error){const text=error.message||'Could not connect. Try again.';messages.set(pet.id,text);if(errorBox)errorBox.textContent=text;}
  finally{pending=false;if(submit)submit.disabled=false;repaint();}
 }
 function choose(pet,command){
  if(!command.partners.length&&!command.choices.length){void execute(pet,command.action);return;}
  dialog.replaceChildren();const form=document.createElement('form');
  const close=document.createElement('button');close.type='button';close.className='close';close.textContent='×';close.setAttribute('aria-label','Close action');close.onclick=()=>dialog.close();
  const heading=document.createElement('h2');heading.id='command-title';heading.textContent=`${pet.name} · ${command.label}`;
  const label=document.createElement('label');label.htmlFor='command-choice';label.textContent=command.partners.length?'With whom?':'Choose an item';
  const select=document.createElement('select');select.id='command-choice';
  const options=command.partners.length?command.partners.map(p=>[p.id,p.name]):command.choices;
  for(const [value,text] of options){const option=document.createElement('option');option.value=value;option.textContent=text;select.append(option);}
  const error=message('','alert'),submit=document.createElement('button');submit.type='submit';submit.className='primary wide';submit.textContent='Go';
  form.append(close,heading,label,select,error,submit);dialog.append(form);
  form.onsubmit=event=>{event.preventDefault();void execute(pet,command.action,command.partners.length?{partnerId:select.value}:{outcome:select.value},error);};
  dialog.showModal();
 }
 return {render(pet){
  const section=document.createElement('section');section.className='pet-controls';section.setAttribute('aria-label','Pet controls');
  if(!pet.canControl){section.append(message('Autonomous community pet'));return section;}
  const heading=document.createElement('h3');heading.className='inventory-heading';heading.textContent='Your pet';section.append(heading);
  if(!(Date.parse(pet.busy_until)>now())&&messages.get(pet.id)?.startsWith('On its way'))messages.delete(pet.id);
  const options=petCommandOptions(getWorld(),pet,now()),row=document.createElement('div');row.className='pet-command-buttons';
  for(const command of options){const button=document.createElement('button');button.type='button';button.textContent=command.label;button.disabled=pending||Boolean(command.reason);button.title=command.reason||`Ask ${pet.name} to ${command.label.toLowerCase()}`;button.onclick=()=>choose(pet,command);row.append(button);}
  section.append(row);
  const reasons=[...new Set(options.filter(c=>c.reason).map(c=>c.reason))];
  if(pending)section.append(message('Sending…'));
  else if(messages.has(pet.id))section.append(message(messages.get(pet.id)));
  if(reasons.length)section.append(message(reasons.join(' · ')));
  return section;
 }};
}
