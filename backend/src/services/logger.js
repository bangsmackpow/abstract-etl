const pino = require('pino');
const { env } = require('../env');

const isProd = env.NODE_ENV === 'production';

const logger = pino({
  level: env.LOG_LEVEL || 'info',
  base: { service: 'backend' },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => ({ level: label }),
  },
  ...(isProd ? {} : { transport: { target: 'pino-pretty', options: { colorize: true } } }),
});

function requestIdFromHeaders(headers) {
  return headers['x-request-id'] || headers['x-amzn-trace-id'] || null;
}

module.exports = { logger, requestIdFromHeaders };