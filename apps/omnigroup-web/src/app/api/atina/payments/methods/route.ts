import { NextResponse } from 'next/server';
import { clientSafeBffError } from '@/lib/atina-bff-route-handlers';
import { fetchAtinaPublicJson } from '@/lib/atina-bff';

export async function GET() {
  const r = await fetchAtinaPublicJson<{ mode?: string; methods?: unknown[] }>(
    '/api/v1/payments/methods',
    { method: 'GET' },
  );

  if (!r.ok) {
    return clientSafeBffError('methods_failed', undefined, r.status);
  }

  return NextResponse.json({ ok: true, data: r.data });
}
