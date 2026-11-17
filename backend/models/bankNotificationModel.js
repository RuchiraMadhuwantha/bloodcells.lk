const s=require('./bankInventoryModel');
const campaign=async(c,id,lock=false)=>{
  const [rows]=await c.query('SELECT campaign_id,name,status FROM campaigns WHERE campaign_id=?'+(lock?' FOR UPDATE':''),[id]);
  if(!rows[0])throw s.fail(404,'Campaign not found.');
  if(!['Upcoming','Active','Completed'].includes(rows[0].status))throw s.fail(409,'Choose a published or completed campaign.');
  return rows[0];
};
const recipients=async filters=>{
  if(filters.campaignId)await campaign(s.pool,filters.campaignId);
  if(filters.mode==='selected'&&!filters.donorIds?.length)throw s.fail(400,'Select donors before previewing this audience.');
  const where=["u.role='donor'","u.account_status='active'"],values=[];
  if(filters.bloodGroup){where.push('d.blood_group=?');values.push(filters.bloodGroup);}
  if(filters.district){where.push('d.district=?');values.push(filters.district);}
  if(filters.mode==='selected'){where.push('d.donor_id IN (?)');values.push(filters.donorIds);}
  if(filters.campaignId){where.push("EXISTS (SELECT 1 FROM campaign_registrations cr WHERE cr.donor_id=d.donor_id AND cr.campaign_id=? AND cr.status='registered')");values.push(filters.campaignId);}
  const [rows]=await s.pool.query('SELECT d.donor_id AS donorId,d.full_name AS fullName,d.blood_group AS bloodGroup,d.district FROM donors d JOIN users u ON u.user_id=d.user_id WHERE '+where.join(' AND ')+' ORDER BY d.donor_id LIMIT 501',values);
  return {items:rows.slice(0,500),overLimit:rows.length>500,complete:rows.length<=500,recipientCount:rows.length<=500?rows.length:null};
};
const validateCampaignRecipients=async(c,id,donorIds)=>{
  await campaign(c,id,true);
  const [rows]=await c.query("SELECT donor_id FROM campaign_registrations WHERE campaign_id=? AND status='registered' AND donor_id IN (?) ORDER BY donor_id FOR UPDATE",[id,donorIds]);
  if(rows.length!==donorIds.length)throw s.fail(409,'Campaign registration changed. Refresh recipients before sending.');
};
const details=async(actor,id)=>{
  const [rows]=await s.pool.query('SELECT o.outreach_id AS id,o.type,o.title,o.message,o.channel,o.created_at AS createdAt,o.campaign_id AS campaignId,c.name AS campaignName FROM bank_outreach o LEFT JOIN campaigns c ON c.campaign_id=o.campaign_id WHERE o.outreach_id=? AND o.actor_user_id=?',[id,actor]);
  if(!rows[0])throw s.fail(404,'Announcement not found.');
  const [deliveries]=await s.pool.query(`SELECT bd.delivery_id AS id,d.full_name AS donorName,d.blood_group AS bloodGroup,d.district,bd.status,bd.error_code AS errorCode,
    (SELECT n.read_at FROM notifications n WHERE n.related_type='bank_outreach' AND n.related_id=bd.outreach_id AND n.user_id=bd.user_id AND n.is_read=1 ORDER BY n.notification_id LIMIT 1) AS readAt
    FROM bank_deliveries bd LEFT JOIN donors d ON d.user_id=bd.user_id WHERE bd.outreach_id=? ORDER BY bd.delivery_id LIMIT 501`,[id]);
  if(deliveries.length>500)throw s.fail(413,'This announcement exceeds the recipient detail limit.');
  return {...rows[0],deliveries};
};
module.exports={recipients,validateCampaignRecipients,details};
