'use client';

import Link from 'next/link';
import {
  FOUNDING_PARTNER_PUBLIC_COPY,
  REGULATED_FOUNDING_PARTNER,
  REGULATED_READY_ADDON_LIST_EUR,
  formatEur,
  getFoundingPartnerQuotes,
  getRegulatedReadyItemsForPlan,
} from '@/lib/regulated-founding-partner';
import { getIndustryCategory, PLAN_SLUG_TO_MARKETING } from '@/lib/category-pricing';

type Props = {
  industryCategory: string;
};

export function RegulatedFoundingPartnerPanel({ industryCategory }: Props) {
  const category = getIndustryCategory(industryCategory);
  const quotes = getFoundingPartnerQuotes(industryCategory);
  const proQuote = quotes.find((q) => q.planSlug === 'pro');
  const proBundle = getRegulatedReadyItemsForPlan('pro');

  if (!category) return null;

  return (
    <section
      id="regulated-founding-partner"
      className="mt-14 scroll-mt-24 rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.04] p-8 md:p-10"
    >
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-300">
        {FOUNDING_PARTNER_PUBLIC_COPY.headline}
      </p>
      <h2 className="mt-2 font-display text-2xl font-bold text-white">
        Founding pricing for {category.name}
      </h2>
      <p className="mt-3 max-w-3xl text-sm text-slate-400">{FOUNDING_PARTNER_PUBLIC_COPY.subhead}</p>

      {proQuote && (
        <div className="mt-6 flex flex-wrap items-baseline gap-x-4 gap-y-2">
          <span className="text-sm text-slate-500 line-through">
            Growth list {formatEur(proQuote.listMonthly)}/mo
          </span>
          <span className="font-display text-3xl font-bold text-emerald-200">
            {formatEur(proQuote.foundingYear1Monthly)}
            <span className="text-lg font-normal text-slate-400">/mo year one</span>
          </span>
          <span className="text-sm text-emerald-200/80">
            then {formatEur(proQuote.foundingYear2Monthly)}/mo years 2–3
          </span>
        </div>
      )}

      <ul className="mt-6 grid gap-2 sm:grid-cols-2">
        {FOUNDING_PARTNER_PUBLIC_COPY.terms.map((term) => (
          <li key={term} className="flex gap-2 text-sm text-slate-300">
            <span className="text-emerald-400" aria-hidden>
              ✓
            </span>
            {term}
          </li>
        ))}
      </ul>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-black/20 p-5">
          <h3 className="font-display text-lg font-semibold text-white">Regulated Ready bundle</h3>
          <p className="mt-1 text-xs text-slate-500">
            Included on Growth+ for founding partners · {formatEur(REGULATED_READY_ADDON_LIST_EUR)}/mo add-on at
            list price later
          </p>
          <ul className="mt-4 space-y-2">
            {proBundle.map((item) => (
              <li key={item.id} className="text-sm">
                <span className="text-white">{item.title}</span>
                <span className="mt-0.5 block text-xs text-slate-500">{item.summary}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-black/20 p-5">
            <h3 className="font-display text-lg font-semibold text-white">All founding tiers</h3>
            <p className="mt-1 text-xs text-slate-500">
              {REGULATED_FOUNDING_PARTNER.maxSlots} slots total · fit-based, not first-come
            </p>
            <table className="mt-4 w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500">
                  <th className="pb-2 font-medium">Plan</th>
                  <th className="pb-2 font-medium">List</th>
                  <th className="pb-2 font-medium">Year 1</th>
                </tr>
              </thead>
              <tbody className="text-slate-300">
                {quotes.map((q) => (
                  <tr key={q.planSlug} className="border-t border-white/5">
                    <td className="py-2">{PLAN_SLUG_TO_MARKETING[q.planSlug]}</td>
                    <td className="py-2 text-slate-500">{formatEur(q.listMonthly)}</td>
                    <td className="py-2 text-emerald-200">{formatEur(q.foundingYear1Monthly)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
            <h3 className="font-display text-lg font-semibold text-amber-100">
              {FOUNDING_PARTNER_PUBLIC_COPY.pilotHeadline}
            </h3>
            <p className="mt-2 text-sm text-slate-400">{FOUNDING_PARTNER_PUBLIC_COPY.pilotCopy}</p>
          </div>
        </div>
      </div>

      <Link href={FOUNDING_PARTNER_PUBLIC_COPY.ctaHref} className="btn-primary mt-8 inline-block text-sm">
        {FOUNDING_PARTNER_PUBLIC_COPY.cta}
      </Link>
    </section>
  );
}
