const express = require('express');
const { param, body, query } = require('express-validator');
const {
  bookAppointment,
  listMyAppointments,
  getMyAppointment,
  rescheduleMyAppointment,
  cancelMyAppointment,
  slotsForDate,
  listForHospital,
  listForBank,
  setStatus,
} = require('../controllers/appointmentController');
const authMiddleware = require('../middleware/authMiddleware');
const allowRoles = require('../middleware/roleMiddleware');
const { handleValidationErrors } = require('../validators/common');
const { createAppointmentValidation, rescheduleAppointmentValidation } = require('../validators/domainValidators');

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
router.put('/:id/reschedule', authMiddleware, allowRoles('donor'), idParam, rescheduleAppointmentValidation, handleValidationErrors, rescheduleMyAppointment);
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
router.put('/:id/campaign',authMiddleware,allowRoles('hospital'),idParam,[body('campaignId').exists({values:'undefined'}).custom(v=>v===null||Number.isInteger(v)&&v>0),body('note').isString().trim().isLength({min:1,max:500})],handleValidationErrors,require('../controllers/appointmentController').linkCampaign);
router.get('/hospital', authMiddleware, allowRoles('hospital'), listForHospital);
router.put('/:id/approve', authMiddleware, allowRoles('hospital'), idParam, handleValidationErrors, (req, res, next) => {
  req.body = { status: 'approved' };
  return setStatus(req, res, next);
});
router.put('/:id/hospital-reschedule',authMiddleware,allowRoles('hospital'),idParam,rescheduleAppointmentValidation,handleValidationErrors,rescheduleMyAppointment);
router.put('/:id/hospital-cancel',authMiddleware,allowRoles('hospital'),idParam,handleValidationErrors,(req,res,next)=>{req.body={status:'cancelled'};return setStatus(req,res,next);});
router.put('/:id/collection', authMiddleware, allowRoles('hospital'), idParam,
  [body('component').isString().trim().isLength({min:1,max:100}).withMessage('Enter the recorded blood component.'),
    body('campaignId').optional({nullable:true}).isInt({min:1}).toInt(),
    body('expiryDate').isDate({format:'YYYY-MM-DD',strictMode:true}).withMessage('Enter the actual packet expiry date.'),
    body('collectedUnits').isInt({ min: 1, max: 1000 }).toInt().withMessage('Enter a positive whole number of collected units.'),
    body('collectedVolumeMl').isInt({ min: 1, max: 100000 }).toInt().withMessage('Enter the actual collected volume in millilitres.')],
  handleValidationErrors, (req, res, next) => {
    req.body.status = 'completed';
    return setStatus(req, res, next);
  });

/* Blood bank */
router.get('/', authMiddleware, allowRoles('blood_bank'),[query('date').optional().isDate({format:'YYYY-MM-DD',strictMode:true}),query('hospitalId').optional().isInt({min:1}),query('status').optional().isIn(['pending','approved','completed','cancelled']),query('search').optional().isString().isLength({max:100})],handleValidationErrors,listForBank);
router.put('/:id/status', authMiddleware, allowRoles('blood_bank'), idParam, statusValidation, handleValidationErrors, setStatus);

/* Donor: single appointment, after the fixed two-segment routes. */
router.get('/:id', authMiddleware, allowRoles('donor'), idParam, handleValidationErrors, getMyAppointment);

module.exports = router;
