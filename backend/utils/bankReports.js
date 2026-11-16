const s=require('../models/bankInventoryModel');
const transfer=require('../models/bankTransferModel');
const {getAllRequests}=require('../models/bloodRequestModel');
const {listCampaigns}=require('../models/campaignModel');
const {toDateString}=require('./date');
const {reportCsv,reportPdf}=require('./hospitalReports');
const reportData=async(actor,f)=>{
  let items,columns,rows,summary;
  const filter=(r,date,group,district,centre)=> (!f.start||date>=f.start)&&(!f.end||date<=f.end)&&(!f.bloodGroup||group===f.bloodGroup)&&(!f.district||district===f.district)&&(!f.centreId||Number(centre)===f.centreId);
  if(['inventory','expiry'].includes(f.type)){
    items=await s.batches(actor,{...f,...(f.type==='expiry'?{dateField:'expiry'}:{})});
    if(f.type==='expiry')items=items.filter(r=>r.expiryStatus!=='current');
    columns=['Batch','Group','Component','Centre','Physical units','Usable unreserved','Reserved','Collection date','Expiry','Status'];
    rows=items.map(r=>[r.reference,r.bloodGroup,r.component,r.locationName,r.quantity,r.availableUnits,r.reservedUnits,r.collectionDate,r.expiryDate,r.level]);
    summary={'Batches':items.length,'Physical units':items.reduce((n,r)=>n+r.quantity,0),'Usable unreserved units':items.reduce((n,r)=>n+r.availableUnits,0),'Reserved units':items.reduce((n,r)=>n+r.reservedUnits,0)};
  }else if(f.type==='regional'){
    if(f.start||f.end)throw s.fail(400,'Regional stock is a current balance. Historical date ranges are not supported.');
    items=await s.regional(actor,f);columns=['Centre','District','Group','Usable unreserved','Reserved','Threshold comparison','Updated'];rows=items.map(r=>[r.centreName,r.district,r.bloodGroup,r.availableUnits,r.reservedUnits,r.level,r.updatedAt]);summary={'Centre/group records':items.length,'Usable unreserved units':items.reduce((n,r)=>n+r.availableUnits,0)};
  }else if(f.type==='requests'){
    if(f.centreId)throw s.fail(400,'Hospital requests do not have a bank-centre assignment.');
    items=(await getAllRequests()).filter(r=>filter(r,r.createdAt,r.bloodGroup,r.district,null));
    columns=['Reference','Hospital','District','Group','Requested units','Submission','Urgency','Status'];rows=items.map(r=>[r.reference,r.hospitalName,r.district,r.bloodGroup,r.quantity,r.createdAt,r.urgency,r.status]);summary={'Requests':items.length,'Requested units':items.reduce((n,r)=>n+Number(r.quantity),0),'Fulfilled requests':items.filter(r=>r.status==='fulfilled').length};
  }else if(f.type==='donations'){
    if(f.centreId)throw s.fail(400,'Donations are recorded against hospitals, not bank centres.');
    const where=["a.status='completed'"];const values=[];
    for(const [key,col] of [['bloodGroup','d.blood_group'],['district','h.district']])if(f[key]){where.push(col+'=?');values.push(f[key]);}
    if(f.start){where.push('a.appointment_date>=?');values.push(f.start);}if(f.end){where.push('a.appointment_date<=?');values.push(f.end);}
    const [records]=await s.pool.query('SELECT a.appointment_id AS id,a.appointment_date AS date,d.blood_group AS bloodGroup,h.hospital_name AS location,h.district,a.collected_units AS collectedUnits,a.collected_volume_ml AS collectedVolumeMl FROM appointments a JOIN donors d ON d.donor_id=a.donor_id JOIN hospitals h ON h.hospital_id=a.hospital_id WHERE '+where.join(' AND ')+' ORDER BY a.appointment_date DESC LIMIT 10001',values);
    items=records;columns=['Donation appointment','Date','Group','Location','District','Collected units','Collected volume (mL)'];rows=items.map(r=>[r.id,toDateString(r.date),r.bloodGroup,r.location,r.district,r.collectedUnits ?? 'Not recorded',r.collectedVolumeMl ?? 'Not recorded']);summary={'Completed donation appointments':items.length,'Collected units':items.reduce((n,r)=>n+Number(r.collectedUnits||0),0),'Collected volume (mL)':items.reduce((n,r)=>n+Number(r.collectedVolumeMl||0),0),'Quantities not recorded':items.filter(r=>r.collectedUnits==null).length};
  }else if(f.type==='campaigns'){
    if(f.centreId||f.bloodGroup)throw s.fail(400,'Campaigns have no bank-centre assignment or single collected blood group.');
    items=(await listCampaigns({role:'blood_bank',district:f.district})).filter(r=>filter(r,r.date,null,r.district,null));
    columns=['Campaign','Date','District','Venue','Status','Registered participants','Recorded donations'];rows=items.map(r=>[r.name,r.date,r.district,r.venueName,r.status,r.participants,'Campaign linkage not recorded']);summary={'Campaigns':items.length,'Registered participants':items.reduce((n,r)=>n+r.participants,0)};
  }else{
    items=(await transfer.list(actor)).filter(r=>(!f.centreId||r.source_location_id===f.centreId||r.destination_location_id===f.centreId)&&filter(r,toDateString(r.created_at),r.bloodGroup,r.sourceDistrict,f.centreId));
    columns=['Transfer','Source','Destination','Group','Quantity','Requested date','Status'];rows=items.map(r=>[r.reference,r.sourceCentre,r.destinationCentre,r.bloodGroup,r.quantity,toDateString(r.created_at),r.status]);summary={'Transfers':items.length,'Received units':items.filter(r=>r.status==='received').reduce((n,r)=>n+Number(r.quantity),0)};
  }
  if(items.length>10000)throw s.fail(413,'Report exceeds 10000 matching records. Narrow filters.');
  return {title:'Blood Bank '+f.type.charAt(0).toUpperCase()+f.type.slice(1)+' Report',hospital:'Authorized Blood Bank operations',hospitalCode:'Scoped to assigned bank centres for stock and transfers',period:(f.start||'First recorded date')+' to '+(f.end||'Latest recorded date')+'; Group: '+(f.bloodGroup||'All')+'; District: '+(f.district||'All')+'; Centre: '+(f.centreId||'Assigned centres'),generatedAt:new Date().toISOString(),columns,rows,summary,sourceNote:'Actual saved records. Inventory shows current balances for batches selected by collection date. Expiry monitoring window: 7 days, not component shelf life. Collection totals include only recorded quantities; older unknown quantities are excluded. Campaign-to-donation linkage is not stored. Clinical screening/release remains outside this report.'};
};
module.exports={reportData,reportCsv,reportPdf};
