import { NextResponse } from 'next/server';
import { fetchUnreadNotificationCount } from '@/lib/atina-bff';
import { getServerSession } from '@/lib/auth-session';

export async function GET() {
  const session = await getServerSession();
  if (!session || session.demo) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const unread = await fetchUnreadNotificationCount(session);
  if (unread.count === null) {
    return NextResponse.json(
      { ok: false, error: 'unread_count_failed', detail: unread.error },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, data: { count: unread.count } });
}
