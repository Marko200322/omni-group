'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Loader2, ShoppingBag } from 'lucide-react';
import type { ClientPublicSite } from '@/lib/public-site-api';
import { csrfFetch } from '@/lib/csrf-fetch';

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

function stripMd(text: string) {
  return text.replace(/\*\*(.+?)\*\*/g, '$1').trim();
}

function renderBody(body: string) {
  const lines = body.replace(/\r\n/g, '\n').split('\n');
  const nodes: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i] ?? '';
    if (!line.trim()) {
      i += 1;
      continue;
    }
    if (line.startsWith('# ')) {
      nodes.push(
        <h2 key={key++} className="font-display text-3xl font-semibold tracking-tight text-slate-50">
          {stripMd(line.slice(2))}
        </h2>,
      );
      i += 1;
      continue;
    }
    if (line.startsWith('## ')) {
      nodes.push(
        <h3 key={key++} className="mt-8 font-display text-xl font-semibold text-teal-100">
          {stripMd(line.slice(3))}
        </h3>,
      );
      i += 1;
      continue;
    }
    if (line.trim().startsWith('- ')) {
      const items: string[] = [];
      while (i < lines.length && (lines[i] ?? '').trim().startsWith('- ')) {
        items.push(stripMd((lines[i] ?? '').trim().slice(2)));
        i += 1;
      }
      nodes.push(
        <ul key={key++} className="mt-4 list-disc space-y-2 pl-5 text-slate-300">
          {items.map((item, j) => (
            <li key={j} className="leading-relaxed">
              {item}
            </li>
          ))}
        </ul>,
      );
      continue;
    }
    const para: string[] = [line];
    i += 1;
    while (i < lines.length) {
      const next = lines[i] ?? '';
      if (!next.trim() || next.startsWith('#') || next.trim().startsWith('- ')) break;
      para.push(next);
      i += 1;
    }
    nodes.push(
      <p key={key++} className="mt-4 leading-relaxed text-slate-300">
        {stripMd(para.join(' '))}
      </p>,
    );
  }

  return nodes;
}

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
      const res = await csrfFetch(`/api/public/sites/${encodeURIComponent(site.slug)}/shop-order`, {
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
      <div className="mt-8 rounded-2xl border border-teal-500/25 bg-teal-500/10 p-6 text-sm text-teal-50">
        <p className="font-semibold text-white">Order received</p>
        <p className="mt-2">
          Reference: <span className="font-mono">{result.paymentReference}</span>
        </p>
        <p className="mt-1">Total: EUR {result.totalEur.toFixed(2)}</p>
        <p className="mt-3 text-slate-300">
          Complete bank transfer with the reference above. The store owner will confirm your order.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {catalog.map((product) => (
          <div key={product.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="font-medium text-white">{product.name}</p>
            <p className="mt-1 text-xs text-slate-400">{product.description}</p>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-lg font-bold text-teal-200">EUR {product.priceEur.toFixed(2)}</span>
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
                  className="rounded-lg border border-teal-500/30 bg-teal-500/10 px-2 py-1 text-sm text-teal-100"
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
        <div className="rounded-2xl border border-teal-500/20 bg-teal-500/5 p-4">
          <p className="text-sm text-slate-300">
            Cart total: <strong className="text-white">EUR {total.toFixed(2)}</strong>
          </p>
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
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-teal-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
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

const PLACEHOLDER_BRAND =
  /^(system\s*admin(istrator)?|administrator|admin|omni(\s*group)?(\s*tech)?|root|test(\s*user)?|e-?commerce demo( storefront)?|digital presence|client)$/i;

function pickBrandName(...candidates: Array<string | null | undefined>) {
  for (const raw of candidates) {
    const trimmed = (raw ?? '').trim();
    if (trimmed && !PLACEHOLDER_BRAND.test(trimmed)) return trimmed;
  }
  return candidates.find((c) => (c ?? '').trim())?.trim() || 'Store';
}

export function ClientSiteView({ site }: Props) {
  const pages = useMemo(() => site.pages ?? [], [site.pages]);
  const [activeSlug, setActiveSlug] = useState(() =>
    site.siteType === 'ecommerce' ? 'shop' : (site.pages?.[0]?.slug ?? 'home'),
  );
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

  const niche =
    typeof site.branding?.niche === 'string' ? site.branding.niche : null;
  const clientName = pickBrandName(
    typeof site.branding?.clientName === 'string' ? site.branding.clientName : null,
    site.title,
    niche ? `${niche} Store` : null,
  );
  const displayTitle = pickBrandName(site.title, clientName, niche ? `${niche} Store` : null);
  const displayTagline =
    site.tagline && !PLACEHOLDER_BRAND.test(site.tagline.split('—')[0]?.trim() ?? '')
      ? site.tagline
      : site.siteType === 'ecommerce'
        ? `${displayTitle} — shop catalog with cart and online orders.`
        : site.tagline;

  // Shop nav/page is always available for ecommerce storefronts.
  const showShop = site.siteType === 'ecommerce';
  const navPages = useMemo(() => {
    if (!showShop) return pages;
    if (pages.some((p) => p.slug === 'shop' || p.kind === 'shop')) return pages;
    return [
      ...pages.slice(0, 1),
      {
        slug: 'shop',
        title: 'Shop',
        kind: 'shop' as const,
        body: 'Browse products and place a checkout request.',
      },
      ...pages.slice(1),
    ];
  }, [pages, showShop]);

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_rgba(15,118,110,0.18),_transparent_55%),linear-gradient(180deg,#071018_0%,#0b1220_45%,#071018_100%)] text-slate-100">
      <header className="border-b border-white/8">
        <div className="mx-auto flex max-w-5xl flex-wrap items-end justify-between gap-6 px-4 pb-6 pt-10">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.22em] text-teal-300/80">
              {niche ?? (site.siteType === 'ecommerce' ? 'Shop' : 'Business')}
            </p>
            <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-white sm:text-5xl">
              {displayTitle}
            </h1>
            {displayTagline ? (
              <p className="mt-3 max-w-xl text-base leading-relaxed text-slate-400">{displayTagline}</p>
            ) : null}
          </div>
          <div className="text-right text-sm text-slate-500">
            <p className="text-slate-300">{clientName}</p>
            {site.siteType === 'ecommerce' ? (
              <p className="mt-1 inline-flex items-center gap-1 text-teal-200/80">
                <ShoppingBag className="h-3.5 w-3.5" /> Online orders
              </p>
            ) : null}
          </div>
        </div>
        {navPages.length > 1 ? (
          <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 pb-4">
            {navPages.map((p) => (
              <button
                key={p.slug}
                type="button"
                onClick={() => setActiveSlug(p.slug)}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm transition ${
                  activeSlug === p.slug
                    ? 'bg-teal-500/20 text-teal-50'
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
        key={activePage?.slug ?? activeSlug}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="mx-auto max-w-3xl px-4 py-12"
      >
        {showShop && (activeSlug === 'shop' || activePage?.kind === 'shop') ? (
          <>
            <h2 className="font-display text-3xl font-semibold text-white">Shop</h2>
            <p className="mt-3 text-sm text-slate-400">
              Catalog for {displayTitle} — add to cart and place an order. Checkout uses bank
              transfer with a payment reference (card when enabled).
            </p>
            {catalog.length > 0 ? (
              <EcommerceCatalog site={site} catalog={catalog} />
            ) : (
              <p className="mt-8 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-50">
                Catalog is being prepared for this storefront. Check back shortly or contact the
                store owner.
              </p>
            )}
          </>
        ) : activePage ? (
          <>
            <div className="space-y-1">{renderBody(activePage.body)}</div>
            {activePage.kind === 'contact' ? (
              <p className="mt-10 rounded-xl border border-teal-500/25 bg-teal-500/10 px-5 py-3 text-sm text-teal-50">
                Use the contact details above to reach {displayTitle} directly — this page is not an Omni Group intake form.
              </p>
            ) : null}
          </>
        ) : (
          <p className="text-slate-400">Content coming soon.</p>
        )}
      </motion.main>

      <footer className="border-t border-white/5 px-4 py-8 text-center text-xs text-slate-600">
        {clientName}
      </footer>
    </div>
  );
}
