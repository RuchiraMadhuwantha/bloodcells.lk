const pool = require('../config/db');
const model = require('../models/hospitalOperationsModel');
const { getHospitalByUserId } = require('../models/hospitalModel');
const { getRequestsForHospital } = require('../models/bloodRequestModel');
const { toFriendlyError } = require('../validators/common');
const { buildHospitalReport, reportCsv, reportPdf } = require('../utils/hospitalReports');
const protect = (fn) => async (req,res,next) => {
  try { await fn(req,res); } catch(e) {
    if (['ER_NO_SUCH_TABLE','ER_BAD_FIELD_ERROR'].includes(e.code)) return next(model.error(503,'Hospital stock and usage require the approved hospital migration. No changes were saved.'));
    next(toFriendlyError(e,'Hospital operation could not be completed.'));
  }
};
const owner = async(req,res,next) => {
  try {
    const hospital = await getHospitalByUserId(req.user.user_id);
    if (!hospital || hospital.accountStatus!=='active') throw model.error(403,'An approved active hospital is required.');
    req.hospital = hospital; next();
  } catch(e) { next(toFriendlyError(e,'Could not verify hospital access.')); }
};
const filtered = (rows,q,dateField) => rows.filter(r=>(!q.bloodGroup || r.bloodGroup===q.bloodGroup) && (!q.start || r[dateField]>=q.start) && (!q.end || r[dateField]<=q.end));
const stock = protect(async(req,res)=>{
  let rows=await model.getStock(req.hospital.hospitalId);
  rows=filtered(rows,req.query,'collectionDate');
  res.json({success:true,available:true,items:rows,complete:true,totalAvailable:rows.reduce((s,r)=>s+r.availableUnits,0)});
});
const stockDetails = protect(async(req,res)=>{
  const item=await model.getBatch(req.hospital.hospitalId,req.params.id);
  if (!item) throw model.error(404,'Hospital stock record not found.');
  res.json({success:true,item});
});
const addStock = protect(async(req,res)=>{
  const result=await model.createBatch(req.hospital,req.user.user_id,req.body,req.get('Idempotency-Key'));
  res.status(result.replayed?200:201).json({success:true,replayed:result.replayed,item:await model.getBatch(req.hospital.hospitalId,result.id),message:'Hospital stock receipt saved.'});
});
const updateStock = protect(async(req,res)=>{
  const result=await model.updateBatch(req.hospital.hospitalId,req.user.user_id,req.params.id,req.body,req.get('Idempotency-Key'));
  res.json({success:true,replayed:result.replayed,item:await model.getBatch(req.hospital.hospitalId,result.id),message:'Hospital stock updated.'});
});
const changes = protect(async(req,res)=>res.json({success:true,items:await model.getChanges(req.hospital.hospitalId),limit:1000}));
const usage = protect(async(req,res)=>{
  const items=filtered(await model.getUsage(req.hospital.hospitalId),req.query,'usageDate');
  res.json({success:true,available:true,items,complete:true,totalUsage:items.reduce((s,r)=>s+r.quantity,0)});
});
const usageDetails = protect(async(req,res)=>{
  const items=await model.getUsage(req.hospital.hospitalId);
  const item=items.find(r=>r.id===req.params.id);
  if(!item) throw model.error(404,'Hospital usage record not found.');
  res.json({success:true,item});
});
const addUsage = protect(async(req,res)=>{
  const result=await model.recordUsage(req.hospital.hospitalId,req.user.user_id,req.body,req.get('Idempotency-Key'));
  const items=await model.getUsage(req.hospital.hospitalId);
  res.status(result.replayed?200:201).json({success:true,replayed:result.replayed,item:items.find(r=>r.id===result.id),message:'Blood usage and stock deduction saved.'});
});
const availability = protect(async(req,res)=>res.json({success:true,available:true,items:await model.getAvailability(req.query),complete:true,scope:'verified_batches',notice:'Legacy aggregate bank stock is excluded: it has no location, expiry or reservation provenance. Viewing does not reserve or allocate blood.'}));
const updateProfile = protect(async(req,res)=>{
  const columns={hospitalName:'hospital_name',hospitalType:'hospital_type',district:'district',address:'address',contactNumber:'official_phone',contactPersonName:'contact_person_name',contactPersonDesignation:'contact_person_designation',contactPersonPhone:'contact_person_phone',contactPersonEmail:'contact_person_email'};
  const fields=Object.keys(req.body);
  await pool.query('UPDATE hospitals SET '+fields.map(k=>columns[k]+'=?').join(',')+' WHERE hospital_id=?',[...fields.map(k=>req.body[k]),req.hospital.hospitalId]);
  res.json({success:true,hospital:await getHospitalByUserId(req.user.user_id),message:'Hospital profile updated.'});
});
const dashboard = protect(async(req,res)=>{
  const requests=await getRequestsForHospital(req.hospital.hospitalId);
  const counts={total:requests.length};
  for(const status of ['pending','approved','rejected','fulfilled','cancelled']) counts[status]=requests.filter(r=>r.status===status).length;
  counts.emergency=requests.filter(r=>r.urgency==='emergency' && ['pending','approved'].includes(r.status)).length;
  let inventory,usage;
  try {
    const [stock,records]=await Promise.all([model.getStock(req.hospital.hospitalId),model.getUsage(req.hospital.hospitalId)]);
    inventory={available:true,totalAvailable:stock.reduce((s,r)=>s+r.availableUnits,0)};
    usage={available:true,totalUsage:records.reduce((s,r)=>s+r.quantity,0),recent:records.slice(0,5)};
  } catch(e) {
    if(!['ER_NO_SUCH_TABLE','ER_BAD_FIELD_ERROR'].includes(e.code)) throw e;
    inventory={available:false,reason:'Pending hospital migration'};usage={available:false,reason:'Pending hospital migration'};
  }
  res.json({success:true,summary:{requests:counts,inventory,usage,recentRequests:requests.slice(0,5)}});
});
const report = protect(async(req,res)=>{
  const type=req.query.type;
  const items=type==='requests'||type==='fulfillment'
    ? await getRequestsForHospital(req.hospital.hospitalId,{...req.query,maxRows:10001})
    : type==='usage'?await model.getUsage(req.hospital.hospitalId,pool,{...req.query,maxRows:10001}):await model.getStock(req.hospital.hospitalId,pool,{...req.query,maxRows:10001});
  if(items.length>10000) throw model.error(413,'Report exceeds 10000 records. Narrow the date range or blood group.');
  const report=buildHospitalReport(req.hospital,items,req.query);
  if(req.query.format==='pdf') { const content=await reportPdf(report);res.type('application/pdf');res.set('Content-Disposition','attachment; filename="hospital-report.pdf"');res.send(content); }
  else if(req.query.format==='csv') {res.type('text/csv');res.set('Content-Disposition','attachment; filename="hospital-report.csv"');res.send(reportCsv(report));}
  else res.json({success:true,report,complete:true});
});
module.exports={owner,stock,stockDetails,addStock,updateStock,changes,usage,usageDetails,addUsage,availability,updateProfile,dashboard,report};
