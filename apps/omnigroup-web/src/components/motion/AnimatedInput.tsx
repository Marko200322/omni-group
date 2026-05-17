'use client';

import { motion } from 'framer-motion';
import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';

const fieldClass =
  'w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition-all duration-300 focus:border-violet-500/50 focus:shadow-[0_0_20px_rgba(139,92,246,0.15)]';

export function AnimatedInput({
  delay = 0,
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.4 }}
    >
      <input className={`${fieldClass} ${className}`} {...props} />
    </motion.div>
  );
}

export function AnimatedTextarea({
  delay = 0,
  className = '',
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.4 }}
    >
      <textarea className={`${fieldClass} ${className}`} {...props} />
    </motion.div>
  );
}
