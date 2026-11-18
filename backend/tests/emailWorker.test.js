const test=require('node:test');const assert=require('node:assert/strict');
const {processOne}=require('../services/emailWorker');
const fixture=(patch={})=>{
  const item={delivery_id:1,user_id:4,recipient_email:'donor@example.test',email:'donor@example.test',email_opt_in:1,account_status:'active',title:'Campaign update',message:'Message',status:'queued',attempts:0,...patch};
  const query=async(sql,p=[])=>{
    if(sql.startsWith('SELECT'))return [[...(item.status==='queued'?[{...item}]:[])]];
    if(sql.includes("status='sending'" )&&sql.startsWith('UPDATE')&&!sql.includes("status='delivered'")&&!sql.includes("status='failed'")){item.status='sending';item.attempts++;}
    else if(sql.includes("status='delivered'")){item.status='delivered';item.messageId=p[0];}
    else if(sql.includes("status='failed'")){item.status='failed';item.error=p[0];}
    return [{affectedRows:1}];
  };
  const connection={query,beginTransaction:async()=>{},commit:async()=>{},rollback:async()=>{},release:()=>{}};
  return {item,db:{query,getConnection:async()=>connection}};
};
test('queued email is accepted once and is never presented as an inbox read',async()=>{
  const {item,db}=fixture();let sends=0;
  const send=async message=>{sends++;assert.equal(message.to,'donor@example.test');assert.equal(message.messageId,'<bloodcells-delivery-1@bloodcells.lk>');return {messageId:'provider-message-id'};};
  await processOne({db,send});assert.equal(item.status,'delivered');assert.equal(item.attempts,1);assert.equal(item.messageId,'provider-message-id');
  assert.equal(await processOne({db,send}),false);assert.equal(sends,1);
});
for(const patch of [{email_opt_in:0},{account_status:'inactive'},{email:'changed@example.test'}])test('worker rechecks opt-in and current email '+JSON.stringify(patch),async()=>{
  const {item,db}=fixture(patch);await processOne({db,send:()=>{throw Error('Must not send');}});assert.equal(item.status,'failed');assert.equal(item.attempts,0);
});
test('uncertain SMTP outcome cannot cause an automatic duplicate',async()=>{
  const {item,db}=fixture();let sends=0;const send=async()=>{sends++;throw Object.assign(new Error('Timeout'),{code:'ETIMEDOUT',command:'DATA'});};
  await processOne({db,send});assert.equal(item.error,'DELIVERY_UNCERTAIN');await processOne({db,send});assert.equal(sends,1);
});
test('connection failure before SMTP data is distinguished from an uncertain send',async()=>{
  const {item,db}=fixture();await processOne({db,send:async()=>{throw Object.assign(new Error('Connection failed'),{code:'ECONNECTION',command:'CONN'});}});assert.equal(item.error,'CONNECTION_FAILED');
});
test('authentication failure is recorded and pauses the worker cycle',async()=>{
  const {item,db}=fixture();await assert.rejects(processOne({db,send:async()=>{throw Object.assign(new Error('Authentication failed'),{code:'EAUTH'});}}),{code:'EAUTH'});assert.equal(item.error,'EAUTH');
});
