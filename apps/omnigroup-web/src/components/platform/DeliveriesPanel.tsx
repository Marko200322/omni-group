'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  Loader2,
  Package,
  RefreshCw,
} from 'lucide-react';
import type { AtinaFulfillmentJob, AtinaClientSite } from '@/lib/atina-live-types';
import { getDeliverable } from '@/lib/deliverable-catalog';

const STATUS_META: Record<
  AtinaFulfillmentJob['status'] | 'pending_review',
  { label: string; color: string; icon: typeof Clock }
> = {
  pending: { label: 'Queued', color: 'text-amber-300', icon: Clock },
  running: { label: 'In production', color: 'text-cyan-300', icon: Loader2 },
  completed: { label: 'Delivered', color: 'text-emerald-300', icon: CheckCircle2 },
  failed: { label: 'Needs attention', color: 'text-rose-300', icon: AlertCircle },
  pending_review: { label: 'In QA review', color: 'text-violet-300', icon: Clock },
};

type Props = { disabled?: boolean };

export function DeliveriesPanel({ disabled }: Props) {
  const [jobs, setJobs] = useState<AtinaFulfillmentJob[]>([]);
  const [sites, setSites] = useState<AtinaClientSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [jobsRes, sitesRes] = await Promise.all([
        fetch('/api/atina/billing/fulfillment/jobs?limit=30'),
        fetch('/api/atina/public-site/client-sites/mine'),
      ]);
      const jobsJson = (await jobsRes.json()) as {
        ok?: boolean;
        data?: { jobs?: AtinaFulfillmentJob[] };
        error?: string;
      };
      const sitesJson = (await sitesRes.json()) as {
        ok?: boolean;
        data?: { sites?: AtinaClientSite[] };
      };
      if (!jobsRes.ok || !jobsJson.ok) {
        setError(jobsJson.error ?? 'load_failed');
        return;
      }
      setJobs(jobsJson.data?.jobs ?? []);
      if (sitesRes.ok && sitesJson.ok) {
        setSites(sitesJson.data?.sites ?? []);
      }
    } catch {
      setError('network');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!disabled) void load();
  }, [disabled, load]);

  if (disabled) {
    return (
      <p className="text-sm text-slate-500">
        Sign in to track deliveries — PDFs, live sites, and build status after payment confirmation.
      </p>
    );
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Loading your deliveries…</p>;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-sm text-amber-200">
        Could not load deliveries ({error}).{' '}
        <button type="button" className="underline" onClick={() => void load()}>
          Retry
        </button>
      </div>
    );
  }

  const hasContent = jobs.length > 0 || sites.length > 0;

  if (!hasContent) {
    return (
      <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center">
        <Package className="mx-auto h-8 w-8 text-slate-500" />
        <p className="mt-3 font-medium text-white">No deliveries yet</p>
        <p className="mt-1 text-sm text-slate-500">
          After admin confirms your payment, deliverables appear here — documents, live sites, and software builds.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          className="btn-ghost flex items-center gap-1 text-xs text-violet-300"
          onClick={() => void load()}
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {jobs.length > 0 && (
        <ul className="space-y-3">
          {jobs.map((job) => {
            const meta =
              job.reviewStatus === 'pending_review' && job.status === 'completed'
                ? STATUS_META.pending_review
                : STATUS_META[job.status];
            const Icon = meta.icon;
            const label = job.deliverableId
              ? (getDeliverable(job.deliverableId)?.name ?? job.deliverableId)
              : job.planSlug ?? 'Order';
            return (
              <li
                key={job.id}
                className="rounded-xl border border-white/5 bg-white/[0.02] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-white">{label}</p>
                    <p className={`mt-1 flex items-center gap-1.5 text-sm ${meta.color}`}>
                      <Icon className={`h-4 w-4 ${job.status === 'running' ? 'animate-spin' : ''}`} />
                      {meta.label}
                    </p>
                    {job.error && <p className="mt-2 text-xs text-rose-300/90">{job.error}</p>}
                    {!job.clientVisible && job.reviewStatus === 'pending_review' && (
                      <p className="mt-2 text-xs text-violet-300">Quality review in progress — downloads unlock after admin approval.</p>
                    )}
                  </div>
                  {job.completedAt && (
                    <p className="text-xs text-slate-500">
                      {new Date(job.completedAt).toLocaleString()}
                    </p>
                  )}
                </div>

                {job.publicUrl && (
                  <Link
                    href={job.publicUrl}
                    target="_blank"
                    className="mt-3 inline-flex items-center gap-1 text-sm text-cyan-300 hover:text-white"
                  >
                    View live site <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                )}

                {job.clientVisible && job.artifacts.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {job.artifacts.map((art) => (
                      <li key={art.filename}>
                        <a
                          href={`/api/atina/billing/fulfillment/jobs/${job.paymentId}/artifacts/${encodeURIComponent(art.filename)}`}
                          className="btn-glass inline-flex items-center gap-1.5 text-xs"
                          download
                        >
                          <Download className="h-3.5 w-3.5" />
                          {art.downloadLabel ?? art.filename}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {sites.length > 0 && (
        <div>
          <p className="mb-2 text-xs uppercase tracking-wider text-slate-500">Your live sites</p>
          <ul className="space-y-2">
            {sites.map((site) => (
              <li
                key={site.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-cyan-500/15 bg-cyan-500/5 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-white">{site.title}</p>
                  <p className="text-xs text-slate-500">{site.status === 'published' ? 'Published' : 'Draft'}</p>
                </div>
                <Link
                  href={site.publicUrl ?? `/sites/${site.slug}`}
                  target="_blank"
                  className="text-xs text-cyan-300 hover:text-white"
                >
                  Open <ExternalLink className="inline h-3 w-3" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
