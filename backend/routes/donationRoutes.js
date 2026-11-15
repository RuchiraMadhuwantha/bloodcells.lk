const express = require('express');
const { param, query } = require('express-validator');
const { listMyDonations, getMyDonation } = require('../controllers/donationController');
const authMiddleware = require('../middleware/authMiddleware');
const allowRoles = require('../middleware/roleMiddleware');
const { handleValidationErrors } = require('../validators/common');

const router = express.Router();

const idParam = [param('id').isInt({ min: 1 }).withMessage('Invalid donation reference.')];
const listQuery = [
  query('year').optional().isInt({ min: 1990, max: 2100 }).withMessage('Enter a valid year.'),
  query('date').optional().isISO8601().withMessage('Enter a valid date.'),
  query('sort').optional().isIn(['asc', 'desc', 'recent', 'oldest']).withMessage('Select a valid sort order.'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be 1 or more.'),
  query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('Page size must be between 1 and 100.'),
];

// Mounted under /api/donors as /me/donations[...], consistent with /me/summary.
router.get('/me/donations', authMiddleware, allowRoles('donor'), listQuery, handleValidationErrors, listMyDonations);
router.get('/me/donations/:id', authMiddleware, allowRoles('donor'), idParam, handleValidationErrors, getMyDonation);

module.exports = router;
