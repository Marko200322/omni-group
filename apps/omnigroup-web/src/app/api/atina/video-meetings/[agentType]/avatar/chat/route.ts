import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth-session';
import { fetchAtinaForBff } from '@/lib/atina-bff';

type AgentType = 'support' | 'sales';

export async function POST(req: Request, ctx: { params: Promise<{ agentType: string }> }) {
  const { agentType: raw } = await ctx.params;
  const agentType = raw as AgentType;
  if (agentType !== 'support' && agentType !== 'sales') {
    return NextResponse.json({ ok: false, error: 'invalid_agent' }, { status: 400 });
  }

  const session = await getServerSession();
  if (!session || session.demo) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  let body: { sessionId?: string; message?: string } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  if (!body.sessionId || !body.message?.trim()) {
    return NextResponse.json({ ok: false, error: 'invalid_body' }, { status: 400 });
  }

  const r = await fetchAtinaForBff<Record<string, unknown>>(
    `/api/v1/video-meetings/${agentType}/avatar/chat`,
    session,
    {
      method: 'POST',
      body: JSON.stringify({ sessionId: body.sessionId, message: body.message.trim() }),
    },
  );

  if (!r.ok) {
    return NextResponse.json(
      { ok: false, error: 'chat_failed', detail: r.message },
      { status: r.status || 502 },
    );
  }

  return NextResponse.json({ ok: true, data: r.data });
}
