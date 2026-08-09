import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Tell us about your project — we respond within one business day with a concrete, no-obligation quote.',
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
