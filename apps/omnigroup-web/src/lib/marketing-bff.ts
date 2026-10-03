import { NextResponse } from 'next/server';
import { clientSafeBffError } from '@/lib/atina-bff-route-handlers';
import { fetchAtinaForBff } from '@/lib/atina-bff';
import { requireAdminSession } from '@/lib/bff-admin-gate';

const UPSTREAM_BASE = '/api/v1/marketing';

export async function marketingBffGet(path: string) {
  const gate = await requireAdminSession();
  if ('error' in gate) return gate.error;
  const { session } = gate;

  const r = await fetchAtinaForBff<unknown>(`${UPSTREAM_BASE}${path}`, session, { method: 'GET' });
  if (!r.ok) {
    return clientSafeBffError('marketing_unavailable', r.message, r.status || 502);
  }
  return NextResponse.json({ ok: true, data: r.data, meta: r.meta ?? null });
}

export async function marketingBffPost(path: string, req: Request) {
  const gate = await requireAdminSession();
  if ('error' in gate) return gate.error;
  const { session } = gate;

  let body: string | undefined;
  try {
    body = JSON.stringify(await req.json());
  } catch {
    body = '{}';
  }

  const r = await fetchAtinaForBff<unknown>(`${UPSTREAM_BASE}${path}`, session, {
    method: 'POST',
    body,
    headers: { 'Content-Type': 'application/json' },
  });

  if (!r.ok) {
    return clientSafeBffError('marketing_unavailable', r.message, r.status || 502);
  }
  return NextResponse.json({ ok: true, data: r.data });
}
