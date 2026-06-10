import { NextResponse } from 'next/server';
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
    marketIntensity?: number;
  } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  if (!body.deliverableId?.trim()) {
    return NextResponse.json({ ok: false, error: 'invalid_deliverable' }, { status: 400 });
  }

  const r = await fetchAtinaForBff<Record<string, unknown>>(
    '/api/v1/payments/manual/deliverable-checkout',
    session,
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
  );

  if (!r.ok) {
    return NextResponse.json(
      { ok: false, error: 'checkout_failed', detail: r.message },
      { status: r.status || 502 },
    );
  }

  return NextResponse.json({ ok: true, data: r.data });
}
