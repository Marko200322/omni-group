import { NextResponse } from 'next/server';
import { clientSafeBffError } from '@/lib/atina-bff-route-handlers';
import { fetchAtinaForBff } from '@/lib/atina-bff';
import { getServerSession, isAdminRole } from '@/lib/auth-session';

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session || session.demo) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  if (!isAdminRole(session.user.role)) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }

  const body = (await req.json()) as { prompt?: string };
  const prompt = String(body.prompt ?? '').trim();
  if (prompt.length < 8) {
    return NextResponse.json({ ok: false, error: 'prompt_too_short' }, { status: 400 });
  }

  const r = await fetchAtinaForBff<Record<string, unknown>>('/api/v1/cursor-agent/run', session, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, source: 'mobile' }),
  });

  if (!r.ok) {
    return clientSafeBffError('cursor_run_failed', r.message, r.status || 502);
  }

  return NextResponse.json({ ok: true, data: r.data });
}
