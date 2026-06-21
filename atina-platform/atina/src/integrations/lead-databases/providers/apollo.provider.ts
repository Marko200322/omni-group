import axios from 'axios';
import type { LeadRecord, LeadSearchQuery } from '../types';

const BASE = 'https://api.apollo.io/api/v1';

export function isApolloConfigured(apiKey: string): boolean {
  return Boolean(apiKey?.trim());
}

export async function searchApollo(apiKey: string, query: LeadSearchQuery): Promise<LeadRecord[]> {
  const limit = Math.min(Math.max(query.limit ?? 10, 1), 25);
  const body: Record<string, unknown> = {
    page: 1,
    per_page: limit,
  };
  if (query.keywords?.trim()) body.q_keywords = query.keywords.trim();
  if (query.companyDomain?.trim()) body.q_organization_domains = query.companyDomain.trim();
  if (query.companyName?.trim()) body.q_organization_name = query.companyName.trim();

  const { data } = await axios.post(`${BASE}/mixed_people/search`, body, {
    timeout: 45000,
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': apiKey.trim(),
    },
  });

  const people = Array.isArray(data?.people) ? data.people : [];
  return people
    .map((p: Record<string, unknown>) => mapApolloPerson(p))
    .filter((r: LeadRecord) => r.email || r.company || r.firstName);
}

function mapApolloPerson(p: Record<string, unknown>): LeadRecord {
  const org = (p.organization ?? {}) as Record<string, unknown>;
  return {
    email: typeof p.email === 'string' ? p.email : null,
    firstName: typeof p.first_name === 'string' ? p.first_name : null,
    lastName: typeof p.last_name === 'string' ? p.last_name : null,
    title: typeof p.title === 'string' ? p.title : null,
    company: typeof org.name === 'string' ? org.name : null,
    companyDomain: typeof org.primary_domain === 'string' ? org.primary_domain : null,
    phone:
      Array.isArray(p.phone_numbers) && typeof p.phone_numbers[0] === 'string'
        ? (p.phone_numbers[0] as string)
        : null,
    linkedinUrl: typeof p.linkedin_url === 'string' ? p.linkedin_url : null,
    provider: 'apollo',
    verified: false,
    raw: { id: p.id },
  };
}
