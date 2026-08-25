import type { Metadata } from 'next';
import Link from 'next/link';
import { FadeIn } from '@/components/motion/FadeIn';
import { getSiteCompany } from '@/lib/site-company';
import { marketingOpenGraph, marketingTwitter } from '@/lib/site-metadata';

const LAST_UPDATED = 'August 2026';

export const metadata: Metadata = {
  title: 'Cookie Policy',
  description: 'Cookie Policy for Omni Group Tech — essential cookies only.',
  openGraph: marketingOpenGraph('Cookie Policy', 'How Omni Group Tech uses cookies.'),
  twitter: marketingTwitter('Cookie Policy', 'How Omni Group Tech uses cookies.'),
};

export default function CookiesPage() {
  const company = getSiteCompany();

  return (
    <div className="px-4 py-16">
      <FadeIn className="mx-auto max-w-3xl">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-violet-300">Legal</p>
        <h1 className="mt-2 font-display text-4xl font-bold text-gradient">Cookie Policy</h1>
        <p className="mt-1 text-xs text-slate-600">Last updated: {LAST_UPDATED}</p>

        <div className="prose prose-invert mt-10 max-w-none space-y-6 text-slate-300">
          <section>
            <h2 className="text-xl font-semibold text-white">1. What we use</h2>
            <p>
              {company.brand} uses <strong>essential cookies</strong> only: session login (`og_session`), CSRF
              protection (`og_csrf`), and cookie consent preference. We do not use advertising or third-party
              tracking cookies on the marketing site at this time.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-white">2. Analytics</h2>
            <p>
              Web analytics (e.g. Plausible or Google Analytics) may be added later with an updated notice. When
              enabled, we will update this page and the cookie banner before collecting analytics data.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-white">3. Your choices</h2>
            <p>
              You can block or delete cookies in your browser. Blocking essential cookies may prevent login and
              checkout from working.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-white">4. Contact</h2>
            <p>
              Questions:{' '}
              <a href={`mailto:${company.supportEmail}`} className="text-violet-300 hover:text-white">
                {company.supportEmail}
              </a>
              . See also our{' '}
              <Link href="/legal/privacy" className="text-violet-300 hover:text-white">
                Privacy Policy
              </Link>
              .
            </p>
            {company.legalName ? (
              <p className="mt-2 text-sm text-slate-500">{company.impressumLine()}</p>
            ) : null}
          </section>
        </div>
      </FadeIn>
    </div>
  );
}
