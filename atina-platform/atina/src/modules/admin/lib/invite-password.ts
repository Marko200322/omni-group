import crypto from 'crypto';

const LOWER = 'abcdefghjkmnpqrstuvwxyz';
const UPPER = 'ABCDEFGHJKMNPQRSTUVWXYZ';
const DIGITS = '23456789';
const POOL = LOWER + UPPER + DIGITS;

/** Meets RegisterDto password rules (upper, lower, digit). */
export function generateInvitePassword(length = 14): string {
  const pick = (chars: string) => chars[crypto.randomInt(0, chars.length)]!;
  const body = Array.from({ length: Math.max(length - 3, 8) }, () =>
    pick(POOL)
  ).join('');
  return `${pick(UPPER)}${pick(LOWER)}${pick(DIGITS)}${body}`;
}
