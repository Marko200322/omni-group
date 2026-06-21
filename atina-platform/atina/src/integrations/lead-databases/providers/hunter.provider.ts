import axios from 'axios';
import type { LeadRecord, LeadSearchQuery } from '../types';

const BASE = 'https://api.hunter.io/v2';

export function isHunterConfigured(apiKey: string): boolean {
  return Boolean(apiKey?.trim());
}

/** Hunter radi po domenu — vraća kontakte sa companyDomain ili iz keywords kao domen. */
export async function searchHunter(apiKey: string, query: LeadSearchQuery): Promise<LeadRecord[]> {
  const domain = query.companyDomain?.trim() || domainFromKeywords(query.keywords);
  if (!domain) return [];

  const limit = Math.min(Math.max(query.limit ?? 10, 1), 20);
  const { data } = await axios.get(`${BASE}/domain-search`, {
    timeout: 30000,
    params: {
      domain,
      api_key: apiKey.trim(),
      limit,
    },
  });

  const emails = Array.isArray(data?.data?.emails) ? data.data.emails : [];
  return emails.map((e: Record<string, unknown>) => mapHunterEmail(e, domain));
}

function domainFromKeywords(keywords?: string): string | null {
  const k = keywords?.trim().toLowerCase() ?? '';
  if (!k) return null;
  if (k.includes('.') && !k.includes(' ')) return k.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  return null;
}

function mapHunterEmail(e: Record<string, unknown>, domain: string): LeadRecord {
  const first = typeof e.first_name === 'string' ? e.first_name : null;
  const last = typeof e.last_name === 'string' ? e.last_name : null;
  const verification = e.verification as { status?: string } | undefined;
  return {
    email: typeof e.value === 'string' ? e.value : null,
    firstName: first,
    lastName: last,
    title: typeof e.position === 'string' ? e.position : null,
    company: typeof e.company === 'string' ? e.company : domain,
    companyDomain: domain,
    phone: null,
    linkedinUrl: typeof e.linkedin === 'string' ? e.linkedin : null,
    provider: 'hunter',
    verified: verification?.status === 'valid',
    raw: { confidence: e.confidence, type: e.type },
  };
}
