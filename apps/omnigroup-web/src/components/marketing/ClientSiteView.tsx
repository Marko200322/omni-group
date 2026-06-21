'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Globe, ShoppingBag } from 'lucide-react';
import type { ClientPublicSite } from '@/lib/public-site-api';

type Props = {
  site: ClientPublicSite;
};

export function ClientSiteView({ site }: Props) {
  const pages = site.pages ?? [];
  const [activeSlug, setActiveSlug] = useState(pages[0]?.slug ?? 'home');
  const activePage = useMemo(
    () => pages.find((p) => p.slug === activeSlug) ?? pages[0],
    [pages, activeSlug],
  );

  const clientName =
    typeof site.branding?.clientName === 'string' ? site.branding.clientName : site.title;

  return (
    <div className="min-h-[70vh] bg-gradient-to-b from-slate-950 via-slate-950 to-violet-950/20">
      <header className="border-b border-white/10 bg-black/20 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-5">
          <div>
            <p className="text-xs uppercase tracking-widest text-violet-300/80">Client site</p>
            <h1 className="font-display text-2xl font-bold text-white">{site.title}</h1>
            {site.tagline ? <p className="mt-1 text-sm text-slate-400">{site.tagline}</p> : null}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            {site.siteType === 'ecommerce' ? (
              <ShoppingBag className="h-4 w-4 text-violet-300" />
            ) : (
              <Globe className="h-4 w-4 text-violet-300" />
            )}
            {clientName}
          </div>
        </div>
        {pages.length > 1 ? (
          <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 pb-3">
            {pages.map((p) => (
              <button
                key={p.slug}
                type="button"
                onClick={() => setActiveSlug(p.slug)}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm transition ${
                  activeSlug === p.slug
                    ? 'bg-violet-500/20 text-violet-100'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                {p.title}
              </button>
            ))}
          </nav>
        ) : null}
      </header>

      <motion.main
        key={activePage?.slug}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-3xl px-4 py-12"
      >
        {activePage ? (
          <>
            <h2 className="font-display text-3xl font-semibold text-white">{activePage.title}</h2>
            <div className="prose prose-invert mt-6 max-w-none text-slate-300">
              {activePage.body.split('\n').map((line, i) => (
                <p key={`${activePage.slug}-${i}`} className="mb-3 leading-relaxed">
                  {line}
                </p>
              ))}
            </div>
            {activePage.kind === 'shop' ? (
              <div className="mt-8 rounded-xl border border-violet-500/30 bg-violet-500/10 p-6 text-sm text-slate-300">
                Demo catalog — checkout and payments activate after production deploy.
              </div>
            ) : null}
            {activePage.kind === 'contact' ? (
              <Link href="/contact" className="btn-primary mt-8 inline-flex text-sm">
                Contact us
              </Link>
            ) : null}
          </>
        ) : (
          <p className="text-slate-400">Content coming soon.</p>
        )}
      </motion.main>

      <footer className="border-t border-white/5 px-4 py-6 text-center text-xs text-slate-600">
        Powered by Omni Group · multi-tenant public site
      </footer>
    </div>
  );
}
