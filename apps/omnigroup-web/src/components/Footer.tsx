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
            Digitalna isporuka po meri — CRM, automatizacije, AI podrška i softver za vašu industriju.
            Transparentne cene, profesionalna podrška.
          </p>
        </motion.div>
        <motion.div variants={fadeUp} className="grid grid-cols-2 gap-10 text-sm sm:grid-cols-3">
          <motion.div className="flex flex-col gap-2">
            <span className="font-medium text-white">Kompanija</span>
            {[
              { href: '/', label: 'Početna' },
              { href: '/products', label: 'Rešenja' },
              { href: '/services', label: 'Usluge' },
              { href: '/pricing', label: 'Cenovnik' },
              { href: '/contact', label: 'Kontakt' },
            ].map(({ href, label }) => (
              <motion.div key={href} whileHover={{ x: 4 }}>
                <Link href={href} className="text-slate-400 transition hover:text-white">
                  {label}
                </Link>
              </motion.div>
            ))}
          </motion.div>
          <motion.div className="flex flex-col gap-2">
            <span className="font-medium text-white">Klijentima</span>
            {[
              { href: '/login', label: 'Klijentski portal' },
              { href: '/pricing', label: 'Zatražite ponudu' },
              { href: '/contact', label: 'Zakažite poziv' },
            ].map(({ href, label }) => (
              <motion.div key={href} whileHover={{ x: 4 }}>
                <Link href={href} className="text-slate-400 transition hover:text-white">
                  {label}
                </Link>
              </motion.div>
            ))}
          </motion.div>
          <motion.div className="flex flex-col gap-2">
            <span className="font-medium text-white">Isporuke</span>
            {[
              { href: '/products', label: 'Vertikalna rešenja' },
              { href: '/services', label: 'Setup & onboarding' },
              { href: '/pricing', label: 'Retaineri' },
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
        © {new Date().getFullYear()} Omni Group · Profesionalna digitalna isporuka
      </motion.p>
    </motion.footer>
  );
}
