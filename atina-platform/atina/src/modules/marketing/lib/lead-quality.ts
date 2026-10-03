/**
 * Deterministic lead quality score 0–100. Explainable. No LLM.
 */

export type LeadQualitySignals = {
  industryRelevance?: number;
  problemSeverity?: number;
  budgetPotential?: number;
  urgency?: number;
  decisionMaker?: number;
  engagement?: number;
  packageFit?: number;
  purchaseIntent?: number;
  responseQuality?: number;
};

const WEIGHTS: Record<keyof LeadQualitySignals, number> = {
  industryRelevance: 12,
  problemSeverity: 10,
  budgetPotential: 14,
  urgency: 10,
  decisionMaker: 12,
  engagement: 10,
  packageFit: 12,
  purchaseIntent: 12,
  responseQuality: 8,
};

function clamp01(v: number | undefined): number | null {
  if (v === undefined || v === null || !Number.isFinite(v)) return null;
  return Math.max(0, Math.min(1, v));
}

export type LeadQualityResult = {
  score: number;
  maxPossible: number;
  coverage: number;
  breakdown: Array<{ signal: string; value: number | null; weight: number; points: number }>;
  kind: 'ACTUAL';
};

export function scoreLeadQuality(signals: LeadQualitySignals): LeadQualityResult {
  const breakdown: LeadQualityResult['breakdown'] = [];
  let points = 0;
  let usedWeight = 0;
  let totalWeight = 0;

  for (const [key, weight] of Object.entries(WEIGHTS) as Array<[keyof LeadQualitySignals, number]>) {
    totalWeight += weight;
    const value = clamp01(signals[key]);
    if (value === null) {
      breakdown.push({ signal: key, value: null, weight, points: 0 });
      continue;
    }
    const p = value * weight;
    points += p;
    usedWeight += weight;
    breakdown.push({ signal: key, value, weight, points: p });
  }

  const coverage = totalWeight > 0 ? usedWeight / totalWeight : 0;
  const score = usedWeight > 0 ? Math.round((points / usedWeight) * 100) : 0;

  return {
    score,
    maxPossible: 100,
    coverage,
    breakdown,
    kind: 'ACTUAL',
  };
}
