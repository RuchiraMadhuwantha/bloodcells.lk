const path=require('path');
require('dotenv').config({path:path.join(__dirname,'../.env')});
const pool=require('../config/db');
const bank=require('../models/bankTransferModel');
const hospital=require('../models/hospitalTransferModel');
(async()=>{
 try {
  const [users]=await pool.query("SELECT user_id FROM users WHERE role='blood_bank' AND account_status='active' ORDER BY (username='demo_bank') DESC,user_id LIMIT 1");
  if(!users.length)throw new Error('An active demo blood bank is required.');
  const actor=users[0].user_id;
  const [hospitals]=await pool.query(`SELECT h.hospital_id,h.hospital_name,h.user_id,h.district,l.location_id FROM hospitals h
    JOIN users u ON u.user_id=h.user_id JOIN stock_locations l ON l.hospital_id=h.hospital_id AND l.kind='hospital' AND l.active=1
    WHERE u.role='hospital' AND u.account_status='active' AND EXISTS (
      SELECT 1 FROM hospital_operation_keys k WHERE k.hospital_id=h.hospital_id AND k.operation='demo-data-v1'
    ) ORDER BY h.hospital_id`);
  if(!hospitals.length)throw new Error('Run db:seed:hospitals before adding incoming transfer demos.');
  const result=[];
  for(const h of hospitals)for(const scenario of [{name:'received',quantity:2},{name:'awaiting',quantity:1}]){
    const prefix='demo-incoming-v1-h'+h.hospital_id+'-'+scenario.name;
    const [prior]=await pool.query("SELECT t.source_batch_id FROM bank_operations o JOIN bank_transfers t ON t.transfer_id=CAST(JSON_UNQUOTE(JSON_EXTRACT(o.result_json,'$.id')) AS UNSIGNED) WHERE o.actor_user_id=? AND o.operation='transfer-create' AND o.idempotency_key=?",[actor,prefix+'-create']);
    let batchId=prior[0]?.source_batch_id;
    if(!batchId){
      const [batches]=await pool.query(`SELECT b.batch_id FROM stock_batches b JOIN stock_locations l ON l.location_id=b.location_id
        JOIN bank_location_access a ON a.location_id=l.location_id WHERE a.user_id=? AND l.kind='blood_bank' AND l.active=1
        AND l.district=? AND b.reference LIKE 'DEMO-P1-BANK-%' AND b.blood_group='A+' AND b.status='usable'
        AND b.expiry_date>=CURDATE() AND b.quantity-b.reserved_units>=? ORDER BY b.batch_id LIMIT 1`,[actor,h.district,scenario.quantity]);
      if(!batches.length)throw new Error('No usable demo bank batch for '+h.hospital_name);
      batchId=batches[0].batch_id;
    }
    const transfer=await bank.create(actor,{batchId,destinationId:h.location_id,quantity:scenario.quantity,reason:'DEMO incoming blood for H'+h.hospital_id+' / '+scenario.name},prefix+'-create');
    await bank.transition(actor,transfer.id,{action:'approve',note:'DEMO transfer approved'},prefix+'-approve');
    await bank.transition(actor,transfer.id,{action:'dispatch',note:'DEMO blood sent to hospital'},prefix+'-dispatch');
    if(scenario.name==='received')await hospital.receive({hospitalId:h.hospital_id,hospitalName:h.hospital_name},h.user_id,transfer.id,{accepted:true,note:'DEMO receiving checks accepted'},prefix+'-receive');
    const [saved]=await hospital.list(h.hospital_id,transfer.id);
    if(saved.direction!=='incoming'||saved.status!==(scenario.name==='received'?'received':'dispatched'))throw new Error('Demo transfer state did not match.');
    result.push({hospital:h.hospital_name,reference:saved.reference,units:saved.quantity,status:saved.status,alreadyCreated:transfer.replayed});
  }
  console.log(JSON.stringify({demo:true,incomingTransfers:result},null,2));
 } finally {await pool.end();}
})().catch(e=>{console.error(String(e.stack||e));process.exitCode=1;});
