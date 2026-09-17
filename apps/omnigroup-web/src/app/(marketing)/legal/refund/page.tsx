import type { Metadata } from 'next';
import Link from 'next/link';
import { FadeIn } from '@/components/motion/FadeIn';
import { getSiteCompany } from '@/lib/site-company';
import { marketingOpenGraph, marketingTwitter } from '@/lib/site-metadata';

const LAST_UPDATED = 'August 2026';

export const metadata: Metadata = {
  title: 'Refund Policy',
  description: 'Refund and cancellation policy for Omni Group Tech digital packages.',
  openGraph: marketingOpenGraph('Refund Policy', 'Refund and cancellation policy for Omni Group Tech.'),
  twitter: marketingTwitter('Refund Policy', 'Refund and cancellation policy for Omni Group Tech.'),
};

export default function RefundPage() {
  const company = getSiteCompany();

  return (
    <div className="px-4 py-16">
      <FadeIn className="mx-auto max-w-3xl">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-violet-300">Legal</p>
        <h1 className="mt-2 font-display text-4xl font-bold text-gradient">Refund Policy</h1>
        <p className="mt-1 text-xs text-slate-600">Last updated: {LAST_UPDATED}</p>

        <div className="prose prose-invert mt-10 max-w-none space-y-6 text-slate-300">
          <section>
            <h2 className="text-xl font-semibold text-white">1. Digital deliverables</h2>
            <p>
              Most {company.brand} packages are digital and begin processing after payment is confirmed (card
              automatically, or bank transfer after we verify funds). Once fulfillment has started, purchases are
              generally non-refundable except as described below.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-white">2. When we will help</h2>
            <p>
              If we cannot deliver the package as described on the pricing or checkout page, contact us within{' '}
              <strong>14 days</strong> of payment confirmation. We will work in good faith toward a revision, partial
              refund, or full refund at our discretion based on what was already delivered.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-white">3. Subscriptions and retainers</h2>
            <p>
              Monthly retainers may be cancelled with written notice before the next billing period. You keep access
              through the end of the paid period. Fees already paid for a started period are not prorated unless we
              agree otherwise in writing.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-white">4. Chargebacks</h2>
            <p>
              Please contact us before opening a chargeback so we can resolve the issue directly. Unresolved chargebacks
              may result in account suspension.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-white">5. How to request</h2>
            <p>
              Email{' '}
              <a href={`mailto:${company.supportEmail}`} className="text-violet-300 hover:text-white">
                {company.supportEmail}
              </a>{' '}
              or use the{' '}
              <Link href="/contact" className="text-violet-300 hover:text-white">
                contact form
              </Link>
              . Include your order/payment reference and a short description of the issue. See also our{' '}
              <Link href="/legal/terms" className="text-violet-300 hover:text-white">
                Terms of Service
              </Link>
              .
            </p>
            <p className="mt-2 text-sm text-slate-500">{company.impressumLine()}</p>
          </section>
        </div>
      </FadeIn>
    </div>
  );
}
