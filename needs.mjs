export async function withNeeds(db,pets){
 if(!pets.length)return pets;
 const states=await db('rpc/project_pet_needs','POST',{p_pet_ids:pets.map(p=>p.id)});
 return pets.map(p=>{const state=states.find(s=>s.pet_id===p.id);if(!state)throw Error('Pet state unavailable.');const {fullness,energy,fun,social,as_of,mood}=state;return {...p,needs:{fullness,energy,fun,social,asOf:as_of},mood}});
}
