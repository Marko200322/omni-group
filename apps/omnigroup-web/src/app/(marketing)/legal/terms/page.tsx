import type { Metadata } from 'next';
import Link from 'next/link';
import { FadeIn } from '@/components/motion/FadeIn';
import { getSiteCompany } from '@/lib/site-company';
import { marketingOpenGraph, marketingTwitter } from '@/lib/site-metadata';

const LAST_UPDATED = 'August 2026';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms of Service for Omni Group Tech digital delivery services.',
  openGraph: marketingOpenGraph('Terms of Service', 'Terms of Service for Omni Group Tech digital delivery services.'),
  twitter: marketingTwitter('Terms of Service', 'Terms of Service for Omni Group Tech digital delivery services.'),
};

export default function TermsPage() {
  const company = getSiteCompany();

  return (
    <div className="px-4 py-16">
      <FadeIn className="mx-auto max-w-3xl">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-violet-300">Legal</p>
        <h1 className="mt-2 font-display text-4xl font-bold text-gradient">Terms of Service</h1>
        <p className="mt-3 text-sm text-slate-500">
          These terms apply to our current services and may be updated. Contact us with any questions.
        </p>
        <p className="mt-1 text-xs text-slate-600">Last updated: {LAST_UPDATED}</p>

        <div className="prose prose-invert mt-10 max-w-none space-y-6 text-slate-300">
          <section>
            <h2 className="text-xl font-semibold text-white">1. Services</h2>
            <p>
              Omni Group Tech provides productized digital services (setup, audits, websites, retainers, and related
              deliverables) sold through omnigrouptech.com. Deliverables are described on the pricing and checkout
              pages at the time of purchase.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-white">2. Orders and payment</h2>
            <p>
              Payment is completed by card (Stripe) when enabled at checkout, or by bank transfer (IBAN) using the
              reference on your proforma. Access and automated fulfillment begin after payment is confirmed (card:
              automatically; bank transfer: after our team verifies funds).
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-white">3. Delivery</h2>
            <p>
              Most packages are fulfilled automatically after confirmation (documents, portal setup, published demo
              sites under our domain, or related artifacts). Custom domains, dedicated VPS, and work outside the package
              scope are not included unless stated.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-white">4. Acceptable use</h2>
            <p>
              You may not use our services for illegal activity, spam, fraud, or to infringe third-party rights. We may
              suspend accounts that violate these terms.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-white">5. Refunds and cancellation</h2>
            <p>
              Digital deliverables begin processing after payment confirmation. If we cannot deliver as described, contact
              us within 14 days for a good-faith resolution (revision or partial refund at our discretion). Subscription
              retainers may be cancelled before the next billing period with written notice.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-white">6. Liability</h2>
            <p>
              Services are provided on a best-effort basis. To the maximum extent permitted by law, Omni Group Tech is
              not liable for indirect or consequential damages. Aggregate liability for a purchase is limited to the
              amount paid for that purchase.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-white">7. Contact</h2>
            <p>
              Questions:{' '}
              <a href={`mailto:${company.supportEmail}`} className="text-violet-300 hover:text-white">
                {company.supportEmail}
              </a>
              {' · '}
              <Link href="/contact" className="text-violet-300 hover:text-white">
                Contact form
              </Link>
              . See also our{' '}
              <Link href="/legal/privacy" className="text-violet-300 hover:text-white">
                Privacy Policy
              </Link>
              .
            </p>
            {company.legalName ? (
              <p className="mt-3 text-sm text-slate-500">{company.impressumLine()}</p>
            ) : (
              <p className="mt-3 text-xs text-slate-600">
                Company registration details will be published here after formal incorporation.
              </p>
            )}
          </section>
        </div>
      </FadeIn>
    </div>
  );
}
