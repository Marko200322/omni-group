'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  Bot,
  CheckCircle2,
  CreditCard,
  Factory,
  Home,
  LayoutDashboard,
  Loader2,
  Play,
  RefreshCw,
  Smartphone,
} from 'lucide-react';
import type { AtinaPublicSnapshot } from '@/lib/atina';
import type { AtinaAdminOverview, AtinaAdminPayment } from '@/lib/atina-live-types';
import { buildAdminMetrics } from '@/lib/platform-metrics';
import { subscribeAdminPush } from '@/lib/web-push-client';

type Tab = 'pregled' | 'uplate' | 'fabrika' | 'akcije';

type FactoryStats = {
  clientOrders?: { total?: number; building?: number; ready?: number };
  internalProducts?: { total?: number; building?: number; ready?: number };
  lanes?: { client_order?: number; internal_saas?: number };
};

type AutonomyStatus = {
  scheduler?: { running?: boolean; lastTickAt?: string | null };
  budget?: { balanceUsd?: number; hardStop?: boolean };
  latestCycle?: { status?: string; created_at?: string };
};

type RolloutSummary = {
  overallCompletionPct?: number;
  completedCategories?: number;
  totalCategories?: number;
  nextCategoryName?: string | null;
};

type Props = {
  snapshot: AtinaPublicSnapshot;
  sessionEmail: string;
  overview: AtinaAdminOverview | null;
  pendingPayments: AtinaAdminPayment[];
};

function formatAmount(amount: number | string, currency: string): string {
  const n = typeof amount === 'number' ? amount : parseFloat(String(amount));
  if (Number.isNaN(n)) return `${amount} ${currency}`;
  try {
    return new Intl.NumberFormat('sr-RS', { style: 'currency', currency: currency.toUpperCase() }).format(n);
  } catch {
    return `${n.toFixed(2)} ${currency}`;
  }
}

