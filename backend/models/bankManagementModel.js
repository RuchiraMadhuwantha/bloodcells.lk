const s=require('./bankInventoryModel');
const {createNotification}=require('./notificationModel');
const outreach=(actor,data,key)=>s.mutate(actor,'outreach-create',key,data,async c=>{
  const [recent]=await c.query('SELECT outreach_id FROM bank_outreach WHERE actor_user_id=? AND created_at>DATE_SUB(NOW(),INTERVAL 60 SECOND) LIMIT 1',[actor]);
  if(recent.length)throw s.fail(429,'Wait one minute before creating another outreach.');
  if(data.campaignId)await require('./bankNotificationModel').validateCampaignRecipients(c,data.campaignId,data.donorIds);
  // Explicit recipient selection only. No implicit broadcast or guessed medical eligibility.
  const [recipients]=await c.query("SELECT d.donor_id,d.user_id FROM donors d JOIN users u ON u.user_id=d.user_id WHERE u.role='donor' AND u.account_status='active' AND d.donor_id IN (?) ORDER BY d.donor_id FOR UPDATE",[data.donorIds]);
  if(recipients.length!==new Set(data.donorIds).size)throw s.fail(400,'Every selected recipient must be a currently active registered donor.');
  const [r]=await c.query('INSERT INTO bank_outreach (actor_user_id,type,title,message,channel) VALUES (?,?,?,?,?)',[actor,data.type,data.title,data.message,data.channel]);
  if(data.campaignId)await c.query('UPDATE bank_outreach SET campaign_id=? WHERE outreach_id=?',[data.campaignId,r.insertId]);
  for(const donor of recipients){
    if(data.channel==='in_app')await createNotification({userId:donor.user_id,type:data.type,title:data.title,message:data.message,relatedType:'bank_outreach',relatedId:r.insertId,actionRoute:'donor-notifications'},c);
    await c.query('INSERT INTO bank_deliveries (outreach_id,user_id,status,error_code) VALUES (?,?,?,?)',[r.insertId,donor.user_id,data.channel==='in_app'?'stored':'provider_unconfigured',data.channel==='in_app'?null:'PROVIDER_AND_CONSENT_NOT_CONFIGURED']);
  }
  await s.audit(c,actor,'outreach-created',null,null,r.insertId,{recipientCount:recipients.length,channel:data.channel,campaignId:data.campaignId||null});
  return {id:r.insertId,recipientCount:recipients.length,deliveryStatus:data.channel==='in_app'?'Stored in donor inbox':'Provider and consent integration required; not sent'};
});
const outreachHistory=async actor=>{
  const [rows]=await s.pool.query(`SELECT o.outreach_id AS id,o.type,o.title,o.channel,o.message,o.campaign_id AS campaignId,o.created_at AS createdAt,
    (SELECT COUNT(*) FROM notifications n WHERE n.related_type='bank_outreach' AND n.related_id=o.outreach_id AND n.is_read=1) AS readCount,COUNT(d.delivery_id) AS recipientCount,
    SUM(d.status='stored') AS storedCount,SUM(d.status='delivered') AS deliveredCount,SUM(d.status='provider_unconfigured') AS blockedCount,SUM(d.status='failed') AS failedCount,
    CASE WHEN o.channel='in_app' THEN 'Stored in donor inbox' ELSE 'Provider unconfigured; not sent' END AS deliveryStatus
    FROM bank_outreach o LEFT JOIN bank_deliveries d ON d.outreach_id=o.outreach_id WHERE o.actor_user_id=? GROUP BY o.outreach_id ORDER BY o.outreach_id DESC LIMIT 1000`,[actor]);return rows;
};
const donorStatus=(actor,id,data,key)=>s.mutate(actor,'donor-status',key,{id,...data},async c=>{
  const [rows]=await c.query("SELECT u.user_id,u.account_status FROM donors d JOIN users u ON d.user_id=u.user_id WHERE d.donor_id=? AND u.role='donor' FOR UPDATE",[id]);
  if(!rows.length)throw s.fail(404,'Donor not found.');
  const r=rows[0];
  if(!['active','inactive'].includes(r.account_status)||r.account_status===data.status)throw s.fail(409,'Only active/inactive donor accounts can change to the other state.');
  await c.query("UPDATE users SET account_status=? WHERE user_id=? AND role='donor'",[data.status,r.user_id]);
  await s.audit(c,actor,'donor-account-status',null,null,id,{from:r.account_status,to:data.status,reason:data.reason});return {id,status:data.status};
});
const participants=async id=>{
  const [rows]=await s.pool.query('SELECT cr.registration_id AS id,cr.status,cr.created_at AS registeredAt,d.donor_id AS donorId,d.full_name AS fullName,d.blood_group AS bloodGroup,d.district FROM campaign_registrations cr JOIN donors d ON d.donor_id=cr.donor_id WHERE cr.campaign_id=? ORDER BY cr.registration_id',[id]);return rows;
};
const profile=async actor=>{const [rows]=await s.pool.query("SELECT user_id AS id,username,email,role,account_status AS accountStatus FROM users WHERE user_id=? AND role='blood_bank'",[actor]);return rows[0];};
const saveProfile=async(actor,data)=>{await s.pool.query("UPDATE users SET email=? WHERE user_id=? AND role='blood_bank'",[data.email,actor]);return profile(actor);};
const reschedule=(actor,id,data,key)=>s.mutate(actor,'appointment-reschedule',key,{id,...data},async c=>{
  const model=require('./appointmentModel');
  const appointment=await model.getAppointmentById(id,c,true);
  if(!appointment)throw s.fail(404,'Appointment not found.');
  await model.rescheduleAppointment({appointmentId:id,donorId:appointment.donorId,newDate:data.newDate,newTimeSlot:data.newTimeSlot},c);
  const [donors]=await c.query('SELECT user_id FROM donors WHERE donor_id=?',[appointment.donorId]);
  if(donors[0])await createNotification({userId:donors[0].user_id,type:'appointment_rescheduled',title:'Appointment rescheduled',message:'Your appointment '+appointment.reference+' is now on '+data.newDate+' at '+data.newTimeSlot,relatedType:'appointment',relatedId:id,actionRoute:'donor-appointments'},c);
  await s.audit(c,actor,'appointment-rescheduled',null,null,id,{date:data.newDate,time:data.newTimeSlot});return {id};
});
module.exports={reschedule,outreach,outreachHistory,donorStatus,participants,profile,saveProfile};
