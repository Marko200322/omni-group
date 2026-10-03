'use client';

import { useCallback, useEffect, useState } from 'react';
import { Activity, RefreshCw } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';

type OmiUsageDashboard = {
  storeReady?: boolean;
  failClosed?: boolean;
  budget?: {
    dailyBudgetUsd?: number;
    monthlyBudgetUsd?: number;
    reservePercent?: number;
    dailySpendableUsd?: number;
    monthlySpendableUsd?: number;
    dailySpentUsd?: number;
    monthlySpentUsd?: number;
    dailyPct?: number;
    monthlyPct?: number;
    aiAllowed?: boolean;
  };
  requests?: {
    today?: number;
    month?: number;
    blockedToday?: number;
    blockedMonth?: number;
  };
  costByModel?: Array<{ model: string; costUsd: number; requests: number }>;
  topSessions?: Array<{ sessionId: string; requests: number; costUsd: number }>;
  recentBlocked?: Array<{ at?: string; reason?: string; sessionId?: string }>;
};

function money(n: number | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return `$${n.toFixed(n >= 10 ? 2 : 4)}`;
}

export function OmiUsagePanel() {
  const [data, setData] = useState<OmiUsageDashboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch('/api/atina/admin/omi-usage');
      const json = (await r.json()) as { ok?: boolean; data?: OmiUsageDashboard; error?: string; detail?: string };
      if (!r.ok || !json.ok || !json.data) {
        setError(json.detail ?? json.error ?? `http_${r.status}`);
        return;
      }
      setData(json.data);
    } catch {
      setError('network_error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const budget = data?.budget;
  const requests = data?.requests;

  return (
    <GlassCard delay={0.32} className="xl:col-span-3">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-cyan-400" />
          <div>
            <h2 className="font-display text-lg font-semibold text-white">OMI AI usage</h2>
            <p className="text-xs text-slate-500">
              Admin-only spend, limits, and blocked events. Cost estimates are server-side only.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/10 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error ? (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
          Could not load OMI usage ({error}).
        </p>
      ) : null}

      {data?.failClosed || data?.storeReady === false ? (
        <p className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
          Usage store unavailable — AI spend is fail-closed (no paid OMI calls until Redis recovers).
        </p>
      ) : null}

      <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
          <dt className="text-slate-500">Today requests</dt>
          <dd className="mt-1 text-2xl font-semibold text-white">{requests?.today ?? '—'}</dd>
        </div>
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
          <dt className="text-slate-500">Month requests</dt>
          <dd className="mt-1 text-2xl font-semibold text-white">{requests?.month ?? '—'}</dd>
        </div>
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
          <dt className="text-slate-500">Blocked today / month</dt>
          <dd className="mt-1 text-2xl font-semibold text-white">
            {requests?.blockedToday ?? '—'} / {requests?.blockedMonth ?? '—'}
          </dd>
        </div>
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
          <dt className="text-slate-500">AI allowed</dt>
          <dd className="mt-1 text-2xl font-semibold text-white">
            {budget?.aiAllowed == null ? '—' : budget.aiAllowed ? 'Yes' : 'No'}
          </dd>
        </div>
      </dl>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-sm">
          <h3 className="font-medium text-slate-200">Budget</h3>
          <ul className="mt-2 space-y-1 text-slate-400">
            <li>
              Daily: {money(budget?.dailySpentUsd)} / {money(budget?.dailySpendableUsd)} spendable
              ({budget?.dailyPct ?? 0}% · reserve {budget?.reservePercent ?? '—'}% of{' '}
              {money(budget?.dailyBudgetUsd)})
            </li>
            <li>
              Monthly: {money(budget?.monthlySpentUsd)} / {money(budget?.monthlySpendableUsd)} spendable
              ({budget?.monthlyPct ?? 0}% · of {money(budget?.monthlyBudgetUsd)})
            </li>
          </ul>
        </div>
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-sm">
          <h3 className="font-medium text-slate-200">Cost by model (today)</h3>
          {(data?.costByModel?.length ?? 0) === 0 ? (
            <p className="mt-2 text-slate-500">No AI spend recorded today.</p>
          ) : (
            <ul className="mt-2 space-y-1 text-slate-400">
              {data!.costByModel!.slice(0, 8).map((row) => (
                <li key={row.model} className="flex justify-between gap-3">
                  <span className="truncate font-mono text-xs text-cyan-300/90">{row.model}</span>
                  <span>
                    {money(row.costUsd)} · {row.requests} req
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-sm">
          <h3 className="font-medium text-slate-200">Top sessions (today)</h3>
          {(data?.topSessions?.length ?? 0) === 0 ? (
            <p className="mt-2 text-slate-500">No sessions yet.</p>
          ) : (
            <ul className="mt-2 space-y-1 text-slate-400">
              {data!.topSessions!.slice(0, 8).map((row) => (
                <li key={row.sessionId} className="flex justify-between gap-3">
                  <span className="truncate font-mono text-xs">{row.sessionId.slice(0, 12)}…</span>
                  <span>
                    {row.requests} msg · {money(row.costUsd)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-sm">
          <h3 className="font-medium text-slate-200">Recent blocked</h3>
          {(data?.recentBlocked?.length ?? 0) === 0 ? (
            <p className="mt-2 text-slate-500">No blocks recorded.</p>
          ) : (
            <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-slate-400">
              {data!.recentBlocked!.slice(0, 12).map((ev, i) => (
                <li key={`${ev.at}-${i}`} className="text-xs">
                  <span className="text-rose-300/90">{ev.reason ?? 'blocked'}</span>
                  {ev.sessionId ? (
                    <span className="ml-2 font-mono text-slate-500">{ev.sessionId.slice(0, 8)}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </GlassCard>
  );
}
