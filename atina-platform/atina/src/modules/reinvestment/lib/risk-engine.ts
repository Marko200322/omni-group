import type { OperatingMode } from './constants';
import { assertCents } from './money';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type RiskAssessmentInput = {
  amountCents: number;
  maxTransferCents: number;
  runwayMonths: number;
  /** True when the proposed action would push reserves below floor. */
  reserveBreachRisk: boolean;
  operatingMode: OperatingMode;
};

export type RiskAssessment = {
  level: RiskLevel;
  reasons: string[];
  score: number;
};

const MODE_BASE: Record<OperatingMode, number> = {
  growth: 5,
  normal: 15,
  conservation: 35,
  capital_preservation: 55,
  emergency: 80,
};

/**
 * Deterministic risk assessment from amount vs limits, runway, reserve breach, and mode.
 */
export function assessRisk(input: RiskAssessmentInput): RiskAssessment {
  assertCents(input.amountCents, 'amountCents');
  assertCents(input.maxTransferCents, 'maxTransferCents');

  const reasons: string[] = [];
  let score = MODE_BASE[input.operatingMode] ?? 15;
  reasons.push(`operating_mode_${input.operatingMode}`);

  const limit = Math.max(1, input.maxTransferCents);
  const ratioBps = Math.floor((input.amountCents * 10_000) / limit);

  if (ratioBps >= 9000) {
    score += 40;
    reasons.push('amount_near_or_at_limit');
  } else if (ratioBps >= 5000) {
    score += 25;
    reasons.push('amount_over_half_limit');
  } else if (ratioBps >= 2500) {
    score += 10;
    reasons.push('amount_moderate_vs_limit');
  } else {
    reasons.push('amount_well_within_limit');
  }

  if (!Number.isFinite(input.runwayMonths) || input.runwayMonths < 0) {
    score += 20;
    reasons.push('runway_unknown_or_invalid');
  } else if (input.runwayMonths < 1) {
    score += 45;
    reasons.push('runway_under_1_month');
  } else if (input.runwayMonths < 3) {
    score += 30;
    reasons.push('runway_under_3_months');
  } else if (input.runwayMonths < 6) {
    score += 15;
    reasons.push('runway_under_6_months');
  } else {
    reasons.push('runway_healthy');
  }

  if (input.reserveBreachRisk) {
    score += 35;
    reasons.push('reserve_breach_risk');
  }

  score = Math.max(0, Math.min(100, score));

  let level: RiskLevel;
  if (score >= 80) level = 'critical';
  else if (score >= 55) level = 'high';
  else if (score >= 30) level = 'medium';
  else level = 'low';

  return { level, reasons, score };
}
