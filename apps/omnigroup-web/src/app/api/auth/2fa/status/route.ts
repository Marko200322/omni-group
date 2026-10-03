import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth-session';
import { fetchAtinaForBff } from '@/lib/atina-bff';

export async function GET() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  if (session.demo) {
    return NextResponse.json({ ok: true, enabled: false, pending: false, demo: true });
  }

  const r = await fetchAtinaForBff<{ enabled?: boolean; pending?: boolean }>(
    '/api/v1/auth/2fa/status',
    session,
  );
  if (!r.ok) {
    return NextResponse.json(
      { ok: false, error: r.message ?? 'two_factor_status_failed' },
      { status: r.status || 502 },
    );
  }
  return NextResponse.json({
    ok: true,
    enabled: r.data?.enabled === true,
    pending: r.data?.pending === true,
    demo: false,
  });
}
