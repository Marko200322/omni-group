'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Clock, Hammer, Package, AlertCircle } from 'lucide-react';

type Project = {
  id: string;
  name: string;
  clientName?: string | null;
  status: string;
  testStatus: string;
  deployStatus: string;
  updatedAt?: string;
};

const STATUS_LABELS: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  draft: { label: 'Zahtev primljen', color: 'text-slate-300', icon: Clock },
  building: { label: 'Razvoj u toku', color: 'text-cyan-300', icon: Hammer },
  built: { label: 'Verzija izgrađena', color: 'text-violet-300', icon: Package },
  tested: { label: 'Testirano i spremno', color: 'text-emerald-300', icon: CheckCircle2 },
  failed: { label: 'Potrebna pažnja tima', color: 'text-amber-300', icon: AlertCircle },
};

function resolveStatus(project: Project) {
  if (project.status === 'failed' || project.testStatus === 'failed') {
    return STATUS_LABELS.failed;
  }
  if (project.status === 'tested' || project.testStatus === 'passed') {
    return STATUS_LABELS.tested;
  }
  return STATUS_LABELS[project.status] ?? STATUS_LABELS.draft;
}

type Props = { disabled?: boolean };

export function ClientOrdersPanel({ disabled }: Props) {
  const [orders, setOrders] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/atina/product-factory/projects?lane=client_order&limit=20');
      const json = (await res.json()) as {
        ok?: boolean;
        data?: { projects?: Project[] };
        error?: string;
      };
      if (!res.ok || !json.ok) {
        setError(json.error ?? 'load_failed');
        return;
      }
      setOrders(json.data?.projects ?? []);
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
        Prijavite se da pratite status vaših porudžbina i isporuka.
      </p>
    );
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Učitavamo vaše porudžbine…</p>;
  }

  if (error) {
    return (
      <p className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-sm text-amber-200">
        Trenutno ne možemo učitati porudžbine. Pokušajte ponovo ili kontaktirajte podršku.
      </p>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center">
        <Package className="mx-auto h-8 w-8 text-slate-500" />
        <p className="mt-3 font-medium text-white">Još nema aktivnih porudžbina</p>
        <p className="mt-1 text-sm text-slate-500">
          Započnite u sekciji Porudžbina — tim će vam dostaviti rešenje po meri, potpuno testirano.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {orders.map((order) => {
        const meta = resolveStatus(order);
        const Icon = meta.icon;
        return (
          <li
            key={order.id}
            className="rounded-xl border border-white/5 bg-white/[0.02] p-4 transition hover:border-emerald-500/20"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium text-white">{order.name}</p>
                {order.clientName && (
                  <p className="mt-0.5 text-xs text-slate-500">{order.clientName}</p>
                )}
              </div>
              <p className={`flex items-center gap-1.5 text-sm font-medium ${meta.color}`}>
                <Icon className="h-4 w-4" />
                {meta.label}
              </p>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Svaka porudžbina je izolovana — vaš softver ne deli kod ni infrastrukturu sa drugim klijentima.
            </p>
          </li>
        );
      })}
    </ul>
  );
}
