import { config } from '../../../config';
import { testConnection } from '../../../database/connection';
import { testRedisConnection } from '../../../queue/redis-health';
import type { HealthStatus, SubsystemCode } from './constants';
import { redactSecrets } from './redact';

export type ProbeResult = {
  code: SubsystemCode;
  status: HealthStatus;
  latencyMs: number | null;
  message: string;
  evidence: Record<string, unknown>;
  isCritical: boolean;
};

async function timed<T>(
  fn: () => Promise<T>
): Promise<{ ok: true; value: T; latencyMs: number } | { ok: false; error: string; latencyMs: number }> {
  const started = Date.now();
  try {
    const value = await fn();
    return { ok: true, value, latencyMs: Date.now() - started };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      latencyMs: Date.now() - started,
    };
  }
}

function base(
  code: SubsystemCode,
  status: HealthStatus,
  message: string,
  opts: { latencyMs?: number | null; evidence?: Record<string, unknown>; isCritical?: boolean } = {}
): ProbeResult {
  return {
    code,
    status,
    latencyMs: opts.latencyMs ?? null,
    message,
    evidence: redactSecrets(opts.evidence ?? {}),
    isCritical: opts.isCritical ?? true,
  };
}

/** In-process API readiness — process is serving (no HTTP loopback). */
export async function probeApi(): Promise<ProbeResult> {
  const started = Date.now();
  try {
    const uptime = process.uptime();
    const mem = process.memoryUsage();
    return base('api', 'healthy', 'process_serving', {
      latencyMs: Date.now() - started,
      evidence: {
        uptimeSec: Math.floor(uptime),
        rssMb: Math.round(mem.rss / (1024 * 1024)),
        env: config.app.env,
      },
      isCritical: true,
    });
  } catch (err) {
    return base('api', 'unavailable', err instanceof Error ? err.message : 'api_probe_failed', {
      latencyMs: Date.now() - started,
      isCritical: true,
    });
  }
}

export async function probeDatabase(): Promise<ProbeResult> {
  const result = await timed(() => testConnection());
  if (!result.ok) {
    return base('database', 'unavailable', result.error, {
      latencyMs: result.latencyMs,
      isCritical: true,
    });
  }
  return base(
    'database',
    result.value ? 'healthy' : 'critical',
    result.value ? 'postgres_ping_ok' : 'postgres_ping_failed',
    { latencyMs: result.latencyMs, evidence: { ok: result.value }, isCritical: true }
  );
}

export async function probeRedis(): Promise<ProbeResult> {
  const result = await timed(() => testRedisConnection());
  if (!result.ok) {
    return base('redis', 'unavailable', result.error, {
      latencyMs: result.latencyMs,
      isCritical: true,
    });
  }
  return base(
    'redis',
    result.value ? 'healthy' : 'critical',
    result.value ? 'redis_ping_ok' : 'redis_ping_failed',
    { latencyMs: result.latencyMs, evidence: { ok: result.value }, isCritical: true }
  );
}

/** Queues share Redis; reuse redis probe result semantics without double-spend. */
export async function probeQueues(redisStatus?: HealthStatus): Promise<ProbeResult> {
  if (redisStatus === 'healthy') {
    return base('queues', 'healthy', 'queues_share_redis_healthy', {
      evidence: { derivedFrom: 'redis' },
      isCritical: false,
    });
  }
  if (redisStatus === 'critical' || redisStatus === 'unavailable') {
    return base('queues', redisStatus, 'queues_unavailable_redis_down', {
      evidence: { derivedFrom: 'redis' },
      isCritical: false,
    });
  }
  const redis = await probeRedis();
  return base(
    'queues',
    redis.status === 'healthy' ? 'healthy' : redis.status,
    redis.status === 'healthy' ? 'queues_share_redis_healthy' : 'queues_unavailable_redis_down',
    {
      latencyMs: redis.latencyMs,
      evidence: { derivedFrom: 'redis', redisMessage: redis.message },
      isCritical: false,
    }
  );
}

/**
 * Payments: config presence only — never call Stripe API / never charge.
 * Labels sk_test vs sk_live without echoing the secret.
 */
