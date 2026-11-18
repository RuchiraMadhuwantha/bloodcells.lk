// Read-only: checks the linkage and the bank/hospital transfer views. No sends.
const path=require('node:path');
const assert=require('node:assert/strict');
require('dotenv').config({path:path.join(__dirname,'../.env'),quiet:true});
const jwt=require('jsonwebtoken');
const pool=require('../config/db');
(async()=>{
 try{
  const [rows]=await pool.query(`SELECT a.allocation_id,a.quantity,a.batch_id,r.request_id,h.user_id,t.transfer_id,t.request_id AS linked_request,t.quantity AS transfer_quantity,t.source_batch_id
   FROM bank_request_allocations a JOIN blood_requests r ON r.request_id=a.request_id JOIN hospitals h ON h.hospital_id=r.hospital_id
   LEFT JOIN bank_transfers t ON t.request_allocation_id=a.allocation_id WHERE a.status='issued' AND r.status='fulfilled' ORDER BY a.allocation_id`);
  const [banks]=await pool.query("SELECT user_id FROM users WHERE role='blood_bank' AND account_status='active' ORDER BY user_id");
  const read=async(route,user)=>{
   const response=await fetch('http://localhost:5000/api/'+route,{headers:{Authorization:'Bearer '+jwt.sign({user_id:user},process.env.JWT_SECRET,{expiresIn:'1m'})}});
   const body=await response.json();assert.equal(response.status,200,body.message);return body.items;
  };
  const bankItems=(await Promise.all(banks.map(b=>read('bank/transfers',b.user_id)))).flat();
  const hospitalItems=new Map();
  for(const row of rows){
   assert.ok(row.transfer_id,'Issued allocation is missing its transfer.');assert.equal(row.linked_request,row.request_id);assert.equal(row.quantity,row.transfer_quantity);assert.equal(row.batch_id,row.source_batch_id);
   assert.ok(bankItems.some(t=>t.id===row.transfer_id&&t.requestId===row.request_id));
   if(!hospitalItems.has(row.user_id))hospitalItems.set(row.user_id,await read('hospitals/mine/transfers',row.user_id));
   assert.ok(hospitalItems.get(row.user_id).some(t=>t.id===row.transfer_id&&t.requestId===row.request_id));
  }
  assert.equal(new Set(rows.map(r=>r.allocation_id)).size,rows.length);
  console.log('PASS: '+rows.length+' issued allocations have unique linked transfers, correct units and batches, and appear in both portals. No stock changes or messages sent.');
 }finally{await pool.end();}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
