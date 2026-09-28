const { StatusCodes } = require('http');

/**
 * Final error handler.
 * Only `err.message` set explicitly by our controllers/validators reaches the
 * client; unexpected errors (SQL, stack traces) are logged server-side and
 * replaced with a friendly message.
 */
// eslint-disable-next-line no-unused-vars
const errorMiddleware = (err, req, res, next) => {
  const statusCode = err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
  const isKnown = Boolean(err.statusCode);

  if (!isKnown) {
    console.error(`[error] ${req.method} ${req.originalUrl} ->`, err.message);
  }

  res.status(statusCode).json({
    success: false,
    message: isKnown ? err.message : 'Something went wrong on our side. Please try again.',
  });
};

module.exports = errorMiddleware;