function parseMetadata(raw: AtinaAdminPayment['metadata']): Record<string, unknown> {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

const TABS: { id: Tab; label: string; icon: typeof Home }[] = [
  { id: 'pregled', label: 'Pregled', icon: Home },
  { id: 'uplate', label: 'Uplate', icon: CreditCard },
  { id: 'fabrika', label: 'Fabrika', icon: Factory },
  { id: 'akcije', label: 'Akcije', icon: Bot },
];

export default function AdminMobileClient({ snapshot, sessionEmail, overview, pendingPayments: initialPayments }: Props) {
  const [tab, setTab] = useState<Tab>('pregled');
  const [payments, setPayments] = useState(initialPayments);
  const [factoryStats, setFactoryStats] = useState<FactoryStats | null>(null);
  const [autonomy, setAutonomy] = useState<AutonomyStatus | null>(null);
  const [rollout, setRollout] = useState<RolloutSummary | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);

  const metrics = buildAdminMetrics(snapshot, overview);

  const loadExtras = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const [fs, as, rs, pr] = await Promise.all([
        fetch('/api/atina/product-factory/stats').then((r) => r.json()),
        fetch('/api/atina/autonomy-loop/status').then((r) => r.json()),
        fetch('/api/atina/autonomy-loop/categories/status').then((r) => r.json()),
        fetch('/api/atina/admin/payments?status=processing&provider=manual&limit=50').then((r) => r.json()),
      ]);
      if (fs.ok) setFactoryStats(fs.data as FactoryStats);
      if (as.ok) setAutonomy(as.data as AutonomyStatus);
      if (rs.ok) setRollout(rs.data as RolloutSummary);
      if (pr.ok) setPayments((pr.data as AtinaAdminPayment[]) ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Greška pri učitavanju');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadExtras();
  }, [loadExtras]);

  const enablePush = async () => {
    const ok = await subscribeAdminPush();
    setPushEnabled(ok);
    setMessage(ok ? 'Push notifikacije uključene.' : 'Push nije dostupan — proveri VAPID ključeve.');
  };

  const runAction = async (key: string, url: string, method = 'POST') => {
    setBusy(key);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch(url, { method });
      const body = (await res.json()) as { ok?: boolean; error?: string; detail?: string; message?: string };
      if (!res.ok || body.ok === false) throw new Error(body.detail ?? body.error ?? 'action_failed');
      setMessage(body.message ?? 'Uspelo.');
      await loadExtras();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Akcija nije uspela');
    } finally {
      setBusy(null);
    }
  };

  const confirmPayment = async (paymentId: string) => {
    setBusy(paymentId);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch(`/api/atina/payments/manual/confirm/${paymentId}`, { method: 'POST' });
      const body = (await res.json()) as { ok?: boolean; detail?: string; error?: string };
      if (!body.ok) throw new Error(body.detail ?? body.error ?? 'confirm_failed');
      setPayments((prev) => prev.filter((p) => p.id !== paymentId));
      setMessage('Uplata potvrđena.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Potvrda nije uspela');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <header
        className="sticky top-0 z-20 border-b border-white/10 bg-[#0a0a12]/95 px-4 py-3 backdrop-blur-md"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs text-violet-300">
              <Smartphone className="h-3.5 w-3.5" /> Mobilni admin
            </p>
            <h1 className="truncate font-display text-lg font-semibold">Operator</h1>
            <p className="truncate text-xs text-slate-500">{sessionEmail}</p>
          </div>
          <button
            type="button"
            onClick={() => void loadExtras()}
            disabled={refreshing}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 active:bg-white/10"
            aria-label="Osveži"
          >
            <RefreshCw className={`h-5 w-5 text-violet-300 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
        {(message || error) && (
          <p className={`mt-2 rounded-lg px-3 py-2 text-xs ${error ? 'bg-rose-500/15 text-rose-200' : 'bg-emerald-500/15 text-emerald-200'}`}>
            {error ?? message}
          </p>
        )}
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4 pb-28">
        {tab === 'pregled' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <StatTile label="API" value={snapshot.health?.ok ? 'OK' : '—'} accent="emerald" />
              <StatTile label="Uplate čekaju" value={String(payments.length)} accent="amber" />
              <StatTile label="Korisnici" value={metrics.activeUsers} accent="violet" />
              <StatTile label="MRR" value={metrics.mrr} accent="cyan" />
            </div>
            <Card title="Rollout kategorija">
              <p className="text-2xl font-bold text-white">
                {rollout?.overallCompletionPct ?? '—'}%
              </p>
              <p className="mt-1 text-sm text-slate-400">
                {rollout?.completedCategories ?? 0} / {rollout?.totalCategories ?? 25} kategorija
                {rollout?.nextCategoryName ? ` · sledeća: ${rollout.nextCategoryName}` : ''}
              </p>
            </Card>
            <Card title="Autonomy">
              <p className="text-sm text-slate-300">
                Scheduler: {autonomy?.scheduler?.running ? 'radi' : 'stoji'}
              </p>
              <p className="text-sm text-slate-400">
                Budžet: ${autonomy?.budget?.balanceUsd?.toFixed(0) ?? '—'}
                {autonomy?.budget?.hardStop ? ' · HARD STOP' : ''}
              </p>
            </Card>
            {!pushEnabled && (
              <button
                type="button"
                onClick={() => void enablePush()}
                className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-sm text-emerald-200"
              >
                Uključi push obaveštenja
              </button>
            )}
            <Link
              href="/admin"
              className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-violet-500/30 bg-violet-500/10 text-sm text-violet-200 active:bg-violet-500/20"
            >
              <LayoutDashboard className="h-4 w-4" /> Puna desktop konzola
            </Link>
          </div>
        )}

        {tab === 'uplate' && (
          <div className="space-y-3">
            {payments.length === 0 ? (
              <Card title="Nema uplata na čekanju">
                <p className="text-sm text-slate-400">Sve manual uplate su obrađene.</p>
              </Card>
            ) : (
              payments.map((p) => {
                const meta = parseMetadata(p.metadata);
                const deliverable = typeof meta.deliverableId === 'string' ? meta.deliverableId : null;
                return (
                  <div key={p.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <p className="font-semibold text-white">{formatAmount(p.amount, p.currency)}</p>
                    <p className="mt-1 text-sm text-slate-400">{p.email ?? p.user_name ?? p.user_id}</p>
                    {deliverable && <p className="text-xs text-violet-300">{deliverable}</p>}
                    {p.description && <p className="mt-1 text-xs text-slate-500">{p.description}</p>}
                    <button
                      type="button"
                      disabled={busy === p.id}
                      onClick={() => void confirmPayment(p.id)}
                      className="mt-3 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-medium text-white active:bg-emerald-500 disabled:opacity-50"
                    >
                      {busy === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      Potvrdi uplatu
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}

        {tab === 'fabrika' && (
          <div className="space-y-3">
            <Card title="Klijentske narudžbine">
              <p className="text-2xl font-bold">{factoryStats?.clientOrders?.total ?? '—'}</p>
              <p className="text-sm text-slate-400">
                U izradi: {factoryStats?.clientOrders?.building ?? 0} · Spremno: {factoryStats?.clientOrders?.ready ?? 0}
              </p>
            </Card>
            <Card title="Interni SaaS">
              <p className="text-2xl font-bold">{factoryStats?.internalProducts?.total ?? '—'}</p>
              <p className="text-sm text-slate-400">
                U izradi: {factoryStats?.internalProducts?.building ?? 0} · Spremno: {factoryStats?.internalProducts?.ready ?? 0}
              </p>
            </Card>
            <button
              type="button"
              disabled={busy === 'factory-tick'}
              onClick={() => void runAction('factory-tick', '/api/atina/product-factory/internal/tick')}
              className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-500/10 text-sm font-medium text-cyan-200 active:bg-cyan-500/20 disabled:opacity-50"
            >
              {busy === 'factory-tick' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Pokreni internal SaaS tick
            </button>
          </div>
        )}

        {tab === 'akcije' && (
          <div className="space-y-3">
            <ActionButton
              label="Autonomy tick"
              sub="Jedan ciklus istraživanja i deploy-a"
              busy={busy === 'autonomy-tick'}
              onClick={() => void runAction('autonomy-tick', '/api/atina/autonomy-loop/tick')}
            />
            <ActionButton
              label="Evolution tick"
              sub="Optimizacija modula i zadataka"
              busy={busy === 'evolution-tick'}
              onClick={() => void runAction('evolution-tick', '/api/atina/autonomy-loop/evolution/tick')}
            />
            <ActionButton
              label="Pokreni scheduler"
              sub="Automatski autonomy ciklusi"
              busy={busy === 'scheduler-start'}
              onClick={() => void runAction('scheduler-start', '/api/atina/autonomy-loop/scheduler/start')}
            />
            <ActionButton
              label="Zaustavi scheduler"
              sub="Pauziraj automatske cikluse"
              busy={busy === 'scheduler-stop'}
              onClick={() => void runAction('scheduler-stop', '/api/atina/autonomy-loop/scheduler/stop')}
            />
            <Card title="Poslednji ciklus">
              <p className="text-sm text-white">{autonomy?.latestCycle?.status ?? '—'}</p>
              <p className="text-xs text-slate-500">{autonomy?.latestCycle?.created_at ?? ''}</p>
            </Card>
          </div>
        )}
      </main>

      <nav
        className="fixed bottom-0 left-0 right-0 z-20 border-t border-white/10 bg-[#0a0a12]/95 backdrop-blur-md"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="grid grid-cols-4">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`relative flex min-h-[56px] flex-col items-center justify-center gap-0.5 py-2 text-[10px] ${
                tab === id ? 'text-violet-300' : 'text-slate-500'
              }`}
            >
              <Icon className="h-5 w-5" />
              {label}
              {id === 'uplate' && payments.length > 0 && (
                <span className="absolute mt-[-28px] ml-6 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold text-black">
                  {payments.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

function StatTile({ label, value, accent }: { label: string; value: string; accent: 'emerald' | 'amber' | 'violet' | 'cyan' }) {
  const colors = {
    emerald: 'border-emerald-500/30 text-emerald-300',
    amber: 'border-amber-500/30 text-amber-300',
    violet: 'border-violet-500/30 text-violet-300',
    cyan: 'border-cyan-500/30 text-cyan-300',
  };
  return (
    <div className={`rounded-2xl border bg-white/[0.03] p-4 ${colors[accent]}`}>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 font-display text-xl font-bold text-white">{value}</p>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs uppercase tracking-wider text-slate-500">{title}</p>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function ActionButton({
  label,
  sub,
  busy,
  onClick,
}: {
  label: string;
  sub: string;
  busy: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className="flex min-h-[56px] w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-left active:bg-white/[0.08] disabled:opacity-50"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/20">
        {busy ? <Loader2 className="h-5 w-5 animate-spin text-violet-300" /> : <Activity className="h-5 w-5 text-violet-300" />}
      </div>
      <div className="min-w-0">
        <p className="font-medium text-white">{label}</p>
        <p className="text-xs text-slate-500">{sub}</p>
      </div>
    </button>
  );
}
