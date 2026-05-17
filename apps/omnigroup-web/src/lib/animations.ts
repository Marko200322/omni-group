/** Shared Framer Motion presets — koristi kroz ceo sajt. */
export const easeOutExpo = [0.22, 1, 0.36, 1] as const;

export const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: i * 0.08, ease: easeOutExpo },
  }),
};

export const fadeIn = {
  hidden: { opacity: 0 },
  visible: (i = 0) => ({
    opacity: 1,
    transition: { duration: 0.5, delay: i * 0.06 },
  }),
};

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: (i = 0) => ({
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, delay: i * 0.07, ease: easeOutExpo },
  }),
};

export const slideInLeft = {
  hidden: { opacity: 0, x: -28 },
  visible: (i = 0) => ({
    opacity: 1,
    x: 0,
    transition: { duration: 0.5, delay: i * 0.08, ease: easeOutExpo },
  }),
};

export const slideInRight = {
  hidden: { opacity: 0, x: 28 },
  visible: (i = 0) => ({
    opacity: 1,
    x: 0,
    transition: { duration: 0.5, delay: i * 0.08, ease: easeOutExpo },
  }),
};

export const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.09, delayChildren: 0.12 },
  },
};

export const pageEnter = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.4, ease: easeOutExpo },
};

export const hoverLift = {
  y: -6,
  scale: 1.02,
  transition: { type: 'spring' as const, stiffness: 400, damping: 22 },
};

export const hoverGlow = {
  boxShadow: '0 0 40px rgba(139, 92, 246, 0.35)',
  borderColor: 'rgba(139, 92, 246, 0.4)',
};

export const tapScale = { scale: 0.97 };

export const iconPop = {
  hidden: { scale: 0, rotate: -20 },
  visible: {
    scale: 1,
    rotate: 0,
    transition: { type: 'spring' as const, stiffness: 380, damping: 18 },
  },
};

