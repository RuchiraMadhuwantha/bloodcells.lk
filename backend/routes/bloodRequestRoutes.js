const express = require('express');
const {
  createRequest,
  listMyRequests,
  cancelMyRequest,
  listAllRequests,
  getRequest,
  changeStatus,
  listMatching,
} = require('../controllers/bloodRequestController');
const authMiddleware = require('../middleware/authMiddleware');
const allowRoles = require('../middleware/roleMiddleware');
const { handleValidationErrors } = require('../validators/common');
const {
  createBloodRequestValidation,
  requestIdParam,
  statusUpdateValidation,
} = require('../validators/domainValidators');

const router = express.Router();

/* Hospital: manage its own requests. */
router.post('/', authMiddleware, allowRoles('hospital'), createBloodRequestValidation, handleValidationErrors, createRequest);
router.get('/mine', authMiddleware, allowRoles('hospital'), listMyRequests);
router.put('/:id/cancel', authMiddleware, allowRoles('hospital'), requestIdParam, handleValidationErrors, cancelMyRequest);

/* Donor: open requests matching their own blood group (declared before /:id). */
router.get('/matching', authMiddleware, allowRoles('donor'), listMatching);

/* Blood bank: process every incoming request. */
router.get('/', authMiddleware, allowRoles('blood_bank'), listAllRequests);
router.get('/:id', authMiddleware, allowRoles('blood_bank'), requestIdParam, handleValidationErrors, getRequest);
router.put(
  '/:id/status',
  authMiddleware,
  allowRoles('blood_bank'),
  requestIdParam,
  statusUpdateValidation,
  handleValidationErrors,
  changeStatus
);

module.exports = router;
