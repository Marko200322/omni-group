import type { Metadata } from 'next';
import { marketingOpenGraph, marketingTwitter } from '@/lib/site-metadata';

export const metadata: Metadata = {
  title: 'Packages',
  description: 'Productized deliverables you can buy today — clear scope, pricing, and delivery timelines.',
  openGraph: marketingOpenGraph(
    'Packages',
    'Productized deliverables you can buy today — clear scope, pricing, and delivery timelines.',
  ),
  twitter: marketingTwitter(
    'Packages',
    'Productized deliverables you can buy today — clear scope, pricing, and delivery timelines.',
  ),
};

export default function ProductsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
