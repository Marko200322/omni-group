import { NextResponse } from 'next/server';
import { clientSafeBffError } from '@/lib/atina-bff-route-handlers';
import { fetchAtinaForBff } from '@/lib/atina-bff';
import { getServerSession, isAdminRole } from '@/lib/auth-session';

export async function GET() {
  const session = await getServerSession();
  if (!session || session.demo) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  if (!isAdminRole(session.user.role)) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }

  const r = await fetchAtinaForBff<Record<string, unknown>>('/api/v1/analytics/admin/overview', session, {
    method: 'GET',
  });

  if (!r.ok) {
    return clientSafeBffError('analytics_failed', r.message, r.status || 502);
  }

  return NextResponse.json({ ok: true, data: r.data });
}
