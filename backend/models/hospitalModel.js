const pool = require('../config/db');
const { toDateString } = require('../utils/date');

const STATUS_LABELS = {
  active: 'Active',
  pending: 'Pending',
  inactive: 'Rejected',
  suspended: 'Suspended',
};

const createHospitalProfile = async ({
  userId,
  hospitalName,
  hospitalCode,
  hospitalType,
  district,
  address,
  officialPhone,
  contactPersonName,
  contactPersonDesignation,
  contactPersonPhone,
  contactPersonEmail,
}, executor) => {
  const [result] = await (executor || pool).query(
    `INSERT INTO hospitals (
      user_id, hospital_name, hospital_code, hospital_type, district, address, official_phone, contact_person_name, contact_person_designation, contact_person_phone, contact_person_email
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      hospitalName,
      hospitalCode,
      hospitalType || null,
      district || null,
      address || null,
      officialPhone || null,
      contactPersonName || null,
      contactPersonDesignation || null,
      contactPersonPhone || null,
      contactPersonEmail || null,
    ]
  );
  return result.insertId;
};


const mapHospitalRow = (r) => ({
  id: `H-${r.hospital_id}`,
  hospitalId: r.hospital_id,
  userId: r.user_id,
  username: r.username,
  email: r.email,
  hospitalName: r.hospital_name,
  hospitalCode: r.hospital_code,
  hospitalType: r.hospital_type,
  district: r.district,
  address: r.address,
  contactNumber: r.official_phone,
  contactPersonName: r.contact_person_name,
  contactPersonDesignation: r.contact_person_designation,
  contactPersonPhone: r.contact_person_phone,
  contactPersonEmail: r.contact_person_email,
  status: STATUS_LABELS[r.account_status] || 'Pending',
  accountStatus: r.account_status,
  registrationDate: toDateString(r.created_at),
  approvalDate: r.account_status === 'active' ? toDateString(r.reviewed_at || r.updated_at) : '',
  rejectionReason: r.rejection_reason || '',
});

const HOSPITAL_SELECT = `
  SELECT
    h.hospital_id,
    h.user_id,
    h.hospital_name,
    h.hospital_code,
    h.hospital_type,
    h.district,
    h.address,
    h.official_phone,
    h.contact_person_name,
    h.contact_person_designation,
    h.contact_person_phone,
    h.contact_person_email,
    h.rejection_reason,
    h.reviewed_at,
    u.username,
    u.email,
    u.account_status,
    u.created_at,
    u.updated_at
  FROM hospitals h
  JOIN users u ON h.user_id = u.user_id`;

/** All hospitals for blood bank hospital management. Never returns credentials. */
const getAllHospitals = async () => {
  const [rows] = await pool.query(`${HOSPITAL_SELECT} ORDER BY u.created_at DESC`);
  return rows.map(mapHospitalRow);
};

/** Active hospitals only — used by donors when booking an appointment. */
const getActiveHospitals = async () => {
  const [rows] = await pool.query(
    `${HOSPITAL_SELECT} WHERE u.account_status = 'active' ORDER BY h.hospital_name ASC`
  );
  return rows.map((r) => ({
    hospitalId: r.hospital_id,
    name: r.hospital_name,
    code: r.hospital_code,
    type: r.hospital_type,
    district: r.district,
    address: r.address,
    phone: r.official_phone,
  }));
};

const getHospitalStats = async () => {
  const [rows] = await pool.query(
    `SELECT
       COUNT(*) AS total,
       SUM(CASE WHEN u.account_status = 'pending'   THEN 1 ELSE 0 END) AS pending,
       SUM(CASE WHEN u.account_status = 'active'    THEN 1 ELSE 0 END) AS active,
       SUM(CASE WHEN u.account_status = 'inactive'  THEN 1 ELSE 0 END) AS rejected,
       SUM(CASE WHEN u.account_status = 'suspended' THEN 1 ELSE 0 END) AS suspended
     FROM hospitals h
     JOIN users u ON h.user_id = u.user_id`
  );
  const r = rows[0] || {};
  return {
    total: Number(r.total || 0),
    pending: Number(r.pending || 0),
    active: Number(r.active || 0),
    rejected: Number(r.rejected || 0),
    suspended: Number(r.suspended || 0),
  };
};

const getPendingCount = async () => {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS cnt FROM users WHERE role = 'hospital' AND account_status = 'pending'`
  );
  return Number(rows[0].cnt);
};

const getHospitalByUserId = async (userId, executor) => {
  const [rows] = await (executor || pool).query(`${HOSPITAL_SELECT} WHERE h.user_id = ?`, [userId]);
  return rows[0] ? mapHospitalRow(rows[0]) : null;
};

const updateHospitalStatus = async (userId, accountStatus, reviewedByUserId, rejectionReason = null) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [rows] = await connection.query(
      'SELECT user_id, account_status FROM users WHERE user_id = ? AND role = ? FOR UPDATE',
      [userId, 'hospital']
    );
    if (rows.length === 0) {
      throw Object.assign(new Error('Hospital registration not found.'), { statusCode: 404 });
    }

    await connection.query(
      `UPDATE users
          SET account_status = ?,
              updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ? AND role = 'hospital'`,
      [accountStatus, userId]
    );

    await connection.query(
      `UPDATE hospitals
          SET rejection_reason = ?,
              reviewed_at = NOW(),
              reviewed_by_user_id = ?
        WHERE user_id = ?`,
      [accountStatus === 'inactive' ? rejectionReason || 'Rejected by the Blood Bank.' : null, reviewedByUserId || null, userId]
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const approveHospital = async (userId, reviewedByUserId) =>
  updateHospitalStatus(userId, 'active', reviewedByUserId);

const rejectHospital = async (userId, reviewedByUserId, reason) =>
  updateHospitalStatus(userId, 'inactive', reviewedByUserId, reason);

const reviewAgainHospital = async (userId, reviewedByUserId) =>
  updateHospitalStatus(userId, 'pending', reviewedByUserId);

module.exports = {
  createHospitalProfile,
  getAllHospitals,
  getActiveHospitals,
  getHospitalStats,
  getPendingCount,
  getHospitalByUserId,
  approveHospital,
  rejectHospital,
  reviewAgainHospital,
  STATUS_LABELS,
};
