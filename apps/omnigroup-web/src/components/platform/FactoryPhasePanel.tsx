'use client';

import { useEffect, useState } from 'react';
import { Factory, RefreshCw } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import {
  getFactoryPhase,
  getFactoryPhaseLabel,
  parseFactoryPhase,
  setClientFactoryPhaseOverride,
} from '@/lib/factory-phase';
import { isFactoryModuleAllowed } from '@/lib/factory-phase-guard';

type FactoryGap = { key: string; kind: string; message: string };

type FactoryStatus = {
  phase?: string;
  label?: string;
  ready?: boolean;
  gaps?: FactoryGap[];
  auto?: {
    enabled?: boolean;
    ceiling?: string;
    effective?: string;
    blockedNext?: string | null;
    blockedReason?: string | null;
    metrics?: {
      confirmedPaymentCount?: number;
      confirmedRevenueEur?: number;
      fulfilledPackageCount?: number;
      estimatedMrrEur?: number;
    };
  };
  runtime?: {
    modules?: Array<{ module: string; minPhase: string; enabled: boolean }>;
  };
};

type Props = {
  initial?: FactoryStatus | null;
};

export function FactoryPhasePanel({ initial }: Props) {
  const [status, setStatus] = useState<FactoryStatus | null>(initial ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const phase = (status?.phase ?? getFactoryPhase()) as ReturnType<typeof getFactoryPhase>;

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch('/api/atina/factory-phase/status');
      const json = (await r.json()) as { ok?: boolean; data?: FactoryStatus; error?: string; detail?: string };
      if (!r.ok || !json.ok || !json.data) {
        setError(json.detail ?? json.error ?? `http_${r.status}`);
        return;
      }
      setStatus(json.data);
      const eff = parseFactoryPhase(json.data.auto?.effective ?? json.data.phase ?? null);
      if (eff) setClientFactoryPhaseOverride(eff);
    } catch {
      setError('network_error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initial) void refresh();
  }, [initial]);

  const gaps = status?.gaps ?? [];
  const modules = status?.runtime?.modules ?? [];
  const auto = status?.auto;

  return (
    <GlassCard delay={0} className="mb-6 border border-violet-500/25 bg-violet-500/5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Factory className="h-5 w-5 text-violet-300" />
          <div>
            <p className="font-medium text-violet-100">
              Factory {phase} — {status?.label ?? getFactoryPhaseLabel(phase)}
            </p>
            <p className="text-xs text-violet-200/70">
              {auto?.enabled
                ? `AUTO mode · effective ${auto.effective ?? phase} · ceiling ${auto.ceiling ?? 'M6'}`
                : 'Manual ceiling — set factoryPhaseAuto true in deploy.config for self-advance'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-xs text-slate-300 hover:bg-white/5"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <p className="mt-3 text-xs text-amber-300/90">
          Phase status refresh failed ({error}) — showing last known values.{' '}
          <button type="button" className="underline" onClick={() => void refresh()}>
            Retry
          </button>
        </p>
      )}

      {auto?.enabled && auto.metrics && (
        <p className="mt-3 text-xs text-violet-200/80">
          Payments {auto.metrics.confirmedPaymentCount ?? 0} · Revenue €
          {(auto.metrics.confirmedRevenueEur ?? 0).toFixed(0)} · MRR €
          {(auto.metrics.estimatedMrrEur ?? 0).toFixed(0)} · Fulfilled{' '}
          {auto.metrics.fulfilledPackageCount ?? 0}
          {auto.blockedNext ? ` · Next ${auto.blockedNext}: ${auto.blockedReason ?? ''}` : ''}
        </p>
      )}

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { key: 'scraper' as const, label: 'Scraper' },
          { key: 'outbound_send' as const, label: 'Outbound send' },
          { key: 'lead_db' as const, label: 'Lead DB' },
          { key: 'autonomy' as const, label: 'Autonomy' },
        ].map(({ key, label }) => {
          const runtime = modules.find((m) => m.module === key);
          const on = runtime?.enabled ?? isFactoryModuleAllowed(key, phase);
          return (
            <div
              key={key}
              className={`rounded-lg border px-3 py-2 text-xs ${on ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : 'border-white/10 bg-black/20 text-slate-500'}`}
            >
              {label}: {on ? 'ON' : 'OFF'}
            </div>
          );
        })}
      </div>

      {gaps.length > 0 && (
        <ul className="mt-4 space-y-1 text-xs text-amber-200/90">
          {gaps.slice(0, 6).map((g) => (
            <li key={g.key + g.message}>
              <span className="font-mono text-amber-300/80">{g.key}</span> — {g.message}
            </li>
          ))}
        </ul>
      )}

      {status?.ready && gaps.length === 0 && (
        <p className="mt-3 text-xs text-emerald-300/90">Phase gates OK for current factory level.</p>
      )}
    </GlassCard>
  );
}
