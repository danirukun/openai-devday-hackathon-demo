export const dots = [
  {value:'pink_dot', description:'A pink dot with a cheerful smile.'},
  {value:'blue_dot', description:'A blue dot with a curious expression.'},
  {value:'yellow_dot', description:'A yellow dot with a calm expression.'}
];
export const printerAction = {value:'use_printer', description:'Visit the 3D printer and print a small dot figure.'};
export function printerAvailable(actorId, items, busyUntil, now=Date.now()) {
  const owned=items.filter(item=>item.pet_id===actorId);
  return !(busyUntil && Date.parse(busyUntil)>now) && owned.length<12 && owned.filter(item=>item.item_type==='dot').length<3;
}
export function validateAnswers(answers, offered) {
  const action=answers?.find(answer=>answer.name==='action');
  if(action?.type!=='choice'||!offered.some(choice=>choice.value===action.choice)) throw Error('Decisions returned an invalid action.');
  if(action.choice==='use_printer') {
    const dot=answers?.find(answer=>answer.name==='dot');
    if(dot?.type!=='choice'||!dots.some(choice=>choice.value===dot.choice)) throw Error('Decisions returned an invalid dot.');
    return {action, dot:dot.choice};
  }
  return {action, dot:null};
}
