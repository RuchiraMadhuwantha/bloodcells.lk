const {getMainBloodBank}=require('./mainBloodBankModel');
const {batchCode}=require('../utils/batchCode');
const pool = require('../config/db');
const {moveVolume,deductVolume}=require('../utils/bloodVolume');
const hospital = require('./hospitalOperationsModel');
const bank = require('./bankInventoryModel');
const { createNotification } = require('./notificationModel');
const { toDateString } = require('../utils/date');

const destinations = async () => [await getMainBloodBank()];
const list = async (hospitalId, id) => {
  const [rows] = await pool.query(`SELECT t.transfer_id AS id,CONCAT('TR-',t.transfer_id) AS reference,t.quantity,t.status,t.reason,t.request_id AS requestId,
    CASE WHEN dst.hospital_id=? THEN 'incoming' ELSE 'outgoing' END AS direction,
    t.volume_ml AS volumeMl,t.created_at AS createdAt,t.updated_at AS updatedAt,src.name AS sourceCentre,dst.name AS destinationCentre,
    dst.district AS destinationDistrict,b.batch_id AS batchId,t.destination_batch_id AS receivedBatchId,b.reference AS batchReference,b.blood_group AS bloodGroup,b.component,
    b.collection_date AS collectionDate,b.expiry_date AS expiryDate,b.status AS batchStatus,received.status AS receiptStatus
    FROM bank_transfers t JOIN stock_locations src ON src.location_id=t.source_location_id
    JOIN stock_locations dst ON dst.location_id=t.destination_location_id JOIN stock_batches b ON b.batch_id=t.source_batch_id
    LEFT JOIN stock_batches received ON received.batch_id=t.destination_batch_id
    WHERE ((src.kind='hospital' AND src.hospital_id=?) OR (dst.kind='hospital' AND dst.hospital_id=?))${id ? ' AND t.transfer_id=?' : ''}
    ORDER BY t.transfer_id DESC LIMIT 10001`, id ? [hospitalId,hospitalId,hospitalId,id] : [hospitalId,hospitalId,hospitalId]);
  if (rows.length > 10000) throw hospital.error(413,'Transfer history exceeds 10000 records.');
  return rows.map(r => ({...r,requestReference:r.requestId?'BR-'+String(r.requestId).padStart(5,'0'):null,batchCode:batchCode(r.batchId),receivedBatchCode:batchCode(r.receivedBatchId),quantity:Number(r.quantity),volumeMl:r.volumeMl==null?null:Number(r.volumeMl),collectionDate:toDateString(r.collectionDate),expiryDate:toDateString(r.expiryDate)}));
};
const send = (owner, actor, data, key) => hospital.runOperation({hospitalId:owner.hospitalId,operation:'transfer-send',key,payload:data},async c => {
  const [rows] = await c.query(`SELECT b.*,CURDATE() AS database_today FROM stock_batches b JOIN stock_locations l ON l.location_id=b.location_id
    WHERE b.batch_id=? AND l.hospital_id=? AND l.kind='hospital' AND l.active=1 FOR UPDATE`,[data.batchId,owner.hospitalId]);
  const b=rows[0];
  if (!b) throw hospital.error(404,'Hospital stock packet not found.');
  bank.usable(b,data.quantity);
  const main=await getMainBloodBank(c,true);
  if(data.destinationId!=null&&Number(data.destinationId)!==main.id)throw hospital.error(400,'Hospitals can send blood only to the main blood bank. Refresh the page and try again.');
  const volume=moveVolume(b,data.quantity,data.volumeMl);
  const [changed] = await c.query('UPDATE stock_batches SET quantity=quantity-?,version=version+1 WHERE batch_id=? AND quantity-reserved_units>=?',[data.quantity,b.batch_id,data.quantity]);
  if (changed.affectedRows !== 1) throw hospital.error(409,'Available stock changed. Refresh before sending.');
  const [transfer] = await c.query("INSERT INTO bank_transfers (source_location_id,destination_location_id,source_batch_id,quantity,reason,created_by_user_id,status) VALUES (?,?,?,?,?,?,'dispatched')",[b.location_id,main.id,b.batch_id,data.quantity,data.reason,actor]);
  if(volume!=null)await c.query('UPDATE bank_transfers SET volume_ml=? WHERE transfer_id=?',[volume,transfer.insertId]);
  await deductVolume(c,b,volume);
  await c.query('INSERT INTO stock_movements (hospital_id,batch_id,quantity_delta,quantity_after,reason,actor_user_id) VALUES (?,?,?,?,?,?)',
    [owner.hospitalId,b.batch_id,-data.quantity,Number(b.quantity)-data.quantity,'Transfer TR-'+transfer.insertId+': '+data.reason,actor]);
  await bank.audit(c,actor,'transfer-dispatch',main.id,b.batch_id,transfer.insertId,{sourceHospitalId:owner.hospitalId,sourceLocationId:b.location_id,quantity:data.quantity,volumeMl:volume,delta:-data.quantity,reason:data.reason});
  const [recipients] = await c.query("SELECT DISTINCT u.user_id FROM bank_location_access a JOIN users u ON u.user_id=a.user_id WHERE a.location_id=? AND u.role='blood_bank' AND u.account_status='active'",[main.id]);
  for (const recipient of recipients) await createNotification({userId:recipient.user_id,type:'general',title:'Incoming hospital blood transfer',
    message:`${owner.hospitalName} sent ${data.quantity} unit(s) of ${b.blood_group}, packet ${batchCode(b.batch_id)}, transfer TR-${transfer.insertId}. Confirm physical receipt in Blood Transfers.`,
    relatedType:'transfer',relatedId:transfer.insertId,actionRoute:'bank-transfers'},c);
  return transfer.insertId;
});
const receive = (owner,actor,id,data,key) => hospital.runOperation({hospitalId:owner.hospitalId,operation:'transfer-receive',key,payload:{id,...data}},async c=>{
  const [rows]=await c.query(`SELECT t.* FROM bank_transfers t JOIN stock_locations dst ON dst.location_id=t.destination_location_id
    WHERE t.transfer_id=? AND dst.hospital_id=? AND dst.kind='hospital' AND dst.active=1 FOR UPDATE`,[id,owner.hospitalId]);
  const transfer=rows[0];
  if(!transfer)throw hospital.error(404,'Incoming hospital transfer not found.');
  if(transfer.status!=='dispatched')throw hospital.error(409,'Only an incoming transfer in transit can be received.');
  const [batches]=await c.query('SELECT *,CURDATE() AS database_today FROM stock_batches WHERE batch_id=? FOR UPDATE',[transfer.source_batch_id]);
  const source=batches[0];
  if(!source)throw hospital.error(409,'Source packet is unavailable.');
  const status=data.accepted===true&&source.status==='usable'&&toDateString(source.expiry_date)>=source.database_today?'usable':'quarantined';
  const [batch]=await c.query('INSERT INTO stock_batches (location_id,reference,blood_group,component,quantity,reserved_units,collection_date,expiry_date,status) VALUES (?,?,?,?,?,0,?,?,?)',
    [transfer.destination_location_id,'HOSPITAL-TRANSFER-'+id+'-BATCH-'+source.batch_id,source.blood_group,source.component,transfer.quantity,source.collection_date,source.expiry_date,status]);
  if(transfer.volume_ml!=null)await c.query('UPDATE stock_batches SET volume_ml=? WHERE batch_id=?',[transfer.volume_ml,batch.insertId]);
  await c.query('INSERT INTO stock_movements (hospital_id,batch_id,quantity_delta,quantity_after,reason,actor_user_id) VALUES (?,?,?,?,?,?)',
    [owner.hospitalId,batch.insertId,transfer.quantity,transfer.quantity,'Received bank transfer TR-'+id+': '+data.note,actor]);
  await c.query("UPDATE bank_transfers SET status='received',destination_batch_id=? WHERE transfer_id=?",[batch.insertId,id]);
  await bank.audit(c,actor,'transfer-receipt',transfer.source_location_id,batch.insertId,id,{volumeMl:transfer.volume_ml,sourceBatchId:source.batch_id,hospitalId:owner.hospitalId,delta:transfer.quantity,after:transfer.quantity,status,receivingChecks:data.note});
  const [recipients]=await c.query("SELECT DISTINCT u.user_id FROM bank_location_access a JOIN users u ON u.user_id=a.user_id WHERE a.location_id=? AND u.role='blood_bank' AND u.account_status='active'",[transfer.source_location_id]);
  for(const recipient of recipients)await createNotification({userId:recipient.user_id,type:'general',title:'Hospital received blood transfer',message:`${owner.hospitalName} received ${transfer.quantity} unit(s) of ${source.blood_group}, transfer TR-${id}. Receiving status: ${status}.`,relatedType:'transfer',relatedId:id,actionRoute:'bank-transfers'},c);
  return id;
});
module.exports={destinations,list,send,receive};
