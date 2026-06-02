'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Bot, Play, RefreshCw, Sparkles, Timer } from 'lucide-react';

type AutonomyStatus = {
  seedCatalogSize?: number;
  verticalsInDb?: number;
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
  if (mins < 1) return 'upravo';
  if (mins < 60) return `pre ${mins} min`;
  const hrs = Math.round(mins / 60);
  if (hrs < 48) return `pre ${hrs}h`;
  return d.toLocaleDateString('sr-RS');
}

export function AutonomyLoopPanel({ isAdmin, disabled }: Props) {
  const [status, setStatus] = useState<AutonomyStatus | null>(null);
  const [verticals, setVerticals] = useState<VerticalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastTick, setLastTick] = useState<Record<string, unknown> | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const [stRes, vRes] = await Promise.all([
        fetch('/api/atina/autonomy-loop/status'),
        fetch('/api/atina/autonomy-loop/verticals?limit=6'),
      ]);
      const stJson = (await stRes.json()) as { ok?: boolean; data?: AutonomyStatus; error?: string };
      const vJson = (await vRes.json()) as {
        ok?: boolean;
        data?: { verticals?: VerticalRow[] };
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
        Autonomy Loop zahteva pravu Atina sesiju (admin@atina.io).
      </p>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      {loading && !status && (
        <p className="text-sm text-slate-500">Učitavam Autonomy Loop status…</p>
      )}
      {error && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          {error}
        </p>
      )}

      {status && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
            <p className="text-xs text-slate-500">Vertikale u bazi</p>
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
              {status.scheduler?.running ? 'Aktivan' : status.scheduler?.enabled ? 'Spreman' : 'Isključen'}
            </p>
            <p className="text-xs text-slate-500">
              tick {Math.round((status.scheduler?.intervalMs ?? 300000) / 60000)} min
            </p>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
            <p className="text-xs text-slate-500">Poslednji tick</p>
            <p className="text-sm text-white">{formatRelative(status.scheduler?.lastTickAt)}</p>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
            <p className="text-xs text-slate-500">Poslednji ciklus</p>
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
          {busy === 'tick' ? 'Tick u toku…' : 'Pokreni tick (×2)'}
        </button>
        <button
          type="button"
          onClick={() => void load()}
          disabled={Boolean(busy)}
          className="btn-glass inline-flex items-center gap-2 text-sm disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Osveži
        </button>
        {isAdmin && (
          <>
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

      {lastTick && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-emerald-100"
        >
          <p className="font-medium text-emerald-300">Tick završen</p>
          <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap font-mono text-[11px] text-slate-300">
            {JSON.stringify(lastTick, null, 2)}
          </pre>
        </motion.div>
      )}

      <div>
        <div className="mb-2 flex items-center gap-2">
          <Bot className="h-4 w-4 text-violet-400" />
          <h3 className="text-sm font-semibold text-white">Top vertikale</h3>
        </div>
        <ul className="space-y-2">
          {verticals.length === 0 && !loading && (
            <li className="text-sm text-slate-500">Nema vertikala — pokreni seed na Atina API-ju.</li>
          )}
          {verticals.map((v) => {
            const slug = String(v.slug ?? '');
            const aiOk = v.research?.ai_enriched;
            return (
              <li
                key={slug}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-white">{v.name ?? slug}</p>
                  <p className="text-xs text-slate-500">
                    {v.category} · {v.status ?? 'pending'}
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
