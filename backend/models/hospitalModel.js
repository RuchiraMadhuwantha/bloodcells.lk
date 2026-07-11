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

module.exports = {
  createHospitalProfile,
};
