'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import type { ComponentProps } from 'react';

type Props = ComponentProps<typeof Link> & {
  underline?: boolean;
};

export function MotionLink({ children, className = '', underline = true, ...props }: Props) {
  return (
    <motion.div className="relative inline-block" whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}>
      <Link className={className} {...props}>
        {children}
      </Link>
      {underline && (
        <motion.span
          className="absolute -bottom-0.5 left-0 h-px w-full origin-left bg-gradient-to-r from-violet-400 to-cyan-400"
          initial={{ scaleX: 0 }}
          whileHover={{ scaleX: 1 }}
          transition={{ duration: 0.25 }}
        />
      )}
    </motion.div>
  );
}

