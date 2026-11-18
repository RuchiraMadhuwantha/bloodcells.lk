// Additive setup. --backfill links previously issued allocations without moving
// stock or sending messages. Proven old receipts reuse their existing batch.
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
require('dotenv').config({path:path.join(__dirname,'../.env'),quiet:true});
const pool=require('../config/db');
(async()=>{
 const c=await pool.getConnection();
 try{
  const [originalTransfers]=await c.query('SELECT * FROM bank_transfers ORDER BY transfer_id');
  const [originalStock]=await c.query('SELECT * FROM stock_batches ORDER BY batch_id');
  const folder=path.join(__dirname,'../.local-backups');fs.mkdirSync(folder,{recursive:true});
  fs.writeFileSync(path.join(folder,'request-transfer-setup-'+Date.now()+'.json'),JSON.stringify({originalTransfers,originalStock}),{flag:'wx',mode:0o600});
  for(const column of ['request_id','request_allocation_id']){
   const [found]=await c.query('SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=?',['bank_transfers',column]);
   if(!found.length)await c.query('ALTER TABLE bank_transfers ADD COLUMN '+column+' INT UNSIGNED NULL');
  }
  const [index]=await c.query("SHOW INDEX FROM bank_transfers WHERE Key_name='uq_transfer_request_allocation'");
  if(!index.length)await c.query('ALTER TABLE bank_transfers ADD UNIQUE KEY uq_transfer_request_allocation (request_allocation_id)');
  for(const [name,column,table,target] of [['fk_transfer_request','request_id','blood_requests','request_id'],['fk_transfer_request_allocation','request_allocation_id','bank_request_allocations','allocation_id']]){
   const [found]=await c.query('SELECT CONSTRAINT_NAME FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME=? AND CONSTRAINT_NAME=?',['bank_transfers',name]);
   if(!found.length)await c.query(`ALTER TABLE bank_transfers ADD CONSTRAINT ${name} FOREIGN KEY (${column}) REFERENCES ${table}(${target})`);
  }
  if(!process.argv.includes('--backfill')){console.log('Request transfer links are ready. No stock or existing transfers changed.');return;}
  await c.beginTransaction();
  const [allocations]=await c.query(`SELECT a.*,r.hospital_id,r.fulfilled_at,r.reviewed_by_user_id,b.location_id,b.blood_group
   FROM bank_request_allocations a JOIN blood_requests r ON r.request_id=a.request_id JOIN stock_batches b ON b.batch_id=a.batch_id
   LEFT JOIN bank_transfers t ON t.request_allocation_id=a.allocation_id
   WHERE a.status='issued' AND r.status='fulfilled' AND t.transfer_id IS NULL ORDER BY a.allocation_id FOR UPDATE`);
  const results=[];
  for(const a of allocations){
   const reference='BR-'+String(a.request_id).padStart(5,'0');
   await c.query(`INSERT INTO stock_locations (hospital_id,name,district,kind) SELECT h.hospital_id,h.hospital_name,h.district,'hospital' FROM hospitals h WHERE h.hospital_id=? ON DUPLICATE KEY UPDATE hospital_id=VALUES(hospital_id)`,[a.hospital_id]);
   const [locations]=await c.query("SELECT location_id FROM stock_locations WHERE hospital_id=? AND kind='hospital'",[a.hospital_id]);
   assert.equal(locations.length,1,'One hospital stock location is required.');
   const [receipts]=await c.query(`SELECT b.batch_id,b.volume_ml FROM stock_movements m JOIN stock_batches b ON b.batch_id=m.batch_id
    WHERE m.hospital_id=? AND b.location_id=? AND m.quantity_delta=? AND b.blood_group=?
    AND (m.reason=? OR m.reason=?) AND NOT EXISTS (SELECT 1 FROM bank_transfers t WHERE t.destination_batch_id=b.batch_id)`,
    [a.hospital_id,locations[0].location_id,a.quantity,a.blood_group,'DEMO: Receipt for fulfilled demo request '+reference,'Receipt for issued request '+reference]);
   const received=receipts.length===1?receipts[0]:null;
   const [audits]=await c.query("SELECT details FROM bank_audit WHERE event='request-issued' AND entity_id=? AND batch_id=? ORDER BY audit_id",[a.request_id,a.batch_id]);
   const details=audits.map(r=>typeof r.details==='string'?JSON.parse(r.details):r.details).filter(r=>Number(r.delta)===-Number(a.quantity));
   const recorded=details.length===1?details[0].volumeMl:null;
   const volume=recorded==null?(received?.volume_ml??null):Number(recorded);
   const actor=a.reviewed_by_user_id||a.actor_user_id;
   const [created]=await c.query(`INSERT INTO bank_transfers (source_location_id,destination_location_id,source_batch_id,destination_batch_id,quantity,volume_ml,reason,created_by_user_id,status,request_id,request_allocation_id,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,COALESCE(?,NOW()),COALESCE(?,NOW()))`,
    [a.location_id,locations[0].location_id,a.batch_id,received?.batch_id||null,a.quantity,volume,'Previously issued for '+reference,actor,received?'received':'dispatched',a.request_id,a.allocation_id,a.fulfilled_at,a.fulfilled_at]);
   await c.query('INSERT INTO bank_audit (actor_user_id,event,location_id,batch_id,entity_id,details) VALUES (?,?,?,?,?,?)',[actor,'transfer-history-linked',a.location_id,a.batch_id,created.insertId,JSON.stringify({requestId:a.request_id,allocationId:a.allocation_id,delta:0,existingReceiptBatchId:received?.batch_id||null})]);
   results.push({request:reference,transfer:'TR-'+created.insertId,status:received?'received':'dispatched'});
  }
  const [stock]=await c.query('SELECT * FROM stock_batches ORDER BY batch_id');assert.deepEqual(stock,originalStock,'Stock must not change when linking request history.');
  const [transfers]=await c.query('SELECT * FROM bank_transfers ORDER BY transfer_id');
  // The new nullable columns are the only difference in old transfer records.
  for(const old of originalTransfers){const current=transfers.find(t=>t.transfer_id===old.transfer_id);for(const [key,value] of Object.entries(old))assert.deepEqual(current[key],value);}
  await c.commit();console.log(JSON.stringify({linked:results,stockUnchanged:true,noMessagesSent:true},null,2));
 }catch(error){await c.rollback();console.error(error.message);process.exitCode=1;}finally{c.release();await pool.end();}
})();
