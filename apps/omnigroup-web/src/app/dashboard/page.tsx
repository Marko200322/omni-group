import DashboardClient from './DashboardClient';
import { loadAtinaPublicSnapshot } from '@/lib/atina';
import { fetchUnreadNotificationCount } from '@/lib/atina-bff';
import { fetchAtinaDashboardLive } from '@/lib/atina-dashboard';
import { getServerSession } from '@/lib/auth-session';
import { describeAtinaError } from '@/lib/atina-errors';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const session = await getServerSession();
  const snapshot = await loadAtinaPublicSnapshot();
  const live =
    session && !session.demo ? await fetchAtinaDashboardLive(session) : null;
  const unread =
    session && !session.demo
      ? await fetchUnreadNotificationCount(session)
      : { count: null as number | null, error: session?.demo ? 'demo_session' : 'no_session' };

  return (
    <DashboardClient
      snapshot={snapshot}
      live={live}
      sessionUser={session?.user ?? null}
      isDemo={session?.demo ?? false}
      unreadCount={unread.count}
      unreadError={unread.error ? describeAtinaError(unread.error) : undefined}
    />
  );
}
