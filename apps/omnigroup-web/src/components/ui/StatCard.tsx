'use client';

import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { iconPop } from '@/lib/animations';

type Props = {
  label: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
  trend?: { value: string; positive: boolean };
  delay?: number;
  accent?: 'violet' | 'cyan' | 'emerald' | 'rose';
};

const accentMap = {
  violet: 'from-violet-500/20 to-violet-500/5 text-violet-300',
  cyan: 'from-cyan-500/20 to-cyan-500/5 text-cyan-300',
  emerald: 'from-emerald-500/20 to-emerald-500/5 text-emerald-300',
  rose: 'from-rose-500/20 to-rose-500/5 text-rose-300',
};

export function StatCard({ label, value, sub, icon: Icon, trend, delay = 0, accent = 'violet' }: Props) {
  return (
    <GlassCard delay={delay} className="relative overflow-hidden">
      <motion.div
        className={`absolute -right-4 -top-4 h-24 w-24 rounded-full bg-gradient-to-br ${accentMap[accent]} blur-2xl`}
        animate={{ opacity: [0.4, 0.7, 0.4], scale: [1, 1.15, 1] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div className="relative flex items-start justify-between gap-3">
        <div>
          <motion.p
            className="text-xs font-medium uppercase tracking-wider text-slate-500"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: delay + 0.1 }}
          >
            {label}
          </motion.p>
          <motion.p
            className="mt-1 font-display text-3xl font-bold text-white"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: delay + 0.15, type: 'spring', stiffness: 200 }}
          >
            {value}
          </motion.p>
          {sub && <p className="mt-1 text-sm text-slate-400">{sub}</p>}
          {trend && (
            <motion.p
              className={`mt-2 text-xs font-medium ${trend.positive ? 'text-emerald-400' : 'text-rose-400'}`}
              initial={{ opacity: 0, x: -8 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: delay + 0.25 }}
            >
              {trend.positive ? '↑' : '↓'} {trend.value}
            </motion.p>
          )}
        </div>
        <motion.div
          variants={iconPop}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          whileHover={{ rotate: [0, -8, 8, 0], transition: { duration: 0.4 } }}
          className={`rounded-xl bg-gradient-to-br p-2.5 ${accentMap[accent]}`}
        >
          <Icon className="h-5 w-5" />
        </motion.div>
      </motion.div>
    </GlassCard>
  );
}

