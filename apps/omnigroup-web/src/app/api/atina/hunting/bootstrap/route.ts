import { NextResponse } from 'next/server';
import { fetchAtinaForBff } from '@/lib/atina-bff';
import { getServerSession } from '@/lib/auth-session';

export async function POST() {
  const session = await getServerSession();
  if (!session || session.demo) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const r = await fetchAtinaForBff<Record<string, unknown>>('/api/v1/client-hunter/bootstrap', session, {
    method: 'POST',
  });
  if (!r.ok) {
    return NextResponse.json(
      { ok: false, error: 'bootstrap_failed', detail: r.message },
      { status: r.status || 502 },
    );
  }

  return NextResponse.json({ ok: true, data: r.data });
}