export async function probePayments(): Promise<ProbeResult> {
  const started = Date.now();
  try {
    const secret = String(config.stripe?.secretKey ?? '').trim();
    const publishable = String(config.stripe?.publishableKey ?? '').trim();
    const webhook = String(config.stripe?.webhookSecret ?? '').trim();

    if (!secret) {
      return base('payments', 'unavailable', 'stripe_secret_key_missing', {
        latencyMs: Date.now() - started,
        evidence: { secretPresent: false, publishablePresent: Boolean(publishable) },
        isCritical: true,
      });
    }

    let mode: 'test' | 'live' | 'unknown' = 'unknown';
    if (secret.startsWith('sk_test_')) mode = 'test';
    else if (secret.startsWith('sk_live_')) mode = 'live';

    const warnings: string[] = [];
    if (!publishable) warnings.push('publishable_key_missing');
    if (!webhook) warnings.push('webhook_secret_missing');
    if (mode === 'unknown') warnings.push('secret_key_format_unrecognized');

    const status: HealthStatus = warnings.length ? 'warning' : 'healthy';
    return base('payments', status, warnings.length ? warnings.join(',') : 'stripe_keys_present', {
      latencyMs: Date.now() - started,
      evidence: {
        secretPresent: true,
        secretMode: mode,
        publishablePresent: Boolean(publishable),
        webhookPresent: Boolean(webhook),
        note: 'config_only_no_stripe_api',
      },
      isCritical: true,
    });
  } catch (err) {
    return base('payments', 'unavailable', err instanceof Error ? err.message : 'payments_probe_failed', {
      latencyMs: Date.now() - started,
      isCritical: true,
    });
  }
}

/** Email: SMTP/Resend configured? Never send. */
export async function probeEmail(): Promise<ProbeResult> {
  const started = Date.now();
  try {
    const smtpEnabled = Boolean(config.smtp?.enabled);
    const smtpUser = String(config.smtp?.user ?? '').trim();
    const smtpPass = String(config.smtp?.password ?? '').trim();
    const smtpHost = String(config.smtp?.host ?? '').trim();
    const resendKey = String(config.resend?.apiKey ?? '').trim();

    const smtpConfigured = smtpEnabled && Boolean(smtpHost && smtpUser && smtpPass);
    const resendConfigured = Boolean(resendKey);

    if (!smtpConfigured && !resendConfigured) {
      return base('email', 'unavailable', 'no_smtp_or_resend_configured', {
        latencyMs: Date.now() - started,
        evidence: { smtpConfigured: false, resendConfigured: false },
        isCritical: false,
      });
    }

    return base('email', 'healthy', 'email_provider_configured', {
      latencyMs: Date.now() - started,
      evidence: {
        smtpConfigured,
        resendConfigured,
        note: 'config_only_no_send',
      },
      isCritical: false,
    });
  } catch (err) {
    return base('email', 'unavailable', err instanceof Error ? err.message : 'email_probe_failed', {
      latencyMs: Date.now() - started,
      isCritical: false,
    });
  }
}

/** OMI usage store readiness — fail soft to unavailable. */
export async function probeOmi(): Promise<ProbeResult> {
  const started = Date.now();
  try {
    const mod = await import('../../omi/omi-usage-store');
    const store = mod.getOmiUsageStore?.();
    if (!store?.ensureReady) {
      return base('omi', 'unavailable', 'omi_usage_store_unavailable', {
        latencyMs: Date.now() - started,
        isCritical: false,
      });
    }
    const ready = await store.ensureReady();
    return base('omi', ready ? 'healthy' : 'unavailable', ready ? 'omi_store_ready' : 'omi_store_not_ready', {
      latencyMs: Date.now() - started,
      evidence: { storeReady: ready },
      isCritical: false,
    });
  } catch (err) {
    return base('omi', 'unavailable', err instanceof Error ? err.message : 'omi_probe_failed', {
      latencyMs: Date.now() - started,
      isCritical: false,
    });
  }
}

/**
 * Reinvestment: read-only observe if available — NEVER spend / mutate balances.
 */
