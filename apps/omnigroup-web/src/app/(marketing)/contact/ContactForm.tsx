'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { AnimatedInput, AnimatedTextarea } from '@/components/motion/AnimatedInput';
import { fadeUp } from '@/lib/animations';
import { getIndustryCategory } from '@/lib/category-pricing';
import { getDeliverable } from '@/lib/deliverable-catalog';
import { deliverableLabel } from '@/lib/display-text';
import { getClientOffer } from '@/lib/public-catalog';
import { LAUNCH_BUNDLE_SPECS } from '@/lib/launch-bundles';
import { trackConversion } from '@/components/marketing/UtmCapture';
import { IndustryCategorySelect } from '@/components/marketing/IndustryCategorySelect';
import { CHECKOUT_SELECT_CLASS } from '@/lib/checkout-select-class';
import {
  CONTACT_BUDGETS,
  CONTACT_MESSAGE_MAX_LEN,
  CONTACT_MESSAGE_MIN_LEN,
  CONTACT_TIMELINES,
} from '@/lib/contact-intake';
import Link from 'next/link';

function topicLabel(topic: string): string {
  const bundle = LAUNCH_BUNDLE_SPECS.find((b) => b.contactTopic === topic);
  if (bundle) return getClientOffer(bundle.id)?.name ?? bundle.id;
  if (topic === 'regulated-founding-partner') return 'Regulated founding partner';
  return topic.replace(/-/g, ' ');
}

function buildDefaultMessage(
  serviceId: string,
  categorySlug: string,
  verticalSlug: string,
  topic: string,
): string {
  const lines: string[] = [];
  const deliverable = serviceId ? getDeliverable(serviceId) : null;
  if (deliverable) {
    lines.push(`I'm interested in: ${deliverableLabel(deliverable)}.`);
  } else if (serviceId) {
    lines.push(`I'm interested in: ${serviceId.replace(/-/g, ' ')}.`);
  }
  if (topic) {
    lines.push(`Topic: ${topicLabel(topic)}.`);
  }
  const categoryMeta = categorySlug ? getIndustryCategory(categorySlug) : null;
  if (categoryMeta) {
    lines.push(`Industry: ${categoryMeta.name}.`);
  }
  if (verticalSlug) {
    lines.push(`Vertical niche: ${verticalSlug.replace(/-/g, ' ')}.`);
  }
  lines.push('', 'Project details:');
  return lines.join('\n');
}

export type ContactFormQuery = {
  service?: string;
  category?: string;
  vertical?: string;
  topic?: string;
};

function normalizeTopic(raw: string): string {
  return /^[a-z0-9_-]{1,64}$/.test(raw) ? raw : '';
}

