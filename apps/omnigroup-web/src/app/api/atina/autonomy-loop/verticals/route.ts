import { NextResponse } from 'next/server';
import { fetchAtinaForBff } from '@/lib/atina-bff';
import { requireAdminSession } from '@/lib/bff-admin-gate';

function unwrapVerticals(payload: unknown): { items: Record<string, unknown>[]; total: number } {
  if (!payload || typeof payload !== 'object') return { items: [], total: 0 };
  const root = payload as {
    verticals?: Record<string, unknown>[];
    rows?: Record<string, unknown>[];
    items?: Record<string, unknown>[];
    data?: Record<string, unknown>[] | { verticals?: Record<string, unknown>[]; total?: number };
    total?: number;
    meta?: { total?: number };
  };

  if (Array.isArray(root.verticals)) {
    return { items: root.verticals, total: root.total ?? root.verticals.length };
  }
  if (Array.isArray(root.rows)) {
    return { items: root.rows, total: root.total ?? root.rows.length };
  }
  if (Array.isArray(root.items)) {
    return { items: root.items, total: root.total ?? root.items.length };
  }
  if (Array.isArray(root.data)) {
    return { items: root.data, total: root.meta?.total ?? root.data.length };
  }
  if (root.data && typeof root.data === 'object' && Array.isArray(root.data.verticals)) {
    return {
      items: root.data.verticals,
      total: root.data.total ?? root.data.verticals.length,
    };
  }
  return { items: [], total: 0 };
}

export async function GET(req: Request) {
  const gate = await requireAdminSession();
  if ('error' in gate) return gate.error;
  const { session } = gate;

  const url = new URL(req.url);
  const limit = url.searchParams.get('limit') ?? '8';
  const status = url.searchParams.get('status') ?? '';
  const qs = new URLSearchParams({ limit, page: '1' });
  if (status) qs.set('status', status);

  const r = await fetchAtinaForBff<unknown>(`/api/v1/autonomy-loop/verticals?${qs.toString()}`, session);

  if (!r.ok) {
    return NextResponse.json(
      { ok: false, error: 'verticals_failed', detail: r.message },
      { status: r.status || 502 },
    );
  }

  const { items, total } = unwrapVerticals(r.data);
  return NextResponse.json({ ok: true, data: { verticals: items, total } });
}
