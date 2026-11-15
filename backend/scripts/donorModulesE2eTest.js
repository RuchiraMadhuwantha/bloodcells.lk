/* Donor-modules end-to-end smoke test. Run: node scripts/donorModulesE2eTest.js
   Requires the backend server + MySQL. Creates throwaway e2e_-records and
   deletes them afterwards (same convention as scripts/e2eTest.js). The
   blood bank account is the seeded bloodbank_admin, which persists. */
const BASE = process.env.BASE_URL || 'http://localhost:5000';

let pass = 0;
let fail = 0;
const failures = [];

const req = async (method, path, { token, body } = {}) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { /* empty body */ }
  return { status: res.status, data };
};

const check = (name, cond, extra = '') => {
  if (cond) { pass += 1; console.log(`  PASS  ${name}`); }
  else { fail += 1; failures.push(name); console.log(`  FAIL  ${name} ${extra}`); }
};

const section = (t) => console.log(`\n=== ${t} ===`);
const stamp = Date.now();
const futureDate = (days, offset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

(async () => {
  const pool = require('../config/db');

  /* ---------------- Setup: fresh hospital (approved) + two donors ---------------- */
  section('Setup');
  const hospUser = `e2e_dhosp_${stamp}`;
  const hospCode = `DHO${String(stamp).slice(-6)}`;
  let r = await req('POST', '/api/auth/register/hospital', {
    body: {
      username: hospUser, email: `${hospUser}@example.com`, password: 'Hospital@123',
      hospital_name: `E2E Donor Test Centre ${stamp}`, hospital_code: hospCode,
      hospital_type: 'Test Centre', district: 'Colombo', address: '1 Test Lane',
      official_phone: '0111111111',
    },
  });
  check('hospital registered', r.status === 201, JSON.stringify(r.data));

  r = await req('POST', '/api/auth/login', { body: { username: 'bloodbank_admin', password: 'NBTS@BloodBank2026!' } });
  check('blood bank login', r.status === 200, JSON.stringify(r.data));
  const bankToken = r.data.token;

  r = await req('GET', '/api/hospitals', { token: bankToken });
  const hospUserId = r.data.hospitals.find((h) => h.username === hospUser)?.userId;
  check('hospital present in bank list', !!hospUserId);
  r = await req('PUT', `/api/hospitals/${hospUserId}/approve`, { token: bankToken, body: {} });
  check('hospital approved', r.status === 200, JSON.stringify(r.data));

  r = await req('GET', '/api/hospitals/active', { token: bankToken });
  const centre = r.data.hospitals.find((h) => h.name === `E2E Donor Test Centre ${stamp}`);
  check('approved centre bookable', !!centre);
  const centreId = centre?.hospitalId;

  const donorA = `e2e_ddonor_a_${stamp}`;
  const donorB = `e2e_ddonor_b_${stamp}`;
  for (const [name, blood] of [[donorA, 'O+'], [donorB, 'A+']]) {
    r = await req('POST', '/api/auth/register/donor', {
      body: {
        username: name, email: `${name}@example.com`, password: 'Donor@12345',
        full_name: `E2E ${name}`, nic: `77${String(stamp).slice(-7)}${blood === 'O+' ? '1' : '2'}`,
        blood_group: blood, phone: '0771234560', district: 'E2E District', weight: 60,
        declaration_checked: true,
      },
    });
    check(`donor registered (${blood})`, r.status === 201, JSON.stringify(r.data));
  }
  r = await req('POST', '/api/auth/login', { body: { username: donorA, password: 'Donor@12345' } });
  const donorAToken = r.data.token;
  r = await req('POST', '/api/auth/login', { body: { username: donorB, password: 'Donor@12345' } });
  const donorBToken = r.data.token;
  check('both donors logged in', !!donorAToken && !!donorBToken);

  const apptDate = futureDate(14);
  const timeSlot = '09:30';

  /* ---------------- D02: booking, slots, reschedule, cancel ---------------- */
  section('D02 — Appointments');
  r = await req('POST', '/api/appointments', { token: donorAToken, body: { hospital_id: centreId, appointment_date: apptDate, time_slot: timeSlot, notes: 'E2E booking' } });
  check('donor A books appointment', r.status === 201, JSON.stringify(r.data));
  const apptId = r.data.appointment?.id;

  r = await req('POST', '/api/appointments', { token: donorAToken, body: { hospital_id: centreId, appointment_date: apptDate, time_slot: timeSlot } });
  check('donor A duplicate booking rejected (409)', r.status === 409);

  r = await req('POST', '/api/appointments', { token: donorBToken, body: { hospital_id: centreId, appointment_date: apptDate, time_slot: timeSlot } });
  check('donor B same centre slot rejected (409)', r.status === 409, JSON.stringify(r.data));

  r = await req('POST', '/api/appointments', { token: donorBToken, body: { hospital_id: centreId, appointment_date: apptDate, time_slot: '10:00' } });
  check('donor B different slot accepted (201)', r.status === 201, JSON.stringify(r.data));
  const apptBId = r.data.appointment?.id;

  r = await req('GET', `/api/appointments/slots/${centreId}?date=${apptDate}`, { token: donorAToken });
  check('taken slot shows as booked', r.data.booked?.includes(timeSlot));

  r = await req('GET', `/api/appointments/${apptId}`, { token: donorAToken });
  check('donor A can read own appointment', r.status === 200 && r.data.appointment?.id === apptId);
  r = await req('GET', `/api/appointments/${apptId}`, { token: donorBToken });
  check('donor B cannot read donor A appointment (403)', r.status === 403);

  // reschedule
  const movedDate = futureDate(15);
  r = await req('PUT', `/api/appointments/${apptId}/reschedule`, { token: donorAToken, body: { appointment_date: movedDate, time_slot: '10:30' } });
  check('donor A reschedules own appointment', r.status === 200 && r.data.appointment?.appointmentDate === movedDate, JSON.stringify(r.data));
  r = await req('PUT', `/api/appointments/${apptId}/reschedule`, { token: donorBToken, body: { appointment_date: futureDate(16), time_slot: '10:30' } });
  check('donor B cannot reschedule donor A appointment (403)', r.status === 403);
  r = await req('PUT', `/api/appointments/${apptId}/reschedule`, { token: donorAToken, body: { appointment_date: '2020-01-01', time_slot: '10:30' } });
  check('reschedule to past date rejected (400)', r.status === 400);

  // bank approves + completes donor A's (rescheduled) appointment
  r = await req('PUT', `/api/appointments/${apptId}/status`, { token: bankToken, body: { status: 'approved' } });
  check('bank approves appointment', r.status === 200 && r.data.appointment?.status === 'approved');
  r = await req('PUT', `/api/appointments/${apptId}/status`, { token: bankToken, body: { status: 'completed' } });
  check('bank marks appointment completed', r.status === 200 && r.data.appointment?.status === 'completed');
  r = await req('PUT', `/api/appointments/${apptId}/cancel`, { token: donorAToken });
  check('completed appointment cannot be cancelled (409)', r.status === 409);
  r = await req('PUT', `/api/appointments/${apptId}/reschedule`, { token: donorAToken, body: { appointment_date: futureDate(20), time_slot: '09:30' } });
  check('completed appointment cannot be rescheduled (409)', r.status === 409);

  /* ---------------- D01: donation history ---------------- */
  section('D01 — Donation history');
  r = await req('GET', '/api/donors/me/donations', { token: donorAToken });
  check('donor A history lists the completed donation', r.status === 200 && r.data.items?.some((d) => d.id === apptId), JSON.stringify(r.data));
  check('history reports a non-zero completed count', r.data.totalCompleted >= 1);
  check('quantity is null (not recorded anywhere)', r.data.items?.find((d) => d.id === apptId)?.quantity === null);
  r = await req('GET', `/api/donors/me/donations?year=${movedDate.slice(0, 4)}&sort=desc&page=1&pageSize=5`, { token: donorAToken });
  check('history supports year/sort/pagination', r.status === 200 && r.data.pagination?.pageSize === 5);
  r = await req('GET', `/api/donors/me/donations/${apptId}`, { token: donorAToken });
  check('donor A can read own donation details', r.status === 200 && r.data.donation?.id === apptId);
  r = await req('GET', `/api/donors/me/donations/${apptId}`, { token: donorBToken });
  check('donor B cannot read donor A donation (404)', r.status === 404);
  r = await req('GET', '/api/donors/me/donations', { token: donorBToken });
  check('donor B history does not contain donor A record', r.status === 200 && !r.data.items?.some((d) => d.id === apptId));

  /* ---------------- D04: notifications ---------------- */
  section('D04 — Notifications');
  r = await req('GET', '/api/notifications', { token: donorAToken });
  const types = (r.data.notifications || []).map((n) => n.type);
  check('booking created a confirmation notification', types.includes('appointment_confirmation'), JSON.stringify(types));
  check('reschedule created a rescheduling notification', types.includes('appointment_rescheduled'));
  check('approval created an approval notification', types.includes('appointment_approved'));
  check('completion created a donation-recorded notification', types.includes('appointment_completed'));
  r = await req('GET', '/api/notifications/unread-count', { token: donorAToken });
  check('unread count is positive after events', r.status === 200 && r.data.unreadCount >= 4);
  const unreadBefore = r.data.unreadCount;
  const target = (await req('GET', '/api/notifications', { token: donorAToken })).data.notifications.find((n) => !n.isRead);
  r = await req('PUT', `/api/notifications/${target.id}/read`, { token: donorAToken });
  check('single notification marked read', r.status === 200 && r.data.notification?.isRead === true);
  r = await req('GET', '/api/notifications/unread-count', { token: donorAToken });
  check('unread count decremented', r.data.unreadCount === unreadBefore - 1);
  r = await req('PUT', '/api/notifications/read-all', { token: donorAToken });
  check('mark-all-read succeeds', r.status === 200);
  r = await req('GET', '/api/notifications/unread-count', { token: donorAToken });
  check('all notifications read', r.data.unreadCount === 0);
  r = await req('GET', `/api/notifications/${target.id}`, { token: donorBToken });
  check('donor B cannot read donor A notification (404)', r.status === 404);
  r = await req('PUT', `/api/notifications/${target.id}/read`, { token: donorBToken });
  check('donor B cannot mark donor A notification (404)', r.status === 404);

  /* ---------------- D03: campaigns ---------------- */
  section('D03 — Campaign participation');
  const campaignDate = futureDate(21);
  r = await req('POST', '/api/campaigns', {
    token: bankToken,
    body: {
      name: `E2E Campaign ${stamp}`, shortDescription: 'E2E test campaign', status: 'Upcoming',
      date: campaignDate, startTime: '09:00', endTime: '15:00', venueName: 'E2E Hall',
      district: 'Colombo', city: 'Colombo 03', organizerName: 'E2E Test Organiser',
      neededBloodGroups: ['O+', 'A+'], targetDonors: 2,
    },
  });
  check('blood bank creates campaign', r.status === 201, JSON.stringify(r.data));
  const campaignId = r.data.campaign?.id;
  check('needed blood groups serialised as array', Array.isArray(r.data.campaign?.neededBloodGroups));

  r = await req('GET', '/api/campaigns', { token: donorAToken });
  check('donor sees published campaign', r.status === 200 && r.data.campaigns?.some((c) => c.id === campaignId));
  const draftCampaign = await req('POST', '/api/campaigns', {
    token: bankToken,
    body: {
      name: `E2E Draft Campaign ${stamp}`, status: 'Draft', date: campaignDate,
      startTime: '09:00', endTime: '10:00', organizerName: 'E2E Organiser',
    },
  });
  const draftId = draftCampaign.data.campaign?.id;
  r = await req('GET', '/api/campaigns', { token: donorAToken });
  check('draft campaign NOT visible to donors', r.status === 200 && !r.data.campaigns?.some((c) => c.id === draftId));
  r = await req('GET', `/api/campaigns/${draftId}`, { token: donorAToken });
  check('draft campaign details not visible to donors (404)', r.status === 404);

  r = await req('POST', `/api/campaigns/${campaignId}/registrations`, { token: donorAToken, body: {} });
  check('donor A registers for campaign', r.status === 201 && r.data.registration?.status === 'registered', JSON.stringify(r.data));
  r = await req('POST', `/api/campaigns/${campaignId}/registrations`, { token: donorAToken, body: {} });
  check('duplicate registration rejected (409)', r.status === 409);
  r = await req('POST', `/api/campaigns/${campaignId}/registrations`, { token: donorBToken, body: {} });
  check('donor B registers (capacity 2)', r.status === 201, JSON.stringify(r.data));
  r = await req('GET', '/api/campaigns/registrations/mine', { token: donorAToken });
  check('donor A sees own registration', r.status === 200 && r.data.registrations?.some((x) => x.campaign?.id === campaignId && x.status === 'registered'));

  // capacity: registered 2/2, third donor must be rejected
  const donorC = `e2e_ddonor_c_${stamp}`;
  await req('POST', '/api/auth/register/donor', {
    body: {
      username: donorC, email: `${donorC}@example.com`, password: 'Donor@12345',
      full_name: 'E2E Donor C', nic: `88${String(stamp).slice(-7)}3`, blood_group: 'B+',
      phone: '0771234561', district: 'E2E District', declaration_checked: true,
    },
  });
  r = await req('POST', '/api/auth/login', { body: { username: donorC, password: 'Donor@12345' } });
  const donorCToken = r.data.token;
  r = await req('POST', `/api/campaigns/${campaignId}/registrations`, { token: donorCToken, body: {} });
  check('registration beyond capacity rejected (409)', r.status === 409, JSON.stringify(r.data));

  // donor A cancels, freeing a slot; donor C takes it, filling 2/2 again
  r = await req('DELETE', `/api/campaigns/${campaignId}/registrations`, { token: donorAToken });
  check('donor A cancels registration', r.status === 200, JSON.stringify(r.data));
  r = await req('DELETE', `/api/campaigns/${campaignId}/registrations`, { token: donorAToken });
  check('double cancellation rejected (409)', r.status === 409);
  r = await req('POST', `/api/campaigns/${campaignId}/registrations`, { token: donorCToken, body: {} });
  check('donor C registers after a slot freed', r.status === 201, JSON.stringify(r.data));
  // donor B cancels, freeing a slot; donor A re-registers into the same row
  r = await req('DELETE', `/api/campaigns/${campaignId}/registrations`, { token: donorBToken });
  check('donor B cancels to free a slot', r.status === 200, JSON.stringify(r.data));
  r = await req('POST', `/api/campaigns/${campaignId}/registrations`, { token: donorAToken, body: {} });
  check('donor A re-registers after cancelling (re-uses row)', r.status === 201, JSON.stringify(r.data));
  r = await req('GET', '/api/notifications', { token: donorAToken });
  check('campaign registration confirmed notification', (r.data.notifications || []).some((n) => n.type === 'campaign'));
  r = await req('POST', '/api/campaigns', { token: donorAToken, body: { name: 'Nope', date: campaignDate, startTime: '09:00', endTime: '10:00', organizerName: 'X' } });
  check('donor cannot create campaigns (403)', r.status === 403);

  /* ---------------- D05: emergency alerts ---------------- */
  section('D05 — Emergency alerts');
  r = await req('POST', '/api/emergency-alerts', {
    token: bankToken,
    body: {
      blood_group: 'O+', urgency: 'emergency', district: 'E2E District',
      required_date: futureDate(2), quantity: 2,
      title: `E2E Emergency Alert ${stamp}`,
      description: 'E2E test alert — verified hospital requirement.',
      response_instructions: 'Contact the blood bank desk after registering interest.',
    },
  });
  check('blood bank publishes emergency alert', r.status === 201, JSON.stringify(r.data));
  const alertId = r.data.alert?.id;
  check('alert reference generated', /^EA-\d{5}$/.test(r.data.alert?.reference || ''));

  r = await req('GET', '/api/emergency-alerts?mine=true', { token: donorAToken });
  check('donor A (O+) sees the alert', r.status === 200 && r.data.alerts?.some((a) => a.id === alertId));
  r = await req('GET', '/api/emergency-alerts?mine=true', { token: donorBToken });
  check('donor B (A+) does NOT see the O+ alert', r.status === 200 && !r.data.alerts?.some((a) => a.id === alertId));
  r = await req('POST', `/api/emergency-alerts/${alertId}/respond`, { token: donorAToken, body: {} });
  check('donor A registers interest', r.status === 201, JSON.stringify(r.data));
  r = await req('POST', `/api/emergency-alerts/${alertId}/respond`, { token: donorAToken, body: {} });
  check('duplicate interest rejected (409)', r.status === 409);
  r = await req('POST', `/api/emergency-alerts/${alertId}/respond`, { token: donorBToken, body: {} });
  check('donor B cannot respond to an O+ alert (403)', r.status === 403, `got ${r.status}`);
  r = await req('GET', '/api/notifications', { token: donorAToken });
  check('emergency alert notification reached matching donor', (r.data.notifications || []).some((n) => n.type === 'emergency'));
  r = await req('PUT', `/api/emergency-alerts/${alertId}/close`, { token: bankToken });
  check('blood bank closes the alert', r.status === 200, JSON.stringify(r.data));
  r = await req('GET', '/api/emergency-alerts?mine=true', { token: donorAToken });
  check('closed alert no longer listed', r.status === 200 && !r.data.alerts?.some((a) => a.id === alertId));
  r = await req('POST', `/api/emergency-alerts/${alertId}/respond`, { token: donorAToken, body: { note: 'late' } });
  check('responding to closed alert rejected (409)', r.status === 409);
  r = await req('POST', '/api/emergency-alerts', { token: donorAToken, body: { blood_group: 'O+', title: 'Nope' } });
  check('donor cannot publish alerts (403)', r.status === 403);

  /* ---------------- Donor cancel + rebook (migration 002 regression) ---------------- */
  section('D02 — Cancel then re-book the same slot');
  const rebookDate = futureDate(28);
  r = await req('POST', '/api/appointments', { token: donorBToken, body: { hospital_id: centreId, appointment_date: rebookDate, time_slot: '14:00' } });
  check('donor B books rebook slot', r.status === 201, JSON.stringify(r.data));
  const rebookId = r.data.appointment?.id;
  r = await req('PUT', `/api/appointments/${rebookId}/cancel`, { token: donorBToken });
  check('donor B cancels', r.status === 200 && r.data.appointment?.status === 'cancelled');
  r = await req('POST', '/api/appointments', { token: donorBToken, body: { hospital_id: centreId, appointment_date: rebookDate, time_slot: '14:00' } });
  check('donor B can re-book the same slot after cancelling', r.status === 201, JSON.stringify(r.data));

  /* ---------------- Donation flow: complete -> history ---------------- */
  section('D01 — Appointment completion flows into donation history');
  r = await req('POST', '/api/appointments', { token: donorBToken, body: { hospital_id: centreId, appointment_date: futureDate(29), time_slot: '11:00' } });
  const apptBComplete = r.data.appointment?.id;
  r = await req('PUT', `/api/appointments/${apptBComplete}/status`, { token: bankToken, body: { status: 'approved' } });
  r = await req('PUT', `/api/appointments/${apptBComplete}/status`, { token: bankToken, body: { status: 'completed' } });
  check('bank completes donor B appointment', r.status === 200);
  r = await req('GET', '/api/donors/me/donations', { token: donorBToken });
  check('donation history contains the completed record', r.status === 200 && r.data.items?.some((d) => d.id === apptBComplete));

  /* ---------------- cleanup ---------------- */
  if (!process.argv.includes('--keep')) {
    section('Cleanup (e2e records only)');
    // campaigns/alerts created by the shared bank account are removed by pattern;
    // fan-out notifications pointing at those alerts go first.
    const [e2eAlerts] = await pool.query("SELECT alert_id FROM emergency_alerts WHERE title LIKE 'E2E %'");
    const alertIds = e2eAlerts.map((r) => r.alert_id);
    if (alertIds.length) {
      await pool.query('DELETE FROM notifications WHERE related_type = ? AND related_id IN (?)', ['emergency_alert', alertIds]);
      await pool.query('DELETE FROM emergency_alert_responses WHERE alert_id IN (?)', [alertIds]);
      await pool.query('DELETE FROM emergency_alerts WHERE alert_id IN (?)', [alertIds]);
    }
    const [e2eCampaigns] = await pool.query("SELECT campaign_id FROM campaigns WHERE name LIKE 'E2E %'");
    const campaignIds = e2eCampaigns.map((r) => r.campaign_id);
    if (campaignIds.length) {
      await pool.query('DELETE FROM notifications WHERE related_type = ? AND related_id IN (?)', ['campaign', campaignIds]);
      await pool.query('DELETE FROM campaign_registrations WHERE campaign_id IN (?)', [campaignIds]);
      await pool.query('DELETE FROM campaigns WHERE campaign_id IN (?)', [campaignIds]);
    }
    const [u] = await pool.query("SELECT user_id FROM users WHERE username LIKE 'e2e\\_d%'");
    const ids = u.map((row) => row.user_id);
    if (ids.length) {
      const placeholders = ids.map(() => '?').join(',');
      await pool.query(`DELETE FROM users WHERE user_id IN (${placeholders})`, ids);
    }
    await pool.query(`DELETE t FROM password_reset_tokens t LEFT JOIN users u ON u.user_id = t.user_id WHERE u.user_id IS NULL`);
    const [counts] = await pool.query(
      `SELECT (SELECT COUNT(*) FROM users) AS users, (SELECT COUNT(*) FROM hospitals) AS hospitals,
              (SELECT COUNT(*) FROM donors) AS donors, (SELECT COUNT(*) FROM appointments) AS appointments,
              (SELECT COUNT(*) FROM campaigns) AS campaigns, (SELECT COUNT(*) FROM emergency_alerts) AS alerts,
              (SELECT COUNT(*) FROM notifications) AS notifications`
    );
    console.log(`  remaining state: ${JSON.stringify(counts[0])}`);
  }

  console.log(`\n=========================================`);
  console.log(`PASSED: ${pass}   FAILED: ${fail}`);
  if (fail) {
    console.log('Failed tests:');
    failures.forEach((f) => console.log(`  - ${f}`));
  }
  console.log(`=========================================`);
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error('Test harness crashed:', e);
  process.exit(1);
});
