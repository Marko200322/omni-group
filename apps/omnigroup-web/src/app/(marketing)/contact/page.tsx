'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { FadeIn } from '@/components/motion/FadeIn';
import { AnimatedInput, AnimatedTextarea } from '@/components/motion/AnimatedInput';
import { fadeUp } from '@/lib/animations';

export default function ContactPage() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle');
  const [errMsg, setErrMsg] = useState('');
  const [okMsg, setOkMsg] = useState('');

  return (
    <div className="px-4 py-16">
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2">
        <FadeIn>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-violet-300">Contact</p>
          <h1 className="mt-2 font-display text-4xl font-bold text-gradient">Let&apos;s talk about your project</h1>
          <p className="mt-4 text-slate-400">
            Reach the Omni Group team — we respond within one business day. Describe your project, timeline, and budget;
            we will send a concrete quote with no obligation.
          </p>
        </FadeIn>
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
              message: String(fd.get('message') || ''),
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
            } catch {
              setStatus('err');
              setErrMsg('network');
            }
          }}
        >
          <AnimatedInput required name="name" placeholder="Full name" delay={0.1} />
          <AnimatedInput required type="email" name="email" placeholder="Email address" delay={0.15} />
          <AnimatedInput name="company" placeholder="Company (optional)" delay={0.2} />
          <AnimatedTextarea required name="message" rows={4} placeholder="How can we help?" delay={0.25} />
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
      </div>
    </div>
  );
}
