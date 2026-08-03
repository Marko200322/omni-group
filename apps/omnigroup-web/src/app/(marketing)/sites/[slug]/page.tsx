import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ClientSiteView } from '@/components/marketing/ClientSiteView';
import { fetchClientSite } from '@/lib/public-site-api';

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const site = await fetchClientSite(slug);
  if (!site) return { title: 'Sajt | Omni Group Tech' };
  return {
    title: `${site.title} | Omni Group Tech`,
    description: site.tagline ?? `${site.title} — klijentski public sajt`,
  };
}

export const dynamic = 'force-dynamic';

export default async function ClientSitePage({ params }: PageProps) {
  const { slug } = await params;
  const site = await fetchClientSite(slug);
  if (!site) notFound();
  return <ClientSiteView site={site} />;
}
