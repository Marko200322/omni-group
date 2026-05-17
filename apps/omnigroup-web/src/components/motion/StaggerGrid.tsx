'use client';

import { motion } from 'framer-motion';
import { staggerContainer } from '@/lib/animations';

type Props = {
  children: React.ReactNode;
  className?: string;
  as?: 'div' | 'ul' | 'section';
};

export function StaggerGrid({ children, className, as = 'div' }: Props) {
  const Component = motion[as] as typeof motion.div;

  return (
    <Component
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.15 }}
      className={className}
    >
      {children}
    </Component>
  );
}

