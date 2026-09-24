import type { AtinaPublicSnapshot } from './atina';
import type { AtinaAdminOverview } from './atina-live-types';
import type { AtinaDashboardLive } from './atina-live-types';
import { formatRelativeTime, mapTaskStatus, taskProgress } from './atina-live-utils';

export type SparkPoint = { label: string; value: number };

export type AdminMetrics = {
  activeUsers: string;
  mrr: string;
  workflowSuccess: string;
  openAlerts: string;
  sparkWorkflow: SparkPoint[];
  sparkRevenue: SparkPoint[];
  recentEvents: { time: string; type: string; message: string; severity: 'info' | 'warn' | 'error' }[];
  trends?: {
    activeUsers?: { value: string; positive: boolean };
    mrr?: { value: string; positive: boolean };
  };
};

export type ClientMetrics = {
  projectsActive: string;
  automationsRun: string;
  creditsUsed: string;
  planName: string;
  sparkUsage: SparkPoint[];
  tasks: { id: string; title: string; status: 'running' | 'done' | 'queued'; progress: number }[];
  notifications: { id: string; title: string; time: string; read: boolean }[];
};

function formatTrendDay(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr.slice(0, 3);
  return d.toLocaleDateString('en-US', { weekday: 'short' });
}

function buildSparkFromTrend7d(
  trend7d: NonNullable<AtinaAdminOverview['workflowTemplatesExecutionTrend7d']>,
): SparkPoint[] {
  if (!trend7d.length) return [];
  return trend7d.map((row) => ({
    label: formatTrendDay(row.date),
    value: typeof row.successRate === 'number' ? row.successRate : 0,
  }));
}

export function buildAdminMetrics(
  snapshot: AtinaPublicSnapshot,
  overview?: AtinaAdminOverview | null,
): AdminMetrics {
  const wf = overview?.workflowTemplatesExecutionSummary;
  const successRate =
    wf && typeof wf.successRate === 'number' ? `${wf.successRate.toFixed(1)}%` : '—';
  const alerts =
    overview?.workflowTemplateAlerts?.total != null
      ? overview.workflowTemplateAlerts.total
      : snapshot.errors.length > 0
        ? snapshot.errors.length
        : null;

  const trend7d = overview?.workflowTemplatesExecutionTrend7d;
  const sparkWorkflow = trend7d && trend7d.length > 0 ? buildSparkFromTrend7d(trend7d) : [];

  const activeCount = overview?.users?.active;
  const totalUsers = overview?.users?.total;
  const trends =
    overview && typeof activeCount === 'number' && typeof totalUsers === 'number' && totalUsers > 0
      ? {
          activeUsers: {
            value: `${Math.round((activeCount / totalUsers) * 100)}% of users active`,
            positive: activeCount >= totalUsers * 0.5,
          },
          mrr: overview.payments?.total
            ? {
                value: `${overview.payments.total} payments recorded`,
                positive: (overview.payments.total ?? 0) > 0,
              }
            : undefined,
        }
      : undefined;

  return {
    activeUsers:
      overview?.users?.active != null ? overview.users.active.toLocaleString('en-US') : '—',
    mrr:
      overview?.payments?.totalRevenue != null
        ? `€${overview.payments.totalRevenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
        : '—',
    workflowSuccess: successRate,
    openAlerts: alerts == null ? '—' : String(alerts),
    sparkWorkflow,
    // A total is not a time series. Keep the chart empty until the API returns
    // dated revenue buckets instead of fabricating historical points.
    sparkRevenue: [],
    trends,
    recentEvents: overview
      ? [
          {
            time: 'live',
            type: 'users',
            message: `${overview.users?.total ?? 0} users · ${overview.users?.active ?? 0} active`,
            severity: 'info' as const,
          },
          {
            time: 'live',
            type: 'billing',
            message: `${overview.subscriptions?.active ?? 0} active subscriptions · ${overview.payments?.total ?? 0} payments`,
            severity: 'info' as const,
          },
          {
            time: 'live',
            type: 'tasks',
            message: `${overview.tasks?.total ?? 0} tasks · ${overview.tasks?.failed ?? 0} failed`,
            severity: (overview.tasks?.failed ?? 0) > 0 ? ('warn' as const) : ('info' as const),
          },
        ]
      : snapshot.errors.length > 0
        ? snapshot.errors.slice(0, 3).map((e, i) => ({
            time: `${i + 1}`,
            type: 'system' as const,
            message: e,
            severity: 'error' as const,
          }))
        : [
            {
              time: 'now',
              type: 'api',
              message: `Atina API ${snapshot.source} @ ${snapshot.apiBase}`,
              severity: snapshot.source === 'live' ? ('info' as const) : ('warn' as const),
            },
          ],
  };
}

export function buildClientMetrics(
  snapshot: AtinaPublicSnapshot,
  live?: AtinaDashboardLive | null,
  options?: { authenticated?: boolean },
): ClientMetrics {
  const authenticated = options?.authenticated ?? false;
  const primaryPlan = snapshot.plans[0];
  const planName =
    live?.me?.planSlug?.toUpperCase() ??
    live?.me?.name ??
    (authenticated ? primaryPlan?.name : 'Demo') ??
    'No active plan';

  const hasLive = Boolean(live?.me || live?.tasks.length);
  const wf = live?.workflowStats;
  const automations =
    wf && wf.total > 0
      ? String(wf.total)
      : hasLive
        ? String(live!.tasksTotal)
        : '0';

  const tasks =
    live && live.tasks.length > 0
      ? live.tasks.map((t) => ({
          id: t.id,
          title: t.name,
          status: mapTaskStatus(t.status),
          progress: taskProgress(t.status),
        }))
      : [];

  const notifications =
    live && live.notifications.length > 0
      ? live.notifications.map((n) => ({
          id: n.id,
          title: n.title,
          time: formatRelativeTime(n.createdAt),
          read: n.isRead,
        }))
      : [];

  return {
    projectsActive: hasLive ? String(live!.tasksTotal) : '0',
    automationsRun: automations,
    creditsUsed:
      wf && wf.total > 0
        ? `${Math.min(99, Math.round((wf.completed / wf.total) * 100))}%`
        : '—',
    planName: String(planName),
    sparkUsage: [
      { label: 'Completed', value: wf?.completed ?? 0 },
      { label: 'Running', value: wf?.running ?? 0 },
      { label: 'Failed', value: wf?.failed ?? 0 },
      { label: 'Tasks', value: live?.tasksTotal ?? 0 },
    ],
    tasks,
    notifications,
  };
}

