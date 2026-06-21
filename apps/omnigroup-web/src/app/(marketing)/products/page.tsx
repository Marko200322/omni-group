'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Package, Sparkles } from 'lucide-react';
import { CatalogSection } from '@/components/marketing/CatalogSection';
import { IndustryVerticalSelect } from '@/components/marketing/IndustryVerticalSelect';
import { buildDeliverableCatalogCategories } from '@/lib/deliverable-catalog-ui';
import { getGeneratedVerticalsIndex, listOnlineVerticalEntries } from '@/lib/generated-verticals';

export default function ProductsPage() {
  const [industryCategory, setIndustryCategory] = useState('');
  const [verticalSlug, setVerticalSlug] = useState('');
  const categories = useMemo(
    () => buildDeliverableCatalogCategories(industryCategory || null, 'manual', 55, verticalSlug || null),
    [industryCategory, verticalSlug],
  );
  const generatedCount = getGeneratedVerticalsIndex().count;
  const featuredVerticals = listOnlineVerticalEntries(6);

  return (
    <div className="px-4 py-20">
      <div className="mx-auto max-w-6xl">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-violet-300">Solutions</p>
          <h1 className="mt-2 font-display text-4xl font-bold text-gradient md:text-5xl">
            What you get as a client
          </h1>
          <p className="mt-4 text-lg text-slate-400">
            Turnkey packages, setup, retainers, and vertical solutions — including custom software, tested before delivery.
            Pricing is transparent and calculated automatically.
            {generatedCount > 0 ? (
              <span className="mt-2 block text-sm text-violet-200/90">
                {generatedCount} generated online niches —{' '}
                <Link href="/solutions" className="underline underline-offset-2 hover:text-violet-100">
                  browse catalog
                </Link>
                .
              </span>
            ) : null}
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-8 max-w-md">
          <IndustryVerticalSelect
            industryCategory={industryCategory}
            verticalSlug={verticalSlug}
            onChange={({ industryCategory: cat, verticalSlug: vert }) => {
              setIndustryCategory(cat);
              setVerticalSlug(vert);
            }}
          />
        </motion.div>

        {featuredVerticals.length > 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-10">
            <div className="mb-4 flex items-center gap-2 text-violet-200">
              <Sparkles className="h-4 w-4" />
              <p className="text-sm font-medium">Featured vertical solutions</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {featuredVerticals.map((v) => (
                <Link
                  key={v.slug}
                  href={v.href ?? `/solutions/${v.slug}`}
                  className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm transition hover:border-violet-500/30"
                >
                  <p className="font-medium text-white">{v.name ?? v.slug}</p>
                  {v.valueProp ? (
                    <p className="mt-1 line-clamp-2 text-slate-400">{v.valueProp}</p>
                  ) : null}
                </Link>
              ))}
            </div>
          </motion.div>
        ) : null}

        <div className="mt-16">
          <CatalogSection categories={categories} />
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-16 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-violet-500/30 bg-violet-500/10 p-8"
        >
          <div className="flex items-start gap-3">
            <Package className="mt-1 h-6 w-6 text-violet-300" />
            <div>
              <p className="font-display text-xl font-semibold text-white">Need an exact amount?</p>
              <p className="mt-1 text-sm text-slate-400">
                The pricing calculator includes payment API fees and resource consumption.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/pricing" className="btn-glass text-sm">
              Pricing calculator
            </Link>
            <Link href="/login?next=/dashboard%23quote" className="btn-primary text-sm">
              Generate brief
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
