const express = require('express');
const { param } = require('express-validator');
const {
  listMyNotifications,
  unreadCount,
  getMyNotification,
  markMyNotificationRead,
  markAllMyNotificationsRead,
} = require('../controllers/notificationController');
const authMiddleware = require('../middleware/authMiddleware');
const allowRoles = require('../middleware/roleMiddleware');
const { handleValidationErrors } = require('../validators/common');
const { notificationListValidation } = require('../validators/domainValidators');

const router = express.Router();

const idParam = [param('id').isInt({ min: 1 }).withMessage('Invalid notification reference.')];

router.get('/', authMiddleware, allowRoles('donor', 'hospital', 'blood_bank'), notificationListValidation, handleValidationErrors, listMyNotifications);
router.get('/unread-count', authMiddleware, allowRoles('donor', 'hospital', 'blood_bank'), unreadCount);
router.put('/read-all', authMiddleware, allowRoles('donor', 'hospital', 'blood_bank'), markAllMyNotificationsRead);

/* Declared after the fixed paths. */
router.get('/:id', authMiddleware, allowRoles('donor', 'hospital', 'blood_bank'), idParam, handleValidationErrors, getMyNotification);
router.put('/:id/read', authMiddleware, allowRoles('donor', 'hospital', 'blood_bank'), idParam, handleValidationErrors, markMyNotificationRead);

module.exports = router;
