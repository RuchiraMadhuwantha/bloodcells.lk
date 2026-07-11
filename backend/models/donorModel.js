const pool = require('../config/db');

const createDonorProfile = async ({ userId, fullName, nic, dateOfBirth, gender, bloodGroup, phone, district, weight, lastDonationDate, declarationChecked }) => {
  const [result] = await pool.query(
    `INSERT INTO donors (
      user_id, full_name, nic, date_of_birth, gender, blood_group, phone, district, weight, last_donation_date, declaration_checked
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, fullName, nic, dateOfBirth || null, gender || null, bloodGroup, phone || null, district || null, weight || null, lastDonationDate || null, declarationChecked ? 1 : 0]
  );
  return result.insertId;
};

module.exports = {
  createDonorProfile,
};
