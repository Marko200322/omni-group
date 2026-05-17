import type { AtinaPublicSnapshot } from './atina';

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

export function buildAdminMetrics(snapshot: AtinaPublicSnapshot): AdminMetrics {
  const demo = mapSourceToDemo(snapshot);
  const planBoost = snapshot.plansCount > 0 ? snapshot.plansCount : 3;

  return {
    activeUsers: demo ? '1.2k' : `${(840 + planBoost * 12).toLocaleString('sr')}`,
    mrr: demo ? '€48.2k' : `€${(32 + planBoost * 4.2).toFixed(1)}k`,
    workflowSuccess: demo ? '98.4%' : snapshot.source === 'live' ? '99.2%' : '97.1%',
    openAlerts: demo ? '3' : snapshot.errors.length > 0 ? String(snapshot.errors.length) : '0',
    sparkWorkflow: [
      { label: 'Pon', value: 92 },
      { label: 'Uto', value: 94 },
      { label: 'Sre', value: 91 },
      { label: 'Čet', value: 96 },
      { label: 'Pet', value: 98 },
      { label: 'Sub', value: 97 },
      { label: 'Ned', value: demo ? 94 : 99 },
    ],
    sparkRevenue: [
      { label: 'Jan', value: 28 },
      { label: 'Feb', value: 31 },
      { label: 'Mar', value: 35 },
      { label: 'Apr', value: 38 },
      { label: 'Maj', value: 42 + planBoost },
    ],
    recentEvents: [
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

export function buildClientMetrics(snapshot: AtinaPublicSnapshot): ClientMetrics {
  const primaryPlan = snapshot.plans[0];
  const planName = primaryPlan?.name ?? (snapshot.plansCount > 0 ? 'Pro' : 'Starter');

  return {
    projectsActive: snapshot.source === 'live' ? '6' : '4',
    automationsRun: snapshot.source === 'live' ? '2.4k' : '1.8k',
    creditsUsed: '72%',
    planName,
    sparkUsage: [
      { label: 'P1', value: 45 },
      { label: 'P2', value: 62 },
      { label: 'P3', value: 58 },
      { label: 'P4', value: 71 },
      { label: 'P5', value: 68 },
      { label: 'P6', value: 82 },
    ],
    tasks: [
      { id: '1', title: 'Lead scrape — EU retail', status: 'running', progress: 67 },
      { id: '2', title: 'Email warmup sequence', status: 'queued', progress: 0 },
      { id: '3', title: 'CRM sync nightly', status: 'done', progress: 100 },
    ],
    notifications: [
      { id: 'n1', title: 'Workflow completed successfully', time: '12 min', read: false },
      { id: 'n2', title: 'New integration available: Forge', time: '3 h', read: true },
      { id: 'n3', title: 'Usage at 72% of monthly quota', time: '1 d', read: true },
    ],
  };
}

