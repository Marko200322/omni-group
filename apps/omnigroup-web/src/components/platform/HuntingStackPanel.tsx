'use client';

import { useCallback, useEffect, useState } from 'react';
import { Crosshair, Flame, Globe2, Play, RefreshCw, Rocket, ShieldCheck, Zap } from 'lucide-react';

type ReadinessCheck = {
  id: string;
  label: string;
  status: 'ready' | 'partial' | 'missing';
  hint?: string;
};

type ReadinessData = {
  score?: number;
  ready?: boolean;
  checks?: ReadinessCheck[];
  huntingModules?: Array<{ slug: string; registered: boolean }>;
  templates?: Array<{ key: string; available: boolean; minPhase?: string | null }>;
  outbound?: {
    warmupComplete?: boolean;
    sentToday?: number;
    remainingToday?: number;
    byStatus?: Record<string, number>;
  };
  config?: {
    realEcosystemRuns?: boolean;
    scraperEnabled?: boolean;
    devSendToFallback?: boolean;
  };
};

type HotClientItem = {
  id: string;
  company_name?: string | null;
  role_title?: string | null;
  city?: string | null;
  platform_name?: string | null;
  locale?: string;
  heat_score?: number;
  heat_band?: string;
  job_url?: string | null;
};

type HotClientsData = {
  items?: HotClientItem[];
  stats?: { total?: number; byBand?: Record<string, number> };
};

type JobBoardsData = {
  platforms?: Array<{ slug: string; name: string; region: string; locale: string; kind: string }>;
  stats?: { total?: number; byRegion?: Record<string, number>; byLocale?: Record<string, number> };
  locales?: string[];
};

type Props = {
  isAdmin?: boolean;
  disabled?: boolean;
};

const VERTICALS = [
  { slug: 'marketing', label: 'Marketing agencies' },
  { slug: 'sales', label: 'B2B sales' },
  { slug: 'admin_support', label: 'Admin support' },
  { slug: 'business_consulting', label: 'Consulting' },
];

const TEMPLATES = [
  { key: 'nurture-loop', label: 'Nurture Loop (recommended)' },
  { key: 'client-acquisition-pipeline', label: 'Client Acquisition' },
  { key: 'lead-proxy-acquisition-pipeline', label: 'Proxy + Hunt' },
];

const statusColor = {
  ready: 'text-emerald-400',
  partial: 'text-amber-400',
  missing: 'text-rose-400',
};

