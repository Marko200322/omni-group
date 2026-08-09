import { NextResponse } from 'next/server';
import { clientSafeBffError } from '@/lib/atina-bff-route-handlers';
import { fetchAtinaForBff } from '@/lib/atina-bff';
import { getServerSession, isAdminRole } from '@/lib/auth-session';

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  const session = await getServerSession();
  if (!session || session.demo) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  if (!isAdminRole(session.user.role)) return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });

  const { id } = await params;
  const r = await fetchAtinaForBff<unknown>(
    `/api/v1/resource-procurement/orders/${id}/mark-paid`,
    session,
    { method: 'POST' }
  );
  if (!r.ok) return clientSafeBffError('upstream_failed', r.message, r.status || 502);
  return NextResponse.json({ ok: true, data: r.data });
}
