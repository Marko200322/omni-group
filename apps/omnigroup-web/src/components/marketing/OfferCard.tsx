'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronDown, X } from 'lucide-react';
import type { ClientOffer } from '@/lib/client-offers';

function badgeClass(tone: ClientOffer['availability']['badgeTone']): string {
  switch (tone) {
    case 'available':
      return 'bg-emerald-500/20 text-emerald-200';
    case 'upcoming':
      return 'bg-amber-500/20 text-amber-200';
    default:
      return 'bg-slate-500/25 text-slate-300';
  }
}

function borderClass(tone: ClientOffer['availability']['badgeTone']): string {
  switch (tone) {
    case 'available':
      return 'border-emerald-500/30';
    case 'upcoming':
      return 'border-amber-500/20';
    default:
      return 'border-white/10';
  }
}

type Props = {
  offer: ClientOffer;
  /** Highlight / scroll target id */
  id?: string;
  /** Prefer pricing page quote price when provided */
  priceOverrideEur?: number;
  compact?: boolean;
};

export function OfferCard({ offer, id, priceOverrideEur, compact }: Props) {
  const [open, setOpen] = useState(false);
  const ready = offer.availability.checkoutAllowed;
  const priceSuffix =
    offer.billing === 'monthly' ? '/ mo' : offer.billing === 'yearly' ? '/ yr' : ' once';

  return (
    <motion.article
      layout
      id={id ?? `offer-${offer.id}`}
      className={`flex h-full flex-col rounded-2xl border bg-white/[0.03] p-6 ${borderClass(offer.availability.badgeTone)}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-xs uppercase tracking-wider text-violet-300/80">{offer.categoryLabel}</p>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${badgeClass(offer.availability.badgeTone)}`}>
          {offer.availability.badge}
        </span>
      </div>

      <h3 className="mt-2 font-display text-xl font-semibold text-white">{offer.name}</h3>
      <p className="mt-1 text-sm font-medium text-emerald-200/90">{offer.promise}</p>
      <p className="mt-3 text-sm leading-relaxed text-slate-400">{offer.summary}</p>
      {!ready && (
        <p className="mt-3 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          Currently under construction. This package is not for sale yet — contact us if you want early access and we
          will notify you when checkout opens.
        </p>
      )}

      {!compact && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">You get</p>
          <ul className="space-y-1.5">
            {offer.youGet.map((line) => (
              <li key={line} className="flex gap-2 text-sm text-slate-300">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-4 text-xs text-slate-500">{offer.when}</p>

      <p className="mt-4">
        <span className="text-3xl font-bold text-gradient">
          {priceOverrideEur != null ? `€${priceOverrideEur.toLocaleString('en-US')}` : `€${offer.priceEur.toLocaleString('en-US')}`}
        </span>
        <span className="text-sm text-slate-500">{priceSuffix}</span>
      </p>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mt-3 inline-flex items-center gap-1 text-left text-sm text-violet-300 underline-offset-2 hover:underline"
        aria-expanded={open}
      >
        {open ? 'Show less' : 'Read more'}
        <ChevronDown className={`h-4 w-4 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-3 rounded-xl border border-white/5 bg-black/25 p-4 text-sm text-slate-400">
              <p className="leading-relaxed">{offer.readMore}</p>
              {offer.notIncluded.length > 0 && (
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-amber-200/80">Not included</p>
                  <ul className="space-y-1">
                    {offer.notIncluded.map((line) => (
                      <li key={line} className="flex gap-2 text-slate-500">
                        <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400/80" />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-auto flex flex-col gap-2 pt-5">
        {ready ? (
          <Link href={offer.buyHref} className="btn-primary block text-center text-sm">
            Buy now
          </Link>
        ) : (
          <Link href={offer.contactHref} className="btn-glass block text-center text-sm">
            Notify me when ready
          </Link>
        )}
        {ready && (
          <Link href={offer.contactHref} className="btn-glass block text-center text-sm">
            Ask a question
          </Link>
        )}
      </div>
    </motion.article>
  );
}
