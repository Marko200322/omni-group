import { resolveAtinaApiBase } from './atina-api-base';

export type StatusLevel = 'operational' | 'degraded' | 'partial_outage' | 'major_outage' | 'unknown';

export type StatusCheck = {
  id: string;
  label: string;
  level: StatusLevel;
  detail: string;
  httpStatus?: number;
};

type Probe = { ok: boolean; status: number; body?: Record<string, unknown> | null };

async function probeJson(url: string): Promise<Probe> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(url, { cache: 'no-store', signal: controller.signal });
    clearTimeout(timer);
    let body: Record<string, unknown> | null = null;
    try {
      const raw = await res.json();
      if (raw && typeof raw === 'object') body = raw as Record<string, unknown>;
    } catch {
      body = null;
    }
    return { ok: res.ok, status: res.status, body };
  } catch {
    return { ok: false, status: 0, body: null };
  }
}

function labelFor(level: StatusLevel): string {
  switch (level) {
    case 'operational':
      return 'Operational';
    case 'degraded':
      return 'Degraded';
    case 'partial_outage':
      return 'Partial outage';
    case 'major_outage':
      return 'Major outage';
    default:
      return 'Not independently probed';
  }
}

function levelFromOk(ok: boolean, downIsMajor = false): StatusLevel {
  if (ok) return 'operational';
  return downIsMajor ? 'major_outage' : 'degraded';
}

export function statusLabel(level: StatusLevel): string {
  return labelFor(level);
}

export async function collectPublicStatus(): Promise<{
  overall: StatusLevel;
  checks: StatusCheck[];
}> {
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://127.0.0.1:3010').replace(/\/$/, '');
  const atinaBase = resolveAtinaApiBase();
  const [live, ready, atina] = await Promise.all([
    probeJson(`${site}/api/health/live`),
    probeJson(`${site}/api/health/ready`),
    probeJson(`${atinaBase}/health`),
  ]);

  const db = typeof atina.body?.db === 'string' ? atina.body.db : undefined;
  const redis = typeof atina.body?.redis === 'string' ? atina.body.redis : undefined;
  const emailConfigured = Boolean(process.env.RESEND_API_KEY?.trim());
  const stripeConfigured = Boolean(
    process.env.STRIPE_SECRET_KEY?.trim() || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim(),
  );

  const checks: StatusCheck[] = [
    {
      id: 'marketing-live',
      label: 'Marketing site (live)',
      level: levelFromOk(live.ok, true),
      detail: live.ok ? 'Process is up. This probe does not check checkout or email.' : 'Live probe failed.',
      httpStatus: live.status,
    },
    {
      id: 'web-ready',
      label: 'Web ready (API coupling)',
      level: ready.ok ? 'operational' : 'partial_outage',
      detail: ready.ok
        ? 'Web can reach the Atina health endpoint.'
        : 'Web ready probe failed — API coupling is down.',
      httpStatus: ready.status,
    },
    {
      id: 'atina',
      label: 'Atina API',
      level: atina.ok ? 'operational' : 'partial_outage',
      detail: atina.ok
        ? `Health ${atina.body?.status ?? 'ok'}${db ? ` · db ${db}` : ''}${redis ? ` · redis ${redis}` : ''}`
        : 'Atina /health did not return 200. Checkout and portal APIs are affected.',
      httpStatus: atina.status,
    },
    {
      id: 'database',
      label: 'Database',
      level: db === 'up' ? 'operational' : db === 'down' ? 'partial_outage' : 'unknown',
      detail:
        db === 'up'
          ? 'Reported up by Atina /health.'
          : db === 'down'
            ? 'Atina reported the database down.'
            : 'No db field on the public health payload.',
    },
    {
      id: 'workers',
      label: 'Background workers / Redis',
      level: redis === 'up' ? 'operational' : redis === 'down' ? 'degraded' : 'unknown',
      detail:
        redis === 'up'
          ? 'Redis reported up by Atina /health. This is not a full job-queue audit.'
          : redis === 'down'
            ? 'Redis reported down — automations and queues may stall.'
            : 'No redis field on the public health payload.',
    },
    {
      id: 'stripe',
      label: 'Stripe / card checkout',
      level: 'unknown',
      detail: stripeConfigured
        ? 'A Stripe key is present in this process. Card checkout is not independently probed here — a test payment is required.'
        : 'No Stripe key in this web process. Checkout may still run on Atina. Not independently probed.',
    },
    {
      id: 'email',
      label: 'Email (Resend)',
      level: 'unknown',
      detail: emailConfigured
        ? 'RESEND_API_KEY is present. This is configuration, not a live send probe.'
        : 'RESEND_API_KEY is not set in this process. Contact may still reach CRM/Slack/Telegram.',
    },
  ];

  const probed = checks.filter((c) => c.level !== 'unknown');
  const overall: StatusLevel = probed.some((c) => c.level === 'major_outage')
    ? 'major_outage'
    : probed.some((c) => c.level === 'partial_outage')
      ? 'partial_outage'
      : probed.some((c) => c.level === 'degraded')
        ? 'degraded'
        : probed.every((c) => c.level === 'operational')
          ? 'operational'
          : 'unknown';

  return { overall, checks };
}
