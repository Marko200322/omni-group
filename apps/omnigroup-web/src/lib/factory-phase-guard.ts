/**
 * Client-side factory module gates — mirror of atina factory-phase-runtime.ts
 */
import { getFactoryPhase, phaseGte, type FactoryPhase } from './factory-phase';

export type FactoryModuleKey =
  | 'billing'
  | 'fulfillment'
  | 'inbound'
  | 'scraper'
  | 'outbound_draft'
  | 'outbound_send'
  | 'lead_db'
  | 'hunter'
  | 'autonomy'
  | 'autonomy_marketing'
  | 'avatar'
  | 'stripe_live';

const MIN_PHASE: Record<FactoryModuleKey, FactoryPhase> = {
  billing: 'M0',
  fulfillment: 'M0',
  inbound: 'M1',
  scraper: 'M2',
  outbound_draft: 'M2',
  outbound_send: 'M4',
  lead_db: 'M4',
  hunter: 'M2',
  /** Live ops / scheduler status visible from M4 (marketing spend still M5). */
  autonomy: 'M4',
  autonomy_marketing: 'M5',
  avatar: 'M6',
  stripe_live: 'M6',
};

/** UI gate — phase only (env enforced on API). */
export function isFactoryModuleAllowed(
  module: FactoryModuleKey,
  phase: FactoryPhase = getFactoryPhase(),
): boolean {
  return phaseGte(phase, MIN_PHASE[module]);
}

export function getFactoryModuleMinPhase(module: FactoryModuleKey): FactoryPhase {
  return MIN_PHASE[module];
}

export function listFactoryModuleUiStatus(phase: FactoryPhase = getFactoryPhase()) {
  return (Object.keys(MIN_PHASE) as FactoryModuleKey[]).map((key) => ({
    module: key,
    minPhase: MIN_PHASE[key],
    allowed: isFactoryModuleAllowed(key, phase),
  }));
}