export function ContactForm({
  service: serviceProp = '',
  category: categoryProp = '',
  vertical: verticalProp = '',
  topic: topicProp = '',
}: ContactFormQuery) {
  const serviceId = serviceProp.trim();
  const categorySlug = categoryProp.trim();
  const verticalSlug = verticalProp.trim();
  const topic = normalizeTopic(topicProp.trim());

  const deliverable = serviceId ? getDeliverable(serviceId) : null;
  const categoryMeta = categorySlug ? getIndustryCategory(categorySlug) : null;

  const defaultMessage = useMemo(
    () => buildDefaultMessage(serviceId, categorySlug, verticalSlug, topic),
    [serviceId, categorySlug, verticalSlug, topic],
  );

  const [message, setMessage] = useState(defaultMessage);
  const [industry, setIndustry] = useState(categorySlug);
  const [budget, setBudget] = useState('');
  const [timeline, setTimeline] = useState('');
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle');
  const [errMsg, setErrMsg] = useState('');
  const [okMsg, setOkMsg] = useState('');

  useEffect(() => {
    setMessage(defaultMessage);
  }, [defaultMessage]);

  useEffect(() => {
    setIndustry(categorySlug);
  }, [categorySlug]);

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
          ...(industry || categorySlug ? { category: industry || categorySlug } : {}),
          ...(verticalSlug ? { vertical: verticalSlug } : {}),
          ...(topic ? { topic } : {}),
          ...(budget ? { budget } : {}),
          ...(timeline ? { timeline } : {}),
          consent,
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
            if (err === 'contact_email_env_incomplete' || err === 'contact_delivery_unconfigured') {
              setErrMsg('email delivery is temporarily unavailable — please email us directly');
            } else if (err === 'email_provider_error' || err === 'email_send_failed') {
              setErrMsg('email delivery failed — please try again shortly');
            } else             if (err === 'consent_required') {
              setErrMsg('please confirm we can contact you about this inquiry');
            } else if (err === 'invalid_email') {
              setErrMsg('please enter a valid email address');
            } else if (err === 'name_and_email_required') {
              setErrMsg('name and email are required');
            } else if (err === 'message_too_short' || err === 'message_required') {
              setErrMsg(`please add a bit more detail (at least ${CONTACT_MESSAGE_MIN_LEN} characters)`);
            } else if (err === 'message_too_long') {
              setErrMsg(`message is too long (max ${CONTACT_MESSAGE_MAX_LEN} characters)`);
            } else if (err === 'budget_invalid' || err === 'timeline_invalid') {
              setErrMsg('please choose a valid budget or timeline option');
            } else {
              setErrMsg('please try again shortly');
            }
            return;
          }
          setStatus('ok');
          trackConversion('generate_lead');
          setOkMsg('Message received. We will get back to you soon.');
          e.currentTarget.reset();
          setMessage(defaultMessage);
          setIndustry(categorySlug);
          setBudget('');
          setTimeline('');
          setConsent(false);
        } catch {
          setStatus('err');
          setErrMsg('Network error. Check your connection and try again.');
        }
      }}
    >
      {(serviceLabel || categoryMeta || verticalSlug || topic) && (
        <p className="rounded-lg border border-violet-500/25 bg-violet-500/10 px-3 py-2 text-sm text-violet-100">
          {serviceLabel && (
            <>
              <span className="text-slate-400">Service:</span> {serviceLabel}
            </>
          )}
          {serviceLabel && (categoryMeta || verticalSlug || topic) && ' · '}
          {topic && (
            <>
              <span className="text-slate-400">Topic:</span> {topicLabel(topic)}
            </>
          )}
          {topic && (categoryMeta || verticalSlug) && ' · '}
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
      <IndustryCategorySelect
        value={industry}
        onChange={setIndustry}
        showTierHint={false}
        className="pt-1"
      />
      <label className="block text-sm">
        <span className="text-slate-400">Budget</span>
        <select
          className={CHECKOUT_SELECT_CLASS}
          name="budget"
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
        >
          <option value="">Select a range (optional)</option>
          {CONTACT_BUDGETS.map((row) => (
            <option key={row.id} value={row.id}>
              {row.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="text-slate-400">Timeline</span>
        <select
          className={CHECKOUT_SELECT_CLASS}
          name="timeline"
          value={timeline}
          onChange={(e) => setTimeline(e.target.value)}
        >
          <option value="">When do you want to start? (optional)</option>
          {CONTACT_TIMELINES.map((row) => (
            <option key={row.id} value={row.id}>
              {row.label}
            </option>
          ))}
        </select>
      </label>
      <AnimatedTextarea
        required
        name="message"
        rows={4}
        minLength={CONTACT_MESSAGE_MIN_LEN}
        maxLength={CONTACT_MESSAGE_MAX_LEN}
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
            {errMsg || 'Unable to send the message right now. Please try again or email us directly.'}
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
      <label className="flex items-start gap-3 text-sm text-slate-400">
        <input
          type="checkbox"
          name="consent"
          required
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-white/20 bg-black/40 text-violet-500 focus:ring-violet-500/40"
        />
        <span>
          I agree to be contacted about this inquiry. See the{' '}
          <Link href="/legal/privacy" className="text-violet-300 underline-offset-2 hover:underline">
            privacy policy
          </Link>
          .
        </span>
      </label>
      <motion.button
        type="submit"
        className="btn-primary w-full"
        disabled={status === 'loading' || !consent}
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.97 }}
      >
        {status === 'loading' ? 'Sending…' : status === 'ok' ? 'Sent ✓' : 'Send message'}
      </motion.button>
    </motion.form>
  );
}
