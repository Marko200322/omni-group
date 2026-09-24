import type { Metadata } from 'next';

export function getSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://omnigrouptech.com').replace(/\/$/, '');
}

const defaultDescription =
  'Omni Group Tech — custom software, digital services, and monthly support for your business. Transparent industry-based pricing.';

/** Shared Open Graph / Twitter defaults for public marketing pages. */
export function marketingOpenGraph(title: string, description?: string): Metadata['openGraph'] {
  const url = getSiteUrl();
  const desc = description ?? defaultDescription;
  return {
    title,
    description: desc,
    url,
    siteName: 'Omni Group Tech',
    locale: 'en_US',
    type: 'website',
    images: [{
      url: `${url}/opengraph-image`,
      width: 1200,
      height: 630,
      alt: 'Omni Group Tech — custom software and AI automation',
    }],
  };
}

export function marketingTwitter(title: string, description?: string): Metadata['twitter'] {
  return {
    card: 'summary_large_image',
    title,
    description: description ?? defaultDescription,
    images: [`${getSiteUrl()}/opengraph-image`],
  };
}

export const rootSiteMetadata: Pick<Metadata, 'description' | 'openGraph' | 'twitter'> = {
  description: defaultDescription,
  openGraph: marketingOpenGraph('Omni Group Tech'),
  twitter: marketingTwitter('Omni Group Tech'),
};
