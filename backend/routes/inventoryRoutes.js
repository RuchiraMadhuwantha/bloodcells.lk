const express = require('express');
const {
  listInventory,
  getStats,
  adjustStock,
  setThresholds,
  getItem,
} = require('../controllers/inventoryController');
const authMiddleware = require('../middleware/authMiddleware');
const allowRoles = require('../middleware/roleMiddleware');
const { handleValidationErrors } = require('../validators/common');
const { adjustInventoryValidation, thresholdValidation } = require('../validators/domainValidators');
const { param } = require('express-validator');
const { BLOOD_GROUPS } = require('../validators/common');

const router = express.Router();

const bloodGroupParam = [
  param('bloodGroup').isIn(BLOOD_GROUPS).withMessage('Invalid blood group.'),
];

// Hospitals may read stock levels; only the blood bank may change them.
router.get('/', authMiddleware, allowRoles('blood_bank', 'hospital'), listInventory);
router.get('/stats', authMiddleware, allowRoles('blood_bank', 'hospital'), getStats);
router.get('/:bloodGroup', authMiddleware, allowRoles('blood_bank', 'hospital'), bloodGroupParam, handleValidationErrors, getItem);

router.post('/adjust', authMiddleware, allowRoles('blood_bank'), adjustInventoryValidation, handleValidationErrors, adjustStock);
router.put('/thresholds', authMiddleware, allowRoles('blood_bank'), thresholdValidation, handleValidationErrors, setThresholds);

module.exports = router;
