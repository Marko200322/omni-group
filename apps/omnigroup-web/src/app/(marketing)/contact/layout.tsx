import type { Metadata } from 'next';
import { marketingOpenGraph, marketingTwitter } from '@/lib/site-metadata';

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Tell us about your project — we respond within one business day with a concrete, no-obligation quote.',
  openGraph: marketingOpenGraph(
    'Contact',
    'Tell us about your project — we respond within one business day with a concrete, no-obligation quote.',
  ),
  twitter: marketingTwitter(
    'Contact',
    'Tell us about your project — we respond within one business day with a concrete, no-obligation quote.',
  ),
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
