import type { Metadata } from 'next';
import { marketingOpenGraph, marketingTwitter } from '@/lib/site-metadata';

export const metadata: Metadata = {
  title: 'Services',
  description: 'Setup, support, and growth packages — clear scope and transparent pricing from Omni Group Tech.',
  openGraph: marketingOpenGraph(
    'Services',
    'Setup, support, and growth packages — clear scope and transparent pricing from Omni Group Tech.',
  ),
  twitter: marketingTwitter(
    'Services',
    'Setup, support, and growth packages — clear scope and transparent pricing from Omni Group Tech.',
  ),
};

export default function ServicesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
