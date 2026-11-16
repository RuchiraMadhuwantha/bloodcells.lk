const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const pool = require('../config/db');
const columns = {
  booking_nic: 'VARCHAR(20) NULL',
  collected_units: 'INT UNSIGNED NULL',
  collected_volume_ml: 'INT UNSIGNED NULL',
  collection_recorded_at: 'DATETIME NULL',
  collection_recorded_by_user_id: 'INT UNSIGNED NULL',
};
(async () => {
  try {
    for (const [column, definition] of Object.entries(columns)) {
      const [existing] = await pool.query('SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?', ['appointments', column]);
      if (!existing.length) await pool.query(`ALTER TABLE appointments ADD COLUMN ${column} ${definition}`);
    }
    console.log('Appointment NIC and collection fields are ready. Existing records were left unchanged.');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
  finally { await pool.end(); }
})();
