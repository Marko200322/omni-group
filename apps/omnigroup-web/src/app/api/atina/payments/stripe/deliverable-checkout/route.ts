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
    marketIntensity?: number;
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

  const r = await fetchAtinaForBff<{ sessionId?: string; url?: string | null; paymentId?: string }>(
    '/api/v1/payments/stripe/deliverable-checkout',
    session,
    {
      method: 'POST',
      body: JSON.stringify({
        deliverableId,
        ...(industryCategory ? { industryCategory } : {}),
        ...(typeof body.marketIntensity === 'number' ? { marketIntensity: body.marketIntensity } : {}),
      }),
    },
  );

  if (!r.ok) {
    return clientSafeBffError('stripe_deliverable_checkout_failed', r.message, r.status || 502);
  }

  return NextResponse.json({ ok: true, data: r.data });
}
