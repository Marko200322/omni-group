'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { OfferCard } from '@/components/marketing/OfferCard';
import { LaunchBundlesPanel } from '@/components/marketing/LaunchBundlesPanel';
import { IndustryCategorySelect } from '@/components/marketing/IndustryCategorySelect';
import { getClientOffer, getPublicCatalogStats, listClientOffers } from '@/lib/public-catalog';
import { getGeneratedVerticalsIndex } from '@/lib/generated-verticals';
import { useIndustryPackageMatrix } from '@/hooks/useIndustryPackageMatrix';
import { getIndustryCategory } from '@/lib/category-pricing';

export default function ProductsPage() {
  const [industryCategory, setIndustryCategory] = useState('');
  const { matrix: industryMatrix } = useIndustryPackageMatrix(industryCategory);
  const categoryMeta = industryCategory ? getIndustryCategory(industryCategory) : null;
  const { available, later } = useMemo(() => {
    if (!industryCategory) return { available: [], later: [] };
    return listClientOffers({
      category: industryCategory,
      industryMatrix,
      excludeBundles: true,
    });
  }, [industryCategory, industryMatrix]);
  const generatedCount = getGeneratedVerticalsIndex().count;
  const catalogStats = getPublicCatalogStats();
  const shownCount = available.length + later.length;

  return (
    <div className="px-4 py-20">
      <div className="mx-auto max-w-6xl">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-violet-300">Catalog</p>
          <h1 className="mt-2 font-display text-4xl font-bold text-gradient md:text-5xl">
            What you can buy
          </h1>
          <p className="mt-4 text-lg text-slate-400">
            {catalogStats.sellablePackages} industry packages across {catalogStats.industryGroups} industries
            ({catalogStats.basePackages} capability templates × industry). Filter by industry to browse —
            only packages we can deliver today are marked Ready to buy. Open{' '}
            <strong className="font-medium text-white">Read more</strong> for full detail.
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

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-8 max-w-md space-y-2">
          <IndustryCategorySelect
            value={industryCategory}
            onChange={setIndustryCategory}
            emptyLabel="Select an industry to browse packages"
            label="Filter by industry"
          />
          {categoryMeta && shownCount > 0 && (
            <p className="text-sm text-slate-400">
              Showing {shownCount} packages for <strong className="text-white">{categoryMeta.name}</strong>{' '}
              (of {catalogStats.sellablePackages} sellable industry SKUs).
            </p>
          )}
          {!industryCategory && (
            <p className="text-sm text-amber-200/90">
              Choose an industry above to load packages. The full catalog is{' '}
              {catalogStats.sellablePackages} SKUs — we do not dump them unfiltered.
            </p>
          )}
        </motion.div>

        <LaunchBundlesPanel />

        <section className="mt-14">
          <h2 className="font-display text-2xl font-bold text-white">Ready to buy</h2>
          <p className="mt-1 text-sm text-slate-400">
            Full catalog: {catalogStats.sellablePackages} industry packages ({catalogStats.expertServiceCount}{' '}
            services + {catalogStats.bundleCount} industry bundle SKUs) across{' '}
            {catalogStats.industryGroups} industries — one price book.{' '}
            {catalogStats.readyToBuyCount} SKUs are ready to buy
            {catalogStats.comingSoonCount > 0 ? `; ${catalogStats.comingSoonCount} are coming soon` : ''}.
          </p>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {available.map((offer, i) => (
              <motion.div
                key={offer.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i, 12) * 0.04 }}
              >
                <OfferCard
                  id={`offer-${offer.id}`}
                  offer={
                    getClientOffer(offer.id, {
                      category: industryCategory || undefined,
                      industryRow: industryCategory
                        ? industryMatrix.get(offer.id.split('__')[0] ?? offer.id) ?? null
                        : null,
                    }) ?? offer
                  }
                />
              </motion.div>
            ))}
          </div>
          {industryCategory && available.length === 0 && (
            <p className="mt-6 text-amber-200">
              No packages open right now for this industry.{' '}
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
              Not for sale yet. Contact us for early access — we will enable checkout when the package is ready.
            </p>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {later.map((offer, i) => (
                <motion.div
                  key={offer.id}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: Math.min(i, 12) * 0.03 }}
                >
                  <OfferCard
                    id={`offer-${offer.id}`}
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
