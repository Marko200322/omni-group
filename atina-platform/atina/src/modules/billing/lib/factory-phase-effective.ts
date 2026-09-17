/**
 * Runtime effective factory phase — keys + revenue gates, capped by ceiling / AUTO.
 * Keep gate numbers in sync with docs/MARKETING-REVENUE-PHASED-CHECKLIST.md
 */
import {
  FACTORY_PHASE_ORDER,
  parseFactoryPhase,
  phaseIndex,
  type FactoryPhase,
} from './factory-phase';

export type FactoryRevenueMetrics = {
  confirmedPaymentCount: number;
  confirmedRevenueEur: number;
  fulfilledPackageCount: number;
  estimatedMrrEur: number;
};

export type EffectivePhaseBreakdown = {
  ceiling: FactoryPhase;
  autoEnabled: boolean;
  keysOkThrough: FactoryPhase;
  revenueOkThrough: FactoryPhase;
  effective: FactoryPhase;
  blockedNext: FactoryPhase | null;
  blockedReason: string | null;
  metrics: FactoryRevenueMetrics;
};

const PHASE_REQUIRED_KEYS: Record<FactoryPhase, string[]> = {
  M0: ['OPENROUTER_API_KEY', 'MANUAL_PAYMENT_IBAN'],
  M1: ['RESEND_API_KEY', 'CONTACT_EMAIL_FROM', 'CONTACT_EMAIL_TO'],
  M2: ['SCRAPER_KEY'],
  M3: [],
  M4: ['HUNTER_API_KEY'],
  M5: [],
  M6: [
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'STRIPE_PUBLISHABLE_KEY',
    'STARTER_PRICE_ID',
    'PRO_PRICE_ID',
    'ENTERPRISE_PRICE_ID',
  ],
};

/** Revenue / operational gates to enter each phase (inclusive). */
export function revenueAllowsPhase(phase: FactoryPhase, m: FactoryRevenueMetrics): boolean {
  switch (phase) {
    case 'M0':
      return true;
    case 'M1':
      return m.confirmedPaymentCount >= 1 || m.confirmedRevenueEur > 0;
    case 'M2':
      return m.estimatedMrrEur >= 200 || m.confirmedRevenueEur >= 800;
    case 'M3':
      return m.estimatedMrrEur >= 400 || m.fulfilledPackageCount >= 3;
    case 'M4':
      return m.estimatedMrrEur >= 600;
    case 'M5':
      return m.estimatedMrrEur >= 1500;
    case 'M6':
      return m.estimatedMrrEur >= 2000;
    default:
      return false;
  }
}

export function envKeyPresent(key: string, env: NodeJS.ProcessEnv = process.env): boolean {
  const v = env[key]?.trim();
  if (!v) return false;
  if (v === 'placeholder' || v.startsWith('your_')) return false;
  // Default Stripe price placeholders from config
  if (key.endsWith('_PRICE_ID') && (v === 'price_starter' || v === 'price_pro' || v === 'price_enterprise')) {
    return false;
  }
  return true;
}

export function keysAllowPhase(phase: FactoryPhase, env: NodeJS.ProcessEnv = process.env): boolean {
  const idx = phaseIndex(phase);
  for (let i = 0; i <= idx; i++) {
    const p = FACTORY_PHASE_ORDER[i];
    for (const key of PHASE_REQUIRED_KEYS[p]) {
      if (!envKeyPresent(key, env)) return false;
    }
  }
  return true;
}

export function isFactoryPhaseAutoEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const raw = (env.FACTORY_PHASE ?? env.NEXT_PUBLIC_FACTORY_PHASE ?? '').trim().toUpperCase();
  if (raw === 'AUTO') return true;
  const flag = (env.FACTORY_PHASE_AUTO ?? env.NEXT_PUBLIC_FACTORY_PHASE_AUTO ?? '').trim().toLowerCase();
  return flag === 'true' || flag === '1' || flag === 'yes';
}

export function getFactoryPhaseCeiling(env: NodeJS.ProcessEnv = process.env): FactoryPhase {
  if (isFactoryPhaseAutoEnabled(env)) return 'M6';
  const raw = env.FACTORY_PHASE ?? env.NEXT_PUBLIC_FACTORY_PHASE;
  return parseFactoryPhase(raw) ?? 'M0';
}

function maxPhaseWhere(
  predicate: (phase: FactoryPhase) => boolean,
  ceiling: FactoryPhase,
): FactoryPhase {
  let best: FactoryPhase = 'M0';
  const maxIdx = phaseIndex(ceiling);
  for (let i = 0; i <= maxIdx; i++) {
    const p = FACTORY_PHASE_ORDER[i];
    if (predicate(p)) best = p;
    else break;
  }
  return best;
}

export function resolveEffectiveFactoryPhase(
  metrics: FactoryRevenueMetrics,
  env: NodeJS.ProcessEnv = process.env,
): EffectivePhaseBreakdown {
  const autoEnabled = isFactoryPhaseAutoEnabled(env);
  const ceiling = getFactoryPhaseCeiling(env);

  const keysOkThrough = maxPhaseWhere((p) => keysAllowPhase(p, env), ceiling);
  const revenueOkThrough = maxPhaseWhere((p) => revenueAllowsPhase(p, metrics), ceiling);

  const effectiveIdx = Math.min(phaseIndex(keysOkThrough), phaseIndex(revenueOkThrough), phaseIndex(ceiling));
  const effective = FACTORY_PHASE_ORDER[effectiveIdx];

  let blockedNext: FactoryPhase | null = null;
  let blockedReason: string | null = null;
  const nextIdx = effectiveIdx + 1;
  if (nextIdx < FACTORY_PHASE_ORDER.length && nextIdx <= phaseIndex(ceiling)) {
    blockedNext = FACTORY_PHASE_ORDER[nextIdx];
    if (!keysAllowPhase(blockedNext, env)) {
      const missing = PHASE_REQUIRED_KEYS[blockedNext].filter((k) => !envKeyPresent(k, env));
      blockedReason = missing.length
        ? `Missing keys for ${blockedNext}: ${missing.join(', ')}`
        : `Keys incomplete for ${blockedNext}`;
    } else if (!revenueAllowsPhase(blockedNext, metrics)) {
      blockedReason = `Revenue gate not met for ${blockedNext}`;
    }
  } else if (!autoEnabled && phaseIndex(ceiling) < FACTORY_PHASE_ORDER.length - 1) {
    blockedNext = FACTORY_PHASE_ORDER[phaseIndex(ceiling) + 1];
    blockedReason = `Hard ceiling ${ceiling} (set FACTORY_PHASE_AUTO=true to unlock further)`;
  }

  return {
    ceiling,
    autoEnabled,
    keysOkThrough,
    revenueOkThrough,
    effective,
    blockedNext,
    blockedReason,
    metrics,
  };
}

export function requiredKeysForPhase(phase: FactoryPhase): string[] {
  const keys: string[] = [];
  const idx = phaseIndex(phase);
  for (let i = 0; i <= idx; i++) {
    keys.push(...PHASE_REQUIRED_KEYS[FACTORY_PHASE_ORDER[i]]);
  }
  return [...new Set(keys)];
}
