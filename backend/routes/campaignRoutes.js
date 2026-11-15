const express = require('express');
const { param, query, body } = require('express-validator');
const {
  listPublished,
  getCampaign,
  registerMe,
  listMyRegistrations,
  cancelMyRegistration,
  createManagedCampaign,
  updateManagedCampaign,
} = require('../controllers/campaignController');
const authMiddleware = require('../middleware/authMiddleware');
const allowRoles = require('../middleware/roleMiddleware');
const { handleValidationErrors } = require('../validators/common');
const {
  campaignWriteValidation,
  campaignUpdateValidation,
  campaignRegistrationValidation,
} = require('../validators/domainValidators');

const router = express.Router();

const idParam = [param('id').isInt({ min: 1 }).withMessage('Invalid campaign reference.')];
const listQuery = [
  query('status').optional().isIn(['Draft','Upcoming','Active','Completed','Cancelled']),
  query('district').optional().trim().isLength({ max: 100 }).withMessage('Invalid district filter.'),
  query('date').optional().isISO8601().withMessage('Enter a valid date filter.'),
  query('period').optional().isIn(['upcoming', 'past', 'all']).withMessage('Select a valid period.'),
];

/* Donor: my registrations — declared before /:id so `registrations` never parses as an id. */
router.get('/registrations/mine', authMiddleware, allowRoles('donor'), listMyRegistrations);

/* Donor + blood bank: browse. Donors only see published campaigns. */
router.get('/', authMiddleware, allowRoles('donor', 'blood_bank'), listQuery, handleValidationErrors, listPublished);
router.get('/:id', authMiddleware, allowRoles('donor', 'blood_bank'), idParam, handleValidationErrors, getCampaign);

/* Donor: register / cancel own registration. */
router.post(
  '/:id/registrations',
  authMiddleware,
  allowRoles('donor'),
  idParam,
  campaignRegistrationValidation,
  handleValidationErrors,
  registerMe
);
router.delete(
  '/:id/registrations',
  authMiddleware,
  allowRoles('donor'),
  idParam,
  handleValidationErrors,
  cancelMyRegistration
);

/* Blood bank: manage campaigns (create / update / publish via status). */
router.post('/', authMiddleware, allowRoles('blood_bank'), campaignWriteValidation, handleValidationErrors, createManagedCampaign);
router.put('/:id', authMiddleware, allowRoles('blood_bank'), idParam, campaignUpdateValidation, handleValidationErrors, updateManagedCampaign);

module.exports = router;
