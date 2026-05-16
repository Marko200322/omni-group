// Placeholder rekonstruisan 2026-05-13 zbog OneDrive dehidracije (D.1).
// Pun runbook: docs/OMNIGROUP-WEB-EMPTY-FILES-RUNBOOK.md.
// Konzervativan robots — dozvoljen public site, blokiran admin/dashboard.
// TODO[D.1-restore]: ako je originalni robots imao posebna pravila (dev rute, sitemap-i),
// vratiti pre produkcionog deploy-a.

import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://example.com';
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/dashboard', '/dev'],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
