import { NextResponse } from 'next/server';
import { clientSafeBffError } from '@/lib/atina-bff-route-handlers';
import { fetchAtinaForBff } from '@/lib/atina-bff';
import { getServerSession } from '@/lib/auth-session';

type Params = { params: { orderId: string } };

export async function POST(_req: Request, { params }: Params) {
  const session = await getServerSession();
  if (!session || session.demo) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const orderId = params.orderId?.trim();
  if (!orderId) {
    return NextResponse.json({ ok: false, error: 'invalid_order' }, { status: 400 });
  }

  const r = await fetchAtinaForBff<unknown>(`/api/v1/payments/paypal/capture/${orderId}`, session, {
    method: 'POST',
  });

  if (!r.ok) {
    return clientSafeBffError('paypal_capture_failed', r.message, r.status || 502);
  }

  return NextResponse.json({ ok: true, data: r.data });
}
