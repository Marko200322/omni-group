import type { MetadataRoute } from 'next';

const PUBLIC_ROUTES = ['', '/services', '/pricing', '/contact', '/login'] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://omnigroup.example';
  const now = new Date();

  return PUBLIC_ROUTES.map((path, index) => ({
    url: `${base.replace(/\/$/, '')}${path}`,
    lastModified: now,
    changeFrequency: path === '' ? 'weekly' : 'monthly',
    priority: path === '' ? 1 : 0.8 - index * 0.05,
  }));
}
