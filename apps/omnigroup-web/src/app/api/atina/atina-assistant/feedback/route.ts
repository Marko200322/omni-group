import { NextResponse } from 'next/server';
import { clientSafeBffError } from '@/lib/atina-bff-route-handlers';
import { fetchAtinaForBff, fetchAtinaPublicJson } from '@/lib/atina-bff';
import { getServerSession } from '@/lib/auth-session';

type FeedbackPayload = {
  ok?: boolean;
  feedbackId?: string;
  sessionId?: string;
  rating?: 'up' | 'down';
};

export async function POST(req: Request) {
  let body: { sessionId?: string; messageId?: string; rating?: string; note?: string } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : '';
  const rating = body.rating === 'up' || body.rating === 'down' ? body.rating : null;
  if (!sessionId || !rating) {
    return NextResponse.json({ ok: false, error: 'invalid_body' }, { status: 400 });
  }

  const payload = JSON.stringify({
    sessionId,
    rating,
    messageId: typeof body.messageId === 'string' ? body.messageId : undefined,
    note: typeof body.note === 'string' ? body.note.slice(0, 500) : undefined,
  });
  const session = await getServerSession();

  if (session && !session.demo) {
    const r = await fetchAtinaForBff<FeedbackPayload>(
      '/api/v1/video-meetings/support/avatar/feedback',
      session,
      { method: 'POST', timeoutMs: 15000, body: payload },
    );
    if (!r.ok) {
      return clientSafeBffError('feedback_failed', r.message, r.status || 502);
    }
    return NextResponse.json({ ok: true, data: r.data });
  }

  const r = await fetchAtinaPublicJson<FeedbackPayload>('/api/v1/video-meetings/public/avatar/feedback', {
    method: 'POST',
    timeoutMs: 15000,
    headers: { 'Content-Type': 'application/json' },
    body: payload,
  });
  if (!r.ok || !r.data) {
    return clientSafeBffError('feedback_failed', undefined, r.status || 502);
  }
  return NextResponse.json({ ok: true, data: r.data });
}
