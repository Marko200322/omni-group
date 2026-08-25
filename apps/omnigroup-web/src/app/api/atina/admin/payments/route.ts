import { NextResponse } from 'next/server';
import { clientSafeBffError } from '@/lib/atina-bff-route-handlers';
import { fetchAtinaForBff } from '@/lib/atina-bff';
import { getServerSession, isAdminRole } from '@/lib/auth-session';
import type { AtinaAdminPayment } from '@/lib/atina-live-types';

export async function GET(req: Request) {
  const session = await getServerSession();
  if (!session || session.demo) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  if (!isAdminRole(session.user.role)) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }

  const url = new URL(req.url);
  const page = url.searchParams.get('page') ?? '1';
  const limit = url.searchParams.get('limit') ?? '20';
  const status = url.searchParams.get('status') ?? '';
  const provider = url.searchParams.get('provider') ?? '';

  const params = new URLSearchParams({ page, limit });
  if (status) params.set('status', status);
  if (provider) params.set('provider', provider);

  const r = await fetchAtinaForBff<AtinaAdminPayment[]>(
    `/api/v1/admin/payments?${params.toString()}`,
    session,
    { method: 'GET' },
  );

  if (!r.ok) {
    return clientSafeBffError('payments_list_failed', r.message, r.status || 502);
  }

  return NextResponse.json({
    ok: true,
    data: r.data ?? [],
    meta: r.meta ?? null,
  });
}
