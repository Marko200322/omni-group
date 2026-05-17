'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Check, Sparkles } from 'lucide-react';

const plans = [
  {
    name: 'Starter',
    price: '€499',
    period: '/ mesec',
    highlight: false,
    feats: ['Workshop & scope', '1 vertikala', '30d podrška', 'Klijentski dashboard'],
  },
  {
    name: 'Pro',
    price: '€1.499',
    period: '/ mesec',
    highlight: true,
    feats: ['Multi-service', 'Staging + prod', '90d podrška', 'Admin monitoring', 'Moduli Atina · Astra · Titan'],
  },
  {
    name: 'Enterprise',
    price: 'Po dogovoru',
    period: '',
    highlight: false,
    feats: ['SLA', 'Dedicated tim', 'On-prem opcija', 'Custom workflow-i', 'CEO evidence paket'],
  },
];

export default function PricingPage() {
  return (
    <div className="px-4 py-20">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-violet-300">Cenovnik</p>
          <h1 className="mt-2 font-display text-4xl font-bold text-gradient md:text-5xl">
            Paketi koji rastu sa vama
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-slate-400">
            Indikativne cene — finalni scope se vezuje za Omni Group modul stack (Atina, Nest, Python) u monorepo-u.
          </p>
        </motion.div>
        <div className="mt-14 grid gap-8 lg:grid-cols-3">
          {plans.map((p, i) => (
            <motion.div
              key={p.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -6 }}
              className={`relative flex flex-col overflow-hidden rounded-2xl border p-8 ${
                p.highlight
                  ? 'border-violet-500/50 bg-gradient-to-b from-violet-600/15 to-transparent shadow-glow'
                  : 'border-white/10 bg-white/[0.03]'
              }`}
            >
              {p.highlight && (
                <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] font-medium uppercase text-violet-200">
                  <Sparkles className="h-3 w-3" /> Popularno
                </span>
              )}
              <h2 className="font-display text-xl font-semibold text-white">{p.name}</h2>
              <p className="mt-4">
                <span className="text-4xl font-bold text-gradient">{p.price}</span>
                <span className="text-sm text-slate-500">{p.period}</span>
              </p>
              <ul className="mt-8 flex-1 space-y-3 text-sm text-slate-300">
                {p.feats.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/contact"
                className={`mt-8 block text-center ${p.highlight ? 'btn-primary' : 'btn-glass'}`}
              >
                Kontakt
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}


