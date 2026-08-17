import { NextResponse } from 'next/server';
import { fetchAtinaPublicJson } from '@/lib/atina-bff';

export async function GET() {
  const r = await fetchAtinaPublicJson<unknown>('/api/v1/live-call-avatar/status');
  if (!r.ok) {
    return NextResponse.json({ ok: false, error: 'status_failed' }, { status: r.status || 502 });
  }
  return NextResponse.json({ ok: true, data: r.data });
}
