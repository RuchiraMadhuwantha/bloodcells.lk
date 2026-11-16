const pool = require('../config/db');
const { toDateString } = require('../utils/date');

// Completed appointments are donation records. Older unknown quantities remain null.

const mapDonationRow = (r) => ({
  id: r.appointment_id,
  donationId: r.appointment_id,
  reference: `AP-${String(r.appointment_id).padStart(5, '0')}`,
  donorId: r.donor_id,
  hospitalId: r.hospital_id,
  donationDate: toDateString(r.appointment_date),
  timeSlot: r.time_slot,
  location: r.hospital_name,
  hospitalName: r.hospital_name,
  hospitalCode: r.hospital_code,
  district: r.district,
  bloodGroup: r.blood_group,
  status: 'completed',
  statusLabel: 'Completed',
  quantity: r.collected_units == null ? null : Number(r.collected_units),
  collectedUnits: r.collected_units == null ? null : Number(r.collected_units),
  collectedVolumeMl: r.collected_volume_ml == null ? null : Number(r.collected_volume_ml),
  notes: r.notes,
  recordedAt: toDateString(r.updated_at),
});

const DONATION_SELECT = `
  SELECT a.*, d.full_name AS donor_name, d.blood_group,
         h.hospital_name, h.hospital_code, h.district
    FROM appointments a
    JOIN donors d ON a.donor_id = d.donor_id
    JOIN hospitals h ON a.hospital_id = h.hospital_id
   WHERE a.status = 'completed'`;

const listDonationsForDonor = async (donorId, { year, date, sort = 'desc', page = 1, pageSize = 50 } = {}) => {
  const conditions = ['a.donor_id = ?'];
  const params = [donorId];

  if (year) {
    conditions.push('YEAR(a.appointment_date) = ?');
    params.push(Number(year));
  }
  if (date) {
    conditions.push('a.appointment_date = ?');
    params.push(date);
  }

  const direction = String(sort).toLowerCase() === 'asc' || String(sort).toLowerCase() === 'oldest' ? 'ASC' : 'DESC';
  const safePageSize = Math.min(Math.max(Number(pageSize) || 50, 1), 100);
  const safePage = Math.max(Number(page) || 1, 1);
  const offset = (safePage - 1) * safePageSize;

  const where = conditions.join(' AND ');
  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM appointments a WHERE ${where} AND a.status = 'completed'`,
    params
  );
  const total = Number(countRows[0]?.total || 0);

  const [rows] = await pool.query(
    `${DONATION_SELECT} AND ${where}
      ORDER BY a.appointment_date ${direction}, a.time_slot ${direction}
      LIMIT ? OFFSET ?`,
    [...params, safePageSize, offset]
  );

  return {
    items: rows.map(mapDonationRow),
    pagination: {
      total,
      page: safePage,
      pageSize: safePageSize,
      totalPages: Math.max(Math.ceil(total / safePageSize), 1),
    },
  };
};

const getDonationForDonor = async (appointmentId, donorId) => {
  const [rows] = await pool.query(`${DONATION_SELECT} AND a.appointment_id = ? AND a.donor_id = ?`, [
    appointmentId,
    donorId,
  ]);
  return rows[0] ? mapDonationRow(rows[0]) : null;
};

const countDonationsForDonor = async (donorId) => {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS total FROM appointments WHERE donor_id = ? AND status = 'completed'`,
    [donorId]
  );
  return Number(rows[0]?.total || 0);
};

module.exports = {
  listDonationsForDonor,
  getDonationForDonor,
  countDonationsForDonor,
};
