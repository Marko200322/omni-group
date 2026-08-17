import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getServerSession, isAdminRole } from '@/lib/auth-session';

export const metadata: Metadata = {
  title: 'Operator console',
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  if (!session) {
    redirect('/login?next=/admin');
  }
  if (session.demo || !isAdminRole(session.user.role)) {
    redirect('/dashboard');
  }
  return <>{children}</>;
}
