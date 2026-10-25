'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { getPublicCatalogStats } from '@/lib/public-catalog';

/** Short pricing FAQ — competitor pattern: reduce hesitation with plain answers. */
export function PricingClarityFaq() {
  const s = getPublicCatalogStats();
  const sellable = s.sellablePackages.toLocaleString('en-US');
  const faq: { q: string; a: ReactNode }[] = [
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
      q: `Why ${sellable} packages if I only see ~${s.basePackages} cards?`,
      a: (
        <>
          <strong className="font-medium text-white">{sellable}</strong> is not {sellable} different base
          products. It is{' '}
          <strong className="font-medium text-white">
            {s.basePackages} delivery capabilities ({s.expertServiceCount} expert services + {s.bundleCount}{' '}
            bundles) × {s.industryGroups} industries
          </strong>
          . Each industry gets the same capability template tailored to its problems — one SKU id per
          capability×industry. Select your industry on{' '}
          <Link href="/products" className="text-violet-300 underline-offset-2 hover:underline">
            Products
          </Link>{' '}
          to load that niche&apos;s set.
        </>
      ),
    },
    {
      q: 'Why do I see both 15% and 18% discounts?',
      a: (
        <>
          They are <strong className="font-medium text-white">two separate promos</strong>, not stacked on one
          checkout:
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <strong className="font-medium text-white">SaaS founding (~15%)</strong> — platform subscription
              (Launch / Growth / Scale) only. Applies for the first lock window (default 12 months), limited founding
              slots, then list price. Regulated industries use partner pricing instead.
            </li>
            <li>
              <strong className="font-medium text-white">Package intro (~18%)</strong> — expert delivery packages /
              bundles only. First 50 paying package clients get the cut at package checkout; cards still show regular
              list. After slots fill, everyone pays list.
            </li>
          </ul>
          Buying a subscription does not automatically discount a package, and vice versa.
        </>
      ),
    },
    {
      q: 'Is the price on the card what I pay?',
      a: (
        <>
          Package cards show the <strong className="font-medium text-white">regular list</strong> price. While package
          intro slots remain, checkout charges <strong className="font-medium text-white">-18%</strong> for those
          packages only; after that everyone pays the full list shown. SaaS plan cards use the separate founding promo
          above when active.
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

  return (
    <section className="mt-20 border-t border-white/10 pt-16">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">FAQ</p>
      <h2 className="mt-2 font-display text-2xl font-bold text-white">Clear answers before you buy</h2>
      <dl className="mt-8 space-y-6">
        {faq.map((item) => (
          <div key={item.q} className="max-w-3xl">
            <dt className="text-sm font-semibold text-white">{item.q}</dt>
            <dd className="mt-2 text-sm leading-relaxed text-slate-400">{item.a}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
