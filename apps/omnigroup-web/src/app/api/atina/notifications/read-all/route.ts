import { NextResponse } from 'next/server';
import { clientSafeBffError } from '@/lib/atina-bff-route-handlers';
import { fetchAtinaForBff } from '@/lib/atina-bff';
import { getServerSession } from '@/lib/auth-session';

export async function PATCH() {
  const session = await getServerSession();
  if (!session || session.demo) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const r = await fetchAtinaForBff<unknown>('/api/v1/notifications/read-all', session, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });

  if (!r.ok) {
    return clientSafeBffError('notifications_read_all_failed', r.message, r.status || 502);
  }

  return NextResponse.json({ ok: true });
}
