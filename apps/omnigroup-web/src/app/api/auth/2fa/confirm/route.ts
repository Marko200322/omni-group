import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth-session';
import { fetchAtinaForBff } from '@/lib/atina-bff';

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session || session.demo) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  let body: { code?: string } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }
  const code = typeof body.code === 'string' ? body.code.trim() : '';
  if (!code) {
    return NextResponse.json({ ok: false, error: 'code_required' }, { status: 400 });
  }

  const r = await fetchAtinaForBff<{ enabled?: boolean; backupCodes?: string[] }>(
    '/api/v1/auth/2fa/confirm',
    session,
    { method: 'POST', body: JSON.stringify({ code }) },
  );
  if (!r.ok) {
    return NextResponse.json(
      { ok: false, error: r.message ?? 'two_factor_confirm_failed' },
      { status: r.status || 400 },
    );
  }
  return NextResponse.json({
    ok: true,
    enabled: true,
    backupCodes: Array.isArray(r.data?.backupCodes) ? r.data.backupCodes : [],
  });
}
