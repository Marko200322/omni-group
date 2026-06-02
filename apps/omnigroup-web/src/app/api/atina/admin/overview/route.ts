import { NextResponse } from 'next/server';
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

  const r = await fetchAtinaForBff<Record<string, unknown>>('/api/v1/admin/overview', session, {
    method: 'GET',
  });

  if (!r.ok) {
    return NextResponse.json(
      { ok: false, error: 'overview_failed', detail: r.message },
      { status: r.status || 502 },
    );
  }

  return NextResponse.json({ ok: true, data: r.data });
}
