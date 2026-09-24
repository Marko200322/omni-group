'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, Minus } from 'lucide-react';
import {
  formatPlanMoney,
  getSaaSPlanPrice,
  SAAS_PLANS,
  type BillingCurrency,
  type SaaSBillingCycle,
} from '@/lib/saas-plans';
import { trackConversion } from '@/components/marketing/UtmCapture';

function competitorComparison() {
  return [
    {
      label: 'Omni Launch',
      price: `${formatPlanMoney(getSaaSPlanPrice('starter', 'monthly', 'USD'), 'USD')}/mo`,
      note: 'CRM + operations + delivery portal',
    },
    { label: 'HighLevel Starter', price: '$97/mo', note: 'Agency CRM and marketing suite' },
    { label: 'HubSpot Starter', price: 'from $7/seat', note: 'Promotional seat price; usage limits apply' },
    { label: 'Odoo Standard', price: 'from $31.10/user', note: 'All apps; priced per user' },
  ] as const;
}

export function SaaSPlanPricing() {
  const [currency, setCurrency] = useState<BillingCurrency>('USD');
  const [cycle, setCycle] = useState<SaaSBillingCycle>('monthly');

  return (
    <section id="plans" className="mt-12 scroll-mt-24">
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-cyan-300">SaaS plans</p>
          <h2 className="mt-2 font-display text-3xl font-bold text-white">More operations in one subscription</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">
            Start below the closest all-in-one agency platform, with CRM, delivery, billing, documents, and AI support
            in the same workspace. Optional expert services stay separate and transparent.
          </p>
        </div>
        <div className="flex flex-wrap gap-2" aria-label="Pricing options">
          <div className="flex rounded-xl border border-white/10 bg-black/20 p-1">
            {(['USD', 'EUR'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setCurrency(value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  currency === value ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'
                }`}
                aria-pressed={currency === value}
              >
                {value}
              </button>
            ))}
          </div>
          <div className="flex rounded-xl border border-white/10 bg-black/20 p-1">
            {(['monthly', 'yearly'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setCycle(value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition ${
                  cycle === value ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'
                }`}
                aria-pressed={cycle === value}
              >
                {value === 'yearly' ? 'Yearly · 2 months free' : 'Monthly'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        {SAAS_PLANS.map((plan) => {
          const amount = plan[cycle][currency];
          const monthlyEquivalent = cycle === 'yearly' ? amount / 10 : amount;
          return (
            <article
              key={plan.slug}
              className={`relative flex h-full flex-col rounded-2xl border p-6 ${
                plan.highlighted
                  ? 'border-violet-400/50 bg-violet-500/10 shadow-glow'
                  : 'border-white/10 bg-white/[0.03]'
              }`}
            >
              {plan.highlighted ? (
                <span className="absolute right-4 top-4 rounded-full bg-violet-400/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-violet-200">
                  Best value
                </span>
              ) : null}
              <h3 className="font-display text-2xl font-bold text-white">{plan.name}</h3>
              <p className="mt-2 min-h-10 text-sm text-slate-400">{plan.tagline}</p>
              <div className="mt-6">
                <span className="font-display text-4xl font-bold text-white">
                  {formatPlanMoney(monthlyEquivalent, currency)}
                </span>
                <span className="text-sm text-slate-500">/mo</span>
                {cycle === 'yearly' ? (
                  <p className="mt-1 text-xs text-emerald-300">
                    {formatPlanMoney(amount, currency)} billed yearly
                  </p>
                ) : null}
              </div>
              <ul className="mt-6 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2 text-sm text-slate-300">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={`/register?plan=${plan.slug}&cycle=${cycle}&currency=${currency}`}
                onClick={() => trackConversion('begin_checkout')}
                className={plan.highlighted ? 'btn-primary mt-7 text-center' : 'btn-glass mt-7 text-center'}
              >
                Start with {plan.name}
              </Link>
            </article>
          );
        })}
      </div>

      <div className="mt-8 rounded-2xl border border-white/10 bg-black/20 p-5">
        <div className="flex items-start gap-3">
          <Minus className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden />
          <p className="text-xs leading-relaxed text-slate-500">
            Competitor prices are public list prices checked in September 2026 and can change. We compare billing
            models, not feature-for-feature equivalence. Messaging, telephony, external AI, tax, and implementation
            outside the listed scope may cost extra.
          </p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {competitorComparison().map((item) => (
            <div key={item.label} className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
              <p className="text-sm font-medium text-white">{item.label}</p>
              <p className="mt-1 text-sm text-cyan-200">{item.price}</p>
              <p className="mt-1 text-xs text-slate-500">{item.note}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

