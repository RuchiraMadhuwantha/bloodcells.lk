const express = require('express');
const { param, body, query } = require('express-validator');
const {
  bookAppointment,
  listMyAppointments,
  cancelMyAppointment,
  slotsForDate,
  listForHospital,
  listForBank,
  setStatus,
} = require('../controllers/appointmentController');
const authMiddleware = require('../middleware/authMiddleware');
const allowRoles = require('../middleware/roleMiddleware');
const { handleValidationErrors } = require('../validators/common');
const { createAppointmentValidation } = require('../validators/domainValidators');

const router = express.Router();

const idParam = [param('id').isInt({ min: 1 }).withMessage('Invalid appointment reference.')];
const statusValidation = [
  body('status')
    .isIn(['approved', 'completed', 'cancelled'])
    .withMessage('Select a valid appointment status.'),
];

/* Donor */
router.post('/', authMiddleware, allowRoles('donor'), createAppointmentValidation, handleValidationErrors, bookAppointment);
router.get('/mine', authMiddleware, allowRoles('donor'), listMyAppointments);
router.put('/:id/cancel', authMiddleware, allowRoles('donor'), idParam, handleValidationErrors, cancelMyAppointment);

/* Availability for a centre on a given day. */
router.get(
  '/slots/:hospitalId',
  authMiddleware,
  allowRoles('donor', 'hospital', 'blood_bank'),
  [param('hospitalId').isInt({ min: 1 }).withMessage('Invalid hospital reference.'), query('date').isISO8601()],
  handleValidationErrors,
  slotsForDate
);

/* Hospital */
router.get('/hospital', authMiddleware, allowRoles('hospital'), listForHospital);

/* Blood bank */
router.get('/', authMiddleware, allowRoles('blood_bank'), listForBank);
router.put('/:id/status', authMiddleware, allowRoles('blood_bank'), idParam, statusValidation, handleValidationErrors, setStatus);

module.exports = router;
