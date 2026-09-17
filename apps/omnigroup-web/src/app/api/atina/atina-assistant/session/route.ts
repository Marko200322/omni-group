import { NextResponse } from 'next/server';
import { clientSafeBffError } from '@/lib/atina-bff-route-handlers';
import { fetchAtinaForBff, fetchAtinaPublicJson } from '@/lib/atina-bff';
import { getServerSession } from '@/lib/auth-session';

type SessionPayload = {
  sessionId?: string;
  audience?: 'public' | 'portal';
  greeting?: unknown;
  agent?: unknown;
};

export async function POST(req: Request) {
  let body: { agentId?: string } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }

  const payload = JSON.stringify(body.agentId ? { agentId: body.agentId } : {});
  const session = await getServerSession();

  if (session && !session.demo) {
    const r = await fetchAtinaForBff<SessionPayload>(
      '/api/v1/video-meetings/support/avatar/session',
      session,
      { method: 'POST', timeoutMs: 45000, body: payload },
    );
    if (!r.ok) {
      return clientSafeBffError('session_failed', r.message, r.status || 502);
    }
    return NextResponse.json(
      { ok: true, data: { ...r.data, audience: r.data?.audience ?? 'portal' } },
      { status: 201 },
    );
  }

  const r = await fetchAtinaPublicJson<SessionPayload>('/api/v1/video-meetings/public/avatar/session', {
    method: 'POST',
    timeoutMs: 45000,
    headers: { 'Content-Type': 'application/json' },
    body: payload,
  });
  if (!r.ok || !r.data) {
    return clientSafeBffError('session_failed', undefined, r.status || 502);
  }
  return NextResponse.json(
    { ok: true, data: { ...r.data, audience: r.data.audience ?? 'public' } },
    { status: 201 },
  );
}
