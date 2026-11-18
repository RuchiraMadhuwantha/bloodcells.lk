const pool = require('../config/db');

/** Optional `executor` lets callers run these writes inside a transaction. */
const exec = (executor) => executor || pool;

const createDonorProfile = async ({ userId, fullName, nic, dateOfBirth, gender, bloodGroup, phone, district, weight, lastDonationDate, declarationChecked }, executor) => {
  const [result] = await exec(executor).query(
    `INSERT INTO donors (
      user_id, full_name, nic, date_of_birth, gender, blood_group, phone, district, weight, last_donation_date, declaration_checked, email_opt_in, email_consent_updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)`,
    [userId, fullName, nic, dateOfBirth || null, gender || null, bloodGroup, phone || null, district || null, weight || null, lastDonationDate || null, declarationChecked ? 1 : 0]
  );
  return result.insertId;
};

const getDonorByUserId = async (userId, executor) => {
  const [rows] = await exec(executor).query('SELECT * FROM donors WHERE user_id = ?', [userId]);
  return rows[0] || null;
};

const updateDonorProfile = async (userId, fields, executor) => {
  const columns = Object.keys(fields);
  if (columns.length === 0) return;

  const setClause = columns.map((col) => `${col} = ?`).join(', ');
  const values = columns.map((col) => fields[col]);
  values.push(userId);

  await exec(executor).query(`UPDATE donors SET ${setClause} WHERE user_id = ?`, values);
};

/** Reverse lookup: the users.user_id that owns a donor profile (for notifications). */
const getUserIdByDonorId = async (donorId, executor) => {
  const [rows] = await exec(executor).query('SELECT user_id FROM donors WHERE donor_id = ?', [donorId]);
  return rows[0] ? rows[0].user_id : null;
};

/**
 * User ids of donors eligible to be *notified* about an emergency alert:
 * matching blood group, active accounts, district match when the alert has one.
 * Notification is not medical eligibility — final screening happens at the
 * donation centre.
 */
const findDonorUserIdsForBloodGroup = async ({ bloodGroup, district }, executor) => {
  const conditions = [
    'd.blood_group = ?',
    "u.account_status = 'active'",
  ];
  const params = [bloodGroup];
  if (district) {
    conditions.push('(d.district = ? OR d.district IS NULL)');
    params.push(district);
  }
  const [rows] = await exec(executor).query(
    `SELECT u.user_id
       FROM donors d
       JOIN users u ON u.user_id = d.user_id
      WHERE ${conditions.join(' AND ')}`,
    params
  );
  return rows.map((r) => r.user_id);
};

module.exports = {
  createDonorProfile,
  getDonorByUserId,
  updateDonorProfile,
  getUserIdByDonorId,
  findDonorUserIdsForBloodGroup,
};
