'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ExternalLink,
  Play,
  Radar,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { csrfFetch } from '@/lib/csrf-fetch';

export type MonitoringHealthStatus =
  | 'HEALTHY'
  | 'WARNING'
  | 'CRITICAL'
  | 'UNAVAILABLE'
  | string;

export type MonitoringSubsystem = {
  code?: string;
  layer?: string;
  name?: string;
  status?: MonitoringHealthStatus;
  reason?: string;
  message?: string;
  checkedAt?: string;
  checked_at?: string;
};

export type MonitoringAttentionItem = {
  id?: string;
  title?: string;
  message?: string;
  severity?: string;
  urgency?: number | string;
  businessImpact?: number | string;
  business_impact?: number | string;
  serviceCode?: string;
  service_code?: string;
  rank?: number;
};

export type MonitoringIncident = {
  id?: string;
  publicCode?: string;
  public_code?: string;
  title?: string;
  severity?: string;
  status?: string;
  affectedService?: string;
  affected_service?: string;
  symptoms?: string;
  detectedAt?: string;
  detected_at?: string;
};

export type MonitoringCostLine = {
  label?: string;
  metricKey?: string;
  metric_key?: string;
  amount?: number | null;
  amountUsd?: number | null;
  amount_usd?: number | null;
  currency?: string;
  kind?: 'ACTUAL' | 'ESTIMATE' | 'UNAVAILABLE' | string;
  costKind?: 'ACTUAL' | 'ESTIMATE' | 'UNAVAILABLE' | string;
  cost_kind?: 'ACTUAL' | 'ESTIMATE' | 'UNAVAILABLE' | string;
};

export type MonitoringOverview = {
  overallState?: string;
  overall_state?: string;
  criticalIncidents?: number;
  critical_incidents?: number;
  openCriticalIncidents?: number;
  open_critical_incidents?: number;
  warnings?: number;
  warningCount?: number;
  warning_count?: number;
  openIncidents?: number;
  open_incidents?: number;
  subsystems?: MonitoringSubsystem[];
  subsystemStatuses?: MonitoringSubsystem[] | Record<string, MonitoringSubsystem | string>;
  subsystem_statuses?: MonitoringSubsystem[] | Record<string, MonitoringSubsystem | string>;
  monitoringSelf?: MonitoringSubsystem | { status?: string; reason?: string; message?: string };
  monitoring_self?: MonitoringSubsystem | { status?: string; reason?: string; message?: string };
  attention?: MonitoringAttentionItem[];
  incidents?: MonitoringIncident[];
  costs?: MonitoringCostLine[] | {
    items?: MonitoringCostLine[];
    lines?: MonitoringCostLine[];
    omiEstimatedUsd?: number;
    omi_estimated_usd?: number;
    costKind?: string;
    cost_kind?: string;
    kind?: string;
  };
  reasons?: string[];
  notes?: string[];
  asOf?: string;
  as_of?: string;
};

type Props = {
  disabled?: boolean;
};

type BffEnvelope<T> = {
  ok?: boolean;
  data?: T;
  error?: string;
  detail?: string;
};

/** UI grid keys — map API codes/layers onto these cards. */
const SUBSYSTEM_GRID: { key: string; label: string; aliases: string[] }[] = [
  { key: 'infrastructure', label: 'Infrastructure', aliases: ['infrastructure', 'redis', 'queues', 'web'] },
  { key: 'db', label: 'Database', aliases: ['db', 'database'] },
  { key: 'api', label: 'API', aliases: ['api'] },
  { key: 'payments', label: 'Payments', aliases: ['payments'] },
  { key: 'email', label: 'Email', aliases: ['email'] },
  { key: 'omi', label: 'OMI', aliases: ['omi'] },
  { key: 'security', label: 'Security', aliases: ['security'] },
  { key: 'reinvestment', label: 'Reinvestment', aliases: ['reinvestment'] },
  { key: 'monitoring', label: 'Monitoring', aliases: ['monitoring', 'monitoring_self'] },
];

function unwrapList<T>(data: unknown, keys: string[]): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    for (const key of keys) {
      const v = obj[key];
      if (Array.isArray(v)) return v as T[];
    }
  }
  return [];
}

