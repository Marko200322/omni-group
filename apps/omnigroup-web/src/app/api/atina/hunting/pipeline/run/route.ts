import { NextRequest, NextResponse } from 'next/server';
import { clientSafeBffError } from '@/lib/atina-bff-route-handlers';
import { fetchAtinaForBff } from '@/lib/atina-bff';
import { requireAdminSession } from '@/lib/bff-admin-gate';

export async function POST(req: NextRequest) {
  const gate = await requireAdminSession();
  if ('error' in gate) return gate.error;
  const { session } = gate;

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  const r = await fetchAtinaForBff<Record<string, unknown>>('/api/v1/client-hunter/pipeline/run', session, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    timeoutMs: 180_000,
  });
  if (!r.ok) {
    return clientSafeBffError('pipeline_failed', r.message, r.status || 502);
  }

  return NextResponse.json({ ok: true, data: r.data });
}
