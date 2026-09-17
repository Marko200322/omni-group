import type { Metadata } from 'next';
import Link from 'next/link';
import { FadeIn } from '@/components/motion/FadeIn';
import { getSiteCompany } from '@/lib/site-company';
import { marketingOpenGraph, marketingTwitter } from '@/lib/site-metadata';

const LAST_UPDATED = 'August 2026';

export const metadata: Metadata = {
  title: 'Impressum / Company details',
  description: 'Legal company information for Omni Group Tech.',
  openGraph: marketingOpenGraph('Impressum', 'Legal company information for Omni Group Tech.'),
  twitter: marketingTwitter('Impressum', 'Legal company information for Omni Group Tech.'),
};

export default function ImpressumPage() {
  const company = getSiteCompany();
  const hasLegal = Boolean(company.legalName || company.taxId || company.address);

  return (
    <div className="px-4 py-16">
      <FadeIn className="mx-auto max-w-3xl">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-violet-300">Legal</p>
        <h1 className="mt-2 font-display text-4xl font-bold text-gradient">Impressum</h1>
        <p className="mt-1 text-xs text-slate-600">Last updated: {LAST_UPDATED}</p>

        <div className="prose prose-invert mt-10 max-w-none space-y-6 text-slate-300">
          <section>
            <h2 className="text-xl font-semibold text-white">Operator</h2>
            <p>
              Brand: <strong>{company.brand}</strong>
              <br />
              Website:{' '}
              <a href={company.siteUrl} className="text-violet-300 hover:text-white">
                {company.siteUrl}
              </a>
              <br />
              Contact:{' '}
              <a href={`mailto:${company.supportEmail}`} className="text-violet-300 hover:text-white">
                {company.supportEmail}
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">Registered company</h2>
            {hasLegal ? (
              <ul className="list-disc space-y-1 pl-5">
                {company.legalName ? (
                  <li>
                    Legal name: <strong>{company.legalName}</strong>
                  </li>
                ) : null}
                {company.taxId ? (
                  <li>
                    Tax ID / EIN / PIB: <strong>{company.taxId}</strong>
                  </li>
                ) : null}
                {company.address ? (
                  <li>
                    Address: <strong>{company.address}</strong>
                  </li>
                ) : null}
              </ul>
            ) : (
              <p>
                Formal company registration details (legal name, tax ID, registered address) will be published here
                after incorporation is complete. Until then, contact{' '}
                <a href={`mailto:${company.supportEmail}`} className="text-violet-300 hover:text-white">
                  {company.supportEmail}
                </a>{' '}
                for any legal or billing questions.
              </p>
            )}
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">Related policies</h2>
            <p className="flex flex-wrap gap-x-3 gap-y-1">
              <Link href="/legal/terms" className="text-violet-300 hover:text-white">
                Terms
              </Link>
              <Link href="/legal/privacy" className="text-violet-300 hover:text-white">
                Privacy
              </Link>
              <Link href="/legal/cookies" className="text-violet-300 hover:text-white">
                Cookies
              </Link>
              <Link href="/legal/refund" className="text-violet-300 hover:text-white">
                Refunds
              </Link>
              <Link href="/contact" className="text-violet-300 hover:text-white">
                Contact
              </Link>
            </p>
          </section>
        </div>
      </FadeIn>
    </div>
  );
}