export function HuntingStackPanel({ isAdmin, disabled }: Props) {
  const [readiness, setReadiness] = useState<ReadinessData | null>(null);
  const [verticalSlug, setVerticalSlug] = useState('marketing');
  const [templateKey, setTemplateKey] = useState('nurture-loop');
  const [intensity, setIntensity] = useState(60);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<Record<string, unknown> | null>(null);
  const [hotClients, setHotClients] = useState<HotClientsData | null>(null);
  const [jobBoards, setJobBoards] = useState<JobBoardsData | null>(null);

  const loadHotClients = useCallback(async () => {
    try {
      const res = await fetch('/api/atina/hunting/hot-clients?limit=20&minHeat=50');
      const json = (await res.json()) as { ok?: boolean; data?: HotClientsData };
      if (res.ok && json.ok) setHotClients(json.data ?? null);
    } catch {
      /* non-fatal */
    }
  }, []);

  const loadJobBoards = useCallback(async () => {
    try {
      const res = await fetch('/api/atina/hunting/job-boards');
      const json = (await res.json()) as { ok?: boolean; data?: JobBoardsData };
      if (res.ok && json.ok) setJobBoards(json.data ?? null);
    } catch {
      /* non-fatal */
    }
  }, []);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/atina/hunting/readiness');
      const json = (await res.json()) as { ok?: boolean; data?: ReadinessData; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error ?? 'readiness_failed');
        return;
      }
      setReadiness(json.data ?? null);
      await Promise.all([loadHotClients(), loadJobBoards()]);
    } catch {
      setError('network');
    } finally {
      setLoading(false);
    }
  }, [loadHotClients, loadJobBoards]);

  useEffect(() => {
    if (!disabled) void load();
  }, [disabled, load]);

  const bootstrap = async () => {
    setBusy('bootstrap');
    setError(null);
    try {
      const res = await fetch('/api/atina/hunting/bootstrap', { method: 'POST' });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error ?? 'bootstrap_failed');
        return;
      }
      await load();
    } catch {
      setError('bootstrap_network');
    } finally {
      setBusy(null);
    }
  };

  const runPipeline = async () => {
    setBusy('pipeline');
    setError(null);
    setLastResult(null);
    try {
      const res = await fetch('/api/atina/hunting/pipeline/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verticalSlug,
          templateKey,
          intensity,
          processOutbound: true,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; data?: Record<string, unknown>; error?: string; detail?: string };
      if (!res.ok || !json.ok) {
        setError(json.detail ?? json.error ?? 'pipeline_failed');
        return;
      }
      setLastResult(json.data ?? null);
      await load();
    } catch {
      setError('pipeline_network');
    } finally {
      setBusy(null);
    }
  };

  const processOutbound = async () => {
    setBusy('outbound');
    setError(null);
    try {
      const res = await fetch('/api/atina/autonomy-loop/outbound/process-send', { method: 'POST' });
      const json = (await res.json()) as { ok?: boolean; data?: Record<string, unknown>; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error ?? 'outbound_failed');
        return;
      }
      setLastResult(json.data ?? null);
      await load();
    } catch {
      setError('outbound_network');
    } finally {
      setBusy(null);
    }
  };

  if (disabled) {
    return <p className="text-sm text-slate-500">Sign in with an operator account to use the hunting module.</p>;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Crosshair className="h-5 w-5 text-cyan-400" />
          <span className="text-sm text-slate-400">
            Readiness:{' '}
            <strong className={readiness?.ready ? 'text-emerald-400' : 'text-amber-400'}>
              {loading ? '…' : `${readiness?.score ?? 0}%`}
            </strong>
          </span>
        </div>
        <button type="button" className="btn-ghost text-xs text-violet-300" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`mr-1 inline h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(readiness?.checks ?? []).map((check) => (
          <div key={check.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
            <p className={`text-xs font-semibold uppercase tracking-wider ${statusColor[check.status]}`}>{check.status}</p>
            <p className="mt-1 text-sm text-white">{check.label}</p>
            {check.hint && <p className="mt-1 text-xs text-slate-500">{check.hint}</p>}
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <label className="block text-sm">
          <span className="text-slate-400">Vertical (verticalSlug)</span>
          <select
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2 text-white"
            value={verticalSlug}
            onChange={(e) => setVerticalSlug(e.target.value)}
          >
            {VERTICALS.map((v) => (
              <option key={v.slug} value={v.slug}>
                {v.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-slate-400">Workflow template</span>
          <select
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2 text-white"
            value={templateKey}
            onChange={(e) => setTemplateKey(e.target.value)}
          >
            {TEMPLATES.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-slate-400">Intensity ({intensity})</span>
          <input
            type="range"
            min={15}
            max={100}
            value={intensity}
            onChange={(e) => setIntensity(Number(e.target.value))}
            className="mt-2 w-full"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-glass text-sm" onClick={() => void bootstrap()} disabled={!!busy || !isAdmin}>
          <ShieldCheck className="mr-1 inline h-4 w-4" />
          {busy === 'bootstrap' ? 'Bootstrap…' : 'Bootstrap workspaces'}
        </button>
        <button type="button" className="btn-primary text-sm" onClick={() => void runPipeline()} disabled={!!busy || !isAdmin}>
          <Rocket className="mr-1 inline h-4 w-4" />
          {busy === 'pipeline' ? 'Hunt in progress…' : 'Run hunt (pipeline)'}
        </button>
        <button type="button" className="btn-glass text-sm" onClick={() => void processOutbound()} disabled={!!busy || !isAdmin}>
          <Play className="mr-1 inline h-4 w-4" />
          {busy === 'outbound' ? 'Sending…' : 'Send outbound queue'}
        </button>
      </div>

      {readiness?.outbound && (
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3 text-xs text-slate-300">
          <Zap className="mr-1 inline h-3.5 w-3.5 text-cyan-400" />
          Outbound today: {readiness.outbound.sentToday ?? 0} sent · {readiness.outbound.remainingToday ?? 0} remaining
          {readiness.outbound.warmupComplete ? ' · warmup OK' : ' · warmup in progress (dev: OUTREACH_DEV_SEND_TO_FALLBACK)'}
          {readiness.outbound.byStatus && (
            <span className="ml-2 text-slate-500">
              draft: {readiness.outbound.byStatus.draft ?? 0} · sent: {readiness.outbound.byStatus.sent ?? 0}
            </span>
          )}
        </div>
      )}

      {jobBoards?.stats && (
        <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
          <div className="flex items-center gap-2 text-sm text-white">
            <Globe2 className="h-4 w-4 text-violet-400" />
            Job board catalog: <strong>{jobBoards.stats.total ?? jobBoards.platforms?.length ?? 0}</strong> platforms
            {jobBoards.locales && (
              <span className="text-slate-400">· {jobBoards.locales.length} outreach locales</span>
            )}
          </div>
          {jobBoards.stats.byLocale && (
            <p className="mt-2 text-xs text-slate-500">
              {Object.entries(jobBoards.stats.byLocale)
                .slice(0, 8)
                .map(([loc, n]) => `${loc}: ${n}`)
                .join(' · ')}
            </p>
          )}
        </div>
      )}

      <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm text-white">
            <Flame className="h-4 w-4 text-orange-400" />
            Hot clients
            <span className="text-slate-400">
              ({hotClients?.stats?.total ?? 0} total
              {hotClients?.stats?.byBand && (
                <>
                  {' '}
                  · burning {hotClients.stats.byBand.burning ?? 0} · hot {hotClients.stats.byBand.hot ?? 0} · warm{' '}
                  {hotClients.stats.byBand.warm ?? 0}
                </>
              )}
              )
            </span>
          </div>
        </div>
        {(hotClients?.items?.length ?? 0) === 0 ? (
          <p className="mt-2 text-xs text-slate-500">
            No hot clients yet — run a hunt to populate the database from job listings.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead>
                <tr className="border-b border-white/10 text-slate-500">
                  <th className="py-1 pr-2">Company</th>
                  <th className="py-1 pr-2">Role</th>
                  <th className="py-1 pr-2">Platform</th>
                  <th className="py-1 pr-2">Heat</th>
                </tr>
              </thead>
              <tbody>
                {hotClients?.items?.map((row) => (
                  <tr key={row.id} className="border-b border-white/5">
                    <td className="py-1.5 pr-2 text-white">{row.company_name ?? '—'}</td>
                    <td className="py-1.5 pr-2">
                      {row.role_title ?? '—'}
                      {row.city ? <span className="text-slate-500"> · {row.city}</span> : null}
                    </td>
                    <td className="py-1.5 pr-2">
                      {row.platform_name ?? '—'}
                      {row.locale ? <span className="text-slate-500"> ({row.locale})</span> : null}
                    </td>
                    <td className="py-1.5 pr-2">
                      <span
                        className={
                          row.heat_band === 'burning'
                            ? 'text-rose-400'
                            : row.heat_band === 'hot'
                              ? 'text-orange-400'
                              : 'text-amber-400'
                        }
                      >
                        {row.heat_score ?? 0} ({row.heat_band ?? 'warm'})
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {lastResult && (
        <pre className="max-h-48 overflow-auto rounded-xl border border-white/10 bg-black/40 p-3 text-xs text-emerald-200/90">
          {JSON.stringify(lastResult, null, 2)}
        </pre>
      )}
    </div>
  );
}
