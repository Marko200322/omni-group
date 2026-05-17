'use client';

import { motion } from 'framer-motion';
import type { ReactNode, ButtonHTMLAttributes } from 'react';
import { tapScale } from '@/lib/animations';

type Props = {
  children: ReactNode;
  variant?: 'primary' | 'glass';
} & Pick<ButtonHTMLAttributes<HTMLButtonElement>, 'type' | 'disabled' | 'onClick' | 'className'>;

export function ShineButton({ children, variant = 'primary', className = '', type = 'button', disabled, onClick }: Props) {
  const base = variant === 'primary' ? 'btn-primary' : 'btn-glass';

  return (
    <motion.button
      type={type}
      disabled={disabled}
      onClick={onClick}
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={tapScale}
      className={`${base} relative overflow-hidden ${className}`}
    >
      <motion.span
        className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent"
        animate={{ x: ['-100%', '200%'] }}
        transition={{ duration: 2.8, repeat: Infinity, repeatDelay: 1.2, ease: 'easeInOut' }}
      />
      <span className="relative">{children}</span>
    </motion.button>
  );
}
