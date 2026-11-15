const fs=require('fs');
const path=require('path');
require('dotenv').config({path:path.join(__dirname,'../.env')});
const pool=require('../config/db');
const tables=['stock_locations','stock_batches','hospital_blood_usage','stock_movements','hospital_operation_keys'];
(async()=>{
  try{
    const [db]=await pool.query('SELECT DATABASE() AS name');const name=db[0].name;
    const [existing]=await pool.query('SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()');
    const missing=tables.filter(t=>!existing.some(r=>r.name===t));
    console.log(JSON.stringify({database:name,missingTables:missing,mode:process.argv.includes('--apply')?'apply':'read-only check'}));
    if(!process.argv.includes('--apply'))return;
    const target=process.argv[process.argv.indexOf('--database')+1];
    if(!process.argv.includes('--database')||target!==name)throw new Error('Explicit --database must match the configured database. Obtain approval before applying this migration.');
    const sql=fs.readFileSync(path.join(__dirname,'../database/migrations/003_hospital_operations.sql'),'utf8');
    const statements=sql.split(/;\s*(?:\r?\n|$)/).map(s=>s.split(/\r?\n/).filter(line=>!line.trim().startsWith('--')).join('\n').trim()).filter(Boolean);
    for(const statement of statements){
      if(!/^CREATE TABLE IF NOT EXISTS (stock_locations|stock_batches|hospital_blood_usage|stock_movements|hospital_operation_keys)\s*\(/.test(statement))throw new Error('Unexpected migration statement. No further statements executed.');
      await pool.query(statement);
    }
    console.log('Hospital migration applied. No existing tables or records were changed.');
  }catch(e){console.error(e.message);process.exitCode=1;}finally{await pool.end();}
})();
