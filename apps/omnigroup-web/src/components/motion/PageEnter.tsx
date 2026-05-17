'use client';

import { motion } from 'framer-motion';
import { pageEnter } from '@/lib/animations';

export function PageEnter({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={pageEnter.initial}
      animate={pageEnter.animate}
      transition={pageEnter.transition}
    >
      {children}
    </motion.div>
  );
}

