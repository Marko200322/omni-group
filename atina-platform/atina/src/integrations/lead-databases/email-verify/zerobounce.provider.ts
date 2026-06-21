import axios from 'axios';
import type { EmailVerifyResult } from '../types';

export function isZeroBounceConfigured(apiKey: string): boolean {
  return Boolean(apiKey?.trim());
}

export async function verifyZeroBounce(apiKey: string, email: string): Promise<EmailVerifyResult> {
  const { data } = await axios.get('https://api.zerobounce.net/v2/validate', {
    timeout: 20000,
    params: {
      api_key: apiKey.trim(),
      email: email.trim(),
    },
  });

  const status = String(data?.status ?? 'unknown').toLowerCase();
  const deliverable = status === 'valid' || status === 'catch-all' || status === 'catch_all';
  return {
    email: email.trim(),
    status: mapZeroBounceStatus(status),
    provider: 'zerobounce',
    deliverable,
  };
}

function mapZeroBounceStatus(status: string): EmailVerifyResult['status'] {
  if (status === 'valid') return 'valid';
  if (status === 'invalid') return 'invalid';
  if (status === 'catch-all' || status === 'catch_all') return 'catch_all';
  if (status === 'do_not_mail' || status === 'disposable') return 'disposable';
  return 'unknown';
}
