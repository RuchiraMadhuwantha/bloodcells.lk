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
  nic: r.booking_nic || null,
  status: r.status,
  statusLabel: STATUS_LABELS[r.status] || r.status,
  collectedUnits: r.collected_units == null ? null : Number(r.collected_units),
  collectedVolumeMl: r.collected_volume_ml == null ? null : Number(r.collected_volume_ml),
  campaignId:r.campaign_id || null,campaignName:r.campaign_name || null,
  collectionBatchId:r.collection_batch_id || null,
  collectionRecordedAt: r.collection_recorded_at || null,
  createdAt: toDateString(r.created_at),
});

const APPOINTMENT_SELECT = `
  SELECT
    a.*,(SELECT c.name FROM campaigns c WHERE c.campaign_id=a.campaign_id) AS campaign_name,(SELECT sb.batch_id FROM stock_batches sb WHERE sb.appointment_id=a.appointment_id) AS collection_batch_id,
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

const getAppointmentsForBank = async ({ date, hospitalId, status, search } = {}) => {
  const conditions = ['1 = 1'];
  const params = [];
  if (date) {
    conditions.push('a.appointment_date = ?');
    params.push(date);
  }
  if (hospitalId) {
    conditions.push('a.hospital_id = ?');
    params.push(hospitalId);
  }
  if(status){conditions.push('a.status=?');params.push(status);}
  if(search){conditions.push('(d.full_name LIKE ? OR h.hospital_name LIKE ?)');params.push('%'+search+'%','%'+search+'%');}
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

const createAppointment = async ({ donorId, hospitalId, appointmentDate, timeSlot, notes, nic }, executor) => {
  const db = executor || pool;

  // Lock the hospital row for the duration of the transaction. Every booking
  // for this centre serializes on that row, which makes the check-then-insert
  // below atomic even without a covering unique index.
  const [hospitals] = await db.query(
    `SELECT h.hospital_id FROM hospitals h
       JOIN users u ON h.user_id = u.user_id
      WHERE h.hospital_id = ? AND u.account_status = 'active'
      FOR UPDATE`,
    [hospitalId]
  );
  if (hospitals.length === 0) {
    throw httpError(400, 'This donation centre is not available for booking.');
  }

  const [duplicates] = await db.query(
    `SELECT appointment_id FROM appointments
      WHERE donor_id = ? AND appointment_date = ? AND time_slot = ? AND status != 'cancelled'
      FOR UPDATE`,
    [donorId, appointmentDate, timeSlot]
  );
  if (duplicates.length > 0) {
    throw httpError(409, 'You already have an appointment booked for this date and time.');
  }

  // Centre capacity: one active booking per (hospital, date, time slot) —
  // mirrors how the booking UI disables taken slots.
  const [occupied] = await db.query(
    `SELECT appointment_id FROM appointments
      WHERE hospital_id = ? AND appointment_date = ? AND time_slot = ? AND status != 'cancelled'
      LIMIT 1
      FOR UPDATE`,
    [hospitalId, appointmentDate, timeSlot]
  );
  if (occupied.length > 0) {
    throw httpError(409, 'This time slot at the selected centre is already booked. Please choose another slot.');
  }

  const [result] = await db.query(
    `INSERT INTO appointments (donor_id, hospital_id, appointment_date, time_slot, notes, booking_nic)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [donorId, hospitalId, appointmentDate, timeSlot, notes || null, nic || null]
  );
  return result.insertId;
};

/**
 * Moves an appointment to a new date/slot. The caller owns the transaction.
 * Re-validates ownership semantics via the row's current state and applies the
 * same availability rules as booking.
 */
const rescheduleAppointment = async ({ appointmentId, donorId, newDate, newTimeSlot }, executor) => {
  const db = executor || pool;

  const [rows] = await db.query(
    'SELECT * FROM appointments WHERE appointment_id = ? FOR UPDATE',
    [appointmentId]
  );
  const appointment = rows[0];
  if (!appointment) {
    throw httpError(404, 'Appointment not found.');
  }
  if (appointment.donor_id !== donorId) {
    throw httpError(403, 'You can only reschedule your own appointments.');
  }
  if (!['pending', 'approved'].includes(appointment.status)) {
    throw httpError(409, `Only pending or approved appointments can be rescheduled (this one is ${STATUS_LABELS[appointment.status] || appointment.status}).`);
  }

  // Same centre, different slot: make sure the target is free for everyone.
  const [occupied] = await db.query(
    `SELECT appointment_id FROM appointments
      WHERE hospital_id = ? AND appointment_date = ? AND time_slot = ? AND status != 'cancelled'
        AND appointment_id != ?
      LIMIT 1 FOR UPDATE`,
    [appointment.hospital_id, newDate, newTimeSlot, appointmentId]
  );
  if (occupied.length > 0) {
    throw httpError(409, 'This time slot at your centre is already booked. Please choose another slot.');
  }

  // ...and free for this donor specifically (they may have another booking).
  const [duplicates] = await db.query(
    `SELECT appointment_id FROM appointments
      WHERE donor_id = ? AND appointment_date = ? AND time_slot = ? AND status != 'cancelled'
        AND appointment_id != ?
      LIMIT 1 FOR UPDATE`,
    [donorId, newDate, newTimeSlot, appointmentId]
  );
  if (duplicates.length > 0) {
    throw httpError(409, 'You already have an appointment booked for this date and time.');
  }

  await db.query(
    `UPDATE appointments SET appointment_date = ?, time_slot = ? WHERE appointment_id = ?`,
    [newDate, newTimeSlot, appointmentId]
  );
  return appointment;
};

const updateAppointmentStatus = async ({ appointmentId, status }, executor) => {
  const db = executor || pool;
  const [result] = await db.query("UPDATE appointments SET status = ? WHERE appointment_id = ? AND status IN ('pending','approved') AND status<>?", [
    status,
    appointmentId,
    status,
  ]);
  if (result.affectedRows === 0) {
    throw httpError(409, 'Appointment was already processed. Refresh before retrying.');
  }
};

const getAppointmentById = async (appointmentId, executor, lock = false) => {
  const db = executor || pool;
  const [rows] = await db.query(`${APPOINTMENT_SELECT} WHERE a.appointment_id = ?${lock ? ' FOR UPDATE' : ''}`, [appointmentId]);
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
  rescheduleAppointment,
  updateAppointmentStatus,
  getAppointmentById,
  getDonorIdByUserId,
  getUpcomingAppointment,
};
