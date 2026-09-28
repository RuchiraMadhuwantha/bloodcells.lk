const { body } = require('express-validator');
const { BLOOD_GROUPS } = require('./common');

const donorRegisterValidation = [
  body('full_name').trim().notEmpty().withMessage('Full name is required.'),
  body('email').isEmail().withMessage('Please enter a valid email address.'),
  body('username').trim().notEmpty().withMessage('Username is required.'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long.'),
  body('nic').trim().notEmpty().withMessage('NIC is required.'),
  body('blood_group').isIn(BLOOD_GROUPS).withMessage('Invalid blood group.'),
  body('phone').optional({ values: 'falsy' }).trim().isLength({ min: 7, max: 20 }).withMessage('Please enter a valid phone number.'),
  body('weight').optional({ values: 'falsy' }).isFloat({ min: 30, max: 300 }).withMessage('Please enter a valid weight in kg.'),
];

const hospitalRegisterValidation = [
  body('username').trim().notEmpty().withMessage('Username is required.'),
  body('email').isEmail().withMessage('Please enter a valid email address.'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long.'),
  body('hospital_name').trim().notEmpty().withMessage('Hospital name is required.'),
  body('hospital_code').trim().notEmpty().withMessage('Hospital code is required.'),
  body('hospital_type').optional({ values: 'falsy' }).trim().isLength({ max: 100 }).withMessage('Hospital type is too long.'),
  body('district').optional({ values: 'falsy' }).trim().isLength({ max: 100 }).withMessage('District is too long.'),
  body('official_phone').optional({ values: 'falsy' }).trim().isLength({ min: 7, max: 20 }).withMessage('Please enter a valid official phone number.'),
  body('contact_person_email')
    .optional({ values: 'falsy' })
    .isEmail()
    .withMessage('Please enter a valid contact person email address.'),
];

const loginValidation = [
  body('username').trim().notEmpty().withMessage('Username is required.'),
  body('password').trim().notEmpty().withMessage('Password is required.'),
];

const profileUpdateValidation = [
  body('email').optional().isEmail().withMessage('Please enter a valid email address.'),
  body('blood_group').optional().isIn(BLOOD_GROUPS).withMessage('Invalid blood group.'),
  body('weight').optional({ values: 'falsy' }).isFloat({ min: 30, max: 300 }).withMessage('Please enter a valid weight.'),
  body('phone').optional().trim().isLength({ max: 20 }).withMessage('Please enter a valid phone number.'),
  body('full_name').optional().trim().notEmpty().withMessage('Full name cannot be empty.'),
];

const forgotPasswordValidation = [
  body('email').trim().isEmail().withMessage('Please enter a valid email address.'),
];

const resetPasswordValidation = [
  body('token').trim().notEmpty().withMessage('Reset token is required.'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long.'),
];

module.exports = {
  donorRegisterValidation,
  hospitalRegisterValidation,
  loginValidation,
  profileUpdateValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
};
