import { NextResponse } from 'next/server';
import { fetchAtinaPublicJson } from '@/lib/atina-bff';

export async function GET() {
  const r = await fetchAtinaPublicJson<unknown>('/api/v1/video-meetings/support/methods');
  if (!r.ok) {
    return NextResponse.json(
      { ok: false, error: r.status === 503 ? 'atina_unreachable' : 'methods_failed' },
      { status: r.status || 502 },
    );
  }
  return NextResponse.json({ ok: true, data: r.data });
}
