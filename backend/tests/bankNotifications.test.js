const test=require('node:test');
const assert=require('node:assert/strict');
let query;
const pool={query:(...args)=>query(...args)};
require.cache[require.resolve('../config/db')]={id:require.resolve('../config/db'),filename:require.resolve('../config/db'),loaded:true,exports:pool};
const model=require('../models/bankNotificationModel');
test('audience preview scopes active donors and parameterizes filters',async()=>{
  let captured;query=async(sql,values)=>{captured={sql,values};return [[{donorId:4}]];};
  const result=await model.recipients({mode:'selected',donorIds:[4],bloodGroup:'O+',district:"x' OR 1=1"});
  assert.match(captured.sql,/u.role='donor'/);assert.match(captured.sql,/u.account_status='active'/);assert.match(captured.sql,/donor_id IN \(\?\)/);
  assert.deepEqual(captured.values,['O+',"x' OR 1=1",[4]]);assert.equal(result.recipientCount,1);assert.equal(result.complete,true);
});
test('selected audience cannot silently become an unrestricted broadcast',async()=>{
  query=()=>{throw Error('Unexpected database access');};
  await assert.rejects(model.recipients({mode:'selected',donorIds:[]}),{statusCode:400});
});
test('more than 500 matching donors requires narrowing the audience',async()=>{
  query=async()=>[Array.from({length:501},(_,i)=>({donorId:i+1}))];
  const result=await model.recipients({mode:'filters'});assert.equal(result.overLimit,true);assert.equal(result.complete,false);assert.equal(result.items.length,500);assert.equal(result.recipientCount,null);
});
test('campaign targeting counts registered participants only',async()=>{
  const calls=[];query=async(sql,p)=>{calls.push({sql,p});return sql.startsWith('SELECT campaign_id')?[[{campaign_id:7,status:'Upcoming'}]]:[[]];};
  await model.recipients({mode:'filters',campaignId:7});assert.match(calls[1].sql,/EXISTS/);assert.match(calls[1].sql,/cr.status='registered'/);assert.deepEqual(calls[1].p,[7]);
});
for(const status of ['Draft','Cancelled'])test('cannot target '+status+' campaign registrations',async()=>{
  query=async()=>[[{campaign_id:7,status}]];await assert.rejects(model.recipients({mode:'filters',campaignId:7}),{statusCode:409});
});
test('campaign membership is checked again under locks when sending',async()=>{
  const calls=[];const c={query:async(sql,p)=>{calls.push({sql,p});return sql.startsWith('SELECT campaign_id')?[[{campaign_id:7,status:'Completed'}]]:[[{donor_id:4}]];}};
  await assert.rejects(model.validateCampaignRecipients(c,7,[4,5]),{statusCode:409});assert.ok(calls.every(call=>call.sql.includes('FOR UPDATE')));
});
test('announcement details require the original sending bank account',async()=>{
  let params;query=async(sql,p)=>{params=p;return [[]];};await assert.rejects(model.details(9,4),{statusCode:404});assert.deepEqual(params,[4,9]);
});
