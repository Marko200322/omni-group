import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth-session';
import { fetchAtinaForBff } from '@/lib/atina-bff';

type AgentType = 'support' | 'sales';

function proxyPath(agentType: AgentType, suffix: string) {
  return `/api/v1/video-meetings/${agentType}/avatar${suffix}`;
}

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

  let body: { agentId?: string } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }

  const r = await fetchAtinaForBff<Record<string, unknown>>(
    proxyPath(agentType, '/session'),
    session,
    {
      method: 'POST',
      timeoutMs: 45000,
      body: JSON.stringify(body.agentId ? { agentId: body.agentId } : {}),
    },
  );

  if (!r.ok) {
    return NextResponse.json(
      { ok: false, error: 'session_failed', detail: r.message },
      { status: r.status || 502 },
    );
  }

  return NextResponse.json({ ok: true, data: r.data }, { status: 201 });
}
