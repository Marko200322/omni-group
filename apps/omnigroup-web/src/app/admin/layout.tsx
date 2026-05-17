import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Operator konzola',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

