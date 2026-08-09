import { NextResponse } from 'next/server';
import { clientSafeBffError } from '@/lib/atina-bff-route-handlers';
import { fetchAtinaForBff } from '@/lib/atina-bff';
import { getServerSession, isAdminRole } from '@/lib/auth-session';

async function requireAdmin() {
  const session = await getServerSession();
  if (!session || session.demo) return { error: NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 }) };
  if (!isAdminRole(session.user.role)) {
    return { error: NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 }) };
  }
  return { session };
}

export async function GET() {
  const gate = await requireAdmin();
  if ('error' in gate) return gate.error;
  const r = await fetchAtinaForBff<{ items: unknown[] }>(
    '/api/v1/resource-procurement/catalog',
    gate.session,
    { method: 'GET' }
  );
  if (!r.ok) return clientSafeBffError('upstream_failed', r.message, r.status || 502);
  return NextResponse.json({ ok: true, data: r.data });
}
