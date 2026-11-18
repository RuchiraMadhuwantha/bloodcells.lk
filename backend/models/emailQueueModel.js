const s=require('./bankInventoryModel');
const mail=require('../services/emailService');
const retry=(actor,id,key)=>s.mutate(actor,'email-retry',key,{id},async c=>{
  if(!mail.status().available)throw s.fail(503,'Connect the sender email account before retrying email.');
  const [outreach]=await c.query('SELECT channel FROM bank_outreach WHERE outreach_id=? AND actor_user_id=? FOR UPDATE',[id,actor]);
  if(!outreach[0])throw s.fail(404,'Announcement not found.');
  if(outreach[0].channel!=='email')throw s.fail(409,'Only email announcements support this retry action.');
  const [rows]=await c.query(`SELECT bd.delivery_id,bd.attempts,bd.error_code,bd.recipient_email,u.email,u.account_status,d.email_opt_in
    FROM bank_deliveries bd JOIN users u ON u.user_id=bd.user_id LEFT JOIN donors d ON d.user_id=bd.user_id
    WHERE bd.outreach_id=? AND bd.status='failed' ORDER BY bd.delivery_id FOR UPDATE`,[id]);
  const eligible=rows.filter(r=>r.error_code!=='DELIVERY_UNCERTAIN'&&r.attempts<3&&r.account_status==='active'&&r.email_opt_in&&mail.validEmail(r.recipient_email)&&r.email.toLowerCase()===r.recipient_email.toLowerCase());
  if(!eligible.length)throw s.fail(409,'No failed emails are eligible for retry. Check consent, address changes and delivery uncertainty.');
  await c.query("UPDATE bank_deliveries SET status='queued',error_code=NULL,sending_started_at=NULL WHERE delivery_id IN (?) AND status='failed'",[eligible.map(r=>r.delivery_id)]);
  await s.audit(c,actor,'email-retry-queued',null,null,id,{recipientCount:eligible.length});
  return {id,recipientCount:eligible.length,deliveryStatus:'Queued for email'};
});
module.exports={retry};
