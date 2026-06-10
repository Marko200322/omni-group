'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Package } from 'lucide-react';
import { CatalogSection } from '@/components/marketing/CatalogSection';
import { IndustryVerticalSelect } from '@/components/marketing/IndustryVerticalSelect';
import { buildDeliverableCatalogCategories } from '@/lib/deliverable-catalog-ui';
import { getGeneratedVerticalsIndex } from '@/lib/generated-verticals';

export default function ProductsPage() {
  const [industryCategory, setIndustryCategory] = useState('');
  const [verticalSlug, setVerticalSlug] = useState('');
  const categories = useMemo(
    () => buildDeliverableCatalogCategories(industryCategory || null, 'manual', 55, verticalSlug || null),
    [industryCategory, verticalSlug],
  );
  const generatedCount = getGeneratedVerticalsIndex().count;

  return (
    <div className="px-4 py-20">
      <div className="mx-auto max-w-6xl">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-violet-300">Rešenja</p>
          <h1 className="mt-2 font-display text-4xl font-bold text-gradient md:text-5xl">
            Šta dobijate kao klijent
          </h1>
          <p className="mt-4 text-lg text-slate-400">
            Gotovi paketi, setup, retainer i vertikalna rešenja — uključujući softver po meri, testiran pre isporuke.
            Cene su transparentne i automatski izračunate.
            {generatedCount > 0 ? (
              <span className="mt-2 block text-sm text-violet-200/90">
                {generatedCount} generisanih online niša u katalogu (autonomy sync).
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
              <p className="font-display text-xl font-semibold text-white">Tačan iznos?</p>
              <p className="mt-1 text-sm text-slate-400">
                Kalkulator na cenovniku uključuje proviziju platnog API-ja i potrošnju resursa.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/pricing" className="btn-glass text-sm">
              Kalkulator cena
            </Link>
            <Link href="/login?next=/dashboard%23quote" className="btn-primary text-sm">
              Generiši uputstvo
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
