const { body, validationResult } = require('express-validator');

const donorRegisterValidation = [
  body('full_name').trim().notEmpty().withMessage('Full name is required.'),
  body('email').isEmail().withMessage('Please enter a valid email address.'),
  body('username').trim().notEmpty().withMessage('Username is required.'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long.'),
  body('nic').trim().notEmpty().withMessage('NIC is required.'),
  body('blood_group').isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).withMessage('Invalid blood group.'),
];

const hospitalRegisterValidation = [
  body('username').trim().notEmpty().withMessage('Username is required.'),
  body('email').isEmail().withMessage('Please enter a valid email address.'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long.'),
  body('hospital_name').trim().notEmpty().withMessage('Hospital name is required.'),
  body('hospital_code').trim().notEmpty().withMessage('Hospital code is required.'),
];

const loginValidation = [
  body('username').trim().notEmpty().withMessage('Username is required.'),
  body('password').trim().notEmpty().withMessage('Password is required.'),
];

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(error => ({ field: error.path, message: error.msg })),
    });
  }
  next();
};

module.exports = {
  donorRegisterValidation,
  hospitalRegisterValidation,
  loginValidation,
  handleValidationErrors,
};
