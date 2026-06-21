import { NextResponse } from 'next/server';
import { fetchAtinaForBff } from '@/lib/atina-bff';
import { requireAdminSession } from '@/lib/bff-admin-gate';

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  const gate = await requireAdminSession();
  if ('error' in gate) return gate.error;

  const { id } = await params;
  const r = await fetchAtinaForBff<unknown>(
    `/api/v1/resource-procurement/orders/${id}/confirm`,
    gate.session,
    { method: 'POST' },
  );
  if (!r.ok) return NextResponse.json({ ok: false, detail: r.message }, { status: r.status || 502 });
  return NextResponse.json({ ok: true, data: r.data });
}
