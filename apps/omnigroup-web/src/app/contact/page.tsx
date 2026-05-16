'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';

export default function ContactPage() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle');
  const [errMsg, setErrMsg] = useState('');

  return (
    <div className="px-4 py-16">
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2">
        <div>
          <h1 className="text-4xl font-bold text-gradient">Contact</h1>
          <p className="mt-4 text-gray-400">
            Form posts to <code className="text-violet-300">/api/contact</code> (stub). Add Resend/SMTP in
            that route when ready.
          </p>
        </div>
        <motion.form
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass space-y-4 p-8"
          onSubmit={async (e) => {
            e.preventDefault();
            setStatus('loading');
            setErrMsg('');
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
              const data = (await res.json()) as { ok?: boolean; error?: string };
              if (!res.ok || !data.ok) {
                setStatus('err');
                setErrMsg(data.error || `HTTP ${res.status}`);
                return;
              }
              setStatus('ok');
            } catch {
              setStatus('err');
              setErrMsg('network');
            }
          }}
        >
          <input
            required
            name="name"
            placeholder="Name"
            className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-violet-500/50"
          />
          <input
            required
            type="email"
            name="email"
            placeholder="Email"
            className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-violet-500/50"
          />
          <input
            name="company"
            placeholder="Company"
            className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-violet-500/50"
          />
          <textarea
            required
            name="message"
            rows={4}
            placeholder="Message"
            className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-violet-500/50"
          />
          {status === 'err' && (
            <p className="text-sm text-red-400">Could not send ({errMsg}). Try again.</p>
          )}
          <button type="submit" className="btn-primary w-full" disabled={status === 'loading'}>
            {status === 'loading'
              ? 'Sending…'
              : status === 'ok'
                ? 'Sent — we will wire email next'
                : 'Send'}
          </button>
        </motion.form>
      </div>
    </div>
  );
}
