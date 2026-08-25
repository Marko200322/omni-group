import { NextResponse } from 'next/server';
import { clientSafeBffError } from '@/lib/atina-bff-route-handlers';
import { fetchUnreadNotificationCount } from '@/lib/atina-bff';
import { getServerSession } from '@/lib/auth-session';

export async function GET() {
  const session = await getServerSession();
  if (!session || session.demo) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const unread = await fetchUnreadNotificationCount(session);
  if (unread.count === null) {
    return clientSafeBffError('unread_count_failed', unread.error, 502);
  }

  return NextResponse.json({ ok: true, data: { count: unread.count } });
}
