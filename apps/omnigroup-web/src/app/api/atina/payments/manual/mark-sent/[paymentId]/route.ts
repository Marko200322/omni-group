import { NextResponse } from 'next/server';
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
    return NextResponse.json({ ok: false, error: 'payment_id_required' }, { status: 400 });
  }

  const r = await fetchAtinaForBff<null>(
    `/api/v1/payments/manual/mark-sent/${paymentId}`,
    session,
    { method: 'POST', body: JSON.stringify({}) },
  );

  if (!r.ok) {
    return NextResponse.json(
      { ok: false, error: 'mark_sent_failed', detail: r.message },
      { status: r.status || 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
