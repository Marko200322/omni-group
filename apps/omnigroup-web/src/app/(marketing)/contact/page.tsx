import { Suspense } from 'react';
import { FadeIn } from '@/components/motion/FadeIn';
import { ContactForm } from './ContactForm';
import { getSiteCompany } from '@/lib/site-company';

export default function ContactPage() {
  const company = getSiteCompany();

  return (
    <div className="px-4 py-16">
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2">
        <FadeIn>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-violet-300">Contact</p>
          <h1 className="mt-2 font-display text-4xl font-bold text-gradient">Start your project</h1>
          <p className="mt-4 text-slate-400">
            Describe your scope, timeline, and budget. We aim to reply within one business day with a concrete quote.
          </p>
          <p className="mt-6 text-sm text-slate-400">
            Prefer email?{' '}
            <a href={`mailto:${company.supportEmail}`} className="text-violet-300 hover:text-white">
              {company.supportEmail}
            </a>
          </p>
          {company.legalName ? (
            <p className="mt-2 text-xs text-slate-500">{company.impressumLine()}</p>
          ) : null}
        </FadeIn>
        <Suspense
          fallback={
            <div className="glass-strong p-8 text-sm text-slate-500">Loading form…</div>
          }
        >
          <ContactForm />
        </Suspense>
      </div>
    </div>
  );
}
