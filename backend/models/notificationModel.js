const pool = require('../config/db');
const { toDateTimeString } = require('../utils/date');

const mapNotificationRow = (r) => ({
  id: r.notification_id,
  type: r.type,
  title: r.title,
  description: r.message,
  message: r.message,
  relatedType: r.related_type,
  relatedId: r.related_id,
  actionRoute: r.action_route,
  isRead: Boolean(r.is_read),
  readAt: r.read_at ? toDateTimeString(r.read_at) : null,
  createdAt: toDateTimeString(r.created_at),
});

/**
 * Creates one notification for a specific user. Call INSIDE the caller's
 * transaction (pass `executor`) whenever the notification must be atomic with
 * the event that triggers it — otherwise pass nothing to use the pool.
 */
const createNotification = async (
  { userId, type, title, message, relatedType, relatedId, actionRoute },
  executor
) => {
  const db = executor || pool;
  const [result] = await db.query(
    `INSERT INTO notifications (user_id, type, title, message, related_type, related_id, action_route)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      type,
      title,
      message,
      relatedType || null,
      relatedId || null,
      actionRoute || null,
    ]
  );
  return result.insertId;
};

const listForUser = async (userId, { type, unreadOnly, limit = 100, offset = 0 } = {}) => {
  const conditions = ['user_id = ?'];
  const params = [userId];
  if (type) {
    conditions.push('type = ?');
    params.push(type);
  }
  if (unreadOnly) {
    conditions.push('is_read = 0');
  }
  const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 200);
  const safeOffset = Math.max(Number(offset) || 0, 0);
  const [rows] = await pool.query(
    `SELECT * FROM notifications WHERE ${conditions.join(' AND ')}
      ORDER BY created_at DESC, notification_id DESC
      LIMIT ? OFFSET ?`,
    [...params, safeLimit, safeOffset]
  );
  return rows.map(mapNotificationRow);
};

const countUnread = async (userId) => {
  const [rows] = await pool.query(
    'SELECT COUNT(*) AS cnt FROM notifications WHERE user_id = ? AND is_read = 0',
    [userId]
  );
  return Number(rows[0]?.cnt || 0);
};

const getByIdForUser = async (notificationId, userId) => {
  const [rows] = await pool.query(
    'SELECT * FROM notifications WHERE notification_id = ? AND user_id = ?',
    [notificationId, userId]
  );
  return rows[0] ? mapNotificationRow(rows[0]) : null;
};

/** Marks one notification read. Returns the updated notification, or null if not owned. */
const markReadForUser = async (notificationId, userId, executor) => {
  const db = executor || pool;
  const [result] = await db.query(
    `UPDATE notifications
        SET is_read = 1, read_at = NOW()
      WHERE notification_id = ? AND user_id = ?`,
    [notificationId, userId]
  );
  if (result.affectedRows === 0) return null;
  return getByIdForUser(notificationId, userId);
};

const markAllReadForUser = async (userId, executor) => {
  const db = executor || pool;
  const [result] = await db.query(
    'UPDATE notifications SET is_read = 1, read_at = NOW() WHERE user_id = ? AND is_read = 0',
    [userId]
  );
  return result.affectedRows;
};

module.exports = {
  createNotification,
  listForUser,
  countUnread,
  getByIdForUser,
  markReadForUser,
  markAllReadForUser,
};
