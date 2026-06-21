// Server-side helper for reading public Atina endpoints from Next 14 server components.
import { resolveAtinaApiBase } from './atina-api-base';

export type AtinaSnapshotSource = 'live' | 'unreachable' | 'partial' | 'placeholder';

export type AtinaHealthInfo = {
  ok: boolean;
  raw?: unknown;
};

export type AtinaPlanSummary = {
  slug?: string;
  name?: string;
  priceMonthly?: number | string | null;
  currency?: string | null;
};

export type AtinaPublicSnapshot = {
  generatedAt: string;
  apiBase: string;
  source: AtinaSnapshotSource;
  health: AtinaHealthInfo | null;
  plansCount: number;
  plans: AtinaPlanSummary[];
  errors: string[];
};

const DEFAULT_API_BASE = 'http://127.0.0.1:3000';
const DEFAULT_TIMEOUT_MS = 5000;

function resolveApiBase(): string {
  return resolveAtinaApiBase(DEFAULT_API_BASE);
}

async function fetchJson(url: string, timeoutMs: number): Promise<{ ok: boolean; status: number; data: unknown }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      cache: 'no-store',
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    let data: unknown = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    return { ok: res.ok, status: res.status, data };
  } finally {
    clearTimeout(timer);
  }
}

function describeError(err: unknown): string {
  if (err instanceof Error) {
    if (err.name === 'AbortError') return 'timeout';
    return err.message;
  }
  return String(err);
}

function unwrapPlansList(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];
  const root = payload as Record<string, unknown>;
  if (Array.isArray(root.data)) return root.data;
  if (Array.isArray(root.plans)) return root.plans;
  return [];
}

function normalizePlans(payload: unknown): AtinaPlanSummary[] {
  return unwrapPlansList(payload)
    .slice(0, 20)
    .map((p) => {
      const o = (p ?? {}) as Record<string, unknown>;
      const priceRaw = o.priceMonthly ?? o.price_monthly;
      const priceMonthly =
        typeof priceRaw === 'number' || typeof priceRaw === 'string' ? priceRaw : null;
      return {
        slug: typeof o.slug === 'string' ? o.slug : undefined,
        name: typeof o.name === 'string' ? o.name : undefined,
        priceMonthly,
        currency: typeof o.currency === 'string' ? o.currency : null,
      };
    });
}

export async function loadAtinaPublicSnapshot(
  options: { timeoutMs?: number } = {},
): Promise<AtinaPublicSnapshot> {
  const apiBase = resolveApiBase();
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const errors: string[] = [];
  let health: AtinaHealthInfo | null = null;
  let plans: AtinaPlanSummary[] = [];
  let healthOk = false;
  let plansOk = false;

  try {
    const r = await fetchJson(`${apiBase}/health`, timeoutMs);
    if (r.ok && r.data && typeof r.data === 'object') {
      health = { ok: true, raw: r.data };
      healthOk = true;
    } else if (r.ok) {
      health = { ok: true };
      healthOk = true;
    } else {
      errors.push(`health http ${r.status}`);
    }
  } catch (err) {
    errors.push(`health: ${describeError(err)}`);
  }

  try {
    const r = await fetchJson(`${apiBase}/api/v1/billing/plans`, timeoutMs);
    if (r.ok) {
      plans = normalizePlans(r.data);
      plansOk = true;
    } else {
      errors.push(`plans http ${r.status}`);
    }
  } catch (err) {
    errors.push(`plans: ${describeError(err)}`);
  }

  let source: AtinaSnapshotSource;
  if (healthOk && plansOk) source = 'live';
  else if (healthOk || plansOk) source = 'partial';
  else source = 'unreachable';

  return {
    generatedAt: new Date().toISOString(),
    apiBase,
    source,
    health,
    plansCount: plans.length,
    plans,
    errors,
  };
}

