import type { Metadata } from 'next';
import Link from 'next/link';
import { FadeIn } from '@/components/motion/FadeIn';
import { DATA_CATEGORIES, DATA_PROCESSORS } from '@/lib/data-processors';
import { getSiteCompany } from '@/lib/site-company';
import { marketingOpenGraph, marketingTwitter } from '@/lib/site-metadata';

const LAST_UPDATED = 'August 2026';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy Policy for Omni Group Tech — how we handle contact and account data.',
  openGraph: marketingOpenGraph('Privacy Policy', 'Privacy Policy for Omni Group Tech — how we handle contact and account data.'),
  twitter: marketingTwitter('Privacy Policy', 'Privacy Policy for Omni Group Tech — how we handle contact and account data.'),
};

export default function PrivacyPage() {
  const company = getSiteCompany();

  return (
    <div className="px-4 py-16">
      <FadeIn className="mx-auto max-w-3xl">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-violet-300">Legal</p>
        <h1 className="mt-2 font-display text-4xl font-bold text-gradient">Privacy Policy</h1>
        <p className="mt-3 text-sm text-slate-500">
          This policy explains how we handle your data and may be updated. Contact us with any questions.
        </p>
        <p className="mt-1 text-xs text-slate-600">Last updated: {LAST_UPDATED}</p>

        <div className="prose prose-invert mt-10 max-w-none space-y-6 text-slate-300">
          <section>
            <h2 className="text-xl font-semibold text-white">1. What we collect</h2>
            <p>The public product collects only the categories below. We do not invent extra data types here.</p>
            <ul className="mt-3 list-disc space-y-1 pl-5">
              {DATA_CATEGORIES.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-white">2. Why we use data</h2>
            <p>
              To respond to inquiries, create accounts, confirm payments, deliver the purchased package, send
              transactional email, secure the platform, and — only when public analytics IDs are set — measure
              marketing performance.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-white">3. Processors</h2>
            <p>
              These are the processors the current Omni Group Tech stack can actually send data to. A row being listed
              does not mean the integration is always on — see the “When” column.
            </p>
            <ul className="mt-3 space-y-3">
              {DATA_PROCESSORS.map((row) => (
                <li key={row.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <p className="font-medium text-white">{row.name}</p>
                  <p className="mt-1 text-sm">{row.purpose}</p>
                  <p className="mt-1 text-xs text-slate-500">Data: {row.data}</p>
                  <p className="mt-1 text-xs text-slate-500">When: {row.when}</p>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-white">4. Retention</h2>
            <p>
              We keep account and invoice records as required for operations and legal obligations, and delete or
              anonymize other data when no longer needed.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-white">5. Your rights</h2>
            <p>
              Depending on your location, you may request access, correction, deletion, or restriction of processing.
              Contact{' '}
              <a href={`mailto:${company.supportEmail}`} className="text-violet-300 hover:text-white">
                {company.supportEmail}
              </a>{' '}
              or use the{' '}
              <Link href="/contact" className="text-violet-300 hover:text-white">
                contact form
              </Link>
              .
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-white">6. Related</h2>
            <p>
              <Link href="/legal/terms" className="text-violet-300 hover:text-white">
                Terms of Service
              </Link>
            </p>
          </section>
        </div>
      </FadeIn>
    </div>
  );
}
