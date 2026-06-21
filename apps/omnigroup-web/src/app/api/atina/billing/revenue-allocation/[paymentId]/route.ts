import { NextResponse } from 'next/server';
import { fetchAtinaForBff } from '@/lib/atina-bff';
import { getServerSession, isAdminRole } from '@/lib/auth-session';

type Params = { params: Promise<{ paymentId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const session = await getServerSession();
  if (!session || session.demo) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  if (!isAdminRole(session.user.role)) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }

  const { paymentId } = await params;
  const r = await fetchAtinaForBff<unknown>(
    `/api/v1/billing/revenue-allocation/${paymentId}`,
    session,
  );
  if (!r.ok) {
    return NextResponse.json({ ok: false, detail: r.message }, { status: r.status || 502 });
  }
  return NextResponse.json({ ok: true, data: r.data });
}
