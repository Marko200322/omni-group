'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import type { CatalogCategory } from '@/lib/marketing-catalog';

function badgeClasses(variant?: 'available' | 'upcoming' | 'contact'): string {
  switch (variant) {
    case 'available':
      return 'bg-emerald-500/20 text-emerald-200';
    case 'upcoming':
      return 'bg-amber-500/20 text-amber-200';
    case 'contact':
      return 'bg-slate-500/25 text-slate-300';
    default:
      return 'bg-violet-500/20 text-violet-200';
  }
}

function cardBorderClasses(variant?: 'available' | 'upcoming' | 'contact'): string {
  switch (variant) {
    case 'available':
      return 'border-emerald-500/25 hover:border-emerald-500/40';
    case 'upcoming':
      return 'border-amber-500/20 hover:border-amber-500/35';
    case 'contact':
      return 'border-white/10 hover:border-white/20 opacity-95';
    default:
      return 'border-white/10 hover:border-violet-500/30';
  }
}

type Props = {
  categories: CatalogCategory[];
  showIncluded?: boolean;
};

export function CatalogSection({ categories, showIncluded = false }: Props) {
  return (
    <div className="space-y-16">
      {categories.map((cat, ci) => (
        <motion.section
          key={cat.id}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: ci * 0.05 }}
        >
          <div className="mb-6 flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-violet-500/30 bg-violet-500/10">
              <cat.icon className="h-6 w-6 text-violet-300" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold text-white">{cat.title}</h2>
              <p className="mt-1 text-sm text-slate-400">{cat.subtitle}</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2">
            {cat.items.map((item, ii) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: ii * 0.04 }}
                whileHover={{ y: -4 }}
              >
                <Link
                  href={item.href}
                  className={`glass-strong group flex h-full flex-col border p-6 transition ${cardBorderClasses(item.badgeVariant)}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-display text-lg font-semibold text-white">{item.name}</h3>
                    {item.badge && (
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${badgeClasses(item.badgeVariant)}`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-400">{item.description}</p>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-emerald-300">{item.priceLabel}</span>
                    {showIncluded && item.includedIn && item.includedIn.length > 0 && (
                      <span className="text-[10px] uppercase tracking-wider text-slate-500">
                        Plan: {item.includedIn.join(' · ')}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 text-xs text-violet-300 opacity-0 transition group-hover:opacity-100">
                      Details <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.section>
      ))}
    </div>
  );
}
