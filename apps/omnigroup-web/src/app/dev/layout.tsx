import { redirect } from 'next/navigation';
import { getServerSession, isAdminRole } from '@/lib/auth-session';

export default async function DevLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  if (!session) {
    redirect('/login?next=/dev/docs');
  }
  if (session.demo || !isAdminRole(session.user.role)) {
    redirect('/dashboard');
  }
  return <>{children}</>;
}
