/**
 * Factory maturity M0→M6 — drives checkout gates, fixed pricing, and package unlocks.
 * When NEXT_PUBLIC_FACTORY_PHASE_AUTO=true, ceiling is M6; API enforces revenue+key effective phase.
 * Keep in sync with atina-platform/atina/src/modules/billing/lib/factory-phase.ts
 */
import { isBudgetLaunchMode } from './prod-budget';

function resolveProdModeFromEnv(): 'lean' | 'full' {
  const raw = process.env.NEXT_PUBLIC_PROD_MODE?.trim().toLowerCase();
  return raw === 'full' ? 'full' : 'lean';
}

export type FactoryPhase = 'M0' | 'M1' | 'M2' | 'M3' | 'M4' | 'M5' | 'M6';

export const FACTORY_PHASE_ORDER: FactoryPhase[] = ['M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6'];

export function parseFactoryPhase(raw: string | undefined | null): FactoryPhase | null {
  const v = raw?.trim().toUpperCase();
  if (v && FACTORY_PHASE_ORDER.includes(v as FactoryPhase)) return v as FactoryPhase;
  return null;
}

export function isFactoryPhaseAutoEnabled(): boolean {
  const raw = (process.env.NEXT_PUBLIC_FACTORY_PHASE ?? '').trim().toUpperCase();
  if (raw === 'AUTO') return true;
  const flag = (process.env.NEXT_PUBLIC_FACTORY_PHASE_AUTO ?? '').trim().toLowerCase();
  return flag === 'true' || flag === '1' || flag === 'yes';
}

/**
 * UI / SSR phase. With AUTO, uses optional client override (from API) or ceiling M6.
 * Purchase still gated on API canCheckoutPackage (effective phase).
 */
let clientEffectiveOverride: FactoryPhase | null = null;

export function setClientFactoryPhaseOverride(phase: FactoryPhase | null): void {
  clientEffectiveOverride = phase;
}

export function getFactoryPhase(): FactoryPhase {
  if (clientEffectiveOverride) return clientEffectiveOverride;
  if (isFactoryPhaseAutoEnabled()) {
    const fromEnv = parseFactoryPhase(process.env.NEXT_PUBLIC_FACTORY_PHASE);
    // AUTO literal or missing → ceiling M6 for catalog visibility; API is source of truth
    if (fromEnv) return fromEnv;
    return 'M6';
  }
  const fromEnv = parseFactoryPhase(process.env.NEXT_PUBLIC_FACTORY_PHASE);
  if (fromEnv) return fromEnv;
  if (resolveProdModeFromEnv() === 'full') return 'M6';
  if (isBudgetLaunchMode()) return 'M0';
  return 'M1';
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
