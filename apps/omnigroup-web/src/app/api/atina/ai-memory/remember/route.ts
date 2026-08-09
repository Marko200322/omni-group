import { NextResponse } from 'next/server';
import { clientSafeBffError } from '@/lib/atina-bff-route-handlers';
import { fetchAtinaForBff } from '@/lib/atina-bff';
import { getServerSession, isAdminRole } from '@/lib/auth-session';

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session || session.demo) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  if (!isAdminRole(session.user.role)) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }

  let body: { key?: string; value?: Record<string, unknown>; namespace?: string } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const key = typeof body.key === 'string' ? body.key.trim() : '';
  const value = body.value;
  const namespace = typeof body.namespace === 'string' ? body.namespace.trim() : 'global';

  if (key.length < 2) {
    return NextResponse.json({ ok: false, error: 'key_required' }, { status: 400 });
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return NextResponse.json({ ok: false, error: 'value_required' }, { status: 400 });
  }

  const r = await fetchAtinaForBff<{ id?: string; created_at?: string }>(
    '/api/v1/ai-memory/remember',
    session,
    {
      method: 'POST',
      body: JSON.stringify({ key, value, namespace }),
    },
  );

  if (!r.ok) {
    const unreachable = r.message?.includes('fetch') || r.status === 503;
    return clientSafeBffError(
      unreachable ? 'atina_unreachable' : 'remember_failed',
      r.message,
      unreachable ? 503 : r.status || 502,
    );
  }

  return NextResponse.json({ ok: true, data: r.data });
}
