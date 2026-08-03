import Link from 'next/link';
import { FadeIn } from '@/components/motion/FadeIn';

export const metadata = {
  title: 'Terms of Service | Omni Group Tech',
  description: 'Terms of Service for Omni Group Tech digital delivery services.',
};

export default function TermsPage() {
  return (
    <div className="px-4 py-16">
      <FadeIn className="mx-auto max-w-3xl">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-violet-300">Legal</p>
        <h1 className="mt-2 font-display text-4xl font-bold text-gradient">Terms of Service</h1>
        <p className="mt-3 text-sm text-slate-500">
          Template for launch — replace with counsel-approved text before relying on it as binding legal terms.
        </p>

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
              Until card payments are enabled, payment may be completed by bank transfer (IBAN) using the reference on
              your proforma. Access and automated fulfillment begin after payment confirmation by our team.
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
            <h2 className="text-xl font-semibold text-white">5. Liability</h2>
            <p>
              Services are provided on a best-effort basis. To the maximum extent permitted by law, Omni Group Tech is
              not liable for indirect or consequential damages. Aggregate liability for a purchase is limited to the
              amount paid for that purchase.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-white">6. Contact</h2>
            <p>
              Questions:{' '}
              <Link href="/contact" className="text-violet-300 hover:text-white">
                Contact
              </Link>
              . See also our{' '}
              <Link href="/legal/privacy" className="text-violet-300 hover:text-white">
                Privacy Policy
              </Link>
              .
            </p>
          </section>
        </div>
      </FadeIn>
    </div>
  );
}
