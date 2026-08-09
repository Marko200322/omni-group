'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Lock, Mail, User, Building2, AlertCircle } from 'lucide-react';
import { Suspense, useState } from 'react';
import { AnimatedBackground } from '@/components/platform/AnimatedBackground';
import { OmniGroupLogo } from '@/components/brand/OmniGroupLogo';
import { staggerContainer, fadeUp, tapScale } from '@/lib/animations';
import { safeInternalPath } from '@/lib/safe-internal-path';

function friendlyRegisterError(code: string | undefined): string {
  switch (code) {
    case 'atina_unreachable':
      return 'Our sign-up service is temporarily unavailable. Please try again in a moment.';
    case 'email_already_registered':
      return 'This email is already registered. Sign in instead.';
    case 'password_requirements':
      return 'Password must include an uppercase letter, a lowercase letter, and a number (min 8 characters).';
    case 'password_too_short':
      return 'Password must be at least 8 characters.';
    case 'name_required':
      return 'Please enter your full name.';
    case 'email_and_password_required':
      return 'Please enter both your email and a password.';
    case 'rate_limited':
      return 'Too many attempts. Please wait a few minutes and try again.';
    case 'server_error':
      return 'Something went wrong on our end. Please try again shortly.';
    case 'network':
      return 'Network error. Check your connection and try again.';
    default:
      return 'Unable to create your account right now. Please try again.';
  }
}

function RegisterBackLink() {
  const searchParams = useSearchParams();
  const nextPath = safeInternalPath(searchParams.get('next'));
  const loginHref = nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : '/login';
  return (
    <Link href={loginHref} className="mb-6 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white">
      <ArrowLeft className="h-4 w-4" />
      Back to sign in
    </Link>
  );
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = safeInternalPath(searchParams.get('next'));
  const loginHref = nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : '/login';
  const [status, setStatus] = useState<'idle' | 'loading' | 'err'>('idle');
  const [errMsg, setErrMsg] = useState('');

  return (
    <motion.form
      variants={fadeUp}
      className="glass-strong mt-10 max-w-md space-y-4 p-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setStatus('loading');
        setErrMsg('');
        const fd = new FormData(e.currentTarget);
        const payload = {
          name: String(fd.get('name') || ''),
          email: String(fd.get('email') || ''),
          password: String(fd.get('password') || ''),
          company: String(fd.get('company') || ''),
        };
        try {
          const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const data = (await res.json()) as {
            ok?: boolean;
            redirectTo?: string;
            error?: string;
            detail?: string;
          };
          if (!res.ok || !data.ok) {
            setStatus('err');
            setErrMsg(friendlyRegisterError(data.error));
            return;
          }
          const dest = nextPath ?? data.redirectTo ?? '/dashboard';
          router.push(dest);
          router.refresh();
        } catch {
          setStatus('err');
          setErrMsg(friendlyRegisterError('network'));
        }
      }}
    >
      {status === 'err' && errMsg && (
        <p className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {errMsg}
        </p>
      )}
      <label className="block text-sm text-slate-400">
        Full name
        <div className="relative mt-1">
          <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            name="name"
            type="text"
            required
            minLength={2}
            disabled={status === 'loading'}
            placeholder="Jane Doe"
            className="w-full rounded-xl border border-white/10 bg-black/40 py-3 pl-10 pr-4 text-white outline-none transition-shadow focus:border-violet-500/50"
          />
        </div>
      </label>
      <label className="block text-sm text-slate-400">
        Email
        <div className="relative mt-1">
          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            name="email"
            type="email"
            required
            disabled={status === 'loading'}
            placeholder="you@company.com"
            className="w-full rounded-xl border border-white/10 bg-black/40 py-3 pl-10 pr-4 text-white outline-none transition-shadow focus:border-violet-500/50"
          />
        </div>
      </label>
      <label className="block text-sm text-slate-400">
        Company (optional)
        <div className="relative mt-1">
          <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            name="company"
            type="text"
            disabled={status === 'loading'}
            placeholder="Your company"
            className="w-full rounded-xl border border-white/10 bg-black/40 py-3 pl-10 pr-4 text-white outline-none transition-shadow focus:border-violet-500/50"
          />
        </div>
      </label>
      <label className="block text-sm text-slate-400">
        Password
        <div className="relative mt-1">
          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            name="password"
            type="password"
            required
            minLength={8}
            disabled={status === 'loading'}
            placeholder="Min 8 chars, upper + lower + number"
            className="w-full rounded-xl border border-white/10 bg-black/40 py-3 pl-10 pr-4 text-white outline-none transition-shadow focus:border-violet-500/50"
          />
        </div>
      </label>
      <motion.button
        type="submit"
        disabled={status === 'loading'}
        className="btn-primary w-full disabled:opacity-60"
        whileHover={{ scale: 1.03, y: -2 }}
        whileTap={tapScale}
      >
        {status === 'loading' ? 'Creating account…' : 'Create account'}
      </motion.button>
      <p className="text-center text-xs text-slate-500">
        Already have an account?{' '}
        <Link href={loginHref} className="text-violet-300 underline-offset-2 hover:underline">
          Sign in
        </Link>
      </p>
    </motion.form>
  );
}

export default function RegisterPage() {
  return (
    <motion.div className="relative flex min-h-screen" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <AnimatedBackground variant="client" />
      <div className="relative z-10 flex w-full flex-col justify-center px-6 py-16 lg:px-16">
        <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="mx-auto w-full max-w-lg">
          <motion.div variants={fadeUp} className="mb-8">
            <OmniGroupLogo href="/" size="sm" />
          </motion.div>
          <motion.div variants={fadeUp}>
            <Suspense fallback={null}>
              <RegisterBackLink />
            </Suspense>
          </motion.div>
          <motion.div variants={fadeUp}>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-violet-300">Omni Group Tech</p>
            <h1 className="mt-2 font-display text-4xl font-bold text-white">Create your account</h1>
            <p className="mt-4 text-slate-400">
              Register for the client portal — track orders, billing, and project delivery in one place.
            </p>
          </motion.div>
          <Suspense fallback={<div className="mt-10 h-64 animate-pulse rounded-2xl bg-white/5" />}>
            <RegisterForm />
          </Suspense>
        </motion.div>
      </div>
    </motion.div>
  );
}
