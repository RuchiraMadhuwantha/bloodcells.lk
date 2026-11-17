const test=require('node:test');
const assert=require('node:assert/strict');
let read=async()=>[[]];
require.cache[require.resolve('../config/db')]={id:require.resolve('../config/db'),filename:require.resolve('../config/db'),loaded:true,exports:{query:(...args)=>read(...args)}};
const model=require('../models/campaignDonationModel');
const appointment={id:5,hospitalId:10,appointmentDate:'2026-11-17',campaignId:null};
const fixture=(patch={})=>{
  const state={updates:[],audits:[]};
  state.c={query:async(sql,p)=>{
    if(sql.startsWith('SELECT campaign_id'))return [[{campaign_id:1,hospital_id:10,campaign_date:'2026-11-17',status:'Completed',...patch}]];
    if(sql.startsWith('UPDATE appointments')){state.updates.push(p);return [{affectedRows:1}];}
    if(sql.startsWith('INSERT INTO bank_audit')){state.audits.push(JSON.parse(p[5]));return [{insertId:1}];}
    throw Error(sql);
  }};return state;
};
test('explicit campaign link preserves collection data and audits the association',async()=>{
  const s=fixture();await model.link(s.c,appointment,9,1,'Confirmed campaign attendance');
  assert.deepEqual(s.updates,[[1,5]]);assert.equal(s.audits[0].appointmentId,5);assert.equal(s.audits[0].previousCampaignId,null);assert.equal(s.audits[0].campaignId,1);
});
test('same campaign retry is a no-op and unlinking is audited',async()=>{
  const s=fixture();assert.equal((await model.link(s.c,{...appointment,campaignId:1},9,1,'Confirmed')).replayed,true);assert.equal(s.updates.length,0);
  await model.link(s.c,{...appointment,campaignId:1},9,null,'Correction');assert.deepEqual(s.updates,[[null,5]]);assert.equal(s.audits[0].previousCampaignId,1);
});
for(const patch of [{hospital_id:11},{campaign_date:'2026-11-18'},{status:'Draft'},{status:'Cancelled'}])test('invalid campaign association rejected '+JSON.stringify(patch),async()=>{
  const s=fixture(patch);await assert.rejects(model.link(s.c,appointment,9,1,'Confirmed'));assert.equal(s.updates.length,0);assert.equal(s.audits.length,0);
});
test('collection campaign choices are scoped to the hospital and donation date',async()=>{
  let captured;read=async(sql,p)=>{captured={sql,p};return [[]];};await model.choices(10,'2026-11-17');
  assert.match(captured.sql,/hospital_id=\?/);assert.match(captured.sql,/campaign_date=\?/);assert.deepEqual(captured.p,[10,'2026-11-17']);
});
