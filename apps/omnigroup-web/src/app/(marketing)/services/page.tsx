'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { OfferCard } from '@/components/marketing/OfferCard';
import { IndustryCategorySelect } from '@/components/marketing/IndustryCategorySelect';
import { getClientOffer, listClientOffers } from '@/lib/client-offers';

export default function ServicesPage() {
  const [industryCategory, setIndustryCategory] = useState('');
  const { available, later } = useMemo(
    () => listClientOffers({ category: industryCategory || undefined }),
    [industryCategory],
  );

  const setupAndConsulting = [...available, ...later].filter((o) =>
    o.category === 'implementation' || o.category === 'consulting' || o.category === 'retainer' || o.category === 'growth',
  );
  const ready = setupAndConsulting.filter((o) => o.availability.checkoutAllowed);
  const next = setupAndConsulting.filter((o) => !o.availability.checkoutAllowed);

  return (
    <div className="px-4 py-20">
      <div className="mx-auto max-w-6xl">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-violet-300">Services</p>
          <h1 className="mt-2 font-display text-4xl font-bold text-gradient md:text-5xl">
            Setup, support, and growth
          </h1>
          <p className="mt-4 text-lg text-slate-400">
            Same packages as Pricing — written so you know what arrives after you pay. Use Read more for the full detail.
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-8 max-w-md">
          <IndustryCategorySelect value={industryCategory} onChange={setIndustryCategory} />
        </motion.div>

        <section className="mt-14">
          <h2 className="font-display text-2xl font-bold text-white">Ready to buy</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {ready.map((offer, i) => (
              <motion.div
                key={offer.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <OfferCard
                  offer={getClientOffer(offer.id, { category: industryCategory || undefined }) ?? offer}
                />
              </motion.div>
            ))}
          </div>
        </section>

        {next.length > 0 && (
          <section className="mt-20">
            <h2 className="font-display text-2xl font-bold text-white">Currently under construction</h2>
            <p className="mt-1 text-sm text-slate-400">
              Not for sale yet. Opens automatically when the system is ready to deliver them.
            </p>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {next.map((offer) => (
                <OfferCard
                  key={offer.id}
                  offer={getClientOffer(offer.id, { category: industryCategory || undefined }) ?? offer}
                  compact
                />
              ))}
            </div>
          </section>
        )}

        <div className="mt-16 flex flex-wrap gap-3">
          <Link href="/pricing" className="btn-primary text-sm">
            See all prices
          </Link>
          <Link href="/contact" className="btn-glass text-sm">
            Ask before buying
          </Link>
        </div>
      </div>
    </div>
  );
}