function normalizeStatus(raw?: string | null): 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'UNAVAILABLE' {
  const s = String(raw ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
  if (s === 'HEALTHY' || s === 'OK' || s === 'OPERATIONAL') return 'HEALTHY';
  if (s === 'WARNING' || s === 'WARN' || s === 'DEGRADED') return 'WARNING';
  if (s === 'CRITICAL' || s === 'HIGH' || s === 'ERROR') return 'CRITICAL';
  if (s === 'UNAVAILABLE' || s === 'UNKNOWN' || s === 'DOWN' || !s) return 'UNAVAILABLE';
  if (s.includes('CRITICAL')) return 'CRITICAL';
  if (s.includes('WARN')) return 'WARNING';
  if (s.includes('HEALTH') || s.includes('OPERATIONAL')) return 'HEALTHY';
  return 'UNAVAILABLE';
}

function kindBadge(kind?: string | null): 'ACTUAL' | 'ESTIMATE' | 'UNAVAILABLE' | null {
  const k = String(kind ?? '').toUpperCase();
  if (k === 'ACTUAL' || k === 'ESTIMATE' || k === 'UNAVAILABLE') return k;
  return null;
}

function statusStyles(status: ReturnType<typeof normalizeStatus>): {
  border: string;
  badge: string;
  text: string;
} {
  switch (status) {
    case 'HEALTHY':
      return {
        border: 'border-emerald-500/30',
        badge: 'bg-emerald-500/15 text-emerald-300',
        text: 'text-emerald-200',
      };
    case 'WARNING':
      return {
        border: 'border-amber-500/30',
        badge: 'bg-amber-500/15 text-amber-200',
        text: 'text-amber-100',
      };
    case 'CRITICAL':
      return {
        border: 'border-rose-500/40',
        badge: 'bg-rose-500/15 text-rose-200',
        text: 'text-rose-100',
      };
    default:
      return {
        border: 'border-slate-500/30',
        badge: 'bg-slate-500/15 text-slate-300',
        text: 'text-slate-300',
      };
  }
}

function overallStyles(state: string): string {
  const s = state.toUpperCase();
  if (s === 'OPERATIONAL') return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100';
  if (s.includes('WARNING') || s === 'OPERATIONAL_WITH_WARNING') {
    return 'border-amber-500/40 bg-amber-500/10 text-amber-100';
  }
  if (s === 'CRITICAL') return 'border-rose-500/40 bg-rose-500/15 text-rose-100';
  if (s.includes('DEGRADED') || s.includes('MONITORING')) {
    return 'border-amber-500/40 bg-amber-500/10 text-amber-100';
  }
  return 'border-white/10 bg-white/[0.02] text-slate-200';
}

function moneyUsd(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: value >= 100 ? 0 : 2,
    }).format(value);
  } catch {
    return `$${value.toFixed(2)}`;
  }
}

function parseSubsystems(overview: MonitoringOverview | null): MonitoringSubsystem[] {
  if (!overview) return [];
  const fromArray = overview.subsystems ?? [];
  if (Array.isArray(fromArray) && fromArray.length > 0) return fromArray;

  const raw = overview.subsystemStatuses ?? overview.subsystem_statuses;
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object') {
    return Object.entries(raw).map(([code, value]) => {
      if (value && typeof value === 'object') {
        return { code, ...(value as MonitoringSubsystem) };
      }
      return { code, status: String(value ?? 'UNAVAILABLE') };
    });
  }
  return [];
}

function pickSubsystem(
  list: MonitoringSubsystem[],
  aliases: string[],
): MonitoringSubsystem | null {
  const lower = aliases.map((a) => a.toLowerCase());
  for (const item of list) {
    const code = String(item.code ?? '').toLowerCase();
    const layer = String(item.layer ?? '').toLowerCase();
    if (lower.includes(code) || lower.includes(layer)) return item;
  }
  return null;
}

function isOpenIncident(status?: string): boolean {
  const s = String(status ?? 'detected').toLowerCase();
  return !['resolved', 'closed'].includes(s);
}

function severityRank(sev?: string): number {
  const s = String(sev ?? '').toLowerCase();
  if (s === 'critical') return 4;
  if (s === 'high') return 3;
  if (s === 'warning' || s === 'warn') return 2;
  if (s === 'info') return 1;
  return 0;
}

