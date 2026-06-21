import type { Metadata } from 'next';
import Link from 'next/link';
import { fetchSolutionsList } from '@/lib/public-site-api';
import { getGeneratedVerticalsIndex, listOnlineVerticalSlugs } from '@/lib/generated-verticals';

export const metadata: Metadata = {
  title: 'Vertical solutions | Omni Group',
  description: 'Autonomy-generated industry landings — ready for sales and deploy.',
};

export const dynamic = 'force-dynamic';

export default async function SolutionsPage() {
  const apiList = await fetchSolutionsList({ page: 1, limit: 48 });
  const index = getGeneratedVerticalsIndex();
  const fallbackSlugs = listOnlineVerticalSlugs(48);

  const items =
    apiList?.items ??
    fallbackSlugs.map((slug) => {
      const entry = index.verticals.find((v) => v.slug === slug);
      return {
        slug,
        name: entry?.name ?? slug,
        category: entry?.category ?? 'vertical',
        status: 'deployed',
        valueProp: entry?.valueProp ?? null,
        href: `/solutions/${slug}`,
        updatedAt: entry?.updatedAt ?? '',
      };
    });

  const total = apiList?.meta?.total ?? index.count;

  return (
    <div className="px-4 py-20">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-violet-300">Niche catalog</p>
        <h1 className="mt-2 font-display text-4xl font-bold text-gradient md:text-5xl">
          Vertical solutions online
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-slate-400">
          {total} generated landing pages — each linked to a delivery pack, pricing, and workflow steps.
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
