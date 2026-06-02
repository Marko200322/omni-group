'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { staggerContainer, fadeUp, tapScale } from '@/lib/animations';
import { OmniGroupLogo } from '@/components/brand/OmniGroupLogo';

const links = [
  { href: '/', label: 'Početna' },
  { href: '/products', label: 'Proizvodi' },
  { href: '/services', label: 'Usluge' },
  { href: '/pricing', label: 'Cene' },
  { href: '/contact', label: 'Kontakt' },
];

const appLinks = [
  { href: '/dashboard', label: 'Klijent' },
  { href: '/admin', label: 'Admin' },
];

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link href={href} className="relative rounded-lg px-3 py-2 text-sm">
      {active && (
        <motion.span
          layoutId="nav-pill"
          className="absolute inset-0 rounded-lg bg-white/10"
          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        />
      )}
      <motion.span
        className={`relative z-10 ${active ? 'text-white' : 'text-slate-400'}`}
        whileHover={{ y: -1, color: '#fff' }}
      >
        {label}
      </motion.span>
    </Link>
  );
}

export function Navbar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#030508]/75 backdrop-blur-2xl"
    >
      <motion.div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent"
        animate={{ opacity: [0.3, 0.8, 0.3] }}
        transition={{ duration: 3, repeat: Infinity }}
      />
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <OmniGroupLogo href="/" size="sm" />
        <motion.nav
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="hidden items-center gap-1 md:flex"
        >
          <LayoutGroup id="main-nav">
            {links.map((l) => (
              <motion.div key={l.href} variants={fadeUp}>
                <NavLink href={l.href} label={l.label} active={pathname === l.href} />
              </motion.div>
            ))}
          </LayoutGroup>
          <span className="mx-2 h-4 w-px bg-white/10" />
          {appLinks.map((l) => (
            <motion.div key={l.href} variants={fadeUp}>
              <Link
                href={l.href}
                className="rounded-lg px-3 py-2 text-sm text-slate-400 transition hover:text-violet-200"
              >
                <motion.span whileHover={{ y: -1 }}>{l.label}</motion.span>
              </Link>
            </motion.div>
          ))}
        </motion.nav>
        <div className="hidden items-center gap-3 md:flex">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={tapScale}>
            <Link href="/login" className="btn-ghost text-sm">
              Prijava
            </Link>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={tapScale}>
            <Link href="/contact" className="btn-primary text-sm">
              Započni projekat
            </Link>
          </motion.div>
        </div>
        <motion.button
          type="button"
          className="rounded-lg p-2 text-white md:hidden"
          aria-label="Meni"
          onClick={() => setOpen(!open)}
          whileTap={tapScale}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={open ? 'close' : 'open'}
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
            >
              {open ? <X /> : <Menu />}
            </motion.div>
          </AnimatePresence>
        </motion.button>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden border-t border-white/10 md:hidden"
          >
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="px-4 py-4"
            >
              {[...links, ...appLinks].map((l) => (
                <motion.div key={l.href} variants={fadeUp}>
                  <Link
                    href={l.href}
                    className="block py-2.5 text-slate-200"
                    onClick={() => setOpen(false)}
                  >
                    {l.label}
                  </Link>
                </motion.div>
              ))}
              <motion.div variants={fadeUp} className="mt-3 grid gap-2">
                <Link href="/login" className="btn-glass block text-center" onClick={() => setOpen(false)}>
                  Prijava
                </Link>
                <Link href="/contact" className="btn-primary block text-center" onClick={() => setOpen(false)}>
                  Započni projekat
                </Link>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}

