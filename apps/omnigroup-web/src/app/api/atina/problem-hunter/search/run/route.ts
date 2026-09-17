import { NextRequest, NextResponse } from 'next/server';
import { clientSafeBffError } from '@/lib/atina-bff-route-handlers';
import { fetchAtinaForBff } from '@/lib/atina-bff';
import { requireAdminSession } from '@/lib/bff-admin-gate';

export async function POST(request: NextRequest) {
  const gate = await requireAdminSession();
  if ('error' in gate) return gate.error;
  const { session } = gate;

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const r = await fetchAtinaForBff<unknown>('/api/v1/problem-hunter/search/run', session, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    return clientSafeBffError('problem_hunter_search_failed', r.message, r.status || 502);
  }

  return NextResponse.json({ ok: true, data: r.data });
}
