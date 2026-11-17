const {
  listForUser,
  countUnread,
  getByIdForUser,
  markReadForUser,
  markAllReadForUser,
} = require('../models/notificationModel');
const { toFriendlyError } = require('../validators/common');

const httpError = (statusCode, message) => Object.assign(new Error(message), { statusCode });

const listMyNotifications = async (req, res, next) => {
  try {
    const limit=req.query.limit?Number(req.query.limit):100;
    const offset=req.query.offset?Number(req.query.offset):0;
    const [items, unreadCount] = await Promise.all([
      listForUser(req.user.user_id, {
        type: req.query.type,
        unreadOnly: req.query.unread === 'true',
        limit:limit+1,
        offset: req.query.offset ? Number(req.query.offset) : undefined,
      }),
      countUnread(req.user.user_id),
    ]);
    res.json({ success: true, notifications: items.slice(0,limit), unreadCount,hasMore:items.length>limit,nextOffset:offset+Math.min(items.length,limit) });
  } catch (error) {
    next(toFriendlyError(error, 'Could not load your notifications.'));
  }
};

const unreadCount = async (req, res, next) => {
  try {
    const count = await countUnread(req.user.user_id);
    res.json({ success: true, unreadCount: count });
  } catch (error) {
    next(toFriendlyError(error, 'Could not load the unread notification count.'));
  }
};

const getMyNotification = async (req, res, next) => {
  try {
    const notification = await getByIdForUser(Number(req.params.id), req.user.user_id);
    if (!notification) {
      throw httpError(404, 'Notification not found.');
    }
    res.json({ success: true, notification });
  } catch (error) {
    next(toFriendlyError(error, 'Could not load this notification.'));
  }
};

const markMyNotificationRead = async (req, res, next) => {
  try {
    const notification = await markReadForUser(Number(req.params.id), req.user.user_id);
    if (!notification) {
      throw httpError(404, 'Notification not found.');
    }
    const unread = await countUnread(req.user.user_id);
    res.json({ success: true, message: 'Notification marked as read.', notification, unreadCount: unread });
  } catch (error) {
    next(toFriendlyError(error, 'Could not update this notification.'));
  }
};

const markAllMyNotificationsRead = async (req, res, next) => {
  try {
    const updated = await markAllReadForUser(req.user.user_id);
    res.json({
      success: true,
      message: updated > 0 ? `${updated} notification(s) marked as read.` : 'All notifications are already read.',
      updated,
      unreadCount: 0,
    });
  } catch (error) {
    next(toFriendlyError(error, 'Could not update your notifications.'));
  }
};

module.exports = {
  listMyNotifications,
  unreadCount,
  getMyNotification,
  markMyNotificationRead,
  markAllMyNotificationsRead,
};
