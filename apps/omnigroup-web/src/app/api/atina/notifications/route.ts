import { NextResponse } from 'next/server';
import { clientSafeBffError } from '@/lib/atina-bff-route-handlers';
import { fetchAtinaForBff } from '@/lib/atina-bff';
import { getServerSession } from '@/lib/auth-session';

type NotifRow = Record<string, unknown>;

type ListEnvelope = {
  data?: NotifRow[] | { data?: NotifRow[]; items?: NotifRow[] };
  meta?: { total?: number; page?: number; limit?: number };
};

function unwrapList(payload: NotifRow[] | ListEnvelope | null): {
  items: NotifRow[];
  total: number;
  page: number;
  limit: number;
} {
  if (!payload) return { items: [], total: 0, page: 1, limit: 20 };
  if (Array.isArray(payload)) {
    return { items: payload, total: payload.length, page: 1, limit: payload.length };
  }
  const inner = payload.data;
  const items = Array.isArray(inner)
    ? inner
    : Array.isArray(inner?.data)
      ? inner.data
      : Array.isArray(inner?.items)
        ? inner.items
        : [];
  return {
    items,
    total: payload.meta?.total ?? items.length,
    page: payload.meta?.page ?? 1,
    limit: payload.meta?.limit ?? items.length,
  };
}

export async function GET(req: Request) {
  const session = await getServerSession();
  if (!session || session.demo) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const page = url.searchParams.get('page') ?? '1';
  const limit = url.searchParams.get('limit') ?? '20';
  const unreadOnly = url.searchParams.get('unreadOnly');
  const params = new URLSearchParams({ page, limit });
  if (unreadOnly === 'true' || unreadOnly === 'false') {
    params.set('unreadOnly', unreadOnly);
  }

  const r = await fetchAtinaForBff<NotifRow[] | ListEnvelope>(
    `/api/v1/notifications?${params.toString()}`,
    session,
    { method: 'GET' },
  );

  if (!r.ok) {
    return clientSafeBffError('notifications_list_failed', r.message, r.status || 502);
  }

  const { items, total, page: p, limit: l } = unwrapList(r.data);
  const notifications = items.map((n) => ({
    id: String(n.id ?? ''),
    title: String(n.title ?? 'Notification'),
    message: typeof n.message === 'string' ? n.message : undefined,
    type: typeof n.type === 'string' ? n.type : undefined,
    isRead: Boolean(n.is_read ?? n.isRead),
    actionUrl: typeof n.action_url === 'string' ? n.action_url : typeof n.actionUrl === 'string' ? n.actionUrl : undefined,
    createdAt: typeof n.created_at === 'string' ? n.created_at : undefined,
  }));

  return NextResponse.json({
    ok: true,
    data: { notifications, total, page: p, limit: l },
  });
}
