import { NextResponse } from 'next/server';
import { clientSafeBffError } from '@/lib/atina-bff-route-handlers';
import { fetchAtinaForBff } from '@/lib/atina-bff';
import { getServerSession } from '@/lib/auth-session';

export async function GET() {
  const session = await getServerSession();
  if (!session || session.demo) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const r = await fetchAtinaForBff<unknown[]>(
    '/api/v1/video-meetings/support/mine',
    session,
    { method: 'GET' },
  );

  if (!r.ok) {
    return clientSafeBffError('list_failed', r.message, r.status || 502);
  }

  return NextResponse.json({ ok: true, data: r.data ?? [] });
}
