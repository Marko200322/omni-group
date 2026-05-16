// Placeholder rekonstruisan 2026-05-13 zbog OneDrive dehidracije (D.1).
// Pun runbook: docs/OMNIGROUP-WEB-EMPTY-FILES-RUNBOOK.md.
// Minimalan Next 14 sitemap — samo home stranica.
// TODO[D.1-restore]: vratiti pun spisak ruta (svi public pages, dev/docs ako se objavljuje).

import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://example.com';
  return [
    {
      url: base,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
  ];
}
