'use client';

import { useCallback, useEffect, useState } from 'react';
import { PieChart, RefreshCw } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';

type AllocationSummary = {
  totals?: {
    grossEur?: number;
    ownerNetEur?: number;
    systemReinvestEur?: number;
    resourceReserveEur?: number;
    taxReserveEur?: number;
    paymentFeeEur?: number;
    paymentCount?: number;
  };
  config?: {
    ownerTaxReserveRate?: number;
    systemReinvestRate?: number;
  };
  recent?: unknown[];
};

type Props = { disabled?: boolean };

export function AdminRevenueAllocationPanel({ disabled }: Props) {
  const [summary, setSummary] = useState<AllocationSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (disabled) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/atina/billing/revenue-allocation/summary');
      const body = (await res.json()) as { ok?: boolean; data?: AllocationSummary; detail?: string; error?: string };
      if (!body.ok) throw new Error(body.detail ?? body.error ?? 'load_failed');
      setSummary(body.data ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [disabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <GlassCard className="p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
          <PieChart className="h-4 w-4 text-violet-300" />
          Revenue allocation
        </h3>
        <button
          type="button"
          disabled={disabled || loading}
          onClick={() => void refresh()}
          className="btn-glass px-2 py-1 text-xs disabled:opacity-50"
        >
          <RefreshCw className={`inline h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
      {disabled && <p className="text-xs text-slate-500">Sign in as admin to view allocation.</p>}
      {error && <p className="text-xs text-rose-400">{error}</p>}
      {summary && (
        <div className="space-y-2 text-xs text-slate-300">
          {typeof summary.totals?.grossEur === 'number' && (
            <p>
              Gross:{' '}
              <span className="font-medium text-white">
                €{summary.totals.grossEur.toLocaleString('en-US')}
              </span>
              {typeof summary.totals.paymentCount === 'number'
                ? ` · ${summary.totals.paymentCount} payments`
                : ''}
            </p>
          )}
          {[
            { label: 'Owner net', value: summary.totals?.ownerNetEur },
            { label: 'System reinvest', value: summary.totals?.systemReinvestEur },
            { label: 'Resource reserve', value: summary.totals?.resourceReserveEur },
            { label: 'Tax reserve', value: summary.totals?.taxReserveEur },
            { label: 'Payment fees', value: summary.totals?.paymentFeeEur },
          ]
            .filter((row) => typeof row.value === 'number' && row.value > 0)
            .map((row) => (
              <div key={row.label} className="flex justify-between gap-2">
                <span>{row.label}</span>
                <span>€{(row.value as number).toLocaleString('en-US')}</span>
              </div>
            ))}
          {!summary.totals?.grossEur && (
            <p className="text-slate-500">No allocation records yet — appears after confirmed payments.</p>
          )}
        </div>
      )}
    </GlassCard>
  );
}
