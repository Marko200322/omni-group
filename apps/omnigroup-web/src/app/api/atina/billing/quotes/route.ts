import { NextResponse } from 'next/server';
import { clientSafeBffError } from '@/lib/atina-bff-route-handlers';
import { fetchAtinaPublicJson } from '@/lib/atina-bff';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const qs = url.searchParams.toString();
  const path = `/api/v1/billing/quotes${qs ? `?${qs}` : ''}`;

  const r = await fetchAtinaPublicJson<unknown>(path, { method: 'GET' });
  if (!r.ok) {
    return clientSafeBffError('upstream_failed', undefined, r.status);
  }

  return NextResponse.json({ ok: true, data: r.data });
}
