import { NextResponse } from 'next/server';
import { clientSafeBffError } from '@/lib/atina-bff-route-handlers';
import { fetchAtinaForBff } from '@/lib/atina-bff';
import { requireAdminSession } from '@/lib/bff-admin-gate';

export async function GET() {
  const gate = await requireAdminSession();
  if ('error' in gate) return gate.error;
  const { session } = gate;
  const r = await fetchAtinaForBff<unknown>('/api/v1/product-factory/stats', session);
  if (!r.ok) {
    return clientSafeBffError('product_factory_stats_failed', r.message, r.status || 502);
  }
  return NextResponse.json({ ok: true, data: r.data });
}
