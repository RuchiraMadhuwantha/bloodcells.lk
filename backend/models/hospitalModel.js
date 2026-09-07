const pool = require('../config/db');

const createHospitalProfile = async ({ userId, hospitalName, hospitalCode, hospitalType, district, address, officialPhone, contactPersonName, contactPersonDesignation, contactPersonPhone, contactPersonEmail }) => {
  const [result] = await pool.query(
    `INSERT INTO hospitals (
      user_id, hospital_name, hospital_code, hospital_type, district, address, official_phone, contact_person_name, contact_person_designation, contact_person_phone, contact_person_email
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, hospitalName, hospitalCode, hospitalType || null, district || null, address || null, officialPhone || null, contactPersonName || null, contactPersonDesignation || null, contactPersonPhone || null, contactPersonEmail || null]
  );
  return result.insertId;
};

const mapUserStatus = (accountStatus) => {
  switch (accountStatus) {
    case 'active': return 'Active';
    case 'pending': return 'Pending';
    case 'inactive': return 'Rejected';
    case 'suspended': return 'Inactive';
    default: return 'Pending';
  }
};

const getAllHospitals = async () => {
  const [rows] = await pool.query(
    `SELECT
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
       u.username,
       u.email,
       u.account_status,
       u.created_at,
       u.updated_at
     FROM hospitals h
     JOIN users u ON h.user_id = u.user_id
     ORDER BY u.created_at DESC`
  );

  return rows.map((r) => ({
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
    status: mapUserStatus(r.account_status),
    registrationDate: r.created_at ? new Date(r.created_at).toISOString().slice(0, 10) : '',
    approvalDate: r.account_status === 'active' ? (r.updated_at ? new Date(r.updated_at).toISOString().slice(0, 10) : '') : '',
    rejectionReason: '',
  }));
};

const getPendingCount = async () => {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS cnt FROM users WHERE role = 'hospital' AND account_status = 'pending'`
  );
  return Number(rows[0].cnt);
};

const updateHospitalStatus = async (userId, accountStatus) => {
  await pool.query(
    `UPDATE users SET account_status = ? WHERE user_id = ? AND role = 'hospital'`,
    [accountStatus, userId]
  );
};

const approveHospital = async (userId) => {
  await updateHospitalStatus(userId, 'active');
};

const rejectHospital = async (userId) => {
  await updateHospitalStatus(userId, 'inactive');
};

const reviewAgainHospital = async (userId) => {
  await updateHospitalStatus(userId, 'pending');
};

module.exports = {
  createHospitalProfile,
  getAllHospitals,
  getPendingCount,
  approveHospital,
  rejectHospital,
  reviewAgainHospital,
};
