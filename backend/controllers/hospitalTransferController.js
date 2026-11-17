const model = require('../models/hospitalTransferModel');
const { toFriendlyError } = require('../validators/common');
const handle = fn => async(req,res,next) => {
  try {await fn(req,res);} catch(e) {
    if (['ER_NO_SUCH_TABLE','ER_BAD_FIELD_ERROR'].includes(e.code)) e=Object.assign(new Error('Blood transfers require stock and bank database setup.'),{statusCode:503});
    if (['ER_LOCK_DEADLOCK','ER_LOCK_WAIT_TIMEOUT'].includes(e.code)) e=Object.assign(new Error('Another stock operation is in progress. Retry with the same submission.'),{statusCode:409});
    next(toFriendlyError(e,'Could not complete this blood transfer.'));
  }
};
const destinations=handle(async(req,res)=>res.json({success:true,available:true,items:await model.destinations()}));
const list=handle(async(req,res)=>res.json({success:true,available:true,items:await model.list(req.hospital.hospitalId)}));
const details=handle(async(req,res)=>{
  const [item]=await model.list(req.hospital.hospitalId,req.params.id);
  if(!item)throw Object.assign(new Error('Hospital transfer not found.'),{statusCode:404});
  res.json({success:true,item});
});
const send=handle(async(req,res)=>{
  const result=await model.send(req.hospital,req.user.user_id,req.body,req.get('Idempotency-Key'));
  res.status(result.replayed?200:201).json({success:true,...result,message:'Blood transfer sent. The blood bank has been notified and will confirm receipt.'});
});
const receive=handle(async(req,res)=>{
  const result=await model.receive(req.hospital,req.user.user_id,req.params.id,req.body,req.get('Idempotency-Key'));
  res.json({success:true,...result,message:'Blood receipt confirmed. Hospital inventory and the sending blood bank have been updated.'});
});
module.exports={destinations,list,details,send,receive};