export function MonitoringPanel({ disabled }: Props) {
  const [overview, setOverview] = useState<MonitoringOverview | null>(null);
  const [attention, setAttention] = useState<MonitoringAttentionItem[]>([]);
  const [incidents, setIncidents] = useState<MonitoringIncident[]>([]);
  const [costs, setCosts] = useState<MonitoringCostLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (disabled) return;
    setLoading(true);
    setError(null);
    try {
      const [ovRes, attRes, incRes, costRes] = await Promise.all([
        fetch('/api/atina/monitoring/overview'),
        fetch('/api/atina/monitoring/attention'),
        fetch('/api/atina/monitoring/incidents'),
        fetch('/api/atina/monitoring/costs'),
      ]);

      const ovJson = (await ovRes.json()) as BffEnvelope<MonitoringOverview>;
      if (!ovRes.ok || !ovJson.ok) {
        setOverview(null);
        setError(ovJson.detail ?? ovJson.error ?? 'Monitoring API unavailable');
      } else {
        setOverview(ovJson.data ?? null);
      }

      if (attRes.ok) {
        const json = (await attRes.json()) as BffEnvelope<unknown>;
        if (json.ok) {
          setAttention(unwrapList<MonitoringAttentionItem>(json.data, ['attention', 'items']));
        }
      }
      if (incRes.ok) {
        const json = (await incRes.json()) as BffEnvelope<unknown>;
        if (json.ok) {
          setIncidents(unwrapList<MonitoringIncident>(json.data, ['incidents', 'items']));
        }
      }
      if (costRes.ok) {
        const json = (await costRes.json()) as BffEnvelope<unknown>;
        if (json.ok) {
          const data = json.data;
          if (Array.isArray(data)) {
            setCosts(data as MonitoringCostLine[]);
          } else if (data && typeof data === 'object') {
            const obj = data as Record<string, unknown>;
            const lines = unwrapList<MonitoringCostLine>(data, ['items', 'lines', 'costs']);
            if (lines.length > 0) {
              setCosts(lines);
            } else if (obj.omiEstimatedUsd != null || obj.omi_estimated_usd != null) {
              setCosts([
                {
                  label: 'OMI usage',
                  amountUsd: Number(obj.omiEstimatedUsd ?? obj.omi_estimated_usd),
                  kind: String(obj.costKind ?? obj.cost_kind ?? obj.kind ?? 'UNAVAILABLE'),
                },
              ]);
            } else {
              setCosts([]);
            }
          }
        }
      }
    } catch {
      setOverview(null);
      setError('Monitoring API unavailable');
    } finally {
      setLoading(false);
    }
  }, [disabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const subsystems = useMemo(() => parseSubsystems(overview), [overview]);

  const monitoringSelf = useMemo(() => {
    const raw = overview?.monitoringSelf ?? overview?.monitoring_self;
    if (raw && typeof raw === 'object') return raw as MonitoringSubsystem;
    return pickSubsystem(subsystems, ['monitoring', 'monitoring_self']);
  }, [overview, subsystems]);

  const monitoringSelfDegraded = useMemo(() => {
    const status = normalizeStatus(monitoringSelf?.status);
    return status === 'UNAVAILABLE' || status === 'WARNING' || status === 'CRITICAL';
  }, [monitoringSelf]);

  const overallState = String(
    overview?.overallState ?? overview?.overall_state ?? (error ? '—' : 'UNAVAILABLE'),
  );

  const criticalCount =
    overview?.criticalIncidents ??
    overview?.critical_incidents ??
    overview?.openCriticalIncidents ??
    overview?.open_critical_incidents ??
    null;

  const warningCount =
    overview?.warnings ?? overview?.warningCount ?? overview?.warning_count ?? null;

  const openIncidentCount =
    overview?.openIncidents ??
    overview?.open_incidents ??
    null;

  const attentionList = useMemo(() => {
    const fromDash = overview?.attention ?? [];
    const merged = attention.length > 0 ? attention : fromDash;
    return [...merged].sort((a, b) => {
      const sev = severityRank(b.severity) - severityRank(a.severity);
      if (sev !== 0) return sev;
      const bi =
        Number(b.businessImpact ?? b.business_impact ?? 0) -
        Number(a.businessImpact ?? a.business_impact ?? 0);
      if (bi !== 0) return bi;
      return Number(b.urgency ?? 0) - Number(a.urgency ?? 0);
    });
  }, [attention, overview?.attention]);

  const openIncidents = useMemo(() => {
    const fromDash = overview?.incidents ?? [];
    const merged = incidents.length > 0 ? incidents : fromDash;
    return merged.filter((i) => isOpenIncident(i.status));
  }, [incidents, overview?.incidents]);

  const costLines = useMemo(() => {
    if (costs.length > 0) return costs;
    const raw = overview?.costs;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    return unwrapList<MonitoringCostLine>(raw, ['items', 'lines', 'costs']);
  }, [costs, overview?.costs]);

  const runProbes = async () => {
    if (disabled) return;
    setRunning(true);
    setActionMsg(null);
    try {
      const res = await csrfFetch('/api/atina/monitoring/engine/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const json = (await res.json()) as BffEnvelope<unknown>;
      if (!res.ok || !json.ok) {
        setActionMsg(json.detail ?? json.error ?? `probe_run_failed_${res.status}`);
        return;
      }
      setActionMsg('Probe suite requested.');
      await refresh();
    } catch {
      setActionMsg('Probe run failed.');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-4">
      <GlassCard delay={0.1}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Radar className="h-5 w-5 text-cyan-400" />
            <div>
              <h2 className="font-display text-lg font-semibold text-white">
                Monitoring Control Center
              </h2>
              <p className="text-xs text-slate-500">
                Observability only — health, incidents, and attention. No financial controls here.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void runProbes()}
              disabled={disabled || running}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/10 disabled:opacity-50"
            >
              <Play className={`h-3.5 w-3.5 ${running ? 'animate-pulse' : ''}`} />
              Run probes
            </button>
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={disabled || loading}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/10 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <Link
              href="/admin/reinvestment"
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/10"
            >
              Reinvestment
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {disabled ? (
          <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
            Sign in with an admin account to use the Monitoring Control Center.
          </p>
        ) : null}

        {error ? (
          <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
            Monitoring API unavailable
            {error !== 'Monitoring API unavailable' ? ` (${error})` : ''}.
          </p>
        ) : null}

        {actionMsg ? (
          <p className="mb-3 rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-3 text-sm text-cyan-100">
            {actionMsg}
          </p>
        ) : null}

        {!error && monitoringSelfDegraded ? (
          <p className="mb-3 flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-100">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            Monitoring data may be incomplete
            {monitoringSelf?.reason || monitoringSelf?.message
              ? ` — ${monitoringSelf.reason ?? monitoringSelf.message}`
              : ''}
            .
          </p>
        ) : null}
      </GlassCard>

      {!disabled && !error ? (
        <>
          <GlassCard delay={0.14}>
            <h3 className="font-display text-base font-semibold text-white">Executive summary</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className={`rounded-xl border p-3 ${overallStyles(overallState)}`}>
                <p className="text-xs uppercase tracking-wider text-slate-400">Overall state</p>
                <p className="mt-2 text-lg font-semibold">{overallState.replace(/_/g, ' ')}</p>
              </div>
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                <p className="text-xs uppercase tracking-wider text-slate-500">Critical incidents</p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {criticalCount == null ? '—' : criticalCount}
                </p>
              </div>
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                <p className="text-xs uppercase tracking-wider text-slate-500">Warnings</p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {warningCount == null ? '—' : warningCount}
                </p>
              </div>
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                <p className="text-xs uppercase tracking-wider text-slate-500">Open incidents</p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {openIncidentCount == null ? openIncidents.length : openIncidentCount}
                </p>
              </div>
            </div>
            {(overview?.reasons ?? overview?.notes ?? []).length > 0 ? (
              <ul className="mt-3 space-y-1 text-xs text-slate-400">
                {(overview?.reasons ?? overview?.notes ?? []).slice(0, 8).map((note, i) => (
                  <li key={`${note}-${i}`}>• {note}</li>
                ))}
              </ul>
            ) : null}
          </GlassCard>

          <GlassCard delay={0.18}>
            <h3 className="font-display text-base font-semibold text-white">Subsystem health</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {SUBSYSTEM_GRID.map((slot) => {
                const hit = pickSubsystem(subsystems, slot.aliases);
                const status = normalizeStatus(hit?.status);
                const styles = statusStyles(status);
                const reason = hit?.reason ?? hit?.message ?? (hit ? '—' : 'No probe data');
                return (
                  <div
                    key={slot.key}
                    className={`rounded-xl border ${styles.border} bg-white/[0.02] p-3`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-white">{slot.label}</p>
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${styles.badge}`}>
                        {status}
                      </span>
                    </div>
                    <p className={`mt-2 text-xs ${styles.text}`}>{reason}</p>
                  </div>
                );
              })}
            </div>
          </GlassCard>

          <div className="grid gap-4 lg:grid-cols-2">
            <GlassCard delay={0.22}>
              <h3 className="font-display text-base font-semibold text-white">Attention required</h3>
              {attentionList.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">No attention items.</p>
              ) : (
                <ul className="mt-3 max-h-96 space-y-2 overflow-y-auto">
                  {attentionList.slice(0, 20).map((item, i) => {
                    const sev = String(item.severity ?? 'info').toLowerCase();
                    const border =
                      sev === 'critical'
                        ? 'border-rose-500/40'
                        : sev === 'high' || sev === 'warning' || sev === 'warn'
                          ? 'border-amber-500/30'
                          : 'border-white/10';
                    return (
                      <li
                        key={item.id ?? `${item.title}-${i}`}
                        className={`rounded-xl border ${border} bg-white/[0.02] p-3 text-sm`}
                      >
                        <div className="flex items-start gap-2">
                          <AlertTriangle
                            className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                              sev === 'critical'
                                ? 'text-rose-300'
                                : sev === 'high' || sev === 'warning' || sev === 'warn'
                                  ? 'text-amber-300'
                                  : 'text-slate-400'
                            }`}
                          />
                          <div>
                            <p className="font-medium text-white">
                              {item.title ?? item.serviceCode ?? item.service_code ?? 'Attention'}
                            </p>
                            {item.message ? (
                              <p className="mt-1 text-xs text-slate-400">{item.message}</p>
                            ) : null}
                            <p className="mt-1 text-[10px] uppercase tracking-wider text-slate-500">
                              {sev}
                              {item.serviceCode || item.service_code
                                ? ` · ${item.serviceCode ?? item.service_code}`
                                : ''}
                            </p>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </GlassCard>

            <GlassCard delay={0.26}>
              <h3 className="font-display text-base font-semibold text-white">Open incidents</h3>
              {openIncidents.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">No open incidents.</p>
              ) : (
                <ul className="mt-3 max-h-96 space-y-2 overflow-y-auto">
                  {openIncidents.slice(0, 20).map((inc, i) => {
                    const sev = String(inc.severity ?? 'warning').toLowerCase();
                    const border =
                      sev === 'critical'
                        ? 'border-rose-500/40'
                        : sev === 'high'
                          ? 'border-amber-500/30'
                          : 'border-white/10';
                    return (
                      <li
                        key={inc.id ?? inc.publicCode ?? `${inc.title}-${i}`}
                        className={`rounded-xl border ${border} bg-white/[0.02] p-3 text-sm`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <p className="font-medium text-white">
                            {inc.publicCode ?? inc.public_code
                              ? `${inc.publicCode ?? inc.public_code} · `
                              : ''}
                            {inc.title ?? 'Untitled incident'}
                          </p>
                          <span className="rounded px-1.5 py-0.5 text-[10px] font-medium uppercase text-slate-300 bg-white/5">
                            {inc.status ?? 'detected'}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          {sev}
                          {inc.affectedService || inc.affected_service
                            ? ` · ${inc.affectedService ?? inc.affected_service}`
                            : ''}
                        </p>
                        {inc.symptoms ? (
                          <p className="mt-2 text-xs text-slate-400">{inc.symptoms}</p>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </GlassCard>
          </div>

          {costLines.length > 0 ? (
            <GlassCard delay={0.3}>
              <h3 className="font-display text-base font-semibold text-white">Costs</h3>
              <ul className="mt-3 space-y-2">
                {costLines.map((line, i) => {
                  const badge = kindBadge(line.kind ?? line.costKind ?? line.cost_kind) ?? 'UNAVAILABLE';
                  const amount =
                    line.amountUsd ?? line.amount_usd ?? line.amount ?? null;
                  return (
                    <li
                      key={line.metricKey ?? line.metric_key ?? `${line.label}-${i}`}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-3 text-sm"
                    >
                      <div>
                        <p className="font-medium text-white">
                          {line.label ?? line.metricKey ?? line.metric_key ?? 'Cost'}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {moneyUsd(amount != null ? Number(amount) : null)}
                          {line.currency && line.currency !== 'USD' ? ` (${line.currency})` : ''}
                        </p>
                      </div>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                          badge === 'ACTUAL'
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : badge === 'ESTIMATE'
                              ? 'bg-amber-500/15 text-amber-200'
                              : 'bg-slate-500/15 text-slate-300'
                        }`}
                      >
                        {badge}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </GlassCard>
          ) : null}

          <GlassCard delay={0.34}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-base font-semibold text-white">
                  Reinvestment bridge
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Read-only operational signals live under Monitoring. Capital allocation stays in
                  Reinvestment.
                </p>
              </div>
              <Link
                href="/admin/reinvestment"
                className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs text-cyan-100 hover:bg-cyan-500/20"
              >
                Open Reinvestment Engine
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>
          </GlassCard>
        </>
      ) : null}
    </div>
  );
}
