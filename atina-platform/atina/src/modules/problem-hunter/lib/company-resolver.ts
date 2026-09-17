import crypto from 'crypto';

export type CompanyIdentityInput = {
  companyName?: string | null;
  domain?: string | null;
  website?: string | null;
};

export function normalizeDomain(raw?: string | null): string | null {
  if (!raw?.trim()) return null;
  try {
    const u = raw.includes('://') ? new URL(raw) : new URL(`https://${raw}`);
    return u.hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return raw.replace(/^www\./, '').toLowerCase().trim() || null;
  }
}

export function buildCompanyIdentityHash(input: CompanyIdentityInput): string {
  const name = (input.companyName ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
  const domain = normalizeDomain(input.domain ?? input.website) ?? '';
  return crypto.createHash('sha256').update(`${name}|${domain}`).digest('hex').slice(0, 32);
}

export function resolveCanonicalName(input: CompanyIdentityInput): string {
  if (input.companyName?.trim()) return input.companyName.trim().slice(0, 200);
  const domain = normalizeDomain(input.domain ?? input.website);
  if (domain) return domain;
  return 'Unknown company';
}
