const express = require('express');
const { stats } = require('../controllers/statsController');
const authMiddleware = require('../middleware/authMiddleware');
const allowRoles = require('../middleware/roleMiddleware');

const router = express.Router();

router.get('/blood-bank', authMiddleware, allowRoles('blood_bank', 'admin'), stats);

module.exports = router;
