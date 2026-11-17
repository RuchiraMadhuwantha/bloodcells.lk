// Read-only integration check. Also exercises real SQL collation compatibility.
const path=require('path');
require('dotenv').config({path:path.join(__dirname,'../.env')});
const assert=require('node:assert/strict');
const pool=require('../config/db');
const inventory=require('../models/bankInventoryModel');
const {getBloodBankStats}=require('../controllers/statsController');
(async()=>{try{
  const [banks]=await pool.query("SELECT user_id FROM users WHERE role='blood_bank' AND account_status='active'");
  assert.ok(banks.length,'An active blood bank is required.');
  for(const {user_id:actor} of banks){
    const stats=await getBloodBankStats(actor);
    assert.equal(stats.inventory.available,true);
    const batches=await inventory.batches(actor);
    assert.equal(stats.inventory.totalUnits,batches.reduce((sum,b)=>sum+b.availableUnits,0));
    const centres=await inventory.centres(actor);
    assert.ok(stats.inventory.regional.every(r=>centres.some(c=>c.id===r.location_id)));
    for(const group of stats.inventory.byBloodGroup){
      assert.equal(group.availableUnits,batches.filter(b=>b.bloodGroup===group.bloodGroup).reduce((sum,b)=>sum+b.availableUnits,0));
      const filtered=await inventory.regional(actor,{bloodGroup:group.bloodGroup});
      assert.ok(filtered.every(r=>r.bloodGroup===group.bloodGroup));
    }
    console.log('PASS bank '+actor+': dashboard totals, blood-group filters and assigned-centre scope match saved inventory.');
  }
}finally{await pool.end();}})().catch(e=>{console.error(e.message);process.exitCode=1;});
