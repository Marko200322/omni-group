import type { Metadata } from 'next';
import Link from 'next/link';
import { resolveAtinaApiBase } from '@/lib/atina-api-base';
import {
  PORTFOLIO_PACKAGE_MATRIX,
  PORTFOLIO_PROOF,
  formatIndustryLabel,
  industryHintFromSite,
} from '@/lib/factory-portfolio';
import { getPublicCatalogStats } from '@/lib/public-catalog';

export const metadata: Metadata = {
  title: 'Factory portfolio — real deliveries',
  description:
    'Live client sites and package×industry delivery proof from the Omni Group Tech factory. Not mockups.',
};

export const dynamic = 'force-dynamic';

type PublicSiteRow = {
  slug: string;
  title: string;
  siteType: string;
  publicUrl: string;
  publishedAt?: string | null;
};

async function fetchLiveSites(limit = 120): Promise<PublicSiteRow[]> {
  const apiBase = resolveAtinaApiBase();
  try {
    const res = await fetch(`${apiBase}/api/v1/public-site/client-sites?limit=${limit}`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      next: { revalidate: 0 },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { data?: { sites?: PublicSiteRow[] } };
    return Array.isArray(json.data?.sites) ? json.data!.sites! : [];
  } catch {
    return [];
  }
}

export default async function PortfolioPage() {
  const sites = await fetchLiveSites(120);
  const stats = getPublicCatalogStats();
  const byIndustry = new Map<string, PublicSiteRow[]>();
  for (const site of sites) {
    const ind = industryHintFromSite(site.slug, site.title);
    const list = byIndustry.get(ind) ?? [];
    list.push(site);
    byIndustry.set(ind, list);
  }
  const industries = Array.from(byIndustry.keys()).sort((a, b) => a.localeCompare(b));

  return (
    <div className="px-4 py-20">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-cyan-300">Proof of delivery</p>
        <h1 className="mt-2 font-display text-4xl font-bold text-white md:text-5xl">
          Factory portfolio
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-slate-400">
          Real work from the Omni Group Tech delivery machine — live hosted sites and completed packages
          across industries. This is what clients receive after payment confirmation, not a brochure mock.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-xs uppercase tracking-wider text-slate-500">Catalog</p>
            <p className="mt-2 font-display text-2xl font-bold text-white">
              {stats.basePackages} × {stats.industryGroups}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              ≈ {stats.sellablePackages.toLocaleString('en-US')} sellable SKUs
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-xs uppercase tracking-wider text-slate-500">Live published sites</p>
            <p className="mt-2 font-display text-2xl font-bold text-white">{sites.length}</p>
            <p className="mt-1 text-sm text-slate-400">From public API · refreshed on each visit</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-xs uppercase tracking-wider text-slate-500">Evidence run</p>
            <p className="mt-2 font-display text-2xl font-bold text-white">{PORTFOLIO_PROOF.evidenceRun}</p>
            <p className="mt-1 text-sm text-slate-400">{PORTFOLIO_PROOF.softCompleted}</p>
          </div>
        </div>

        <p className="mt-6 rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-4 py-3 text-sm text-cyan-100/90">
          {PORTFOLIO_PROOF.honesty}
        </p>

        <section className="mt-16">
          <h2 className="font-display text-2xl font-bold text-white">Live sites by industry</h2>
          <p className="mt-2 max-w-2xl text-slate-400">
            Open any card — you land on a real <code className="text-cyan-300">/sites/…</code> delivery published
            by the factory after checkout. Soft start today uses bank transfer; Stripe LIVE is separate.
          </p>

          {sites.length === 0 ? (
            <p className="mt-8 text-amber-200">
              Live site index temporarily unavailable. Catalog proof below still lists delivered package×industry
              examples from the latest factory run.
            </p>
          ) : (
            <div className="mt-8 space-y-10">
              {industries.map((ind) => (
                <div key={ind}>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-violet-300">
                    {formatIndustryLabel(ind)}
                  </h3>
                  <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {(byIndustry.get(ind) ?? []).map((site) => (
                      <li key={site.slug}>
                        <Link
                          href={site.publicUrl?.startsWith('/') ? site.publicUrl : `/sites/${site.slug}`}
                          className="block rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-cyan-400/40 hover:bg-white/[0.05]"
                        >
                          <p className="font-medium text-white">{site.title}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {site.siteType} · /sites/{site.slug.slice(0, 28)}
                            {site.slug.length > 28 ? '…' : ''}
                          </p>
                          <p className="mt-3 text-sm text-cyan-300">Open live site →</p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mt-20">
          <h2 className="font-display text-2xl font-bold text-white">Packages × industries delivered</h2>
          <p className="mt-2 max-w-2xl text-slate-400">
            Every base capability below has completed soft IBAN fulfillments with industry-specific packs and unique
            order references. Filter the catalog on{' '}
            <Link href="/products" className="text-cyan-300 hover:underline">
              Products
            </Link>{' '}
            to buy the same machine.
          </p>
          <div className="mt-8 overflow-x-auto rounded-2xl border border-white/10">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-white/[0.04] text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Package</th>
                  <th className="px-4 py-3 font-medium">Example industries delivered</th>
                  <th className="px-4 py-3 font-medium">Examples</th>
                </tr>
              </thead>
              <tbody>
                {PORTFOLIO_PACKAGE_MATRIX.map((row) => (
                  <tr key={row.id} className="border-t border-white/5">
                    <td className="px-4 py-3 text-white">
                      <Link href={`/products#${row.id}`} className="hover:text-cyan-300">
                        {row.name}
                      </Link>
                      <span className="mt-0.5 block text-xs text-slate-500">{row.id}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {row.industries.map(formatIndustryLabel).join(' · ')}
                    </td>
                    <td className="px-4 py-3 text-slate-400">{row.completedExamples}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="mt-16 flex flex-wrap gap-4">
          <Link href="/pricing" className="btn-primary">
            Compare plans
          </Link>
          <Link href="/products" className="btn-ghost">
            Browse packages
          </Link>
          <Link href="/status" className="btn-ghost">
            System status
          </Link>
        </div>
      </div>
    </div>
  );
}
