import { NextResponse } from 'next/server';
import { fetchAtinaForBff } from '@/lib/atina-bff';
import { getServerSession } from '@/lib/auth-session';

export async function GET() {
  const session = await getServerSession();
  if (!session || session.demo) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  const r = await fetchAtinaForBff<{ sites?: unknown[] }>('/api/v1/public-site/client-sites/mine', session);
  if (!r.ok) {
    return NextResponse.json({ ok: false, error: 'client_sites_failed', detail: r.message }, { status: r.status || 502 });
  }
  return NextResponse.json({ ok: true, data: r.data });
}
