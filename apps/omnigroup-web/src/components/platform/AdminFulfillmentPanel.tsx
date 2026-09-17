'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock, Loader2, RefreshCw } from 'lucide-react';
import type { AtinaFulfillmentJob } from '@/lib/atina-live-types';
import { getDeliverable } from '@/lib/deliverable-catalog';
import { GlassCard } from '@/components/ui/GlassCard';

const STATUS_META: Record<
  AtinaFulfillmentJob['status'] | 'pending_review',
  { label: string; color: string; icon: typeof Clock }
> = {
  pending: { label: 'Queued', color: 'text-amber-300', icon: Clock },
  running: { label: 'Running', color: 'text-cyan-300', icon: Loader2 },
  completed: { label: 'Completed', color: 'text-emerald-300', icon: CheckCircle2 },
  failed: { label: 'Failed', color: 'text-rose-300', icon: AlertCircle },
  pending_review: { label: 'QA review', color: 'text-violet-300', icon: Clock },
};

type Props = { disabled?: boolean };

export function AdminFulfillmentPanel({ disabled }: Props) {
  const [jobs, setJobs] = useState<AtinaFulfillmentJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = statusFilter ? `?status=${statusFilter}&limit=50` : '?limit=50';
      const res = await fetch(`/api/atina/billing/fulfillment/jobs/admin${qs}`);
      const body = (await res.json()) as {
        ok?: boolean;
        data?: { jobs?: AtinaFulfillmentJob[] };
        error?: string;
        detail?: string;
      };
      if (!res.ok || !body.ok) {
        throw new Error(body.detail ?? body.error ?? `http_${res.status}`);
      }
      setJobs(body.data?.jobs ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  const approveJob = useCallback(
    async (paymentId: string) => {
      setBusyId(paymentId);
      setError(null);
      setMessage(null);
      try {
        const res = await fetch(`/api/atina/billing/fulfillment/jobs/${paymentId}/approve`, { method: 'POST' });
        const body = (await res.json()) as { ok?: boolean; detail?: string; error?: string };
        if (!res.ok || !body.ok) throw new Error(body.detail ?? body.error ?? `http_${res.status}`);
        setMessage('Deliverable approved and released to the client.');
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Approve failed');
      } finally {
        setBusyId(null);
      }
    },
    [refresh],
  );

  useEffect(() => {
    if (!disabled) void refresh();
  }, [disabled, refresh]);

  return (
    <GlassCard delay={0.42}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-white">Fulfillment queue</h2>
          <p className="mt-1 text-sm text-slate-400">
            Automated delivery jobs after payment confirmation — websites, PDFs, retainers, custom software.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-xs text-white"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            disabled={disabled || loading}
          >
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="running">Running</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
          <button
            type="button"
            disabled={disabled || loading}
            className="btn-ghost flex items-center gap-1 text-violet-300 disabled:opacity-50"
            onClick={() => void refresh()}
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Refresh
          </button>
        </div>
      </div>

      {disabled && (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
          Sign in with an admin account to view fulfillment jobs.
        </p>
      )}

      {!disabled && loading && jobs.length === 0 && (
        <p className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading fulfillment jobs…
        </p>
      )}

      {!disabled && !loading && error && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-sm text-amber-200">
          Could not load fulfillment ({error}).{' '}
          <button type="button" className="underline" onClick={() => void refresh()}>
            Retry
          </button>
        </div>
      )}

      {!disabled && jobs.length === 0 && !loading && !error && (
        <p className="text-sm text-slate-500">
          No fulfillment jobs yet — click Refresh after confirming a deliverable payment.
        </p>
      )}

      {!disabled && jobs.length > 0 && (
        <ul className="space-y-2">
          {jobs.map((job, idx) => {
            const meta =
              job.reviewStatus === 'pending_review' && job.status === 'completed'
                ? STATUS_META.pending_review
                : STATUS_META[job.status] ?? STATUS_META.pending;
            const Icon = meta.icon;
            const label = job.deliverableId
              ? (getDeliverable(job.deliverableId)?.name ?? job.deliverableId)
              : job.planSlug ?? job.purchaseType ?? 'Deliverable';
            const canApprove = job.reviewStatus === 'pending_review';
            const artifactCount = job.artifacts?.length ?? 0;
            const paymentRef = job.paymentId ? `${job.paymentId.slice(0, 8)}…` : '—';
            return (
              <li
                key={job.id ?? job.paymentId ?? idx}
                className="rounded-xl border border-violet-500/15 bg-violet-500/5 px-3 py-2 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-white">{label}</span>
                  <span className={`flex items-center gap-1 text-xs ${meta.color}`}>
                    <Icon className={`h-3.5 w-3.5 ${job.status === 'running' ? 'animate-spin' : ''}`} />
                    {meta.label}
                  </span>
                </div>
                <p className="mt-1 font-mono text-[10px] text-slate-500">
                  payment {paymentRef} · {artifactCount} artifact(s)
                </p>
                {canApprove && job.paymentId && (
                  <button
                    type="button"
                    disabled={busyId === job.paymentId}
                    className="btn-primary mt-2 text-xs disabled:opacity-50"
                    onClick={() => void approveJob(job.paymentId)}
                  >
                    {busyId === job.paymentId ? 'Approving…' : 'Approve & release to client'}
                  </button>
                )}
                {job.error && <p className="mt-1 text-xs text-rose-300">{job.error}</p>}
              </li>
            );
          })}
        </ul>
      )}

      {message && <p className="mt-4 text-sm text-emerald-300">{message}</p>}
      {error && !loading && jobs.length > 0 && <p className="mt-4 text-sm text-rose-300">{error}</p>}
    </GlassCard>
  );
}
