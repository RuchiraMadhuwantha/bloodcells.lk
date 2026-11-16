const test=require('node:test');const assert=require('node:assert/strict');const express=require('express');const jwt=require('jsonwebtoken');
process.env.JWT_SECRET='isolated-bank-tests-only';
let db,snapshot,failAudit=false,queries=[];
const clone=v=>JSON.parse(JSON.stringify(v));
const pool={query:(...args)=>query(...args),getConnection:async()=>({query:(...args)=>query(...args),beginTransaction:async()=>{snapshot=clone(db);},commit:async()=>{},rollback:async()=>{db=snapshot;},release:()=>{}})};
require.cache[require.resolve('../config/db')]={id:require.resolve('../config/db'),filename:require.resolve('../config/db'),loaded:true,exports:pool};
const inventory=require('../models/bankInventoryModel');const transfers=require('../models/bankTransferModel');const management=require('../models/bankManagementModel');const requests=require('../models/bloodRequestModel');const hospitals=require('../models/hospitalModel');const reports=require('../utils/bankReports');
const app=express();app.use(express.json());app.use('/bank',require('../routes/bankOperationsRoutes'));app.use('/inventory',require('../routes/inventoryRoutes'));app.use('/campaigns',require('../routes/campaignRoutes'));app.use('/appointments',require('../routes/appointmentRoutes'));app.use('/donors',require('../routes/donorDirectoryRoutes'));app.use(require('../middleware/errorMiddleware'));
let server,base;
test.before(async()=>{server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;});test.after(()=>new Promise(r=>server.close(r)));
test.beforeEach(()=>{queries=[];failAudit=false;db={keys:[],audit:[],transfers:[],allocations:[],deliveries:[],notifications:[],outreach:[],campaign:{campaign_id:1,created_by_user_id:1,name:'Shared fixture',status:'Draft',campaign_date:'2099-01-01',start_time:'09:00',end_time:'12:00',participant_count:2},appointment:{appointment_id:9,donor_id:4,hospital_id:10,donor_name:'Fixture',status:'pending',appointment_date:'2099-01-01',time_slot:'09:00'},request:{request_id:20,hospital_id:10,blood_group:'O+',quantity:4,status:'approved'},batches:[{batch_id:1,location_id:1,reference:'REAL-FIXTURE',blood_group:'O+',component:'Test component',quantity:10,reserved_units:0,collection_date:'2020-01-01',expiry_date:'2099-01-01',status:'usable',version:1}],hospitalStatus:'pending'};});
const query=async(sql,p=[])=>{
 queries.push({sql,p});
 if(sql.includes('SELECT user_id, username, role'))return [[{user_id:p[0],username:'fixture',role:p[0]===8?'donor':p[0]===9?'hospital':'blood_bank',account_status:p[0]===7?'inactive':'active'}]];
 if(sql.includes("WHERE role = 'blood_bank'"))return [[{user_id:1},{user_id:2}]];
 if(sql.startsWith('SELECT u.user_id FROM users u JOIN hospitals'))return [[{user_id:9},{user_id:10}]];
 if(sql.startsWith('SELECT hospital_id FROM hospitals WHERE user_id'))return [[{hospital_id:10}]];
 if(sql.startsWith('SELECT donor_id FROM donors WHERE user_id'))return [[{donor_id:4}]];
 if(sql.startsWith('SELECT user_id FROM users'))return [[{user_id:p[0]}]];
 if(sql.includes('FROM bank_operations WHERE'))return [db.keys.filter(k=>k.actor===p[0]&&k.operation===p[1]&&k.key===p[2]).map(k=>({payload_hash:k.hash,result_json:k.result}))];
 if(sql.startsWith('INSERT INTO bank_operations')){db.keys.push({actor:p[0],operation:p[1],key:p[2],hash:p[3],result:p[4]});return [{insertId:db.keys.length}];}
 if(sql.startsWith('INSERT INTO bank_audit')){if(failAudit)throw new Error('fixture audit failure');db.audit.push(p);return [{insertId:db.audit.length}];}
 if(sql.includes('SELECT l.* FROM stock_locations'))return [p[0]===p[1]&&[1,2].includes(p[0])?[{location_id:p[1]}]:[]];
 if(sql.includes("SELECT location_id FROM stock_locations"))return [[1,2].includes(p[0])?{location_id:p[0]}:null].filter(Boolean).length?[[{location_id:p[0]}]]:[[]];
 if(sql.startsWith('SELECT b.*'))return [db.batches.filter(b=>b.batch_id===p[0]&&b.location_id===p[1])];
 if(sql==='SELECT *,CURDATE() AS database_today FROM stock_batches WHERE batch_id=? FOR UPDATE')return [db.batches.filter(b=>b.batch_id===p[0])];
 if(sql.startsWith('UPDATE stock_batches')){
  let b;
  if(sql.includes('quantity=quantity-?')){b=db.batches.find(b=>b.batch_id===p[2]);if(!b||b.quantity<p[0]||b.reserved_units<p[1])return [{affectedRows:0}];b.quantity-=p[0];b.reserved_units-=p[1];}
  else if(sql.includes('reserved_units=reserved_units+?')){b=db.batches.find(b=>b.batch_id===p[1]);b.reserved_units+=p[0];}
  else if(sql.includes('reserved_units=reserved_units-?')){b=db.batches.find(b=>b.batch_id===p[1]);if(b.reserved_units<p[0])return [{affectedRows:0}];b.reserved_units-=p[0];}
  else {b=db.batches.find(b=>b.batch_id===p[2]);b.quantity=p[0];b.status=p[1];}
  b.version++;return [{affectedRows:1}];
 }
 if(sql.startsWith('INSERT INTO stock_batches')){const id=db.batches.length+1;db.batches.push({batch_id:id,location_id:p[0],reference:p[1],blood_group:p[2],component:p[3],quantity:p[4],reserved_units:0,collection_date:p[5],expiry_date:p[6],status:p[7],version:1});return [{insertId:id}];}
 if(sql.startsWith('INSERT INTO bank_transfers')){const id=db.transfers.length+1;db.transfers.push({transfer_id:id,source_location_id:p[0],destination_location_id:p[1],source_batch_id:p[2],quantity:p[3],reason:p[4],created_by_user_id:p[5],status:'requested'});return [{insertId:id}];}
 if(sql==='SELECT * FROM bank_transfers WHERE transfer_id=? FOR UPDATE')return [db.transfers.filter(t=>t.transfer_id===p[0])];
 if(sql.startsWith('UPDATE bank_transfers')){const t=db.transfers.find(t=>t.transfer_id===p[2]);t.status=p[0];if(p[1])t.destination_batch_id=p[1];return [{affectedRows:1}];}
 if(sql.startsWith('SELECT * FROM blood_requests'))return [[db.request]];
 if(sql.includes('SELECT allocation_id FROM bank_request_allocations'))return [db.allocations.filter(a=>a.request_id===p[0]&&a.status==='reserved')];
 if(sql.includes('SELECT a.*,b.location_id FROM bank_request_allocations'))return [db.allocations.filter(a=>a.request_id===p[0]&&a.status==='reserved').map(a=>({...a,location_id:1}))];
 if(sql.startsWith('INSERT INTO bank_request_allocations')){db.allocations.push({allocation_id:db.allocations.length+1,request_id:p[0],batch_id:p[1],quantity:p[2],status:'reserved'});return [{insertId:db.allocations.length}];}
 if(sql.startsWith('UPDATE bank_request_allocations')){db.allocations.find(a=>a.allocation_id===p[0]).status=sql.includes('issued')?'issued':'released';return [{affectedRows:1}];}
 if(sql.startsWith('UPDATE blood_requests')){db.request.status=sql.includes("status='fulfilled'")?'fulfilled':p[0];return [{affectedRows:1}];}
 if(sql.includes('FROM blood_requests br'))return [[{...db.request,created_at:'2026-01-01'}]];
 if(sql.includes('SELECT outreach_id FROM bank_outreach'))return [db.outreach.map((r,i)=>({outreach_id:i+1}))];
 if(sql.includes('SELECT d.donor_id,d.user_id'))return [p[0].filter(id=>[4,5].includes(id)).map(id=>({donor_id:id,user_id:id+100}))];
 if(sql.startsWith('INSERT INTO bank_outreach')){db.outreach.push(p);return [{insertId:db.outreach.length}];}
 if(sql.startsWith('INSERT INTO notifications')){if(failAudit)throw new Error('fixture notification failure');db.notifications.push(p);return [{insertId:db.notifications.length}];}
 if(sql.startsWith('INSERT INTO bank_deliveries')){db.deliveries.push(p);return [{insertId:db.deliveries.length}];}
 if(sql.includes('SELECT user_id, account_status FROM users'))return [[{user_id:10,account_status:db.hospitalStatus}]];
 if(sql.startsWith('UPDATE users')){db.hospitalStatus=p[0];return [{affectedRows:1}];}
 if(sql.startsWith('UPDATE hospitals'))return [{affectedRows:1}];
 if(sql.startsWith('SELECT * FROM appointments'))return [[db.appointment]];
 if(sql.startsWith('INSERT INTO appointments')){Object.assign(db.appointment,{donor_id:p[0],hospital_id:p[1],appointment_date:p[2],time_slot:p[3],notes:p[4],booking_nic:p[5]});return [{insertId:9}];}
 if(sql.startsWith('SELECT a.appointment_id AS id'))return [db.appointment.status==='completed'?[{id:9,date:db.appointment.appointment_date,bloodGroup:'O+',location:'Fixture hospital',district:'Fixture',collectedUnits:db.appointment.collected_units,collectedVolumeMl:db.appointment.collected_volume_ml}]:[]];
 if(sql.includes('FROM appointments a'))return [[db.appointment]];
 if(sql.startsWith('UPDATE appointments SET appointment_date')){db.appointment.appointment_date=p[0];db.appointment.time_slot=p[1];return [{affectedRows:1}];}
 if(sql.startsWith('UPDATE appointments SET collected_units')){Object.assign(db.appointment,{collected_units:p[0],collected_volume_ml:p[1],collection_recorded_by_user_id:p[2]});return [{affectedRows:1}];}
 if(sql.startsWith('UPDATE appointments')){if(!['pending','approved'].includes(db.appointment.status)||db.appointment.status===p[0])return [{affectedRows:0}];db.appointment.status=p[0];return [{affectedRows:1}];}
 if(sql.includes('SELECT time_slot')||sql.includes('FROM appointments\n'))return [[]];
 if(sql.includes('SELECT d.donor_id, d.user_id'))return [[{donor_id:4,user_id:104,full_name:'Fixture',nic:'private',email:'private',phone:'private',blood_group:'O+',district:'Fixture',last_donation_date:null,created_at:'2026-01-01',account_status:'active'}]];
 if(sql.includes('FROM campaigns c'))return [sql.includes("c.status IN ('Upcoming','Active')")&&!['Upcoming','Active'].includes(db.campaign.status)?[]:[db.campaign]];
 if(sql.startsWith('SELECT * FROM campaigns'))return [[db.campaign]];
 if(sql.startsWith('INSERT INTO campaigns')){Object.assign(db.campaign,{campaign_id:1,created_by_user_id:p[0],name:p[1],status:p[6],campaign_date:p[7],start_time:p[8],end_time:p[9]});return [{insertId:1}];}
 if(sql.startsWith('UPDATE campaigns SET')){const fields=sql.match(/SET (.+) WHERE/)[1].split(',').map(x=>x.trim().split(' ')[0]);fields.forEach((field,i)=>db.campaign[field]=p[i]);return [{affectedRows:1}];}
 if(sql.startsWith('SELECT user_id FROM donors'))return [[{user_id:104}]];
 if(sql.includes('FROM hospitals h'))return [[{hospital_id:10}]];
 return [[]];
};
const call=async(path,{method='GET',body,actor=1,key='fixture-key-001'}={})=>{const r=await fetch(base+path,{method,headers:{...(actor?{Authorization:'Bearer '+jwt.sign({user_id:actor},process.env.JWT_SECRET)}:{}),'Content-Type':'application/json','Idempotency-Key':key},...(body?{body:JSON.stringify(body)}:{})});const type=r.headers.get('content-type');return {status:r.status,data:type?.includes('json')?await r.json():Buffer.from(await r.arrayBuffer())};};
for(const path of ['/bank/inventory','/bank/transfers','/bank/reports?type=requests','/bank/notifications']){
 test('JWT is required '+path,async()=>assert.equal((await call(path,{actor:null})).status,401));
 for(const actor of [8,9])test('non-bank role denied '+actor+' '+path,async()=>assert.equal((await call(path,{actor})).status,403));
}
test('inactive bank account cannot manage stock',async()=>assert.equal((await call('/bank/inventory',{actor:7})).status,403));
for(const data of [{quantity:-1},{quantity:1.5},{bloodGroup:'invalid'}])test('invalid batch input '+JSON.stringify(data),async()=>assert.equal((await call('/bank/inventory',{method:'POST',body:{...data}})).status,400));
test('missing key rejects transfer without mutation',async()=>assert.equal((await call('/bank/transfers',{method:'POST',key:'',body:{batchId:1,destinationId:2,quantity:2,reason:'Test'}})).status,400));
test('unassigned bank cannot change batch',async()=>{await assert.rejects(inventory.updateBatch(3,1,{quantity:1,status:'usable',version:1,reason:'Count'},'fixture-key'),{statusCode:404});assert.equal(db.batches[0].quantity,10);});
test('stale version prevents lost stock update',async()=>{await assert.rejects(inventory.updateBatch(1,1,{quantity:1,status:'usable',version:99,reason:'Count'},'fixture-key'),{statusCode:409});assert.equal(db.batches[0].quantity,10);});
test('audit failure rolls stock update back',async()=>{failAudit=true;await assert.rejects(inventory.updateBatch(1,1,{quantity:8,status:'usable',version:1,reason:'Count'},'fixture-key'));assert.equal(db.batches[0].quantity,10);assert.equal(db.keys.length,0);});
test('durable stock retry does not apply twice',async()=>{const payload={quantity:8,status:'usable',version:1,reason:'Count'};await inventory.updateBatch(1,1,payload,'fixture-key');const again=await inventory.updateBatch(1,1,payload,'fixture-key');assert.equal(again.replayed,true);assert.equal(db.audit.length,1);assert.equal(db.batches[0].version,2);await assert.rejects(inventory.updateBatch(1,1,{...payload,quantity:7},'fixture-key'),{statusCode:409});});
for(const patch of [{expiry_date:'2000-01-01'},{status:'quarantined'},{status:'discarded'},{reserved_units:9}])test('unusable stock cannot be transferred '+JSON.stringify(patch),async()=>{Object.assign(db.batches[0],patch);await assert.rejects(transfers.create(1,{batchId:1,destinationId:2,quantity:2,reason:'Request'},'fixture-key'),{statusCode:409});});
test('invalid destination is rejected',async()=>await assert.rejects(transfers.create(1,{batchId:1,destinationId:99,quantity:2,reason:'Request'},'fixture-key'),{statusCode:400}));
test('source and destination must differ',async()=>await assert.rejects(transfers.create(1,{batchId:1,destinationId:1,quantity:2,reason:'Request'},'fixture-key'),{statusCode:400}));
const requested=()=>transfers.create(1,{batchId:1,destinationId:2,quantity:4,reason:'Regional demand'},'fixture-create');
const approve=()=>transfers.transition(1,1,{action:'approve',note:'Authorized'},'fixture-approve');
const dispatch=()=>transfers.transition(1,1,{action:'dispatch',note:'Handed over'},'fixture-dispatch');
test('transfer lifecycle reserves, dispatches once and receipts once at destination',async()=>{await requested();assert.equal(db.batches[0].quantity,10);await approve();assert.equal(db.batches[0].reserved_units,4);await dispatch();assert.equal(db.batches[0].quantity,6);assert.equal(db.batches.length,1);await assert.rejects(transfers.transition(1,1,{action:'receive',accepted:true,note:'Checked'},'fixture-wrong'),{statusCode:403});await transfers.transition(2,1,{action:'receive',accepted:true,note:'Checked'},'fixture-receipt');assert.equal(db.batches[1].quantity,4);assert.equal(db.batches[1].location_id,2);assert.equal(db.batches[1].expiry_date,'2099-01-01');await assert.rejects(transfers.transition(2,1,{action:'receive',accepted:true,note:'Checked'},'fixture-again'),{statusCode:409});assert.equal(db.batches.reduce((n,b)=>n+b.quantity,0),10);});
test('duplicate dispatch cannot deduct stock again',async()=>{await requested();await approve();await dispatch();await assert.rejects(transfers.transition(1,1,{action:'dispatch',note:'Again'},'fixture-again'),{statusCode:409});assert.equal(db.batches[0].quantity,6);});
test('cancel approved transfer releases reservation without deduction',async()=>{await requested();await approve();await transfers.transition(1,1,{action:'cancel',note:'No longer needed'},'fixture-cancel');assert.equal(db.batches[0].quantity,10);assert.equal(db.batches[0].reserved_units,0);});
test('expired in transit receipt is quarantined',async()=>{await requested();await approve();await dispatch();db.batches[0].expiry_date='2000-01-01';await transfers.transition(2,1,{action:'receive',accepted:true,note:'Physical receipt'},'fixture-receipt');assert.equal(db.batches[1].status,'quarantined');});
test('receipt audit failure rolls destination and transfer back',async()=>{await requested();await approve();await dispatch();failAudit=true;await assert.rejects(transfers.transition(2,1,{action:'receive',accepted:true,note:'Checked'},'fixture-receipt'));assert.equal(db.batches.length,1);assert.equal(db.transfers[0].status,'dispatched');});
test('request allocation and fulfillment consume reserved verified stock once',async()=>{await transfers.allocate(1,20,{items:[{batchId:1,quantity:4}]},'fixture-allocation');assert.equal(db.batches[0].quantity,10);assert.equal(db.batches[0].reserved_units,4);await transfers.fulfill({requestId:20,reviewedByUserId:1,note:'Issued'});assert.equal(db.request.status,'fulfilled');assert.equal(db.batches[0].quantity,6);assert.equal(db.batches[0].reserved_units,0);assert.equal(db.allocations[0].status,'issued');await assert.rejects(transfers.fulfill({requestId:20,reviewedByUserId:1}),{statusCode:409});assert.equal(db.batches[0].quantity,6);assert.ok(!queries.some(q=>q.sql.startsWith('UPDATE blood_inventory')));});
test('request without allocations cannot issue legacy totals',async()=>await assert.rejects(transfers.fulfill({requestId:20,reviewedByUserId:1}),{statusCode:409}));
test('insufficient stock rolls request allocation back',async()=>{db.batches[0].quantity=2;await assert.rejects(transfers.allocate(1,20,{items:[{batchId:1,quantity:4}]},'fixture-allocation'),{statusCode:409});assert.equal(db.allocations.length,0);});
test('expiry after reservation prevents fulfillment',async()=>{await transfers.allocate(1,20,{items:[{batchId:1,quantity:4}]},'fixture-allocation');db.batches[0].expiry_date='2000-01-01';await assert.rejects(transfers.fulfill({requestId:20,reviewedByUserId:1}),{statusCode:409});assert.equal(db.request.status,'approved');assert.equal(db.batches[0].quantity,10);});
test('hospital cancellation releases verified reservations atomically',async()=>{await transfers.allocate(1,20,{items:[{batchId:1,quantity:4}]},'fixture-allocation');await requests.updateRequestStatus({requestId:20,newStatus:'cancelled',reviewedByUserId:9});assert.equal(db.batches[0].reserved_units,0);assert.equal(db.batches[0].quantity,10);assert.equal(db.allocations[0].status,'released');});
test('hospital approval persists and conflicting repeat decision is rejected',async()=>{await hospitals.approveHospital(10,1);assert.equal(db.hospitalStatus,'active');await assert.rejects(hospitals.approveHospital(10,1),{statusCode:409});});
test('hospital rejection requires a new review before approval',async()=>{await hospitals.rejectHospital(10,1,'Incomplete registration');assert.equal(db.hospitalStatus,'inactive');await assert.rejects(hospitals.approveHospital(10,1),{statusCode:409});await hospitals.reviewAgainHospital(10,1);assert.equal(db.hospitalStatus,'pending');});
const message={donorIds:[4,5],channel:'in_app',type:'general',title:'Fixture announcement',message:'Authorized test'};
test('in-app outreach persists exactly one inbox entry per selected donor',async()=>{await management.outreach(1,message,'fixture-outreach');await management.outreach(1,message,'fixture-outreach');assert.equal(db.notifications.length,2);assert.equal(db.deliveries.length,2);assert.ok(db.deliveries.every(d=>d[2]==='stored'));});
test('SMS is blocked without claiming provider delivery',async()=>{await management.outreach(1,{...message,channel:'sms'},'fixture-outreach');assert.equal(db.notifications.length,0);assert.ok(db.deliveries.every(d=>d[2]==='provider_unconfigured'));});
test('invalid recipient rolls outreach back',async()=>{await assert.rejects(management.outreach(1,{...message,donorIds:[99]},'fixture-outreach'),{statusCode:400});assert.equal(db.outreach.length,0);});
test('outreach rate limit rejects a second different campaign',async()=>{await management.outreach(1,message,'fixture-outreach');await assert.rejects(management.outreach(1,message,'fixture-second'),{statusCode:429});});
test('non-bank cannot send bulk outreach',async()=>assert.equal((await call('/bank/notifications',{method:'POST',actor:8,body:message})).status,403));
test('legacy aggregate write bypass is disabled',async()=>{const r=await call('/inventory/adjust',{method:'POST',body:{bloodGroup:'O+',amount:1,mode:'remove'}});assert.equal(r.status,409);assert.ok(!queries.some(q=>q.sql.startsWith('UPDATE blood_inventory')));});
test('CSV protects spreadsheet formulas and PDF is a real document',async()=>{const report={title:'Blood Bank Report',hospital:'Fixture',hospitalCode:'BANK',period:'All',generatedAt:'2026-11-15',summary:{Records:1},columns:['Reference'],rows:[['=HYPERLINK("private")']],sourceNote:'Actual fixture data'};assert.match(reports.reportCsv(report),/'=HYPERLINK/);const pdf=await reports.reportPdf(report);assert.equal(pdf.subarray(0,5).toString(),'%PDF-');});
test('request report uses complete matching records and filters',async()=>{const report=await reports.reportData(1,{type:'requests',bloodGroup:'O+',start:'2026-01-01',end:'2026-01-02'});assert.equal(report.summary.Requests,1);assert.equal(report.summary['Requested units'],4);const empty=await reports.reportData(1,{type:'requests',bloodGroup:'A+'});assert.equal(empty.rows.length,0);});
test('authenticated request PDF endpoint exports real binary',async()=>{const r=await call('/bank/reports?type=requests&format=pdf');assert.equal(r.status,200);assert.equal(r.data.subarray(0,5).toString(),'%PDF-');});
test('campaign creator restriction prevents unauthorized edits',async()=>{db.campaign.created_by_user_id=2;const r=await call('/campaigns/1',{method:'PUT',body:{name:'Changed'}});assert.equal(r.status,403);});
test('donor list minimizes contact data and labels medical eligibility unverified',async()=>{const data=await require('../models/donorDirectoryModel').listDonors({bloodGroup:'O+',district:'Fixture',status:'active'});assert.equal(data.length,1);assert.equal(data[0].medicalEligibility,'not_verified');assert.equal(data[0].nic,undefined);assert.equal(data[0].phone,undefined);assert.equal(data[0].email,undefined);const q=queries.find(q=>q.sql.includes('SELECT\n       d.donor_id'));assert.ok(q.p.includes('O+'));assert.ok(q.p.includes('Fixture'));});
test('appointment conditional update prevents duplicate processing',async()=>{const m=require('../models/appointmentModel');await m.updateAppointmentStatus({appointmentId:9,status:'approved'},pool);await assert.rejects(m.updateAppointmentStatus({appointmentId:9,status:'approved'},pool),{statusCode:409});});

const campaignPayload={name:'Real fixture campaign',date:'2099-01-01',startTime:'09:00',endTime:'12:00',organizerName:'Authorized fixture',status:'Draft'};
test('public Events endpoint excludes drafts and returns published cards without private contacts',async()=>{
 let response=await fetch(base+'/campaigns/public');assert.equal(response.status,200);assert.equal((await response.json()).campaigns.length,0);
 db.campaign.status='Upcoming';db.campaign.contact_email='private@example.test';
 response=await fetch(base+'/campaigns/public');const data=await response.json();assert.equal(data.campaigns[0].name,db.campaign.name);assert.equal(data.campaigns[0].status,'Upcoming');assert.equal('contactEmail' in data.campaigns[0],false);
});
test('bank creates a campaign in the shared campaign model',async()=>{const r=await call('/campaigns',{method:'POST',body:campaignPayload});assert.equal(r.status,201);assert.equal(db.campaign.name,campaignPayload.name);assert.equal(r.data.campaign.status,'Draft');});
test('campaign publishing persists and becomes visible to donors',async()=>{assert.equal((await call('/campaigns',{actor:8})).data.campaigns.length,0);const published=await call('/campaigns/1',{method:'PUT',body:{status:'Upcoming'}});assert.equal(published.status,200);assert.equal(db.campaign.status,'Upcoming');const donor=await call('/campaigns',{actor:8});assert.equal(donor.data.campaigns[0].name,db.campaign.name);});
test('invalid campaign dates and time ranges are rejected',async()=>{assert.equal((await call('/campaigns',{method:'POST',body:{...campaignPayload,date:'2026-02-30'}})).status,400);assert.equal((await call('/campaigns',{method:'POST',body:{...campaignPayload,endTime:'08:00'}})).status,400);});
test('closed campaigns cannot be republished',async()=>{db.campaign.status='Cancelled';assert.equal((await call('/campaigns/1',{method:'PUT',body:{status:'Upcoming'}})).status,409);});

test('publishing a campaign notifies hospitals once and lets hospitals view it',async()=>{
 const r=await call('/campaigns/1',{method:'PUT',body:{status:'Upcoming'}});
 assert.equal(r.status,200);assert.deepEqual(db.notifications.map(n=>n[0]),[9,10]);
 assert.ok(db.notifications.every(n=>n[1]==='campaign'&&n[6]==='hospital-campaigns'));
 assert.equal((await call('/campaigns/1',{actor:9})).status,200);
 assert.equal((await call('/campaigns/1',{method:'PUT',body:{status:'Upcoming'}})).status,200);
 assert.equal(db.notifications.length,2);
});
test('hospital cannot view or modify a draft campaign',async()=>{
 assert.equal((await call('/campaigns/1',{actor:9})).status,404);
 assert.equal((await call('/campaigns/1',{method:'PUT',actor:9,body:{status:'Upcoming'}})).status,403);
});
test('campaign publication rolls back when hospital notifications fail',async()=>{
 failAudit=true;
 assert.equal((await call('/campaigns/1',{method:'PUT',body:{status:'Upcoming'}})).status,500);
 assert.equal(db.campaign.status,'Draft');assert.equal(db.notifications.length,0);
});
test('creating an upcoming campaign immediately notifies hospitals',async()=>{
 const r=await call('/campaigns',{method:'POST',body:{name:'Published drive',organizerName:'Bank',date:'2099-01-01',startTime:'09:00',endTime:'12:00',status:'Upcoming'}});
 assert.equal(r.status,201);assert.equal(db.notifications.length,2);
});
test('creating a draft campaign does not notify hospitals',async()=>{
 const r=await call('/campaigns',{method:'POST',body:{name:'Draft drive',organizerName:'Bank',date:'2099-01-01',startTime:'09:00',endTime:'12:00',status:'Draft'}});
 assert.equal(r.status,201);assert.equal(db.notifications.length,0);
});
test('hospital approval notifies donor and active banks once',async()=>{
 const r=await call('/appointments/9/approve',{method:'PUT',actor:9,body:{}});
 assert.equal(r.status,200);assert.equal(db.appointment.status,'approved');
 assert.deepEqual(db.notifications.map(n=>n[0]),[104,1,2]);
 assert.ok(db.notifications.every(n=>n[1]==='appointment_approved'));
 assert.equal((await call('/appointments/9/approve',{method:'PUT',actor:9,body:{}})).status,409);
 assert.equal(db.notifications.length,3);
});
test('hospital cannot approve another hospital appointment',async()=>{
 db.appointment.hospital_id=11;
 assert.equal((await call('/appointments/9/approve',{method:'PUT',actor:9,body:{}})).status,403);
 assert.equal(db.appointment.status,'pending');assert.equal(db.notifications.length,0);
});
test('failed approval notification rolls the appointment back',async()=>{
 failAudit=true;
 assert.equal((await call('/appointments/9/approve',{method:'PUT',actor:9,body:{}})).status,500);
 assert.equal(db.appointment.status,'pending');assert.equal(db.notifications.length,0);
});
test('donor cannot approve appointments',async()=>assert.equal((await call('/appointments/9/approve',{method:'PUT',actor:8,body:{}})).status,403));
test('hospital cannot approve a completed appointment',async()=>{
 db.appointment.status='completed';
 assert.equal((await call('/appointments/9/approve',{method:'PUT',actor:9,body:{}})).status,409);
 assert.equal(db.notifications.length,0);
});
test('bank cannot approve appointments',async()=>{assert.equal((await call('/appointments/9/status',{method:'PUT',body:{status:'approved'}})).status,403);assert.equal(db.appointment.status,'pending');assert.equal(db.notifications.length,0);});

for(const nic of ['901234567v','199012345678'])test('booking persists optional NIC '+nic,async()=>{
 const r=await call('/appointments',{method:'POST',actor:8,body:{hospital_id:10,appointment_date:'2099-01-01',time_slot:'09:00',nic}});
 assert.equal(r.status,201);assert.equal(db.appointment.booking_nic,nic.toUpperCase());assert.equal(r.data.appointment.nic,nic.toUpperCase());
});
test('booking still accepts an omitted optional NIC',async()=>{
 const r=await call('/appointments',{method:'POST',actor:8,body:{hospital_id:10,appointment_date:'2099-01-01',time_slot:'09:00'}});
 assert.equal(r.status,201);assert.equal(r.data.appointment.nic,null);
});
for(const nic of ['wrong','123','123456789Z'])test('invalid booking NIC rejected '+nic,async()=>{
 assert.equal((await call('/appointments',{method:'POST',actor:8,body:{hospital_id:10,appointment_date:'2099-01-01',time_slot:'09:00',nic}})).status,400);
 assert.equal(db.appointment.booking_nic,undefined);
});

test('hospital collection saves quantities and notifies donor and banks exactly once',async()=>{
 Object.assign(db.appointment,{status:'approved',appointment_date:'2020-01-01'});
 const r=await call('/appointments/9/collection',{method:'PUT',actor:9,body:{collectedUnits:1,collectedVolumeMl:450}});
 assert.equal(r.status,200);assert.equal(r.data.appointment.collectedUnits,1);assert.equal(r.data.appointment.collectedVolumeMl,450);
 assert.equal(db.appointment.status,'completed');assert.equal(db.appointment.collection_recorded_by_user_id,9);
 assert.deepEqual(db.notifications.map(n=>n[0]),[104,1,2]);
 assert.ok(db.notifications.every(n=>n[1]==='appointment_completed'));
 assert.match(db.notifications[1][3],/450 mL/);
 const report=await reports.reportData(1,{type:'donations'});
 assert.equal(report.summary['Collected units'],1);assert.equal(report.summary['Collected volume (mL)'],450);
 assert.equal((await call('/appointments/9/collection',{method:'PUT',actor:9,body:{collectedUnits:2,collectedVolumeMl:900}})).status,409);
 assert.equal(db.appointment.collected_units,1);assert.equal(db.notifications.length,3);
});
test('collection notification failure rolls back quantities and completion',async()=>{
 Object.assign(db.appointment,{status:'approved',appointment_date:'2020-01-01'});failAudit=true;
 assert.equal((await call('/appointments/9/collection',{method:'PUT',actor:9,body:{collectedUnits:1,collectedVolumeMl:450}})).status,500);
 assert.equal(db.appointment.status,'approved');assert.equal(db.appointment.collected_units,undefined);assert.equal(db.notifications.length,0);
});
test('another hospital cannot record collected blood',async()=>{
 Object.assign(db.appointment,{status:'approved',hospital_id:11,appointment_date:'2020-01-01'});
 assert.equal((await call('/appointments/9/collection',{method:'PUT',actor:9,body:{collectedUnits:1,collectedVolumeMl:450}})).status,403);
 assert.equal(db.appointment.collected_units,undefined);
});
test('collection requires approval and cannot be recorded for a future appointment',async()=>{
 assert.equal((await call('/appointments/9/collection',{method:'PUT',actor:9,body:{collectedUnits:1,collectedVolumeMl:450}})).status,409);
 db.appointment.status='approved';
 assert.equal((await call('/appointments/9/collection',{method:'PUT',actor:9,body:{collectedUnits:1,collectedVolumeMl:450}})).status,409);
});
for(const body of [{collectedUnits:0,collectedVolumeMl:450},{collectedUnits:1.5,collectedVolumeMl:450},{collectedUnits:1,collectedVolumeMl:0},{collectedUnits:1},{collectedUnits:1,collectedVolumeMl:-450}])test('invalid collection rejected '+JSON.stringify(body),async()=>{
 db.appointment.status='approved';
 assert.equal((await call('/appointments/9/collection',{method:'PUT',actor:9,body})).status,400);
 assert.equal(db.appointment.collected_units,undefined);
});
for(const actor of [1,8])test('only hospital can record collections '+actor,async()=>assert.equal((await call('/appointments/9/collection',{method:'PUT',actor,body:{collectedUnits:1,collectedVolumeMl:450}})).status,403));
test('bank cannot bypass collection recording by marking completed',async()=>{
 assert.equal((await call('/appointments/9/status',{method:'PUT',body:{status:'completed'}})).status,403);
 assert.equal(db.appointment.status,'pending');
});
test('appointment cancellation persists with donor notification',async()=>{assert.equal((await call('/appointments/9/status',{method:'PUT',body:{status:'cancelled'}})).status,200);assert.equal(db.appointment.status,'cancelled');assert.equal(db.notifications[0][1],'appointment_cancelled');});
test('bank reschedule changes the original donor appointment and notifies once',async()=>{const r=await call('/bank/appointments/9/reschedule',{method:'PUT',body:{newDate:'2099-02-01',newTimeSlot:'10:00'}});assert.equal(r.status,201);assert.equal(db.appointment.appointment_date,'2099-02-01');assert.equal(db.notifications[0][1],'appointment_rescheduled');});
test('valid batch receipt is stored at the assigned centre with audit',async()=>{const r=await call('/bank/inventory',{method:'POST',body:{locationId:1,reference:'FIXTURE-NEW',bloodGroup:'O+',component:'Recorded component',quantity:5,status:'quarantined',collectionDate:'2026-01-01',expiryDate:'2099-01-01',reason:'Physical receipt'}});assert.equal(r.status,201);assert.equal(db.batches[1].quantity,5);assert.equal(db.batches[1].status,'quarantined');assert.equal(db.audit[0][1],'batch-receipt');});
test('receipt acceptance false is sanitized and never releases quarantined stock',async()=>{await requested();await approve();await dispatch();const r=await call('/bank/transfers/1',{method:'PUT',actor:2,body:{action:'receive',accepted:'false',note:'Pending receiving checks'}});assert.equal(r.status,400);assert.equal(db.batches.length,1);const valid=await call('/bank/transfers/1',{method:'PUT',actor:2,body:{action:'receive',accepted:false,note:'Pending receiving checks'}});assert.equal(valid.status,201);assert.equal(db.batches[1].status,'quarantined');});

test('database business date governs expiry even if application clock differs',()=>{
 assert.throws(()=>inventory.usable({status:'usable',expiry_date:'2099-01-01',database_today:'2099-01-02',quantity:5,reserved_units:0},1),{statusCode:409});
});
