import { NextResponse } from 'next/server';
import { clientSafeBffError } from '@/lib/atina-bff-route-handlers';
import { getServerSession } from '@/lib/auth-session';
import { fetchAtinaForBff } from '@/lib/atina-bff';

type Params = { params: Promise<{ paymentId: string }> };

export async function POST(_req: Request, { params }: Params) {
  const session = await getServerSession();
  if (!session || session.demo) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const { paymentId } = await params;
  if (!paymentId) {
    return NextResponse.json({ ok: false, error: 'missing_payment_id' }, { status: 400 });
  }

  const r = await fetchAtinaForBff<Record<string, unknown>>(
    `/api/v1/payments/kriptoman/sync/${paymentId}`,
    session,
    { method: 'POST', body: '{}' },
  );

  if (!r.ok) {
    return clientSafeBffError('sync_failed', r.message, r.status || 502);
  }

  return NextResponse.json({ ok: true, data: r.data });
}
