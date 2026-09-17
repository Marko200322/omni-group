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
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const topic = typeof body.topic === 'string' ? body.topic.trim() : '';
  if (topic.length < 3) {
    return NextResponse.json({ ok: false, error: 'invalid_topic' }, { status: 400 });
  }

  const provider = body.provider === 'google_meet' ? 'google_meet' : 'zoom';

  const r = await fetchAtinaForBff<Record<string, unknown>>(
    '/api/v1/live-call-avatar/book',
    session,
    {
      method: 'POST',
      timeoutMs: 60000,
      body: JSON.stringify({
        topic,
        description: typeof body.description === 'string' ? body.description.trim() : undefined,
        provider,
        agentId: typeof body.agentId === 'string' ? body.agentId : 'mila',
        agentType: body.agentType === 'sales' ? 'sales' : 'support',
        liveProvider:
          body.liveProvider === 'heygen' ||
          body.liveProvider === 'd-id' ||
          body.liveProvider === 'stub'
            ? body.liveProvider
            : 'auto',
        scheduledAt: typeof body.scheduledAt === 'string' ? body.scheduledAt : undefined,
        durationMinutes:
          typeof body.durationMinutes === 'number' ? body.durationMinutes : undefined,
      }),
    },
  );

  if (!r.ok) {
    return clientSafeBffError('book_failed', r.message, r.status || 502);
  }

  const data = r.data ?? {};
  const joinUrl =
    (data.joinUrl as string | undefined) ??
    (data.meeting as { meeting_url?: string } | undefined)?.meeting_url;

  return NextResponse.json(
    {
      ok: true,
      data: {
        ...data,
        joinUrl,
        liveSession: data.liveSession,
      },
    },
    { status: 201 },
  );
}
