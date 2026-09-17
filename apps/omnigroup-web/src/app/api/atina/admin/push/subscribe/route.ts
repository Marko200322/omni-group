import { NextResponse } from 'next/server';
import { clientSafeBffError } from '@/lib/atina-bff-route-handlers';
import { fetchAtinaForBff } from '@/lib/atina-bff';
import { getServerSession, isAdminRole } from '@/lib/auth-session';

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session || session.demo || !isAdminRole(session.user.role)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  let body: { endpoint?: string; keys?: { p256dh?: string; auth?: string } } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    return NextResponse.json({ ok: false, error: 'invalid_subscription' }, { status: 400 });
  }

  const r = await fetchAtinaForBff<unknown>('/api/v1/admin/push/subscribe', session, {
    method: 'POST',
    body: JSON.stringify(body),
  });

  if (!r.ok) {
    return clientSafeBffError('subscribe_failed', r.message, r.status || 502);
  }

  return NextResponse.json({ ok: true, data: r.data });
}
