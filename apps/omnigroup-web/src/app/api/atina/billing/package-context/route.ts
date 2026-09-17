import { NextRequest, NextResponse } from 'next/server';
import { clientSafeBffError } from '@/lib/atina-bff-route-handlers';
import { fetchAtinaPublicJson } from '@/lib/atina-bff';

export async function GET(request: NextRequest) {
  const deliverableId = request.nextUrl.searchParams.get('deliverableId') ?? '';
  const industryCategory = request.nextUrl.searchParams.get('industryCategory') ?? '';
  const qs = new URLSearchParams({ deliverableId, industryCategory });
  const r = await fetchAtinaPublicJson<unknown>(`/api/v1/billing/package-context?${qs.toString()}`, {
    method: 'GET',
  });
  if (!r.ok) {
    return clientSafeBffError('upstream_failed', undefined, r.status);
  }
  return NextResponse.json({ ok: true, data: r.data });
}
