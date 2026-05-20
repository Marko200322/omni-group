/** Faze v1–v6: `process.env.PHASE` ima prioritet nad DB kada je validna. */
export const PHASE_ORDER = ['v1', 'v2', 'v3', 'v4', 'v5', 'v6'] as const;
export type Phase = (typeof PHASE_ORDER)[number];

export function parsePhase(raw: string | undefined): Phase | null {
  const v = String(raw ?? '').trim().toLowerCase();
  return (PHASE_ORDER as readonly string[]).includes(v) ? (v as Phase) : null;
}

export function comparePhase(current: Phase, required: Phase): number {
  return PHASE_ORDER.indexOf(current) - PHASE_ORDER.indexOf(required);
}

/** Efektivna faza: env (ako postoji) inače podrazumevano v1 dok DB ne odgovori. */
export function resolvePhaseFromEnv(): Phase {
  return parsePhase(process.env.PHASE) ?? 'v1';
}

export function maxPhase(a: Phase, b: Phase): Phase {
  return comparePhase(a, b) >= 0 ? a : b;
}
