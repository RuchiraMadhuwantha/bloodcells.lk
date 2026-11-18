const DAY=86400000;
const rowColors={expired:'bg-rose-50 [&>td:first-child]:border-l-4 [&>td:first-child]:border-rose-500',today:'bg-orange-50 [&>td:first-child]:border-l-4 [&>td:first-child]:border-orange-500',expiring:'bg-amber-50 [&>td:first-child]:border-l-4 [&>td:first-child]:border-amber-500'};
const colomboFormat=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Colombo',year:'numeric',month:'2-digit',day:'2-digit'});
export const inventoryToday=(now=new Date())=>{
  const parts=colomboFormat.formatToParts(now);
  const value=type=>parts.find(p=>p.type===type).value;
  return value('year')+'-'+value('month')+'-'+value('day');
};
const dayNumber=value=>{
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value||''))return null;
  const [year,month,day]=value.split('-').map(Number),date=new Date(Date.UTC(year,month-1,day));
  return date.getUTCFullYear()===year&&date.getUTCMonth()===month-1&&date.getUTCDate()===day?date.getTime()/DAY:null;
};
export const isExpiredBatch=(batch,today)=>{
  const expiry=dayNumber(batch.expiryDate),asOf=dayNumber(batch.asOfDate||today||inventoryToday());
  return expiry!=null&&asOf!=null&&expiry<asOf;
};
export const expiryInfo=(batch,today)=>{
  if(batch.status==='discarded'||Number(batch.quantity)===0)return {kind:'none',label:'',rowClass:''};
  const expiry=dayNumber(batch.expiryDate),asOf=dayNumber(batch.asOfDate||today||inventoryToday());
  if(expiry==null||asOf==null)return {kind:'unknown',label:'Expiry not recorded',rowClass:''};
  const days=expiry-asOf;
  if(days<0)return {kind:'expired',days,label:'Expired',rowClass:rowColors.expired};
  if(days===0)return {kind:'today',days,label:'Expires today',rowClass:rowColors.today};
  if(days<=7)return {kind:'expiring',days,label:days+' day'+(days===1?'':'s')+' left',rowClass:rowColors.expiring};
  return {kind:'current',days,label:'',rowClass:''};
};
export const expirySummary=(batches,today=inventoryToday())=>{
  const summary={expiredCount:0,expiringCount:0,todayCount:0,nearestDays:null,expiredUnits:0,expiringUnits:0,rowClass:''};
  for(const batch of batches){const info=expiryInfo(batch,today),units=Number(batch.quantity||0);
    if(info.kind==='expired'){summary.expiredCount++;summary.expiredUnits+=units;}
    if(info.kind==='today'||info.kind==='expiring'){summary.expiringCount++;summary.expiringUnits+=units;summary.nearestDays=summary.nearestDays==null?info.days:Math.min(summary.nearestDays,info.days);}
    if(info.kind==='today')summary.todayCount++;
  }
  summary.rowClass=summary.expiredCount?rowColors.expired:summary.todayCount?rowColors.today:summary.expiringCount?rowColors.expiring:'';
  return summary;
};
