// Uses the appointment transaction: collection, batch, movement and notifications
// either all commit or all roll back. Unique appointment_id prevents duplicates.
const saveCollectionBatch=async(c,appointment,actor,data)=>{
  await c.query("INSERT INTO stock_locations (hospital_id,name,district,kind) VALUES (?,?,?,'hospital') ON DUPLICATE KEY UPDATE hospital_id=VALUES(hospital_id)",[appointment.hospitalId,appointment.hospitalName,appointment.district]);
  const [locations]=await c.query("SELECT location_id FROM stock_locations WHERE hospital_id=? AND kind='hospital' AND active=1",[appointment.hospitalId]);
  if(!locations[0])throw Object.assign(new Error('Active hospital stock location is required.'),{statusCode:409});
  const [batch]=await c.query("INSERT INTO stock_batches (location_id,reference,blood_group,component,quantity,reserved_units,collection_date,expiry_date,status,volume_ml,appointment_id) VALUES (?,?,?,?,?,0,?,?,'quarantined',?,?)",
    [locations[0].location_id,'COLLECTION-'+appointment.reference,appointment.bloodGroup,data.component,data.collectedUnits,appointment.appointmentDate,data.expiryDate,data.collectedVolumeMl,appointment.id]);
  await c.query('INSERT INTO stock_movements (hospital_id,batch_id,quantity_delta,quantity_after,reason,actor_user_id) VALUES (?,?,?,?,?,?)',[appointment.hospitalId,batch.insertId,data.collectedUnits,data.collectedUnits,`Collection ${appointment.reference}: ${data.collectedVolumeMl} mL; quarantine pending checks`,actor]);
  return batch.insertId;
};
module.exports={saveCollectionBatch};
