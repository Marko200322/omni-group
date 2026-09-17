import { NextResponse } from 'next/server';
import { clientSafeBffError } from '@/lib/atina-bff-route-handlers';
import { fetchAtinaForBff } from '@/lib/atina-bff';
import { getServerSession } from '@/lib/auth-session';

export async function GET(req: Request) {
  const session = await getServerSession();
  if (!session || session.demo) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  const qs = new URL(req.url).searchParams.toString();
  const path = qs ? `/api/v1/billing/fulfillment/jobs?${qs}` : '/api/v1/billing/fulfillment/jobs';
  const r = await fetchAtinaForBff<{ jobs?: unknown[] }>(path, session);
  if (!r.ok) {
    return clientSafeBffError('fulfillment_list_failed', r.message, r.status || 502);
  }
  return NextResponse.json({ ok: true, data: r.data });
}
