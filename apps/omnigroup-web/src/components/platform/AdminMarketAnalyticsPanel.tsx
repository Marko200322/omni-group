'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  BarChart3,
  Download,
  FlaskConical,
  LineChart,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { formatEur } from '@/lib/category-pricing';
import {
  MARKET_SIMULATION_PRESETS,
  type IndustrySimulation,
  type LiveMarketKpi,
} from '@/lib/market-analytics';

type Props = {
  disabled?: boolean;
  initialKpi?: LiveMarketKpi | null;
};

function pct(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '—';
  return `${n.toFixed(1)}%`;
}

export function AdminMarketAnalyticsPanel({ disabled, initialKpi = null }: Props) {
  const [kpi, setKpi] = useState<LiveMarketKpi | null>(initialKpi);
  const [kpiLoading, setKpiLoading] = useState(false);
  const [kpiError, setKpiError] = useState<string | null>(null);

  const [simulation, setSimulation] = useState<IndustrySimulation | null>(null);
  const [simLoading, setSimLoading] = useState(false);
  const [simError, setSimError] = useState<string | null>(null);
  const [presetId, setPresetId] = useState<string>('marketing');
  const [qualityPct, setQualityPct] = useState(95);
  const [exporting, setExporting] = useState<string | null>(null);

  const refreshKpi = useCallback(async () => {
    if (disabled) return;
    setKpiLoading(true);
    setKpiError(null);
    try {
      const res = await fetch('/api/atina/admin/market-kpi');
      const body = (await res.json()) as {
        ok?: boolean;
        data?: LiveMarketKpi;
        detail?: string;
        error?: string;
        errors?: string[];
      };
      if (!body.ok) throw new Error(body.detail ?? body.error ?? 'load_failed');
      setKpi(body.data ?? null);
      if (body.errors?.length) {
        setKpiError(`Partial: ${body.errors.join('; ')}`);
      }
    } catch (err) {
      setKpiError(err instanceof Error ? err.message : 'Failed to load KPI');
    } finally {
      setKpiLoading(false);
    }
  }, [disabled]);

  const runSimulation = useCallback(async () => {
    if (disabled) return;
    const preset = MARKET_SIMULATION_PRESETS.find((p) => p.id === presetId) ?? MARKET_SIMULATION_PRESETS[0];
    setSimLoading(true);
    setSimError(null);
    try {
      const params = new URLSearchParams();
      if ('verticalSlug' in preset && preset.verticalSlug) {
        params.set('verticalSlug', preset.verticalSlug);
      } else if ('category' in preset && preset.category) {
        params.set('category', preset.category);
      }
      params.set('qualityPassRate', String(qualityPct / 100));
      const res = await fetch(`/api/atina/admin/market-simulation?${params}`);
      const body = (await res.json()) as {
        ok?: boolean;
        data?: IndustrySimulation;
        error?: string;
      };
      if (!body.ok) throw new Error(body.error ?? 'simulation_failed');
      setSimulation(body.data ?? null);
    } catch (err) {
      setSimError(err instanceof Error ? err.message : 'Simulation failed');
    } finally {
      setSimLoading(false);
    }
  }, [disabled, presetId, qualityPct]);

  const downloadExport = useCallback(
    async (scope: 'full' | 'categories', category?: string) => {
      if (disabled) return;
      const key = category ? `cat-${category}` : scope;
      setExporting(key);
      try {
        const params = new URLSearchParams({ scope });
        if (category) params.set('category', category);
        const res = await fetch(`/api/atina/admin/market-export?${params}`);
        if (!res.ok) throw new Error('export_failed');
        const blob = await res.blob();
        const disposition = res.headers.get('Content-Disposition') ?? '';
        const match = disposition.match(/filename="([^"]+)"/);
        const filename = match?.[1] ?? `market-export-${Date.now()}.csv`;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      } catch {
        setKpiError('CSV export failed');
      } finally {
        setExporting(null);
      }
    },
    [disabled],
  );

  useEffect(() => {
    if (disabled) return;
    if (!initialKpi) void refreshKpi();
    void runSimulation();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount + admin gate only
  }, [disabled]);

  const live = kpi?.live;
  const catalog = kpi?.catalog;

  return (
    <GlassCard className="p-4" id="market-analytics">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
            <BarChart3 className="h-4 w-4 text-cyan-300" />
            Market analytics — live KPI, export & simulation
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            KPI iz Atina API + baze kad je dostupan; pricing iz {catalog?.totalVerticals ?? 907} vertikala u
            katalogu.
          </p>
        </div>
        <button
          type="button"
          disabled={disabled || kpiLoading}
          onClick={() => void refreshKpi()}
          className="btn-glass px-2 py-1 text-xs disabled:opacity-50"
        >
          <RefreshCw className={`inline h-3 w-3 ${kpiLoading ? 'animate-spin' : ''}`} /> Refresh KPI
        </button>
      </div>

      {disabled && (
        <p className="mb-4 text-xs text-slate-500">Sign in as admin to use market analytics.</p>
      )}
      {kpiError && <p className="mb-3 text-xs text-amber-400">{kpiError}</p>}

      {/* Live KPI grid */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile
          label="Bruto prihod (DB)"
          value={live ? formatEur(live.totalRevenueEur) : '—'}
          sub={live ? `${live.paymentCount} uplata` : 'API offline — samo katalog'}
          live={kpi?.source === 'live'}
        />
        <KpiTile
          label="Tvoja neto (alokacija)"
          value={live ? formatEur(live.ownerNetEur) : '—'}
          sub={live ? `Reinvest: ${formatEur(live.systemReinvestEur)}` : 'Posle potvrđene uplate'}
          live={kpi?.source === 'live' && (live?.ownerNetEur ?? 0) > 0}
        />
        <KpiTile
          label="Vertikale u katalogu"
          value={String(catalog?.totalVerticals ?? '—')}
          sub={`${catalog?.categoryCount ?? '—'} kategorija · index ${catalog?.weightedAvgMarketIndex ?? '—'}`}
          live
        />
        <KpiTile
          label="Workflow uspeh / kvalitet"
          value={live?.workflowSuccessRate != null ? pct(live.workflowSuccessRate) : '95%*'}
          sub={
            live?.workflowSuccessRate != null
              ? '7d iz admin overview'
              : '*Target fulfillment pass rate'
          }
          live={live?.workflowSuccessRate != null}
        />
      </div>

      {catalog && (
        <div className="mb-6 rounded-xl border border-white/5 bg-white/[0.02] p-3">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Top kategorije (avg neto/mes)</p>
          <ul className="mt-2 space-y-1 text-xs text-slate-300">
            {catalog.topCategories.map((c) => (
              <li key={c.category} className="flex justify-between gap-2">
                <span>
                  {c.category}{' '}
                  <span className="text-slate-500">({c.count})</span>
                </span>
                <span className="text-emerald-300">{formatEur(c.avgOwnerNetEur)}/vert.</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* CSV Export */}
      <div className="mb-6 border-t border-white/5 pt-4">
        <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <Download className="h-3.5 w-3.5" /> CSV izvoz
        </h4>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={disabled || exporting !== null}
            onClick={() => void downloadExport('full')}
            className="btn-primary text-xs disabled:opacity-50"
          >
            {exporting === 'full' ? '…' : '907 vertikala (full)'}
          </button>
          <button
            type="button"
            disabled={disabled || exporting !== null}
            onClick={() => void downloadExport('categories')}
            className="btn-glass text-xs disabled:opacity-50"
          >
            {exporting === 'categories' ? '…' : 'Agregat po kategoriji'}
          </button>
          <button
            type="button"
            disabled={disabled || exporting !== null}
            onClick={() => void downloadExport('full', 'marketing')}
            className="btn-glass text-xs disabled:opacity-50"
          >
            {exporting === 'cat-marketing' ? '…' : 'Samo marketing'}
          </button>
          <button
            type="button"
            disabled={disabled || exporting !== null}
            onClick={() => void downloadExport('full', 'healthcare')}
            className="btn-glass text-xs disabled:opacity-50"
          >
            {exporting === 'cat-healthcare' ? '…' : 'Samo healthcare'}
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Kolone: dinamička cena, resource cost, owner net (80% posle resursa), neto posle kvaliteta (95%).
        </p>
      </div>

      {/* Industry simulation */}
      <div className="border-t border-white/5 pt-4">
        <h4 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <FlaskConical className="h-3.5 w-3.5" /> Simulacija industrije
        </h4>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs text-slate-400">
            Preset
            <select
              value={presetId}
              onChange={(e) => setPresetId(e.target.value)}
              disabled={disabled}
              className="mt-1 block w-full min-w-[200px] rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-sm text-white"
            >
              {MARKET_SIMULATION_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-slate-400">
            Kvalitet isporuke ({qualityPct}%)
            <input
              type="range"
              min={80}
              max={100}
              value={qualityPct}
              onChange={(e) => setQualityPct(Number(e.target.value))}
              disabled={disabled}
              className="mt-1 block w-40"
            />
          </label>
          <button
            type="button"
            disabled={disabled || simLoading}
            onClick={() => void runSimulation()}
            className="btn-glass text-xs disabled:opacity-50"
          >
            {simLoading ? '…' : 'Pokreni simulaciju'}
          </button>
        </div>
        {simError && <p className="mt-2 text-xs text-rose-400">{simError}</p>}

        {simulation && (
          <div className="mt-4 space-y-4">
            <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3 text-xs text-slate-300">
              <p className="font-medium text-white">{simulation.verticalName}</p>
              <p className="mt-1 text-slate-400">
                {simulation.categoryNameSr} · tier {simulation.pricingTier} · index{' '}
                {simulation.marketIndex} · TAM ${simulation.tamEstimateUsd.toLocaleString('en-US')} ·{' '}
                {simulation.verticalsInCategory} vertikala u kategoriji
              </p>
            </div>

            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="min-w-full text-left text-xs">
                <thead className="bg-white/[0.03] uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Paket</th>
                    <th className="px-3 py-2">Klijent</th>
                    <th className="px-3 py-2">Tvoja neto</th>
                    <th className="px-3 py-2">Neto @ kvalitet</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {simulation.packages.map((p) => (
                    <tr key={p.deliverableId}>
                      <td className="px-3 py-2 text-white">{p.nameSr}</td>
                      <td className="px-3 py-2">{formatEur(p.clientPriceEur)}</td>
                      <td className="px-3 py-2 text-emerald-300">{formatEur(p.ownerNetEur)}</td>
                      <td className="px-3 py-2">{formatEur(p.ownerNetAfterQualityEur)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <MiniStat
                icon={TrendingUp}
                label="1 retainer + 1 projekat/mes"
                value={formatEur(simulation.monthlyScenario.combinedOwnerNetEur)}
                sub={`@ kvalitet: ${formatEur(simulation.monthlyScenario.combinedAfterQualityEur)}`}
              />
              <MiniStat
                icon={LineChart}
                label="Titanis close (50 target)"
                value={formatEur(simulation.titanisPipeline.closeTarget50.estimatedRevenueEur)}
                sub={`${simulation.titanisPipeline.closeTarget50.conversions} konverzija × €120`}
              />
              <MiniStat
                icon={LineChart}
                label="Titanis follow-up (25 target)"
                value={formatEur(simulation.titanisPipeline.followUpTarget25.estimatedRevenueEur)}
                sub={`${simulation.titanisPipeline.followUpTarget25.conversions} konverzija × €55`}
              />
            </div>
          </div>
        )}
      </div>
    </GlassCard>
  );
}

function KpiTile({
  label,
  value,
  sub,
  live,
}: {
  label: string;
  value: string;
  sub: string;
  live?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{sub}</p>
      {live !== undefined && (
        <span
          className={`mt-2 inline-block rounded px-1.5 py-0.5 text-[10px] uppercase ${
            live ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
          }`}
        >
          {live ? 'live' : 'katalog'}
        </span>
      )}
    </div>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
      <div className="flex items-center gap-1.5 text-xs text-slate-500">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <p className="mt-1 text-lg font-semibold text-white">{value}</p>
      <p className="text-xs text-slate-400">{sub}</p>
    </div>
  );
}
