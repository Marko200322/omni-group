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

export function getFactoryPhase(): FactoryPhase {
  const fromEnv = parseFactoryPhase(process.env.FACTORY_PHASE ?? process.env.NEXT_PUBLIC_FACTORY_PHASE);
  if (fromEnv) return fromEnv;
  if (isLeanProdMode() && isBudgetLaunchMode()) return 'M0';
  if (isLeanProdMode()) return 'M1';
  return 'M6';
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
