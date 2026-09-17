import { NextResponse } from 'next/server';
import { clientSafeBffError } from '@/lib/atina-bff-route-handlers';
import { fetchAtinaForBff } from '@/lib/atina-bff';
import { getServerSession, isAdminRole } from '@/lib/auth-session';

export async function GET() {
  const session = await getServerSession();
  if (!session || session.demo || !isAdminRole(session.user.role)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const r = await fetchAtinaForBff<{ publicKey?: string; configured?: boolean }>(
    '/api/v1/admin/push/vapid-public-key',
    session,
    { method: 'GET' },
  );

  if (!r.ok) {
    return clientSafeBffError('vapid_failed', r.message, r.status || 502);
  }

  return NextResponse.json({ ok: true, data: r.data });
}
