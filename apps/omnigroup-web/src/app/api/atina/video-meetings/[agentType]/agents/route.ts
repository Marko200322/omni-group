import { NextResponse } from 'next/server';
import { fetchAtinaPublicJson } from '@/lib/atina-bff';

export async function GET(_req: Request, ctx: { params: Promise<{ agentType: string }> }) {
  const { agentType } = await ctx.params;
  if (agentType !== 'support' && agentType !== 'sales') {
    return NextResponse.json({ ok: false, error: 'invalid_agent' }, { status: 400 });
  }

  const r = await fetchAtinaPublicJson<unknown>(`/api/v1/video-meetings/${agentType}/agents`);
  if (!r.ok) {
    return NextResponse.json(
      { ok: false, error: r.status === 503 ? 'atina_unreachable' : 'agents_failed' },
      { status: r.status || 502 },
    );
  }
  return NextResponse.json({ ok: true, data: r.data });
}
