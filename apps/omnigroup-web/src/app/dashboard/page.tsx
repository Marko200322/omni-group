import DashboardClient from './DashboardClient';
import { loadAtinaPublicSnapshot } from '@/lib/atina';
import { fetchUnreadNotificationCount } from '@/lib/atina-auth';
import { getServerSession } from '@/lib/auth-session';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const session = await getServerSession();
  const snapshot = await loadAtinaPublicSnapshot();
  const unread =
    session && !session.demo
      ? await fetchUnreadNotificationCount(session)
      : { count: null as number | null, error: session?.demo ? 'demo_session' : 'no_session' };

  return (
    <DashboardClient
      snapshot={snapshot}
      sessionUser={session?.user ?? null}
      isDemo={session?.demo ?? false}
      unreadCount={unread.count}
      unreadError={unread.error}
    />
  );
}
