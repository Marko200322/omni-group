import { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { config } from '../../config';

const toInt = (value: unknown, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

const clientKey = (req: Request): string => {
  return req.ip || req.socket.remoteAddress || 'unknown';
};

const authIdentityKey = (req: Request): string => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : 'no-email';
  return `${clientKey(req)}:${email}`;
};

const rateLimitHandler = (req: Request, res: Response): void => {
  const retryAfterHeader = res.getHeader('Retry-After');
  const retryAfterSeconds = typeof retryAfterHeader === 'string'
    ? Number(retryAfterHeader)
    : undefined;

  res.status(429).json({
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests',
      details: {
        route: req.originalUrl || req.path,
        retryAfterSeconds: Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : undefined,
      },
    },
  });
};

export const authLimiter = rateLimit({
  windowMs: toInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 10 * 60 * 1000),
  max: toInt(process.env.AUTH_RATE_LIMIT_MAX, 10),
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  keyGenerator: authIdentityKey,
});

export const passwordResetLimiter = rateLimit({
  windowMs: toInt(process.env.PASSWORD_RESET_WINDOW_MS, 60 * 60 * 1000),
  max: toInt(process.env.PASSWORD_RESET_MAX, 5),
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  keyGenerator: authIdentityKey,
});

export const paymentsLimiter = rateLimit({
  windowMs: toInt(process.env.PAYMENTS_RATE_LIMIT_WINDOW_MS, 10 * 60 * 1000),
  max: toInt(process.env.PAYMENTS_RATE_LIMIT_MAX, 30),
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  keyGenerator: clientKey,
});

export const webhookLimiter = rateLimit({
  windowMs: toInt(process.env.WEBHOOK_RATE_LIMIT_WINDOW_MS, 60 * 1000),
  max: toInt(process.env.WEBHOOK_RATE_LIMIT_MAX, 120),
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  keyGenerator: clientKey,
});

export const adminMutationLimiter = rateLimit({
  windowMs: toInt(process.env.ADMIN_MUTATION_RATE_LIMIT_WINDOW_MS, config.rateLimit.windowMs),
  max: toInt(process.env.ADMIN_MUTATION_RATE_LIMIT_MAX, 40),
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  keyGenerator: (req) => `${clientKey(req)}:${req.user?.userId || 'anonymous'}`,
});

export const authSessionLimiter = rateLimit({
  windowMs: toInt(process.env.AUTH_SESSION_RATE_LIMIT_WINDOW_MS, 60 * 1000),
  max: toInt(process.env.AUTH_SESSION_RATE_LIMIT_MAX, 60),
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  keyGenerator: (req) => `${clientKey(req)}:${req.user?.userId || 'anonymous'}`,
});
