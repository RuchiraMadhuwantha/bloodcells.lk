const nodemailer=require('nodemailer');
const validEmail=value=>typeof value==='string'&&value.length<=100&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const config=(env=process.env)=>({enabled:env.EMAIL_ENABLED==='true',host:env.SMTP_HOST||'smtp.gmail.com',port:Number(env.SMTP_PORT||465),secure:env.SMTP_SECURE!=='false',user:env.SMTP_USER||'',password:(env.SMTP_PASS||'').replace(/\s/g,''),from:env.SMTP_FROM||env.SMTP_USER||''});
const status=()=>{
  const c=config();const available=c.enabled&&!!c.host&&Number.isInteger(c.port)&&c.port>0&&validEmail(c.user)&&!!c.password&&validEmail(c.from);
  return {available,provider:'Gmail SMTP',reason:available?null:'Connect the sender Gmail account before sending email.'};
};
let transport,transportKey;
const getTransport=()=>{
  if(!status().available)throw Object.assign(new Error('Email connection is not configured.'),{statusCode:503});
  const c=config(),key=JSON.stringify(c);
  if(!transport||transportKey!==key){transport=nodemailer.createTransport({host:c.host,port:c.port,secure:c.secure,requireTLS:!c.secure,auth:{user:c.user,pass:c.password},connectionTimeout:15000,greetingTimeout:15000,socketTimeout:30000,disableFileAccess:true,disableUrlAccess:true});transportKey=key;}
  return transport;
};
const send=async({to,title,message,messageId})=>{
  if(!validEmail(to))throw Object.assign(new Error('Invalid recipient email.'),{code:'INVALID_EMAIL'});
  const result=await getTransport().sendMail({from:{name:'Bloodcells.lk Blood Bank',address:config().from},to:{address:to},subject:title.replace(/[\r\n]+/g,' '),text:message+'\n\nYou receive these announcements because you opted in. Change your preference in Donor Portal > My Profile.',messageId});
  if(!result.accepted?.some(address=>address.toLowerCase()===to.toLowerCase()))throw Object.assign(new Error('Mail server rejected this recipient.'),{code:'RECIPIENT_REJECTED'});
  return {messageId:result.messageId};
};
const verify=async()=>{await getTransport().verify();return {available:true,message:'Email connection verified. No email was sent.'};};
module.exports={validEmail,config,status,send,verify};
