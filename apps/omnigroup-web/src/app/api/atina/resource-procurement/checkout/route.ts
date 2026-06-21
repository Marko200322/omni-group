import { NextResponse } from 'next/server';
import { fetchAtinaForBff } from '@/lib/atina-bff';
import { getServerSession, isAdminRole } from '@/lib/auth-session';

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session || session.demo) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  if (!isAdminRole(session.user.role)) return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });

  const body = (await req.json()) as { items?: Array<{ sku: string; qty: number }> };
  const r = await fetchAtinaForBff<unknown>(
    '/api/v1/resource-procurement/orders/checkout',
    session,
    {
      method: 'POST',
      body: JSON.stringify({ items: body.items ?? [] }),
    }
  );
  if (!r.ok) return NextResponse.json({ ok: false, detail: r.message }, { status: r.status || 502 });
  return NextResponse.json({ ok: true, data: r.data });
}
