import { loadAtinaPublicSnapshot } from '@/lib/atina';
import { fetchUnreadNotificationCount } from '@/lib/atina-bff';
import { fetchAtinaDashboardLive } from '@/lib/atina-dashboard';
import { describeAtinaError } from '@/lib/atina-errors';
import { getServerSession } from '@/lib/auth-session';
import type { AtinaPublicSnapshot } from '@/lib/atina';
import type { AtinaDashboardLive } from '@/lib/atina-live-types';
import type { SessionUser } from '@/lib/auth-session';

export type DashboardPageData = {
  snapshot: AtinaPublicSnapshot;
  live: AtinaDashboardLive | null;
  sessionUser: SessionUser | null;
  isDemo: boolean;
  unreadCount: number | null;
  unreadError?: string;
};

export async function loadDashboardPageData(): Promise<DashboardPageData> {
  const session = await getServerSession();
  const snapshot = await loadAtinaPublicSnapshot();
  const live = session && !session.demo ? await fetchAtinaDashboardLive(session) : null;
  const unread =
    session && !session.demo
      ? await fetchUnreadNotificationCount(session)
      : { count: null as number | null, error: session?.demo ? 'demo_session' : 'no_session' };

  return {
    snapshot,
    live,
    sessionUser: session?.user ?? null,
    isDemo: session?.demo ?? false,
    unreadCount: unread.count,
    unreadError: unread.error ? describeAtinaError(unread.error) : undefined,
  };
}
