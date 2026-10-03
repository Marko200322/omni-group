'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Landmark,
  Play,
  RefreshCw,
  ShieldAlert,
  XCircle,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { csrfFetch } from '@/lib/csrf-fetch';

export type ReinvestmentAccountCode = 'revenue' | 'system' | 'marketing' | 'profit_reserve';

export type ReinvestmentAccount = {
  code?: ReinvestmentAccountCode | string;
  name?: string;
  currency?: string;
  availableCents?: number;
  available_cents?: number;
  pendingCents?: number;
  pending_cents?: number;
  committedCents?: number;
  committed_cents?: number;
  reserveCents?: number;
  reserve_cents?: number;
  kind?: 'ESTIMATE' | 'ACTUAL' | string;
  source?: string;
};

export type ReinvestmentPolicy = {
  dryRun?: boolean;
  dry_run?: boolean;
  killSwitch?: boolean;
  kill_switch?: boolean;
  autonomyLevel?: number;
  autonomy_level?: number;
  operatingMode?: string;
  operating_mode?: string;
  version?: number | string;
};

export type ReinvestmentOpportunity = {
  id?: string;
  title?: string;
  explanation?: string;
  estimatedDevCostCents?: number;
  estimated_dev_cost_cents?: number;
  expectedPaybackMonths?: number | null;
  expected_payback_months?: number | null;
  estimatedMonthlyRevenueCents?: number;
  estimated_monthly_revenue_cents?: number;
  confidenceScore?: number;
  confidence_score?: number;
  riskScore?: number;
  risk_score?: number;
  priorityScore?: number;
  priority_score?: number;
  kind?: 'ESTIMATE' | 'ACTUAL' | string;
  roiLabel?: string;
  roi_label?: string;
};

export type ReinvestmentApproval = {
  id: string;
  subjectType?: string;
  subject_type?: string;
  subjectId?: string;
  subject_id?: string;
  status?: string;
  requestedAmountCents?: number | null;
  requested_amount_cents?: number | null;
  currency?: string;
  reason?: string;
  recommendation?: string;
};

export type ReinvestmentAlert = {
  id?: string;
  code?: string;
  severity?: 'info' | 'warn' | 'critical' | string;
  title?: string;
  message?: string;
  acknowledged?: boolean;
  createdAt?: string;
  created_at?: string;
};

export type ReinvestmentStatusDashboard = {
  storeReady?: boolean;
  notes?: string[];
  statusNotes?: string[];
  availableReinvestmentCapitalCents?: number;
  available_reinvestment_capital_cents?: number;
  accounts?: ReinvestmentAccount[];
  policy?: ReinvestmentPolicy | null;
  opportunities?: ReinvestmentOpportunity[];
  approvals?: ReinvestmentApproval[];
  alerts?: ReinvestmentAlert[];
  mode?: string;
  dryRun?: boolean;
  dry_run?: boolean;
  killSwitch?: boolean;
  kill_switch?: boolean;
  autonomyLevel?: number;
  autonomy_level?: number;
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

function cents(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return value;
}

function pickCents(
  camel: number | null | undefined,
  snake: number | null | undefined,
): number | null {
  return cents(camel) ?? cents(snake);
}

function moneyFromCents(value: number | null | undefined, currency = 'EUR'): string {
  if (value == null || !Number.isFinite(value)) return '—';
  const amount = value / 100;
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: amount >= 100 ? 0 : 2,
    }).format(amount);
  } catch {
    return `€${amount.toFixed(2)}`;
  }
}

function score(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return n.toFixed(n % 1 === 0 ? 0 : 1);
}

function kindBadge(kind?: string | null): 'ESTIMATE' | 'ACTUAL' | null {
  const k = String(kind ?? '').toUpperCase();
  if (k === 'ESTIMATE' || k === 'ACTUAL') return k;
  return null;
}

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

const ACCOUNT_ORDER: ReinvestmentAccountCode[] = [
  'revenue',
  'system',
  'marketing',
  'profit_reserve',
];

const ACCOUNT_LABELS: Record<string, string> = {
  revenue: 'Revenue',
  system: 'System',
  marketing: 'Marketing',
  profit_reserve: 'Profit reserve',
};

