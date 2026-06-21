'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Bot, Play, RefreshCw, Sparkles, Timer } from 'lucide-react';
import { formatEur } from '@/lib/category-pricing';
import { calculateDeliverableQuote } from '@/lib/dynamic-pricing';

type AutonomyStatus = {
  seedCatalogSize?: number;
  verticalsInDb?: number;
  budget?: {
    initialUsd?: number;
    balanceUsd?: number;
    totalSpentUsd?: number;
    totalRevenueUsd?: number;
    minReserveUsd?: number;
    maxSpendPerTickUsd?: number;
    maxSpendPerDayUsd?: number;
    spentTodayUsd?: number;
    marketingEnabled?: boolean;
    hardStop?: boolean;
  } | null;
  scheduler?: {
    enabled?: boolean;
    running?: boolean;
    intervalMs?: number;
    lastTickAt?: string | null;
    autoDeploy?: boolean;
    realEcosystemRuns?: boolean;
  };
  latestCycle?: {
    id?: string;
    status?: string;
    steps_completed?: string[];
    created_at?: string;
  } | null;
};

type VerticalRow = {
  slug?: string;
  name?: string;
  category?: string;
  status?: string;
  priority_score?: number | string;
  research?: {
    ai_enriched?: boolean;
    opportunities?: string[];
    scrape?: { delivery?: string; title?: string };
  };
};

type CategoryRolloutRow = {
  order?: number;
  category?: string;
  categoryName?: string;
  phase?: 'pending' | 'in_progress' | 'ready' | 'empty';
  total?: number;
  readyCount?: number;
  completionPct?: number;
  outboundDrafts?: number;
  segment?: 'freelance' | 'legacy_smb';
};

type CategoryRolloutSummary = {
  totalCategories?: number;
  freelanceCategories?: number;
  legacyCategories?: number;
  freelanceReadyCount?: number;
  completedCategories?: number;
  inProgressCategories?: number;
  overallCompletionPct?: number;
  nextCategory?: string | null;
  nextCategoryName?: string | null;
  categories?: CategoryRolloutRow[];
};

type OutboundStats = {
  warmupComplete?: boolean;
  warmupMode?: boolean;
  dailyCap?: number;
  sentToday?: number;
  remainingToday?: number;
  byStatus?: Record<string, number>;
};

type Props = {
  isAdmin?: boolean;
  disabled?: boolean;
};

function formatRelative(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const diff = Date.now() - d.getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 48) return `${hrs}h ago`;
  return d.toLocaleDateString('en-US');
}

