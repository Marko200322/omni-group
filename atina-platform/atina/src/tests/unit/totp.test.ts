import jwt from 'jsonwebtoken';
import { config } from '../../config';
import { generateTotpCode, generateTotpSecret, verifyTotpCode } from '../../modules/auth/lib/totp';
import { decryptTotpSecret, encryptTotpSecret, twoFactorChallengeSecret } from '../../modules/auth/lib/totp-secret';
import { readTwoFactorRecord } from '../../modules/auth/lib/two-factor-record';

describe('totp', () => {
  it('verifies a freshly generated code and rejects a wrong one', () => {
    const secret = generateTotpSecret();
    const now = Date.UTC(2026, 8, 28, 12, 0, 5);
    const code = generateTotpCode(secret, now);
    expect(code).toMatch(/^\d{6}$/);
    expect(verifyTotpCode(secret, code, now)).toBe(true);
    expect(verifyTotpCode(secret, '000000', now)).toBe(false);
  });

  it('accepts the previous 30-second window', () => {
    const secret = generateTotpSecret();
    const now = Date.UTC(2026, 8, 28, 12, 0, 5);
    const previous = generateTotpCode(secret, now - 30_000);
    expect(verifyTotpCode(secret, previous, now)).toBe(true);
  });
});

describe('totp secret encryption', () => {
  it('round-trips the authenticator secret', () => {
    const secret = generateTotpSecret();
    expect(decryptTotpSecret(encryptTotpSecret(secret))).toBe(secret);
  });
});

describe('two-factor record', () => {
  it('reads enabled state from users.metadata.twoFactor', () => {
    expect(readTwoFactorRecord(null).enabled).toBe(false);
    expect(readTwoFactorRecord({ twoFactor: { enabled: true, secretEnc: 'x' } }).secretEnc).toBe('x');
  });
});

describe('two-factor challenge token', () => {
  it('cannot be verified with the session JWT secret', () => {
    const token = jwt.sign({ userId: 'u1', typ: '2fa' }, twoFactorChallengeSecret(), { expiresIn: '5m' });
    expect(() => jwt.verify(token, config.jwt.secret)).toThrow();
    expect(jwt.verify(token, twoFactorChallengeSecret())).toMatchObject({ userId: 'u1', typ: '2fa' });
  });
});
