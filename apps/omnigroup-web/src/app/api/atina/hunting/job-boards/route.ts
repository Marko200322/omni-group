import { NextRequest, NextResponse } from 'next/server';
import { fetchAtinaForBff } from '@/lib/atina-bff';
import { requireAdminSession } from '@/lib/bff-admin-gate';

export async function GET(req: NextRequest) {
  const gate = await requireAdminSession();
  if ('error' in gate) return gate.error;
  const { session } = gate;

  const region = req.nextUrl.searchParams.get('region');
  const locale = req.nextUrl.searchParams.get('locale');
  const kind = req.nextUrl.searchParams.get('kind');
  const qs = new URLSearchParams();
  if (region) qs.set('region', region);
  if (locale) qs.set('locale', locale);
  if (kind) qs.set('kind', kind);

  const path = qs.toString()
    ? `/api/v1/client-hunter/job-boards?${qs.toString()}`
    : '/api/v1/client-hunter/job-boards';

  const r = await fetchAtinaForBff<Record<string, unknown>>(path, session);
  if (!r.ok) {
    return NextResponse.json(
      { ok: false, error: 'job_boards_failed', detail: r.message },
      { status: r.status || 502 },
    );
  }

  return NextResponse.json({ ok: true, data: r.data });
}
