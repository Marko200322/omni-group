import { NextResponse } from 'next/server';
import { clientSafeBffError } from '@/lib/atina-bff-route-handlers';
import { fetchAtinaPublicJson } from '@/lib/atina-bff';
import type { DeliverableIntroPromoPublic } from '@/lib/deliverable-intro-promo-public';

export async function GET() {
  const r = await fetchAtinaPublicJson<DeliverableIntroPromoPublic>(
    '/api/v1/payments/deliverable-intro-promo',
    { method: 'GET' },
  );

  if (!r.ok || !r.data) {
    return clientSafeBffError('deliverable_intro_promo_failed', undefined, r.status);
  }

  return NextResponse.json({ ok: true, data: r.data });
}
