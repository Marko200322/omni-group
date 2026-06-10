import { NextResponse } from 'next/server';
import { fetchAtinaForBff } from '@/lib/atina-bff';
import { getServerSession } from '@/lib/auth-session';

export async function GET(req: Request) {
  const session = await getServerSession();
  if (!session || session.demo) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  const qs = new URL(req.url).searchParams.toString();
  const path = qs ? `/api/v1/product-factory/projects?${qs}` : '/api/v1/product-factory/projects';
  const r = await fetchAtinaForBff<unknown>(path, session);
  if (!r.ok) {
    return NextResponse.json({ ok: false, error: 'product_factory_list_failed', detail: r.message }, { status: r.status || 502 });
  }
  return NextResponse.json({ ok: true, data: r.data });
}

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session || session.demo) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  const body = await req.text();
  const r = await fetchAtinaForBff<unknown>('/api/v1/product-factory/projects', session, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body || '{}',
  });
  if (!r.ok) {
    return NextResponse.json({ ok: false, error: 'product_factory_create_failed', detail: r.message }, { status: r.status || 502 });
  }
  return NextResponse.json({ ok: true, data: r.data });
}
