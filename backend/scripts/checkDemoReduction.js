// Read-only checks after reducing sample records. No messages or emails are sent.
const assert=require('node:assert/strict');
const path=require('node:path');
require('dotenv').config({path:path.join(__dirname,'../.env'),quiet:true});
const pool=require('../config/db');
const jwt=require('jsonwebtoken');
(async()=>{
 try{
  const [hospitals]=await pool.query("SELECT h.user_id FROM hospitals h JOIN users u ON u.user_id=h.user_id WHERE u.account_status='active'");
  let count=0;
  for(const {user_id} of hospitals)for(const section of ['hospitals/mine/inventory','appointments/hospital','campaigns?period=upcoming','hospitals/mine/transfers']){
   const response=await fetch('http://localhost:5000/api/'+section,{headers:{Authorization:'Bearer '+jwt.sign({user_id},process.env.JWT_SECRET,{expiresIn:'1m'})}});
   assert.equal(response.status,200,section);count++;
  }
  const [fks]=await pool.query('SELECT TABLE_NAME AS child,COLUMN_NAME AS childCol,REFERENCED_TABLE_NAME AS parent,REFERENCED_COLUMN_NAME AS parentCol FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL');
  for(const fk of fks){
   const [rows]=await pool.query('SELECT COUNT(*) AS n FROM ?? c LEFT JOIN ?? p ON c.??=p.?? WHERE c.?? IS NOT NULL AND p.?? IS NULL',[fk.child,fk.parent,fk.childCol,fk.parentCol,fk.childCol,fk.parentCol]);
   assert.equal(rows[0].n,0,'Broken record link in '+fk.child);
  }
  const [counts]=await pool.query("SELECT COUNT(*) AS total,SUM(LEFT(u.username,5)='demo_') AS demo FROM donors d JOIN users u ON u.user_id=d.user_id");
  console.log('PASS: '+count+' live hospital views and all database links. Donors: '+counts[0].total+' total, '+counts[0].demo+' demo.');
 }finally{await pool.end();}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
