// Integration check against the configured local database. All fixture records,
// movements, stock changes and notifications roll back at the end.
const path=require('path');
require('dotenv').config({path:path.join(__dirname,'../.env')});
const assert=require('node:assert/strict');
const express=require('express');
const jwt=require('jsonwebtoken');
const pool=require('../config/db');
(async()=>{
  let c,server;const originalQuery=pool.query.bind(pool),originalConnection=pool.getConnection.bind(pool);
  try{
    c=await originalConnection();await c.beginTransaction();
    let savepoint=0,current;
    pool.query=(...args)=>c.query(...args);
    pool.getConnection=async()=>({query:(...args)=>c.query(...args),beginTransaction:async()=>{current='check_'+(++savepoint);await c.query('SAVEPOINT '+current);},commit:async()=>c.query('RELEASE SAVEPOINT '+current),rollback:async()=>c.query('ROLLBACK TO SAVEPOINT '+current),release:()=>{}});
    const [hospitals]=await c.query("SELECT h.hospital_id,h.user_id FROM hospitals h JOIN users u ON u.user_id=h.user_id WHERE u.account_status='active' AND u.username LIKE 'demo_hospital%' ORDER BY h.hospital_id");
    assert.ok(hospitals.length>=2,'Two active demo hospitals required');const owner=hospitals[0],foreign=hospitals[1];
    const [banks]=await c.query("SELECT user_id FROM users WHERE username='demo_bank' AND account_status='active'");assert.ok(banks.length);const bank=banks[0].user_id;
    const [donors]=await c.query("SELECT d.donor_id,d.user_id,d.blood_group,d.district FROM donors d JOIN users u ON u.user_id=d.user_id WHERE u.username LIKE 'demo_portal_h%' ORDER BY d.donor_id LIMIT 2");assert.ok(donors.length>=2);
    const [centres]=await c.query('SELECT a.location_id FROM bank_location_access a JOIN stock_locations l ON l.location_id=a.location_id WHERE a.user_id=? AND l.active=1 LIMIT 1',[bank]);assert.ok(centres.length);
    const suffix=Date.now().toString(36);
    const makeCampaign=async(hospitalId,date,status,label)=>{
      const [r]=await c.query('INSERT INTO campaigns (hospital_id,created_by_user_id,name,status,campaign_date,start_time,end_time,organizer_name,district) VALUES (?,?,?,?,?,?,?,?,?)',[hospitalId,bank,label+' '+suffix,status,date,'09:00','12:00','Integration fixture','Integration']);return r.insertId;
    };
    const campaign=await makeCampaign(owner.hospital_id,'2020-01-02','Completed','Integration campaign');
    const otherCampaign=await makeCampaign(foreign.hospital_id,'2020-01-02','Completed','Other hospital campaign');
    const wrongDate=await makeCampaign(owner.hospital_id,'2020-01-03','Completed','Wrong date campaign');
    for(const donor of donors)await c.query('INSERT INTO campaign_registrations (campaign_id,donor_id) VALUES (?,?)',[campaign,donor.donor_id]);
    const [appointment]=await c.query("INSERT INTO appointments (donor_id,hospital_id,appointment_date,time_slot,status,notes) VALUES (?,?,'2020-01-02','03:17','approved',?)",[donors[0].donor_id,owner.hospital_id,'Integration fixture '+suffix]);
    const app=express();app.use(express.json());app.use('/appointments',require('../routes/appointmentRoutes'));app.use('/hospitals/mine',require('../routes/hospitalOperationsRoutes'));app.use('/bank',require('../routes/bankOperationsRoutes'));app.use('/blood-requests',require('../routes/bloodRequestRoutes'));app.use('/campaigns',require('../routes/campaignRoutes'));app.use('/notifications',require('../routes/notificationRoutes'));app.use('/auth',require('../routes/authRoutes'));app.use(require('../middleware/errorMiddleware'));
    server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port;
    const call=async(route,actor,method='GET',body,key)=>{
      const r=await fetch(base+route,{method,headers:{Authorization:'Bearer '+jwt.sign({user_id:actor},process.env.JWT_SECRET,{expiresIn:'5m'}),'Content-Type':'application/json','Idempotency-Key':key||'check-'+suffix+'-'+(++savepoint)},...(body?{body:JSON.stringify(body)}:{})});
      const response=await r.text();assert.ok(r.headers.get('content-type')?.includes('json'),route+' returned '+r.status);const data=JSON.parse(response);return {...data,status:r.status};
    };
    const id=appointment.insertId,collection={collectedUnits:4,collectedVolumeMl:1800,component:'Whole blood (integration fixture)',expiryDate:'2099-01-01',campaignId:campaign};
    assert.equal((await call('/appointments/'+id+'/collection',foreign.user_id,'PUT',collection)).status,403);
    assert.equal((await call('/appointments/'+id+'/collection',owner.user_id,'PUT',{...collection,campaignId:wrongDate})).status,409);
    assert.equal((await call('/appointments/'+id+'/collection',owner.user_id,'PUT',collection)).status,200);
    assert.equal((await call('/appointments/'+id+'/collection',owner.user_id,'PUT',collection)).status,409);
    const campaignResult=await call('/bank/reports?type=campaigns&start=2020-01-02&end=2020-01-02',bank);
    assert.equal(campaignResult.status,200);const campaignRow=campaignResult.report.rows.find(r=>r[0]==='Integration campaign '+suffix);
    assert.ok(campaignRow);assert.deepEqual(campaignRow.slice(5),[2,1,4,1800,0]);
    assert.equal((await call('/appointments/'+id+'/campaign',foreign.user_id,'PUT',{campaignId:campaign,note:'Wrong owner'})).status,404);
    assert.equal((await call('/appointments/'+id+'/campaign',owner.user_id,'PUT',{campaignId:otherCampaign,note:'Wrong hospital'})).status,404);
    assert.equal((await call('/appointments/'+id+'/campaign',owner.user_id,'PUT',{campaignId:wrongDate,note:'Wrong date'})).status,409);
    assert.equal((await call('/appointments/'+id+'/campaign',owner.user_id,'PUT',{campaignId:null,note:'Integration correction'})).status,200);
    assert.equal((await call('/appointments/'+id+'/campaign',owner.user_id,'PUT',{campaignId:campaign,note:'Integration historical link'})).status,200);
    assert.equal((await call('/appointments/'+id+'/campaign',owner.user_id,'PUT',{campaignId:campaign,note:'Integration historical link'})).replayed,true);
    const refreshed=await call('/campaigns/'+campaign,bank);assert.equal(refreshed.campaign.completedDonations,1);assert.equal(refreshed.campaign.collectedUnits,4);assert.equal(refreshed.campaign.collectedVolumeMl,1800);
    for(const format of ['csv','pdf']){
      const exported=await fetch(base+'/bank/reports?type=campaigns&start=2020-01-02&end=2020-01-02&format='+format,{headers:{Authorization:'Bearer '+jwt.sign({user_id:bank},process.env.JWT_SECRET,{expiresIn:'5m'})}});
      assert.equal(exported.status,200);const content=Buffer.from(await exported.arrayBuffer());if(format==='pdf')assert.equal(content.subarray(0,4).toString(),'%PDF');else assert.match(content.toString(),/1800/);
    }
    let inventory=await call('/hospitals/mine/inventory',owner.user_id);let batch=inventory.items.find(b=>b.appointmentId===id);
    assert.ok(batch);assert.equal(batch.quantity,4);assert.equal(batch.volumeMl,1800);assert.equal(batch.status,'quarantined');
    assert.equal((await call('/hospitals/mine/inventory/'+batch.id,owner.user_id,'PUT',{quantity:4,volumeMl:1800,reservedUnits:0,status:'usable',version:batch.version,reason:'Integration receiving checks accepted'})).status,200);
    const usage={batchId:batch.id,bloodGroup:batch.bloodGroup,quantity:1,volumeMl:450,usageDate:'2020-01-03',category:'Integration fixture'};
    const used=await call('/hospitals/mine/blood-usage',owner.user_id,'POST',usage,'check-usage-'+suffix);assert.equal(used.status,201);assert.equal(used.item.volumeMl,450);
    assert.equal((await call('/hospitals/mine/blood-usage',owner.user_id,'POST',usage,'check-usage-'+suffix)).replayed,true);
    const sent=await call('/hospitals/mine/transfers',owner.user_id,'POST',{batchId:batch.id,destinationId:centres[0].location_id,quantity:2,volumeMl:900,reason:'Integration fixture transfer'});assert.equal(sent.status,201);
    assert.equal((await call('/bank/transfers/'+sent.id,bank,'PUT',{action:'receive',accepted:true,note:'Integration receipt'})).status,201);
    const [transfer]=await c.query('SELECT destination_batch_id FROM bank_transfers WHERE transfer_id=?',[sent.id]);
    const returned=await call('/bank/transfers',bank,'POST',{batchId:transfer[0].destination_batch_id,destinationId:batch.locationId,quantity:1,volumeMl:450,reason:'Integration fixture return'});assert.equal(returned.status,201);
    for(const action of ['approve','dispatch'])assert.equal((await call('/bank/transfers/'+returned.id,bank,'PUT',{action,note:'Integration '+action})).status,201);
    assert.equal((await call('/hospitals/mine/transfers/'+returned.id+'/receive',foreign.user_id,'PUT',{accepted:true,note:'Wrong owner'})).status,404);
    assert.equal((await call('/hospitals/mine/transfers/'+returned.id+'/receive',owner.user_id,'PUT',{accepted:true,note:'Integration checked'},'check-receive-'+suffix)).status,200);
    assert.equal((await call('/hospitals/mine/transfers/'+returned.id+'/receive',owner.user_id,'PUT',{accepted:true,note:'Integration checked'},'check-receive-'+suffix)).replayed,true);
    const [balances]=await c.query('SELECT SUM(quantity) AS units,SUM(volume_ml) AS volume FROM stock_batches WHERE appointment_id=? OR reference IN (?,?)',[id,'TRANSFER-'+sent.id+'-BATCH-'+batch.id,'HOSPITAL-TRANSFER-'+returned.id+'-BATCH-'+transfer[0].destination_batch_id]);
    assert.equal(Number(balances[0].units),3);assert.equal(Number(balances[0].volume),1350);
    const [issuedRequest]=await c.query("INSERT INTO blood_requests (hospital_id,requested_by_user_id,blood_group,quantity,status,reason) VALUES (?,?,?,1,'pending',?)",[owner.hospital_id,owner.user_id,batch.bloodGroup,'Integration linked transfer '+suffix]);
    const requestId=issuedRequest.insertId,sourceId=transfer[0].destination_batch_id;
    assert.equal((await call('/blood-requests/'+requestId+'/status',bank,'PUT',{status:'approved',note:'Integration approval'})).status,200);
    assert.equal((await call('/bank/requests/'+requestId+'/allocations',bank,'POST',{items:[{batchId:sourceId,quantity:1}]})).status,201);
    assert.equal((await call('/blood-requests/'+requestId+'/status',bank,'PUT',{status:'fulfilled',note:'Integration issue'})).status,200);
    const bankJourneys=await call('/bank/transfers',bank);const linked=bankJourneys.items.find(t=>t.requestId===requestId);assert.ok(linked);assert.equal(linked.status,'dispatched');assert.equal(Number(linked.volumeMl),450);
    assert.equal((await call('/blood-requests/'+requestId+'/status',bank,'PUT',{status:'fulfilled'})).status,409);
    assert.equal((await call('/bank/transfers/'+linked.id,bank,'PUT',{action:'dispatch',note:'Duplicate dispatch'})).status,409);
    const [issuedSource]=await c.query('SELECT quantity,volume_ml FROM stock_batches WHERE batch_id=?',[sourceId]);assert.equal(issuedSource[0].quantity,0);assert.equal(Number(issuedSource[0].volume_ml),0);
    assert.ok((await call('/hospitals/mine/transfers',owner.user_id)).items.some(t=>t.requestId===requestId));
    assert.ok(!(await call('/hospitals/mine/transfers',foreign.user_id)).items.some(t=>t.requestId===requestId));
    assert.equal((await call('/hospitals/mine/transfers/'+linked.id+'/receive',owner.user_id,'PUT',{accepted:true,note:'Request blood checked'},'check-issued-receive-'+suffix)).status,200);
    assert.equal((await call('/hospitals/mine/transfers/'+linked.id+'/receive',owner.user_id,'PUT',{accepted:true,note:'Request blood checked'},'check-issued-receive-'+suffix)).replayed,true);
    const [receivedRequest]=await c.query('SELECT b.quantity,b.volume_ml FROM bank_transfers t JOIN stock_batches b ON b.batch_id=t.destination_batch_id WHERE t.transfer_id=?',[linked.id]);assert.equal(receivedRequest[0].quantity,1);assert.equal(Number(receivedRequest[0].volume_ml),450);

    for(const type of ['collections','incoming-transfers','outgoing-transfers','inventory','usage']){
      const report=await call('/hospitals/mine/reports?type='+type,owner.user_id);assert.equal(report.status,200);assert.ok(report.report.rows.length);
    }
    const [booking]=await c.query("INSERT INTO appointments (donor_id,hospital_id,appointment_date,time_slot,status,notes) VALUES (?,?,'2099-12-20','03:17','pending',?)",[donors[0].donor_id,owner.hospital_id,'Integration scheduling '+suffix]);
    const bookingId=booking.insertId;
    assert.equal((await call('/appointments/'+bookingId+'/hospital-reschedule',foreign.user_id,'PUT',{appointment_date:'2099-12-21',time_slot:'03:17'})).status,404);
    assert.equal((await call('/appointments/'+bookingId+'/hospital-reschedule',owner.user_id,'PUT',{appointment_date:'2099-12-21',time_slot:'03:17'})).status,200);
    assert.equal((await call('/appointments/'+bookingId+'/hospital-cancel',owner.user_id,'PUT',{})).status,200);
    const [notificationActor]=await c.query("INSERT INTO users (username,email,password_hash,role,account_status) VALUES (?,?,?,'blood_bank','active')",['notification_check_'+suffix,'notification_check_'+suffix+'@example.test','integration-only-not-a-login-password']);
    const sender=notificationActor.insertId;
    const audience=await call('/bank/notification-recipients?mode=filters&campaignId='+campaign,sender);assert.equal(audience.status,200);assert.equal(audience.items.length,2);
    const ids=audience.items.map(d=>d.donorId);
    const announcement={type:'campaign',channel:'in_app',title:'Integration campaign announcement',message:'Temporary integration check',donorIds:ids,campaignId:campaign};
    const announcementSaved=await call('/bank/notifications',sender,'POST',announcement,'notification-check-'+suffix);assert.equal(announcementSaved.status,201);assert.equal(announcementSaved.recipientCount,2);
    const repeated=await call('/bank/notifications',sender,'POST',announcement,'notification-check-'+suffix);assert.equal(repeated.replayed,true);
    assert.equal((await call('/bank/notifications',sender,'POST',announcement,'notification-other-'+suffix)).status,429);
    const inboxDonor=await call('/notifications',donors[0].user_id);const received=inboxDonor.notifications.find(n=>n.relatedType==='bank_outreach'&&n.relatedId===announcementSaved.id);assert.ok(received);
    assert.equal((await call('/notifications/'+received.id+'/read',donors[1].user_id,'PUT',{})).status,404);
    assert.equal((await call('/notifications/'+received.id+'/read',donors[0].user_id,'PUT',{})).status,200);
    const history=await call('/bank/notifications',sender);assert.equal(history.items.length,1);assert.equal(Number(history.items[0].readCount),1);assert.equal(Number(history.items[0].storedCount),2);
    assert.equal((await call('/bank/notifications/'+announcementSaved.id,bank)).status,404);
    const deliveryDetails=await call('/bank/notifications/'+announcementSaved.id,sender);assert.equal(deliveryDetails.item.deliveries.length,2);assert.equal(deliveryDetails.item.deliveries.filter(d=>d.readAt).length,1);
    for(let i=0;i<2;i++)await require('../models/notificationModel').createNotification({userId:sender,type:'general',title:'Integration inbox '+i,message:'Temporary integration inbox check'},c);
    const page=await call('/notifications?limit=1',sender);assert.equal(page.notifications.length,1);assert.equal(page.hasMore,true);
    const nextPage=await call('/notifications?limit=1&offset=1',sender);assert.equal(nextPage.notifications.length,1);assert.equal(nextPage.hasMore,false);assert.notEqual(page.notifications[0].id,nextPage.notifications[0].id);
    const readAll=await call('/notifications/read-all',sender,'PUT',{});assert.equal(readAll.updated,2);
    const [otherInbox]=await c.query("SELECT COUNT(*) AS unread FROM notifications WHERE user_id=? AND related_type='bank_outreach' AND related_id=? AND is_read=0",[donors[1].user_id,announcementSaved.id]);assert.equal(Number(otherInbox[0].unread),1);
    // Fake SMTP is injected explicitly; no external email is sent by this check.
    const emailSettings=['EMAIL_ENABLED','SMTP_USER','SMTP_PASS','SMTP_FROM'];const previousEmail=Object.fromEntries(emailSettings.map(k=>[k,process.env[k]]));
    try{
      Object.assign(process.env,{EMAIL_ENABLED:'true',SMTP_USER:'sender@example.test',SMTP_PASS:'integration-app-password',SMTP_FROM:'sender@example.test'});
      const [emailActor]=await c.query("INSERT INTO users (username,email,password_hash,role,account_status) VALUES (?,?,?,'blood_bank','active')",['email_check_'+suffix,'email_check_'+suffix+'@example.test','integration-only-not-a-login-password']);
      const emailSender=emailActor.insertId;
      assert.equal((await call('/auth/me',donors[0].user_id,'PUT',{email_opt_in:true})).status,200);
      assert.equal((await call('/auth/me',donors[1].user_id,'PUT',{email_opt_in:false})).status,200); // Isolated opt-out fixture; rolled back.
      const emailAudience=await call('/bank/notification-recipients?mode=filters&channel=email&campaignId='+campaign,emailSender);assert.equal(emailAudience.items.length,1);
      const emailBody={...announcement,channel:'email',donorIds:[donors[0].donor_id]};
      assert.equal((await call('/bank/notifications',emailSender,'POST',{...emailBody,donorIds:ids},'email-bad-'+suffix)).status,409);
      const queued=await call('/bank/notifications',emailSender,'POST',emailBody,'email-check-'+suffix);assert.equal(queued.status,201);
      assert.equal((await call('/bank/notifications',emailSender,'POST',emailBody,'email-check-'+suffix)).replayed,true);
      const worker=require('../services/emailWorker');let emails=0;
      await worker.processOne({db:pool,send:async data=>{emails++;assert.ok(data.to);return {messageId:'integration-accepted'};}});
      assert.equal(emails,1);assert.equal((await call('/bank/notifications/'+queued.id,emailSender)).item.deliveries[0].status,'delivered');
      const [emailInbox]=await c.query("SELECT COUNT(*) AS count FROM notifications WHERE related_type='bank_outreach' AND related_id=?",[queued.id]);assert.equal(Number(emailInbox[0].count),0);
      await c.query('UPDATE bank_outreach SET created_at=DATE_SUB(NOW(),INTERVAL 2 MINUTE) WHERE outreach_id=?',[queued.id]);
      const retryQueue=await call('/bank/notifications',emailSender,'POST',emailBody,'email-revoke-'+suffix);assert.equal(retryQueue.status,201);
      await call('/auth/me',donors[0].user_id,'PUT',{email_opt_in:false});
      await worker.processOne({db:pool,send:async()=>{throw Error('Revoked consent must not send');}});
      assert.equal((await call('/bank/notifications/'+retryQueue.id,emailSender)).item.deliveries[0].errorCode,'CONSENT_REVOKED');
      await call('/auth/me',donors[0].user_id,'PUT',{email_opt_in:true});
      assert.equal((await call('/bank/notifications/'+retryQueue.id+'/retry-email',bank,'PUT',{},'email-wrong-'+suffix)).status,404);
      assert.equal((await call('/bank/notifications/'+retryQueue.id+'/retry-email',emailSender,'PUT',{},'email-retry-'+suffix)).status,201);
      await worker.processOne({db:pool,send:async()=>({messageId:'integration-retry-accepted'})});
      assert.equal((await call('/bank/notifications/'+retryQueue.id+'/retry-email',emailSender,'PUT',{},'email-retry-'+suffix)).replayed,true);
      assert.equal((await call('/bank/notifications/'+retryQueue.id,emailSender)).item.deliveries[0].status,'delivered');
    }finally{for(const key of emailSettings){if(previousEmail[key]===undefined)delete process.env[key];else process.env[key]=previousEmail[key];}}
    console.log('PASS: collection-to-inventory, quarantine release, units/mL conservation, durable retries, both transfer directions, request-linked issue and receipt without duplicate stock deductions, campaign links/totals/exports, targeted notifications/read status/pagination, consented email queue/retries (fake SMTP), reports, scheduling, cancellation and hospital isolation. All fixtures rolled back.');
  }finally{
    if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}
    pool.query=originalQuery;pool.getConnection=originalConnection;
    if(c){await c.rollback();c.release();}await pool.end();
  }
})().catch(e=>{console.error(e);process.exitCode=1;});
