import { NextResponse } from 'next/server';
import { clientSafeBffError } from '@/lib/atina-bff-route-handlers';
import { fetchAtinaForBff } from '@/lib/atina-bff';
import { getServerSession, isAdminRole } from '@/lib/auth-session';

type Params = { params: Promise<{ paymentId: string }> };

export async function POST(_req: Request, { params }: Params) {
  const session = await getServerSession();
  if (!session || session.demo) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  if (!isAdminRole(session.user.role)) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }

  const { paymentId } = await params;
  if (!paymentId) {
    return NextResponse.json({ ok: false, error: 'payment_id_required' }, { status: 400 });
  }

  const r = await fetchAtinaForBff<null>(
    `/api/v1/payments/manual/confirm/${paymentId}`,
    session,
    { method: 'POST', body: JSON.stringify({}) },
  );

  if (!r.ok) {
    return clientSafeBffError('confirm_failed', r.message, r.status || 502);
  }

  return NextResponse.json({ ok: true });
}
