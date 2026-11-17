const path = require('path');
require('dotenv').config({path:path.join(__dirname,'../.env')});
const pool = require('../config/db');
(async()=>{
  let connection;
  try {
    const [columns] = await pool.query("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='campaigns' AND COLUMN_NAME='hospital_id'");
    if (!columns.length) await pool.query('ALTER TABLE campaigns ADD COLUMN hospital_id INT UNSIGNED NULL, ADD CONSTRAINT fk_campaign_hospital FOREIGN KEY (hospital_id) REFERENCES hospitals(hospital_id)');
    connection = await pool.getConnection(); await connection.beginTransaction();
    const [result] = await connection.query(`UPDATE campaigns c JOIN (
      SELECT hospital_name,district,MIN(hospital_id) AS hospital_id FROM hospitals
      GROUP BY hospital_name,district HAVING COUNT(*)=1
    ) h ON h.hospital_name=c.venue_name AND h.district=c.district
    SET c.hospital_id=h.hospital_id WHERE c.hospital_id IS NULL`);
    await connection.commit();
    console.log(JSON.stringify({hospitalAssignmentsReady:true,matchedExistingCampaigns:result.affectedRows}));
  } catch(error) {if(connection)await connection.rollback();console.error(error.message);process.exitCode=1;}
  finally {if(connection)connection.release();await pool.end();}
})();
