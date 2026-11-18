const test=require('node:test');const assert=require('node:assert/strict');
let message,options,accepted=true,created=0;
const nodemailerPath=require.resolve('nodemailer');
require.cache[nodemailerPath]={id:nodemailerPath,filename:nodemailerPath,loaded:true,exports:{createTransport:config=>{options=config;created++;return {verify:async()=>true,sendMail:async data=>{message=data;return {accepted:accepted?[data.to.address]:[],messageId:data.messageId};}};}}};
const mail=require('../services/emailService');
const keys=['EMAIL_ENABLED','SMTP_HOST','SMTP_PORT','SMTP_SECURE','SMTP_USER','SMTP_PASS','SMTP_FROM'];
const original=Object.fromEntries(keys.map(k=>[k,process.env[k]]));let sequence=0;
test.beforeEach(()=>{message=null;accepted=true;Object.assign(process.env,{EMAIL_ENABLED:'true',SMTP_HOST:'smtp.gmail.com',SMTP_PORT:'465',SMTP_SECURE:'true',SMTP_USER:'sender@example.test',SMTP_PASS:'fixture-'+(++sequence),SMTP_FROM:'sender@example.test'});});
test.after(()=>{for(const key of keys){if(original[key]===undefined)delete process.env[key];else process.env[key]=original[key];}});
test('email remains unavailable until the sender is configured and enabled',async()=>{
  process.env.EMAIL_ENABLED='false';const before=created;assert.equal(mail.status().available,false);await assert.rejects(mail.send({to:'donor@example.test',title:'Title',message:'Body'}),{statusCode:503});assert.equal(created,before);
});
test('Gmail transport keeps credentials server-side and sends to one recipient',async()=>{
  await mail.send({to:'donor@example.test',title:'Title\r\nNext line',message:'Body',messageId:'<fixture@example.test>'});
  assert.equal(options.secure,true);assert.equal(options.disableFileAccess,true);assert.equal(options.disableUrlAccess,true);
  assert.deepEqual(message.to,{address:'donor@example.test'});assert.equal(message.subject,'Title Next line');assert.match(message.text,/Change your preference/);assert.equal(message.cc,undefined);assert.equal(message.bcc,undefined);
  const exposed=JSON.stringify(mail.status());assert.ok(!exposed.includes(process.env.SMTP_PASS));assert.ok(!exposed.includes('auth'));
});
test('resolved SMTP result without recipient acceptance is a failure',async()=>{
  accepted=false;await assert.rejects(mail.send({to:'donor@example.test',title:'Title',message:'Body'}),{code:'RECIPIENT_REJECTED'});
});
test('connection verification sends no message',async()=>{
  assert.match((await mail.verify()).message,/No email was sent/);assert.equal(message,null);
});
