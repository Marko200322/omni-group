import { NextResponse } from 'next/server';
import { fetchAtinaForBff } from '@/lib/atina-bff';
import { requireAdminSession } from '@/lib/bff-admin-gate';

export async function GET() {
  const gate = await requireAdminSession();
  if ('error' in gate) return gate.error;
  const { session } = gate;
  const r = await fetchAtinaForBff<unknown>('/api/v1/product-factory/stats', session);
  if (!r.ok) {
    return NextResponse.json({ ok: false, error: 'product_factory_stats_failed', detail: r.message }, { status: r.status || 502 });
  }
  return NextResponse.json({ ok: true, data: r.data });
}
