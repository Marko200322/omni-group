import { NextResponse } from 'next/server';
import { clientSafeBffError } from '@/lib/atina-bff-route-handlers';
import { fetchAtinaForBff } from '@/lib/atina-bff';
import { getServerSession, isAdminRole } from '@/lib/auth-session';

export async function GET(req: Request) {
  const session = await getServerSession();
  if (!session || session.demo) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  if (!isAdminRole(session.user.role)) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }

  const limit = new URL(req.url).searchParams.get('limit') ?? '15';
  const r = await fetchAtinaForBff<unknown[]>(`/api/v1/cursor-agent/runs?limit=${limit}`, session, {
    method: 'GET',
  });

  if (!r.ok) {
    return clientSafeBffError('cursor_runs_failed', r.message, r.status || 502);
  }

  return NextResponse.json({ ok: true, data: r.data });
}
