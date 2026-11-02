import jwt from 'jsonwebtoken';
import { config } from '../config';

/**
 * Per-user bucket for authenticated traffic (all BFF calls share the web container IP),
 * per-IP bucket otherwise. Only a verified token earns a user bucket, so random bearer
 * strings cannot mint fresh buckets to dodge the IP limit.
 */
export function rateLimitKey(authorization: string | undefined, ip: string | undefined): string {
  if (authorization?.startsWith('Bearer ')) {
    try {
      const payload = jwt.verify(authorization.slice(7), config.jwt.secret) as { userId?: unknown };
      if (typeof payload?.userId === 'string' && payload.userId) return `user:${payload.userId}`;
    } catch {
      // fall through to IP
    }
  }
  return ip || 'unknown';
}
