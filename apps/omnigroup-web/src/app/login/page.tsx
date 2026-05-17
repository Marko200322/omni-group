'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Lock, Mail, AlertCircle } from 'lucide-react';
import { useState, Suspense } from 'react';
import { AnimatedBackground } from '@/components/platform/AnimatedBackground';
import { OmniGroupLogo } from '@/components/brand/OmniGroupLogo';
import { OmniGroupLogoMark } from '@/components/brand/OmniGroupLogoMark';
import { staggerContainer, fadeUp, tapScale } from '@/lib/animations';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get('next');
  const [status, setStatus] = useState<'idle' | 'loading' | 'err'>('idle');
  const [errMsg, setErrMsg] = useState('');

  async function startDemo(variant: 'client' | 'admin') {
    setStatus('loading');
    setErrMsg('');
    try {
      const res = await fetch('/api/auth/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variant }),
      });
      const data = (await res.json()) as { ok?: boolean; redirectTo?: string; error?: string };
      if (!res.ok || !data.ok) {
        setStatus('err');
        setErrMsg(data.error ?? `HTTP ${res.status}`);
        return;
      }
      router.push(data.redirectTo ?? (variant === 'admin' ? '/admin' : '/dashboard'));
      router.refresh();
    } catch {
      setStatus('err');
      setErrMsg('network');
    }
  }

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
          email: String(fd.get('email') || ''),
          password: String(fd.get('password') || ''),
          rememberMe: false,
        };
        try {
          const res = await fetch('/api/auth/login', {
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
            if (data.error === 'atina_unreachable') {
              setErrMsg('Atina API nije dostupan — pokreni backend ili koristi demo prijavu.');
            } else {
              setErrMsg(data.error ?? data.detail ?? `HTTP ${res.status}`);
            }
            return;
          }
          const dest = nextPath && nextPath.startsWith('/') ? nextPath : data.redirectTo ?? '/dashboard';
          router.push(dest);
          router.refresh();
        } catch {
          setStatus('err');
          setErrMsg('network');
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
        Email
        <div className="relative mt-1">
          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            name="email"
            type="email"
            required
            disabled={status === 'loading'}
            placeholder="vi@firma.com"
            className="w-full rounded-xl border border-white/10 bg-black/40 py-3 pl-10 pr-4 text-white outline-none transition-shadow focus:border-violet-500/50 focus:shadow-[0_0_24px_rgba(139,92,246,0.2)]"
          />
        </div>
      </label>
      <label className="block text-sm text-slate-400">
        Lozinka
        <div className="relative mt-1">
          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            name="password"
            type="password"
            required
            disabled={status === 'loading'}
            placeholder="••••••••"
            className="w-full rounded-xl border border-white/10 bg-black/40 py-3 pl-10 pr-4 text-white outline-none transition-shadow focus:border-violet-500/50 focus:shadow-[0_0_24px_rgba(139,92,246,0.2)]"
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
        {status === 'loading' ? 'Prijava…' : 'Prijavi se'}
      </motion.button>
      <p className="text-center text-xs text-slate-500">ili demo bez Atina API-ja</p>
      <div className="grid grid-cols-2 gap-3 pt-1">
        <motion.button
          type="button"
          disabled={status === 'loading'}
          className="btn-glass text-center text-sm disabled:opacity-60"
          whileHover={{ scale: 1.03 }}
          whileTap={tapScale}
          onClick={() => startDemo('client')}
        >
          Klijent demo
        </motion.button>
        <motion.button
          type="button"
          disabled={status === 'loading'}
          className="btn-glass text-center text-sm disabled:opacity-60"
          whileHover={{ scale: 1.03 }}
          whileTap={tapScale}
          onClick={() => startDemo('admin')}
        >
          Admin demo
        </motion.button>
      </div>
    </motion.form>
  );
}

export default function LoginPage() {
  return (
    <motion.div
      className="relative flex min-h-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <AnimatedBackground variant="admin" />
      <div className="relative z-10 flex w-full flex-col lg:flex-row">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="flex flex-1 flex-col justify-center px-6 py-16 lg:px-16"
        >
          <motion.div variants={fadeUp} className="mb-8">
            <OmniGroupLogo href="/" size="sm" />
          </motion.div>
          <motion.div variants={fadeUp}>
            <Link
              href="/"
              className="mb-6 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"
            >
              <motion.span whileHover={{ x: -4 }}>
                <ArrowLeft className="inline h-4 w-4" />
              </motion.span>{' '}
              Nazad na sajt
            </Link>
          </motion.div>
          <motion.div variants={fadeUp}>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-violet-300">Omni Group</p>
            <h1 className="mt-2 font-display text-4xl font-bold text-white md:text-5xl">
              Prijava u <span className="text-gradient animate-gradient-text">workspace</span>
            </h1>
            <p className="mt-4 max-w-md text-slate-400">
              Prava prijava ide preko Atina auth modula (BFF sesija). Demo režim radi bez backend-a.
            </p>
          </motion.div>

          <Suspense fallback={<div className="mt-10 h-64 animate-pulse rounded-2xl bg-white/5" />}>
            <LoginForm />
          </Suspense>
        </motion.div>

        <div className="hidden flex-1 items-center justify-center border-l border-white/[0.06] bg-white/[0.02] p-12 lg:flex">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, rotate: -5 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ delay: 0.25, type: 'spring', stiffness: 200 }}
            className="max-w-sm text-center"
          >
            <motion.div
              className="mx-auto mb-8 flex h-32 w-32 items-center justify-center rounded-full border border-violet-500/30 bg-gradient-to-br from-violet-600/20 to-cyan-500/10 shadow-glow"
              animate={{
                scale: [1, 1.05, 1],
                boxShadow: [
                  '0 0 30px rgba(139,92,246,0.2)',
                  '0 0 50px rgba(34,211,238,0.35)',
                  '0 0 30px rgba(139,92,246,0.2)',
                ],
              }}
              transition={{ duration: 4, repeat: Infinity }}
            >
              <OmniGroupLogoMark size={72} />
            </motion.div>
            <p className="font-display text-2xl font-bold text-gradient">Premium by design</p>
            <p className="mt-4 text-sm text-slate-400">
              Operator konzola, klijentski workspace i marketing sajt — jedan brend Omni Group, moduli Atina ·
              Astra · Titan ispod haube.
            </p>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
