const pool = require('../config/db');
const { toDateString } = require('../utils/date');

const STATUS_LABELS = {
  pending: 'Pending',
  approved: 'Approved',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const httpError = (statusCode, message) => Object.assign(new Error(message), { statusCode });

const mapAppointmentRow = (r) => ({
  id: r.appointment_id,
  reference: `AP-${String(r.appointment_id).padStart(5, '0')}`,
  donorId: r.donor_id,
  donorName: r.donor_name,
  bloodGroup: r.blood_group,
  hospitalId: r.hospital_id,
  hospitalName: r.hospital_name,
  hospitalCode: r.hospital_code,
  district: r.district,
  appointmentDate: toDateString(r.appointment_date),
  timeSlot: r.time_slot,
  notes: r.notes,
  status: r.status,
  statusLabel: STATUS_LABELS[r.status] || r.status,
  createdAt: toDateString(r.created_at),
});

const APPOINTMENT_SELECT = `
  SELECT
    a.*,
    d.full_name AS donor_name,
    d.blood_group,
    h.hospital_name,
    h.hospital_code,
    h.district
  FROM appointments a
  JOIN donors d ON a.donor_id = d.donor_id
  JOIN hospitals h ON a.hospital_id = h.hospital_id
  JOIN users hu ON h.user_id = hu.user_id`;

const getAppointmentsForDonor = async (donorId) => {
  const [rows] = await pool.query(
    `${APPOINTMENT_SELECT} WHERE a.donor_id = ? ORDER BY a.appointment_date DESC, a.time_slot DESC`,
    [donorId]
  );
  return rows.map(mapAppointmentRow);
};

const getAppointmentsForHospital = async (hospitalId) => {
  const [rows] = await pool.query(
    `${APPOINTMENT_SELECT} WHERE a.hospital_id = ? AND hu.account_status = 'active'
      ORDER BY a.appointment_date ASC, a.time_slot ASC`,
    [hospitalId]
  );
  return rows.map(mapAppointmentRow);
};

const getAppointmentsForBank = async ({ date, hospitalId } = {}) => {
  const conditions = ["hu.account_status = 'active'"];
  const params = [];
  if (date) {
    conditions.push('a.appointment_date = ?');
    params.push(date);
  }
  if (hospitalId) {
    conditions.push('a.hospital_id = ?');
    params.push(hospitalId);
  }
  const [rows] = await pool.query(
    `${APPOINTMENT_SELECT} WHERE ${conditions.join(' AND ')}
      ORDER BY a.appointment_date ASC, a.time_slot ASC`,
    params
  );
  return rows.map(mapAppointmentRow);
};

const getBookedSlots = async (hospitalId, date) => {
  const [rows] = await pool.query(
    `SELECT time_slot FROM appointments
      WHERE hospital_id = ? AND appointment_date = ? AND status != 'cancelled'`,
    [hospitalId, date]
  );
  return rows.map((r) => r.time_slot);
};

const createAppointment = async ({ donorId, hospitalId, appointmentDate, timeSlot, notes }) => {
  // The hospital must still be approved, otherwise donors could book a centre
  // that is not allowed to operate.
  const [hospitals] = await pool.query(
    `SELECT h.hospital_id FROM hospitals h
       JOIN users u ON h.user_id = u.user_id
      WHERE h.hospital_id = ? AND u.account_status = 'active'`,
    [hospitalId]
  );
  if (hospitals.length === 0) {
    throw httpError(400, 'This donation centre is not available for booking.');
  }

  const [duplicates] = await pool.query(
    `SELECT appointment_id FROM appointments
      WHERE donor_id = ? AND appointment_date = ? AND time_slot = ? AND status != 'cancelled'`,
    [donorId, appointmentDate, timeSlot]
  );
  if (duplicates.length > 0) {
    throw httpError(409, 'You already have an appointment booked for this date and time.');
  }

  const [result] = await pool.query(
    `INSERT INTO appointments (donor_id, hospital_id, appointment_date, time_slot, notes)
     VALUES (?, ?, ?, ?, ?)`,
    [donorId, hospitalId, appointmentDate, timeSlot, notes || null]
  );
  return result.insertId;
};

const updateAppointmentStatus = async ({ appointmentId, status }) => {
  const [result] = await pool.query('UPDATE appointments SET status = ? WHERE appointment_id = ?', [
    status,
    appointmentId,
  ]);
  if (result.affectedRows === 0) {
    throw httpError(404, 'Appointment not found.');
  }
};

const getAppointmentById = async (appointmentId) => {
  const [rows] = await pool.query(`${APPOINTMENT_SELECT} WHERE a.appointment_id = ?`, [appointmentId]);
  return rows[0] ? mapAppointmentRow(rows[0]) : null;
};

const getDonorIdByUserId = async (userId) => {
  const [rows] = await pool.query('SELECT donor_id FROM donors WHERE user_id = ?', [userId]);
  return rows[0] ? rows[0].donor_id : null;
};

const getUpcomingAppointment = async (donorId) => {
  const [rows] = await pool.query(
    `${APPOINTMENT_SELECT}
      WHERE a.donor_id = ? AND a.appointment_date >= CURDATE() AND a.status IN ('pending', 'approved')
      ORDER BY a.appointment_date ASC, a.time_slot ASC
      LIMIT 1`,
    [donorId]
  );
  return rows[0] ? mapAppointmentRow(rows[0]) : null;
};

module.exports = {
  getAppointmentsForDonor,
  getAppointmentsForHospital,
  getAppointmentsForBank,
  getBookedSlots,
  createAppointment,
  updateAppointmentStatus,
  getAppointmentById,
  getDonorIdByUserId,
  getUpcomingAppointment,
};
