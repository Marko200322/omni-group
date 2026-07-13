'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, Mail, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { AnimatedBackground } from '@/components/platform/AnimatedBackground';
import { OmniGroupLogo } from '@/components/brand/OmniGroupLogo';
import { fadeUp, tapScale } from '@/lib/animations';

export default function ForgotPasswordPage() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle');
  const [errMsg, setErrMsg] = useState('');
  const [devToken, setDevToken] = useState('');

  return (
    <motion.div className="relative flex min-h-screen" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <AnimatedBackground variant="client" />
      <div className="relative z-10 mx-auto flex w-full max-w-md flex-col justify-center px-6 py-16">
        <Link href="/login" className="mb-6 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Back to sign in
        </Link>
        <OmniGroupLogo href="/" size="sm" />
        <motion.form
          variants={fadeUp}
          className="glass-strong mt-10 space-y-4 p-6"
          onSubmit={async (e) => {
            e.preventDefault();
            setStatus('loading');
            setErrMsg('');
            setDevToken('');
            const email = String(new FormData(e.currentTarget).get('email') || '');
            try {
              const res = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
              });
              const data = (await res.json()) as { ok?: boolean; error?: string; message?: string; devToken?: string };
              if (!res.ok || !data.ok) {
                setStatus('err');
                setErrMsg(data.error ?? `HTTP ${res.status}`);
                return;
              }
              setStatus('ok');
              if (data.devToken) setDevToken(data.devToken);
            } catch {
              setStatus('err');
              setErrMsg('network');
            }
          }}
        >
          <h1 className="text-xl font-semibold text-white">Reset password</h1>
          <p className="text-sm text-slate-400">Enter your email and we will send a reset link.</p>
          <label className="block text-sm text-slate-300">
            Email
            <div className="relative mt-1">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                className="input-glass w-full pl-10"
                placeholder="you@company.com"
              />
            </div>
          </label>
          {status === 'err' && (
            <p className="flex items-center gap-2 text-sm text-red-400">
              <AlertCircle className="h-4 w-4" />
              {errMsg}
            </p>
          )}
          {status === 'ok' && (
            <p className="flex items-center gap-2 text-sm text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              If this email exists, a reset link was sent.
            </p>
          )}
          {devToken && (
            <p className="break-all rounded bg-slate-900/60 p-2 text-xs text-amber-300">
              Dev token:{' '}
              <Link href={`/reset-password?token=${encodeURIComponent(devToken)}`} className="underline">
                reset link
              </Link>
            </p>
          )}
          <motion.button
            type="submit"
            disabled={status === 'loading' || status === 'ok'}
            className="btn-primary w-full disabled:opacity-60"
            whileTap={tapScale}
          >
            {status === 'loading' ? 'Sending…' : 'Send reset link'}
          </motion.button>
        </motion.form>
      </div>
    </motion.div>
  );
}
