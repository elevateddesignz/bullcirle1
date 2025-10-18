import rateLimit, { type Options } from 'express-rate-limit';

export function createPerUserRateLimiter(options?: Partial<Options>) {
  return rateLimit({
    windowMs: 60 * 1000,
    limit: 30,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: req => (req.auth?.userId ? `user:${req.auth.userId}` : `ip:${req.ip}`),
    ...options,
  });
}
