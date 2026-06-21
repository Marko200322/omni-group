'use client';

import { useCallback, useEffect, useState } from 'react';
import { Factory, FlaskConical, Hammer, Sparkles } from 'lucide-react';

type Project = {
  id: string;
  lane: 'client_order' | 'internal_saas';
  slug: string;
  name: string;
  clientName?: string | null;
  status: string;
  isolationKey: string;
  testStatus: string;
  outputDir?: string | null;
};

type Stats = {
  byLane?: Record<string, Record<string, number>>;
  lanesIndependent?: boolean;
};

type Props = {
  isAdmin?: boolean;
  disabled?: boolean;
};

export function ProductFactoryPanel({ isAdmin, disabled }: Props) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<Record<string, unknown> | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const [pRes, sRes] = await Promise.all([
        fetch('/api/atina/product-factory/projects?limit=12'),
        fetch('/api/atina/product-factory/stats'),
      ]);
      const pJson = (await pRes.json()) as { ok?: boolean; data?: { projects?: Project[] }; error?: string };
      const sJson = (await sRes.json()) as { ok?: boolean; data?: Stats; error?: string };
      if (!pRes.ok || !pJson.ok) setError(pJson.error ?? 'load_failed');
      else setProjects(pJson.data?.projects ?? []);
      if (sRes.ok && sJson.ok) setStats(sJson.data ?? null);
    } catch {
      setError('network');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!disabled) void load();
  }, [disabled, load]);

  const createDemo = async (lane: 'client_order' | 'internal_saas') => {
    setBusy(`create-${lane}`);
    setError(null);
    const slug = `${lane === 'client_order' ? 'order' : 'saas'}-${Date.now().toString(36)}`;
    const body =
      lane === 'client_order'
        ? {
            lane,
            slug,
            name: 'Custom client portal',
            clientName: 'Demo Client LLC',
            description: 'Isolated order — code is not shared with other clients.',
            deliverableId: 'setup-custom',
          }
        : {
            lane,
            slug,
            name: 'Omni internal SaaS prototype',
            marketHypothesis: 'Autonomy explores a niche for a new Omni Group SaaS product.',
          };
    try {
      const res = await fetch('/api/atina/product-factory/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { ok?: boolean; data?: Project; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error ?? 'create_failed');
        return;
      }
      await load();
    } catch {
      setError('create_network');
    } finally {
      setBusy(null);
    }
  };

  const runAction = async (id: string, action: 'build' | 'test') => {
    setBusy(`${action}:${id}`);
    setError(null);
    try {
      const res = await fetch(`/api/atina/product-factory/projects/${encodeURIComponent(id)}/${action}`, {
        method: 'POST',
      });
      const json = (await res.json()) as { ok?: boolean; data?: Record<string, unknown>; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error ?? `${action}_failed`);
        return;
      }
      setLastResult(json.data ?? null);
      await load();
    } catch {
      setError(`${action}_network`);
    } finally {
      setBusy(null);
    }
  };

  const internalTick = async () => {
    setBusy('internal-tick');
    setError(null);
    try {
      const res = await fetch('/api/atina/product-factory/internal/tick', { method: 'POST' });
      const json = (await res.json()) as { ok?: boolean; data?: Record<string, unknown>; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error ?? 'internal_tick_failed');
        return;
      }
      setLastResult(json.data ?? null);
      await load();
    } catch {
      setError('internal_tick_network');
    } finally {
      setBusy(null);
    }
  };

  if (disabled) {
    return <p className="text-sm text-slate-500">Product Factory requires a valid Atina session.</p>;
  }

  return (
    <div className="mt-4 space-y-4">
      {loading && <p className="text-sm text-slate-500">Loading product factory…</p>}
      {error && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">{error}</p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
          <p className="text-xs text-slate-500">Client orders</p>
          <p className="font-medium text-white">
            {Object.values(stats?.byLane?.client_order ?? {}).reduce((a, b) => a + b, 0)} projects
          </p>
          <p className="text-xs text-slate-500">Each has its own isolation key and folder</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
          <p className="text-xs text-slate-500">Internal SaaS (autonomy)</p>
          <p className="font-medium text-violet-300">
            {Object.values(stats?.byLane?.internal_saas ?? {}).reduce((a, b) => a + b, 0)} prototypes
          </p>
          <p className="text-xs text-slate-500">Separate from client orders</p>
        </div>
      </div>

      {isAdmin && (
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={Boolean(busy)} onClick={() => void createDemo('client_order')} className="btn-primary text-sm disabled:opacity-50">
            <Hammer className="mr-1 inline h-4 w-4" />
            New client order
          </button>
          <button type="button" disabled={Boolean(busy)} onClick={() => void createDemo('internal_saas')} className="btn-glass text-sm disabled:opacity-50">
            <Sparkles className="mr-1 inline h-4 w-4" />
            New internal SaaS
          </button>
          <button type="button" disabled={Boolean(busy)} onClick={() => void internalTick()} className="btn-glass text-sm disabled:opacity-50">
            <Factory className="mr-1 inline h-4 w-4" />
            {busy === 'internal-tick' ? 'Internal tick…' : 'Internal SaaS tick'}
          </button>
        </div>
      )}

      <ul className="space-y-2">
        {projects.map((p) => (
          <li key={p.id} className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium text-white">
                  {p.name}
                  <span className="ml-2 text-xs text-slate-500">{p.lane === 'client_order' ? 'order' : 'internal SaaS'}</span>
                </p>
                <p className="text-xs text-slate-500">
                  {p.clientName ? `${p.clientName} · ` : ''}
                  {p.status} · test {p.testStatus} · <span className="font-mono text-violet-300/80">{p.isolationKey}</span>
                </p>
              </div>
              {isAdmin && (
                <div className="flex gap-2">
                  <button type="button" disabled={Boolean(busy)} onClick={() => void runAction(p.id, 'build')} className="btn-glass text-xs disabled:opacity-50">
                    Build
                  </button>
                  <button type="button" disabled={Boolean(busy)} onClick={() => void runAction(p.id, 'test')} className="btn-glass text-xs disabled:opacity-50">
                    <FlaskConical className="mr-1 inline h-3 w-3" />
                    Test
                  </button>
                </div>
              )}
            </div>
          </li>
        ))}
        {!loading && projects.length === 0 && (
          <li className="text-sm text-slate-500">No projects yet — create a demo order or internal SaaS.</li>
        )}
      </ul>

      {lastResult && (
        <pre className="max-h-40 overflow-auto rounded-lg border border-violet-500/20 bg-violet-500/5 p-3 font-mono text-[11px] text-slate-300">
          {JSON.stringify(lastResult, null, 2)}
        </pre>
      )}
    </div>
  );
}
