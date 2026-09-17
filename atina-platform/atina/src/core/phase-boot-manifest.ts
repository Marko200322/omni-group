import { comparePhase, PHASE_ORDER, type Phase } from './phase-env';

/** Šta se pali na svakoj fazi — jedini izvor istine za boot redosled. */
export type PhaseBootStep = {
  phase: Phase;
  label: string;
  /** Ključevi aktiviranih sposobnosti (log + admin boot-status). */
  activates: readonly string[];
  /** Za v6: obavezan PDF legal sign-off pre boot-a. */
  requiresPdfLegalSignoff?: boolean;
};

export const PHASE_BOOT_MANIFEST: readonly PhaseBootStep[] = [
  {
    phase: 'v1',
    label: 'Core SaaS',
    activates: ['auth', 'users', 'billing', 'payments', 'notifications', 'admin', 'phase-launch'],
  },
  {
    phase: 'v2',
    label: 'Hunting & sales pipeline',
    activates: ['client-hunter', 'lead-scoring', 'proxy-rotation', 'outreach', 'crm', 'dominus360'],
  },
  {
    phase: 'v3',
    label: 'Forge, AI memory, Nest bridge',
    activates: ['forge', 'ai-memory', 'ai-rag', 'titan-score', 'atina-system', 'sistem-naplate'],
  },
  {
    phase: 'v4',
    label: 'Premium avatars & autonomy',
    activates: ['video-meetings', 'live-call-avatar', 'autonomy-loop', 'resource-procurement', 'product-factory'],
  },
  {
    phase: 'v5',
    label: 'K8s vision & horizontal scaling',
    activates: ['scaling', 'load-balancer', 'alert-system', 'k8s-orchestration', 'ai-rag-prod'],
  },
  {
    phase: 'v6',
    label: '125k edge swarm + PDF legal alignment',
    activates: ['edge-swarm', 'pdf-legal-alignment', 'dominus-swarm-batch-125k', 'vision-full'],
    requiresPdfLegalSignoff: true,
  },
];

export const EDGE_SWARM_MAX_PROFILES_V6 = 125_000;
export const EDGE_SWARM_MAX_PROFILES_PRE_V6 = 10_000;

export function manifestStepsUpTo(target: Phase): PhaseBootStep[] {
  return PHASE_BOOT_MANIFEST.filter((step) => comparePhase(target, step.phase) >= 0);
}

export function edgeSwarmProfileCap(phase: Phase): number {
  return comparePhase(phase, 'v6') >= 0 ? EDGE_SWARM_MAX_PROFILES_V6 : EDGE_SWARM_MAX_PROFILES_PRE_V6;
}

export function phaseRequiresPdfSignoff(phase: Phase): boolean {
  return comparePhase(phase, 'v6') >= 0;
}

export function orderedPhasesThrough(target: Phase): Phase[] {
  const idx = PHASE_ORDER.indexOf(target);
  return idx >= 0 ? [...PHASE_ORDER.slice(0, idx + 1)] : ['v1'];
}
