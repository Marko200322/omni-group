import { NextResponse } from 'next/server';
import { clientSafeBffError } from '@/lib/atina-bff-route-handlers';
import { fetchAtinaPublicJson } from '@/lib/atina-bff';
import type { FoundingPromoPublic } from '@/lib/founding-promo-public';

export async function GET() {
  const r = await fetchAtinaPublicJson<FoundingPromoPublic>('/api/v1/payments/founding-promo', {
    method: 'GET',
  });

  if (!r.ok || !r.data) {
    return clientSafeBffError('founding_promo_failed', undefined, r.status);
  }

  return NextResponse.json({ ok: true, data: r.data });
}
