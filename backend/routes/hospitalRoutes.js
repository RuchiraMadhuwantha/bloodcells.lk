const express = require('express');
const {
  listHospitals,
  getPendingHospitalCount,
  approve,
  reject,
  reviewAgain,
} = require('../controllers/hospitalController');
const authMiddleware = require('../middleware/authMiddleware');
const allowRoles = require('../middleware/roleMiddleware');

const router = express.Router();

router.get('/', authMiddleware, allowRoles('blood_bank'), listHospitals);
router.get('/pending-count', authMiddleware, allowRoles('blood_bank'), getPendingHospitalCount);
router.put('/:userId/approve', authMiddleware, allowRoles('blood_bank'), approve);
router.put('/:userId/reject', authMiddleware, allowRoles('blood_bank'), reject);
router.put('/:userId/review-again', authMiddleware, allowRoles('blood_bank'), reviewAgain);

module.exports = router;
