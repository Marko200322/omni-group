'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { OfferCard } from '@/components/marketing/OfferCard';
import { IndustryCategorySelect } from '@/components/marketing/IndustryCategorySelect';
import { getClientOffer, listClientOffers } from '@/lib/client-offers';
import { getGeneratedVerticalsIndex } from '@/lib/generated-verticals';

export default function ProductsPage() {
  const [industryCategory, setIndustryCategory] = useState('');
  const { available, later } = useMemo(
    () => listClientOffers({ category: industryCategory || undefined }),
    [industryCategory],
  );
  const generatedCount = getGeneratedVerticalsIndex().count;

  return (
    <div className="px-4 py-20">
      <div className="mx-auto max-w-6xl">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-violet-300">Catalog</p>
          <h1 className="mt-2 font-display text-4xl font-bold text-gradient md:text-5xl">
            What you can buy
          </h1>
          <p className="mt-4 text-lg text-slate-400">
            Only packages we can deliver today are marked Ready to buy. Open <strong className="font-medium text-white">Read more</strong> for full detail.
            {generatedCount > 0 ? (
              <span className="mt-2 block text-sm text-slate-500">
                Prefer a niche page?{' '}
                <Link href="/solutions" className="text-violet-300 underline-offset-2 hover:underline">
                  Browse {generatedCount} industry landings
                </Link>
                .
              </span>
            ) : null}
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-8 max-w-md">
          <IndustryCategorySelect value={industryCategory} onChange={setIndustryCategory} />
        </motion.div>

        <section className="mt-14">
          <h2 className="font-display text-2xl font-bold text-white">Ready to buy</h2>
          <p className="mt-1 text-sm text-slate-400">Same packages and prices as on Pricing.</p>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {available.map((offer, i) => (
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
          {available.length === 0 && (
            <p className="mt-6 text-amber-200">
              No packages open right now.{' '}
              <Link href="/contact" className="underline underline-offset-2">
                Contact us
              </Link>
              .
            </p>
          )}
        </section>

        {later.length > 0 && (
          <section className="mt-20">
            <h2 className="font-display text-2xl font-bold text-white">Currently under construction</h2>
            <p className="mt-1 text-sm text-slate-400">
              Not for sale yet. Opens automatically at the matching factory phase.
            </p>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {later.map((offer, i) => (
                <motion.div
                  key={offer.id}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.03 }}
                >
                  <OfferCard
                    offer={getClientOffer(offer.id, { category: industryCategory || undefined }) ?? offer}
                    compact
                  />
                </motion.div>
              ))}
            </div>
          </section>
        )}

        <p className="mt-14 text-center">
          <Link href="/pricing" className="btn-primary text-sm">
            Go to pricing
          </Link>
        </p>
      </div>
    </div>
  );
}
