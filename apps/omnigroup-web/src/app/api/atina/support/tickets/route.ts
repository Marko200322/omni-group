import { NextResponse } from 'next/server';
import { fetchAtinaForBff } from '@/lib/atina-bff';
import { getServerSession } from '@/lib/auth-session';

/** GET /api/atina/support/tickets — client support ticket queue. */
export async function GET(req: Request) {
  const session = await getServerSession();
  if (!session || session.demo) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get('page') || '1') || 1);
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit') || '20') || 20));
  const status = url.searchParams.get('status');
  const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (status) qs.set('status', status);

  const r = await fetchAtinaForBff<unknown>(`/api/v1/support/tickets?${qs.toString()}`, session);
  if (!r.ok) {
    return NextResponse.json({ ok: false, error: r.message ?? 'tickets_failed' }, { status: 502 });
  }
  return NextResponse.json({ ok: true, data: r.data, meta: r.meta ?? null });
}

/** POST /api/atina/support/tickets — open a client-visible support ticket. */
export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session || session.demo) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  let body: { subject?: string; message?: string; category?: string } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const r = await fetchAtinaForBff<unknown>('/api/v1/support/tickets', session, {
    method: 'POST',
    body: JSON.stringify({
      subject: body.subject,
      message: body.message,
      category: body.category,
    }),
  });

  if (!r.ok) {
    return NextResponse.json({ ok: false, error: r.message ?? 'ticket_create_failed' }, { status: 502 });
  }
  return NextResponse.json({ ok: true, data: r.data }, { status: 201 });
}
