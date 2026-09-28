const pool = require('../config/db');
const { toDateString, addDays: addDaysTo } = require('../utils/date');

/** Days a donor must wait between donations. */
const DONATION_INTERVAL_DAYS = 90;


const addDays = (date, days) => addDaysTo(date, days);

const mapDonorRow = (r) => {
  const lastDonation = r.last_donation_date ? new Date(r.last_donation_date) : null;
  const nextEligible = lastDonation ? addDays(lastDonation, DONATION_INTERVAL_DAYS) : null;
  const eligible = !lastDonation || nextEligible <= new Date();

  return {
    id: `D-${r.donor_id}`,
    donorId: r.donor_id,
    userId: r.user_id,
    fullName: r.full_name,
    nic: r.nic,
    email: r.email,
    username: r.username,
    phone: r.phone,
    gender: r.gender,
    dateOfBirth: toDateString(r.date_of_birth),
    age: r.date_of_birth
      ? Math.floor((Date.now() - new Date(r.date_of_birth).getTime()) / (365.25 * 24 * 3600 * 1000))
      : null,
    bloodGroup: r.blood_group,
    district: r.district,
    weight: r.weight === null ? null : Number(r.weight),
    lastDonationDate: toDateString(r.last_donation_date),
    nextEligibleDate: nextEligible ? toDateString(nextEligible) : null,
    donationCount: Number(r.donation_count || 0),
    eligible,
    accountStatus: r.account_status,
    registeredAt: toDateString(r.created_at),
  };
};

/**
 * Donor directory for the blood bank. Passwords, password hashes and JWTs are
 * never selected here.
 */
const listDonors = async ({ search, bloodGroup, district, eligible } = {}) => {
  const conditions = [];
  const params = [];

  if (search && search.trim()) {
    const q = `%${search.trim()}%`;
    conditions.push('(d.full_name LIKE ? OR d.nic LIKE ? OR u.email LIKE ? OR u.username LIKE ?)');
    params.push(q, q, q, q);
  }
  if (bloodGroup && bloodGroup !== 'All') {
    conditions.push('d.blood_group = ?');
    params.push(bloodGroup);
  }
  if (district && district !== 'All') {
    conditions.push('d.district = ?');
    params.push(district);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [rows] = await pool.query(
    `SELECT
       d.donor_id, d.user_id, d.full_name, d.nic, d.date_of_birth, d.gender, d.blood_group,
       d.phone, d.district, d.weight, d.last_donation_date, d.created_at,
       u.email, u.username, u.account_status,
       (SELECT COUNT(*) FROM appointments a
         WHERE a.donor_id = d.donor_id AND a.status = 'completed') AS donation_count
     FROM donors d
     JOIN users u ON d.user_id = u.user_id
     ${where}
     ORDER BY d.created_at DESC`,
    params
  );

  const donors = rows.map(mapDonorRow);
  if (eligible === true) return donors.filter((d) => d.eligible);
  if (eligible === false) return donors.filter((d) => !d.eligible);
  return donors;
};

const getDonorById = async (donorId) => {
  const [rows] = await pool.query(
    `SELECT
       d.donor_id, d.user_id, d.full_name, d.nic, d.date_of_birth, d.gender, d.blood_group,
       d.phone, d.district, d.weight, d.last_donation_date, d.created_at,
       u.email, u.username, u.account_status,
       (SELECT COUNT(*) FROM appointments a
         WHERE a.donor_id = d.donor_id AND a.status = 'completed') AS donation_count
     FROM donors d
     JOIN users u ON d.user_id = u.user_id
     WHERE d.donor_id = ?`,
    [donorId]
  );
  return rows[0] ? mapDonorRow(rows[0]) : null;
};

const getDonorDirectoryStats = async () => {
  const [rows] = await pool.query(
    `SELECT
       COUNT(*) AS total,
       SUM(CASE WHEN d.last_donation_date IS NULL THEN 1 ELSE 0 END) AS never_donated,
       SUM(CASE WHEN d.last_donation_date IS NOT NULL
                 AND d.last_donation_date <= DATE_SUB(CURDATE(), INTERVAL ${DONATION_INTERVAL_DAYS} DAY)
                THEN 1 ELSE 0 END) AS eligible,
       SUM(CASE WHEN d.district IS NULL OR d.district = '' THEN 1 ELSE 0 END) AS missing_district
     FROM donors d`
  );
  const r = rows[0] || {};
  return {
    totalDonors: Number(r.total || 0),
    eligibleNow: Number(r.eligible || 0) + Number(r.never_donated || 0),
    resting: Number(r.total || 0) - (Number(r.eligible || 0) + Number(r.never_donated || 0)),
    neverDonated: Number(r.never_donated || 0),
    missingDistrict: Number(r.missing_district || 0),
  };
};

const getDonorBloodGroupBreakdown = async () => {
  const [rows] = await pool.query(
    'SELECT blood_group, COUNT(*) AS cnt FROM donors GROUP BY blood_group'
  );
  return rows.map((r) => ({ bloodGroup: r.blood_group, count: Number(r.cnt) }));
};

/**
 * A donor's own dashboard summary. Scoped to the signed-in donor and derived
 * entirely from their own rows, so it can never leak another donor's data.
 */
const getDonorSelfSummary = async (userId) => {
  const [profile] = await pool.query(
    'SELECT donor_id, full_name, blood_group, district, last_donation_date FROM donors WHERE user_id = ?',
    [userId]
  );
  if (profile.length === 0) {
    throw Object.assign(new Error('No donor profile is linked to this account.'), { statusCode: 404 });
  }
  const p = profile[0];

  const [counts] = await pool.query(
    `SELECT
       SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END) AS completed,
       SUM(CASE WHEN a.status IN ('pending', 'approved')
                 AND a.appointment_date >= CURDATE() THEN 1 ELSE 0 END) AS upcoming,
       SUM(CASE WHEN a.status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled,
       MAX(CASE WHEN a.status = 'completed' THEN a.appointment_date END) AS last_completed
     FROM appointments a
     WHERE a.donor_id = ?`,
    [p.donor_id]
  );
  const c = counts[0] || {};

  // The most recent completed donation is the true basis for eligibility; the
  // self-reported date is only a fallback.
  const lastDonation = c.last_completed || p.last_donation_date || null;
  const nextEligible = lastDonation
    ? addDays(new Date(lastDonation), DONATION_INTERVAL_DAYS)
    : null;
  const eligibleNow = !nextEligible || nextEligible <= new Date();

  return {
    fullName: p.full_name,
    bloodGroup: p.blood_group,
    district: p.district,
    totalDonations: Number(c.completed || 0),
    upcomingAppointments: Number(c.upcoming || 0),
    cancelledAppointments: Number(c.cancelled || 0),
    lastDonationDate: toDateString(lastDonation),
    nextEligibleDate: toDateString(nextEligible),
    eligibleNow,
    donationIntervalDays: DONATION_INTERVAL_DAYS,
  };
};

module.exports = {
  listDonors,
  getDonorById,
  getDonorDirectoryStats,
  getDonorBloodGroupBreakdown,
  getDonorSelfSummary,
  DONATION_INTERVAL_DAYS,
};
