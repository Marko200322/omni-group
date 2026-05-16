'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Check } from 'lucide-react';

const plans = [
  { name: 'Starter', price: '$499', highlight: false, feats: ['Scope workshop', '1 vertical', '30-day support'] },
  { name: 'Pro', price: '$1,499', highlight: true, feats: ['Multi-service', 'Staging + prod', '90-day support'] },
  { name: 'Enterprise', price: 'Custom', highlight: false, feats: ['SLA', 'Dedicated team', 'On-prem option'] },
];

export default function PricingPage() {
  return (
    <div className="px-4 py-16">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-center text-4xl font-bold text-gradient">Pricing</h1>
        <p className="mx-auto mt-4 max-w-xl text-center text-gray-400">
          Indicative packages — final scope ties to Atina / Nest / Python stacks in the monorepo.
        </p>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {plans.map((p) => (
            <motion.div
              key={p.name}
              whileHover={{ y: -4 }}
              className={`glass flex flex-col p-8 ${p.highlight ? 'border-violet-500/50 shadow-lg shadow-violet-500/20' : ''}`}
            >
              <h2 className="text-xl font-semibold text-white">{p.name}</h2>
              <p className="mt-4 text-3xl font-bold text-gradient">{p.price}</p>
              <ul className="mt-6 flex-1 space-y-3 text-sm text-gray-300">
                {p.feats.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <Check className="h-4 w-4 shrink-0 text-violet-400" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/contact" className="btn-primary mt-8 text-center">
                Contact
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
