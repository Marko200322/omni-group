import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth-session';

export default async function DevLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  if (!session) {
    redirect('/login?next=/dev/docs');
  }
  return <>{children}</>;
}
