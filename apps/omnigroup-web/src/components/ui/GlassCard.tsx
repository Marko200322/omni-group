'use client';

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { fadeUp, hoverLift } from '@/lib/animations';

type Props = {
  children: ReactNode;
  className?: string;
  delay?: number;
  hover?: boolean;
  id?: string;
};

export function GlassCard({ children, className = '', delay = 0, hover = true, id }: Props) {
  return (
    <motion.div
      id={id}
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      custom={delay}
      whileHover={hover ? hoverLift : undefined}
      className={`glass-strong group relative overflow-hidden p-5 transition-shadow duration-300 hover:shadow-glow ${className}`}
    >
      <motion.div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background:
            'radial-gradient(600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(139,92,246,0.08), transparent 40%)',
        }}
      />
      <motion.div
        className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-violet-500/10 blur-2xl"
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="relative">{children}</div>
    </motion.div>
  );
}

