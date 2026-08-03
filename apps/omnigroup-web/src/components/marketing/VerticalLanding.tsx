'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
import type { SolutionDetail } from '@/lib/public-site-api';
import { formatEur } from '@/lib/category-pricing';
import { DELIVERABLE_CATALOG } from '@/lib/deliverable-catalog';
import { getPackageAvailability, canCheckoutPackage } from '@/lib/package-delivery-spec';
import { buildLoginNextForQuote } from '@/lib/checkout-navigation';

type Props = {
  solution: SolutionDetail;
};

function deliverableDisplayName(id: string, fallback: string) {
  return DELIVERABLE_CATALOG.find((d) => d.id === id)?.name ?? fallback;
}

export function VerticalLanding({ solution }: Props) {
  const pack = solution.deliveryPack;
  const verticalAvailability = getPackageAvailability('vertical-package');
  const verticalReady = canCheckoutPackage('vertical-package');
  const verticalBuyHref = buildLoginNextForQuote({
    service: 'vertical-package',
    category: solution.category,
    vertical: solution.slug,
  });

  return (
    <div className="px-4 py-16">
      <div className="mx-auto max-w-5xl">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-violet-300">
            {solution.category.replace(/_/g, ' ')}
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold text-gradient md:text-5xl">{solution.name}</h1>
          <p className="mt-4 max-w-3xl text-lg text-slate-300">{pack.valueProp}</p>
        </motion.div>

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
            <p className="mt-3 text-3xl font-bold text-white">{formatEur(pack.verticalPackageQuoteEur)}/mo</p>
            <p className="mt-2 text-sm text-slate-400">CRM, automations, and AI support tailored to the niche.</p>
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
                Notify me when ready <ArrowRight className="h-4 w-4" />
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
              {pack.recommendedDeliverables.slice(0, 5).map((d) => {
                const ready = canCheckoutPackage(d.id);
                const availability = getPackageAvailability(d.id);
                return (
                  <li key={d.id} className="flex items-start justify-between gap-3 text-sm">
                    <span className="text-slate-300">
                      {deliverableDisplayName(d.id, d.name ?? d.nameSr ?? d.id)}
                      {!ready && (
                        <span className="mt-0.5 block text-[11px] text-amber-200/90">
                          {availability.badge}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 font-medium text-violet-200">{formatEur(d.clientPriceEur)}</span>
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
                    <p className="mt-1 text-slate-400">
                      {step.moduleSlug} · {step.action}
                    </p>
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
          <Link href="/products" className="btn-glass text-sm">
            All solutions
          </Link>
          <Link href="/pricing" className="btn-glass text-sm">
            Pricing calculator
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
