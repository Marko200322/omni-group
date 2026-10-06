import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ClientSiteView } from '@/components/marketing/ClientSiteView';
import { fetchClientSite } from '@/lib/public-site-api';
import { getSiteUrl } from '@/lib/site-metadata';

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const site = await fetchClientSite(slug);
  if (!site) return { title: { absolute: 'Site' } };
  const title = site.title;
  const description = site.tagline ?? `${site.title} — professional website`;
  const url = `${getSiteUrl()}/sites/${encodeURIComponent(slug)}`;
  return {
    title: { absolute: title },
    description,
    // Fully replace root Omni OG/Twitter so client sites are not branded as Omni Group Tech.
    openGraph: {
      title,
      description,
      url,
      siteName: title,
      locale: 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  };
}

export const dynamic = 'force-dynamic';

export default async function ClientSitePage({ params }: PageProps) {
  const { slug } = await params;
  const site = await fetchClientSite(slug);
  if (!site) notFound();
  return <ClientSiteView site={site} />;
}
