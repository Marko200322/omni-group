import { NextResponse } from 'next/server';
import { fetchAtinaForBff } from '@/lib/atina-bff';
import { requireAdminSession } from '@/lib/bff-admin-gate';

type Params = { params: { id: string } };

export async function POST(_req: Request, { params }: Params) {
  const gate = await requireAdminSession();
  if ('error' in gate) return gate.error;
  const { session } = gate;
  const r = await fetchAtinaForBff<unknown>(
    `/api/v1/product-factory/projects/${encodeURIComponent(params.id)}/build`,
    session,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' },
  );
  if (!r.ok) {
    return NextResponse.json({ ok: false, error: 'product_factory_build_failed', detail: r.message }, { status: r.status || 502 });
  }
  return NextResponse.json({ ok: true, data: r.data });
}