export async function probeReinvestment(): Promise<ProbeResult> {
  const started = Date.now();
  try {
    if (config.reinvestment?.enabled === false) {
      return base('reinvestment', 'warning', 'reinvestment_disabled_in_config', {
        latencyMs: Date.now() - started,
        evidence: { enabled: false },
        isCritical: false,
      });
    }

    try {
      const observeMod = await import('../../reinvestment/lib/observe');
      if (typeof observeMod.observeRevenueAllocations === 'function') {
        const snap = await observeMod.observeRevenueAllocations();
        return base('reinvestment', 'healthy', 'observe_revenue_ok', {
          latencyMs: Date.now() - started,
          evidence: {
            kind: snap?.kind ?? null,
            paymentCount: snap?.paymentCount ?? null,
            currency: snap?.currency ?? null,
            note: 'read_only_no_spend',
          },
          isCritical: false,
        });
      }
    } catch (obsErr) {
      // Fall through to soft unavailable — never throw to CoreEngine.
      return base(
        'reinvestment',
        'unavailable',
        obsErr instanceof Error ? obsErr.message : 'reinvestment_observe_failed',
        {
          latencyMs: Date.now() - started,
          evidence: { note: 'read_only_probe_failed' },
          isCritical: false,
        }
      );
    }

    return base('reinvestment', 'unavailable', 'observe_not_available', {
      latencyMs: Date.now() - started,
      isCritical: false,
    });
  } catch (err) {
    return base(
      'reinvestment',
      'unavailable',
      err instanceof Error ? err.message : 'reinvestment_probe_failed',
      { latencyMs: Date.now() - started, isCritical: false }
    );
  }
}

/**
 * Web app: config presence only (no outbound HTTP to self/customer portal).
 */
export async function probeWeb(): Promise<ProbeResult> {
  const started = Date.now();
  try {
    const webUrl = String(config.app?.webUrl ?? process.env.WEB_APP_URL ?? '').trim();
    if (!webUrl) {
      return base('web', 'warning', 'web_app_url_unset', {
        latencyMs: Date.now() - started,
        evidence: { note: 'config_only_no_http' },
        isCritical: true,
      });
    }
    return base('web', 'healthy', 'web_app_url_configured', {
      latencyMs: Date.now() - started,
      evidence: { configured: true, note: 'config_only_no_http' },
      isCritical: true,
    });
  } catch (err) {
    return base('web', 'unavailable', err instanceof Error ? err.message : 'web_probe_failed', {
      latencyMs: Date.now() - started,
      isCritical: true,
    });
  }
}

/** Monitoring engine self-check — always runs in-process. */
export async function probeMonitoringSelf(): Promise<ProbeResult> {
  const started = Date.now();
  try {
    const enabled = config.monitoring?.enabled !== false;
    if (!enabled) {
      return base('monitoring', 'warning', 'monitoring_disabled_in_config', {
        latencyMs: Date.now() - started,
        evidence: { enabled: false },
        isCritical: true,
      });
    }
    return base('monitoring', 'healthy', 'monitoring_engine_self_ok', {
      latencyMs: Date.now() - started,
      evidence: { enabled: true, engine: 'monitoring' },
      isCritical: true,
    });
  } catch (err) {
    return base(
      'monitoring',
      'unavailable',
      err instanceof Error ? err.message : 'monitoring_self_probe_failed',
      { latencyMs: Date.now() - started, isCritical: true }
    );
  }
}

/** Run the full probe suite fail-soft (never throws). */
export async function runAllProbes(): Promise<ProbeResult[]> {
  const results: ProbeResult[] = [];

  const wrap = async (fn: () => Promise<ProbeResult>, code: SubsystemCode, isCritical: boolean) => {
    try {
      return await fn();
    } catch (err) {
      return base(code, 'unavailable', err instanceof Error ? err.message : 'probe_threw', {
        isCritical,
      });
    }
  };

  results.push(await wrap(probeApi, 'api', true));
  results.push(await wrap(probeDatabase, 'database', true));
  const redis = await wrap(probeRedis, 'redis', true);
  results.push(redis);
  results.push(await wrap(() => probeQueues(redis.status), 'queues', false));
  results.push(await wrap(probeWeb, 'web', true));
  results.push(await wrap(probePayments, 'payments', true));
  results.push(await wrap(probeEmail, 'email', false));
  results.push(await wrap(probeOmi, 'omi', false));
  results.push(await wrap(probeReinvestment, 'reinvestment', false));
  results.push(await wrap(probeMonitoringSelf, 'monitoring', true));

  return results;
}
