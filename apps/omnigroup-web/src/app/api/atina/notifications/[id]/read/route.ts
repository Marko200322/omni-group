import { NextResponse } from 'next/server';
import { clientSafeBffError } from '@/lib/atina-bff-route-handlers';
import { fetchAtinaForBff } from '@/lib/atina-bff';
import { getServerSession } from '@/lib/auth-session';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(_req: Request, { params }: Params) {
  const session = await getServerSession();
  if (!session || session.demo) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ ok: false, error: 'missing_id' }, { status: 400 });
  }

  const r = await fetchAtinaForBff<unknown>(
    `/api/v1/notifications/${encodeURIComponent(id)}/read`,
    session,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    },
  );

  if (!r.ok) {
    return clientSafeBffError('notification_mark_read_failed', r.message, r.status || 502);
  }

  return NextResponse.json({ ok: true });
}
