import { NextResponse } from 'next/server';
import { fetchAtinaForBff } from '@/lib/atina-bff';
import { getServerSession } from '@/lib/auth-session';

export async function GET() {
  const session = await getServerSession();
  if (!session || session.demo) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const r = await fetchAtinaForBff<Record<string, unknown>>('/api/v1/autonomy-loop/status', session);

  if (!r.ok) {
    const unreachable = r.message?.includes('fetch') || r.status === 503;
    return NextResponse.json(
      { ok: false, error: unreachable ? 'atina_unreachable' : 'status_failed', detail: r.message },
      { status: unreachable ? 503 : r.status || 502 },
    );
  }

  return NextResponse.json({ ok: true, data: r.data });
}
