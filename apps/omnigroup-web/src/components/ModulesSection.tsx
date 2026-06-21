'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { MODULES } from '@/lib/brand';

const accent = {
  violet: 'border-violet-500/30 hover:border-violet-500/50',
  cyan: 'border-cyan-500/30 hover:border-cyan-500/50',
  emerald: 'border-emerald-500/30 hover:border-emerald-500/50',
} as const;

export function ModulesSection() {
  return (
    <section className="border-t border-white/[0.06] px-4 py-24">
      <motion.div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-12 text-center"
        >
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-violet-300">Modules</p>
          <h2 className="mt-2 font-display text-3xl font-bold text-white md:text-4xl">
            Three modules, <span className="text-gradient">one brand</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-slate-400">
            Omni Group is the brand. Atina, Astra, and Titan are product modules covering API, automation, and
            operations.
          </p>
        </motion.div>
        <motion.div className="grid gap-6 md:grid-cols-3">
          {MODULES.map((m, i) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              whileHover={{ y: -6 }}
            >
              <Link
                href={m.href}
                className={`glass-strong group flex h-full flex-col border p-8 transition ${accent[m.color]}`}
              >
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-300">{m.name}</p>
                <h3 className="mt-2 font-display text-xl font-semibold text-white">{m.tagline}</h3>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-400">{m.description}</p>
                <span className="mt-6 inline-flex items-center gap-1 text-sm text-violet-300 transition group-hover:text-white">
                  Open module <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </span>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
}
