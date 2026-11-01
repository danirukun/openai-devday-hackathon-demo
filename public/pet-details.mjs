// Inventory records are public world data. A key is present only for dots.
export function formatInventory(items,petId){
  const labels={photo:'photo',portrait:'portrait ready to plot',food:'food',codex_cola:'Codex Cola'};
  return items.filter(item=>item.pet_id===petId).map(item=>item.item_type==='dot' ? (typeof item.item_key==='string'&&item.item_key ? item.item_key.replaceAll('_',' ') : 'dot') : (labels[item.item_type]||'item')).join(', ');
}
