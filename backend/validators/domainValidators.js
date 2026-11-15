const { body, param, query } = require('express-validator');
const { BLOOD_GROUPS } = require('./common');

const createBloodRequestValidation = [
  body('blood_group').isIn(BLOOD_GROUPS).withMessage('Select a valid blood group.'),
  body('quantity').isInt({ min: 1, max: 500 }).withMessage('Quantity must be a whole number between 1 and 500 units.'),
  body('urgency').optional().isIn(['normal', 'urgent', 'emergency']).withMessage('Select a valid urgency level.'),
  body('required_date').optional({ values: 'falsy' }).isDate({ format:'YYYY-MM-DD', strictMode:true }).custom(value => value >= require('../utils/date').toDateString(new Date())).withMessage('Required date must be today or a valid future date.'),
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

const rescheduleAppointmentValidation = [
  body('appointment_date').isISO8601().withMessage('Select a valid appointment date.'),
  body('time_slot')
    .matches(/^([01]\d|2[0-3]):[0-5]\d$/)
    .withMessage('Select a valid time slot.'),
];

const CAMPAIGN_STATUSES = ['Draft', 'Upcoming', 'Active', 'Completed', 'Cancelled'];
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/* Campaigns reuse the existing frontend campaign data model: camelCase keys. */
const campaignWriteValidation = [
  body('name').trim().notEmpty().withMessage('Campaign name is required.').isLength({ max: 150 }).withMessage('Campaign name is too long.'),
  body('title').optional({ values: 'falsy' }).trim().isLength({ max: 150 }).withMessage('Title is too long.'),
  body('shortDescription').optional({ values: 'falsy' }).trim().isLength({ max: 500 }).withMessage('Short description is too long.'),
  body('detailedDescription').optional({ values: 'falsy' }).trim().isLength({ max: 10000 }).withMessage('Detailed description is too long.'),
  body('imageUrl').optional({ values: 'falsy' }).trim().isLength({ max: 500 }).withMessage('Image URL is too long.'),
  body('status').optional().isIn(CAMPAIGN_STATUSES).withMessage('Select a valid campaign status.'),
  body('date').isDate({format:'YYYY-MM-DD',strictMode:true}).withMessage('Select a valid campaign date.'),
  body('startTime').matches(TIME_PATTERN).withMessage('Select a valid start time.'),
  body('endTime').matches(TIME_PATTERN).withMessage('Select a valid end time.'),
  body('venueName').optional({ values: 'falsy' }).trim().isLength({ max: 150 }).withMessage('Venue name is too long.'),
  body('address').optional({ values: 'falsy' }).trim().isLength({ max: 255 }).withMessage('Address is too long.'),
  body('district').optional({ values: 'falsy' }).trim().isLength({ max: 100 }).withMessage('District is too long.'),
  body('city').optional({ values: 'falsy' }).trim().isLength({ max: 100 }).withMessage('City is too long.'),
  body('locationNotes').optional({ values: 'falsy' }).trim().isLength({ max: 500 }).withMessage('Location notes are too long.'),
  body('organizerName').trim().notEmpty().withMessage('Organizer name is required.').isLength({ max: 150 }).withMessage('Organizer name is too long.'),
  body('contactPerson').optional({ values: 'falsy' }).trim().isLength({ max: 100 }).withMessage('Contact person is too long.'),
  body('contactNumber').optional({ values: 'falsy' }).trim().isLength({ max: 30 }).withMessage('Contact number is too long.'),
  body('contactEmail').optional({ values: 'falsy' }).isEmail().withMessage('Enter a valid contact email.'),
  body('whoCanParticipate').optional({ values: 'falsy' }).trim().isLength({ max: 500 }).withMessage('Participation information is too long.'),
  body('eligibilityInfo').optional({ values: 'falsy' }).trim().isLength({ max: 500 }).withMessage('Eligibility information is too long.'),
  body('whatToBring').optional({ values: 'falsy' }).trim().isLength({ max: 500 }).withMessage('What-to-bring information is too long.'),
  body('preparationInstructions').optional({ values: 'falsy' }).trim().isLength({ max: 500 }).withMessage('Preparation instructions are too long.'),
  body('specialInstructions').optional({ values: 'falsy' }).trim().isLength({ max: 500 }).withMessage('Special instructions are too long.'),
  body('availableFacilities').optional({ values: 'falsy' }).trim().isLength({ max: 500 }).withMessage('Facilities information is too long.'),
  body('emergencyContact').optional({ values: 'falsy' }).trim().isLength({ max: 100 }).withMessage('Emergency contact is too long.'),
  body('targetDonors').optional({ values: 'falsy' }).isInt({ min: 0, max: 1000000 }).withMessage('Target donors must be a whole number.'),
  body('goal').optional({ values: 'falsy' }).trim().isLength({ max: 500 }).withMessage('Goal is too long.'),
  body('neededBloodGroups').optional().isArray({ max: 8 }).withMessage('Select valid blood groups.'),
  body('neededBloodGroups.*').optional().isIn(BLOOD_GROUPS).withMessage('Select valid blood groups.'),
];

const campaignUpdateValidation = [
  body('name').optional().trim().notEmpty().withMessage('Campaign name cannot be empty.').isLength({ max: 150 }).withMessage('Campaign name is too long.'),
  body('title').optional({ values: 'falsy' }).trim().isLength({ max: 150 }).withMessage('Title is too long.'),
  body('shortDescription').optional({ values: 'falsy' }).trim().isLength({ max: 500 }).withMessage('Short description is too long.'),
  body('detailedDescription').optional({ values: 'falsy' }).trim().isLength({ max: 10000 }).withMessage('Detailed description is too long.'),
  body('imageUrl').optional({ values: 'falsy' }).trim().isLength({ max: 500 }).withMessage('Image URL is too long.'),
  body('status').optional().isIn(CAMPAIGN_STATUSES).withMessage('Select a valid campaign status.'),
  body('date').optional().isDate({format:'YYYY-MM-DD',strictMode:true}).withMessage('Select a valid campaign date.'),
  body('startTime').optional().matches(TIME_PATTERN).withMessage('Select a valid start time.'),
  body('endTime').optional().matches(TIME_PATTERN).withMessage('Select a valid end time.'),
  body('venueName').optional({ values: 'falsy' }).trim().isLength({ max: 150 }).withMessage('Venue name is too long.'),
  body('address').optional({ values: 'falsy' }).trim().isLength({ max: 255 }).withMessage('Address is too long.'),
  body('district').optional({ values: 'falsy' }).trim().isLength({ max: 100 }).withMessage('District is too long.'),
  body('city').optional({ values: 'falsy' }).trim().isLength({ max: 100 }).withMessage('City is too long.'),
  body('locationNotes').optional({ values: 'falsy' }).trim().isLength({ max: 500 }).withMessage('Location notes are too long.'),
  body('organizerName').optional().trim().notEmpty().withMessage('Organizer name cannot be empty.').isLength({ max: 150 }).withMessage('Organizer name is too long.'),
  body('contactPerson').optional({ values: 'falsy' }).trim().isLength({ max: 100 }).withMessage('Contact person is too long.'),
  body('contactNumber').optional({ values: 'falsy' }).trim().isLength({ max: 30 }).withMessage('Contact number is too long.'),
  body('contactEmail').optional({ values: 'falsy' }).isEmail().withMessage('Enter a valid contact email.'),
  body('whoCanParticipate').optional({ values: 'falsy' }).trim().isLength({ max: 500 }).withMessage('Participation information is too long.'),
  body('eligibilityInfo').optional({ values: 'falsy' }).trim().isLength({ max: 500 }).withMessage('Eligibility information is too long.'),
  body('whatToBring').optional({ values: 'falsy' }).trim().isLength({ max: 500 }).withMessage('What-to-bring information is too long.'),
  body('preparationInstructions').optional({ values: 'falsy' }).trim().isLength({ max: 500 }).withMessage('Preparation instructions are too long.'),
  body('specialInstructions').optional({ values: 'falsy' }).trim().isLength({ max: 500 }).withMessage('Special instructions are too long.'),
  body('availableFacilities').optional({ values: 'falsy' }).trim().isLength({ max: 500 }).withMessage('Facilities information is too long.'),
  body('emergencyContact').optional({ values: 'falsy' }).trim().isLength({ max: 100 }).withMessage('Emergency contact is too long.'),
  body('targetDonors').optional({ values: 'falsy' }).isInt({ min: 0, max: 1000000 }).withMessage('Target donors must be a whole number.'),
  body('goal').optional({ values: 'falsy' }).trim().isLength({ max: 500 }).withMessage('Goal is too long.'),
  body('neededBloodGroups').optional().isArray({ max: 8 }).withMessage('Select valid blood groups.'),
  body('neededBloodGroups.*').optional().isIn(BLOOD_GROUPS).withMessage('Select valid blood groups.'),
];

const campaignRegistrationValidation = [
  body('note').optional({ values: 'falsy' }).trim().isLength({ max: 255 }).withMessage('Note is too long.'),
];

const emergencyAlertPublishValidation = [
  body('blood_request_id').optional({ values: 'falsy' }).isInt({ min: 1 }).withMessage('Invalid blood request reference.'),
  body('blood_group').optional().isIn(BLOOD_GROUPS).withMessage('Select a valid blood group.'),
  body('urgency').optional().isIn(['normal', 'urgent', 'emergency']).withMessage('Select a valid urgency level.'),
  body('district').optional({ values: 'falsy' }).trim().isLength({ max: 100 }).withMessage('District is too long.'),
  body('required_date').optional({ values: 'falsy' }).isISO8601().withMessage('Enter a valid required date.'),
  body('quantity').optional({ values: 'falsy' }).isInt({ min: 1, max: 500 }).withMessage('Quantity must be a whole number between 1 and 500.'),
  body('title').optional().trim().notEmpty().withMessage('Title cannot be empty.').isLength({ max: 150 }).withMessage('Title is too long.'),
  body('description').optional({ values: 'falsy' }).trim().isLength({ max: 1000 }).withMessage('Description is too long.'),
  body('response_instructions').optional({ values: 'falsy' }).trim().isLength({ max: 500 }).withMessage('Response instructions are too long.'),
];

const emergencyAlertRespondValidation = [
  body('note').optional({ values: 'falsy' }).trim().isLength({ max: 255 }).withMessage('Note is too long.'),
];

const notificationListValidation = [
  query('type').optional().isIn([
    'appointment_confirmation',
    'appointment_reminder',
    'appointment_approved',
    'appointment_rejected',
    'appointment_rescheduled',
    'appointment_cancelled',
    'appointment_completed',
    'campaign',
    'emergency',
    'general',
  ]).withMessage('Select a valid notification type.'),
  query('unread').optional().isBoolean().withMessage('unread must be true or false.'),
  query('limit').optional().isInt({ min: 1, max: 200 }).withMessage('Limit must be between 1 and 200.'),
  query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be 0 or more.'),
];

module.exports = {
  createBloodRequestValidation,
  requestIdParam,
  statusUpdateValidation,
  adjustInventoryValidation,
  thresholdValidation,
  createAppointmentValidation,
  rescheduleAppointmentValidation,
  campaignWriteValidation,
  campaignUpdateValidation,
  campaignRegistrationValidation,
  emergencyAlertPublishValidation,
  emergencyAlertRespondValidation,
  notificationListValidation,
};
