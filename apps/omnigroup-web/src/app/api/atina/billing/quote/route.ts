import { NextResponse } from 'next/server';
import { clientSafeBffError } from '@/lib/atina-bff-route-handlers';
import { fetchAtinaPublicJson } from '@/lib/atina-bff';

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const r = await fetchAtinaPublicJson<unknown>('/api/v1/billing/quote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!r.ok) {
    return clientSafeBffError('upstream_failed', undefined, r.status);
  }

  return NextResponse.json({ ok: true, data: r.data });
}
