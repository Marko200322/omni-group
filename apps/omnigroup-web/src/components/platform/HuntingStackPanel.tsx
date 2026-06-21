'use client';

import { useCallback, useEffect, useState } from 'react';
import { Crosshair, Play, RefreshCw, Rocket, ShieldCheck, Zap } from 'lucide-react';

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

type Props = {
  isAdmin?: boolean;
  disabled?: boolean;
};

const VERTICALS = [
  { slug: 'marketing', label: 'Marketing agencije' },
  { slug: 'sales', label: 'B2B prodaja' },
  { slug: 'admin_support', label: 'Admin podrška' },
  { slug: 'business_consulting', label: 'Konsalting' },
];

const TEMPLATES = [
  { key: 'nurture-loop', label: 'Nurture Loop (preporučeno)' },
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
    } catch {
      setError('network');
    } finally {
      setLoading(false);
    }
  }, []);

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
    return <p className="text-sm text-slate-500">Prijavi se operator nalogom da koristiš lovacki modul.</p>;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Crosshair className="h-5 w-5 text-cyan-400" />
          <span className="text-sm text-slate-400">
            Spremnost:{' '}
            <strong className={readiness?.ready ? 'text-emerald-400' : 'text-amber-400'}>
              {loading ? '…' : `${readiness?.score ?? 0}%`}
            </strong>
          </span>
        </div>
        <button type="button" className="btn-ghost text-xs text-violet-300" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`mr-1 inline h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Osveži
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
          <span className="text-slate-400">Niša (verticalSlug)</span>
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
          <span className="text-slate-400">Intenzitet ({intensity})</span>
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
          {busy === 'bootstrap' ? 'Bootstrap…' : 'Bootstrap workspace-ova'}
        </button>
        <button type="button" className="btn-primary text-sm" onClick={() => void runPipeline()} disabled={!!busy || !isAdmin}>
          <Rocket className="mr-1 inline h-4 w-4" />
          {busy === 'pipeline' ? 'Lov u toku…' : 'Pokreni lov (pipeline)'}
        </button>
        <button type="button" className="btn-glass text-sm" onClick={() => void processOutbound()} disabled={!!busy || !isAdmin}>
          <Play className="mr-1 inline h-4 w-4" />
          {busy === 'outbound' ? 'Šaljem…' : 'Pošalji outbound queue'}
        </button>
      </div>

      {readiness?.outbound && (
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3 text-xs text-slate-300">
          <Zap className="mr-1 inline h-3.5 w-3.5 text-cyan-400" />
          Outbound danas: {readiness.outbound.sentToday ?? 0} poslato · {readiness.outbound.remainingToday ?? 0} preostalo
          {readiness.outbound.warmupComplete ? ' · warmup OK' : ' · warmup u toku (dev: OUTREACH_DEV_SEND_TO_FALLBACK)'}
          {readiness.outbound.byStatus && (
            <span className="ml-2 text-slate-500">
              draft: {readiness.outbound.byStatus.draft ?? 0} · sent: {readiness.outbound.byStatus.sent ?? 0}
            </span>
          )}
        </div>
      )}

      {lastResult && (
        <pre className="max-h-48 overflow-auto rounded-xl border border-white/10 bg-black/40 p-3 text-xs text-emerald-200/90">
          {JSON.stringify(lastResult, null, 2)}
        </pre>
      )}
    </div>
  );
}
