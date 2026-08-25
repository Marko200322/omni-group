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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const r = await fetchAtinaForBff<unknown>('/api/v1/crm/contacts/bulk', session, {
    method: 'POST',
    body: JSON.stringify(body ?? {}),
  });

  if (!r.ok) {
    return clientSafeBffError('crm_bulk_failed', r.message, r.status || 502);
  }

  return NextResponse.json({ ok: true, data: r.data }, { status: 201 });
}