export function ReinvestmentPanel({ disabled }: Props) {
  const [dashboard, setDashboard] = useState<ReinvestmentStatusDashboard | null>(null);
  const [opportunities, setOpportunities] = useState<ReinvestmentOpportunity[]>([]);
  const [approvals, setApprovals] = useState<ReinvestmentApproval[]>([]);
  const [alerts, setAlerts] = useState<ReinvestmentAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (disabled) return;
    setLoading(true);
    setError(null);
    try {
      const [stRes, oppRes, apprRes, alertRes] = await Promise.all([
        fetch('/api/atina/reinvestment/status'),
        fetch('/api/atina/reinvestment/opportunities'),
        fetch('/api/atina/reinvestment/approvals'),
        fetch('/api/atina/reinvestment/alerts'),
      ]);

      const stJson = (await stRes.json()) as BffEnvelope<ReinvestmentStatusDashboard>;
      if (!stRes.ok || !stJson.ok) {
        setDashboard(null);
        setError(stJson.detail ?? stJson.error ?? 'Reinvestment API unavailable');
      } else {
        setDashboard(stJson.data ?? null);
      }

      if (oppRes.ok) {
        const json = (await oppRes.json()) as BffEnvelope<unknown>;
        if (json.ok) {
          setOpportunities(unwrapList<ReinvestmentOpportunity>(json.data, ['opportunities', 'items']));
        }
      }
      if (apprRes.ok) {
        const json = (await apprRes.json()) as BffEnvelope<unknown>;
        if (json.ok) {
          const list = unwrapList<ReinvestmentApproval>(json.data, ['approvals', 'items']);
          setApprovals(list.filter((a) => a?.id));
        }
      }
      if (alertRes.ok) {
        const json = (await alertRes.json()) as BffEnvelope<unknown>;
        if (json.ok) {
          setAlerts(unwrapList<ReinvestmentAlert>(json.data, ['alerts', 'items']));
        }
      }
    } catch {
      setDashboard(null);
      setError('Reinvestment API unavailable');
    } finally {
      setLoading(false);
    }
  }, [disabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const policy = dashboard?.policy ?? null;
  const dryRun = Boolean(
    dashboard?.dryRun ?? dashboard?.dry_run ?? policy?.dryRun ?? policy?.dry_run ?? true,
  );
  const killSwitch = Boolean(
    dashboard?.killSwitch ?? dashboard?.kill_switch ?? policy?.killSwitch ?? policy?.kill_switch,
  );
  const autonomyLevel =
    dashboard?.autonomyLevel ??
    dashboard?.autonomy_level ??
    policy?.autonomyLevel ??
    policy?.autonomy_level ??
    null;
  const mode =
    dashboard?.mode ??
    policy?.operatingMode ??
    policy?.operating_mode ??
    '—';

  const accounts = useMemo(() => {
    const raw = dashboard?.accounts ?? [];
    const byCode = new Map(raw.map((a) => [String(a.code ?? ''), a]));
    return ACCOUNT_ORDER.map((code) => byCode.get(code) ?? { code, name: ACCOUNT_LABELS[code] });
  }, [dashboard?.accounts]);

  const topOpps = useMemo(() => {
    const fromDash = dashboard?.opportunities ?? [];
    const merged = opportunities.length > 0 ? opportunities : fromDash;
    return [...merged]
      .sort(
        (a, b) =>
          (b.priorityScore ?? b.priority_score ?? 0) - (a.priorityScore ?? a.priority_score ?? 0),
      )
      .slice(0, 8);
  }, [dashboard?.opportunities, opportunities]);

  const pendingApprovals = useMemo(() => {
    const fromDash = (dashboard?.approvals ?? []).filter((a) => a?.id);
    const merged = approvals.length > 0 ? approvals : fromDash;
    return merged.filter((a) => (a.status ?? 'pending') === 'pending');
  }, [approvals, dashboard?.approvals]);

  const alertList = useMemo(() => {
    const fromDash = dashboard?.alerts ?? [];
    return alerts.length > 0 ? alerts : fromDash;
  }, [alerts, dashboard?.alerts]);

  const notes = dashboard?.notes ?? dashboard?.statusNotes ?? [];
  const capitalCents = pickCents(
    dashboard?.availableReinvestmentCapitalCents,
    dashboard?.available_reinvestment_capital_cents,
  );

  const decide = async (id: string, decision: 'approved' | 'rejected') => {
    if (disabled) return;
    setBusyId(id);
    setActionMsg(null);
    try {
      const res = await csrfFetch(`/api/atina/reinvestment/approvals/${encodeURIComponent(id)}/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision }),
      });
      const json = (await res.json()) as BffEnvelope<unknown>;
      if (!res.ok || !json.ok) {
        setActionMsg(json.detail ?? json.error ?? `decide_failed_${res.status}`);
        return;
      }
      setActionMsg(decision === 'approved' ? 'Approval recorded.' : 'Rejection recorded.');
      await refresh();
    } catch {
      setActionMsg('Could not submit decision.');
    } finally {
      setBusyId(null);
    }
  };

  const runEngine = async () => {
    if (disabled) return;
    setRunning(true);
    setActionMsg(null);
    try {
      const res = await csrfFetch('/api/atina/reinvestment/engine/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const json = (await res.json()) as BffEnvelope<unknown>;
      if (!res.ok || !json.ok) {
        setActionMsg(json.detail ?? json.error ?? `engine_run_failed_${res.status}`);
        return;
      }
      setActionMsg('Engine run requested.');
      await refresh();
    } catch {
      setActionMsg('Engine run failed.');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-4">
      <GlassCard delay={0.1}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-cyan-400" />
            <div>
              <h2 className="font-display text-lg font-semibold text-white">Reinvestment Engine</h2>
              <p className="text-xs text-slate-500">
                Internal admin capital allocation — analyze, approve, and (when enabled) reinvest.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void runEngine()}
              disabled={disabled || running || killSwitch}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/10 disabled:opacity-50"
            >
              <Play className={`h-3.5 w-3.5 ${running ? 'animate-pulse' : ''}`} />
              Run engine
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
          </div>
        </div>

        {disabled ? (
          <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
            Sign in with an admin account to use the Reinvestment Engine.
          </p>
        ) : null}

        {error ? (
          <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
            Reinvestment API unavailable{error !== 'Reinvestment API unavailable' ? ` (${error})` : ''}.
          </p>
        ) : null}

        {actionMsg ? (
          <p className="mb-3 rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-3 text-sm text-cyan-100">
            {actionMsg}
          </p>
        ) : null}

        {dryRun && !error ? (
          <p className="mb-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
            Dry run — no real money movement
          </p>
        ) : null}

        {killSwitch ? (
          <p className="mb-3 flex items-start gap-2 rounded-xl border border-rose-500/40 bg-rose-500/15 p-3 text-sm text-rose-100">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            Kill switch active — emergency stop. Engine mutations are blocked.
          </p>
        ) : null}

        {dashboard?.storeReady === false ? (
          <p className="mb-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
            Store not ready — balances and decisions may be incomplete.
          </p>
        ) : null}
      </GlassCard>

      {!disabled && !error ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {accounts.map((acct) => {
              const code = String(acct.code ?? '');
              const available = pickCents(acct.availableCents, acct.available_cents);
              const badge = kindBadge(acct.kind);
              return (
                <GlassCard key={code || acct.name} delay={0.12} className="!p-4">
                  <p className="text-xs uppercase tracking-wider text-slate-500">
                    {ACCOUNT_LABELS[code] ?? acct.name ?? code}
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-white">
                    {moneyFromCents(available, acct.currency ?? 'EUR')}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Available
                    {badge ? (
                      <span
                        className={`ml-2 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                          badge === 'ACTUAL'
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : 'bg-amber-500/15 text-amber-200'
                        }`}
                      >
                        {badge}
                      </span>
                    ) : null}
                  </p>
                </GlassCard>
              );
            })}
          </div>

          <GlassCard delay={0.16}>
            <h3 className="font-display text-base font-semibold text-white">Engine status</h3>
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-5">
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                <dt className="text-slate-500">Mode</dt>
                <dd className="mt-1 capitalize text-white">{String(mode)}</dd>
              </div>
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                <dt className="text-slate-500">Autonomy</dt>
                <dd className="mt-1 text-white">
                  {autonomyLevel == null ? '—' : `Level ${autonomyLevel}`}
                </dd>
              </div>
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                <dt className="text-slate-500">Dry run</dt>
                <dd className="mt-1 text-white">{dryRun ? 'On' : 'Off'}</dd>
              </div>
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                <dt className="text-slate-500">Kill switch</dt>
                <dd className="mt-1 text-white">{killSwitch ? 'Active' : 'Off'}</dd>
              </div>
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                <dt className="text-slate-500">Reinvestable capital</dt>
                <dd className="mt-1 text-white">{moneyFromCents(capitalCents)}</dd>
              </div>
            </dl>
            {notes.length > 0 ? (
              <ul className="mt-3 space-y-1 text-xs text-slate-400">
                {notes.map((note, i) => (
                  <li key={`${note}-${i}`}>• {note}</li>
                ))}
              </ul>
            ) : null}
          </GlassCard>

          <GlassCard delay={0.2}>
            <h3 className="font-display text-base font-semibold text-white">Top opportunities</h3>
            {topOpps.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">No opportunities yet.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {topOpps.map((opp, i) => {
                  const cost = pickCents(opp.estimatedDevCostCents, opp.estimated_dev_cost_cents);
                  const payback = opp.expectedPaybackMonths ?? opp.expected_payback_months;
                  const monthly = pickCents(
                    opp.estimatedMonthlyRevenueCents,
                    opp.estimated_monthly_revenue_cents,
                  );
                  const roi =
                    opp.roiLabel ??
                    opp.roi_label ??
                    (payback != null
                      ? `~${payback} mo payback`
                      : monthly != null
                        ? `${moneyFromCents(monthly)}/mo`
                        : null);
                  const badge = kindBadge(opp.kind) ?? 'ESTIMATE';
                  return (
                    <li
                      key={opp.id ?? `${opp.title}-${i}`}
                      className="rounded-xl border border-white/5 bg-white/[0.02] p-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-white">{opp.title ?? 'Untitled opportunity'}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            Cost {moneyFromCents(cost)}
                            {roi ? ` · ROI/payback ${roi}` : ''}
                            {' · '}confidence {score(opp.confidenceScore ?? opp.confidence_score)}
                            {' · '}risk {score(opp.riskScore ?? opp.risk_score)}
                            {' · '}priority {score(opp.priorityScore ?? opp.priority_score)}
                          </p>
                        </div>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                            badge === 'ACTUAL'
                              ? 'bg-emerald-500/15 text-emerald-300'
                              : 'bg-amber-500/15 text-amber-200'
                          }`}
                        >
                          {badge}
                        </span>
                      </div>
                      {opp.explanation ? (
                        <p className="mt-2 text-sm text-slate-400">{opp.explanation}</p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </GlassCard>

          <div className="grid gap-4 lg:grid-cols-2">
            <GlassCard delay={0.24}>
              <h3 className="font-display text-base font-semibold text-white">Pending approvals</h3>
              {pendingApprovals.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">No pending approvals.</p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {pendingApprovals.map((row) => {
                    const amount = pickCents(row.requestedAmountCents, row.requested_amount_cents);
                    const subject = row.subjectType ?? row.subject_type ?? 'item';
                    return (
                      <li
                        key={row.id}
                        className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-sm"
                      >
                        <p className="font-medium text-white">
                          {subject}
                          {amount != null ? ` · ${moneyFromCents(amount, row.currency ?? 'EUR')}` : ''}
                        </p>
                        {row.reason ? <p className="mt-1 text-xs text-slate-400">{row.reason}</p> : null}
                        {row.recommendation ? (
                          <p className="mt-1 text-xs text-slate-500">Rec: {row.recommendation}</p>
                        ) : null}
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={busyId === row.id}
                            onClick={() => void decide(row.id, 'approved')}
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-50"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={busyId === row.id}
                            onClick={() => void decide(row.id, 'rejected')}
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-200 hover:bg-rose-500/20 disabled:opacity-50"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            Reject
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </GlassCard>

            <GlassCard delay={0.28}>
              <h3 className="font-display text-base font-semibold text-white">Alerts</h3>
              {alertList.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">No alerts.</p>
              ) : (
                <ul className="mt-3 max-h-80 space-y-2 overflow-y-auto">
                  {alertList.slice(0, 20).map((alert, i) => {
                    const sev = alert.severity ?? 'info';
                    const border =
                      sev === 'critical'
                        ? 'border-rose-500/40'
                        : sev === 'warn'
                          ? 'border-amber-500/30'
                          : 'border-white/10';
                    return (
                      <li
                        key={alert.id ?? `${alert.code}-${i}`}
                        className={`rounded-xl border ${border} bg-white/[0.02] p-3 text-sm`}
                      >
                        <div className="flex items-start gap-2">
                          <AlertTriangle
                            className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                              sev === 'critical'
                                ? 'text-rose-300'
                                : sev === 'warn'
                                  ? 'text-amber-300'
                                  : 'text-slate-400'
                            }`}
                          />
                          <div>
                            <p className="font-medium text-white">{alert.title ?? alert.code ?? 'Alert'}</p>
                            {alert.message ? (
                              <p className="mt-1 text-xs text-slate-400">{alert.message}</p>
                            ) : null}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </GlassCard>
          </div>
        </>
      ) : null}
    </div>
  );
}
