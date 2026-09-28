const express = require('express');
const {
  listHospitals,
  listActiveHospitals,
  getPendingHospitalCount,
  hospitalStats,
  myHospital,
  approve,
  reject,
  reviewAgain,
} = require('../controllers/hospitalController');
const authMiddleware = require('../middleware/authMiddleware');
const allowRoles = require('../middleware/roleMiddleware');

const router = express.Router();

/* Public-safe read paths (any signed-in role). */
router.get('/active', authMiddleware, listActiveHospitals);
router.get('/mine', authMiddleware, allowRoles('hospital'), myHospital);

/* Blood bank only. */
router.get('/', authMiddleware, allowRoles('blood_bank'), listHospitals);
router.get('/stats', authMiddleware, allowRoles('blood_bank'), hospitalStats);
router.get('/pending-count', authMiddleware, allowRoles('blood_bank'), getPendingHospitalCount);
router.put('/:userId/approve', authMiddleware, allowRoles('blood_bank'), approve);
router.put('/:userId/reject', authMiddleware, allowRoles('blood_bank'), reject);
router.put('/:userId/review-again', authMiddleware, allowRoles('blood_bank'), reviewAgain);

module.exports = router;
