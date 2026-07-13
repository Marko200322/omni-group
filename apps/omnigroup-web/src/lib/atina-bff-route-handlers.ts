import { NextResponse } from 'next/server';

import { fetchAtinaForBff } from './atina-bff';
import { getServerSession, isAdminRole } from './auth-session';

export async function bffRequireSession() {
  const session = await getServerSession();
  if (!session || session.demo) {
    return {
      session: null,
      error: NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 }),
    };
  }
  return { session, error: null };
}

export async function bffRequireAdminSession() {
  const { session, error } = await bffRequireSession();
  if (error || !session) return { session: null, error: error! };
  if (!isAdminRole(session.user.role)) {
    return {
      session: null,
      error: NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 }),
    };
  }
  return { session, error: null };
}

export async function bffProxyGet(atinaPath: string, options?: { adminOnly?: boolean }) {
  const gate = options?.adminOnly ? await bffRequireAdminSession() : await bffRequireSession();
  const { session, error } = gate;
  if (error || !session) return error!;

  const r = await fetchAtinaForBff<unknown>(atinaPath, session, { method: 'GET' });
  if (!r.ok) {
    return NextResponse.json(
      { ok: false, error: 'upstream_failed', detail: r.message },
      { status: r.status || 502 },
    );
  }

  return NextResponse.json({ ok: true, data: r.data, meta: r.meta ?? null });
}

export async function bffProxyPost(atinaPath: string, req: Request, options?: { adminOnly?: boolean }) {
  const gate = options?.adminOnly ? await bffRequireAdminSession() : await bffRequireSession();
  const { session, error } = gate;
  if (error || !session) return error!;

  let body: string | undefined;
  try {
    body = JSON.stringify(await req.json());
  } catch {
    body = undefined;
  }

  const r = await fetchAtinaForBff<unknown>(atinaPath, session, {
    method: 'POST',
    body,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
  });

  if (!r.ok) {
    return NextResponse.json(
      { ok: false, error: 'upstream_failed', detail: r.message },
      { status: r.status || 502 },
    );
  }

  return NextResponse.json({ ok: true, data: r.data }, { status: 201 });
}

export async function bffProxyRun(atinaBasePath: string, id: string, req: Request, options?: { adminOnly?: boolean }) {
  const gate = options?.adminOnly ? await bffRequireAdminSession() : await bffRequireSession();
  const { session, error } = gate;
  if (error || !session) return error!;

  let body: string | undefined;
  try {
    body = JSON.stringify(await req.json());
  } catch {
    body = '{}';
  }

  const idempotencyKey = req.headers.get('Idempotency-Key') ?? undefined;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;

  const r = await fetchAtinaForBff<unknown>(`${atinaBasePath}/${encodeURIComponent(id)}/run`, session, {
    method: 'POST',
    body,
    headers,
  });

  if (!r.ok) {
    return NextResponse.json(
      { ok: false, error: 'upstream_failed', detail: r.message },
      { status: r.status || 502 },
    );
  }

  return NextResponse.json({ ok: true, data: r.data });
}
