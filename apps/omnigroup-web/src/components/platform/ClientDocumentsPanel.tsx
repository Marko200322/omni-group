'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileText } from 'lucide-react';

type DocRow = {
  id: string;
  kind: string;
  title: string;
  invoiceNumber?: string | null;
  amount?: number | null;
  currency?: string | null;
  status?: string | null;
  createdAt?: string | null;
  href?: string;
  vatNote?: string;
};

type DocsPayload = {
  documents?: DocRow[];
  sellerVatReady?: boolean;
  vatStatus?: string;
};

export function ClientDocumentsPanel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DocsPayload | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/atina/documents?limit=20&page=1', { cache: 'no-store' });
        const json = (await res.json()) as { ok?: boolean; data?: DocsPayload; error?: string };
        if (!res.ok || !json.ok) {
          if (!cancelled) setError(json.error ?? 'documents_failed');
          return;
        }
        if (!cancelled) setData(json.data ?? null);
      } catch {
        if (!cancelled) setError('network_error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const docs = data?.documents ?? [];

  return (
    <div className="mt-6 space-y-4">
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-violet-500/15 p-2 text-violet-300">
            <FileText className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-white">Billing documents</h3>
            <p className="mt-1 text-xs text-slate-400">
              {data?.sellerVatReady
                ? 'Tax invoices are enabled (seller legal entity + Tax ID set).'
                : 'Soft start: payment receipts until owner sets company legal name + Tax ID (VAT / P2).'}
            </p>
          </div>
        </div>
        {loading ? <p className="mt-3 text-xs text-slate-500">Loading documents…</p> : null}
        {error ? <p className="mt-3 text-xs text-rose-300">Could not load documents ({error}).</p> : null}
        {!loading && !error && docs.length === 0 ? (
          <p className="mt-3 text-xs text-slate-500">
            No documents yet. Receipts appear after a confirmed plan or package payment.
          </p>
        ) : null}
        <ul className="mt-3 space-y-2">
          {docs.map((d) => (
            <li
              key={d.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm"
            >
              <div>
                <p className="font-medium text-white">{d.title}</p>
                <p className="text-xs text-slate-500">
                  {d.kind}
                  {d.amount != null ? ` · ${d.currency ?? 'EUR'} ${d.amount}` : ''}
                  {d.status ? ` · ${d.status}` : ''}
                </p>
              </div>
              {d.href ? (
                <Link href={d.href} className="text-xs text-violet-300 underline-offset-2 hover:underline">
                  Open
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
