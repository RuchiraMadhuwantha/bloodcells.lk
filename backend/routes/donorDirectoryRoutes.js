const express = require('express');
const {
  list,
  listValidation,
  details,
  idValidation,
  mySummary,
} = require('../controllers/donorDirectoryController');
const authMiddleware = require('../middleware/authMiddleware');
const allowRoles = require('../middleware/roleMiddleware');
const { handleValidationErrors } = require('../validators/common');

const router = express.Router();

// Declared before `/:id` so `me` is never parsed as a donor reference.
router.get('/me/summary', authMiddleware, allowRoles('donor'), mySummary);

router.get('/', authMiddleware, allowRoles('blood_bank'), listValidation, handleValidationErrors, list);
router.get('/:id', authMiddleware, allowRoles('blood_bank'), idValidation, handleValidationErrors, details);

module.exports = router;
