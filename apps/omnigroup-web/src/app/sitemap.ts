import type { MetadataRoute } from 'next';
import { getGeneratedVerticalsIndex, listOnlineVerticalSlugs } from '@/lib/generated-verticals';
import { isPublicRegistrationOpen } from '@/lib/registration-public';
import { resolveAtinaApiBase } from '@/lib/atina-api-base';

const PUBLIC_ROUTES = [
  '',
  '/services',
  '/products',
  '/pricing',
  '/contact',
  '/login',
  '/solutions',
  '/legal/terms',
  '/legal/privacy',
  '/legal/cookies',
  '/legal/refund',
  '/legal/impressum',
  '/status',
] as const;

type PublishedSiteIndex = {
  sites?: Array<{
    slug?: string;
    updatedAt?: string | null;
    publishedAt?: string | null;
  }>;
};

async function fetchPublishedSiteSlugs(): Promise<
  Array<{ slug: string; lastModified: Date }>
> {
  try {
    const base = resolveAtinaApiBase().replace(/\/$/, '');
    const res = await fetch(`${base}/api/v1/public-site/client-sites?limit=200`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const body = (await res.json()) as { success?: boolean; data?: PublishedSiteIndex };
    const sites = body.data?.sites ?? [];
    return sites
      .filter((s): s is { slug: string; updatedAt?: string | null; publishedAt?: string | null } =>
        Boolean(s.slug && /^[a-z0-9-]+$/.test(s.slug)),
      )
      .map((s) => ({
        slug: s.slug,
        lastModified: new Date(s.updatedAt || s.publishedAt || Date.now()),
      }));
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://omnigrouptech.com';
  const origin = base.replace(/\/$/, '');
  const now = new Date();

  const staticPaths = isPublicRegistrationOpen() ? [...PUBLIC_ROUTES, '/register'] : [...PUBLIC_ROUTES];

  const staticEntries: MetadataRoute.Sitemap = staticPaths.map((path, index) => ({
    url: `${origin}${path}`,
    lastModified: now,
    changeFrequency: path === '' || path === '/solutions' ? 'weekly' : 'monthly',
    priority: path === '' ? 1 : path === '/solutions' ? 0.85 : 0.8 - index * 0.03,
  }));

  const index = getGeneratedVerticalsIndex();
  const slugs = listOnlineVerticalSlugs();
  const solutionEntries: MetadataRoute.Sitemap = slugs.map((slug) => {
    const entry = index.verticals.find((v) => v.slug === slug);
    return {
      url: `${origin}/solutions/${slug}`,
      lastModified: entry?.updatedAt ? new Date(entry.updatedAt) : now,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    };
  });

  const publishedSites = await fetchPublishedSiteSlugs();
  const siteEntries: MetadataRoute.Sitemap = publishedSites.map((site) => ({
    url: `${origin}/sites/${site.slug}`,
    lastModified: site.lastModified,
    changeFrequency: 'weekly' as const,
    priority: 0.55,
  }));

  return [...staticEntries, ...solutionEntries, ...siteEntries];
}
