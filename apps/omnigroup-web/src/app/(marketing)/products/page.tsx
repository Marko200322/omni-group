'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Package } from 'lucide-react';
import { CatalogSection } from '@/components/marketing/CatalogSection';
import { MODULE_STACK, PRODUCT_CATEGORIES } from '@/lib/marketing-catalog';

export default function ProductsPage() {
  return (
    <div className="px-4 py-20">
      <div className="mx-auto max-w-6xl">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-violet-300">Proizvodi</p>
          <h1 className="mt-2 font-display text-4xl font-bold text-gradient md:text-5xl">
            Moduli platforme po kategorijama
          </h1>
          <p className="mt-4 text-lg text-slate-400">
            Svaki proizvod je deo Omni Group stack-a. Većina je uključena u mesečne pakete Poslovni, Rast ili
            Partner — vidi tačne cene na stranici Cene.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="mt-10 flex flex-wrap gap-3"
        >
          {MODULE_STACK.map((m) => (
            <Link
              key={m.name}
              href={m.href}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-slate-300 hover:border-violet-500/30"
            >
              <m.icon className="h-4 w-4 text-violet-400" />
              <span className="font-medium text-white">{m.name}</span>
              <span className="text-slate-500">— {m.role}</span>
            </Link>
          ))}
        </motion.div>

        <div className="mt-16">
          <CatalogSection categories={PRODUCT_CATEGORIES} showIncluded />
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
              <p className="font-display text-xl font-semibold text-white">Spreman da probaš?</p>
              <p className="mt-1 text-sm text-slate-400">
                Prijavi se i generiši uputstvo za uplatu — cene u dashboardu = cene na sajtu.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/pricing" className="btn-glass text-sm">
              Paketi i cene
            </Link>
            <Link href="/login?next=/dashboard%23billing" className="btn-primary text-sm">
              Započni
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
