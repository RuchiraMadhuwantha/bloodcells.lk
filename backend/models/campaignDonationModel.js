const pool=require('../config/db');
const {toDateString}=require('../utils/date');
const fail=(statusCode,message)=>Object.assign(new Error(message),{statusCode});
const choices=async(hospitalId,date)=>{
  const [rows]=await pool.query("SELECT campaign_id AS id,name,campaign_date AS date,status FROM campaigns WHERE hospital_id=? AND status IN ('Upcoming','Active','Completed')"+(date?' AND campaign_date=?':'')+' ORDER BY campaign_date DESC,campaign_id DESC',date?[hospitalId,date]:[hospitalId]);
  return rows.map(r=>({...r,date:toDateString(r.date)}));
};
// Caller owns the appointment transaction and row lock. One donation can belong
// to at most one campaign; registration alone never counts as a donation.
const link=async(c,appointment,actor,campaignId,note)=>{
  const next=campaignId==null?null:Number(campaignId),previous=appointment.campaignId||null;
  if(next){
    const [campaigns]=await c.query('SELECT campaign_id,hospital_id,campaign_date,status FROM campaigns WHERE campaign_id=? FOR UPDATE',[next]);
    const campaign=campaigns[0];
    if(!campaign||campaign.hospital_id!==appointment.hospitalId)throw fail(404,'Campaign not found at this hospital.');
    if(!['Upcoming','Active','Completed'].includes(campaign.status))throw fail(409,'Select a published or completed campaign.');
    if(toDateString(campaign.campaign_date)!==appointment.appointmentDate)throw fail(409,'Campaign date must match the donation date.');
  }
  if(next===previous)return {replayed:true};
  await c.query('UPDATE appointments SET campaign_id=? WHERE appointment_id=?',[next,appointment.id]);
  await require('./bankInventoryModel').audit(c,actor,'campaign-donation-link',null,null,next||previous,{appointmentId:appointment.id,hospitalId:appointment.hospitalId,previousCampaignId:previous,campaignId:next,reason:note});
  return {replayed:false};
};
module.exports={choices,link};
