import { NextResponse } from 'next/server';
import { clientSafeBffError } from '@/lib/atina-bff-route-handlers';
import { fetchAtinaForBff, fetchAtinaPublicJson } from '@/lib/atina-bff';
import { getServerSession } from '@/lib/auth-session';

type ChatPayload = {
  sessionId?: string;
  audience?: 'public' | 'portal';
  message?: unknown;
  agent?: unknown;
};

export async function POST(req: Request) {
  let body: { sessionId?: string; message?: string } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : '';
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!sessionId || !message || message.length > 2000) {
    return NextResponse.json({ ok: false, error: 'invalid_body' }, { status: 400 });
  }

  const payload = JSON.stringify({ sessionId, message });
  const session = await getServerSession();

  if (session && !session.demo) {
    const r = await fetchAtinaForBff<ChatPayload>(
      '/api/v1/video-meetings/support/avatar/chat',
      session,
      { method: 'POST', timeoutMs: 45000, body: payload },
    );
    if (!r.ok) {
      return clientSafeBffError('chat_failed', r.message, r.status || 502);
    }
    return NextResponse.json({ ok: true, data: { ...r.data, audience: r.data?.audience ?? 'portal' } });
  }

  const r = await fetchAtinaPublicJson<ChatPayload>('/api/v1/video-meetings/public/avatar/chat', {
    method: 'POST',
    timeoutMs: 45000,
    headers: { 'Content-Type': 'application/json' },
    body: payload,
  });
  if (!r.ok || !r.data) {
    return clientSafeBffError('chat_failed', undefined, r.status || 502);
  }
  return NextResponse.json({ ok: true, data: { ...r.data, audience: r.data.audience ?? 'public' } });
}
