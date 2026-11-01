// Inventory records are public world data. A key is present only for dots.
export function formatInventory(items,petId){
  const labels={photo:'photo',portrait:'portrait ready to plot',food:'food',codex_cola:'Codex Cola'};
  return items.filter(item=>item.pet_id===petId).map(item=>item.item_type==='dot' ? (typeof item.item_key==='string'&&item.item_key ? item.item_key.replaceAll('_',' ') : 'dot') : (labels[item.item_type]||'item')).join(', ');
}

// Keep different dot colours separate while grouping identical items.
export function groupInventory(items,petId){
  const labels={photo:'Photo',portrait:'Portrait',food:'Food',codex_cola:'Codex Cola',pink_dot:'Pink dot',blue_dot:'Blue dot',yellow_dot:'Yellow dot',dot:'Dot'};
  const groups=new Map();
  for(const item of items){
    if(item.pet_id!==petId)continue;
    const key=item.item_type==='dot' && ['pink_dot','blue_dot','yellow_dot'].includes(item.item_key)?item.item_key:(item.item_type==='dot'?'dot':item.item_type);
    const safeKey=Object.hasOwn(labels,key)?key:'other';
    if(!groups.has(safeKey))groups.set(safeKey,{key:safeKey,label:labels[safeKey]||'Item',count:0});
    groups.get(safeKey).count++;
  }
  return [...groups.values()];
}
