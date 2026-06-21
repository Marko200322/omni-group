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

function mapSourceToDemo(snapshot: AtinaPublicSnapshot): boolean {
  return snapshot.source === 'unreachable' || snapshot.source === 'partial';
}

export function buildAdminMetrics(
  snapshot: AtinaPublicSnapshot,
  overview?: AtinaAdminOverview | null,
): AdminMetrics {
  const demo = mapSourceToDemo(snapshot) && !overview;
  const planBoost = snapshot.plansCount > 0 ? snapshot.plansCount : 3;
  const wf = overview?.workflowTemplatesExecutionSummary;
  const successRate =
    wf && typeof wf.successRate === 'number'
      ? `${wf.successRate.toFixed(1)}%`
      : demo
        ? '98.4%'
        : snapshot.source === 'live'
          ? '99.2%'
          : '97.1%';
  const alerts =
    overview?.workflowTemplateAlerts?.total ??
    (demo ? 3 : snapshot.errors.length > 0 ? snapshot.errors.length : 0);

  return {
    activeUsers: overview?.users?.active
      ? overview.users.active.toLocaleString('en-US')
      : demo
        ? '1.2k'
        : `${(840 + planBoost * 12).toLocaleString('en-US')}`,
    mrr: overview?.payments?.totalRevenue
      ? `€${overview.payments.totalRevenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
      : demo
        ? '€48.2k'
        : `€${(32 + planBoost * 4.2).toFixed(1)}k`,
    workflowSuccess: successRate,
    openAlerts: String(alerts),
    sparkWorkflow: [
      { label: 'Mon', value: 92 },
      { label: 'Tue', value: 94 },
      { label: 'Wed', value: 91 },
      { label: 'Thu', value: 96 },
      { label: 'Fri', value: 98 },
      { label: 'Sat', value: 97 },
      { label: 'Sun', value: demo ? 94 : 99 },
    ],
    sparkRevenue: [
      { label: 'Jan', value: 28 },
      { label: 'Feb', value: 31 },
      { label: 'Mar', value: 35 },
      { label: 'Apr', value: 38 },
      { label: 'May', value: 42 + planBoost },
    ],
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
      : [
      {
        time: '2 min',
        type: 'workflow',
        message: 'Template onboarding-chain completed (batch 12)',
        severity: 'info',
      },
      {
        time: '18 min',
        type: 'billing',
        message: `Plans catalog sync — ${snapshot.plansCount} active tiers`,
        severity: snapshot.plansCount > 0 ? 'info' : 'warn',
      },
      {
        time: '1 h',
        type: 'api',
        message: `Atina API ${snapshot.source} @ ${snapshot.apiBase}`,
        severity: snapshot.source === 'live' ? 'info' : 'warn',
      },
      ...snapshot.errors.slice(0, 2).map((e, i) => ({
        time: `${i + 2} h`,
        type: 'system' as const,
        message: e,
        severity: 'error' as const,
      })),
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
    primaryPlan?.name ??
    (snapshot.plansCount > 0 ? 'Pro' : 'Starter');

  const hasLive = Boolean(live?.me || live?.tasks.length);
  const wf = live?.workflowStats;
  const automations =
    wf && wf.total > 0
      ? String(wf.total)
      : hasLive
        ? String(live!.tasksTotal)
        : authenticated
          ? '0'
          : snapshot.source === 'live'
            ? '24'
            : '18';

  const placeholderTasks = [
    { id: '1', title: 'Lead scrape — EU retail', status: 'running' as const, progress: 67 },
    { id: '2', title: 'Email warmup sequence', status: 'queued' as const, progress: 0 },
    { id: '3', title: 'CRM sync nightly', status: 'done' as const, progress: 100 },
  ];

  const tasks =
    live && live.tasks.length > 0
      ? live.tasks.map((t) => ({
          id: t.id,
          title: t.name,
          status: mapTaskStatus(t.status),
          progress: taskProgress(t.status),
        }))
      : authenticated
        ? []
        : placeholderTasks;

  const placeholderNotifications = [
    { id: 'n1', title: 'Workflow completed successfully', time: '12 min', read: false },
    { id: 'n2', title: 'New integration available: Forge', time: '3 h', read: true },
    { id: 'n3', title: 'Usage at 72% of monthly quota', time: '1 d', read: true },
  ];

  const notifications =
    live && live.notifications.length > 0
      ? live.notifications.map((n) => ({
          id: n.id,
          title: n.title,
          time: formatRelativeTime(n.createdAt),
          read: n.isRead,
        }))
      : authenticated
        ? []
        : placeholderNotifications;

  return {
    projectsActive: hasLive
      ? String(Math.max(1, live!.tasksTotal))
      : authenticated
        ? '0'
        : snapshot.source === 'live'
          ? '6'
          : '4',
    automationsRun: automations,
    creditsUsed:
      wf && wf.total > 0
        ? `${Math.min(99, Math.round((wf.completed / wf.total) * 100))}%`
        : authenticated
          ? '—'
          : '72%',
    planName: String(planName),
    sparkUsage: authenticated
      ? [
          { label: 'P1', value: wf?.completed ?? 0 },
          { label: 'P2', value: wf?.running ?? 0 },
          { label: 'P3', value: wf?.failed ?? 0 },
          { label: 'P4', value: live?.tasksTotal ?? 0 },
          { label: 'P5', value: 0 },
          { label: 'P6', value: 0 },
        ]
      : [
          { label: 'P1', value: 12 },
          { label: 'P2', value: 18 },
          { label: 'P3', value: 24 },
          { label: 'P4', value: 28 },
          { label: 'P5', value: 32 },
          { label: 'P6', value: 36 },
        ],
    tasks,
    notifications,
  };
}

