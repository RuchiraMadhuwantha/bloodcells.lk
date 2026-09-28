const jwt = require('jsonwebtoken');
const pool = require('../config/db');

/**
 * Verifies the bearer token, then re-reads the account from MySQL.
 *
 * The role stored on `req.user` always comes from the database — never from the
 * token body or from anything the browser sends — so a tampered/expired account
 * cannot keep using an old token after its status changed (e.g. a hospital that
 * gets rejected loses access immediately).
 */
const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Your session has expired. Please log in again.' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token.' });
  }

  try {
    const [rows] = await pool.query(
      'SELECT user_id, username, role, account_status FROM users WHERE user_id = ?',
      [decoded.user_id]
    );
    const user = rows[0];

    if (!user) {
      return res.status(401).json({ success: false, message: 'Account no longer exists.' });
    }

    if (user.account_status !== 'active') {
      const messages = {
        pending: user.role === 'hospital'
          ? 'Your hospital registration is awaiting approval from the Blood Bank.'
          : 'Your account is awaiting approval.',
        inactive: user.role === 'hospital'
          ? 'Your hospital registration was rejected. Please contact the Blood Bank.'
          : 'Your account is not active.',
        suspended: 'Your account has been suspended. Please contact the Blood Bank.',
      };
      return res.status(403).json({ success: false, message: messages[user.account_status] || 'Your account is not active.' });
    }

    req.user = {
      user_id: user.user_id,
      username: user.username,
      role: user.role,
      account_status: user.account_status,
    };
    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = authMiddleware;
