// Usage: node scripts/configureMainBloodBank.js <existing stock location ID>
// Keeps stock and historical transfer IDs intact. Credentials are never printed.
const fs=require('node:fs');
const path=require('node:path');
require('dotenv').config({path:path.join(__dirname,'../.env'),quiet:true});
const pool=require('../config/db');
const id=Number(process.argv[2]);
(async()=>{
 let connection,previousEnv,envWritten=false;
 const envPath=path.join(__dirname,'../.env');
 try{
  if(!Number.isSafeInteger(id)||id<1)throw new Error('Provide an existing blood bank stock location number.');
  connection=await pool.getConnection();await connection.beginTransaction();
  const [locations]=await connection.query("SELECT * FROM stock_locations WHERE location_id=? AND kind='blood_bank' AND active=1 FOR UPDATE",[id]);
  if(!locations.length)throw new Error('An active blood bank stock location is required.');
  const [staff]=await connection.query("SELECT a.user_id FROM bank_location_access a JOIN users u ON u.user_id=a.user_id WHERE a.location_id=? AND u.role='blood_bank' AND u.account_status='active' ORDER BY a.user_id LIMIT 1",[id]);
  if(!staff.length)throw new Error('Assign an active blood bank staff account first.');
  previousEnv=fs.readFileSync(envPath,'utf8');
  const previousMain=previousEnv.match(/^MAIN_BLOOD_BANK_LOCATION_ID=(.*)$/m)?.[1]||null;
  const folder=path.join(__dirname,'../.local-backups');fs.mkdirSync(folder,{recursive:true});
  fs.writeFileSync(path.join(folder,'main-bank-setup-'+Date.now()+'.json'),JSON.stringify({location:locations[0],previousMain}),{flag:'wx',mode:0o600});
  await connection.query("UPDATE stock_locations SET name='Main Blood Bank' WHERE location_id=?",[id]);
  await connection.query('INSERT INTO bank_audit (actor_user_id,event,location_id,entity_id,details) VALUES (?,?,?,?,?)',[staff[0].user_id,'main-bank-configured',id,id,JSON.stringify({previousName:locations[0].name,name:'Main Blood Bank'})]);
  const next=/^MAIN_BLOOD_BANK_LOCATION_ID=/m.test(previousEnv)?previousEnv.replace(/^MAIN_BLOOD_BANK_LOCATION_ID=.*$/m,'MAIN_BLOOD_BANK_LOCATION_ID='+id):previousEnv+'\nMAIN_BLOOD_BANK_LOCATION_ID='+id+'\n';
  fs.writeFileSync(envPath,next);envWritten=true;
  await connection.commit();
  console.log('Main blood bank configured. Stock quantities and past transfers were preserved. Restart the backend to activate this setting.');
 }catch(error){
  if(connection)await connection.rollback();
  if(envWritten)fs.writeFileSync(envPath,previousEnv);
  console.error(error.message);process.exitCode=1;
 }finally{if(connection)connection.release();await pool.end();}
})();
