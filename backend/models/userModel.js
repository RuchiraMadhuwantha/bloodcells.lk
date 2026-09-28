const pool = require('../config/db');

/**
 * All helpers accept an optional `executor` so callers can pass a dedicated
 * connection inside a transaction. It defaults to the shared pool, which keeps
 * the existing call sites working while making writes rollback-able.
 */
const exec = (executor) => executor || pool;

const findUserByUsernameOrEmail = async (identifier, executor) => {
  const [rows] = await exec(executor).query(
    'SELECT * FROM users WHERE username = ? OR email = ?',
    [identifier, identifier]
  );
  return rows[0] || null;
};

const createUser = async ({ username, email, passwordHash, role, accountStatus }, executor) => {
  const [result] = await exec(executor).query(
    'INSERT INTO users (username, email, password_hash, role, account_status) VALUES (?, ?, ?, ?, ?)',
    [username, email, passwordHash, role, accountStatus]
  );
  return result.insertId;
};

const findUserById = async (userId, executor) => {
  const [rows] = await exec(executor).query(
    'SELECT user_id, username, email, role, account_status FROM users WHERE user_id = ?',
    [userId]
  );
  return rows[0] || null;
};

const updateUserEmail = async (userId, email, executor) => {
  await exec(executor).query('UPDATE users SET email = ? WHERE user_id = ?', [email, userId]);
};

const findUserByEmailExcluding = async (email, userId, executor) => {
  const [rows] = await exec(executor).query(
    'SELECT user_id FROM users WHERE email = ? AND user_id != ?',
    [email, userId]
  );
  return rows[0] || null;
};

module.exports = {
  findUserByUsernameOrEmail,
  createUser,
  findUserById,
  updateUserEmail,
  findUserByEmailExcluding,
};
