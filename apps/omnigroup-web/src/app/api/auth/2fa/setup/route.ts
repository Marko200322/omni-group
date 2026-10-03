import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth-session';
import { fetchAtinaForBff } from '@/lib/atina-bff';

export async function POST() {
  const session = await getServerSession();
  if (!session || session.demo) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const r = await fetchAtinaForBff<{ secret?: string; otpauthUrl?: string }>(
    '/api/v1/auth/2fa/setup',
    session,
    { method: 'POST', body: JSON.stringify({}) },
  );
  if (!r.ok || !r.data?.secret || !r.data.otpauthUrl) {
    return NextResponse.json(
      { ok: false, error: r.message ?? 'two_factor_setup_failed' },
      { status: r.status || 400 },
    );
  }
  return NextResponse.json({ ok: true, secret: r.data.secret, otpauthUrl: r.data.otpauthUrl });
}
