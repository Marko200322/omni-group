'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Lock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Suspense, useState } from 'react';
import { AnimatedBackground } from '@/components/platform/AnimatedBackground';
import { OmniGroupLogo } from '@/components/brand/OmniGroupLogo';
import { fadeUp, tapScale } from '@/lib/animations';

function friendlyResetError(code: string | undefined): string {
  switch (code) {
    case 'atina_unreachable':
      return 'Our service is temporarily unavailable. Please try again in a moment.';
    case 'invalid_or_expired_token':
      return 'This reset link is invalid or has expired. Request a new one.';
    case 'password_too_short':
      return 'Password must be at least 8 characters.';
    case 'token_and_password_required':
      return 'Please choose a new password.';
    case 'rate_limited':
      return 'Too many attempts. Please wait a few minutes and try again.';
    case 'network':
      return 'Network error. Check your connection and try again.';
    default:
      return 'Unable to update your password right now. Please try again.';
  }
}

function ResetForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle');
  const [errMsg, setErrMsg] = useState('');

  if (!token) {
    return (
      <p className="text-sm text-red-400">
        Missing reset token. Request a new link from{' '}
        <Link href="/forgot-password" className="text-violet-300 underline">
          forgot password
        </Link>
        .
      </p>
    );
  }

  return (
    <motion.form
      variants={fadeUp}
      className="glass-strong mt-10 space-y-4 p-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setStatus('loading');
        setErrMsg('');
        const password = String(new FormData(e.currentTarget).get('password') || '');
        try {
          const res = await fetch('/api/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, password }),
          });
          const data = (await res.json()) as { ok?: boolean; error?: string };
          if (!res.ok || !data.ok) {
            setStatus('err');
            setErrMsg(friendlyResetError(data.error));
            return;
          }
          setStatus('ok');
          setTimeout(() => router.push('/login'), 1500);
        } catch {
          setStatus('err');
          setErrMsg(friendlyResetError('network'));
        }
      }}
    >
      <h1 className="text-xl font-semibold text-white">Choose a new password</h1>
      <label className="block text-sm text-slate-300">
        New password
        <div className="relative mt-1">
          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="input-glass w-full pl-10"
            placeholder="Min 8 characters"
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
          Password updated — redirecting to sign in…
        </p>
      )}
      <motion.button
        type="submit"
        disabled={status === 'loading' || status === 'ok'}
        className="btn-primary w-full disabled:opacity-60"
        whileTap={tapScale}
      >
        {status === 'loading' ? 'Saving…' : 'Update password'}
      </motion.button>
    </motion.form>
  );
}

export default function ResetPasswordPage() {
  return (
    <motion.div className="relative flex min-h-screen" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <AnimatedBackground variant="client" />
      <div className="relative z-10 mx-auto flex w-full max-w-md flex-col justify-center px-6 py-16">
        <Link href="/login" className="mb-6 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Back to sign in
        </Link>
        <OmniGroupLogo href="/" size="sm" />
        <Suspense fallback={<p className="mt-10 text-slate-400">Loading…</p>}>
          <ResetForm />
        </Suspense>
      </div>
    </motion.div>
  );
}
