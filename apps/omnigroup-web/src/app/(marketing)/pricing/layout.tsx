import type { Metadata } from 'next';
import { marketingOpenGraph, marketingTwitter } from '@/lib/site-metadata';

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Transparent packages you can buy today — see exactly what you get and when it arrives.',
  openGraph: marketingOpenGraph(
    'Pricing',
    'Transparent packages you can buy today — see exactly what you get and when it arrives.',
  ),
  twitter: marketingTwitter(
    'Pricing',
    'Transparent packages you can buy today — see exactly what you get and when it arrives.',
  ),
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
