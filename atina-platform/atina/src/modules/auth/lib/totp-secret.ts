import crypto from 'crypto';
import { config } from '../../../config';

function key(): Buffer {
  return crypto.createHash('sha256').update(`omni-totp-v1:${config.jwt.secret}`).digest();
}

/** Separate HMAC so a 2FA challenge JWT cannot be used as a session Bearer token. */
export function twoFactorChallengeSecret(): string {
  return crypto.createHash('sha256').update(`omni-2fa-challenge:${config.jwt.secret}`).digest('hex');
}

export function encryptTotpSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64url')}.${tag.toString('base64url')}.${data.toString('base64url')}`;
}

export function decryptTotpSecret(payload: string): string {
  const [ivB64, tagB64, dataB64] = String(payload ?? '').split('.');
  if (!ivB64 || !tagB64 || !dataB64) throw new Error('invalid_totp_secret');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(ivB64, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}
