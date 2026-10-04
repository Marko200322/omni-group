import { NextRequest, NextResponse } from 'next/server';
import { clientSafeBffError } from '@/lib/atina-bff-route-handlers';
import { fetchAtinaForBff } from '@/lib/atina-bff';
import { requireAdminSession } from '@/lib/bff-admin-gate';

export async function GET(request: NextRequest) {
  const gate = await requireAdminSession();
  if ('error' in gate) return gate.error;
  const { session } = gate;

  const qs = request.nextUrl.searchParams.toString();
  const path = qs ? `/api/v1/problem-hunter/signals?${qs}` : '/api/v1/problem-hunter/signals';
  const r = await fetchAtinaForBff<unknown>(path, session);
  if (!r.ok) {
    return clientSafeBffError('problem_hunter_signals_failed', r.message, r.status || 502);
  }

  return NextResponse.json({ ok: true, data: r.data });
}
