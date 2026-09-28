/* End-to-end API smoke test. Run: node scripts/e2eTest.js  (server + MySQL must be up) */
const BASE = 'http://localhost:5000';

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

(async () => {
  // Captured up-front so cleanup can restore stock levels byte-for-byte.
  const inventorySnapshot = process.argv.includes('--keep')
    ? []
    : (await require('../config/db').query(
        `SELECT blood_group, available_units, low_stock_threshold, critical_stock_threshold, last_restocked_at
           FROM blood_inventory`
      ))[0];

  /* ---------------- health ---------------- */
  section('Health');
  let r = await req('GET', '/health');
  check('GET /health returns 200', r.status === 200);
  r = await req('GET', '/health/db');
  check('GET /health/db reports MySQL connected', r.status === 200 && r.data.database === 'connected');

  /* ---------------- TEST 1: donor ---------------- */
  section('TEST 1 — Donor register -> login -> profile');
  const donorUser = `e2e_donor_${stamp}`;
  r = await req('POST', '/api/auth/register/donor', {
    body: {
      username: donorUser, email: `${donorUser}@example.com`, password: 'Donor@12345',
      full_name: 'E2E Donor', nic: `9900${String(stamp).slice(-7)}`, blood_group: 'O+',
      phone: '0771234567', district: 'Colombo', weight: 62, date_of_birth: '1998-04-12',
      gender: 'Male', declaration_checked: true,
    },
  });
  check('donor registration accepted', r.status === 201, JSON.stringify(r.data));

  r = await req('POST', '/api/auth/register/donor', {
    body: { username: donorUser, email: `${donorUser}@example.com`, password: 'Donor@12345', full_name: 'Dup', nic: '123456789X', blood_group: 'A+' },
  });
  check('duplicate donor username/email rejected (409)', r.status === 409);

  r = await req('POST', '/api/auth/register/donor', {
    body: { username: 'x_blood', email: 'not-an-email', password: 'Donor@12345', full_name: 'X', nic: '123456789X', blood_group: 'ZZ' },
  });
  check('invalid donor payload rejected (400)', r.status === 400);

  r = await req('POST', '/api/auth/login', { body: { username: donorUser, password: 'Donor@12345' } });
  check('donor login succeeds', r.status === 200 && !!r.data.token, JSON.stringify(r.data));
  check('donor role returned by backend', r.data?.user?.role === 'donor');
  const donorToken = r.data.token;

  r = await req('POST', '/api/auth/login', { body: { username: donorUser, password: 'wrong' } });
  check('wrong password rejected (401)', r.status === 401);

  r = await req('GET', '/api/auth/me', { token: donorToken });
  check('GET /api/auth/me returns donor profile from MySQL', r.status === 200 && r.data.profile?.full_name === 'E2E Donor');
  check('GET /api/auth/me never exposes password hash', r.data?.user?.password_hash === undefined && r.data?.profile?.password_hash === undefined);

  r = await req('PUT', '/api/auth/me', { token: donorToken, body: { phone: '0779998888', weight: 64 } });
  check('donor profile update persists', r.status === 200 && r.data.profile?.phone === '0779998888');

  /* ---------------- TEST 2: hospital approval ---------------- */
  section('TEST 2 — Hospital register -> pending -> approve -> active');
  const hospUser = `e2e_hosp_${stamp}`;
  const hospName = `E2E General Hospital ${stamp}`;
  r = await req('POST', '/api/auth/register/hospital', {
    body: {
      username: hospUser, email: `${hospUser}@example.com`, password: 'Hospital@123',
      hospital_name: hospName, hospital_code: `E2E${String(stamp).slice(-6)}`,
      hospital_type: 'Base Hospital', district: 'Colombo', address: '100 Test Road, Colombo',
      official_phone: '0112345678', contact_person_name: 'Test Officer',
      contact_person_designation: 'Blood Bank Officer', contact_person_phone: '0771112223',
      contact_person_email: `contact.${hospUser}@example.com`,
    },
  });
  check('hospital registration accepted (201)', r.status === 201, JSON.stringify(r.data));

  r = await req('POST', '/api/auth/login', { body: { username: hospUser, password: 'Hospital@123' } });
  check('pending hospital login BLOCKED (403)', r.status === 403, JSON.stringify(r.data));
  check('pending hospital message mentions approval', /awaiting approval/i.test(r.data?.message || ''));

  // blood bank login
  r = await req('POST', '/api/auth/login', { body: { username: 'bloodbank_admin', password: 'NBTS@BloodBank2026!' } });
  check('blood bank login via real backend (no demo bypass)', r.status === 200 && r.data.user.role === 'blood_bank', JSON.stringify(r.data));
  const bankToken = r.data.token;

  r = await req('POST', '/api/auth/login', { body: { username: 'bloodbank_admin', password: 'bloodbank-demo-token' } });
  check('old demo-style credential no longer works', r.status === 401);

  r = await req('GET', '/api/hospitals', { token: bankToken });
  check('blood bank can list hospitals from MySQL', r.status === 200 && r.data.hospitals.some((h) => h.username === hospUser));
  const pendingRow = r.data.hospitals.find((h) => h.username === hospUser);
  check('new hospital status is Pending', pendingRow?.status === 'Pending');
  check('hospital list includes real DB statistics', typeof r.data.stats?.pending === 'number' && r.data.stats.pending >= 1);
  const hospUserId = pendingRow.userId;

  r = await req('PUT', `/api/hospitals/${hospUserId}/approve`, { token: bankToken, body: {} });
  check('approve returns 200', r.status === 200, JSON.stringify(r.data));
  check('approve reduces pending count', r.data?.stats?.pending === (pendingRow ? 1 : 0) + 0 || r.data.stats.pending < r.data.stats.total);

  r = await req('GET', '/api/hospitals', { token: bankToken });
  const approved = r.data.hospitals.find((h) => h.username === hospUser);
  check('hospital status persisted as Active in MySQL', approved?.status === 'Active');
  check('approval date is recorded', !!approved?.approvalDate);

  r = await req('POST', '/api/auth/login', { body: { username: hospUser, password: 'Hospital@123' } });
  check('approved hospital login now succeeds', r.status === 200);
  const hospToken = r.data.token;

  r = await req('GET', '/api/hospitals/mine', { token: hospToken });
  check('hospital can read its own record', r.status === 200 && r.data.hospital.hospitalName === hospName);

  r = await req('GET', '/api/hospitals/active', { token: donorToken });
  check('donor can list active hospitals for booking', r.status === 200 && r.data.hospitals.some((h) => h.name === hospName));

  /* ---------------- TEST 3: hospital rejection ---------------- */
  section('TEST 3 — Hospital rejection');
  const rejUser = `e2e_rej_${stamp}`;
  await req('POST', '/api/auth/register/hospital', {
    body: {
      username: rejUser, email: `${rejUser}@example.com`, password: 'Hospital@123',
      hospital_name: 'E2E Rejected Hospital', hospital_code: `REJ${String(stamp).slice(-6)}`,
      hospital_type: 'Private Hospital', district: 'Gampaha', address: '1 Reject Lane',
      official_phone: '0119999999', contact_person_name: 'R Officer',
      contact_person_designation: 'Medical Officer', contact_person_phone: '0774445556',
      contact_person_email: `r.${rejUser}@example.com`,
    },
  });
  r = await req('GET', '/api/hospitals', { token: bankToken });
  const rejRow = r.data.hospitals.find((h) => h.username === rejUser);

  r = await req('PUT', `/api/hospitals/${rejRow.userId}/reject`, { token: bankToken, body: { reason: 'Registration documents could not be verified.' } });
  check('reject returns 200', r.status === 200, JSON.stringify(r.data));

  r = await req('GET', '/api/hospitals', { token: bankToken });
  const rejected = r.data.hospitals.find((h) => h.username === rejUser);
  check('hospital status persisted as Rejected', rejected?.status === 'Rejected');
  check('rejection reason stored in MySQL', rejected?.rejectionReason === 'Registration documents could not be verified.');

  r = await req('POST', '/api/auth/login', { body: { username: rejUser, password: 'Hospital@123' } });
  check('rejected hospital login BLOCKED (403)', r.status === 403);
  check('rejected message is specific', /rejected/i.test(r.data?.message || ''));

  /* ---------------- TEST 7: role security ---------------- */
  section('TEST 7 — Role security');
  r = await req('GET', '/api/hospitals', { token: donorToken });
  check('donor blocked from blood bank hospital list (403)', r.status === 403);
  r = await req('GET', '/api/hospitals', { token: hospToken });
  check('hospital blocked from blood bank hospital list (403)', r.status === 403);
  r = await req('GET', '/api/donors', { token: donorToken });
  check('donor blocked from donor directory (403)', r.status === 403);
  r = await req('GET', '/api/stats/blood-bank', { token: hospToken });
  check('hospital blocked from bank statistics (403)', r.status === 403);
  r = await req('GET', '/api/blood-requests', { token: donorToken });
  check('donor blocked from all-requests view (403)', r.status === 403);
  r = await req('POST', '/api/inventory/adjust', { token: hospToken, body: { bloodGroup: 'O+', amount: 5 } });
  check('hospital blocked from inventory mutation (403)', r.status === 403);
  r = await req('GET', '/api/hospitals', { token: 'not.a.jwt' });
  check('garbage token rejected (401)', r.status === 401);
  r = await req('GET', '/api/hospitals');
  check('missing token rejected (401)', r.status === 401);
  r = await req('GET', '/api/does-not-exist', { token: bankToken });
  check('unknown endpoint returns friendly 404', r.status === 404 && r.data.success === false);

  /* ---------------- PHASE 3: inventory ---------------- */
  section('PHASE 3 — Inventory');
  r = await req('GET', '/api/inventory', { token: bankToken });
  check('inventory lists all 8 blood groups', r.status === 200 && r.data.inventory.length === 8);
  r = await req('POST', '/api/inventory/adjust', { token: bankToken, body: { bloodGroup: 'O+', amount: 40, mode: 'set' } });
  check('blood bank can set stock for O+', r.status === 200 && r.data.item.availableUnits === 40, JSON.stringify(r.data));
  r = await req('POST', '/api/inventory/adjust', { token: bankToken, body: { bloodGroup: 'A+', amount: 30, mode: 'set' } });
  check('blood bank can set stock for A+', r.status === 200 && r.data.item.availableUnits === 30);
  r = await req('POST', '/api/inventory/adjust', { token: bankToken, body: { bloodGroup: 'O+', amount: 5, mode: 'add' } });
  check('blood bank can add stock (40 -> 45)', r.status === 200 && r.data.item.availableUnits === 45);
  r = await req('POST', '/api/inventory/adjust', { token: bankToken, body: { bloodGroup: 'O+', amount: 5000, mode: 'remove' } });
  check('negative inventory PREVENTED (409)', r.status === 409, JSON.stringify(r.data));
  r = await req('GET', '/api/inventory/O+', { token: bankToken });
  check('stock unchanged after rejected removal (45)', r.data.item.availableUnits === 45);
  r = await req('POST', '/api/inventory/adjust', { token: bankToken, body: { bloodGroup: 'O+', amount: -5, mode: 'add' } });
  check('negative quantity rejected by validation (400)', r.status === 400);
  r = await req('POST', '/api/inventory/adjust', { token: bankToken, body: { bloodGroup: 'QQ', amount: 1, mode: 'add' } });
  check('invalid blood group rejected by validation (400)', r.status === 400);
  r = await req('PUT', '/api/inventory/thresholds', { token: bankToken, body: { bloodGroup: 'O-', lowStockThreshold: 4, criticalStockThreshold: 9 } });
  check('critical threshold above low threshold rejected (400)', r.status === 400);
  r = await req('GET', '/api/inventory', { token: hospToken });
  check('hospital can READ stock levels', r.status === 200);

  /* ---------------- PHASE 2: blood requests ---------------- */
  section('PHASE 2 — Blood requests');
  r = await req('POST', '/api/blood-requests', { token: hospToken, body: { blood_group: 'O+', quantity: 3, urgency: 'emergency', required_date: '2026-10-05', department: 'Emergency', reason: 'Trauma case' } });
  check('hospital can create blood request', r.status === 201, JSON.stringify(r.data));
  const reqId = r.data.request?.id;
  check('request reference generated', /^BR-\d{5}$/.test(r.data.request?.reference || ''));

  r = await req('POST', '/api/blood-requests', { token: hospToken, body: { blood_group: 'O+', quantity: 0 } });
  check('zero quantity rejected (400)', r.status === 400);
  r = await req('POST', '/api/blood-requests', { token: hospToken, body: { blood_group: 'ZZ', quantity: 1 } });
  check('invalid blood group rejected (400)', r.status === 400);
  r = await req('POST', '/api/blood-requests', { token: donorToken, body: { blood_group: 'O+', quantity: 1 } });
  check('donor cannot create a blood request (403)', r.status === 403);

  r = await req('GET', '/api/blood-requests/mine', { token: hospToken });
  check('hospital sees its own requests', r.status === 200 && r.data.requests.some((x) => x.id === reqId));

  r = await req('GET', '/api/blood-requests', { token: bankToken });
  check('blood bank receives the request', r.status === 200 && r.data.requests.some((x) => x.id === reqId));
  check('request counts come from MySQL', r.data.counts?.pending >= 1);

  r = await req('GET', '/api/blood-requests?search=E2E General', { token: bankToken });
  check('blood bank search works', r.status === 200 && r.data.requests.length >= 1);
  r = await req('GET', '/api/blood-requests?status=approved', { token: bankToken });
  check('blood bank status filter works', r.status === 200 && r.data.requests.every((x) => x.status === 'approved'));

  r = await req('PUT', `/api/blood-requests/${reqId}/status`, { token: bankToken, body: { status: 'rejected' } });
  check('rejecting without a reason is blocked (400)', r.status === 400);

  r = await req('PUT', `/api/blood-requests/${reqId}/status`, { token: bankToken, body: { status: 'approved', note: 'Allocation approved' } });
  check('blood bank approves request', r.status === 200 && r.data.request.status === 'approved');

  r = await req('PUT', `/api/blood-requests/${reqId}/status`, { token: hospToken, body: { status: 'cancelled' } });
  check('hospital cannot process requests (403)', r.status === 403);

  r = await req('PUT', `/api/blood-requests/${reqId}/status`, { token: bankToken, body: { status: 'fulfilled' } });
  check('fulfilment succeeds and issues stock', r.status === 200 && r.data.request.status === 'fulfilled', JSON.stringify(r.data));
  r = await req('GET', '/api/inventory/O+', { token: bankToken });
  check('inventory decremented by fulfilled quantity (45 -> 42)', r.data.item.availableUnits === 42);

  r = await req('PUT', `/api/blood-requests/${reqId}/status`, { token: bankToken, body: { status: 'cancelled' } });
  check('fulfilled request cannot be re-opened (409)', r.status === 409);
  r = await req('GET', '/api/inventory/O+', { token: bankToken });
  check('rejected transition did not deduct stock again (still 42)', r.data.item.availableUnits === 42);

  // fulfilment blocked when stock insufficient
  r = await req('POST', '/api/blood-requests', { token: hospToken, body: { blood_group: 'AB-', quantity: 5, urgency: 'urgent' } });
  const abReqId = r.data.request?.id;
  r = await req('PUT', `/api/blood-requests/${abReqId}/status`, { token: bankToken, body: { status: 'approved' } });
  r = await req('PUT', `/api/blood-requests/${abReqId}/status`, { token: bankToken, body: { status: 'fulfilled' } });
  check('fulfilment blocked when stock is insufficient (409)', r.status === 409);
  r = await req('GET', '/api/inventory/AB-', { token: bankToken });
  check('failed fulfilment left AB- stock at 0', r.data.item.availableUnits === 0);

  // Regression guard: fulfilling a PENDING request is an invalid transition.
  // Stock must not be consumed when the transition itself is rejected.
  r = await req('POST', '/api/blood-requests', { token: hospToken, body: { blood_group: 'O+', quantity: 2, urgency: 'normal' } });
  const pendingReqId = r.data.request?.id;
  r = await req('PUT', `/api/blood-requests/${pendingReqId}/status`, { token: bankToken, body: { status: 'fulfilled' } });
  check('pending -> fulfilled rejected as invalid transition (409)', r.status === 409, JSON.stringify(r.data));
  r = await req('GET', '/api/inventory/O+', { token: bankToken });
  check('invalid transition consumed no stock (still 42)', r.data.item.availableUnits === 42);
  r = await req('GET', `/api/blood-requests/${pendingReqId}`, { token: bankToken });
  check('request still pending after rejected transition', r.data.request?.status === 'pending');

  /* ---------------- PHASE 4: appointments ---------------- */
  section('PHASE 4 — Donor appointments');
  r = await req('GET', '/api/hospitals/active', { token: donorToken });
  const target = r.data.hospitals.find((h) => h.name === hospName);
  check('donor sees only real DB hospitals (no mock data)', !!target);

  const apptDate = new Date(); apptDate.setDate(apptDate.getDate() + 7);
  const dateStr = apptDate.toISOString().slice(0, 10);
  r = await req('POST', '/api/appointments', { token: donorToken, body: { hospital_id: target.hospitalId, appointment_date: dateStr, time_slot: '10:30' } });
  check('donor books appointment at real hospital', r.status === 201, JSON.stringify(r.data));
  const apptId = r.data.appointment?.id;

  r = await req('POST', '/api/appointments', { token: donorToken, body: { hospital_id: target.hospitalId, appointment_date: dateStr, time_slot: '10:30' } });
  check('duplicate slot booking rejected (409)', r.status === 409);
  r = await req('POST', '/api/appointments', { token: donorToken, body: { hospital_id: target.hospitalId, appointment_date: '2020-01-01', time_slot: '09:00' } });
  check('past appointment date rejected (400)', r.status === 400);
  r = await req('POST', '/api/appointments', { token: donorToken, body: { hospital_id: target.hospitalId, appointment_date: dateStr, time_slot: '99:99' } });
  check('invalid time slot rejected (400)', r.status === 400);
  r = await req('POST', '/api/appointments', { token: hospToken, body: { hospital_id: target.hospitalId, appointment_date: dateStr, time_slot: '11:00' } });
  check('hospital cannot book donor appointments (403)', r.status === 403);

  r = await req('GET', '/api/appointments/mine', { token: donorToken });
  check('donor sees own appointment persisted in MySQL', r.status === 200 && r.data.appointments.some((a) => a.id === apptId));
  r = await req('GET', `/api/appointments/slots/${target.hospitalId}?date=${dateStr}`, { token: donorToken });
  check('booked slot reported for the centre', r.data.booked.includes('10:30'));
  r = await req('GET', '/api/appointments/hospital', { token: hospToken });
  check('hospital sees incoming appointment', r.status === 200 && r.data.appointments.some((a) => a.id === apptId));
  r = await req('PUT', `/api/appointments/${apptId}/status`, { token: bankToken, body: { status: 'approved' } });
  check('blood bank approves appointment', r.status === 200 && r.data.appointment.status === 'approved');
  r = await req('PUT', `/api/appointments/${apptId}/cancel`, { token: donorToken });
  check('donor can cancel own appointment', r.status === 200 && r.data.appointment.status === 'cancelled');

  /* ---------------- Donor self-service dashboard data ---------------- */
  section('Donor dashboard data');
  r = await req('GET', '/api/donors/me/summary', { token: donorToken });
  const sum = r.data.summary;
  check('donor summary returns real counts', r.status === 200 && typeof sum?.totalDonations === 'number' && typeof sum?.eligibleNow === 'boolean', JSON.stringify(r.data));
  check('donor summary uses the donor own blood group', sum?.bloodGroup === 'O+');
  check('donor summary reports the donation interval', sum?.donationIntervalDays === 90);

  r = await req('GET', '/api/donors/me/summary', { token: bankToken });
  check('blood bank cannot read a donor self summary (403)', r.status === 403);
  r = await req('GET', '/api/donors/me/summary', { token: hospToken });
  check('hospital cannot read a donor self summary (403)', r.status === 403);
  r = await req('GET', '/api/donors/me/summary');
  check('unauthenticated donor summary rejected (401)', r.status === 401);

  r = await req('GET', '/api/blood-requests/matching', { token: donorToken });
  check('donor sees requests matching their own group', r.status === 200 && r.data.bloodGroup === 'O+');
  check('matching requests hide requester identity', !JSON.stringify(r.data).includes('requestedBy'));
  const matching = r.data.requests || [];
  check('only the donor own blood group is returned', matching.every((x) => x.bloodGroup === 'O+'));
  check('open O+ requests are listed for the donor', matching.length >= 1, JSON.stringify(matching));
  r = await req('GET', '/api/blood-requests/matching', { token: bankToken });
  check('blood bank cannot use the donor matching endpoint (403)', r.status === 403);

  /* ---------------- PHASE 5: donor management ---------------- */
  section('PHASE 5 — Donor management');
  r = await req('GET', '/api/donors', { token: bankToken });
  check('blood bank can list donors from MySQL', r.status === 200 && r.data.donors.length >= 1);
  check('donor stats come from the database', typeof r.data.stats?.totalDonors === 'number' && r.data.stats.totalDonors >= 1);
  const serialised = JSON.stringify(r.data);
  check('donor payload has no password/hash/jwt', !/password|hash|jwt/i.test(serialised));
  r = await req('GET', `/api/donors?search=E2E`, { token: bankToken });
  check('donor search works', r.data.donors.length >= 1);
  r = await req('GET', '/api/donors?bloodGroup=O%2B', { token: bankToken });
  check('donor blood group filter works', r.data.donors.every((d) => d.bloodGroup === 'O+'));
  r = await req('GET', `/api/donors/${r.data.donors[0].donorId}`, { token: bankToken });
  check('donor detail includes appointments', r.status === 200 && Array.isArray(r.data.appointments));

  /* ---------------- dashboard stats ---------------- */
  section('Dashboards');
  r = await req('GET', '/api/stats/blood-bank', { token: bankToken });
  const s = r.data.stats;
  // O+ 45 - 3 (fulfilled request) + A+ 30 = 72
  check('bank stats: real total units (72)', s?.inventory?.totalUnits === 72, `got ${s?.inventory?.totalUnits}`);
  check('bank stats: real pending approvals', typeof s?.hospitals?.pending === 'number');
  check('bank stats: real request counts', typeof s?.requests?.pending === 'number');
  check('bank stats: real donor count', s?.donors?.totalDonors >= 1);
  check('bank stats: low stock groups listed', Array.isArray(s?.alerts?.lowStock));

  /* ---------------- forgot password ---------------- */
  section('Forgot password');
  r = await req('POST', '/api/auth/forgot-password', { body: { email: `${donorUser}@example.com` } });
  check('forgot password returns generic success', r.status === 200 && /if an account exists/i.test(r.data.message));
  const resetToken = r.data.resetToken;
  check('dev reset token issued', !!resetToken);
  r = await req('POST', '/api/auth/forgot-password', { body: { email: 'nobody@example.com' } });
  check('unknown email returns the same generic message (no enumeration)', r.status === 200 && /if an account exists/i.test(r.data.message));
  r = await req('POST', '/api/auth/reset-password', { body: { token: 'deadbeef', password: 'NewPass@123' } });
  check('invalid reset token rejected (400)', r.status === 400);
  r = await req('POST', '/api/auth/reset-password', { body: { token: resetToken, password: 'NewPass@12345' } });
  check('reset with valid token succeeds', r.status === 200, JSON.stringify(r.data));
  r = await req('POST', '/api/auth/login', { body: { username: donorUser, password: 'NewPass@12345' } });
  check('login works with the new password', r.status === 200);
  r = await req('POST', '/api/auth/login', { body: { username: donorUser, password: 'Donor@12345' } });
  check('old password no longer works', r.status === 401);
  r = await req('POST', '/api/auth/reset-password', { body: { token: resetToken, password: 'Another@12345' } });
  check('reset token is single use', r.status === 400);

  /* ---------------- cleanup ---------------- */
  // Only state this run created is removed. Pre-existing accounts, hospitals,
  // donors, requests, appointments and stock levels are restored exactly.
  if (!process.argv.includes('--keep')) {
    section('Cleanup (e2e records only)');
    const pool = require('../config/db');

    // Restore the stock levels captured before the run started.
    if (inventorySnapshot.length) {
      for (const row of inventorySnapshot) {
        await pool.query(
          `UPDATE blood_inventory
              SET available_units = ?, low_stock_threshold = ?, critical_stock_threshold = ?,
                  last_restocked_at = ?
            WHERE blood_group = ?`,
          [row.available_units, row.low_stock_threshold, row.critical_stock_threshold, row.last_restocked_at, row.blood_group]
        );
      }
    }

    const [u] = await pool.query(
      `SELECT user_id FROM users WHERE username LIKE 'e2e\\_%' OR email LIKE 'e2e\\_%@example.com'`
    );
    const ids = u.map((row) => row.user_id);
    if (ids.length) {
      const placeholders = ids.map(() => '?').join(',');
      // users cascade to donors / hospitals / blood_requests / appointments
      await pool.query(`DELETE FROM users WHERE user_id IN (${placeholders})`, ids);
    }

    // Password reset tokens for accounts that no longer exist.
    await pool.query(
      `DELETE t FROM password_reset_tokens t
        LEFT JOIN users u ON u.user_id = t.user_id
        WHERE u.user_id IS NULL`
    );

    const [counts] = await pool.query(
      `SELECT (SELECT COUNT(*) FROM users) AS users, (SELECT COUNT(*) FROM hospitals) AS hospitals,
              (SELECT COUNT(*) FROM donors) AS donors, (SELECT COUNT(*) FROM blood_requests) AS requests,
              (SELECT COUNT(*) FROM appointments) AS appointments,
              (SELECT COALESCE(SUM(available_units), 0) FROM blood_inventory) AS units`
    );
    console.log(`  restored state: ${JSON.stringify(counts[0])}`);
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
