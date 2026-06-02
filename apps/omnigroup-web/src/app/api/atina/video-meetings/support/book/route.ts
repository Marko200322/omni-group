import { NextResponse } from 'next/server';
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
      }),
    },
  );

  if (!r.ok) {
    return NextResponse.json(
      { ok: false, error: 'book_failed', detail: r.message },
      { status: r.status || 502 },
    );
  }

  return NextResponse.json({ ok: true, data: r.data });
}
