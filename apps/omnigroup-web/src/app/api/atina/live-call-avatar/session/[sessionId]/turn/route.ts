import { NextResponse } from 'next/server';
import { clientSafeBffError } from '@/lib/atina-bff-route-handlers';
import { fetchAtinaForBff } from '@/lib/atina-bff';
import { getServerSession } from '@/lib/auth-session';

export async function POST(req: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await ctx.params;
  const session = await getServerSession();
  if (!session || session.demo) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  let body: { message?: string } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (message.length < 1) {
    return NextResponse.json({ ok: false, error: 'invalid_message' }, { status: 400 });
  }

  const r = await fetchAtinaForBff<Record<string, unknown>>(
    `/api/v1/live-call-avatar/session/${sessionId}/turn`,
    session,
    {
      method: 'POST',
      timeoutMs: 60000,
      body: JSON.stringify({ message }),
    },
  );

  if (!r.ok) {
    return clientSafeBffError('turn_failed', r.message, r.status || 502);
  }

  return NextResponse.json({ ok: true, data: r.data });
}
