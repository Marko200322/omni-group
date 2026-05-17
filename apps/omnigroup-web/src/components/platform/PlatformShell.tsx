'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Workflow,
  Settings,
  Bell,
  Search,
  Menu,
  X,
  LogOut,
  ChevronRight,
  FolderKanban,
  Zap,
  LifeBuoy,
  UserCircle,
  Activity,
  Shield,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { AnimatedBackground } from './AnimatedBackground';
import type { LucideIcon } from 'lucide-react';
import { fadeUp, staggerContainer, tapScale } from '@/lib/animations';
import { OmniGroupLogoMark } from '@/components/brand/OmniGroupLogoMark';

export type PlatformVariant = 'admin' | 'client';

type NavItem = { href: string; label: string; icon: LucideIcon };

const adminNav: NavItem[] = [
  { href: '/admin', label: 'Pregled', icon: LayoutDashboard },
  { href: '/admin#workflows', label: 'Workflows', icon: Workflow },
  { href: '/admin#users', label: 'Korisnici', icon: Users },
  { href: '/admin#billing', label: 'Billing', icon: CreditCard },
  { href: '/admin#system', label: 'Sistem', icon: Activity },
  { href: '/admin#settings', label: 'Podešavanja', icon: Settings },
];

const clientNav: NavItem[] = [
  { href: '/dashboard', label: 'Pregled', icon: LayoutDashboard },
  { href: '/dashboard#projects', label: 'Projekti', icon: FolderKanban },
  { href: '/dashboard#automations', label: 'Automacije', icon: Zap },
  { href: '/dashboard#billing', label: 'Plan & naplata', icon: CreditCard },
  { href: '/dashboard#support', label: 'Podrška', icon: LifeBuoy },
  { href: '/dashboard#account', label: 'Nalog', icon: UserCircle },
];

