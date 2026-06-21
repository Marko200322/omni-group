import axios from 'axios';
import type { LeadRecord, LeadSearchQuery } from '../types';

const BASE = 'https://api.lusha.com';

export function isLushaConfigured(apiKey: string): boolean {
  return Boolean(apiKey?.trim());
}

/** Lusha person search — zahteva company + opciono title/keywords. */
export async function searchLusha(apiKey: string, query: LeadSearchQuery): Promise<LeadRecord[]> {
  const domain = query.companyDomain?.trim();
  if (!domain) return [];

  const limit = Math.min(Math.max(query.limit ?? 10, 1), 25);
  const { data } = await axios.get(`${BASE}/person`, {
    timeout: 30000,
    headers: { api_key: apiKey.trim() },
    params: {
      companyDomain: domain,
      jobTitle: query.keywords?.trim() || undefined,
      limit,
    },
  });

  const contacts = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
  return contacts
    .map((c: Record<string, unknown>) => mapLushaContact(c, domain))
    .filter((r: LeadRecord) => r.email || r.firstName);
}

function mapLushaContact(c: Record<string, unknown>, domain: string): LeadRecord {
  return {
    email: typeof c.emailAddress === 'string' ? c.emailAddress : typeof c.email === 'string' ? c.email : null,
    firstName: typeof c.firstName === 'string' ? c.firstName : null,
    lastName: typeof c.lastName === 'string' ? c.lastName : null,
    title: typeof c.jobTitle === 'string' ? c.jobTitle : null,
    company: typeof c.companyName === 'string' ? c.companyName : domain,
    companyDomain: domain,
    phone: typeof c.phoneNumber === 'string' ? c.phoneNumber : null,
    linkedinUrl: typeof c.linkedinUrl === 'string' ? c.linkedinUrl : null,
    provider: 'lusha',
    verified: false,
  };
}
