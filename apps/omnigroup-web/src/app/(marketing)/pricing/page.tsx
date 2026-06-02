'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Check, Sparkles, Wrench } from 'lucide-react';
import { formatEur, IMPLEMENTATION_ADDONS, MARKETING_PLANS } from '@/lib/marketing-plans';

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
            Jasne cene za srpsko i regionalno tržište
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-slate-400">
            Mesečna pretplata na platformu — iste cene vidiš u dashboardu kad generišeš uputstvo za uplatu.
            Godišnje plaćanje ≈ 2 meseca gratis.
          </p>
        </motion.div>

        <div className="mt-14 grid gap-8 lg:grid-cols-3">
          {MARKETING_PLANS.map((p, i) => (
            <motion.div
              key={p.slug}
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
                  <Sparkles className="h-3 w-3" /> Najčešći izbor
                </span>
              )}
              <p className="text-xs uppercase tracking-wider text-slate-500">{p.tagline}</p>
              <h2 className="mt-1 font-display text-xl font-semibold text-white">{p.name}</h2>
              <p className="mt-4">
                <span className="text-4xl font-bold text-gradient">{formatEur(p.priceMonthly)}</span>
                <span className="text-sm text-slate-500"> / mesec</span>
              </p>
              <p className="mt-1 text-xs text-slate-500">
                ili {formatEur(p.priceYearly)} godišnje
              </p>
              <p className="mt-4 text-sm leading-relaxed text-slate-400">{p.forWho}</p>
              <ul className="mt-6 flex-1 space-y-3 text-sm text-slate-300">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={p.href}
                className={`mt-8 block text-center ${p.highlight ? 'btn-primary' : 'btn-glass'}`}
              >
                {p.cta}
              </Link>
            </motion.div>
          ))}
        </div>

        <motion.section
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-20"
        >
          <div className="mb-8 flex items-center gap-3">
            <Wrench className="h-6 w-6 text-cyan-400" />
            <div>
              <h2 className="font-display text-2xl font-bold text-white">Jednokratna implementacija</h2>
              <p className="text-sm text-slate-400">
                Opciono — ako hoćeš da mi podesimo sve umesto da sam kopaš kroz .env i Docker.
              </p>
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {IMPLEMENTATION_ADDONS.map((addon) => (
              <div
                key={addon.name}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
              >
                <p className="font-display text-lg font-semibold text-white">{addon.name}</p>
                <p className="mt-2 text-2xl font-bold text-gradient">{addon.price}</p>
                <p className="mt-3 text-sm text-slate-400">{addon.desc}</p>
              </div>
            ))}
          </div>
        </motion.section>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-12 flex flex-wrap justify-center gap-4"
        >
          <Link href="/products" className="btn-glass text-sm">
            Pregled proizvoda po kategorijama
          </Link>
          <Link href="/services" className="btn-glass text-sm">
            Usluge i implementacija
          </Link>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-12 text-center text-xs text-slate-500"
        >
          Plaćanje: bankovni transfer (manual) dok ne otvoriš firmu · Kriptoman opciono · Stripe kasnije.
          PDV i faktura po dogovoru kada registruješ preduzeće.
        </motion.p>
      </div>
    </div>
  );
}
