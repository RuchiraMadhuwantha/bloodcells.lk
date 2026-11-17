const s = require('./bankInventoryModel');
const {moveVolume,deductVolume}=require('../utils/bloodVolume');
const { toDateString } = require('../utils/date');
const { createNotification } = require('./notificationModel');
const list = async actor => {
  const [rows] = await s.pool.query(`SELECT DISTINCT t.transfer_id AS id,CONCAT('TR-',t.transfer_id) AS reference,t.*,t.volume_ml AS volumeMl,src.kind AS sourceKind,dst.kind AS destinationKind,src.name AS sourceCentre,src.district AS sourceDistrict,dst.name AS destinationCentre,b.blood_group AS bloodGroup,b.reference AS batchReference,b.component,b.collection_date AS collectionDate,b.expiry_date AS expiryDate,t.created_at AS createdAt,t.updated_at AS updatedAt
    FROM bank_transfers t JOIN stock_locations src ON src.location_id=t.source_location_id JOIN stock_locations dst ON dst.location_id=t.destination_location_id JOIN stock_batches b ON b.batch_id=t.source_batch_id
    JOIN bank_location_access a ON a.location_id IN (t.source_location_id,t.destination_location_id) WHERE a.user_id=? ORDER BY t.transfer_id DESC LIMIT 10001`,[actor]);
  if(rows.length>10000) throw s.fail(413,'Transfer list exceeds 10000 records.');
  return rows;
};
const create = (actor,data,key) => s.mutate(actor,'transfer-create',key,data,async c => {
  const b=await s.lockBatch(c,actor,data.batchId);
  if(b.location_id===data.destinationId) throw s.fail(400,'Source and destination must differ.');
  const [dest]=await c.query("SELECT location_id FROM stock_locations WHERE location_id=? AND active=1 AND (kind='blood_bank' OR (kind='hospital' AND EXISTS (SELECT 1 FROM hospitals h JOIN users u ON u.user_id=h.user_id WHERE h.hospital_id=stock_locations.hospital_id AND u.role='hospital' AND u.account_status='active')))",[data.destinationId]);
  if(!dest.length) throw s.fail(400,'Registered active destination required.');
  s.usable(b,data.quantity);
  const [r]=await c.query('INSERT INTO bank_transfers (source_location_id,destination_location_id,source_batch_id,quantity,reason,created_by_user_id) VALUES (?,?,?,?,?,?)',[b.location_id,data.destinationId,b.batch_id,data.quantity,data.reason,actor]);
  if(data.volumeMl!=null){moveVolume(b,data.quantity,data.volumeMl);await c.query('UPDATE bank_transfers SET volume_ml=? WHERE transfer_id=?',[data.volumeMl,r.insertId]);}
  await s.audit(c,actor,'transfer-requested',b.location_id,b.batch_id,r.insertId,{quantity:data.quantity,destination:data.destinationId});
  return {id:r.insertId};
});
const transition = (actor,id,data,key) => s.mutate(actor,'transfer-action',key,{id,...data},async c => {
  const [rows]=await c.query('SELECT * FROM bank_transfers WHERE transfer_id=? FOR UPDATE',[id]);
  if(!rows.length) throw s.fail(404,'Transfer not found.');
  const t=rows[0],action=data.action;
  const allowed={requested:['approve','reject','cancel'],approved:['dispatch','reject','cancel'],dispatched:['receive']};
  if(!(allowed[t.status] || []).includes(action)) throw s.fail(409,'Invalid or already completed transfer transition.');
  const location=action==='receive'?t.destination_location_id:t.source_location_id;
  await s.authorize(c,actor,location);
  const [batches]=await c.query('SELECT *,CURDATE() AS database_today FROM stock_batches WHERE batch_id=? FOR UPDATE',[t.source_batch_id]);const b=batches[0];
  if(action==='approve') {
    s.usable(b,t.quantity);
    await c.query('UPDATE stock_batches SET reserved_units=reserved_units+?,version=version+1 WHERE batch_id=?',[t.quantity,b.batch_id]);
  }
  if(action==='dispatch') {
    s.usable(b,t.quantity,true);
    if(Number(b.reserved_units)<t.quantity) throw s.fail(409,'Transfer reservation is missing.');
    const volume=moveVolume(b,Number(t.quantity),t.volume_ml);
    await c.query('UPDATE stock_batches SET quantity=quantity-?,reserved_units=reserved_units-?,version=version+1 WHERE batch_id=?',[t.quantity,t.quantity,b.batch_id]);
    await deductVolume(c,b,volume);
    if(volume!=null)await c.query('UPDATE bank_transfers SET volume_ml=? WHERE transfer_id=?',[volume,id]);
    const [hospitals]=await c.query("SELECT h.user_id FROM stock_locations l JOIN hospitals h ON h.hospital_id=l.hospital_id WHERE l.location_id=? AND l.kind='hospital'",[t.destination_location_id]);
    for(const hospital of hospitals)await createNotification({userId:hospital.user_id,type:'general',title:'Incoming blood from blood bank',message:`Transfer TR-${id}: ${t.quantity} unit(s) of ${b.blood_group} are on the way. Confirm receipt in Blood Transfers.`,relatedType:'transfer',relatedId:id,actionRoute:'hospital-transfers'},c);
  }
  if(['reject','cancel'].includes(action) && t.status==='approved') {
    if(Number(b.reserved_units)<t.quantity) throw s.fail(409,'Transfer reservation is missing.');
    await c.query('UPDATE stock_batches SET reserved_units=reserved_units-?,version=version+1 WHERE batch_id=?',[t.quantity,b.batch_id]);
  }
  let destinationBatchId=null;
  if(action==='receive') {
    // Physical receipt is recorded even when expired; it never becomes usable.
    const status=data.accepted && b.status==='usable' && toDateString(b.expiry_date)>=(b.database_today || toDateString(new Date()))?'usable':'quarantined';
    const [r]=await c.query('INSERT INTO stock_batches (location_id,reference,blood_group,component,quantity,reserved_units,collection_date,expiry_date,status) VALUES (?,?,?,?,?,0,?,?,?)',[t.destination_location_id,'TRANSFER-'+id+'-BATCH-'+b.batch_id,b.blood_group,b.component,t.quantity,b.collection_date,b.expiry_date,status]);
    destinationBatchId=r.insertId;
    if(t.volume_ml!=null)await c.query('UPDATE stock_batches SET volume_ml=? WHERE batch_id=?',[t.volume_ml,destinationBatchId]);
    await s.audit(c,actor,'transfer-receipt',location,destinationBatchId,id,{sourceBatchId:b.batch_id,delta:t.quantity,after:t.quantity,status,receivingChecks:data.note});
    const [hospitals] = await c.query("SELECT h.user_id FROM stock_locations l JOIN hospitals h ON h.hospital_id=l.hospital_id WHERE l.location_id=? AND l.kind='hospital'",[t.source_location_id]);
    for (const hospital of hospitals) await createNotification({userId:hospital.user_id,type:'general',title:'Blood bank received your transfer',message:`Transfer TR-${id}: the blood bank received ${t.quantity} unit(s) of ${b.blood_group}. Receiving status: ${status}.`,relatedType:'transfer',relatedId:id,actionRoute:'hospital-transfers'},c);
  }
  const status={approve:'approved',reject:'rejected',cancel:'cancelled',dispatch:'dispatched',receive:'received'}[action];
  await c.query('UPDATE bank_transfers SET status=?,destination_batch_id=COALESCE(?,destination_batch_id) WHERE transfer_id=?',[status,destinationBatchId,id]);
  await s.audit(c,actor,'transfer-'+action,location,b.batch_id,id,{from:t.status,status,quantity:t.quantity,delta:action==='dispatch'?-t.quantity:0,note:data.note});
  return {id,status};
});
const allocate = (actor,id,data,key) => s.mutate(actor,'request-allocate',key,{id,...data},async c => {
  const [rows]=await c.query('SELECT * FROM blood_requests WHERE request_id=? FOR UPDATE',[id]);const r=rows[0];
  if(!r) throw s.fail(404,'Request not found.');
  if(r.status!=='approved') throw s.fail(409,'Approve the request before reserving batches.');
  const [existing]=await c.query("SELECT allocation_id FROM bank_request_allocations WHERE request_id=? AND status='reserved'",[id]);
  if(existing.length) throw s.fail(409,'This request already has reserved stock.');
  if(data.items.reduce((sum,i)=>sum+i.quantity,0)!==Number(r.quantity)) throw s.fail(400,'Allocation must equal the complete requested quantity.');
  for(const item of [...data.items].sort((a,b)=>a.batchId-b.batchId)) {
    const b=await s.lockBatch(c,actor,item.batchId);s.usable(b,item.quantity);
    if(b.blood_group!==r.blood_group) throw s.fail(400,'Allocated batch group must match the request.');
    await c.query('UPDATE stock_batches SET reserved_units=reserved_units+?,version=version+1 WHERE batch_id=?',[item.quantity,b.batch_id]);
    await c.query('INSERT INTO bank_request_allocations (request_id,batch_id,quantity,actor_user_id) VALUES (?,?,?,?)',[id,b.batch_id,item.quantity,actor]);
    await s.audit(c,actor,'request-reserved',b.location_id,b.batch_id,id,{quantity:item.quantity});
  }
  return {id,status:'reserved'};
});
// Called inside request status transactions, also for hospital cancellation.
const allocations = async (c,id) => {
  try {const [rows]=await c.query("SELECT a.*,b.location_id FROM bank_request_allocations a JOIN stock_batches b ON b.batch_id=a.batch_id WHERE a.request_id=? AND a.status='reserved' ORDER BY a.batch_id FOR UPDATE",[id]);return rows;}
  catch(e){if(e.code==='ER_NO_SUCH_TABLE')return [];throw e;}
};
const release = async (c,id,actor) => {
  for(const a of await allocations(c,id)) {
    const [r]=await c.query('UPDATE stock_batches SET reserved_units=reserved_units-?,version=version+1 WHERE batch_id=? AND reserved_units>=?',[a.quantity,a.batch_id,a.quantity]);
    if(r.affectedRows!==1) throw s.fail(409,'Reservation changed; refresh before retrying.');
    await c.query("UPDATE bank_request_allocations SET status='released' WHERE allocation_id=?",[a.allocation_id]);
    await s.audit(c,actor,'request-released',a.location_id,a.batch_id,id,{quantity:a.quantity});
  }
};
const fulfill = ({requestId,reviewedByUserId:actor,note}) => s.transaction(async c => {
  const [rows]=await c.query('SELECT * FROM blood_requests WHERE request_id=? FOR UPDATE',[requestId]);const r=rows[0];
  if(!r) throw s.fail(404,'Request not found.');
  if(r.status!=='approved') throw s.fail(409,'Only an approved request can be fulfilled.');
  const items=await allocations(c,requestId);
  if(!items.length || items.reduce((sum,a)=>sum+Number(a.quantity),0)!==Number(r.quantity)) throw s.fail(409,'Reserve verified batches for the complete request before fulfillment. Legacy aggregate stock cannot be issued.');
  for(const a of items) {
    const b=await s.lockBatch(c,actor,a.batch_id);s.usable(b,a.quantity,true);
    const issuedVolume=moveVolume(b,Number(a.quantity));
    const [updated]=await c.query('UPDATE stock_batches SET quantity=quantity-?,reserved_units=reserved_units-?,version=version+1 WHERE batch_id=? AND quantity>=? AND reserved_units>=?',[a.quantity,a.quantity,b.batch_id,a.quantity,a.quantity]);
    if(updated.affectedRows!==1) throw s.fail(409,'Reservation is no longer available.');
    await deductVolume(c,b,issuedVolume);
    await c.query("UPDATE bank_request_allocations SET status='issued' WHERE allocation_id=?",[a.allocation_id]);
    await s.audit(c,actor,'request-issued',b.location_id,b.batch_id,requestId,{volumeMl:issuedVolume,delta:-a.quantity,after:Number(b.quantity)-a.quantity,hospitalId:r.hospital_id,note});
  }
  await c.query("UPDATE blood_requests SET status='fulfilled',fulfilled_at=NOW(),reviewed_at=NOW(),reviewed_by_user_id=?,decision_note=? WHERE request_id=?",[actor,note || null,requestId]);
  return requestId;
});
module.exports={list,create,transition,allocate,allocations,release,fulfill};
