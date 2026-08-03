import { Suspense } from 'react';
import { FadeIn } from '@/components/motion/FadeIn';
import { ContactForm } from './ContactForm';

export default function ContactPage() {
  return (
    <div className="px-4 py-16">
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2">
        <FadeIn>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-violet-300">Contact</p>
          <h1 className="mt-2 font-display text-4xl font-bold text-gradient">Let&apos;s talk about your project</h1>
          <p className="mt-4 text-slate-400">
            Reach the Omni Group Tech team — we respond within one business day. Describe your project, timeline, and budget;
            we will send a concrete quote with no obligation.
          </p>
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
