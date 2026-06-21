import { NextRequest, NextResponse } from 'next/server';
import { fetchAtinaForBff } from '@/lib/atina-bff';
import { getServerSession } from '@/lib/auth-session';

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session || session.demo) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const limit = req.nextUrl.searchParams.get('limit') ?? '50';
  const minHeat = req.nextUrl.searchParams.get('minHeat');
  const qs = new URLSearchParams({ limit });
  if (minHeat) qs.set('minHeat', minHeat);

  const r = await fetchAtinaForBff<Record<string, unknown>>(
    `/api/v1/client-hunter/hot-clients?${qs.toString()}`,
    session,
  );
  if (!r.ok) {
    return NextResponse.json(
      { ok: false, error: 'hot_clients_failed', detail: r.message },
      { status: r.status || 502 },
    );
  }

  return NextResponse.json({ ok: true, data: r.data });
}
