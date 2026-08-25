import { NextResponse } from 'next/server';
import { clientSafeBffError } from '@/lib/atina-bff-route-handlers';
import { fetchAtinaForBff } from '@/lib/atina-bff';
import { getServerSession, isAdminRole } from '@/lib/auth-session';

type Params = { params: Promise<{ paymentId: string }> };

export async function POST(_req: Request, { params }: Params) {
  const session = await getServerSession();
  if (!session || session.demo || !isAdminRole(session.user.role)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  const { paymentId } = await params;
  const r = await fetchAtinaForBff<unknown>(
    `/api/v1/billing/fulfillment/jobs/${paymentId}/approve`,
    session,
    { method: 'POST', body: '{}' },
  );
  if (!r.ok) {
    return clientSafeBffError('approve_failed', r.message, r.status || 502);
  }
  return NextResponse.json({ ok: true, data: r.data });
}