type Props = {
  variant: PlatformVariant;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  sessionUser?: { name: string; email: string } | null;
  isDemo?: boolean;
  children: React.ReactNode;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'OG';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

function useRouteHash(): string {
  const [hash, setHash] = useState('');
  useEffect(() => {
    const sync = () => setHash(window.location.hash);
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);
  return hash;
}

function isNavItemActive(pathname: string, hash: string, href: string): boolean {
  const [path, fragment] = href.split('#');
  if (pathname !== path) return false;
  if (!fragment) return !hash || hash === '#';
  const expected = `#${fragment}`;
  return hash === expected || hash === fragment;
}

export function PlatformShell({
  variant,
  title,
  subtitle,
  badge,
  sessionUser,
  isDemo = false,
  children,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const routeHash = useRouteHash();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const nav = variant === 'admin' ? adminNav : clientNav;
  const accent = variant === 'admin' ? 'text-gradient-admin' : 'text-gradient-client';
  const brand = variant === 'admin' ? 'Omni Group Ops' : 'Omni Group Workspace';
  const avatar = sessionUser ? initials(sessionUser.name) : 'OG';

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <div className="relative flex min-h-screen">
      <AnimatedBackground variant={variant} />

      {/* Sidebar desktop */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-white/[0.06] bg-black/30 backdrop-blur-xl lg:flex">
        <div className="flex h-16 items-center gap-2 border-b border-white/[0.06] px-5">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-xl bg-black/40 shadow-glow ${variant === 'admin' ? 'ring-1 ring-violet-500/40' : 'ring-1 ring-emerald-500/40'}`}
          >
            <OmniGroupLogoMark size={28} />
          </div>
          <div className="min-w-0">
            <p className={`truncate font-display text-sm font-bold ${accent}`}>{brand}</p>
            <p className="truncate text-[10px] uppercase tracking-widest text-slate-500">Omni Group</p>
          </div>
        </div>
        <motion.nav
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="flex-1 space-y-0.5 p-3"
        >
          <LayoutGroup id={`sidebar-${variant}`}>
          {nav.map((item, i) => {
            const active = isNavItemActive(pathname, routeHash, item.href);
            return (
              <motion.div key={item.href} variants={fadeUp} custom={i}>
                <motion.div whileHover={{ x: 4 }} whileTap={tapScale}>
                  <Link
                    href={item.href}
                    className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                      active
                        ? 'bg-white/10 text-white shadow-inner'
                        : 'text-slate-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="sidebar-active"
                        className="absolute inset-0 rounded-xl bg-white/10"
                        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                      />
                    )}
                    <item.icon
                      className={`relative z-10 h-4 w-4 ${active ? 'text-violet-300' : 'group-hover:scale-110 transition-transform'}`}
                    />
                    <span className="relative z-10">{item.label}</span>
                    {active && (
                      <ChevronRight className="relative z-10 ml-auto h-3 w-3 opacity-50" />
                    )}
                  </Link>
                </motion.div>
              </motion.div>
            );
          })}
          </LayoutGroup>
        </motion.nav>
        <div className="border-t border-white/[0.06] p-3 space-y-2">
          <Link href="/" className="btn-ghost flex w-full items-center gap-2 text-slate-400">
            Marketing sajt
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="btn-ghost flex w-full items-center gap-2 text-slate-400"
          >
            <LogOut className="h-4 w-4" /> Odjava
          </button>
          {isDemo && (
            <p className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              Demo sesija — podaci nisu iz Atina auth-a.
            </p>
          )}
          {variant === 'admin' && !isDemo && (
            <div className="mt-2 flex items-center gap-2 rounded-xl border border-violet-500/20 bg-violet-500/10 px-3 py-2 text-xs text-violet-200">
              <Shield className="h-3.5 w-3.5 shrink-0" />
              Admin sesija — zaštiti prod `.env`
            </div>
          )}
        </div>
      </aside>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/70 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 28 }}
              className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-white/10 bg-[#0a0e18] lg:hidden"
            >
              <div className="flex h-14 items-center justify-between px-4">
                <span className={`font-display font-bold ${accent}`}>{brand}</span>
                <button type="button" onClick={() => setSidebarOpen(false)} aria-label="Zatvori">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="flex-1 space-y-1 p-3">
                {nav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-slate-300 hover:bg-white/5"
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                ))}
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-white/[0.06] bg-[#030508]/80 px-4 backdrop-blur-xl md:px-6">
          <button
            type="button"
            className="rounded-lg p-2 text-slate-300 hover:bg-white/5 lg:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Meni"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="hidden flex-1 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 md:flex md:max-w-md">
            <Search className="h-4 w-4 text-slate-500" />
            <input
              type="search"
              placeholder="Pretraga (uskoro)"
              readOnly
              aria-label="Pretraga — uskoro"
              className="w-full cursor-not-allowed bg-transparent text-sm text-slate-500 outline-none placeholder:text-slate-600"
            />
          </div>
          <div className="flex flex-1 items-center justify-end gap-3 lg:flex-none">
            <motion.button
              type="button"
              className="relative rounded-xl p-2 text-slate-400 hover:bg-white/5 hover:text-white"
              aria-label="Obaveštenja"
              whileHover={{ scale: 1.08 }}
              whileTap={tapScale}
            >
              <motion.div
                animate={{ rotate: [0, -10, 10, 0] }}
                transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 6 }}
              >
                <Bell className="h-5 w-5" />
              </motion.div>
              <motion.span
                className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500"
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
              />
            </motion.button>
            <div className="hidden h-8 w-px bg-white/10 sm:block" />
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-white">{sessionUser?.name ?? title}</p>
              {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
            </div>
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 p-[2px]">
              <div className="flex h-full w-full items-center justify-center rounded-full bg-[#0a0e18] text-xs font-bold text-white">
                {avatar}
              </div>
            </div>
          </div>
        </header>

        <main className="platform-scroll flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
          >
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-3">
                <h1 className={`font-display text-3xl font-bold tracking-tight md:text-4xl ${accent}`}>
                  {title}
                </h1>
                {badge}
              </div>
              {subtitle && <p className="max-w-2xl text-slate-400">{subtitle}</p>}
            </div>
          </motion.div>
          {children}
        </main>
      </div>
    </div>
  );
}



