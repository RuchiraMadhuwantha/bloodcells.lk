const path=require('path');
require('dotenv').config({path:path.join(__dirname,'../.env')});
const pool=require('../config/db');
(async()=>{try{
  const [columns]=await pool.query("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='appointments' AND COLUMN_NAME='campaign_id'");
  if(!columns.length)await pool.query('ALTER TABLE appointments ADD COLUMN campaign_id INT UNSIGNED NULL');
  const [indexes]=await pool.query("SHOW INDEX FROM appointments WHERE Key_name='idx_appointment_campaign_status'");
  if(!indexes.length)await pool.query('ALTER TABLE appointments ADD KEY idx_appointment_campaign_status (campaign_id,status)');
  const [keys]=await pool.query("SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME='appointments' AND CONSTRAINT_NAME='fk_appointment_campaign'");
  if(!keys.length)await pool.query('ALTER TABLE appointments ADD CONSTRAINT fk_appointment_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns(campaign_id)');
  console.log('Campaign donation links are ready. Historical donations remain unassigned until staff link them.');
}catch(e){console.error(e.message);process.exitCode=1;}finally{await pool.end();}})();
