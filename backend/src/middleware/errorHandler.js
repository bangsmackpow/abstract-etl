/**
 * Global error handler — returns consistent JSON errors.
 * Catches both thrown errors and async rejections (express-async-errors).
 */
function errorHandler(err, req, res, _next) {
  console.error(
    `[ERROR] ${req.method} ${req.path}:`,
    err.message,
    err.status,
    JSON.stringify(err.data || {})
  );
  if (process.env.NODE_ENV === 'development') console.error(err.stack);

  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(status).json({
    error: true,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

function createError(message, status = 400) {
  const err = new Error(message);
  err.status = status;
  return err;
}

module.exports = { errorHandler, createError };
