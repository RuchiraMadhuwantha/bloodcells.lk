const express = require('express');
const { registerDonor, registerHospital, login, getCurrentUser } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const allowRoles = require('../middleware/roleMiddleware');
const {
  donorRegisterValidation,
  hospitalRegisterValidation,
  loginValidation,
  handleValidationErrors,
} = require('../validators/authValidators');

const router = express.Router();

router.post('/register/donor', donorRegisterValidation, handleValidationErrors, registerDonor);
router.post('/register/hospital', hospitalRegisterValidation, handleValidationErrors, registerHospital);
router.post('/login', loginValidation, handleValidationErrors, login);
router.get('/me', authMiddleware, allowRoles('donor', 'hospital', 'blood_bank'), getCurrentUser);

module.exports = router;
