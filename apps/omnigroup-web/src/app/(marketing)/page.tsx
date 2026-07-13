'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { LogoRing } from '@/components/LogoRing';
import { ModulesSection } from '@/components/ModulesSection';
import {
  Sparkles,
  Server,
  Bot,
  Zap,
  Shield,
  LineChart,
  ArrowRight,
  Layers,
  Globe2,
} from 'lucide-react';

const stats = [
  { label: 'Industries online', value: '25+' },
  { label: 'Delivery', value: 'Custom' },
  { label: 'Payment', value: 'EUR / bank' },
  { label: 'Support', value: '24/7 AI' },
];

const logos = ['Omni Group', 'Atina', 'Astra', 'Titan', 'Forge', 'Workflow', 'Analytics'];

export default function HomePage() {
  return (
    <div>
      <section className="relative overflow-hidden px-4 pb-28 pt-20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(124,58,237,0.2),transparent_55%)]" />
        <div className="pointer-events-none absolute inset-0 mesh-grid opacity-40" />
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-6xl"
        >
          <div className="grid gap-14 lg:grid-cols-2 lg:items-center">
            <motion.div
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-xs font-medium text-violet-200">
                <Sparkles className="h-3.5 w-3.5" /> Omni Group · Digital delivery
              </p>
              <h1 className="font-display text-4xl font-extrabold leading-[1.08] tracking-tight md:text-5xl lg:text-6xl">
                Custom software and automation{' '}
                <span className="text-gradient">built for your business</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-400">
                You are not buying a platform — you get a turnkey solution: CRM, AI support, lead gen, and custom
                software, tested before delivery. Transparent pricing and professional support.
              </p>
              <div className="mt-10 flex flex-wrap gap-4">
                <Link href="/pricing" className="btn-primary inline-flex items-center gap-2">
                  Request a quote <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/products" className="btn-glass">
                  Solutions
                </Link>
                <Link href="/contact" className="btn-glass">
                  Book a call
                </Link>
              </div>
              <div className="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {stats.map((s, i) => (
                  <motion.div
                    key={s.label}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.08 }}
                    className="glass-strong px-4 py-4 text-center"
                  >
                    <p className="font-display text-2xl font-bold text-white">{s.value}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-wider text-slate-500">{s.label}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="relative flex justify-center"
            >
              <LogoRing />
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1 text-xs text-cyan-200">
                Atina · Astra · Titan
              </div>
            </motion.div>
          </div>
        </motion.div>
      </section>

      <section className="overflow-hidden border-y border-white/[0.06] bg-white/[0.02] py-6">
        <motion.div
          animate={{ x: [0, -600] }}
          transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
          className="flex gap-12 whitespace-nowrap text-sm font-medium uppercase tracking-[0.25em] text-slate-600"
        >
          {[...logos, ...logos, ...logos].map((name, i) => (
            <span key={i} className="text-slate-500">
              {name}
            </span>
          ))}
        </motion.div>
      </section>

      <section className="px-4 py-24">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mb-12 text-center"
          >
            <h2 className="font-display text-3xl font-bold text-white md:text-4xl">
              Three pillars of <span className="text-gradient">one platform</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-slate-400">
              Marketing site, client portal, and professional delivery — one brand, built around your business.
            </p>
          </motion.div>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                icon: Server,
                title: 'Web & API',
                body: 'Next.js front end, Express/Nest backend, TypeORM, integrations.',
                href: '/services',
              },
              {
                icon: Bot,
                title: 'Client workspace',
                body: 'Dashboard, projects, automations, and billing — live when the API is available.',
                href: '/dashboard',
              },
              {
                icon: Zap,
                title: 'Support & delivery',
                body: 'Track orders, documents, billing, and live support from your client portal.',
                href: '/login',
              },
            ].map(({ icon: Icon, title, body, href }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -6 }}
              >
                <Link
                  href={href}
                  className="glass-strong group block h-full p-8 transition hover:border-violet-500/30 hover:shadow-glow"
                >
                  <Icon className="mb-5 h-9 w-9 text-violet-400 transition group-hover:scale-110" />
                  <h3 className="font-display text-xl font-semibold text-white">{title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-400">{body}</p>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <ModulesSection />

      <section className="border-t border-white/[0.06] px-4 py-24">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
          <div>
            <h2 className="font-display text-3xl font-bold text-white">
              Everything you need in <span className="text-gradient-client">one client portal</span>
            </h2>
            <ul className="mt-8 space-y-4">
              {[
                { icon: Layers, text: 'Projects, orders, and delivery status in real time.' },
                { icon: Shield, text: 'Secure sign-in — billing, documents, and support behind your account.' },
                { icon: LineChart, text: 'Transparent pricing and industry-specific packages.' },
                { icon: Globe2, text: 'Video consultations, AI support, and professional onboarding.' },
              ].map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-start gap-3 text-slate-300">
                  <span className="mt-0.5 rounded-lg bg-white/5 p-2">
                    <Icon className="h-4 w-4 text-cyan-400" />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link href="/login" className="btn-primary">
                Client portal
              </Link>
              <Link href="/pricing" className="btn-glass">
                View pricing
              </Link>
            </div>
          </div>
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="glass-strong relative overflow-hidden p-8"
          >
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-violet-600/20 blur-3xl" />
            <p className="relative text-sm text-slate-400">Delivery process</p>
            <ol className="relative mt-6 space-y-6">
              {['Discovery & architecture', 'Implementation + test gates', 'Staging mirror & CEO checklist'].map(
                (step, i) => (
                  <li key={step} className="flex gap-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-cyan-500 font-display text-sm font-bold">
                      {i + 1}
                    </span>
                    <div>
                      <p className="font-medium text-white">{step}</p>
                      <p className="mt-1 text-xs text-slate-500">Phase {i + 1} · documented in monorepo</p>
                    </div>
                  </li>
                ),
              )}
            </ol>
          </motion.div>
        </div>
      </section>

      <section className="px-4 pb-28">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto max-w-4xl rounded-3xl border border-violet-500/30 bg-gradient-to-br from-violet-600/20 via-transparent to-cyan-500/10 p-10 text-center shadow-glow md:p-14"
        >
          <h2 className="font-display text-3xl font-bold text-white md:text-4xl">
            Ready for the next level?
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-slate-300">
            Book a free intro call or sign in to the client portal — track orders and delivery status in real time.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link href="/contact" className="btn-primary">
              Book a consultation
            </Link>
            <Link href="/login" className="btn-glass">
              Client portal
            </Link>
          </div>
        </motion.div>
      </section>
    </div>
  );
}

