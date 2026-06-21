import axios from 'axios';
import type { LeadRecord, LeadSearchQuery } from '../types';

const BASE = 'https://api.snov.io/v1';

export function isSnovConfigured(apiKey: string, userId?: string): boolean {
  return Boolean(apiKey?.trim() && userId?.trim());
}

/** Snov.io domain search — zahteva client_id (userId) + client_secret (apiKey). */
export async function searchSnov(
  apiKey: string,
  userId: string,
  query: LeadSearchQuery
): Promise<LeadRecord[]> {
  const domain = query.companyDomain?.trim();
  if (!domain) return [];

  const tokenRes = await axios.post(
    `${BASE}/oauth/access_token`,
    {
      grant_type: 'client_credentials',
      client_id: userId.trim(),
      client_secret: apiKey.trim(),
    },
    { timeout: 20000 }
  );
  const token = tokenRes.data?.access_token;
  if (!token) return [];

  const { data } = await axios.post(
    `${BASE}/get-domain-emails-with-info`,
    { domain, type: 'all', limit: Math.min(query.limit ?? 10, 20) },
    {
      timeout: 30000,
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  const emails = Array.isArray(data?.emails) ? data.emails : [];
  return emails.map((e: Record<string, unknown>) => mapSnovEmail(e, domain));
}

function mapSnovEmail(e: Record<string, unknown>, domain: string): LeadRecord {
  return {
    email: typeof e.email === 'string' ? e.email : null,
    firstName: typeof e.firstName === 'string' ? e.firstName : null,
    lastName: typeof e.lastName === 'string' ? e.lastName : null,
    title: typeof e.position === 'string' ? e.position : null,
    company: domain,
    companyDomain: domain,
    phone: null,
    linkedinUrl: null,
    provider: 'snov',
    verified: false,
  };
}
