'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { staggerContainer, fadeUp } from '@/lib/animations';
import { OmniGroupLogo } from '@/components/brand/OmniGroupLogo';

type FooterProps = {
  impressum?: string;
  supportEmail?: string;
};

export function Footer({ impressum, supportEmail = 'hello@omnigrouptech.com' }: FooterProps) {
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
            Custom digital delivery — websites, audits, setup, and retainers built for your business. Bank transfer
            (IBAN) or card at checkout.
          </p>
          <p className="mt-3 text-sm">
            <a href={`mailto:${supportEmail}`} className="text-violet-300 hover:text-white">
              {supportEmail}
            </a>
          </p>
          {impressum ? <p className="mt-2 text-xs text-slate-500">{impressum}</p> : null}
        </motion.div>
        <motion.div variants={fadeUp} className="grid grid-cols-2 gap-10 text-sm sm:grid-cols-4">
          <motion.div className="flex flex-col gap-2">
            <span className="font-medium text-white">Company</span>
            {[
              { href: '/', label: 'Home' },
              { href: '/products', label: 'Packages' },
              { href: '/solutions', label: 'Industry catalog' },
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
              { href: '/contact', label: 'Start a project' },
            ].map(({ href, label }) => (
              <motion.div key={href} whileHover={{ x: 4 }}>
                <Link href={href} className="text-slate-400 transition hover:text-white">
                  {label}
                </Link>
              </motion.div>
            ))}
          </motion.div>
          <motion.div className="flex flex-col gap-2">
            <span className="font-medium text-white">Legal</span>
            {[
              { href: '/legal/terms', label: 'Terms of Service' },
              { href: '/legal/privacy', label: 'Privacy Policy' },
              { href: '/legal/cookies', label: 'Cookie Policy' },
              { href: '/legal/refund', label: 'Refund Policy' },
              { href: '/legal/impressum', label: 'Impressum' },
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
            <span className="font-medium text-white">Deliverables</span>
            {[
              { href: '/solutions', label: 'Industry catalog' },
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
        © {new Date().getFullYear()} Omni Group Tech ·{' '}
        <Link href="/legal/terms" className="hover:text-slate-400">
          Terms
        </Link>
        {' · '}
        <Link href="/legal/privacy" className="hover:text-slate-400">
          Privacy
        </Link>
        {' · '}
        <Link href="/legal/cookies" className="hover:text-slate-400">
          Cookies
        </Link>
        {' · '}
        <Link href="/legal/refund" className="hover:text-slate-400">
          Refunds
        </Link>
        {' · '}
        <Link href="/legal/impressum" className="hover:text-slate-400">
          Impressum
        </Link>
      </motion.p>
    </motion.footer>
  );
}
