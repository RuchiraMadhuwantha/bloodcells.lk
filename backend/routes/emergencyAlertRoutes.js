const express = require('express');
const { param, query } = require('express-validator');
const {
  listAlerts,
  getAlert,
  respondToAlert,
  publish,
  close,
} = require('../controllers/emergencyAlertController');
const authMiddleware = require('../middleware/authMiddleware');
const allowRoles = require('../middleware/roleMiddleware');
const { handleValidationErrors } = require('../validators/common');
const { BLOOD_GROUPS } = require('../validators/common');
const {
  emergencyAlertPublishValidation,
  emergencyAlertRespondValidation,
} = require('../validators/domainValidators');

const router = express.Router();

const idParam = [param('id').isInt({ min: 1 }).withMessage('Invalid alert reference.')];
const listQuery = [
  query('bloodGroup').optional().isIn(BLOOD_GROUPS).withMessage('Select a valid blood group.'),
  query('district').optional().trim().isLength({ max: 100 }).withMessage('Invalid district filter.'),
  query('mine').optional().isBoolean().withMessage('mine must be true or false.'),
];

/* Donors and blood bank staff can list; donors see active donor-safe projections. */
router.get('/', authMiddleware, allowRoles('donor', 'blood_bank'), listQuery, handleValidationErrors, listAlerts);
router.get('/:id', authMiddleware, allowRoles('donor', 'blood_bank'), idParam, handleValidationErrors, getAlert);

/* Donor: express interest (never a medical eligibility decision). */
router.post('/:id/respond', authMiddleware, allowRoles('donor'), idParam, emergencyAlertRespondValidation, handleValidationErrors, respondToAlert);

/* Blood bank: publish / close alerts (explicit act, never automatic). */
router.post('/', authMiddleware, allowRoles('blood_bank'), emergencyAlertPublishValidation, handleValidationErrors, publish);
router.put('/:id/close', authMiddleware, allowRoles('blood_bank'), idParam, handleValidationErrors, close);

module.exports = router;
