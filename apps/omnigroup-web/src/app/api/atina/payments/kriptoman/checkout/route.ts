import { NextResponse } from 'next/server';
import { clientSafeBffError } from '@/lib/atina-bff-route-handlers';
import { fetchAtinaForBff } from '@/lib/atina-bff';
import { getServerSession } from '@/lib/auth-session';

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session || session.demo) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  let body: { planSlug?: string; billingCycle?: string; cryptoCurrency?: string; industryCategory?: string } =
    {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const planSlug = typeof body.planSlug === 'string' ? body.planSlug : '';
  const billingCycle = body.billingCycle === 'yearly' ? 'yearly' : 'monthly';
  const industryCategory =
    typeof body.industryCategory === 'string' && /^[a-z0-9_-]+$/.test(body.industryCategory)
      ? body.industryCategory
      : undefined;
  if (!['starter', 'pro', 'enterprise'].includes(planSlug)) {
    return NextResponse.json({ ok: false, error: 'invalid_plan' }, { status: 400 });
  }

  const r = await fetchAtinaForBff<Record<string, unknown>>(
    '/api/v1/payments/kriptoman/checkout',
    session,
    {
      method: 'POST',
      body: JSON.stringify({
        planSlug,
        billingCycle,
        ...(body.cryptoCurrency ? { cryptoCurrency: body.cryptoCurrency } : {}),
        ...(industryCategory ? { industryCategory } : {}),
      }),
    },
  );

  if (!r.ok) {
    return clientSafeBffError('checkout_failed', r.message, r.status || 502);
  }

  return NextResponse.json({ ok: true, data: r.data });
}
