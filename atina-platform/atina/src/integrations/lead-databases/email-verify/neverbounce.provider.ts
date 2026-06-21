import axios from 'axios';
import type { EmailVerifyResult } from '../types';

export function isNeverBounceConfigured(apiKey: string): boolean {
  return Boolean(apiKey?.trim());
}

export async function verifyNeverBounce(apiKey: string, email: string): Promise<EmailVerifyResult> {
  const { data } = await axios.get('https://api.neverbounce.com/v4/single/check', {
    timeout: 20000,
    params: {
      key: apiKey.trim(),
      email: email.trim(),
    },
  });

  const result = String(data?.result ?? 'unknown').toLowerCase();
  const deliverable = result === 'valid' || result === 'catchall' || result === 'catch_all';
  return {
    email: email.trim(),
    status: mapNeverBounceStatus(result),
    provider: 'neverbounce',
    deliverable,
  };
}

function mapNeverBounceStatus(result: string): EmailVerifyResult['status'] {
  if (result === 'valid') return 'valid';
  if (result === 'invalid') return 'invalid';
  if (result === 'catchall' || result === 'catch_all') return 'catch_all';
  if (result === 'disposable') return 'disposable';
  return 'unknown';
}
