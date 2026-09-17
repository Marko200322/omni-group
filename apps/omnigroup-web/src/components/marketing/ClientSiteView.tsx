'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Globe, Loader2, ShoppingBag } from 'lucide-react';
import type { ClientPublicSite } from '@/lib/public-site-api';

type CatalogItem = {
  id: string;
  name: string;
  description: string;
  priceEur: number;
  sku?: string;
};

type Props = {
  site: ClientPublicSite;
};

function EcommerceCatalog({ site, catalog }: { site: ClientPublicSite; catalog: CatalogItem[] }) {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    paymentReference: string;
    totalEur: number;
    checkoutUrl?: string;
    paymentMethod?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const items = catalog
    .filter((p) => (cart[p.id] ?? 0) > 0)
    .map((p) => ({ id: p.id, name: p.name, priceEur: p.priceEur, quantity: cart[p.id] }));
  const total = items.reduce((s, i) => s + i.priceEur * i.quantity, 0);

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/public/sites/${encodeURIComponent(site.slug)}/shop-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buyerName, buyerEmail, items }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        data?: {
          paymentReference: string;
          totalEur: number;
          checkoutUrl?: string;
          paymentMethod?: string;
        };
        error?: string;
      };
      if (!res.ok || !json.ok || !json.data) throw new Error(json.error ?? 'checkout_failed');
      if (json.data.checkoutUrl) {
        window.location.href = json.data.checkoutUrl;
        return;
      }
      setResult(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed');
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <div className="mt-8 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-sm text-emerald-100">
        <p className="font-semibold text-white">Order received</p>
        <p className="mt-2">Reference: <span className="font-mono">{result.paymentReference}</span></p>
        <p className="mt-1">Total: €{result.totalEur.toFixed(2)}</p>
        <p className="mt-3 text-slate-300">Complete bank transfer with the reference above. The store owner will confirm your order.</p>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {catalog.map((product) => (
          <div key={product.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <p className="font-medium text-white">{product.name}</p>
            <p className="mt-1 text-xs text-slate-400">{product.description}</p>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-lg font-bold text-violet-200">€{product.priceEur.toFixed(2)}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-white/10 px-2 py-1 text-sm"
                  onClick={() => setCart((c) => ({ ...c, [product.id]: Math.max(0, (c[product.id] ?? 0) - 1) }))}
                >
                  −
                </button>
                <span className="w-6 text-center text-sm">{cart[product.id] ?? 0}</span>
                <button
                  type="button"
                  className="rounded-lg border border-violet-500/30 bg-violet-500/10 px-2 py-1 text-sm text-violet-200"
                  onClick={() => setCart((c) => ({ ...c, [product.id]: (c[product.id] ?? 0) + 1 }))}
                >
                  +
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {items.length > 0 && (
        <div className="rounded-xl border border-violet-500/25 bg-violet-500/5 p-4">
          <p className="text-sm text-slate-300">Cart total: <strong className="text-white">€{total.toFixed(2)}</strong></p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <input
              className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
              placeholder="Your name"
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
            />
            <input
              className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
              placeholder="Email"
              type="email"
              value={buyerEmail}
              onChange={(e) => setBuyerEmail(e.target.value)}
            />
          </div>
          <button
            type="button"
            disabled={loading || !buyerName || !buyerEmail}
            className="btn-primary mt-3 flex items-center gap-2 text-sm disabled:opacity-50"
            onClick={() => void submit()}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingBag className="h-4 w-4" />}
            Place order
          </button>
          {error && <p className="mt-2 text-sm text-rose-300">{error}</p>}
        </div>
      )}
    </div>
  );
}

export function ClientSiteView({ site }: Props) {
  const pages = site.pages ?? [];
  const [activeSlug, setActiveSlug] = useState(pages[0]?.slug ?? 'home');
  const activePage = useMemo(
    () => pages.find((p) => p.slug === activeSlug) ?? pages[0],
    [pages, activeSlug],
  );

  const catalog = useMemo(() => {
    const raw = site.branding?.catalog;
    if (!Array.isArray(raw)) return [] as CatalogItem[];
    return raw.filter(
      (p): p is CatalogItem =>
        Boolean(p) &&
        typeof p === 'object' &&
        typeof (p as CatalogItem).id === 'string' &&
        typeof (p as CatalogItem).name === 'string',
    );
  }, [site.branding]);

  const clientName =
    typeof site.branding?.clientName === 'string' ? site.branding.clientName : site.title;

  const showShop = site.siteType === 'ecommerce' && catalog.length > 0;

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
            {showShop && (activePage?.kind === 'shop' || activeSlug === 'shop') ? (
              <EcommerceCatalog site={site} catalog={catalog} />
            ) : null}
            {activePage.kind === 'contact' ? (
              <Link href={`/contact?service=${encodeURIComponent(site.slug)}`} className="btn-primary mt-8 inline-flex text-sm">
                Send inquiry
              </Link>
            ) : null}
          </>
        ) : (
          <p className="text-slate-400">Content coming soon.</p>
        )}
      </motion.main>

      <footer className="border-t border-white/5 px-4 py-6 text-center text-xs text-slate-600">
        Powered by Omni Group Tech · multi-tenant public site
      </footer>
    </div>
  );
}
