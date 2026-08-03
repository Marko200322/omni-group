import Link from 'next/link';
import { FadeIn } from '@/components/motion/FadeIn';

export const metadata = {
  title: 'Privacy Policy | Omni Group Tech',
  description: 'Privacy Policy for Omni Group Tech — how we handle contact and account data.',
};

export default function PrivacyPage() {
  return (
    <div className="px-4 py-16">
      <FadeIn className="mx-auto max-w-3xl">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-violet-300">Legal</p>
        <h1 className="mt-2 font-display text-4xl font-bold text-gradient">Privacy Policy</h1>
        <p className="mt-3 text-sm text-slate-500">
          Template for launch — replace with counsel-approved text for your jurisdiction (EU GDPR / local law).
        </p>

        <div className="prose prose-invert mt-10 max-w-none space-y-6 text-slate-300">
          <section>
            <h2 className="text-xl font-semibold text-white">1. What we collect</h2>
            <p>
              Contact form submissions (name, email, message), account registration details, billing references, and
              technical logs needed to operate the site and client portal.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-white">2. Why we use data</h2>
            <p>
              To respond to inquiries, deliver purchased packages, send transactional email (invoices, status), secure
              the platform, and improve service quality.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-white">3. Processors</h2>
            <p>
              We may use infrastructure and email providers (e.g. hosting/VPS, Resend or similar) under their terms.
              Payment processors (Stripe and others) apply when those channels are enabled.
            </p>
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
              Contact us via the{' '}
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
