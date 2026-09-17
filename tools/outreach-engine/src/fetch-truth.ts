/**
 * Fetch + normalize live catalog from Omni/Atina APIs into SourceOfTruth.
 */
import { SourceOfTruthSchema, type CatalogPackage, type SourceOfTruth } from './types.js';
import { DEFAULT_DISCLAIMER_FOOTER } from './system-prompts.js';
import { FALLBACK_SOURCE_OF_TRUTH } from './fallback-truth.js';
import type { SecurityEnv } from './security-config.js';
import { buildContextUrls } from './security-config.js';

type UnknownRecord = Record<string, unknown>;

function asArray(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    const o = data as UnknownRecord;
    if (Array.isArray(o.data)) return o.data;
    if (o.data && typeof o.data === 'object') {
      const inner = o.data as UnknownRecord;
      if (Array.isArray(inner.deliverables)) return inner.deliverables;
      if (Array.isArray(inner.items)) return inner.items;
    }
    if (Array.isArray(o.deliverables)) return o.deliverables;
  }
  return [];
}

function mapPackage(row: unknown): CatalogPackage | null {
  if (!row || typeof row !== 'object') return null;
  const r = row as UnknownRecord;
  const id = String(r.id ?? r.deliverableId ?? '').trim();
  if (!id) return null;
  const billingRaw = String(r.billing ?? 'one_time');
  const billing =
    billingRaw === 'monthly' || billingRaw === 'yearly' ? billingRaw : 'one_time';
  const anchor = Number(r.anchorEur ?? r.priceEur ?? r.price ?? 0);
  return {
    id,
    name: String(r.name ?? id),
    description: String(r.description ?? ''),
    billing,
    category: r.category ? String(r.category) : undefined,
    anchorEur: Number.isFinite(anchor) ? anchor : undefined,
    priceEur: Number.isFinite(Number(r.priceEur)) ? Number(r.priceEur) : undefined,
    includes: Array.isArray(r.includes) ? r.includes.map(String) : undefined,
    excludes: Array.isArray(r.excludes) ? r.excludes.map(String) : undefined,
    modules: Array.isArray(r.modules) ? r.modules.map(String) : undefined,
  };
}

export async function fetchSourceOfTruth(
  env: SecurityEnv,
  fetchImpl: typeof fetch = fetch,
): Promise<SourceOfTruth> {
  const urls = buildContextUrls(env);
  let packages: CatalogPackage[] = [];

  try {
    const res = await fetchImpl(urls.deliverablesUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(20_000),
    });
    if (res.ok) {
      const json = (await res.json()) as unknown;
      packages = asArray(json)
        .map(mapPackage)
        .filter((p): p is CatalogPackage => Boolean(p));
    }
  } catch {
    // fall through to snapshot
  }

  if (packages.length === 0) {
    packages = FALLBACK_SOURCE_OF_TRUTH.packages;
  }

  const truth: SourceOfTruth = SourceOfTruthSchema.parse({
    fetchedAt: new Date().toISOString(),
    brandName: 'Omni Group Tech',
    publicSiteUrl: env.PUBLIC_SITE_URL,
    checkoutBaseUrl: env.CHECKOUT_BASE_URL,
    modules: FALLBACK_SOURCE_OF_TRUTH.modules,
    packages,
    terms: {
      ...FALLBACK_SOURCE_OF_TRUTH.terms,
      disclaimerFooter:
        FALLBACK_SOURCE_OF_TRUTH.terms.disclaimerFooter || DEFAULT_DISCLAIMER_FOOTER,
    },
    allowedFeaturePhrases: FALLBACK_SOURCE_OF_TRUTH.allowedFeaturePhrases,
  });

  return truth;
}

export function buildOfficialCheckoutUrl(
  checkoutBaseUrl: string,
  packageId: string,
): string {
  const u = new URL(checkoutBaseUrl);
  u.searchParams.set('package', packageId);
  return u.toString();
}
