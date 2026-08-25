import type { Metadata } from 'next';
import Link from 'next/link';
import { fetchSolutionsList, type SolutionListItem } from '@/lib/public-site-api';
import { getGeneratedVerticalsIndex, listOnlineVerticalEntries } from '@/lib/generated-verticals';
import { marketingOpenGraph, marketingTwitter } from '@/lib/site-metadata';

export const metadata: Metadata = {
  title: 'Industries',
  description: 'Industry-specific landing pages with delivery packages, pricing, and scope for your niche.',
  openGraph: marketingOpenGraph(
    'Industries',
    'Industry-specific landing pages with delivery packages, pricing, and scope for your niche.',
  ),
  twitter: marketingTwitter(
    'Industries',
    'Industry-specific landing pages with delivery packages, pricing, and scope for your niche.',
  ),
};

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 48;

function indexItems(): SolutionListItem[] {
  const index = getGeneratedVerticalsIndex();
  return listOnlineVerticalEntries().map((entry) => ({
    slug: entry.slug,
    name: entry.name ?? entry.slug,
    category: entry.category ?? 'vertical',
    status: 'deployed',
    valueProp: entry.valueProp ?? null,
    href: entry.href ?? `/solutions/${entry.slug}`,
    updatedAt: entry.updatedAt ?? index.generatedAt,
  }));
}

export default async function SolutionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1);
  const apiList = await fetchSolutionsList({ page, limit: PAGE_SIZE });
  const fallback = indexItems();
  const apiTotal = apiList?.meta?.total ?? 0;
  const useIndex = !apiList?.items?.length || apiTotal < fallback.length;
  const total = useIndex ? fallback.length : apiTotal;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const items = useIndex
    ? fallback.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
    : apiList!.items;

  return (
    <div className="px-4 py-20">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-violet-300">By industry</p>
        <h1 className="mt-2 font-display text-4xl font-bold text-gradient md:text-5xl">
          Industry catalog
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-slate-400">
          {total} industry landings — each can buy any of the 17 delivery packages. Ready packages with
          fixed scope are on{' '}
          <Link href="/pricing" className="text-violet-300 hover:text-white">
            Pricing
          </Link>
          .
        </p>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <Link
              key={item.slug}
              href={item.href}
              className="group rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-violet-500/40 hover:bg-violet-500/5"
            >
              <p className="text-xs uppercase tracking-wide text-violet-300/80">
                {item.category.replace(/_/g, ' ')}
              </p>
              <h2 className="mt-2 font-display text-lg font-semibold text-white group-hover:text-violet-100">
                {item.name}
              </h2>
              {item.valueProp ? (
                <p className="mt-2 line-clamp-3 text-sm text-slate-400">{item.valueProp}</p>
              ) : (
                <p className="mt-2 text-sm text-slate-500">View the delivery pack and quote for this niche.</p>
              )}
            </Link>
          ))}
        </div>

        {totalPages > 1 ? (
          <nav className="mt-10 flex flex-wrap items-center gap-3 text-sm text-slate-400">
            {safePage > 1 ? (
              <Link href={`/solutions?page=${safePage - 1}`} className="text-violet-300 hover:text-white">
                Previous
              </Link>
            ) : null}
            <span>
              Page {safePage} of {totalPages}
            </span>
            {safePage < totalPages ? (
              <Link href={`/solutions?page=${safePage + 1}`} className="text-violet-300 hover:text-white">
                Next
              </Link>
            ) : null}
          </nav>
        ) : null}

        <div className="mt-12 flex flex-wrap gap-3">
          <Link href="/products" className="btn-glass text-sm">
            Delivery packages
          </Link>
          <Link href="/pricing" className="btn-primary text-sm">
            Pricing calculator
          </Link>
        </div>
      </div>
    </div>
  );
}
