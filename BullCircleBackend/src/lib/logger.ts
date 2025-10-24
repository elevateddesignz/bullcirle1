import pino from 'pino';
import pinoHttp from 'pino-http';

const redactionPaths = [
  'req.headers.authorization',
  'req.headers.Authorization',
  'req.headers.access_token',
  'req.headers.refresh_token',
  'req.body.access_token',
  'req.body.refresh_token',
  'req.body.password',
  'res.headers.authorization'
];

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: {
    paths: redactionPaths,
    censor: '[REDACTED]'
  }
});

export const httpLogger = pinoHttp({
  logger,
  redact: redactionPaths,
  autoLogging: {
    ignore: req => req.url === '/health'
  }
});
