import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Products | Omni Group Tech',
  description: 'Platform modules — CRM, automations, AI support, enterprise tools.',
};

export default function ProductsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