export function AutonomyLoopPanel({ isAdmin, disabled }: Props) {
  const [status, setStatus] = useState<AutonomyStatus | null>(null);
  const [verticals, setVerticals] = useState<VerticalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastTick, setLastTick] = useState<Record<string, unknown> | null>(null);
  const [outbound, setOutbound] = useState<OutboundStats | null>(null);
  const [rollout, setRollout] = useState<CategoryRolloutSummary | null>(null);
  const [lastBatch, setLastBatch] = useState<Record<string, unknown> | null>(null);
  const [lastEvolution, setLastEvolution] = useState<Record<string, unknown> | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const [stRes, vRes, obRes, catRes] = await Promise.all([
        fetch('/api/atina/autonomy-loop/status'),
        fetch('/api/atina/autonomy-loop/verticals?limit=6'),
        fetch('/api/atina/autonomy-loop/outbound/stats'),
        fetch('/api/atina/autonomy-loop/categories/status'),
      ]);
      const stJson = (await stRes.json()) as { ok?: boolean; data?: AutonomyStatus; error?: string };
      const vJson = (await vRes.json()) as {
        ok?: boolean;
        data?: { verticals?: VerticalRow[] };
        error?: string;
      };
      const obJson = (await obRes.json()) as { ok?: boolean; data?: OutboundStats; error?: string };
      const catJson = (await catRes.json()) as {
        ok?: boolean;
        data?: CategoryRolloutSummary;
        error?: string;
      };
      if (!stRes.ok || !stJson.ok) {
        setError(stJson.error ?? `status_${stRes.status}`);
      } else {
        setStatus(stJson.data ?? null);
      }
      if (vRes.ok && vJson.ok) {
        setVerticals(vJson.data?.verticals ?? []);
      }
      if (obRes.ok && obJson.ok) {
        setOutbound(obJson.data ?? null);
      }
      if (catRes.ok && catJson.ok) {
        setRollout(catJson.data ?? null);
      }
    } catch {
      setError('network_error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!disabled) void load();
  }, [disabled, load]);

  const runTick = async () => {
    setBusy('tick');
    setError(null);
    try {
      const res = await fetch('/api/atina/autonomy-loop/tick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxVerticals: 2 }),
      });
      const json = (await res.json()) as { ok?: boolean; data?: Record<string, unknown>; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error ?? `tick_${res.status}`);
        return;
      }
      setLastTick(json.data ?? null);
      await load();
    } catch {
      setError('tick_network');
    } finally {
      setBusy(null);
    }
  };

  const runEvolutionTick = async () => {
    setBusy('evolution');
    setError(null);
    try {
      const res = await fetch('/api/atina/autonomy-loop/evolution/tick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const json = (await res.json()) as { ok?: boolean; data?: Record<string, unknown>; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error ?? `evolution_${res.status}`);
        return;
      }
      setLastEvolution(json.data ?? null);
      await load();
    } catch {
      setError('evolution_network');
    } finally {
      setBusy(null);
    }
  };

  const runResearch = async (slug: string) => {
    setBusy(`research:${slug}`);
    setError(null);
    try {
      const res = await fetch(`/api/atina/autonomy-loop/verticals/${encodeURIComponent(slug)}/research`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intensity: 55 }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error ?? `research_${res.status}`);
        return;
      }
      await load();
    } catch {
      setError('research_network');
    } finally {
      setBusy(null);
    }
  };

  const runCategoryBatch = async (
    category: string,
    mode: 'research' | 'generate' | 'full' = 'full',
  ) => {
    setBusy(`batch:${category}`);
    setError(null);
    try {
      const res = await fetch(
        `/api/atina/autonomy-loop/categories/${encodeURIComponent(category)}/batch`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode, limit: 8, processAllVerticals: true }),
        },
      );
      const json = (await res.json()) as { ok?: boolean; data?: Record<string, unknown>; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error ?? `batch_${res.status}`);
        return;
      }
      setLastBatch(json.data ?? null);
      await load();
    } catch {
      setError('batch_network');
    } finally {
      setBusy(null);
    }
  };

  const runRollout = async (maxCategories: number) => {
    setBusy('rollout');
    setError(null);
    try {
      const res = await fetch('/api/atina/autonomy-loop/categories/rollout/async', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'full',
          limit: 8,
          maxCategories,
          processAllVerticals: true,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; data?: Record<string, unknown>; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error ?? `rollout_${res.status}`);
        return;
      }

      for (let i = 0; i < 360; i += 1) {
        await new Promise((r) => setTimeout(r, 5000));
        const jobRes = await fetch('/api/atina/autonomy-loop/categories/rollout/job');
        const jobJson = (await jobRes.json()) as {
          ok?: boolean;
          data?: { active?: { status?: string }; last?: { status?: string; result?: Record<string, unknown> } };
        };
        if (!jobRes.ok || !jobJson.ok) continue;
        const active = jobJson.data?.active;
        const last = jobJson.data?.last;
        if (active?.status === 'running') continue;
        if (last?.status === 'completed' && last.result) {
          setLastBatch(last.result);
          break;
        }
        if (last?.status === 'failed') {
          setError('rollout_job_failed');
          break;
        }
      }
      await load();
    } catch {
      setError('rollout_network');
    } finally {
      setBusy(null);
    }
  };

  const phaseLabel = (phase?: CategoryRolloutRow['phase']) => {
    switch (phase) {
      case 'ready':
        return 'Ready';
      case 'in_progress':
        return 'In progress';
      case 'empty':
        return 'Empty';
      default:
        return 'Pending';
    }
  };

  const phaseColor = (phase?: CategoryRolloutRow['phase']) => {
    switch (phase) {
      case 'ready':
        return 'text-emerald-300';
      case 'in_progress':
        return 'text-violet-300';
      case 'empty':
        return 'text-slate-500';
      default:
        return 'text-amber-300';
    }
  };

  const toggleScheduler = async (start: boolean) => {
    setBusy(start ? 'scheduler-start' : 'scheduler-stop');
    setError(null);
    try {
      const res = await fetch(`/api/atina/autonomy-loop/scheduler/${start ? 'start' : 'stop'}`, {
        method: 'POST',
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error ?? 'scheduler_failed');
        return;
      }
      await load();
    } catch {
      setError('scheduler_network');
    } finally {
      setBusy(null);
    }
  };

  if (disabled) {
    return (
      <p className="mt-4 text-sm text-slate-500">
        Autonomy Loop requires a valid Atina session (admin@atina.io).
      </p>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      {loading && !status && (
        <p className="text-sm text-slate-500">Loading Autonomy Loop status…</p>
      )}
      {error && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          {error}
        </p>
      )}

      {status && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
            <p className="text-xs text-slate-500">Budget (USD)</p>
            <p className="font-display text-xl font-bold text-white">
              ${(status.budget?.balanceUsd ?? 0).toFixed(2)}
              <span className="ml-1 text-sm font-normal text-slate-500">
                / ${(status.budget?.initialUsd ?? 0).toFixed(0)}
              </span>
            </p>
            {status.budget?.hardStop && (
              <p className="mt-1 text-xs text-amber-300">Paused — reserve reached</p>
            )}
          </div>
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
            <p className="text-xs text-slate-500">Today / limit</p>
            <p className="font-medium text-white">
              ${(status.budget?.spentTodayUsd ?? 0).toFixed(2)}
              <span className="text-slate-500">
                {' '}
                / ${(status.budget?.maxSpendPerDayUsd ?? 0).toFixed(0)}
              </span>
            </p>
            <p className="text-xs text-slate-500">
              tick max ${(status.budget?.maxSpendPerTickUsd ?? 0).toFixed(2)} · reinvest revenue
            </p>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
            <p className="text-xs text-slate-500">Verticals in database</p>
            <p className="font-display text-xl font-bold text-white">
              {status.verticalsInDb ?? 0}
              <span className="ml-1 text-sm font-normal text-slate-500">
                / {status.seedCatalogSize ?? 500}
              </span>
            </p>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
            <p className="text-xs text-slate-500">Scheduler</p>
            <p className="font-medium text-emerald-300">
              {status.scheduler?.running ? 'Active' : status.scheduler?.enabled ? 'Ready' : 'Disabled'}
            </p>
            <p className="text-xs text-slate-500">
              tick {Math.round((status.scheduler?.intervalMs ?? 300000) / 60000)} min
            </p>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
            <p className="text-xs text-slate-500">Industry rollout</p>
            <p className="font-medium text-white">
              {rollout?.completedCategories ?? 0}/{rollout?.totalCategories ?? 50} ready
              {typeof rollout?.freelanceReadyCount === 'number' && (
                <span className="ml-2 text-violet-300/90">
                  · online {rollout.freelanceReadyCount}/{rollout.freelanceCategories ?? 25}
                </span>
              )}
            </p>
            <p className="text-xs text-slate-500">
              {rollout?.freelanceCategories ?? 25} freelance + {rollout?.legacyCategories ?? 25} legacy ·{' '}
              {rollout?.overallCompletionPct ?? 0}% verticals
              {rollout?.nextCategoryName && (
                <span className="ml-1 text-violet-300">→ {rollout.nextCategoryName}</span>
              )}
            </p>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
            <p className="text-xs text-slate-500">Outbound queue</p>
            <p className="font-medium text-white">
              {outbound?.byStatus?.draft ?? 0} draft · {outbound?.byStatus?.queued ?? 0} queued
            </p>
            <p className="text-xs text-slate-500">
              {outbound?.warmupComplete ? 'Warmup OK' : 'Warmup — drafts only'}
              {' · '}
              {outbound?.sentToday ?? 0}/{outbound?.dailyCap ?? 20} today
            </p>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
            <p className="text-xs text-slate-500">Last tick</p>
            <p className="text-sm text-white">{formatRelative(status.scheduler?.lastTickAt)}</p>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
            <p className="text-xs text-slate-500">Last cycle</p>
            <p className="text-sm text-white">{status.latestCycle?.status ?? '—'}</p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void runTick()}
          disabled={Boolean(busy)}
          className="btn-primary inline-flex items-center gap-2 text-sm disabled:opacity-50"
        >
          <Play className="h-4 w-4" />
          {busy === 'tick' ? 'Tick in progress…' : 'Run tick (×2)'}
        </button>
        <button
          type="button"
          onClick={() => void load()}
          disabled={Boolean(busy)}
          className="btn-glass inline-flex items-center gap-2 text-sm disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
        {isAdmin && (
          <>
            <button
              type="button"
              onClick={() => void runRollout(1)}
              disabled={Boolean(busy)}
              className="btn-primary inline-flex items-center gap-2 text-sm disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" />
              {busy === 'rollout' ? 'Rollout…' : 'Next category (full)'}
            </button>
            <button
              type="button"
              onClick={() => void runRollout(50)}
              disabled={Boolean(busy)}
              className="btn-glass inline-flex items-center gap-2 text-sm disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" />
              {busy === 'rollout' ? 'Rollout…' : 'All industries (×50)'}
            </button>
            <button
              type="button"
              onClick={() => void runEvolutionTick()}
              disabled={Boolean(busy)}
              className="btn-glass inline-flex items-center gap-2 text-sm disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" />
              {busy === 'evolution' ? 'Evolution…' : 'Evolution tick (E3)'}
            </button>
            <button
              type="button"
              onClick={() => void toggleScheduler(true)}
              disabled={Boolean(busy) || status?.scheduler?.running}
              className="btn-glass inline-flex items-center gap-2 text-sm disabled:opacity-50"
            >
              <Timer className="h-4 w-4" />
              Start scheduler
            </button>
            <button
              type="button"
              onClick={() => void toggleScheduler(false)}
              disabled={Boolean(busy) || !status?.scheduler?.running}
              className="btn-glass inline-flex items-center gap-2 text-sm disabled:opacity-50"
            >
              Stop scheduler
            </button>
          </>
        )}
      </div>

      {lastBatch && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-3 text-xs text-violet-100"
        >
          <p className="font-medium text-violet-300">
            Batch {String(lastBatch.category ?? '')} — {String(lastBatch.succeeded ?? 0)}/
            {String(lastBatch.processed ?? 0)} OK
          </p>
          <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap font-mono text-[11px] text-slate-300">
            {JSON.stringify(lastBatch, null, 2)}
          </pre>
        </motion.div>
      )}

      {lastEvolution && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-3 text-xs text-violet-100"
        >
          <p className="font-medium text-violet-300">Evolution tick complete</p>
          <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap font-mono text-[11px] text-slate-300">
            {JSON.stringify(lastEvolution, null, 2)}
          </pre>
        </motion.div>
      )}

      {lastTick && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-emerald-100"
        >
          <p className="font-medium text-emerald-300">Tick complete</p>
          <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap font-mono text-[11px] text-slate-300">
            {JSON.stringify(lastTick, null, 2)}
          </pre>
        </motion.div>
      )}

      {rollout && rollout.categories && rollout.categories.length > 0 && (
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-400" />
            <h3 className="text-sm font-semibold text-white">
              25 online categories (primary) — rollout in order · legacy SMB = catalog add-on
            </h3>
          </div>
          <ul className="max-h-96 space-y-1.5 overflow-y-auto pr-1">
            {rollout.categories.map((row) => {
              const cat = String(row.category ?? '');
              const isBusy = busy === `batch:${cat}`;
              const segmentLabel = row.segment === 'legacy_smb' ? 'SMB' : 'FL';
              return (
                <li
                  key={cat}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-xs"
                >
                  <span className="w-6 shrink-0 text-slate-500">{row.order}.</span>
                  <span className="w-6 shrink-0 rounded bg-white/5 px-1 text-center text-[10px] text-slate-400">
                    {segmentLabel}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-white">{row.categoryName ?? cat}</p>
                    <p className="text-slate-500">
                      {row.readyCount ?? 0}/{row.total ?? 0} ready · {row.completionPct ?? 0}%
                      {(row.outboundDrafts ?? 0) > 0 && (
                        <span className="ml-2 text-cyan-300">{row.outboundDrafts} draft</span>
                      )}
                    </p>
                  </div>
                  <span className={`shrink-0 font-medium ${phaseColor(row.phase)}`}>
                    {phaseLabel(row.phase)}
                  </span>
                  {isAdmin && row.phase !== 'ready' && row.phase !== 'empty' && (
                    <button
                      type="button"
                      onClick={() => void runCategoryBatch(cat, 'full')}
                      disabled={Boolean(busy) || !cat}
                      className="btn-glass shrink-0 px-2 py-1 text-[11px] disabled:opacity-50"
                    >
                      {isBusy ? '…' : 'Full'}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div>
        <div className="mb-2 flex items-center gap-2">
          <Bot className="h-4 w-4 text-violet-400" />
          <h3 className="text-sm font-semibold text-white">Top verticals</h3>
        </div>
        <ul className="space-y-2">
          {verticals.length === 0 && !loading && (
            <li className="text-sm text-slate-500">No verticals — run seed on the Atina API.</li>
          )}
          {verticals.map((v) => {
            const slug = String(v.slug ?? '');
            const aiOk = v.research?.ai_enriched;
            const category = String(v.category ?? '');
            const proPrice = category
              ? calculateDeliverableQuote({
                  deliverableId: 'vertical-package',
                  industryCategory: category,
                  paymentProvider: 'manual',
                  marketIntensity: 55,
                }).clientPriceEur
              : null;
            return (
              <li
                key={slug}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-white">{v.name ?? slug}</p>
                  <p className="text-xs text-slate-500">
                    {v.category} · {v.status ?? 'pending'}
                    {proPrice != null && (
                      <span className="ml-2 text-emerald-300">Package {formatEur(proPrice)}/mo</span>
                    )}
                    {aiOk && (
                      <span className="ml-2 inline-flex items-center gap-0.5 text-violet-300">
                        <Sparkles className="h-3 w-3" /> AI
                      </span>
                    )}
                    {v.research?.scrape?.delivery && (
                      <span className="ml-2 text-cyan-400/80">scrape:{v.research.scrape.delivery}</span>
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void runResearch(slug)}
                  disabled={Boolean(busy) || !slug}
                  className="btn-glass shrink-0 px-3 py-1 text-xs disabled:opacity-50"
                >
                  {busy === `research:${slug}` ? '…' : 'Research'}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
