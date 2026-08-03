/**
 * Factory maturity M0→M6 — keep in sync with apps/omnigroup-web/src/lib/factory-phase.ts
 */
import { config } from '../../../config';

export type FactoryPhase = 'M0' | 'M1' | 'M2' | 'M3' | 'M4' | 'M5' | 'M6';

export const FACTORY_PHASE_ORDER: FactoryPhase[] = ['M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6'];

export function parseFactoryPhase(raw: string | undefined | null): FactoryPhase | null {
  const v = raw?.trim().toUpperCase();
  if (v && FACTORY_PHASE_ORDER.includes(v as FactoryPhase)) return v as FactoryPhase;
  return null;
}

function isLeanProdMode(): boolean {
  return !config.autonomy.enabled && !config.features.scraper;
}

function isBudgetLaunchMode(): boolean {
  const raw = process.env.OWNER_MONTHLY_BUDGET_EUR?.trim();
  const n = raw ? Number.parseInt(raw, 10) : 200;
  return !Number.isFinite(n) || n <= 250;
}

/**
 * Configured ceiling (or inferred) — ignores AUTO revenue cache.
 */
export function getConfiguredFactoryPhase(): FactoryPhase {
  const raw = process.env.FACTORY_PHASE ?? process.env.NEXT_PUBLIC_FACTORY_PHASE;
  if (raw?.trim().toUpperCase() === 'AUTO') return 'M6';
  const fromEnv = parseFactoryPhase(raw);
  if (fromEnv) return fromEnv;
  if (isLeanProdMode() && isBudgetLaunchMode()) return 'M0';
  if (isLeanProdMode()) return 'M1';
  return 'M6';
}

function readAutoHelpers() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('./factory-phase-effective') as {
    isFactoryPhaseAutoEnabled: (env?: NodeJS.ProcessEnv) => boolean;
    getFactoryPhaseCeiling: (env?: NodeJS.ProcessEnv) => FactoryPhase;
  };
}

/**
 * Operational phase: when FACTORY_PHASE_AUTO / AUTO, uses cached effective phase from revenue+keys.
 * Falls back to ceiling until first evaluate() runs.
 */
export function getFactoryPhase(): FactoryPhase {
  const { isFactoryPhaseAutoEnabled, getFactoryPhaseCeiling } = readAutoHelpers();
  if (isFactoryPhaseAutoEnabled()) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { factoryPhaseAutoService } = require('../service/factory-phase-auto.service') as {
        factoryPhaseAutoService: { getCachedEffectivePhase: () => FactoryPhase };
      };
      return factoryPhaseAutoService.getCachedEffectivePhase();
    } catch {
      return getFactoryPhaseCeiling();
    }
  }
  return getConfiguredFactoryPhase();
}

export function phaseIndex(phase: FactoryPhase): number {
  return FACTORY_PHASE_ORDER.indexOf(phase);
}

export function phaseGte(current: FactoryPhase, min: FactoryPhase): boolean {
  return phaseIndex(current) >= phaseIndex(min);
}

export function usesFixedPhasePricing(phase: FactoryPhase = getFactoryPhase()): boolean {
  return phase !== 'M6';
}
