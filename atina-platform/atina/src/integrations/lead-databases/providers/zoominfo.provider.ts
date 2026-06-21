import axios from 'axios';
import type { LeadRecord, LeadSearchQuery } from '../types';

/**
 * ZoomInfo koristi enterprise API — placeholder za budući OAuth/JWT flow.
 * Dok nema punu integraciju, vraća prazan niz (lanac prelazi na sledeći provajder).
 */
export function isZoomInfoConfigured(apiKey: string): boolean {
  return Boolean(apiKey?.trim());
}

export async function searchZoomInfo(apiKey: string, query: LeadSearchQuery): Promise<LeadRecord[]> {
  const baseUrl = process.env.ZOOMINFO_API_URL?.trim() || 'https://api.zoominfo.com';
  const limit = Math.min(Math.max(query.limit ?? 10, 1), 25);

  try {
    const { data } = await axios.post(
      `${baseUrl}/search/contact`,
      {
        companyDomain: query.companyDomain,
        jobTitle: query.keywords,
        rpp: limit,
      },
      {
        timeout: 45000,
        headers: {
          Authorization: `Bearer ${apiKey.trim()}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const rows = Array.isArray(data?.data) ? data.data : Array.isArray(data?.contacts) ? data.contacts : [];
    return rows.map((c: Record<string, unknown>) => ({
      email: typeof c.email === 'string' ? c.email : null,
      firstName: typeof c.firstName === 'string' ? c.firstName : null,
      lastName: typeof c.lastName === 'string' ? c.lastName : null,
      title: typeof c.jobTitle === 'string' ? c.jobTitle : null,
      company: typeof c.companyName === 'string' ? c.companyName : null,
      companyDomain: typeof c.companyDomain === 'string' ? c.companyDomain : query.companyDomain ?? null,
      phone: typeof c.phone === 'string' ? c.phone : null,
      linkedinUrl: typeof c.linkedInUrl === 'string' ? c.linkedInUrl : null,
      provider: 'zoominfo',
      verified: false,
    }));
  } catch {
    return [];
  }
}
