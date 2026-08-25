import { NextResponse } from 'next/server';
import { clientSafeBffError } from '@/lib/atina-bff-route-handlers';
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
  if (!r.ok) return clientSafeBffError('upstream_failed', r.message, r.status || 502);
  return NextResponse.json({ ok: true, data: r.data });
}
