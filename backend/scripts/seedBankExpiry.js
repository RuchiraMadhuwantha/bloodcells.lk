// Seeds fictional expired/expiring batches into the blood bank's own stock
// locations so the Blood Expiry screen has demo data. Safe to rerun: existing
// DEMO-EXP references are kept untouched. Does not move or rewrite existing stock.
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true });

const PREFIX = 'DEMO-EXP';
const baseDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Colombo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const day = (offset) => { const d = new Date(baseDate + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + offset); return d.toISOString().slice(0, 10); };
const stamp = (offset, time = '10:00:00') => day(offset) + ' ' + time;

// Deterministic plan per bank location (ordered by location_id). Mix of
// expired and expiring batches, and of usable/quarantined/discarded statuses,
// so the expiry list, filters and badges all have demo coverage.
const PLAN = [
  [
    { suffix: 'EXPIRED-O-PLUS', bloodGroup: 'O+', quantity: 6, collection: -39, expiry: -4, status: 'usable' },
    { suffix: 'EXPIRING-A-MINUS', bloodGroup: 'A-', quantity: 3, collection: -32, expiry: 2, status: 'usable' },
  ],
  [
    { suffix: 'EXPIRED-B-PLUS', bloodGroup: 'B+', quantity: 2, collection: -38, expiry: -1, status: 'quarantined' },
    { suffix: 'EXPIRING-AB-MINUS', bloodGroup: 'AB-', quantity: 4, collection: -33, expiry: 0, status: 'usable' },
  ],
  [
    { suffix: 'EXPIRED-O-MINUS', bloodGroup: 'O-', quantity: 5, collection: -42, expiry: -8, status: 'discarded' },
    { suffix: 'EXPIRING-A-PLUS', bloodGroup: 'A+', quantity: 2, collection: -29, expiry: 5, status: 'usable' },
    { suffix: 'EXPIRING-B-MINUS', bloodGroup: 'B-', quantity: 3, collection: -27, expiry: 7, status: 'usable' },
  ],
];

async function main() {
  const db = await mysql.createConnection({ host: process.env.DB_HOST, port: process.env.DB_PORT, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, dateStrings: true });
  const report = { demoData: true, date: baseDate, bankLocations: [] };
  const insert = async (table, record) => { const [r] = await db.query('INSERT INTO ' + db.escapeId(table) + ' SET ?', record); return r.insertId; };
  try {
    await db.beginTransaction();
    const [banks] = await db.query("SELECT user_id,username FROM users WHERE role='blood_bank' AND account_status='active' ORDER BY (username='demo_bank') DESC,user_id LIMIT 1 FOR UPDATE");
    if (!banks.length) throw new Error('An active blood bank account is required.');
    const bank = banks[0];
    const [locations] = await db.query("SELECT location_id,name,district FROM stock_locations WHERE kind='blood_bank' AND active=1 ORDER BY location_id FOR UPDATE");
    if (!locations.length) throw new Error('No active blood bank stock locations found.');
    for (const [index, location] of locations.entries()) {
      const plan = PLAN[index % PLAN.length];
      const [access] = await db.query('SELECT user_id FROM bank_location_access WHERE user_id=? AND location_id=?', [bank.user_id, location.location_id]);
      const entry = { id: location.location_id, name: location.name, inserted: [], skipped: [], unassigned: !access.length };
      if (!access.length) { report.bankLocations.push(entry); continue; }
      for (const item of plan) {
        const reference = PREFIX + '-' + location.location_id + '-' + item.suffix;
        const [prior] = await db.query('SELECT batch_id FROM stock_batches WHERE location_id=? AND reference=?', [location.location_id, reference]);
        if (prior.length) { entry.skipped.push(reference); continue; }
        const batchId = await insert('stock_batches', { location_id: location.location_id, reference, blood_group: item.bloodGroup, component: 'Whole blood (DEMO)', quantity: item.quantity, reserved_units: 0, collection_date: day(item.collection), expiry_date: day(item.expiry), status: item.status, volume_ml: 450 * item.quantity, created_at: stamp(item.collection) });
        await insert('bank_audit', { actor_user_id: bank.user_id, event: 'demo-expiry-seed', location_id: location.location_id, batch_id: batchId, entity_id: null, details: JSON.stringify({ delta: item.quantity, after: item.quantity, reason: 'Fictional demo expiry batch', demo: true }), created_at: stamp(item.collection) });
        entry.inserted.push(reference);
      }
      report.bankLocations.push(entry);
    }
    await db.commit();
    report.note = 'Open the Blood Expiry screen as the bank account to review the demo batches. Existing stock was not changed.';
    console.log(JSON.stringify(report, null, 2));
  } catch (error) { await db.rollback(); throw error; }
  finally { await db.end(); }
}
main().catch((error) => { console.error(String(error.stack || error)); process.exitCode = 1; });
