import { NextResponse } from 'next/server';
import { clientSafeBffError } from '@/lib/atina-bff-route-handlers';
import { fetchAtinaForBff } from '@/lib/atina-bff';
import { getServerSession } from '@/lib/auth-session';

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session || session.demo) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  let body: {
    topic?: string;
    description?: string;
    provider?: string;
    scheduledAt?: string;
    durationMinutes?: number;
    hostType?: string;
    agentId?: string;
    liveProvider?: string;
  } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const topic = typeof body.topic === 'string' ? body.topic.trim() : '';
  if (topic.length < 3) {
    return NextResponse.json({ ok: false, error: 'invalid_topic' }, { status: 400 });
  }

  const provider =
    body.provider === 'zoom' || body.provider === 'google_meet' || body.provider === 'manual'
      ? body.provider
      : 'manual';

  const hostType = body.hostType === 'ai_avatar' ? 'ai_avatar' : 'human';

  const r = await fetchAtinaForBff<Record<string, unknown>>(
    '/api/v1/video-meetings/support/book',
    session,
    {
      method: 'POST',
      body: JSON.stringify({
        topic,
        description: typeof body.description === 'string' ? body.description.trim() : undefined,
        provider,
        scheduledAt: typeof body.scheduledAt === 'string' ? body.scheduledAt : undefined,
        durationMinutes:
          typeof body.durationMinutes === 'number' ? body.durationMinutes : undefined,
        hostType,
        agentId: typeof body.agentId === 'string' ? body.agentId : undefined,
        liveProvider:
          body.liveProvider === 'heygen' ||
          body.liveProvider === 'd-id' ||
          body.liveProvider === 'stub'
            ? body.liveProvider
            : hostType === 'ai_avatar'
              ? 'auto'
              : undefined,
      }),
    },
  );

  if (!r.ok) {
    return clientSafeBffError('book_failed', r.message, r.status || 502);
  }

  return NextResponse.json({ ok: true, data: r.data });
}
