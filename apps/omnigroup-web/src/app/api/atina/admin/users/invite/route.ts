import { NextResponse } from 'next/server';
import { fetchAtinaForBff } from '@/lib/atina-bff';
import { getServerSession, isAdminRole } from '@/lib/auth-session';
import type { AtinaInviteClientResult } from '@/lib/atina-live-types';

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session || session.demo) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  if (!isAdminRole(session.user.role)) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const r = await fetchAtinaForBff<AtinaInviteClientResult>(
    '/api/v1/admin/users/invite',
    session,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );

  if (!r.ok) {
    return NextResponse.json(
      { ok: false, error: 'invite_failed', detail: r.message },
      { status: r.status || 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    data: r.data,
    message: r.message ?? 'Client invited',
  });
}
