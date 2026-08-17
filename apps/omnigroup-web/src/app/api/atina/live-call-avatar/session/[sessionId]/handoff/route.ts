import { NextResponse } from 'next/server';
import { clientSafeBffError } from '@/lib/atina-bff-route-handlers';
import { fetchAtinaForBff } from '@/lib/atina-bff';
import { getServerSession } from '@/lib/auth-session';

export async function POST(_req: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await ctx.params;
  const session = await getServerSession();
  if (!session || session.demo) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const r = await fetchAtinaForBff<Record<string, unknown>>(
    `/api/v1/live-call-avatar/session/${sessionId}/handoff`,
    session,
    { method: 'POST', body: JSON.stringify({}) },
  );

  if (!r.ok) {
    return clientSafeBffError('handoff_failed', r.message, r.status || 502);
  }
  return NextResponse.json({ ok: true, data: r.data });
}
