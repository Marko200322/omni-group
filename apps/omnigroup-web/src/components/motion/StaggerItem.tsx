'use client';

import { motion, type HTMLMotionProps } from 'framer-motion';
import { fadeUp } from '@/lib/animations';

export function StaggerItem({ children, className, ...rest }: HTMLMotionProps<'div'>) {
  return (
    <motion.div variants={fadeUp} className={className} {...rest}>
      {children}
    </motion.div>
  );
}

