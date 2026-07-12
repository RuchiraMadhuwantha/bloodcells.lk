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

const getDonorByUserId = async (userId) => {
  const [rows] = await pool.query('SELECT * FROM donors WHERE user_id = ?', [userId]);
  return rows[0] || null;
};

const updateDonorProfile = async (userId, fields) => {
  const columns = Object.keys(fields);
  if (columns.length === 0) return;

  const setClause = columns.map((col) => `${col} = ?`).join(', ');
  const values = columns.map((col) => fields[col]);
  values.push(userId);

  await pool.query(`UPDATE donors SET ${setClause} WHERE user_id = ?`, values);
};

module.exports = {
  createDonorProfile,
  getDonorByUserId,
  updateDonorProfile,
};
