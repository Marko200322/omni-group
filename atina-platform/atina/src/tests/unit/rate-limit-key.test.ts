import jwt from 'jsonwebtoken';
import { config } from '../../config';
import { rateLimitKey } from '../../utils/rate-limit-key';

const sign = (userId: string, secret = config.jwt.secret) =>
  jwt.sign({ userId, email: `${userId}@x.test`, role: 'client' }, secret);

describe('rateLimitKey', () => {
  it('gives each authenticated user their own bucket', () => {
    const a = rateLimitKey(`Bearer ${sign('user-a')}`, '10.0.0.5');
    const b = rateLimitKey(`Bearer ${sign('user-b')}`, '10.0.0.5');
    expect(a).toBe('user:user-a');
    expect(b).toBe('user:user-b');
  });

  it('falls back to the IP for forged or malformed tokens', () => {
    expect(rateLimitKey(`Bearer ${sign('user-a', 'not-the-secret')}`, '1.2.3.4')).toBe('1.2.3.4');
    expect(rateLimitKey('Bearer random-string-that-is-long-enough', '1.2.3.4')).toBe('1.2.3.4');
    expect(rateLimitKey(undefined, '1.2.3.4')).toBe('1.2.3.4');
    expect(rateLimitKey(undefined, undefined)).toBe('unknown');
  });
});
