/**
 * Runtime module gates — sync with scripts/prod-factory-phase.ps1 + factory-phase-modules.ts
 * When FACTORY_PHASE_AUTO is on, phase + key presence unlock modules without redeploy.
 */
import { config } from '../../../config';
import { getFactoryPhase, phaseGte, type FactoryPhase } from './factory-phase';
import { envKeyPresent, isFactoryPhaseAutoEnabled } from './factory-phase-effective';

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

  const auto = isFactoryPhaseAutoEnabled();

  switch (module) {
    case 'billing':
    case 'fulfillment':
      return true;
    case 'inbound':
      return auto
        ? envKeyPresent('RESEND_API_KEY') || config.features.crm
        : config.features.crm;
    case 'scraper':
      return auto ? envKeyPresent('SCRAPER_KEY') : config.features.scraper;
    case 'outbound_draft':
      return auto
        ? envKeyPresent('SCRAPER_KEY') || envOn('AUTONOMY_REAL_ECOSYSTEM_RUNS')
        : config.features.scraper || envOn('AUTONOMY_REAL_ECOSYSTEM_RUNS');
    case 'outbound_send':
      return (
        (auto ? true : config.outreach.dailyCap > 0) &&
        (config.outreach.domainWarmupComplete || config.outreach.devSendToFallback || auto)
      );
    case 'lead_db':
      return auto ? envKeyPresent('HUNTER_API_KEY') || envOn('LEAD_DATABASE_ENABLED') : envOn('LEAD_DATABASE_ENABLED');
    case 'hunter':
      return auto
        ? envKeyPresent('HUNTER_API_KEY') || envKeyPresent('SCRAPER_KEY')
        : config.features.scraper || envOn('LEAD_DATABASE_ENABLED');
    case 'autonomy':
      return auto ? phaseGte(phase, 'M5') : config.autonomy.enabled;
    case 'autonomy_marketing':
      return auto
        ? phaseGte(phase, 'M5')
        : config.autonomy.enabled && (config.autonomy.budget.marketingEnabled ?? false);
    case 'avatar':
      return (
        envOn('SUPPORT_AVATAR_ENABLED') ||
        envOn('SALES_AVATAR_ENABLED') ||
        (auto && (envKeyPresent('HEYGEN_API_KEY') || envKeyPresent('DID_API_KEY')))
      );
    case 'stripe_live':
      return auto
        ? envKeyPresent('STRIPE_SECRET_KEY') && config.payments.mode === 'live'
        : config.payments.mode === 'live';
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
    autoEnabled: isFactoryPhaseAutoEnabled(),
    modules: listFactoryModuleStatus(phase),
  };
}
