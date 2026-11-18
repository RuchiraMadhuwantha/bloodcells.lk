const statuses={usable:'Usable',quarantined:'Waiting for checks',discarded:'Removed from use',fulfilled:'Blood issued',dispatched:'On the way',requested:'Waiting for approval',accepted:'Checks passed'};
export const displayStatus=value=>typeof value==='string'?(statuses[value.toLowerCase()]||value):value;
const labels={batchCode:'Packet ID',reference:'Reference',volumeMl:'Volume (mL)',collectedVolumeMl:'Collected volume (mL)',quantity:'Units',reservedUnits:'Units set aside',availableUnits:'Available units',locationName:'Centre',locationId:'Centre number',batchId:'Packet number',bloodGroup:'Blood group',expiryDate:'Expiry date',collectionDate:'Collection date',createdAt:'Created',updatedAt:'Last updated',receiptStatus:'Receiving checks',reason:'Reason',note:'Note'};
export const fieldLabel=value=>labels[value]||value.replace(/([a-z\d])([A-Z])/g,'$1 $2').replace(/[_-]+/g,' ').replace(/^./,c=>c.toUpperCase());
export const changeSummary=value=>{
  if(value==null)return 'No details recorded';
  if(typeof value==='string'){
    try{return changeSummary(JSON.parse(value));}catch{return displayStatus(value);}
  }
  if(Array.isArray(value))return value.map(changeSummary).join('; ');
  if(typeof value==='object')return Object.entries(value).map(([key,item])=>fieldLabel(key)+': '+changeSummary(item)).join('; ');
  if(typeof value==='boolean')return value?'Yes':'No';
  return String(value);
};
export const changeLabel=value=>fieldLabel(String(value||'Stock update')).replace(/\bdispatch\b/gi,'sent').replace(/\breceive\b/gi,'received');
export const STOCK_STATUS_OPTIONS=[{value:'usable',label:'Usable'},{value:'quarantined',label:'Waiting for checks'},{value:'discarded',label:'Removed from use'}];
