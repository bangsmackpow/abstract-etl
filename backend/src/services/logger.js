const pino = require('pino');

const isProd = process.env.NODE_ENV === 'production';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: { service: 'backend' },
  timestamp: pino.stdTimeFunctions.isoTime,
  ...(isProd ? {} : { transport: { target: 'pino-pretty', options: { colorize: true } } }),
});

function requestIdFromHeaders(headers) {
  return headers['x-request-id'] || headers['x-amzn-trace-id'] || null;
}

module.exports = { logger, requestIdFromHeaders };
