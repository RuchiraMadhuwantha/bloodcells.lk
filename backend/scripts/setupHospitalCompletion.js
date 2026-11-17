const path=require('path');
require('dotenv').config({path:path.join(__dirname,'../.env')});
const pool=require('../config/db');
const additions=[['stock_batches','volume_ml','DECIMAL(12,2) UNSIGNED NULL'],['stock_batches','appointment_id','INT UNSIGNED NULL'],['hospital_blood_usage','volume_ml','DECIMAL(12,2) UNSIGNED NULL'],['bank_transfers','volume_ml','DECIMAL(12,2) UNSIGNED NULL']];
(async()=>{try{
  for(const [table,column,definition] of additions){
    const [rows]=await pool.query('SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=?',[table,column]);
    if(!rows.length)await pool.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
  const [indexes]=await pool.query("SHOW INDEX FROM stock_batches WHERE Key_name='uq_stock_collection_appointment'");
  if(!indexes.length)await pool.query('ALTER TABLE stock_batches ADD UNIQUE KEY uq_stock_collection_appointment (appointment_id), ADD CONSTRAINT fk_stock_collection_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(appointment_id)');
  console.log('Hospital collection links and volume columns are ready. Existing volumes remain unknown.');
}catch(e){console.error(e.message);process.exitCode=1;}finally{await pool.end();}})();
