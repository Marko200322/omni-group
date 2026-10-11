'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';

const FAQ: { q: string; a: ReactNode }[] = [
  {
    q: 'What am I buying — the platform or a package?',
    a: (
      <>
        The <strong className="font-medium text-white">subscription</strong> is the workspace (CRM, workflows,
        billing, documents, AI support). <strong className="font-medium text-white">Expert packages</strong> are
        optional fixed-scope delivery (landing, website, audit, retainers…) you add only when you need them.
      </>
    ),
  },
  {
    q: 'Why 1,000 packages if I only see ~20 cards?',
    a: (
      <>
        There are <strong className="font-medium text-white">20 delivery capabilities × 50 industries</strong>. Select
        your industry to load that niche&apos;s full set. Same scope and list price book — problems and extras are
        tailored. Browse the directory on{' '}
        <Link href="/products" className="text-violet-300 underline-offset-2 hover:underline">
          Products
        </Link>
        .
      </>
    ),
  },
  {
    q: 'Is the price on the card what I pay?',
    a: (
      <>
        Cards show the <strong className="font-medium text-white">regular list</strong> price. The first 50 package
        clients get an intro discount at checkout while slots remain; after that everyone pays the full list price
        shown.
      </>
    ),
  },
  {
    q: 'What ships after I pay?',
    a: (
      <>
        Each card states what is automated vs human-delivered, what you get, and what is not included. After payment
        confirmation you receive product/service delivery plus docs and an invoice in the portal — not a PDF-only
        pack.
      </>
    ),
  },
];

/** Short pricing FAQ — competitor pattern: reduce hesitation with plain answers. */
export function PricingClarityFaq() {
  return (
    <section className="mt-20 border-t border-white/10 pt-16">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">FAQ</p>
      <h2 className="mt-2 font-display text-2xl font-bold text-white">Clear answers before you buy</h2>
      <dl className="mt-8 space-y-6">
        {FAQ.map((item) => (
          <div key={item.q} className="max-w-3xl">
            <dt className="text-sm font-semibold text-white">{item.q}</dt>
            <dd className="mt-2 text-sm leading-relaxed text-slate-400">{item.a}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
