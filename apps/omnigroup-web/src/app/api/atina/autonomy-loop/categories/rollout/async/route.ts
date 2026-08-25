import { NextResponse } from 'next/server';
import { clientSafeBffError } from '@/lib/atina-bff-route-handlers';
import { fetchAtinaForBff } from '@/lib/atina-bff';
import { requireAdminSession } from '@/lib/bff-admin-gate';

export async function POST(req: Request) {
  const gate = await requireAdminSession();
  if ('error' in gate) return gate.error;
  const { session } = gate;

  let body: Record<string, unknown> = {
    mode: 'full',
    limit: 8,
    maxCategories: 1,
    processAllVerticals: true,
  };
  try {
    body = {
      mode: 'full',
      limit: 8,
      maxCategories: 1,
      processAllVerticals: true,
      ...((await req.json()) as Record<string, unknown>),
    };
  } catch {
    /* empty body ok */
  }

  const r = await fetchAtinaForBff<Record<string, unknown>>(
    '/api/v1/autonomy-loop/categories/rollout/async',
    session,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );

  if (!r.ok) {
    return clientSafeBffError('category_rollout_async_failed', r.message, r.status || 502);
  }

  return NextResponse.json({ ok: true, data: r.data });
}
