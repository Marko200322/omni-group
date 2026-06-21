'use client';

import { useMemo, useState } from 'react';

import { getInvoicePreviewSamples, type InvoicePreviewVariant } from '@/lib/invoice-preview-samples';

export function InvoicePreviewClient() {
  const samples = useMemo(() => getInvoicePreviewSamples(), []);
  const [active, setActive] = useState<InvoicePreviewVariant>('proforma');
  const current = samples.find((s) => s.id === active) ?? samples[0];

  return (
    <div className="py-10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <header className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-400">Omni Group · Billing</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">Invoice preview</h1>
          <p className="mt-3 max-w-2xl text-slate-400">
            Premium HTML templates sent to clients and operators. Same appearance in email clients and this
            preview.
          </p>
        </header>

        <div className="mb-6 flex flex-wrap gap-2">
          {samples.map((sample) => (
            <button
              key={sample.id}
              type="button"
              onClick={() => setActive(sample.id)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                active === sample.id
                  ? 'bg-gradient-to-r from-violet-600 to-cyan-600 text-white shadow-lg shadow-violet-900/40'
                  : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              {sample.title}
            </button>
          ))}
        </div>

        <div className="mb-4 rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-sm font-medium text-white">{current.title}</p>
          <p className="mt-1 text-sm text-slate-400">{current.description}</p>
          <p className="mt-3 text-xs text-slate-500">
            Subject: <span className="text-slate-300">{current.subject}</span>
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#eef1f8] shadow-2xl shadow-black/40">
          <iframe
            title={current.title}
            srcDoc={current.html}
            className="h-[920px] w-full border-0 bg-[#eef1f8]"
            sandbox="allow-same-origin"
          />
        </div>
      </div>
    </div>
  );
}
