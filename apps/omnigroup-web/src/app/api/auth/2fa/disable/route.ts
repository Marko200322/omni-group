import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth-session';
import { fetchAtinaForBff } from '@/lib/atina-bff';

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session || session.demo) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  let body: { password?: string; code?: string } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }
  const password = typeof body.password === 'string' ? body.password : '';
  const code = typeof body.code === 'string' ? body.code.trim() : '';
  if (!password || !code) {
    return NextResponse.json({ ok: false, error: 'password_and_code_required' }, { status: 400 });
  }

  const r = await fetchAtinaForBff<{ enabled?: boolean }>(
    '/api/v1/auth/2fa/disable',
    session,
    { method: 'POST', body: JSON.stringify({ password, code }) },
  );
  if (!r.ok) {
    return NextResponse.json(
      { ok: false, error: r.message ?? 'two_factor_disable_failed' },
      { status: r.status || 400 },
    );
  }
  return NextResponse.json({ ok: true, enabled: false });
}
