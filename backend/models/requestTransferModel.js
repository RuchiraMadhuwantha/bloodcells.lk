const s=require('./bankInventoryModel');
const {createNotification}=require('./notificationModel');
const requestReference=id=>'BR-'+String(id).padStart(5,'0');

const hospitalDestination=async(c,hospitalId)=>{
 const [staff]=await c.query("SELECT u.user_id FROM users u JOIN hospitals h ON h.user_id=u.user_id WHERE h.hospital_id=? AND u.role='hospital' AND u.account_status='active' FOR UPDATE",[hospitalId]);
 if(!staff.length)throw s.fail(409,'The receiving hospital account is not active.');
 await c.query(`INSERT INTO stock_locations (hospital_id,name,district,kind)
  SELECT h.hospital_id,h.hospital_name,h.district,'hospital' FROM hospitals h WHERE h.hospital_id=?
  ON DUPLICATE KEY UPDATE hospital_id=VALUES(hospital_id)`,[hospitalId]);
 const [locations]=await c.query("SELECT location_id FROM stock_locations WHERE hospital_id=? AND kind='hospital' AND active=1 FOR UPDATE",[hospitalId]);
 if(!locations.length)throw s.fail(409,'The hospital stock location is not active.');
 return {id:locations[0].location_id,userId:staff[0].user_id};
};

// The request transaction has already deducted stock. Record its journey only;
// never call the manual-transfer dispatch operation or deduct any units here.
const recordIssuedTransfer=async(c,{request,allocation,batch,volumeMl,actor,destination})=>{
 const reference=requestReference(request.request_id);
 const [created]=await c.query(`INSERT INTO bank_transfers
  (source_location_id,destination_location_id,source_batch_id,quantity,reason,created_by_user_id,status,request_id,request_allocation_id,volume_ml)
  VALUES (?,?,?,?,?,?,'dispatched',?,?,?)`,
 [batch.location_id,destination.id,batch.batch_id,allocation.quantity,'Blood issued for '+reference,actor,request.request_id,allocation.allocation_id,volumeMl]);
 await s.audit(c,actor,'transfer-dispatch',batch.location_id,batch.batch_id,created.insertId,{requestId:request.request_id,allocationId:allocation.allocation_id,quantity:allocation.quantity,volumeMl,delta:0,reason:'Stock deducted by the blood request issue record'});
 await createNotification({userId:destination.userId,type:'general',title:'Blood issued for your request',message:`${reference}: ${allocation.quantity} unit(s) of ${request.blood_group} are on the way in transfer TR-${created.insertId}. Confirm arrival in Blood Transfers.`,relatedType:'transfer',relatedId:created.insertId,actionRoute:'hospital-transfers'},c);
 return created.insertId;
};
module.exports={hospitalDestination,recordIssuedTransfer,requestReference};
