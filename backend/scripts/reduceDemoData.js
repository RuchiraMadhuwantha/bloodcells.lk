// Dry run by default. --apply backs up all tables, then removes only identified
// demo records that are not needed by the smaller sample or any retained record.
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
require('dotenv').config({path:path.join(__dirname,'../.env'),quiet:true});
const pool=require('../config/db');
const apply=process.argv.includes('--apply');
const smaller=process.argv.includes('--smaller');
const hasDemo=value=>/demo|fictional/i.test(String(value||''));
const json=value=>typeof value==='string'?JSON.parse(value):value;

async function run(){
 const db=await pool.getConnection();
 try{
  await db.beginTransaction();
  const [tables]=await db.query("SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME");
  const [keys]=await db.query("SELECT TABLE_NAME AS tableName,COLUMN_NAME AS columnName FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() AND CONSTRAINT_NAME='PRIMARY' ORDER BY TABLE_NAME,ORDINAL_POSITION");
  const [fks]=await db.query('SELECT TABLE_NAME AS child,COLUMN_NAME AS childColumn,REFERENCED_TABLE_NAME AS parent,REFERENCED_COLUMN_NAME AS parentColumn FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL');
  const data={},ddl={},pk={},keep={},demo={};
  for(const t of tables){
   pk[t.name]=keys.filter(k=>k.tableName===t.name).map(k=>k.columnName);
   assert.ok(pk[t.name].length,'A primary key is required for '+t.name);
   const [rows]=await db.query('SELECT * FROM '+db.escapeId(t.name)+' ORDER BY '+pk[t.name].map(k=>db.escapeId(k)).join(',')+' FOR UPDATE');
   data[t.name]=rows;keep[t.name]=new Set();demo[t.name]=new Set();
   if(apply){const [definition]=await db.query('SHOW CREATE TABLE '+db.escapeId(t.name));ddl[t.name]=definition[0]['Create Table'];}
  }
  const key=(table,row)=>JSON.stringify(pk[table].map(k=>row[k]));
  const put=(table,row)=>{if(!row)return false;const k=key(table,row),changed=!keep[table].has(k);keep[table].add(k);return changed;};
  const retained=(table,row)=>keep[table].has(key(table,row));
  const find=(table,column,value)=>(data[table]||[]).find(r=>r[column]===value);
  const byId=(table,id)=>find(table,pk[table][0],id);
  const marked=(table,row)=>!!row&&demo[table].has(key(table,row));
  const mark=(table,predicate)=>{for(const r of data[table]||[])if(predicate(r))demo[table].add(key(table,r));};
  // Account names alone never classify actual donors as demo data.
  mark('donors',r=>{const u=byId('users',r.user_id);return /^demo_/.test(u?.username||'')&&/^Demo /i.test(r.full_name);});
  const demoUser=id=>data.donors.some(d=>d.user_id===id&&marked('donors',d));
  mark('users',r=>r.role==='donor'&&demoUser(r.user_id)); // Keep every bank and hospital login.
  mark('appointments',r=>marked('donors',byId('donors',r.donor_id))&&hasDemo(r.notes));
  mark('blood_requests',r=>hasDemo(r.reason));
  mark('campaigns',r=>/^demo /i.test(r.name)&&hasDemo(r.short_description+' '+r.detailed_description));
  mark('stock_batches',r=>hasDemo(r.reference+' '+r.component)&&(!r.appointment_id||marked('appointments',byId('appointments',r.appointment_id))));
  mark('bank_transfers',r=>hasDemo(r.reason)&&marked('stock_batches',byId('stock_batches',r.source_batch_id)));
  mark('hospital_blood_usage',r=>hasDemo(r.category+' '+r.notes)&&marked('stock_batches',byId('stock_batches',r.batch_id)));
  mark('stock_movements',r=>marked('stock_batches',byId('stock_batches',r.batch_id))&&hasDemo(r.reason));
  mark('bank_audit',r=>r.event!=='main-bank-configured'&&hasDemo(r.event+' '+JSON.stringify(r.details)));
  mark('campaign_registrations',r=>marked('donors',byId('donors',r.donor_id))&&marked('campaigns',byId('campaigns',r.campaign_id)));
  mark('password_reset_tokens',r=>demoUser(r.user_id));
  const related={appointment:'appointments',campaign:'campaigns',transfer:'bank_transfers',request:'blood_requests',blood_request:'blood_requests',bank_outreach:'bank_outreach',hospital:'hospitals',emergency_alert:'emergency_alerts'};
  mark('notifications',r=>{
   if(r.related_type==='bank_outreach')return false; // Keep actual announcements and their read history.
   const table=related[r.related_type];
   return hasDemo(r.title+' '+r.message)||demoUser(r.user_id)||(table&&marked(table,byId(table,r.related_id)));
  });
  const operationTarget=(table,row)=>{
   if(row.operation==='demo-data-v1')return null;
   const id=table==='bank_operations'?json(row.result_json)?.id:row.result_id;
   const name=/^transfer/.test(row.operation)?'bank_transfers':/^batch|^stock|^inventory/.test(row.operation)?'stock_batches':/^usage/.test(row.operation)?'hospital_blood_usage':/^appointment/.test(row.operation)?'appointments':/^request|^allocation/.test(row.operation)?'blood_requests':/^outreach/.test(row.operation)?'bank_outreach':null;
   return name&&id?{table:name,row:byId(name,id)}:null;
  };
  for(const table of ['bank_operations','hospital_operation_keys'])mark(table,r=>r.operation!=='demo-data-v1'&&/^demo[-_]/i.test(r.idempotency_key));
  // Unmarked data is protected even when it happens to refer to demo accounts.
  for(const table of Object.keys(data))for(const row of data[table])if(!marked(table,row))put(table,row);
  const activeHospitals=data.hospitals.filter(h=>byId('users',h.user_id)?.account_status==='active');
  const exampleHospital=activeHospitals.find(h=>!/^demo_/.test(byId('users',h.user_id)?.username||''))||activeHospitals[0];
  for(const h of activeHospitals){
   const chosen=data.donors.filter(d=>marked('donors',d)&&new RegExp('^demo_portal_h'+h.hospital_id+'_d'+(smaller?'2':'[12]')+'$').test(byId('users',d.user_id)?.username||''));
   for(const donor of chosen){put('donors',donor);for(const a of data.appointments)if(a.donor_id===donor.donor_id&&a.hospital_id===h.hospital_id)put('appointments',a);}
   const campaigns=data.campaigns.filter(c=>c.hospital_id===h.hospital_id&&marked('campaigns',c)).sort((a,b)=>b.campaign_id-a.campaign_id);
   put('campaigns',campaigns[0]);
   for(const status of (smaller&&h.hospital_id!==exampleHospital?.hospital_id?['fulfilled']:['pending','fulfilled']))put('blood_requests',data.blood_requests.find(r=>r.hospital_id===h.hospital_id&&r.status===status&&marked('blood_requests',r)));
   const location=data.stock_locations.find(l=>l.hospital_id===h.hospital_id);
   for(const b of data.stock_batches)if(b.location_id===location?.location_id&&new RegExp('^DEMO-P1-H'+h.hospital_id+(smaller&&h.hospital_id!==exampleHospital?.hospital_id?'-(A\\+|REQUEST-RECEIPT)$':'-(A\\+|O\\+|REQUEST-RECEIPT)$')).test(b.reference))put('stock_batches',b);
   const outgoing=data.bank_transfers.find(t=>t.source_location_id===location?.location_id&&t.status==='dispatched'&&marked('bank_transfers',t));
   const incoming=data.bank_transfers.find(t=>t.destination_location_id===location?.location_id&&t.status==='received'&&marked('bank_transfers',t));
   if(!smaller||h.hospital_id===exampleHospital?.hospital_id)put('bank_transfers',outgoing);put('bank_transfers',incoming);
  }
  for(const l of data.stock_locations.filter(l=>l.kind==='blood_bank'))for(const b of data.stock_batches)if(b.location_id===l.location_id&&/^DEMO-P1-BANK-\d+-(A\+|O-)$/.test(b.reference))put('stock_batches',b);
  const exampleLocation=data.stock_locations.find(l=>l.hospital_id===exampleHospital?.hospital_id);
  for(const suffix of ['EXPIRED','QUARANTINE'])put('stock_batches',data.stock_batches.find(b=>b.location_id===exampleLocation?.location_id&&b.reference.endsWith('-'+suffix)));
  const auditTarget=r=>/^transfer-/.test(r.event)?'bank_transfers':/^request-/.test(r.event)?'blood_requests':/^appointment-/.test(r.event)?'appointments':/^donor-/.test(r.event)?'donors':null;
  const close=()=>{
   let changed=true;
   while(changed){changed=false;
    for(const fk of fks)for(const r of data[fk.child])if(retained(fk.child,r)&&r[fk.childColumn]!=null)changed=put(fk.parent,find(fk.parent,fk.parentColumn,r[fk.childColumn]))||changed;
    for(const r of data.stock_batches)if(retained('stock_batches',r)){
     for(const m of data.stock_movements)if(m.batch_id===r.batch_id)changed=put('stock_movements',m)||changed;
     for(const a of data.bank_audit)if(a.batch_id===r.batch_id)changed=put('bank_audit',a)||changed;
    }
    for(const a of data.bank_audit)if(retained('bank_audit',a)){const table=auditTarget(a);if(table)changed=put(table,byId(table,a.entity_id))||changed;}
    for(const n of data.notifications)if(retained('notifications',n)&&related[n.related_type])changed=put(related[n.related_type],byId(related[n.related_type],n.related_id))||changed;
    for(const d of data.donors)if(retained('users',byId('users',d.user_id)))changed=put('donors',d)||changed;
    for(const table of ['bank_operations','hospital_operation_keys'])for(const r of data[table]){
     const target=operationTarget(table,r);
     if(target?.row){if(retained(table,r))changed=put(target.table,target.row)||changed;else if(retained(target.table,target.row))changed=put(table,r)||changed;}
    }
   }
  };
  close();
  // A couple of relevant sample messages and a registration per kept campaign are enough.
  for(const u of data.users.filter(u=>retained('users',u))){
   const messages=data.notifications.filter(n=>n.user_id===u.user_id&&marked('notifications',n)&&(!related[n.related_type]||retained(related[n.related_type],byId(related[n.related_type],n.related_id)))).sort((a,b)=>b.notification_id-a.notification_id);
   messages.slice(0,smaller?1:2).forEach(n=>put('notifications',n));
  }
  for(const c of data.campaigns.filter(c=>retained('campaigns',c))){const registration=data.campaign_registrations.find(r=>r.campaign_id===c.campaign_id&&retained('donors',byId('donors',r.donor_id)));put('campaign_registrations',registration);}
  close();
  const removed={},summary={};
  for(const table of Object.keys(data)){
   removed[table]=data[table].filter(r=>!retained(table,r));
   assert.ok(removed[table].every(r=>marked(table,r)),'Unmarked record selected for removal in '+table);
   if(removed[table].length)summary[table]={before:data[table].length,after:keep[table].size,removed:removed[table].length};
  }
  console.log(JSON.stringify({mode:apply?'apply':'preview',size:smaller?'smaller':'small',changes:summary,protectedNonDemoAccounts:data.users.filter(u=>!/^demo_/.test(u.username)).length},null,2));
  if(!apply){await db.rollback();return;}
  const folder=path.join(__dirname,'../.local-backups');fs.mkdirSync(folder,{recursive:true});
  const backup=path.join(folder,'before-demo-reduction-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json');
  fs.writeFileSync(backup,JSON.stringify({createdAt:new Date().toISOString(),database:process.env.DB_NAME,ddl,data,removals:Object.fromEntries(Object.entries(removed).map(([table,rows])=>[table,rows.map(r=>key(table,r))]))}),{flag:'wx',mode:0o600});
  // Delete children first, keeping foreign-key checks enabled throughout.
  const order=[],visited=new Set(),visiting=new Set();
  const visit=table=>{if(visited.has(table))return;assert.ok(!visiting.has(table),'Unexpected dependency cycle');visiting.add(table);for(const fk of fks.filter(f=>f.parent===table&&f.child!==table))visit(fk.child);visiting.delete(table);visited.add(table);order.push(table);};
  Object.keys(data).forEach(visit);
  for(const table of order)for(const row of removed[table]){
   const [result]=await db.query('DELETE FROM '+db.escapeId(table)+' WHERE '+pk[table].map(k=>db.escapeId(k)+'=?').join(' AND '),pk[table].map(k=>row[k]));assert.equal(result.affectedRows,1);
  }
  for(const table of Object.keys(data)){
   const [remaining]=await db.query('SELECT * FROM '+db.escapeId(table)+' ORDER BY '+pk[table].map(k=>db.escapeId(k)).join(','));
   assert.deepEqual(remaining,data[table].filter(r=>retained(table,r)),'Retained records changed in '+table);
  }
  await db.commit();
  console.log('Demo data reduced. Every retained record is unchanged. Backup: '+backup);
 }catch(e){await db.rollback();throw e;}finally{db.release();}
}
run().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>pool.end());
