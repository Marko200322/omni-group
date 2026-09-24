'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
import type { SolutionDetail } from '@/lib/public-site-api';
import { formatEur } from '@/lib/category-pricing';
import { getClientOffer, getPublicListPriceEur } from '@/lib/client-offers';
import { DELIVERABLE_CATALOG } from '@/lib/deliverable-catalog';
import {
  capabilityClusterFor,
  FORBIDDEN_SKU_CLUSTERS,
  isCatalogDump,
  recommendSkusForIndustry,
} from '@/lib/industry-sku-map';
import { getPackageAvailability } from '@/lib/package-delivery-spec';
import { buildLoginNextForQuote } from '@/lib/checkout-navigation';
import { buildVerticalLandingCopy } from '@/lib/vertical-landing-copy';
import { formatPlanMoney, SAAS_PLANS } from '@/lib/saas-plans';

type Props = {
  solution: SolutionDetail;
};

function deliverableDisplayName(id: string, fallback: string) {
  return DELIVERABLE_CATALOG.find((d) => d.id === id)?.name ?? fallback;
}

export function VerticalLanding({ solution }: Props) {
  const pack = solution.deliveryPack;
  const verticalOffer = getClientOffer('vertical-package');
  const verticalAvailability = getPackageAvailability('vertical-package');
  const verticalReady = verticalAvailability.saleStatus === 'READY_TO_BUY';
  const verticalQuote = verticalAvailability.saleStatus === 'REQUEST_QUOTE';
  const verticalBuyHref = buildLoginNextForQuote({
    service: 'vertical-package',
    category: solution.category,
    vertical: solution.slug,
  });
  const copy = buildVerticalLandingCopy({
    slug: solution.slug,
    name: solution.name,
    category: solution.category,
    valueProp: pack.valueProp,
  });
  const cluster = capabilityClusterFor(solution.category);
  const mapped = recommendSkusForIndustry(solution.category);
  const packIds = pack.recommendedDeliverables.map((d) => d.id);
  const filteredPack = pack.recommendedDeliverables.filter((d) => {
    const banned = FORBIDDEN_SKU_CLUSTERS[d.id];
    return !banned || !banned.includes(cluster);
  });
  const recommended = isCatalogDump(packIds) || filteredPack.length === 0
    ? mapped.map((row) => ({
        id: row.id,
        name: deliverableDisplayName(row.id, row.id),
        why: row.why,
      }))
    : filteredPack.slice(0, 4).map((d) => ({
        id: d.id,
        name: deliverableDisplayName(d.id, d.name ?? d.nameSr ?? d.id),
        why: mapped.find((row) => row.id === d.id)?.why,
      }));

  return (
    <div className="px-4 py-16">
      <div className="mx-auto max-w-5xl">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-violet-300">
            {copy.eyebrow}
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold text-gradient md:text-5xl">{copy.headline}</h1>
          <p className="mt-4 max-w-3xl text-lg text-slate-300">{copy.lede}</p>
          {copy.regulated ? (
            <p className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              This is a regulated or sensitive industry. Checkout sells scoped software and documents only — not legal,
              medical, or financial advice. A human reviews the brief before fulfillment starts.
            </p>
          ) : null}
          <ul className="mt-6 space-y-2 text-sm text-slate-400">
            {copy.pains.map((pain) => (
              <li key={pain}>• {pain}</li>
            ))}
          </ul>
        </motion.div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {SAAS_PLANS.map((plan) => (
            <Link
              key={plan.slug}
              href={`/register?plan=${plan.slug}&cycle=monthly&currency=EUR&utm_campaign=vertical-${solution.slug}`}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-violet-400/40"
            >
              <p className="font-medium text-white">{plan.name}</p>
              <p className="mt-1 text-sm text-slate-400">
                {formatPlanMoney(plan.monthly.EUR, 'EUR')} / {formatPlanMoney(plan.monthly.USD, 'USD')}
              </p>
              <p className="mt-2 text-xs text-slate-500">{copy.saasLine}</p>
            </Link>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mt-10 flex flex-wrap gap-2"
        >
          {pack.keywords.slice(0, 8).map((kw) => (
            <span
              key={kw}
              className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300"
            >
              {kw}
            </span>
          ))}
        </motion.div>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className={`rounded-2xl border p-6 ${
              verticalReady
                ? 'border-violet-500/25 bg-violet-500/10'
                : 'border-amber-500/25 bg-amber-500/5'
            }`}
          >
            <div className="flex flex-wrap items-center gap-2 text-violet-200">
              <Sparkles className="h-5 w-5" />
              <h2 className="font-display text-xl font-semibold">Vertical package</h2>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${
                  verticalReady ? 'bg-emerald-500/20 text-emerald-200' : 'bg-amber-500/20 text-amber-100'
                }`}
              >
                {verticalAvailability.badge}
              </span>
            </div>
            <p className="mt-3 text-3xl font-bold text-white">
              {formatEur(verticalOffer?.priceEur ?? getPublicListPriceEur('vertical-package'))}/mo
            </p>
            <p className="mt-2 text-sm text-slate-400">
              Monthly industry pack: CRM setup, automations, and AI support for this niche — scoped deliverable, not a
              custom rebuild of the whole practice.
            </p>
            {!verticalReady && (
              <p className="mt-3 text-sm text-amber-100">
                Currently under construction. This industry package is not for sale yet — it opens automatically when the factory reaches the required phase.
              </p>
            )}
            {verticalReady ? (
              <Link href={verticalBuyHref} className="btn-primary mt-6 inline-flex items-center gap-2 text-sm">
                Buy now <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <Link
                href={`/contact?service=vertical-package&vertical=${solution.slug}`}
                className="btn-glass mt-6 inline-flex items-center gap-2 text-sm"
              >
                {verticalQuote ? 'Request a quote' : 'Notify me when ready'} <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
          >
            <h2 className="font-display text-xl font-semibold text-white">Recommended deliverables</h2>
            <ul className="mt-4 space-y-3">
              {recommended.map((d) => {
                const availability = getPackageAvailability(d.id);
                const ready = availability.saleStatus === 'READY_TO_BUY';
                const href = buildLoginNextForQuote({
                  service: d.id,
                  category: solution.category,
                  vertical: solution.slug,
                });
                const price = formatEur(getPublicListPriceEur(d.id));
                return (
                  <li key={d.id} className="flex items-start justify-between gap-3 text-sm">
                    <span className="text-slate-300">
                      {deliverableDisplayName(d.id, d.name ?? d.id)}
                      {d.why ? <span className="mt-0.5 block text-[11px] text-slate-500">{d.why}</span> : null}
                      {!ready && (
                        <span className="mt-0.5 block text-[11px] text-amber-200/90">
                          {availability.badge}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block font-medium text-violet-200">{price}</span>
                      {ready ? (
                        <Link href={href} className="text-[11px] text-emerald-300 hover:text-white">
                          Buy
                        </Link>
                      ) : null}
                    </span>
                  </li>
                );
              })}
            </ul>
          </motion.section>
        </div>

        {pack.workflowSteps.length > 0 ? (
          <motion.section
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mt-12 rounded-2xl border border-white/10 bg-white/[0.02] p-6"
          >
            <h2 className="font-display text-xl font-semibold text-white">How we deliver</h2>
            <ol className="mt-6 grid gap-4 md:grid-cols-2">
              {pack.workflowSteps.slice(0, 6).map((step, i) => (
                <li key={`${step.step}-${i}`} className="flex gap-3 text-sm text-slate-300">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  <div>
                    <span className="font-medium text-white">
                      {i + 1}. {step.step}
                    </span>
                    <p className="mt-1 text-slate-400">{step.action}</p>
                  </div>
                </li>
              ))}
            </ol>
          </motion.section>
        ) : null}

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-12 flex flex-wrap gap-3"
        >
          <Link href="/solutions" className="btn-glass text-sm">
            All industries
          </Link>
          <Link href="/pricing" className="btn-glass text-sm">
            Compare SaaS plans
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
