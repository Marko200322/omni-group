import { NextResponse } from 'next/server';
import { fetchAtinaForBff } from '@/lib/atina-bff';
import { requireAdminSession } from '@/lib/bff-admin-gate';

type RouteParams = { params: Promise<{ category: string }> };

export async function POST(req: Request, { params }: RouteParams) {
  const gate = await requireAdminSession();
  if ('error' in gate) return gate.error;
  const { session } = gate;

  const { category } = await params;
  let body: Record<string, unknown> = { mode: 'generate', limit: 25, processAllVerticals: true };
  try {
    body = { mode: 'generate', limit: 25, processAllVerticals: true, ...((await req.json()) as Record<string, unknown>) };
  } catch {
    /* empty body ok */
  }

  const r = await fetchAtinaForBff<Record<string, unknown>>(
    `/api/v1/autonomy-loop/categories/${encodeURIComponent(category)}/batch`,
    session,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );

  if (!r.ok) {
    return NextResponse.json(
      { ok: false, error: 'category_batch_failed', detail: r.message },
      { status: r.status || 502 },
    );
  }

  return NextResponse.json({ ok: true, data: r.data });
}
