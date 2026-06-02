import { NextResponse } from 'next/server';
import { fetchAtinaForBff } from '@/lib/atina-bff';
import { getServerSession } from '@/lib/auth-session';

type RouteParams = { params: Promise<{ slug: string }> };

export async function POST(req: Request, { params }: RouteParams) {
  const session = await getServerSession();
  if (!session || session.demo) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const { slug } = await params;
  let body: Record<string, unknown> = { intensity: 50 };
  try {
    body = { intensity: 50, ...((await req.json()) as Record<string, unknown>) };
  } catch {
    /* empty body ok */
  }

  const r = await fetchAtinaForBff<Record<string, unknown>>(
    `/api/v1/autonomy-loop/verticals/${encodeURIComponent(slug)}/research`,
    session,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );

  if (!r.ok) {
    return NextResponse.json(
      { ok: false, error: 'research_failed', detail: r.message },
      { status: r.status || 502 },
    );
  }

  return NextResponse.json({ ok: true, data: r.data });
}
