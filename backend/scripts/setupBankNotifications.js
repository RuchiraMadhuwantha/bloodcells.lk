const path=require('path');
require('dotenv').config({path:path.join(__dirname,'../.env')});
const pool=require('../config/db');
(async()=>{try{
  const [columns]=await pool.query("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='bank_outreach' AND COLUMN_NAME='campaign_id'");
  if(!columns.length)await pool.query('ALTER TABLE bank_outreach ADD COLUMN campaign_id INT UNSIGNED NULL, ADD CONSTRAINT fk_bank_outreach_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns(campaign_id)');
  console.log('Bank notification campaign targeting is ready. Existing announcements were preserved.');
}catch(e){console.error(e.message);process.exitCode=1;}finally{await pool.end();}})();
