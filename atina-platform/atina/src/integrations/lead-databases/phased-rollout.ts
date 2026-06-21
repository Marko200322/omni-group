import { config } from '../../config';

export type LeadRolloutPhase = 'F0' | 'F1' | 'F2' | 'F3' | 'F4' | 'F5';

export type LeadPhaseCapabilities = {
  phase: LeadRolloutPhase;
  enrichOnHunt: boolean;
  verifyOnHunt: boolean;
  verifyEmailsAvailable: boolean;
  requireVerifiedEmail: boolean;
  maxPerRun: number;
  providerChain: string[];
  verifyChain: string[];
};

const PHASE_ORDER: LeadRolloutPhase[] = ['F0', 'F1', 'F2', 'F3', 'F4', 'F5'];

function normalizePhase(raw: string): LeadRolloutPhase {
  const upper = raw.trim().toUpperCase();
  if (PHASE_ORDER.includes(upper as LeadRolloutPhase)) return upper as LeadRolloutPhase;
  return 'F0';
}

function phaseIndex(phase: LeadRolloutPhase): number {
  return PHASE_ORDER.indexOf(phase);
}

/**
 * Fazno paljenje lead baza (usklađeno sa marketing budžetom):
 * F0–F1: samo web scrape
 * F2: email verify opciono (ručni CRM)
 * F3: enrich na hunt (hunter,snov pre Apollo)
 * F4: pun lanac + verify
 * F5: verify obavezan pre outbound
 */
export function resolveLeadPhaseCapabilities(): LeadPhaseCapabilities {
  const phase = normalizePhase(config.leadDatabases.rolloutPhase);
  const idx = phaseIndex(phase);
  const enabled = config.leadDatabases.enabled;
  const overrideEnrich = config.leadDatabases.enrichOnHuntOverride;

  const enrichOnHunt =
    enabled && (overrideEnrich || idx >= phaseIndex('F3'));
  const verifyOnHunt = enabled && idx >= phaseIndex('F4');
  const verifyEmailsAvailable = enabled && idx >= phaseIndex('F2');
  const requireVerifiedEmail = enabled && idx >= phaseIndex('F5');

  let maxPerRun = config.leadDatabases.maxPerRun;
  if (idx < phaseIndex('F3')) maxPerRun = 0;
  else if (idx === phaseIndex('F3')) maxPerRun = Math.min(maxPerRun, 10);
  else if (idx === phaseIndex('F4')) maxPerRun = Math.min(maxPerRun, 15);
  else maxPerRun = Math.min(maxPerRun, 25);

  let providerChain = config.leadDatabases.providerChain;
  if (idx === phaseIndex('F3')) {
    providerChain = providerChain.filter((p) => ['hunter', 'snov', 'lusha'].includes(p));
    if (!providerChain.length) providerChain = ['hunter', 'snov'];
  }

  const verifyChain = verifyEmailsAvailable ? config.leadDatabases.emailVerifyChain : [];

  return {
    phase,
    enrichOnHunt,
    verifyOnHunt,
    verifyEmailsAvailable,
    requireVerifiedEmail,
    maxPerRun,
    providerChain,
    verifyChain,
  };
}

export function leadRolloutPhaseLabel(phase: LeadRolloutPhase): string {
  const labels: Record<LeadRolloutPhase, string> = {
    F0: 'Lokalno / scrape only',
    F1: 'Go-live (scrape + outbound warmup)',
    F2: 'Email verify spreman (ručni CRM)',
    F3: 'Enrich na hunt (Hunter/Snov)',
    F4: 'Pun lanac (Apollo + verify)',
    F5: 'Pun gas (verify obavezan)',
  };
  return labels[phase];
}
