import 'server-only';

import { resolveAtinaApiBase } from './atina-api-base';

type AtinaEnvelope<T> = {
  success?: boolean;
  data?: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
};

async function fetchPublic<T>(path: string, init?: RequestInit): Promise<T | null> {
  const apiBase = resolveAtinaApiBase();
  try {
    const res = await fetch(`${apiBase}/api/v1/public-site${path}`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      ...init,
    });
    if (!res.ok) return null;
    const json = (await res.json()) as AtinaEnvelope<T>;
    return json.data ?? (json as unknown as T);
  } catch {
    return null;
  }
}

export type SolutionListItem = {
  slug: string;
  name: string;
  category: string;
  status: string;
  valueProp: string | null;
  href: string;
  updatedAt: string;
};

export type SolutionListResponse = {
  items: SolutionListItem[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};

export type VerticalDeliveryPack = {
  verticalSlug: string;
  category: string;
  displayName: string;
  valueProp: string;
  keywords: string[];
  outreachHooks: string[];
  recommendedDeliverables: Array<{
    id: string;
    nameSr: string;
    clientPriceEur: number;
    billing: string;
  }>;
  verticalPackageQuoteEur: number;
  workflowSteps: Array<{ step: string; moduleSlug: string; action: string; config?: Record<string, unknown> }>;
};

export type SolutionDetail = {
  slug: string;
  name: string;
  category: string;
  status: string;
  deliveryPack: VerticalDeliveryPack;
};

export type ClientSitePage = {
  slug: string;
  title: string;
  body: string;
  kind?: string;
};

export type ClientPublicSite = {
  slug: string;
  title: string;
  tagline: string | null;
  siteType: string;
  branding: Record<string, unknown>;
  pages: ClientSitePage[];
  status: string;
  publicUrl: string;
};

export function fetchSolutionsList(query?: { page?: number; limit?: number; q?: string; category?: string }) {
  const params = new URLSearchParams();
  if (query?.page) params.set('page', String(query.page));
  if (query?.limit) params.set('limit', String(query.limit));
  if (query?.q) params.set('q', query.q);
  if (query?.category) params.set('category', query.category);
  const qs = params.toString();
  return fetchPublic<SolutionListResponse>(`/solutions${qs ? `?${qs}` : ''}`);
}

export function fetchSolution(slug: string) {
  return fetchPublic<SolutionDetail>(`/solutions/${encodeURIComponent(slug)}`);
}

export function fetchClientSite(slug: string) {
  return fetchPublic<ClientPublicSite>(`/client-sites/${encodeURIComponent(slug)}`);
}
