'use client';

import { motion } from 'framer-motion';
import { useId } from 'react';
import { useReducedMotion } from '@/lib/use-reduced-motion';

const sizes = { sm: 32, md: 40, lg: 56, xl: 80 } as const;

type Props = {
  size?: keyof typeof sizes | number;
  animated?: boolean;
  className?: string;
};

/** Omni Group brend — „O” prsten + tri modula (Atina · Astra · Titan). */
export function OmniGroupLogoMark({ size = 'md', animated = true, className = '' }: Props) {
  const px = typeof size === 'number' ? size : sizes[size];
  const uid = useId().replace(/:/g, '');
  const gradId = `og-grad-${uid}`;
  const glowId = `og-glow-${uid}`;
  const reducedMotion = useReducedMotion();
  const motionOn = animated && !reducedMotion;
  const repeat = motionOn ? Infinity : 0;

  const modules = [
    { angle: -90, color: '#8b5cf6', label: 'atina' },
    { angle: 30, color: '#22d3ee', label: 'astra' },
    { angle: 150, color: '#34d399', label: 'titan' },
  ] as const;

  return (
    <motion.svg
      viewBox="0 0 48 48"
      width={px}
      height={px}
      className={className}
      role="img"
      aria-label="Omni Group"
      initial={motionOn ? { opacity: 0, scale: 0.88 } : false}
      animate={motionOn ? { opacity: 1, scale: 1 } : undefined}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
    >
      <defs>
        <linearGradient id={gradId} x1="8%" y1="0%" x2="92%" y2="100%">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="45%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
        <radialGradient id={glowId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.35" />
          <stop offset="70%" stopColor="#22d3ee" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#030508" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx="24" cy="24" r="23" fill={`url(#${glowId})`} />

      <motion.circle
        cx="24"
        cy="24"
        r="17"
        fill="none"
        stroke={`url(#${gradId})`}
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeDasharray="72 28"
        animate={motionOn ? { rotate: 360 } : undefined}
        transition={{ duration: 20, repeat, ease: 'linear' }}
        style={{ transformOrigin: '24px 24px' }}
      />

      <motion.circle
        cx="24"
        cy="24"
        r="11"
        fill="none"
        stroke="#22d3ee"
        strokeWidth="1.25"
        strokeOpacity="0.45"
        animate={motionOn ? { rotate: -360, opacity: [0.35, 0.65, 0.35] } : undefined}
        transition={{
          rotate: { duration: 14, repeat, ease: 'linear' },
          opacity: { duration: 2.5, repeat, ease: 'easeInOut' },
        }}
        style={{ transformOrigin: '24px 24px' }}
      />

      <circle cx="24" cy="24" r="5.5" fill="#0a0e18" stroke={`url(#${gradId})`} strokeWidth="1.5" />

      {modules.map((m, i) => {
        const rad = (m.angle * Math.PI) / 180;
        const cx = 24 + Math.cos(rad) * 17;
        const cy = 24 + Math.sin(rad) * 17;
        return (
          <motion.g key={m.label}>
            <motion.line
              x1="24"
              y1="24"
              x2={cx}
              y2={cy}
              stroke={m.color}
              strokeWidth="0.75"
              strokeOpacity="0.35"
              animate={motionOn ? { opacity: [0.2, 0.5, 0.2] } : undefined}
              transition={{ duration: 2, repeat, delay: i * 0.25, ease: 'easeInOut' }}
            />
            <motion.circle
              cx={cx}
              cy={cy}
              r="2.8"
              fill={m.color}
              animate={
                motionOn
                  ? {
                      scale: [1, 1.35, 1],
                      opacity: [0.65, 1, 0.65],
                    }
                  : undefined
              }
              transition={{ duration: 1.8, repeat, delay: i * 0.2, ease: 'easeInOut' }}
            />
          </motion.g>
        );
      })}
    </motion.svg>
  );
}
