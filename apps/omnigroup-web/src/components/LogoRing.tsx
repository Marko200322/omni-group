'use client';

import { motion } from 'framer-motion';
import { useId } from 'react';
import { OmniGroupLogoMark } from '@/components/brand/OmniGroupLogoMark';

/** Futuristic ring + circular text (SVG). */
export function LogoRing() {
  const pathId = `circlePath-${useId().replace(/:/g, '')}`;

  return (
    <motion.div
      className="relative mx-auto flex h-72 w-72 items-center justify-center"
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div
        className="absolute h-56 w-56 rounded-full border border-violet-500/20"
        animate={{ rotate: -360, scale: [1, 1.05, 1] }}
        transition={{
          rotate: { duration: 40, repeat: Infinity, ease: 'linear' },
          scale: { duration: 5, repeat: Infinity, ease: 'easeInOut' },
        }}
      />
      <motion.div
        className="absolute h-44 w-44 rounded-full border-2 border-cyan-400/60"
        style={{
          boxShadow:
            '0 0 32px rgba(0,243,255,0.45), 0 0 64px rgba(157,0,255,0.35), inset 0 0 24px rgba(0,243,255,0.12)',
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div
        className="absolute h-36 w-36 rounded-full border border-fuchsia-500/30"
        animate={{ rotate: -360, opacity: [0.4, 0.8, 0.4] }}
        transition={{
          rotate: { duration: 16, repeat: Infinity, ease: 'linear' },
          opacity: { duration: 2.5, repeat: Infinity },
        }}
      />
      <motion.svg
        viewBox="0 0 200 200"
        className="absolute h-full w-full"
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
        aria-hidden
      >
        <defs>
          <path
            id={pathId}
            d="M 100,100 m -72,0 a 72,72 0 1,1 144,0 a 72,72 0 1,1 -144,0"
          />
        </defs>
        <text className="fill-gray-200 text-[10px] font-medium uppercase tracking-[0.2em]">
          <textPath href={`#${pathId}`} startOffset="0%">
            Omni Group · Atina · Astra · Titan ·
          </textPath>
        </text>
      </motion.svg>
      <motion.div
        className="pointer-events-none"
        animate={{ scale: [1, 1.06, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      >
        <OmniGroupLogoMark size="xl" />
      </motion.div>
      {[0, 1, 2, 3].map((i) => (
        <motion.span
          key={i}
          className="absolute h-2 w-2 rounded-full bg-cyan-400/80"
          style={{ top: '50%', left: '50%', marginTop: -4, marginLeft: -4 }}
          animate={{
            x: [0, Math.cos((i * Math.PI) / 2) * 100, 0],
            y: [0, Math.sin((i * Math.PI) / 2) * 100, 0],
            opacity: [0.2, 1, 0.2],
          }}
          transition={{
            duration: 4 + i * 0.5,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.3,
          }}
        />
      ))}
    </motion.div>
  );
}
