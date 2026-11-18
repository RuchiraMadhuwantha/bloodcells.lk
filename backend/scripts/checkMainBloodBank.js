// Read-only live verification. This never submits a transfer or sends a message.
const path=require('node:path');
const assert=require('node:assert/strict');
require('dotenv').config({path:path.join(__dirname,'../.env'),quiet:true});
const pool=require('../config/db');
const jwt=require('jsonwebtoken');
(async()=>{
 try{
  const [hospitals]=await pool.query("SELECT h.user_id FROM hospitals h JOIN users u ON u.user_id=h.user_id WHERE u.account_status='active'");
  assert.ok(hospitals.length,'An active hospital is required.');
  for(const h of hospitals){
   const response=await fetch('http://localhost:5000/api/hospitals/mine/transfer-destinations',{headers:{Authorization:'Bearer '+jwt.sign({user_id:h.user_id},process.env.JWT_SECRET,{expiresIn:'1m'})}});
   const body=await response.json();assert.equal(response.status,200,body.message);
   assert.equal(body.items.length,1);assert.equal(body.items[0].id,Number(process.env.MAIN_BLOOD_BANK_LOCATION_ID));
   assert.equal(body.items[0].name,'Main Blood Bank');assert.equal(body.items[0].isMain,true);
  }
  console.log('PASS: All '+hospitals.length+' active hospitals use the same Main Blood Bank. No district routing and no transfers sent.');
 }finally{await pool.end();}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
