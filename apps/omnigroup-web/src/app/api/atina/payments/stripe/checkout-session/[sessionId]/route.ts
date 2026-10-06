import { NextResponse } from 'next/server';
import { clientSafeBffError } from '@/lib/atina-bff-route-handlers';
import { fetchAtinaForBff } from '@/lib/atina-bff';
import { getServerSession } from '@/lib/auth-session';

type CheckoutSessionStatus = {
  state?: string;
  message?: string;
  paymentStatus?: string;
  sessionStatus?: string;
  livemode?: boolean;
  localPaymentStatus?: string | null;
  purchaseType?: string | null;
  planSlug?: string | null;
  deliverableId?: string | null;
  paymentId?: string | null;
  sessionId?: string;
};

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ sessionId: string }> | { sessionId: string } },
) {
  const session = await getServerSession();
  if (!session || session.demo) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const params = await Promise.resolve(ctx.params);
  const sessionId = params.sessionId?.trim() ?? '';
  if (!/^cs_[a-zA-Z0-9_]+$/.test(sessionId)) {
    return NextResponse.json({ ok: false, error: 'invalid_session_id' }, { status: 400 });
  }

  const r = await fetchAtinaForBff<CheckoutSessionStatus>(
    `/api/v1/payments/stripe/checkout-session/${encodeURIComponent(sessionId)}`,
    session,
    { method: 'GET' },
  );

  if (!r.ok) {
    return clientSafeBffError('checkout_session_status_failed', r.message, r.status || 502);
  }

  return NextResponse.json({ ok: true, data: r.data });
}
