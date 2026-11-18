import {BLOOD_GROUPS} from './hospitalUtils';

export const groupHospitalStock=batches=>BLOOD_GROUPS.map(bloodGroup=>{
  const items=batches.filter(b=>b.bloodGroup===bloodGroup);
  const total=key=>items.reduce((sum,b)=>sum+Number(b[key]||0),0);
  const expiry=items.filter(b=>Number(b.availableUnits)>0&&b.expiryDate).map(b=>b.expiryDate).sort()[0]||null;
  return {bloodGroup,batches:items,quantity:total('quantity'),availableUnits:total('availableUnits'),reservedUnits:total('reservedUnits'),
    volumeMl:Math.round(total('volumeMl')*100)/100,missingVolumeBatches:items.filter(b=>b.volumeMl==null).length,nextUsableExpiry:expiry};
}).filter(group=>group.batches.length);

export const matchesStockGroup=(group,query)=>{
  const search=query.trim().toLowerCase();
  return !search||group.bloodGroup.toLowerCase().includes(search)||group.batches.some(b=>[b.batchCode,b.reference,b.component,b.level,b.status].some(value=>String(value||'').toLowerCase().includes(search)));
};
