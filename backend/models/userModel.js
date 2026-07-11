const pool = require('../config/db');

const findUserByUsernameOrEmail = async (identifier) => {
  const [rows] = await pool.query(
    'SELECT * FROM users WHERE username = ? OR email = ?',
    [identifier, identifier]
  );
  return rows[0] || null;
};

const createUser = async ({ username, email, passwordHash, role, accountStatus }) => {
  const [result] = await pool.query(
    'INSERT INTO users (username, email, password_hash, role, account_status) VALUES (?, ?, ?, ?, ?)',
    [username, email, passwordHash, role, accountStatus]
  );
  return result.insertId;
};

const findUserById = async (userId) => {
  const [rows] = await pool.query('SELECT user_id, username, email, role, account_status FROM users WHERE user_id = ?', [userId]);
  return rows[0] || null;
};

module.exports = {
  findUserByUsernameOrEmail,
  createUser,
  findUserById,
};
