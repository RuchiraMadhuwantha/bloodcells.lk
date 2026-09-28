const { body, param } = require('express-validator');
const { BLOOD_GROUPS } = require('./common');

const createBloodRequestValidation = [
  body('blood_group').isIn(BLOOD_GROUPS).withMessage('Select a valid blood group.'),
  body('quantity').isInt({ min: 1, max: 500 }).withMessage('Quantity must be a whole number between 1 and 500 units.'),
  body('urgency').optional().isIn(['normal', 'urgent', 'emergency']).withMessage('Select a valid urgency level.'),
  body('required_date').optional({ values: 'falsy' }).isISO8601().withMessage('Enter a valid required date.'),
  body('department').optional({ values: 'falsy' }).trim().isLength({ max: 100 }).withMessage('Department is too long.'),
  body('reason').optional({ values: 'falsy' }).trim().isLength({ max: 2000 }).withMessage('Reason is too long.'),
];

const requestIdParam = [param('id').isInt({ min: 1 }).withMessage('Invalid request reference.')];

const statusUpdateValidation = [
  body('status')
    .isIn(['approved', 'rejected', 'fulfilled', 'cancelled'])
    .withMessage('Select a valid request status.'),
  body('note').optional({ values: 'falsy' }).trim().isLength({ max: 500 }).withMessage('Note is too long.'),
];

const adjustInventoryValidation = [
  body('bloodGroup').isIn(BLOOD_GROUPS).withMessage('Select a valid blood group.'),
  body('mode').optional().isIn(['add', 'set', 'remove']).withMessage('Invalid stock adjustment mode.'),
  body('amount').isInt({ min: 0, max: 100000 }).withMessage('Enter a whole number of units (0 or more).'),
];

const thresholdValidation = [
  body('lowStockThreshold').optional().isInt({ min: 0, max: 100000 }).withMessage('Low stock threshold must be a whole number.'),
  body('criticalStockThreshold').optional().isInt({ min: 0, max: 100000 }).withMessage('Critical stock threshold must be a whole number.'),
];

const createAppointmentValidation = [
  body('hospital_id').isInt({ min: 1 }).withMessage('Select a donation centre.'),
  body('appointment_date').isISO8601().withMessage('Select a valid appointment date.'),
  body('time_slot')
    .matches(/^([01]\d|2[0-3]):[0-5]\d$/)
    .withMessage('Select a valid time slot.'),
  body('notes').optional({ values: 'falsy' }).trim().isLength({ max: 500 }).withMessage('Notes are too long.'),
];

module.exports = {
  createBloodRequestValidation,
  requestIdParam,
  statusUpdateValidation,
  adjustInventoryValidation,
  thresholdValidation,
  createAppointmentValidation,
};
