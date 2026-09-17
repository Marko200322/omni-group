'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

type InvoiceRow = {
  id?: string;
  invoice_number?: string;
  total_amount?: number | string;
  amount?: number | string;
  currency?: string;
  status?: string;
  line_items?: Array<{ description?: string; amount?: number }>;
  created_at?: string;
};

function formatDate(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function amountOf(row: InvoiceRow) {
  const raw = row.total_amount ?? row.amount ?? 0;
  const n = Number(raw);
  return Number.isFinite(n) ? n.toFixed(2) : String(raw);
}

/** Read-only invoice list for the client billing portal. */
export function InvoiceHistoryPanel() {
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/atina/billing/invoices?limit=20&page=1');
        const json = (await res.json()) as {
          ok?: boolean;
          data?: { invoices?: InvoiceRow[]; total?: number };
          error?: string;
        };
        if (!res.ok || !json.ok) {
          throw new Error(json.error ?? 'Failed to load invoices');
        }
        if (!cancelled) {
          setRows(json.data?.invoices ?? []);
          setTotal(json.data?.total ?? json.data?.invoices?.length ?? 0);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load invoices');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <motion.div
      className="rounded-xl border border-white/10 bg-white/[0.02] p-4"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-medium text-white">Invoice history</h3>
        {!loading && !error && (
          <span className="text-xs text-slate-500">{total} total</span>
        )}
      </div>

      {loading && <p className="mt-3 text-xs text-slate-500">Loading invoices…</p>}
      {error && <p className="mt-3 text-xs text-amber-300/90">{error}</p>}
      {!loading && !error && rows.length === 0 && (
        <p className="mt-3 text-xs text-slate-500">No invoices yet. They appear after a confirmed payment.</p>
      )}

      {rows.length > 0 && (
        <ul className="mt-3 divide-y divide-white/5">
          {rows.map((inv) => (
            <li
              key={inv.id ?? inv.invoice_number ?? inv.created_at}
              className="flex flex-wrap items-baseline justify-between gap-2 py-2.5 text-sm"
            >
              <div className="min-w-0">
                <p className="font-mono text-xs text-white">
                  {inv.invoice_number ?? inv.id?.slice(0, 8) ?? '—'}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {formatDate(inv.created_at)}
                  {inv.line_items?.[0]?.description
                    ? ` · ${inv.line_items[0].description}`
                    : ''}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-emerald-100">
                  {amountOf(inv)} {inv.currency ?? 'EUR'}
                </p>
                <p className="text-[11px] uppercase tracking-wide text-slate-500">
                  {inv.status ?? '—'}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </motion.div>
  );
}
