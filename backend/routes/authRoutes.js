const express = require('express');
const {
  registerDonor,
  registerHospital,
  login,
  getCurrentUser,
  updateProfile,
  forgotPassword,
  resetPassword,
} = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const allowRoles = require('../middleware/roleMiddleware');
const { handleValidationErrors } = require('../validators/common');
const {
  donorRegisterValidation,
  hospitalRegisterValidation,
  loginValidation,
  profileUpdateValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
} = require('../validators/authValidators');

const router = express.Router();

router.post('/register/donor', donorRegisterValidation, handleValidationErrors, registerDonor);
router.post('/register/hospital', hospitalRegisterValidation, handleValidationErrors, registerHospital);
router.post('/login', loginValidation, handleValidationErrors, login);
router.post('/forgot-password', forgotPasswordValidation, handleValidationErrors, forgotPassword);
router.post('/reset-password', resetPasswordValidation, handleValidationErrors, resetPassword);
router.get('/me', authMiddleware, allowRoles('donor', 'hospital', 'blood_bank'), getCurrentUser);
router.put('/me', authMiddleware, allowRoles('donor'), profileUpdateValidation, handleValidationErrors, updateProfile);

module.exports = router;
