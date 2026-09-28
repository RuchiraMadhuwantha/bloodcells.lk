const { validationResult } = require('express-validator');

/**
 * Shared helpers for the express-validator rule arrays used across routes.
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Please correct the highlighted fields and try again.',
      errors: errors.array().map((error) => ({ field: error.path, message: error.msg })),
    });
  }
  return next();
};

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

/** Turns a raw MySQL error into a friendly message (never leaks SQL). */
const toFriendlyError = (error, fallback = 'Something went wrong. Please try again.') => {
  if (error.statusCode) return error;

  switch (error.code) {
    case 'ER_DUP_ENTRY':
      return Object.assign(new Error('A record with these details already exists.'), { statusCode: 409 });
    case 'ER_NO_REFERENCED_ROW':
    case 'ER_NO_REFERENCED_ROW_2':
      return Object.assign(new Error('The related record could not be found.'), { statusCode: 400 });
    case 'ER_ROW_IS_REFERENCED':
    case 'ER_ROW_IS_REFERENCED_2':
      return Object.assign(new Error('This record is still referenced by other data and cannot be removed.'), { statusCode: 409 });
    case 'ECONNREFUSED':
    case 'PROTOCOL_CONNECTION_LOST':
    case 'ER_ACCESS_DENIED_ERROR':
      return Object.assign(new Error('The database is currently unavailable. Please try again shortly.'), { statusCode: 503 });
    default:
      if (error.fatal === false && error.sqlMessage) {
        console.error('DB error:', error.sqlMessage);
        return Object.assign(new Error(fallback), { statusCode: 500 });
      }
      return error;
  }
};

module.exports = {
  handleValidationErrors,
  toFriendlyError,
  BLOOD_GROUPS,
};
