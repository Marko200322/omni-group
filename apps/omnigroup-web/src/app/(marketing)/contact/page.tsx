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
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-violet-300">Kontakt</p>
          <h1 className="mt-2 font-display text-4xl font-bold text-gradient">Razgovarajmo o projektu</h1>
          <p className="mt-4 text-slate-400">
            Javi se Omni Group timu — forma šalje na <code className="text-violet-300">/api/contact</code>.
            U produkciji dodaj Resend/SMTP u rutu.
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
                  setErrMsg('email konfiguracija nije kompletna (FROM/TO)');
                } else if (err === 'email_provider_error' || err === 'email_send_failed') {
                  setErrMsg('Resend nije uspeo — proveri API ključ');
                } else {
                  setErrMsg(err);
                }
                return;
              }
              setStatus('ok');
              setOkMsg(
                data.message === 'sent_via_resend'
                  ? 'Poruka je poslata na email. Javićemo vam se uskoro.'
                  : 'Poruka primljena (dev režim — postavi RESEND_API_KEY za pravi email).',
              );
              e.currentTarget.reset();
            } catch {
              setStatus('err');
              setErrMsg('network');
            }
          }}
        >
          <AnimatedInput required name="name" placeholder="Ime i prezime" delay={0.1} />
          <AnimatedInput required type="email" name="email" placeholder="Email adresa" delay={0.15} />
          <AnimatedInput name="company" placeholder="Kompanija (opciono)" delay={0.2} />
          <AnimatedTextarea required name="message" rows={4} placeholder="Kako možemo da pomognemo?" delay={0.25} />
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
                Slanje nije uspelo ({errMsg}). Pokušaj ponovo.
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
                {okMsg || 'Poruka je poslata. Javićemo vam se uskoro.'}
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
            {status === 'loading' ? 'Šaljem…' : status === 'ok' ? 'Poslato ✓' : 'Pošalji'}
          </motion.button>
        </motion.form>
      </div>
    </div>
  );
}

