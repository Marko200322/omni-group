'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { OmniGroupLogoMark } from './OmniGroupLogoMark';
import { tapScale } from '@/lib/animations';

type Props = {
  href?: string;
  size?: 'sm' | 'md' | 'lg';
  showWordmark?: boolean;
  className?: string;
};

export function OmniGroupLogo({ href = '/', size = 'sm', showWordmark = true, className = '' }: Props) {
  const markSize = size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'md';

  const inner = (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <OmniGroupLogoMark size={markSize} />
      {showWordmark && (
        <span className="font-display text-lg font-bold tracking-tight text-gradient animate-gradient-text whitespace-nowrap">
          Omni Group Tech
        </span>
      )}
    </div>
  );

  if (!href) return inner;

  return (
    <motion.div whileHover={{ scale: 1.03 }} whileTap={tapScale}>
      <Link href={href} className="group flex items-center" aria-label="Omni Group Tech — home">
        {inner}
      </Link>
    </motion.div>
  );
}
