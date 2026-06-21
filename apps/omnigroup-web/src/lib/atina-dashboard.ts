import type { AuthSession } from './auth-session';
import type {
  AtinaDashboardLive,
  AtinaMeUser,
} from './atina-live-types';
import { fetchAtinaForBff } from './atina-bff';

export type {
  AtinaDashboardLive,
  AtinaMeUser,
  AtinaNotificationItem,
  AtinaTaskItem,
} from './atina-live-types';

export { formatRelativeTime, mapTaskStatus, taskProgress } from './atina-live-utils';

type AtinaListEnvelope<T> = {
  data?: T[] | { data?: T[]; items?: T[] };
  meta?: { total?: number; page?: number; limit?: number };
  total?: number;
};

function unwrapList<T>(payload: T[] | AtinaListEnvelope<T> | null): { items: T[]; total: number } {
  if (!payload) return { items: [], total: 0 };
  if (Array.isArray(payload)) return { items: payload, total: payload.length };
  const root = payload as AtinaListEnvelope<T>;
  const inner = root.data;
  const items = Array.isArray(inner)
    ? inner
    : Array.isArray(inner?.data)
      ? inner.data
      : Array.isArray(inner?.items)
        ? inner.items
        : [];
  const total = root.meta?.total ?? root.total ?? items.length;
  return { items, total };
}

export async function fetchAtinaDashboardLive(session: AuthSession): Promise<AtinaDashboardLive> {
  const out: AtinaDashboardLive = {
    me: null,
    tasks: [],
    tasksTotal: 0,
    notifications: [],
    workflowStats: null,
    errors: [],
  };

  if (!session.accessToken || session.demo) {
    return out;
  }

  const [meRes, tasksRes, notifRes, wfRes] = await Promise.all([
    fetchAtinaForBff<AtinaMeUser>('/api/v1/auth/me', session),
    fetchAtinaForBff<Record<string, unknown>[]>('/api/v1/tasks?limit=5&page=1', session),
    fetchAtinaForBff<Record<string, unknown>[]>('/api/v1/notifications?limit=5&page=1', session),
    fetchAtinaForBff<{
      total?: number;
      completed?: number;
      failed?: number;
      running?: number;
    }>('/api/v1/workflow-chain/executions/stats', session),
  ]);

  if (meRes.ok && meRes.data) {
    out.me = meRes.data;
  } else {
    out.errors.push(meRes.message ?? `me_http_${meRes.status}`);
  }

  if (tasksRes.ok && tasksRes.data) {
    const { items, total } = unwrapList(
      tasksRes.data as unknown as Record<string, unknown>[] | AtinaListEnvelope<Record<string, unknown>>,
    );
    out.tasks = items.slice(0, 5).map((t) => ({
      id: String(t.id ?? ''),
      name: String(t.name ?? t.type ?? 'Task'),
      status: String(t.status ?? 'pending'),
      type: String(t.type ?? ''),
      createdAt: typeof t.created_at === 'string' ? t.created_at : undefined,
    }));
    out.tasksTotal = total;
  } else {
    out.errors.push(tasksRes.message ?? `tasks_http_${tasksRes.status}`);
  }

  if (notifRes.ok && notifRes.data) {
    const { items } = unwrapList(
      notifRes.data as unknown as Record<string, unknown>[] | AtinaListEnvelope<Record<string, unknown>>,
    );
    out.notifications = items.slice(0, 5).map((n) => ({
      id: String(n.id ?? ''),
      title: String(n.title ?? 'Notification'),
      message: typeof n.message === 'string' ? n.message : undefined,
      isRead: Boolean(n.is_read ?? n.isRead),
      createdAt: typeof n.created_at === 'string' ? n.created_at : undefined,
    }));
  }

  if (wfRes.ok && wfRes.data) {
    out.workflowStats = {
      total: Number(wfRes.data.total ?? 0),
      completed: Number(wfRes.data.completed ?? 0),
      failed: Number(wfRes.data.failed ?? 0),
      running: Number(wfRes.data.running ?? 0),
    };
  }

  return out;
}
