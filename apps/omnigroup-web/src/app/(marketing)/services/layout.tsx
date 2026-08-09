import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Services',
  description: 'Setup, support, and growth packages — clear scope and transparent pricing from Omni Group Tech.',
};

export default function ServicesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
