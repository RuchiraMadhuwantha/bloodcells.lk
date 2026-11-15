const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true });
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

const PASSWORD = 'Demo@12345';
const groups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const baseDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Colombo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const day = (offset) => { const date = new Date(baseDate + 'T12:00:00Z'); date.setUTCDate(date.getUTCDate() + offset); return date.toISOString().slice(0, 10); };

async function main() {
  const db = await mysql.createConnection({ host: process.env.DB_HOST, port: process.env.DB_PORT, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME });
  try {
    await db.beginTransaction();
    const [existing] = await db.query("SELECT user_id FROM users WHERE username LIKE 'demo_%'");
    if (existing.length) throw new Error('Demo users already exist. Stopped without inserting duplicates.');
    const hash = await bcrypt.hash(PASSWORD, 10);
    const insert = async (table, record) => {
      const [result] = await db.query('INSERT INTO ' + db.escapeId(table) + ' SET ?', record);
      return result.insertId;
    };
    const user = (username, role, status = 'active') => insert('users', { username, email: username + '@example.test', password_hash: hash, role, account_status: status });
    const bankId = await user('demo_bank', 'blood_bank');
    const centres = [];
    for (const [index, district] of ['Colombo', 'Kandy', 'Galle', 'Kurunegala'].entries()) {
      const userId = await user('demo_hospital' + (index + 1), 'hospital', index === 3 ? 'pending' : 'active');
      const id = await insert('hospitals', { user_id: userId, hospital_name: 'Demo ' + district + ' Donation Centre', hospital_code: 'DEMO-' + (index + 1), hospital_type: 'Demo hospital', district, address: 'Sample venue, ' + district + ' (fictional)', contact_person_name: 'Demo Coordinator', contact_person_email: 'coordinator' + index + '@example.test', reviewed_by_user_id: index === 3 ? null : bankId, reviewed_at: index === 3 ? null : day(0) + ' 08:00:00' });
      centres.push({ id, userId, district });
    }
    const donors = [];
    const names = ['Nimal Perera', 'Kavindi Silva', 'Amal Fernando', 'Dilini Jayasinghe', 'Ruwan Kumara', 'Tharushi Dias', 'Sahan Madushan', 'Ishara Senanayake'];
    for (const [index, bloodGroup] of groups.entries()) {
      const userId = await user('demo_donor' + (index + 1), 'donor');
      const id = await insert('donors', { user_id: userId, full_name: 'Demo ' + names[index], nic: 'DEMO-NIC-' + (index + 1), date_of_birth: `${1990 + index}-04-15`, gender: index % 2 ? 'Female' : 'Male', blood_group: bloodGroup, district: centres[index % 3].district, weight: 58 + index * 3, last_donation_date: index < 3 ? day(-120 - index) : null, declaration_checked: 1 });
      donors.push({ id, userId });
      await insert('appointments', { donor_id: id, hospital_id: centres[index % 3].id, appointment_date: index < 3 ? day(-120 - index) : day(index - 1), time_slot: '09:00', status: index < 3 ? 'completed' : index === 7 ? 'cancelled' : index % 2 ? 'pending' : 'approved', notes: 'DEMO: fictional booking for testing; no real donation or appointment.' });
      await insert('notifications', { user_id: userId, type: 'general', title: 'Demo account ready', message: 'This is fictional sample data for testing BloodCells.lk.', action_route: 'donor-dashboard', is_read: index % 2 });
    }
    for (const [index, bloodGroup] of groups.entries()) {
      const [current] = await db.query('SELECT inventory_id FROM blood_inventory WHERE blood_group=?', [bloodGroup]);
      if (!current.length) await insert('blood_inventory', { blood_group: bloodGroup, available_units: [32, 8, 25, 4, 12, 2, 45, 3][index], low_stock_threshold: 15, critical_stock_threshold: 5, last_restocked_at: day(-1) + ' 10:00:00' });
    }
    for (const [index, status] of ['pending', 'pending', 'rejected', 'cancelled'].entries()) {
      const centre = centres[index % 3];
      await insert('blood_requests', { hospital_id: centre.id, requested_by_user_id: centre.userId, blood_group: groups[index], quantity: index + 2, urgency: index === 0 ? 'urgent' : 'normal', required_date: day(index + 2), department: 'Demo ward', reason: 'DEMO: fictional blood request for workflow testing.', status, decision_note: status === 'rejected' ? 'Demo rejection scenario' : null, reviewed_by_user_id: status === 'rejected' ? bankId : null });
    }
    for (const [index, status] of ['Upcoming', 'Upcoming', 'Draft'].entries()) {
      const centre = centres[index];
      const campaignId = await insert('campaigns', { created_by_user_id: bankId, name: 'Demo ' + centre.district + ' Blood Donation Drive', short_description: 'Fictional campaign for demonstration and testing only.', detailed_description: 'This sample campaign is not a real event. Use it to test campaign listings and donor registration.', status, campaign_date: day(7 * (index + 1)), start_time: '09:00', end_time: '15:00', venue_name: 'Demo ' + centre.district + ' Donation Centre', address: 'Sample venue, ' + centre.district + ' (fictional)', district: centre.district, organizer_name: 'Demo Blood Bank Team', contact_email: 'demo_bank@example.test', needed_blood_groups: index === 0 ? 'O+,O-,A+' : 'A-,B-,AB-', target_donors: 40 + index * 20, who_can_participate: 'Demo participants; eligibility is assessed by the donation centre.', what_to_bring: 'Demo event only; do not attend this fictional venue.' });
      if (status === 'Upcoming') for (const donor of donors.slice(index * 2, index * 2 + 2)) await insert('campaign_registrations', { campaign_id: campaignId, donor_id: donor.id, note: 'Demo registration' });
    }
    await db.commit();
    const summary = {};
    for (const table of ['users', 'donors', 'hospitals', 'appointments', 'blood_inventory', 'blood_requests', 'campaigns', 'campaign_registrations', 'notifications']) {
      const [rows] = await db.query('SELECT COUNT(*) AS count FROM ' + db.escapeId(table)); summary[table] = rows[0].count;
    }
    console.log(JSON.stringify({ database: process.env.DB_NAME, sampleData: true, summary, logins: ['demo_bank', 'demo_donor1', 'demo_hospital1'], password: PASSWORD }, null, 2));
  } catch (error) { await db.rollback(); throw error; }
  finally { await db.end(); }
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
