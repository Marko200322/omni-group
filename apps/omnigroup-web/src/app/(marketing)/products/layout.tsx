import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Proizvodi | Omni Group',
  description: 'Moduli platforme — CRM, automatizacije, AI podrška, enterprise alati.',
};

export default function ProductsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
