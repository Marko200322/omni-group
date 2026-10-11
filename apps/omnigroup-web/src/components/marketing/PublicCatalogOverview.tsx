'use client';

import Link from 'next/link';
import { getPublicCatalogStats } from '@/lib/public-catalog';

type Props = {
  /** Compact strip under a section title */
  compact?: boolean;
  /** Extra CTA under the math */
  ctaHref?: string;
  ctaLabel?: string;
};

/**
 * Crystal-clear public catalog math — competitor-style transparency
 * (capabilities × industries = sellable SKUs), not marketing fluff.
 */
export function PublicCatalogOverview({ compact, ctaHref = '/products', ctaLabel = 'Browse by industry' }: Props) {
  const s = getPublicCatalogStats();
  const packagesPerIndustry = s.basePackages;

  return (
    <div
      className={
        compact
          ? 'rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3'
          : 'rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-transparent px-5 py-5 md:px-6 md:py-6'
      }
    >
      <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
        <Stat value={String(s.basePackages)} label="Delivery capabilities" />
        <span className="hidden pb-2 text-slate-600 sm:inline" aria-hidden>
          ×
        </span>
        <Stat value={String(s.industryGroups)} label="Industries" />
        <span className="hidden pb-2 text-slate-600 sm:inline" aria-hidden>
          =
        </span>
        <Stat value={s.sellablePackages.toLocaleString('en-US')} label="Industry packages" emphasize />
      </div>

      <p className={`max-w-3xl leading-relaxed text-slate-400 ${compact ? 'mt-2 text-xs' : 'mt-4 text-sm'}`}>
        Each industry gets the same {packagesPerIndustry} capabilities (setup, landing, website, audit, retainers,
        bundles, and more) — tailored problems and extras for that niche. Pick your industry to browse; we do not dump{' '}
        {s.sellablePackages.toLocaleString('en-US')} cards at once.
        {s.readyToBuyCount > 0 ? (
          <>
            {' '}
            <span className="text-emerald-200/90">
              {s.readyToBuyCount.toLocaleString('en-US')} marked Ready to buy
            </span>
            {s.comingSoonCount > 0
              ? `; ${s.comingSoonCount.toLocaleString('en-US')} still under construction.`
              : '.'}
          </>
        ) : null}
      </p>

      {!compact && (
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href={ctaHref} className="btn-glass text-sm">
            {ctaLabel}
          </Link>
          <Link href="/pricing" className="text-sm text-violet-300 underline-offset-2 hover:underline">
            See prices &amp; intro offer
          </Link>
        </div>
      )}
    </div>
  );
}

function Stat({ value, label, emphasize }: { value: string; label: string; emphasize?: boolean }) {
  return (
    <div>
      <p className={`font-display font-bold text-white ${emphasize ? 'text-3xl md:text-4xl' : 'text-2xl md:text-3xl'}`}>
        {value}
      </p>
      <p className="mt-0.5 text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
    </div>
  );
}
