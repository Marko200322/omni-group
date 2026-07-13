'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AnimatedInput, AnimatedTextarea } from '@/components/motion/AnimatedInput';
import { fadeUp } from '@/lib/animations';
import { getIndustryCategory } from '@/lib/category-pricing';
import { getDeliverable } from '@/lib/deliverable-catalog';
import { deliverableLabel } from '@/lib/display-text';

function buildDefaultMessage(serviceId: string, categorySlug: string, verticalSlug: string): string {
  const lines: string[] = [];
  const deliverable = serviceId ? getDeliverable(serviceId) : null;
  if (deliverable) {
    lines.push(`I'm interested in: ${deliverableLabel(deliverable)}.`);
  } else if (serviceId) {
    lines.push(`I'm interested in: ${serviceId.replace(/-/g, ' ')}.`);
  }
  const categoryMeta = categorySlug ? getIndustryCategory(categorySlug) : null;
  if (categoryMeta) {
    lines.push(`Industry: ${categoryMeta.name}.`);
  }
  if (verticalSlug) {
    lines.push(`Vertical niche: ${verticalSlug.replace(/-/g, ' ')}.`);
  }
  lines.push('', 'Project details / timeline:');
  return lines.join('\n');
}

export function ContactForm() {
  const searchParams = useSearchParams();
  const serviceId = searchParams.get('service') ?? '';
  const categorySlug = searchParams.get('category') ?? '';
  const verticalSlug = searchParams.get('vertical') ?? '';

  const deliverable = serviceId ? getDeliverable(serviceId) : null;
  const categoryMeta = categorySlug ? getIndustryCategory(categorySlug) : null;

  const defaultMessage = useMemo(
    () => buildDefaultMessage(serviceId, categorySlug, verticalSlug),
    [serviceId, categorySlug, verticalSlug],
  );

  const [message, setMessage] = useState(defaultMessage);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle');
  const [errMsg, setErrMsg] = useState('');
  const [okMsg, setOkMsg] = useState('');

  useEffect(() => {
    setMessage(defaultMessage);
  }, [defaultMessage]);

  const serviceLabel = deliverable
    ? deliverableLabel(deliverable)
    : serviceId
      ? serviceId.replace(/-/g, ' ')
      : null;

  return (
    <motion.form
      initial={{ opacity: 0, x: 24 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="glass-strong space-y-4 p-8"
      onSubmit={async (e) => {
        e.preventDefault();
        setStatus('loading');
        setErrMsg('');
        setOkMsg('');
        const fd = new FormData(e.currentTarget);
        const payload = {
          name: String(fd.get('name') || ''),
          email: String(fd.get('email') || ''),
          company: String(fd.get('company') || ''),
          message: String(fd.get('message') || message),
          ...(serviceId ? { service: serviceId } : {}),
          ...(categorySlug ? { category: categorySlug } : {}),
          ...(verticalSlug ? { vertical: verticalSlug } : {}),
        };
        try {
          const res = await fetch('/api/contact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          let data: { ok?: boolean; error?: string; message?: string } = {};
          try {
            const raw = await res.text();
            data = raw ? (JSON.parse(raw) as { ok?: boolean; error?: string; message?: string }) : {};
          } catch {
            setStatus('err');
            setErrMsg('invalid_response');
            return;
          }
          if (!res.ok || !data.ok) {
            setStatus('err');
            const err = data.error || `HTTP ${res.status}`;
            if (err === 'contact_email_env_incomplete') {
              setErrMsg('email configuration incomplete (FROM/TO)');
            } else if (err === 'contact_delivery_unconfigured') {
              setErrMsg('Contact delivery is not configured on the server. Try again later or email us directly.');
            } else if (err === 'email_provider_error' || err === 'email_send_failed') {
              setErrMsg('Resend failed — check your API key');
            } else {
              setErrMsg(err);
            }
            return;
          }
          setStatus('ok');
          setOkMsg(
            data.message === 'sent_via_resend'
              ? 'Message sent by email. We will get back to you soon.'
              : 'Message received (dev mode — set RESEND_API_KEY for live email).',
          );
          e.currentTarget.reset();
          setMessage(defaultMessage);
        } catch {
          setStatus('err');
          setErrMsg('network');
        }
      }}
    >
      {(serviceLabel || categoryMeta || verticalSlug) && (
        <p className="rounded-lg border border-violet-500/25 bg-violet-500/10 px-3 py-2 text-sm text-violet-100">
          {serviceLabel && (
            <>
              <span className="text-slate-400">Service:</span> {serviceLabel}
            </>
          )}
          {serviceLabel && (categoryMeta || verticalSlug) && ' · '}
          {categoryMeta && (
            <>
              <span className="text-slate-400">Industry:</span> {categoryMeta.name}
            </>
          )}
          {categoryMeta && verticalSlug && ' · '}
          {verticalSlug && (
            <>
              <span className="text-slate-400">Vertical:</span> {verticalSlug.replace(/-/g, ' ')}
            </>
          )}
        </p>
      )}
      <AnimatedInput required name="name" placeholder="Full name" delay={0.1} />
      <AnimatedInput required type="email" name="email" placeholder="Email address" delay={0.15} />
      <AnimatedInput name="company" placeholder="Company (optional)" delay={0.2} />
      <AnimatedTextarea
        required
        name="message"
        rows={4}
        placeholder="How can we help?"
        delay={0.25}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      <AnimatePresence mode="wait">
        {status === 'err' && (
          <motion.p
            key="err"
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="text-sm text-red-400"
          >
            Send failed ({errMsg}). Please try again.
          </motion.p>
        )}
        {status === 'ok' && (
          <motion.p
            key="ok"
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="text-sm text-emerald-400"
          >
            {okMsg || 'Message sent. We will get back to you soon.'}
          </motion.p>
        )}
      </AnimatePresence>
      <motion.button
        type="submit"
        className="btn-primary w-full"
        disabled={status === 'loading'}
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.97 }}
      >
        {status === 'loading' ? 'Sending…' : status === 'ok' ? 'Sent ✓' : 'Send message'}
      </motion.button>
    </motion.form>
  );
}
