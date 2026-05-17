'use client';

import { motion } from 'framer-motion';
import { fadeUp } from '@/lib/animations';

type Props = {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  once?: boolean;
  amount?: number;
};

export function FadeIn({ delay = 0, once = true, amount = 0.2, children, className }: Props) {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount }}
      custom={delay}
      className={className}
    >
      {children}
    </motion.div>
  );
}
