/**
 * Runtime module gates — sync with scripts/prod-factory-phase.ps1 + factory-phase-modules.ts
 */
import { config } from '../../../config';
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
  autonomy: 'M5',
  autonomy_marketing: 'M5',
  avatar: 'M6',
  stripe_live: 'M6',
};

function envOn(key: string): boolean {
  const v = process.env[key]?.trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

/** Env + phase — single runtime truth for API/services. */
export function isFactoryModuleEnabled(
  module: FactoryModuleKey,
  phase: FactoryPhase = getFactoryPhase(),
): boolean {
  if (!phaseGte(phase, MIN_PHASE[module])) return false;

  switch (module) {
    case 'billing':
    case 'fulfillment':
      return true;
    case 'inbound':
      return config.features.crm;
    case 'scraper':
      return config.features.scraper;
    case 'outbound_draft':
      return config.features.scraper || envOn('AUTONOMY_REAL_ECOSYSTEM_RUNS');
    case 'outbound_send':
      return (
        config.outreach.dailyCap > 0 &&
        (config.outreach.domainWarmupComplete || config.outreach.devSendToFallback)
      );
    case 'lead_db':
      return envOn('LEAD_DATABASE_ENABLED');
    case 'hunter':
      return config.features.scraper || envOn('LEAD_DATABASE_ENABLED');
    case 'autonomy':
      return config.autonomy.enabled;
    case 'autonomy_marketing':
      return config.autonomy.enabled && (config.autonomy.budget.marketingEnabled ?? false);
    case 'avatar':
      return envOn('SUPPORT_AVATAR_ENABLED') || envOn('SALES_AVATAR_ENABLED');
    case 'stripe_live':
      return config.payments.mode === 'live';
    default:
      return false;
  }
}

export function listFactoryModuleStatus(phase: FactoryPhase = getFactoryPhase()) {
  return (Object.keys(MIN_PHASE) as FactoryModuleKey[]).map((key) => ({
    module: key,
    minPhase: MIN_PHASE[key],
    enabled: isFactoryModuleEnabled(key, phase),
  }));
}

export function getFactoryRuntimeSnapshot() {
  const phase = getFactoryPhase();
  return {
    phase,
    monthlyBudgetEur: config.factory.monthlyBudgetEur,
    modules: listFactoryModuleStatus(phase),
  };
}
