'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { LogoRing } from '@/components/LogoRing';
import { Sparkles, Server, Bot, Zap } from 'lucide-react';

const stats = [
  { label: 'Years', value: '10+' },
  { label: 'Systems', value: '250+' },
  { label: 'Uptime', value: '99.99%' },
  { label: 'Experts', value: '50+' },
];

export default function HomePage() {
  return (
    <div>
      <section className="relative overflow-hidden px-4 pb-24 pt-16">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(124,58,237,0.15),transparent_50%)]" />
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="grid gap-12 lg:grid-cols-2 lg:items-center"
          >
            <div>
              <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-200">
                <Sparkles className="h-3 w-3" /> AI · Automation · Infrastructure
              </p>
              <h1 className="text-4xl font-extrabold leading-tight tracking-tight md:text-5xl lg:text-6xl">
                We build systems that{' '}
                <span className="text-gradient">dominate the internet</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg text-gray-400">
                Glass-dark UI, serious backends, and automation that survives production traffic.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link href="/contact" className="btn-primary">
                  Start a project
                </Link>
                <Link href="/services" className="btn-glass">
                  View systems
                </Link>
              </div>
              <div className="mt-12 grid grid-cols-2 gap-6 sm:grid-cols-4">
                {stats.map((s) => (
                  <div key={s.label} className="glass px-4 py-3 text-center">
                    <p className="text-2xl font-bold text-white">{s.value}</p>
                    <p className="text-xs uppercase tracking-wider text-gray-500">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
            <LogoRing />
          </motion.div>
        </div>
      </section>

      <section className="border-t border-white/10 px-4 py-20">
        <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
          {[
            { icon: Server, title: 'Web systems', body: 'APIs, dashboards, integrations.' },
            { icon: Bot, title: 'AI infrastructure', body: 'Agents, pipelines, observability.' },
            { icon: Zap, title: 'Automation', body: 'Workflows that replace manual ops.' },
          ].map(({ icon: Icon, title, body }) => (
            <motion.div
              key={title}
              whileHover={{ scale: 1.02 }}
              className="glass p-6 transition hover:border-violet-500/30"
            >
              <Icon className="mb-4 h-8 w-8 text-violet-400" />
              <h3 className="text-lg font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm text-gray-400">{body}</p>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
