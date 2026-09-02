/**
 * Global error handler — returns consistent JSON errors.
 * Catches both thrown errors and async rejections (express-async-errors).
 */
const { logger } = require('../services/logger');
const { env } = require('../env');

function errorHandler(err, req, res, _next) {
  logger.error(
    {
      method: req.method,
      path: req.originalUrl,
      status: err.status || err.statusCode || 500,
      requestId: req.id || req.headers['x-request-id'] || null,
      user: req.user?.id || null,
      err: {
        name: err.name,
        message: err.message,
        stack: env.NODE_ENV === 'development' ? err.stack : undefined,
        data: err.data,
      },
    },
    'unhandled error'
  );

  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(status).json({
    error: true,
    message,
    ...(env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

function createError(message, status = 400) {
  const err = new Error(message);
  err.status = status;
  return err;
}

module.exports = { errorHandler, createError };