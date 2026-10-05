import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ClientSiteView } from '@/components/marketing/ClientSiteView';
import { fetchClientSite } from '@/lib/public-site-api';

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const site = await fetchClientSite(slug);
  if (!site) return { title: { absolute: 'Site' } };
  return {
    title: { absolute: site.title },
    description: site.tagline ?? `${site.title} — professional website`,
  };
}

export const dynamic = 'force-dynamic';

export default async function ClientSitePage({ params }: PageProps) {
  const { slug } = await params;
  const site = await fetchClientSite(slug);
  if (!site) notFound();
  return <ClientSiteView site={site} />;
}
