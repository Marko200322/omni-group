'use client';

import Link from 'next/link';
import { resolveLaunchBundles } from '@/lib/launch-bundles';
import { formatEur } from '@/lib/category-pricing';

export function LaunchBundlesPanel() {
  const bundles = resolveLaunchBundles();
  if (bundles.length === 0) return null;

  return (
    <section className="mt-12 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-300">Launch bundles</p>
      <h2 className="mt-2 font-display text-2xl font-bold text-white">Save when you bundle</h2>
      <p className="mt-2 max-w-2xl text-sm text-slate-400">
        Fixed bundle prices for faster onboarding. Contact us to activate a bundle — same honest delivery scope as
        individual packages.
      </p>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {bundles.map((bundle) => (
          <div
            key={bundle.id}
            className="rounded-xl border border-white/10 bg-[#0a1218]/80 p-4"
          >
            <h3 className="font-semibold text-white">{bundle.title}</h3>
            <p className="mt-1 text-xs text-slate-400">{bundle.description}</p>
            <p className="mt-3 text-2xl font-bold text-emerald-200">{formatEur(bundle.bundleEur)}</p>
            {bundle.savingsEur > 0 ? (
              <p className="text-xs text-slate-500">
                <span className="line-through">{formatEur(bundle.listEur)}</span>
                <span className="ml-2 text-emerald-300/90">save {formatEur(bundle.savingsEur)}</span>
              </p>
            ) : null}
            <ul className="mt-3 space-y-1 text-xs text-slate-500">
              {bundle.deliverableIds.map((id) => (
                <li key={id}>· {id}</li>
              ))}
            </ul>
            <Link
              href={`/contact?topic=${encodeURIComponent(bundle.contactTopic)}`}
              className="mt-4 inline-block text-sm font-medium text-emerald-300 hover:text-emerald-200"
            >
              Request bundle →
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
