import { NextResponse } from 'next/server';
import { clientSafeBffError } from '@/lib/atina-bff-route-handlers';
import { fetchAtinaForBff } from '@/lib/atina-bff';
import { getServerSession } from '@/lib/auth-session';
import { parsePlanCheckoutInput } from '@/lib/checkout-bff-input';
import { denyUnlessBillingManage } from '@/lib/checkout-permission';

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session || session.demo) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  const forbidden = denyUnlessBillingManage(session);
  if (forbidden) return forbidden;

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  let checkout;
  try {
    checkout = parsePlanCheckoutInput(body);
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'invalid_checkout' },
      { status: 400 },
    );
  }

  const r = await fetchAtinaForBff<Record<string, unknown>>(
    '/api/v1/payments/kriptoman/checkout',
    session,
    {
      method: 'POST',
      body: JSON.stringify({
        ...checkout,
        ...(typeof body.cryptoCurrency === 'string' ? { cryptoCurrency: body.cryptoCurrency } : {}),
      }),
    },
  );

  if (!r.ok) {
    return clientSafeBffError('checkout_failed', r.message, r.status || 502);
  }

  return NextResponse.json({ ok: true, data: r.data });
}
