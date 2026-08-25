import { NextRequest, NextResponse } from 'next/server';
import { clientSafeBffError } from '@/lib/atina-bff-route-handlers';
import { fetchAtinaForBff } from '@/lib/atina-bff';
import { requireAdminSession } from '@/lib/bff-admin-gate';

export async function GET(req: NextRequest) {
  const gate = await requireAdminSession();
  if ('error' in gate) return gate.error;
  const { session } = gate;

  const limit = req.nextUrl.searchParams.get('limit') ?? '50';
  const minHeat = req.nextUrl.searchParams.get('minHeat');
  const qs = new URLSearchParams({ limit });
  if (minHeat) qs.set('minHeat', minHeat);

  const r = await fetchAtinaForBff<Record<string, unknown>>(
    `/api/v1/client-hunter/hot-clients?${qs.toString()}`,
    session,
  );
  if (!r.ok) {
    return clientSafeBffError('hot_clients_failed', r.message, r.status || 502);
  }

  return NextResponse.json({ ok: true, data: r.data });
}
