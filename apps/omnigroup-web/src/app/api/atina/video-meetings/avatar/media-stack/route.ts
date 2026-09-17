import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/bff-admin-gate';
import { fetchAtinaAuthenticated } from '@/lib/atina-auth';

export async function GET() {
  const gate = await requireAdminSession();
  if ('error' in gate) return gate.error;

  const r = await fetchAtinaAuthenticated<Record<string, unknown>>(
    '/api/v1/video-meetings/avatar/media-stack',
    gate.session,
  );
  if (!r.ok || !r.data) {
    return NextResponse.json({ ok: false, error: r.message ?? 'media_stack_failed' }, { status: r.status || 502 });
  }
  return NextResponse.json({ ok: true, data: r.data });
}
