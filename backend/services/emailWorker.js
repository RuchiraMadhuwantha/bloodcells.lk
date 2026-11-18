const pool=require('../config/db');
const mail=require('./emailService');
// SMTP acceptance is recorded separately from inbox delivery. An interrupted
// send is never silently requeued: SMTP cannot guarantee exactly-once delivery.
const processOne=async({db=pool,send=mail.send}={})=>{
  const c=await db.getConnection();let item;
  try{
    await c.beginTransaction();
    const [rows]=await c.query(`SELECT bd.delivery_id,bd.user_id,bd.recipient_email,bd.attempts,o.title,o.message,u.email,u.account_status,d.email_opt_in
      FROM bank_deliveries bd JOIN bank_outreach o ON o.outreach_id=bd.outreach_id JOIN users u ON u.user_id=bd.user_id
      LEFT JOIN donors d ON d.user_id=bd.user_id WHERE o.channel='email' AND bd.status='queued'
      ORDER BY bd.delivery_id LIMIT 1 FOR UPDATE SKIP LOCKED`);
    item=rows[0];if(!item){await c.commit();return false;}
    let blocked;
    if(item.account_status!=='active'||!item.email_opt_in)blocked='CONSENT_REVOKED';
    else if(!mail.validEmail(item.recipient_email)||item.email.toLowerCase()!==item.recipient_email.toLowerCase())blocked='EMAIL_CHANGED';
    if(blocked){await c.query("UPDATE bank_deliveries SET status='failed',error_code=? WHERE delivery_id=?",[blocked,item.delivery_id]);await c.commit();return true;}
    await c.query("UPDATE bank_deliveries SET status='sending',attempts=attempts+1,sending_started_at=NOW(),error_code=NULL WHERE delivery_id=?",[item.delivery_id]);
    await c.commit();
  }catch(e){await c.rollback();throw e;}finally{c.release();}
  try{
    const result=await send({to:item.recipient_email,title:item.title,message:item.message,messageId:'<bloodcells-delivery-'+item.delivery_id+'@bloodcells.lk>'});
    await db.query("UPDATE bank_deliveries SET status='delivered',accepted_at=NOW(),message_id=?,error_code=NULL WHERE delivery_id=? AND status='sending'",[result.messageId,item.delivery_id]);
  }catch(e){
    const code=['EAUTH','EENVELOPE','RECIPIENT_REJECTED','INVALID_EMAIL'].includes(e.code)?e.code:e.command==='CONN'?'CONNECTION_FAILED':'DELIVERY_UNCERTAIN';
    await db.query("UPDATE bank_deliveries SET status='failed',error_code=? WHERE delivery_id=? AND status='sending'",[code,item.delivery_id]);
    if(e.code==='EAUTH')throw Object.assign(new Error('SMTP authentication failed.'),{code:'EAUTH'});
  }
  return true;
};
const start=()=>{
  let running=false,verifiedUntil=0,retryAfter=0;
  const timer=setInterval(async()=>{if(running||Date.now()<retryAfter||!mail.status().available)return;running=true;try{
    if(Date.now()>verifiedUntil){await mail.verify();verifiedUntil=Date.now()+60000;}
    await pool.query("UPDATE bank_deliveries SET status='failed',error_code='DELIVERY_UNCERTAIN' WHERE status='sending' AND sending_started_at<DATE_SUB(NOW(),INTERVAL 15 MINUTE)");
    await processOne();
  }catch(e){retryAfter=Date.now()+60000;verifiedUntil=0;console.error('[email-worker] Queue processing failed ('+(e.code||'internal')+').');}finally{running=false;}},2000);
  timer.unref();return ()=>clearInterval(timer);
};
module.exports={processOne,start};
