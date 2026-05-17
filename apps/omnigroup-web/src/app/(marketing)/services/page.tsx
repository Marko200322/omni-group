'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Globe, Cpu, Shield, LineChart, Workflow, Database, ArrowRight } from 'lucide-react';

const items = [
  {
    icon: Globe,
    title: 'Web sistemi',
    desc: 'Landing, SaaS shell, API gateway, premium UI sa animacijama.',
    href: '/contact',
  },
  {
    icon: Cpu,
    title: 'Server rešenja',
    desc: 'Docker, workers, queue-ovi, horizontalno skaliranje.',
    href: '/admin#system',
  },
  {
    icon: Shield,
    title: 'Security posture',
    desc: 'Auth, rate limit, audit trail, admin gate-ovi.',
    href: '/admin',
  },
  {
    icon: LineChart,
    title: 'Analytics',
    desc: 'KPI, eventi, operator pregled — Astra modul i live snapshot-i.',
    href: '/dashboard#automations',
  },
  {
    icon: Workflow,
    title: 'Workflow automatizacija',
    desc: 'Chain template-i, execution stats, onboarding pipeline.',
    href: '/admin#workflows',
  },
  {
    icon: Database,
    title: 'Integracije',
    desc: '7 agregatora, Stripe billing, SMTP, backup & recovery.',
    href: '/dashboard#billing',
  },
];

export default function ServicesPage() {
  return (
    <div className="px-4 py-20">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl"
        >
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-violet-300">Usluge</p>
          <h1 className="mt-2 font-display text-4xl font-bold text-gradient md:text-5xl">
            Modularna isporuka
          </h1>
          <p className="mt-4 text-lg text-slate-400">
            Omni Group isporučuje kroz tri modula — Atina (API), Astra (automatizacija), Titan (operacije) —
            plus premium prezentacioni sloj.
          </p>
        </motion.div>
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(({ icon: Icon, title, desc, href }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06, type: 'spring', stiffness: 400, damping: 22 }}
              whileHover={{ y: -8, scale: 1.02 }}
            >
              <Link
                href={href}
                className="glass-strong group block h-full p-7 transition hover:border-cyan-500/25 hover:shadow-glow-cyan"
              >
                <motion.div whileHover={{ rotate: [0, -5, 5, 0] }} transition={{ duration: 0.4 }}>
                  <Icon className="mb-4 h-8 w-8 text-cyan-400" />
                </motion.div>
                <h2 className="font-display text-xl font-semibold text-white">{title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{desc}</p>
              </Link>
            </motion.div>
          ))}
        </div>
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-16 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-8"
        >
          <div>
            <p className="font-display text-xl font-semibold text-white">Vidi platformu uživo</p>
            <p className="mt-1 text-sm text-slate-400">Dashboard i admin konzola su već u repou.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard" className="btn-primary inline-flex items-center gap-2">
              Klijent demo <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/admin" className="btn-glass inline-flex items-center gap-2">
              Admin demo <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/pricing" className="btn-glass inline-flex items-center gap-2">
              Cenovnik <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}


