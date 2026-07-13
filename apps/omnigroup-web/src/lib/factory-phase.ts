/**
 * Factory maturity M0→M6 — drives checkout gates, fixed pricing, and package unlocks.
 * Bump NEXT_PUBLIC_FACTORY_PHASE (or FACTORY_PHASE on API) after each revenue gate.
 */
import { isBudgetLaunchMode } from './prod-budget';
import { isLeanProdMode } from './prod-mode';

export type FactoryPhase = 'M0' | 'M1' | 'M2' | 'M3' | 'M4' | 'M5' | 'M6';

export const FACTORY_PHASE_ORDER: FactoryPhase[] = ['M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6'];

export function parseFactoryPhase(raw: string | undefined | null): FactoryPhase | null {
  const v = raw?.trim().toUpperCase();
  if (v && FACTORY_PHASE_ORDER.includes(v as FactoryPhase)) return v as FactoryPhase;
  return null;
}

/** Current factory phase — env override, else infer from prod profile. */
export function getFactoryPhase(): FactoryPhase {
  const fromEnv = parseFactoryPhase(process.env.NEXT_PUBLIC_FACTORY_PHASE);
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

/** M0–M5: fixed anchor price. M6: market-dynamic pricing allowed. */
export function usesFixedPhasePricing(phase: FactoryPhase = getFactoryPhase()): boolean {
  return phase !== 'M6';
}

export function getFactoryPhaseLabel(phase: FactoryPhase = getFactoryPhase()): string {
  const labels: Record<FactoryPhase, string> = {
    M0: 'Launch — manual sales + automated delivery',
    M1: 'Inbound — contact form + CRM',
    M2: 'Warm outbound — drafts & scraper',
    M3: 'Deliver & upsell — sites + retainers',
    M4: 'Lead machine — Hunter + outreach send',
    M5: 'Autonomy reinvest — marketing loop',
    M6: 'Full factory — Stripe + premium modules',
  };
  return labels[phase];
}
