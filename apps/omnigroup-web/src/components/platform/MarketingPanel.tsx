'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, Megaphone, Play, RefreshCw, Radio } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { csrfFetch } from '@/lib/csrf-fetch';

function na(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return 'N/A';
  return typeof v === 'number' ? (Number.isInteger(v) ? String(v) : v.toFixed(2)) : String(v);
}

type Tab =
  | 'overview'
  | 'channels'
  | 'funnel'
  | 'attribution'
  | 'economics'
  | 'email'
  | 'packages'
  | 'simulator'
  | 'experiments'
  | 'alerts';

type Overview = {
  kind?: string;
  note?: string;
  autonomyLevel?: number;
  totals?: Record<string, number | null | undefined>;
  channels?: Array<Record<string, unknown>>;
};

const TABS: Tab[] = [
  'overview',
  'channels',
  'funnel',
  'attribution',
  'economics',
  'email',
  'packages',
  'simulator',
  'experiments',
  'alerts',
];

export function MarketingPanel({ disabled = false }: { disabled?: boolean }) {
  const [tab, setTab] = useState<Tab>('overview');
  const [overview, setOverview] = useState<Overview | null>(null);
  const [extra, setExtra] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [spendMult, setSpendMult] = useState('2');
  const [omiQ, setOmiQ] = useState('Koliko nas je Google koštao?');
  const [omiA, setOmiA] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/atina/marketing/overview');
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error?.message || json?.message || 'Marketing API unavailable');
        setOverview(null);
        return;
      }
      setOverview((json.data ?? json) as Overview);
    } catch {
      setError('Marketing API unavailable');
      setOverview(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTab = useCallback(async (t: Tab) => {
    if (t === 'overview' || t === 'channels') return;
    const path =
      t === 'simulator'
        ? null
        : t === 'economics'
          ? '/api/atina/marketing/economics'
          : t === 'email'
            ? '/api/atina/marketing/email-engagement'
            : t === 'packages'
              ? '/api/atina/marketing/package-matrix'
              : `/api/atina/marketing/${t === 'alerts' ? 'alerts' : t}`;
    if (!path) return;
    try {
      const res = await fetch(path);
      const json = await res.json().catch(() => ({}));
      setExtra(json.data ?? json);
    } catch {
      setExtra(null);
    }
  }, []);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    void loadTab(tab);
  }, [tab, loadTab]);

  const runEngine = async () => {
    if (disabled) return;
    setRunning(true);
    try {
      await csrfFetch('/api/atina/marketing/engine/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      await loadOverview();
      await loadTab(tab);
    } finally {
      setRunning(false);
    }
  };

  const syncAds = async () => {
    if (disabled) return;
    setSyncing(true);
    try {
      const res = await csrfFetch('/api/atina/marketing/adapters/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      const json = await res.json().catch(() => ({}));
      setExtra(json.data ?? json);
      await loadOverview();
    } finally {
      setSyncing(false);
    }
  };

  const runWhatIf = async () => {
    const res = await csrfFetch('/api/atina/marketing/scenarios/what-if', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ spendMultiplier: Number(spendMult) || 1 }),
    });
    const json = await res.json().catch(() => ({}));
    setExtra(json.data ?? json);
  };

  const askOmi = async () => {
    const res = await fetch(`/api/atina/marketing/omi-answer?q=${encodeURIComponent(omiQ)}`);
    const json = await res.json().catch(() => ({}));
    const data = json.data ?? json;
    setOmiA(`${data.kind ?? 'UNAVAILABLE'}: ${data.answer ?? '—'}`);
  };

  const t = overview?.totals ?? {};
  const email = (extra ?? {}) as Record<string, unknown>;
  const matrix = (extra ?? {}) as { rows?: Array<Record<string, unknown>>; note?: string; kind?: string };
  const channels = overview?.channels ?? [];
  const channelsAllUnavailable =
    channels.length > 0 &&
    channels.every((c) => String(c.kind ?? '').toUpperCase() === 'UNAVAILABLE');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold text-[var(--text)]">
            <Megaphone className="h-5 w-5" />
            Marketing Intelligence
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Profitable growth — not vanity metrics. Autonomy LEVEL {overview?.autonomyLevel ?? 1}.
            Google/Meta ads and Resend email opens stay UNAVAILABLE until LIVE credentials / webhook
            secret are configured (observer mode is honest — no fake spend).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={disabled || loading}
            onClick={() => void loadOverview()}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            type="button"
            disabled={disabled || syncing}
            onClick={() => void syncAds()}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
          >
            <Radio className={`h-4 w-4 ${syncing ? 'animate-pulse' : ''}`} />
            Sync ads LIVE
          </button>
          <button
            type="button"
            disabled={disabled || running}
            onClick={() => void runEngine()}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-3 py-2 text-sm text-white"
          >
            <Play className="h-4 w-4" />
            Run engine
          </button>
        </div>
      </div>

      {error ? (
        <GlassCard className="border-amber-500/40 p-4 text-sm text-amber-200">
          Marketing API unavailable — {error}. Checkout unaffected.
        </GlassCard>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {TABS.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-lg px-3 py-1.5 text-xs uppercase tracking-wide ${
              tab === id ? 'bg-[var(--accent)] text-white' : 'border border-[var(--border)]'
            }`}
          >
            {id}
          </button>
        ))}
      </div>

      {(tab === 'overview' || tab === 'channels') && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['Spend €', t.spendEur],
              ['Leads', t.leads],
              ['Customers', t.customers],
              ['Revenue €', t.revenueEur],
              ['Contribution €', t.contributionEur],
              ['CAC', t.cac],
              ['CPL', t.cpl],
              ['ROI', t.roi],
            ].map(([label, value]) => (
              <GlassCard key={String(label)} className="p-4">
                <div className="text-xs text-[var(--muted)]">{label}</div>
                <div className="mt-1 text-2xl font-semibold tabular-nums">{na(value as number | null)}</div>
              </GlassCard>
            ))}
          </div>

          {channelsAllUnavailable ? (
            <GlassCard className="border-amber-500/30 p-4 text-sm text-amber-100">
              KPI totals above are platform CRM / collected-payment aggregates — not channel
              attribution. Every ads/email channel row is UNAVAILABLE until LIVE credentials /
              webhook secrets are configured (zeros in the table are expected, not a sync bug).
            </GlassCard>
          ) : null}

          <GlassCard className="p-4">
            <h3 className="mb-3 text-sm font-medium">Channels</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="text-xs text-[var(--muted)]">
                  <tr>
                    <th className="py-2">Channel</th>
                    <th>Spend</th>
                    <th>Leads</th>
                    <th>Customers</th>
                    <th>CPL</th>
                    <th>CAC</th>
                    <th>Kind</th>
                  </tr>
                </thead>
                <tbody>
                  {channels.map((c) => (
                    <tr key={String(c.code)} className="border-t border-[var(--border)]">
                      <td className="py-2">{String(c.name)}</td>
                      <td>{na(c.spendEur as number)}</td>
                      <td>{na(c.leads as number)}</td>
                      <td>{na(c.customers as number)}</td>
                      <td>{na(c.cpl as number)}</td>
                      <td>{na(c.cac as number)}</td>
                      <td className="text-xs uppercase">{String(c.kind ?? 'N/A')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </>
      )}

      {tab === 'email' && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              ['Kind', email.kind],
              ['Sent', email.sent],
              ['Delivered', email.delivered],
              ['Opened', email.opened],
              ['Clicked', email.clicked],
              ['Bounced', email.bounced],
              ['Open rate', email.openRate],
              ['Click rate', email.clickRate],
            ] as Array<[string, unknown]>
          ).map(([label, value]) => (
            <GlassCard key={label} className="p-4">
              <div className="text-xs text-[var(--muted)]">{label}</div>
              <div className="mt-1 text-2xl font-semibold tabular-nums">
                {typeof value === 'number'
                  ? label.toLowerCase().includes('rate')
                    ? `${(value * 100).toFixed(1)}%`
                    : na(value)
                  : String(value ?? 'N/A')}
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {tab === 'packages' && (
        <GlassCard className="p-4">
          <p className="mb-3 text-xs text-[var(--muted)]">{matrix.note ?? 'Package × channel matrix'}</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-xs text-[var(--muted)]">
                <tr>
                  <th className="py-2">Package</th>
                  <th>Channel</th>
                  <th>Customers</th>
                  <th>Revenue €</th>
                  <th>Spend €</th>
                  <th>CAC</th>
                  <th>Contribution</th>
                </tr>
              </thead>
              <tbody>
                {(matrix.rows ?? []).map((r, i) => (
                  <tr key={`${r.packageSku}-${r.channelCode}-${i}`} className="border-t border-[var(--border)]">
                    <td className="py-2">{String(r.packageSku)}</td>
                    <td>{String(r.channelCode)}</td>
                    <td>{na(r.customers as number)}</td>
                    <td>{na(r.revenueEur as number)}</td>
                    <td>{na(r.spendEur as number | null)}</td>
                    <td>{na(r.cac as number | null)}</td>
                    <td>{na(r.contributionEur as number | null)}</td>
                  </tr>
                ))}
                {!matrix.rows?.length ? (
                  <tr>
                    <td colSpan={7} className="py-4 text-[var(--muted)]">
                      N/A — no observed package×channel rows yet
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {tab === 'simulator' && (
        <GlassCard className="space-y-3 p-4">
          <p className="text-xs uppercase text-[var(--muted)]">FORECAST / SCENARIO — not guaranteed</p>
          <label className="block text-sm">
            Spend multiplier
            <input
              className="mt-1 w-full rounded border border-[var(--border)] bg-transparent px-3 py-2"
              value={spendMult}
              onChange={(e) => setSpendMult(e.target.value)}
            />
          </label>
          <button type="button" className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm text-white" onClick={() => void runWhatIf()}>
            Run what-if
          </button>
          <pre className="overflow-auto rounded bg-black/30 p-3 text-xs">{JSON.stringify(extra, null, 2)}</pre>
        </GlassCard>
      )}

      {tab !== 'overview' &&
        tab !== 'channels' &&
        tab !== 'simulator' &&
        tab !== 'email' &&
        tab !== 'packages' && (
          <GlassCard className="p-4">
            <pre className="max-h-[28rem] overflow-auto text-xs">{JSON.stringify(extra, null, 2)}</pre>
          </GlassCard>
        )}

      <GlassCard className="space-y-2 p-4">
        <h3 className="text-sm font-medium">OMI marketing (admin)</h3>
        <div className="flex flex-wrap gap-2">
          <input
            className="min-w-[16rem] flex-1 rounded border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
            value={omiQ}
            onChange={(e) => setOmiQ(e.target.value)}
          />
          <button type="button" className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm" onClick={() => void askOmi()}>
            Ask
          </button>
        </div>
        {omiA ? <p className="text-sm text-[var(--muted)]">{omiA}</p> : null}
      </GlassCard>

      {overview?.note ? <p className="text-xs text-[var(--muted)]">{overview.note}</p> : null}

      <div className="flex flex-wrap gap-4 text-sm">
        <Link href="/admin/reinvestment" className="inline-flex items-center gap-1 text-[var(--accent)]">
          Reinvestment <ExternalLink className="h-3.5 w-3.5" />
        </Link>
        <Link href="/admin/monitoring" className="inline-flex items-center gap-1 text-[var(--accent)]">
          Monitoring <ExternalLink className="h-3.5 w-3.5" />
        </Link>
        <Link href="/admin/hunting" className="inline-flex items-center gap-1 text-[var(--accent)]">
          Hunting <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
