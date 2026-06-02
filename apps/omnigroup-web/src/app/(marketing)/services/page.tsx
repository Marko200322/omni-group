'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { CatalogSection } from '@/components/marketing/CatalogSection';
import { SERVICE_CATEGORIES } from '@/lib/marketing-catalog';

export default function ServicesPage() {
  return (
    <div className="px-4 py-20">
      <div className="mx-auto max-w-6xl">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-violet-300">Usluge</p>
          <h1 className="mt-2 font-display text-4xl font-bold text-gradient md:text-5xl">
            Usluge oko platforme
          </h1>
          <p className="mt-4 text-lg text-slate-400">
            Implementacija, savetovanje, podrška i marketing — ono što naš tim radi za tebe dok ti prodaješ
            proizvode sa strane Proizvodi.
          </p>
        </motion.div>

        <div className="mt-14">
          <CatalogSection categories={SERVICE_CATEGORIES} />
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-16 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-8"
        >
          <div>
            <p className="font-display text-xl font-semibold text-white">Softverski proizvodi</p>
            <p className="mt-1 text-sm text-slate-400">CRM, AI, automatizacije — pregledaj katalog modula.</p>
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
