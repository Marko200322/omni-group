'use client';

import { motion } from 'framer-motion';

type Status = 'live' | 'partial' | 'unreachable' | 'placeholder' | 'ok' | 'warn' | 'error';

const styles: Record<Status, string> = {
  live: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
  ok: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
  partial: 'border-amber-500/40 bg-amber-500/15 text-amber-300',
  warn: 'border-amber-500/40 bg-amber-500/15 text-amber-300',
  unreachable: 'border-rose-500/40 bg-rose-500/15 text-rose-300',
  error: 'border-rose-500/40 bg-rose-500/15 text-rose-300',
  placeholder: 'border-slate-500/40 bg-slate-500/15 text-slate-300',
};

const labels: Record<Status, string> = {
  live: 'Live',
  ok: 'Healthy',
  partial: 'Partial',
  warn: 'Degraded',
  unreachable: 'Offline',
  error: 'Error',
  placeholder: 'Demo',
};

export function StatusPill({ status }: { status: Status }) {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}
    >
      <motion.span
        className="h-1.5 w-1.5 rounded-full bg-current"
        animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
      {labels[status]}
    </motion.span>
  );
}

