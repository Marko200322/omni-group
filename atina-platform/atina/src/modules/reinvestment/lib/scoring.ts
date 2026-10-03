import { SCORING_VERSION } from './constants';

export type ScoringFactors = {
  demand: number;
  revenuePotential: number;
  margin: number;
  devCost: number;
  deliveryCost: number;
  payback: number;
  strategic: number;
  customerImpact: number;
  automation: number;
  complexity: number;
  operationalRisk: number;
  securityRisk: number;
  complianceRisk: number;
  confidence: number;
  urgency: number;
  capacity: number;
};

export type ScoringWeights = Partial<Record<keyof ScoringFactors, number>>;

export type ScoreOpportunityInput = {
  weights?: ScoringWeights;
  factors: ScoringFactors;
};

export type ScoreOpportunityResult = {
  priorityScore: number;
  why: string;
  scoringVersion: string;
  contributions: Array<{ factor: keyof ScoringFactors; weight: number; value: number; points: number }>;
};

const DEFAULT_WEIGHTS: Record<keyof ScoringFactors, number> = {
  demand: 12,
  revenuePotential: 12,
  margin: 10,
  devCost: 8,
  deliveryCost: 6,
  payback: 8,
  strategic: 7,
  customerImpact: 7,
  automation: 6,
  complexity: 5,
  operationalRisk: 5,
  securityRisk: 5,
  complianceRisk: 4,
  confidence: 6,
  urgency: 5,
  capacity: 4,
};

/** Cost/risk factors where higher input is worse — inverted for scoring. */
const INVERTED: ReadonlySet<keyof ScoringFactors> = new Set([
  'devCost',
  'deliveryCost',
  'payback',
  'complexity',
  'operationalRisk',
  'securityRisk',
  'complianceRisk',
]);

function clamp01to100(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

function effectiveValue(factor: keyof ScoringFactors, raw: number): number {
  const v = clamp01to100(raw);
  return INVERTED.has(factor) ? 100 - v : v;
}

/**
 * Deterministic opportunity score 0–100 with a WHY string referencing input factors.
 * No LLM.
 */
export function scoreOpportunity(input: ScoreOpportunityInput): ScoreOpportunityResult {
  const weights: Record<keyof ScoringFactors, number> = {
    ...DEFAULT_WEIGHTS,
    ...(input.weights ?? {}),
  };

  const contributions: ScoreOpportunityResult['contributions'] = [];
  let weightedSum = 0;
  let weightTotal = 0;

  const keys = Object.keys(DEFAULT_WEIGHTS) as Array<keyof ScoringFactors>;
  for (const factor of keys) {
    const weight = Math.max(0, weights[factor] ?? 0);
    const value = clamp01to100(input.factors[factor]);
    const eff = effectiveValue(factor, value);
    const points = (eff * weight) / 100;
    weightedSum += points;
    weightTotal += weight;
    contributions.push({ factor, weight, value, points: Math.round(points * 100) / 100 });
  }

  const priorityScore =
    weightTotal <= 0 ? 0 : Math.round(Math.max(0, Math.min(100, (weightedSum / weightTotal) * 100)));

  const top = [...contributions]
    .sort((a, b) => b.points - a.points)
    .slice(0, 5)
    .map((c) => `${c.factor}=${c.value}(w${c.weight})`)
    .join(', ');

  const risks = contributions
    .filter((c) => INVERTED.has(c.factor) && c.value >= 70)
    .map((c) => `${c.factor}=${c.value}`)
    .join(', ');

  const whyParts = [
    `priorityScore=${priorityScore}`,
    `top=[${top}]`,
    `demand=${input.factors.demand}`,
    `revenuePotential=${input.factors.revenuePotential}`,
    `margin=${input.factors.margin}`,
    `confidence=${input.factors.confidence}`,
    `urgency=${input.factors.urgency}`,
    `capacity=${input.factors.capacity}`,
  ];
  if (risks) whyParts.push(`elevatedRisks=[${risks}]`);

  return {
    priorityScore,
    why: whyParts.join('; '),
    scoringVersion: SCORING_VERSION,
    contributions,
  };
}
