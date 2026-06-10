'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { CatalogSection } from '@/components/marketing/CatalogSection';
import { IndustryCategorySelect } from '@/components/marketing/IndustryCategorySelect';
import { SERVICE_CATEGORIES, withCatalogPricing } from '@/lib/marketing-catalog';

export default function ServicesPage() {
  const [industryCategory, setIndustryCategory] = useState('');
  const categories = useMemo(
    () => withCatalogPricing(SERVICE_CATEGORIES, industryCategory || null),
    [industryCategory],
  );

  return (
    <div className="px-4 py-20">
      <div className="mx-auto max-w-6xl">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-violet-300">Usluge</p>
          <h1 className="mt-2 font-display text-4xl font-bold text-gradient md:text-5xl">
            Usluge za vaš biznis
          </h1>
          <p className="mt-4 text-lg text-slate-400">
            Implementacija, savetovanje, podrška i marketing — cene prilagođene vašoj industriji i tržištu.
            Izaberite kategoriju da vidite orientacione cene.
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-8 max-w-md">
          <IndustryCategorySelect value={industryCategory} onChange={setIndustryCategory} />
        </motion.div>

        <div className="mt-14">
          <CatalogSection categories={categories} />
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-16 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-8"
        >
          <div>
            <p className="font-display text-xl font-semibold text-white">Paketi i proizvodi</p>
            <p className="mt-1 text-sm text-slate-400">CRM, AI podrška, automatizacije — pregledaj šta nudimo.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/products" className="btn-primary inline-flex items-center gap-2 text-sm">
              Proizvodi <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/pricing" className="btn-glass text-sm">
              Mesečni paketi
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
