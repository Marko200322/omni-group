import { NextResponse } from 'next/server';
import { fetchAtinaForBff } from '@/lib/atina-bff';
import { getServerSession, isAdminRole } from '@/lib/auth-session';

type ContactRow = {
  id?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  company?: string;
  status?: string;
  source?: string;
  created_at?: string;
};

function unwrapContacts(payload: unknown): ContactRow[] {
  if (Array.isArray(payload)) return payload as ContactRow[];
  if (payload && typeof payload === 'object') {
    const root = payload as { data?: ContactRow[] | { data?: ContactRow[] } };
    if (Array.isArray(root.data)) return root.data;
    if (root.data && Array.isArray(root.data.data)) return root.data.data;
  }
  return [];
}

export async function GET(req: Request) {
  const session = await getServerSession();
  if (!session || session.demo) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  if (!isAdminRole(session.user.role)) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }

  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get('page') ?? '1') || 1);
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit') ?? '10') || 10));
  const search = url.searchParams.get('search')?.trim() ?? '';
  const status = url.searchParams.get('status')?.trim() ?? '';

  const qs = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (search) qs.set('search', search);
  if (status) qs.set('status', status);

  const r = await fetchAtinaForBff<unknown>(`/api/v1/crm/contacts?${qs}`, session, { method: 'GET' });

  if (!r.ok) {
    return NextResponse.json(
      { ok: false, error: 'crm_list_failed', detail: r.message },
      { status: r.status || 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    data: unwrapContacts(r.data),
    meta: r.meta ?? { page, limit },
  });
}

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

  const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : '';
  if (!firstName) {
    return NextResponse.json({ ok: false, error: 'first_name_required' }, { status: 400 });
  }

  const payload = {
    firstName,
    lastName: typeof body.lastName === 'string' ? body.lastName.trim() : undefined,
    email: typeof body.email === 'string' ? body.email.trim() : undefined,
    phone: typeof body.phone === 'string' ? body.phone.trim() : undefined,
    company: typeof body.company === 'string' ? body.company.trim() : undefined,
    status: body.status === 'prospect' || body.status === 'customer' ? body.status : 'lead',
    source: typeof body.source === 'string' ? body.source.slice(0, 50) : 'dashboard',
    notes: typeof body.notes === 'string' ? body.notes.slice(0, 5000) : undefined,
  };

  const r = await fetchAtinaForBff<ContactRow>('/api/v1/crm/contacts', session, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (!r.ok) {
    return NextResponse.json(
      { ok: false, error: 'crm_create_failed', detail: r.message },
      { status: r.status || 502 },
    );
  }

  return NextResponse.json({ ok: true, data: r.data }, { status: 201 });
}
