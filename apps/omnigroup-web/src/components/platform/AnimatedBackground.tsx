'use client';

import { motion } from 'framer-motion';
import { useReducedMotion } from '@/lib/use-reduced-motion';

type Variant = 'admin' | 'client';

const orbs: Record<Variant, { color: string; x: string; y: string; size: string }[]> = {
  admin: [
    { color: 'rgba(139,92,246,0.35)', x: '10%', y: '15%', size: '420px' },
    { color: 'rgba(34,211,238,0.2)', x: '75%', y: '60%', size: '360px' },
    { color: 'rgba(244,114,182,0.12)', x: '55%', y: '5%', size: '280px' },
  ],
  client: [
    { color: 'rgba(52,211,153,0.28)', x: '5%', y: '40%', size: '400px' },
    { color: 'rgba(96,165,250,0.22)', x: '80%', y: '20%', size: '340px' },
    { color: 'rgba(167,139,250,0.1)', x: '40%', y: '70%', size: '300px' },
  ],
};

const particles = Array.from({ length: 24 }, (_, i) => ({
  id: i,
  x: `${(i * 17) % 100}%`,
  y: `${(i * 23) % 100}%`,
  size: 2 + (i % 3),
  duration: 8 + (i % 6),
  delay: (i % 5) * 0.4,
}));

export function AnimatedBackground({ variant }: { variant: Variant }) {
  const reducedMotion = useReducedMotion();
  const repeat = reducedMotion ? 0 : Infinity;

  return (
    <motion.div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <motion.div
        className="absolute inset-0 mesh-grid opacity-60"
        animate={reducedMotion ? { opacity: 0.55 } : { opacity: [0.4, 0.7, 0.4] }}
        transition={reducedMotion ? { duration: 0 } : { duration: 8, repeat, ease: 'easeInOut' }}
      />
      {orbs[variant].map((orb, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full blur-[100px]"
          style={{
            left: orb.x,
            top: orb.y,
            width: orb.size,
            height: orb.size,
            background: orb.color,
          }}
          animate={{
            x: [0, i % 2 === 0 ? 40 : -36, 0],
            y: [0, i % 2 === 0 ? -28 : 32, 0],
            scale: [1, 1.12, 1],
          }}
          transition={{ duration: 14 + i * 2, repeat, ease: 'easeInOut' }}
        />
      ))}
      {particles.map((p) => (
        <motion.span
          key={p.id}
          className="absolute rounded-full bg-white/30"
          style={{
            left: p.x,
            top: p.y,
            width: p.size,
            height: p.size,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.1, 0.5, 0.1],
            scale: [1, 1.5, 1],
          }}
          transition={{
            duration: p.duration,
            repeat,
            ease: 'easeInOut',
            delay: p.delay,
          }}
        />
      ))}
    </motion.div>
  );
}

