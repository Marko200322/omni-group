import { NextRequest, NextResponse } from 'next/server';
import { clientSafeBffError } from '@/lib/atina-bff-route-handlers';
import { fetchAtinaPublicJson } from '@/lib/atina-bff';

export async function GET(req: NextRequest) {
  const industryCategory = req.nextUrl.searchParams.get('industryCategory')?.trim() || 'marketing';
  const path = `/api/v1/billing/package-matrix?industryCategory=${encodeURIComponent(industryCategory)}`;
  const r = await fetchAtinaPublicJson<unknown>(path, { method: 'GET' });
  if (!r.ok) {
    return clientSafeBffError('upstream_failed', undefined, r.status);
  }

  return NextResponse.json({ ok: true, data: r.data });
}
