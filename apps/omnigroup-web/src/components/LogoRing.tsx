'use client';

import { motion } from 'framer-motion';

/** Futuristic ring + circular text (SVG). */
export function LogoRing() {
  return (
    <div className="relative mx-auto flex h-64 w-64 items-center justify-center">
      <motion.div
        className="absolute h-36 w-36 rounded-full border-2 border-cyan-400/80"
        style={{
          boxShadow:
            '0 0 32px rgba(0,243,255,0.45), 0 0 64px rgba(157,0,255,0.35), inset 0 0 24px rgba(0,243,255,0.12)',
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
      />
      <svg viewBox="0 0 200 200" className="absolute h-full w-full">
        <defs>
          <path
            id="circlePath"
            d="M 100,100 m -72,0 a 72,72 0 1,1 144,0 a 72,72 0 1,1 -144,0"
          />
        </defs>
        <text className="fill-gray-200 text-[10px] font-medium uppercase tracking-[0.2em]">
          <textPath href="#circlePath" startOffset="0%">
            Omnigroup · Omnigroup ·
          </textPath>
        </text>
      </svg>
      <span className="pointer-events-none text-3xl font-black text-gradient">O</span>
    </div>
  );
}
