import type { MetadataRoute } from 'next';
import { getGeneratedVerticalsIndex, listOnlineVerticalSlugs } from '@/lib/generated-verticals';
import { isPublicRegistrationOpen } from '@/lib/registration-public';

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
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
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

  return [...staticEntries, ...solutionEntries];
}
