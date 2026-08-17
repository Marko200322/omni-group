import { NextResponse } from 'next/server';
import { clientSafeBffError } from '@/lib/atina-bff-route-handlers';
import { fetchAtinaForBff } from '@/lib/atina-bff';
import { getServerSession } from '@/lib/auth-session';

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session || session.demo) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  const r = await fetchAtinaForBff<Record<string, unknown>>(
    '/api/v1/live-call-avatar/session',
    session,
    {
      method: 'POST',
      timeoutMs: 45000,
      body: JSON.stringify(body),
    },
  );

  if (!r.ok) {
    return clientSafeBffError('session_failed', r.message, r.status || 502);
  }

  return NextResponse.json({ ok: true, data: r.data }, { status: 201 });
}
