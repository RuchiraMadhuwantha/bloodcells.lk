const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const pool = require('../config/db');
const required = ['stock_locations', 'stock_batches', 'hospital_blood_usage', 'stock_movements', 'hospital_operation_keys', 'bank_location_access', 'bank_operations', 'bank_audit', 'bank_transfers', 'bank_request_allocations', 'bank_outreach', 'bank_deliveries', 'bank_stock_thresholds'];
(async () => {
  try {
    const [database] = await pool.query('SELECT DATABASE() AS name');
    const [tables] = await pool.query('SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()');
    console.log(JSON.stringify({ database: database[0].name, missingTables: required.filter(name => !tables.some(row => row.name === name)), mode: process.argv.includes('--apply') ? 'apply' : 'read-only' }));
    if (!process.argv.includes('--apply')) return;
    if (!process.argv.includes('--database') || process.argv[process.argv.indexOf('--database') + 1] !== database[0].name) throw new Error('Explicit database target must match configured database. Obtain approval before applying.');
    for (const file of ['003_hospital_operations.sql', '004_bank_operations.sql']) {
      const sql = fs.readFileSync(path.join(__dirname, '../database/migrations', file), 'utf8');
      const statements = sql.split(/;\s*(?:\r?\n|$)/).map(statement => statement.split(/\r?\n/).filter(line => !line.trim().startsWith('--')).join('\n').trim()).filter(Boolean);
      for (const statement of statements) {
        const match = statement.match(/^CREATE TABLE IF NOT EXISTS ([a-z_]+)\s*\(/);
        if (!match || !required.includes(match[1])) throw new Error('Unexpected migration statement.');
        await pool.query(statement);
      }
    }
    console.log('Additive migrations completed. No seed or existing record mutation performed.');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
  finally { await pool.end(); }
})();
