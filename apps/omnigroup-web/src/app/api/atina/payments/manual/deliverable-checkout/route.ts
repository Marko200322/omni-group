import { NextResponse } from 'next/server';
import { clientSafeBffError } from '@/lib/atina-bff-route-handlers';
import { fetchAtinaForBff } from '@/lib/atina-bff';
import { getServerSession } from '@/lib/auth-session';

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session || session.demo) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  let body: {
    deliverableId?: string;
    industryCategory?: string;
    paymentProvider?: string;
    maintenanceTierId?: string;
  } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const deliverableId = typeof body.deliverableId === 'string' ? body.deliverableId.trim() : '';
  if (!/^[a-z0-9_-]+$/.test(deliverableId)) {
    return NextResponse.json({ ok: false, error: 'invalid_deliverable' }, { status: 400 });
  }

  const industryCategory =
    typeof body.industryCategory === 'string' && /^[a-z0-9_-]+$/.test(body.industryCategory)
      ? body.industryCategory
      : undefined;

  const r = await fetchAtinaForBff<Record<string, unknown>>(
    '/api/v1/payments/manual/deliverable-checkout',
    session,
    {
      method: 'POST',
      body: JSON.stringify({
        deliverableId,
        paymentProvider: 'manual',
        ...(industryCategory ? { industryCategory } : {}),
        ...(typeof body.maintenanceTierId === 'string' ? { maintenanceTierId: body.maintenanceTierId } : {}),
      }),
    },
  );

  if (!r.ok) {
    return clientSafeBffError('checkout_failed', r.message, r.status || 502);
  }

  return NextResponse.json({ ok: true, data: r.data });
}
