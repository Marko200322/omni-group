import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getServerSession } from '@/lib/auth-session';

export const metadata: Metadata = {
  title: 'Client workspace',
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  if (!session) {
    redirect('/login?next=/dashboard');
  }
  return <>{children}</>;
}
