'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { staggerContainer, fadeUp } from '@/lib/animations';
import { OmniGroupLogo } from '@/components/brand/OmniGroupLogo';

export function Footer() {
  return (
    <motion.footer
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="relative border-t border-white/[0.06] bg-black/50 py-14"
    >
      <motion.div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/30 to-transparent"
        animate={{ opacity: [0.2, 0.7, 0.2] }}
        transition={{ duration: 4, repeat: Infinity }}
      />
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        className="mx-auto flex max-w-6xl flex-col gap-10 px-4 md:flex-row md:justify-between"
      >
        <motion.div variants={fadeUp}>
          <OmniGroupLogo href="/" size="sm" />
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-400">
            Custom digital delivery — CRM, automations, AI support, and software built for your industry.
            Transparent pricing, professional support.
          </p>
        </motion.div>
        <motion.div variants={fadeUp} className="grid grid-cols-2 gap-10 text-sm sm:grid-cols-3">
          <motion.div className="flex flex-col gap-2">
            <span className="font-medium text-white">Company</span>
            {[
              { href: '/', label: 'Home' },
              { href: '/products', label: 'Solutions' },
              { href: '/services', label: 'Services' },
              { href: '/pricing', label: 'Pricing' },
              { href: '/contact', label: 'Contact' },
            ].map(({ href, label }) => (
              <motion.div key={href} whileHover={{ x: 4 }}>
                <Link href={href} className="text-slate-400 transition hover:text-white">
                  {label}
                </Link>
              </motion.div>
            ))}
          </motion.div>
          <motion.div className="flex flex-col gap-2">
            <span className="font-medium text-white">For clients</span>
            {[
              { href: '/login', label: 'Client portal' },
              { href: '/pricing', label: 'Request a quote' },
              { href: '/contact', label: 'Schedule a call' },
            ].map(({ href, label }) => (
              <motion.div key={href} whileHover={{ x: 4 }}>
                <Link href={href} className="text-slate-400 transition hover:text-white">
                  {label}
                </Link>
              </motion.div>
            ))}
          </motion.div>
          <motion.div className="flex flex-col gap-2">
            <span className="font-medium text-white">Deliverables</span>
            {[
              { href: '/products', label: 'Vertical solutions' },
              { href: '/services', label: 'Setup & onboarding' },
              { href: '/pricing', label: 'Retainers' },
            ].map(({ href, label }) => (
              <motion.div key={href} whileHover={{ x: 4 }}>
                <Link href={href} className="text-slate-400 transition hover:text-white">
                  {label}
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </motion.div>
      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="mt-10 text-center text-xs text-slate-600"
      >
        © {new Date().getFullYear()} Omni Group · Professional digital delivery
      </motion.p>
    </motion.footer>
  );
}
